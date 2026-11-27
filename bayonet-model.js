import * as T from './three.module.js';

function bladeFinish(){
  const canvas=document.createElement('canvas');
  canvas.width=128;canvas.height=384;
  const ctx=canvas.getContext('2d'),grain=ctx.createImageData(canvas.width,canvas.height);
  let seed=96717;
  const random=()=>{
    seed=(Math.imul(seed,1664525)+1013904223)>>>0;
    return seed/4294967296;
  };
  for(let x=0;x<canvas.width;x++){
    const brush=random()*14-7;
    for(let y=0;y<canvas.height;y++){
      const shade=228+brush+random()*13+3*Math.sin(x*.27+y*.023);
      const i=(y*canvas.width+x)*4;
      grain.data[i]=shade;grain.data[i+1]=shade;grain.data[i+2]=shade;grain.data[i+3]=255;
    }
  }
  ctx.putImageData(grain,0,0);
  for(let i=0;i<44;i++){
    ctx.fillStyle=i%3?'#f8fbff28':'#47545e1c';
    ctx.fillRect(random()*128,36+random()*328,1,5+random()*74);
  }
  const texture=new T.CanvasTexture(canvas);
  texture.colorSpace=T.SRGBColorSpace;
  texture.anisotropy=4;
  return texture;
}

function addBayonetTrail(root,spinPivot,carrierOffset){
  // 56-segment zero-GC cold-steel specular motion ribbon with angular sub-stepping for smooth 360° flips & slashes.
  const count=56,lifetime=.132;
  const positions=new Float32Array(count*6),colors=new Float32Array(count*8);
  const ages=new Float32Array(count),strengths=new Float32Array(count),indices=[];
  for(let i=0;i<count-1;i++){
    const a=i*2;
    indices.push(a,a+1,a+2,a+1,a+3,a+2);
  }
  const geometry=new T.BufferGeometry();
  const position=new T.BufferAttribute(positions,3).setUsage(T.DynamicDrawUsage);
  const color=new T.BufferAttribute(colors,4).setUsage(T.DynamicDrawUsage);
  geometry.setAttribute('position',position);
  geometry.setAttribute('color',color);
  geometry.setIndex(indices);
  const ribbon=new T.Mesh(geometry,new T.MeshBasicMaterial({
    vertexColors:true,transparent:true,depthWrite:false,side:T.DoubleSide,
    blending:T.AdditiveBlending,toneMapped:false
  }));
  ribbon.frustumCulled=false;
  ribbon.matrixAutoUpdate=false;
  ribbon.visible=false;
  root.add(ribbon);

  const baseLocal=new T.Vector3(0,0,-.08).add(carrierOffset);
  const tipLocal=new T.Vector3(.009,0,-.350).add(carrierOffset);
  const pBase=new T.Vector3(),pTip=new T.Vector3();
  const lastParentPos=new T.Vector3(),parentPos=new T.Vector3();
  const lastParentQuat=new T.Quaternion(),parentQuat=new T.Quaternion();
  const parentScale=new T.Vector3(1,1,1),unitScale=new T.Vector3(1,1,1);
  const lastOffset=new T.Vector3(),lastSpin=new T.Quaternion();
  const stepPos=new T.Vector3(),stepQuat=new T.Quaternion();
  const stepParent=new T.Matrix4(),stepLocal=new T.Matrix4(),stepWorld=new T.Matrix4();
  let used=0,lastStrength=0;

  function pushSample(mat,age,strength){
    used=Math.min(used+1,count);
    positions.copyWithin(6,0,(used-1)*6);
    ages.copyWithin(1,0,used-1);
    strengths.copyWithin(1,0,used-1);
    pBase.copy(baseLocal).applyMatrix4(mat).toArray(positions,0);
    pTip.copy(tipLocal).applyMatrix4(mat).toArray(positions,3);
    ages[0]=age;
    strengths[0]=strength;
  }

  function resetTrail(){
    used=0;
    lastStrength=0;
    ribbon.visible=false;
  }

  function updateTrail(dt,intensity){
    if(dt<=0)return;
    const strength=T.MathUtils.clamp(intensity,0,1);
    if(strength<.03&&used===0){
      ribbon.visible=false;
      return;
    }
    spinPivot.updateWorldMatrix(true,false);
    spinPivot.parent.matrixWorld.decompose(parentPos,parentQuat,parentScale);
    for(let i=0;i<used;i++)ages[i]+=dt;
    while(used>1&&ages[used-1]>lifetime)used--;

    if(used>0){
      const twist=lastSpin.angleTo(spinPivot.quaternion)+lastParentQuat.angleTo(parentQuat);
      const steps=Math.min(12,Math.max(1,Math.ceil(twist/.08)));
      for(let s=1;s<=steps;s++){
        const f=s/steps;
        stepParent.compose(stepPos.copy(lastParentPos).lerp(parentPos,f),
          stepQuat.copy(lastParentQuat).slerp(parentQuat,f),parentScale);
        stepLocal.compose(stepPos.copy(lastOffset).lerp(spinPivot.position,f),
          stepQuat.copy(lastSpin).slerp(spinPivot.quaternion,f),unitScale);
        stepWorld.multiplyMatrices(stepParent,stepLocal);
        pushSample(stepWorld,dt*(1-f),T.MathUtils.lerp(lastStrength,strength,f));
      }
    }else if(strength>=.03){
      pushSample(spinPivot.matrixWorld,0,strength);
    }

    lastParentPos.copy(parentPos);
    lastParentQuat.copy(parentQuat);
    lastOffset.copy(spinPivot.position);
    lastSpin.copy(spinPivot.quaternion);
    lastStrength=strength;

    let visible=false;
    for(let i=0;i<used;i++){
      const fade=Math.pow(Math.max(0,1-ages[i]/lifetime),1.6)*strengths[i];
      const c=i*8;
      colors[c]=.76;colors[c+1]=.88;colors[c+2]=.98;colors[c+3]=fade*.20;
      colors[c+4]=.95;colors[c+5]=.98;colors[c+6]=1.0;colors[c+7]=fade*.70;
      visible||=fade>.02;
    }
    ribbon.visible=visible&&used>1;
    if(!ribbon.visible){
      if(strength<.03)resetTrail();
      return;
    }
    ribbon.matrix.copy(root.matrixWorld).invert();
    ribbon.matrixWorldNeedsUpdate=true;
    geometry.setDrawRange(0,(used-1)*6);
    position.needsUpdate=true;color.needsUpdate=true;
  }

  return {resetTrail,updateTrail};
}

export function buildBayonet(parts) {
  const {box,tube,pad,bake,paint,cloth,clothFold,glove,knuckle,sleeveBand,steelGrain,twill}=parts;
  const root=new T.Group(), right=new T.Group(), left=new T.Group(), sleeve=new T.Group();
  const spinPivot=new T.Group(), knifeCarrier=new T.Group();
  const carrierOffset=new T.Vector3(0,0,-.045);
  spinPivot.position.set(0,0,.045);
  knifeCarrier.position.copy(carrierOffset);
  spinPivot.add(knifeCarrier);
  root.name='m9';right.name='m9-grip';left.name='m9-support';
  spinPivot.name='m9-spinPivot';knifeCarrier.name='m9-knifeCarrier';
  root.add(right,left,sleeve);
  const finish=bladeFinish();
  const steel=paint(0x84929a,.34,.82,finish);
  const bevel=paint(0xc6d2d8,.26,.89,finish);
  const hardware=paint(0x353f40,.52,.69,steelGrain);
  const polymer=paint(0x43493c,.81,.05,twill);
  const groove=paint(0x292e28,.88,.04,twill);
  const accent=paint(0x896747,.47,.64);
  steel.envMapIntensity=1.28;bevel.envMapIntensity=1.55;hardware.envMapIntensity=.92;

  const pointPath=(path,points)=>{
    points.forEach(([x,y],i)=>i?path.lineTo(x,y):path.moveTo(x,y));
    path.closePath();
    return path;
  };
  const addSolid=(shape,start,depth,chamfer,mat)=>{
    const geo=new T.ExtrudeGeometry(shape,{depth,bevelEnabled:true,bevelThickness:chamfer,
      bevelSize:chamfer,bevelSegments:2,curveSegments:10});
    const uv=geo.getAttribute('uv'),positions=geo.getAttribute('position');
    for(let i=0;i<uv.count;i++)uv.setXY(i,.5+positions.getX(i)*7,positions.getY(i)/.33);
    geo.translate(0,start,-depth/2);
    geo.rotateX(-Math.PI/2);
    knifeCarrier.add(new T.Mesh(geo,mat));
  };
  // Coordinates are in the blade plane, measured from the crossguard toward the tip.
  // The cutting land is separate from the hollow ground bevel so it catches a tighter highlight.
  const cuttingLand=[[-.034,.024],[-.040,.044],[-.038,.168],[-.031,.244],[-.018,.285],[.009,.324]];
  const cuttingEdge=[[-.034,.024],[-.059,.044],[-.056,.167],[-.047,.245],[-.031,.287],[.009,.324]];
  const outline=[...cuttingLand,[.043,.276],[.058,.237],[.058,.197]];
  for(let i=0;i<6;i++){
    const station=.197-i*.023;
    outline.push([.052,station-.004],[.044,station-.010],[.044,station-.014],[.058,station-.019],[.058,station-.023]);
  }
  outline.push([.049,.035],[.040,.025],[.040,0],[-.034,0]);
  const blade=pointPath(new T.Shape(),outline);
  const relief=new T.Path();
  relief.moveTo(.018,.062);relief.quadraticCurveTo(.032,.062,.032,.076);
  relief.lineTo(.023,.117);relief.quadraticCurveTo(.020,.132,.008,.128);
  relief.quadraticCurveTo(-.003,.126,-.002,.112);relief.lineTo(.003,.077);
  relief.quadraticCurveTo(.005,.062,.018,.062);relief.closePath();
  blade.holes.push(relief);
  const guardZ=.026;
  addSolid(blade,guardZ,.017,.0014,steel);

  const vertices=[];
  const triangles=(a,b,c,d)=>vertices.push(...a,...b,...c,...a,...c,...d);
  const bladeVertex=([x,y],height)=>[x,height,-y-guardZ];
  for(let i=1;i<cuttingLand.length;i++){
    const a=bladeVertex(cuttingLand[i-1],.0085),b=bladeVertex(cuttingLand[i],.0085);
    const c=bladeVertex(cuttingEdge[i],.0007),d=bladeVertex(cuttingEdge[i-1],.0007);
    const back=([x,y,z])=>[x,-y,z];
    triangles(a,b,c,d);triangles(back(a),back(d),back(c),back(b));
    triangles(d,c,back(c),back(d));
  }
  // False-edge clip-point swedge bevel along the upper spine toward the needle tip
  const swedgeLand=[[.009,.324],[.031,.273],[.044,.237]];
  const swedgeEdge=[[.009,.324],[.043,.276],[.058,.237]];
  for(let i=1;i<swedgeLand.length;i++){
    const a=bladeVertex(swedgeLand[i-1],.0085),b=bladeVertex(swedgeLand[i],.0085);
    const c=bladeVertex(swedgeEdge[i],.0020),d=bladeVertex(swedgeEdge[i-1],.0020);
    const back=([x,y,z])=>[x,-y,z];
    triangles(a,d,c,b);triangles(back(a),back(b),back(c),back(d));
    triangles(c,d,back(d),back(c));
  }
  const edgeGeo=new T.BufferGeometry();
  edgeGeo.setAttribute('position',new T.Float32BufferAttribute(vertices,3));
  edgeGeo.setAttribute('uv',new T.Float32BufferAttribute(
    vertices.flatMap((v,i)=>i%3===0?[.5+v*7,(-vertices[i+2]-guardZ)/.33]:[]),2));
  edgeGeo.computeVertexNormals();
  knifeCarrier.add(new T.Mesh(edgeGeo,bevel));

  const guard=pointPath(new T.Shape(),[[-.083,-.014],[-.093,-.003],[-.080,.010],[-.047,.015],
    [.045,.016],[.076,.032],[.097,.018],[.097,-.022],[.078,-.037],[.044,-.024]]);
  const aperture=new T.Path();
  aperture.absellipse(.070,-.005,.016,.018,0,2*Math.PI,true);
  // The guard lies across the grip, so its extrusion becomes the thickness along the knife.
  guard.holes.push(aperture);
  const crossguard=new T.ExtrudeGeometry(guard,
    {depth:.015,bevelEnabled:true,bevelSize:.003,bevelThickness:.002,bevelSegments:2,curveSegments:14});
  crossguard.translate(0,0,-guardZ-.007);
  knifeCarrier.add(new T.Mesh(crossguard,hardware));
  tube(knifeCarrier,hardware,[0,0,-.020],[0,0,.117],.026,.030,12);
  for(let i=0;i<8;i++){
    const z=-.016+i*.017;
    const radius=.033+Math.sin(i*Math.PI/7)*.005;
    tube(knifeCarrier,polymer,[0,0,z],[0,0,z+.012],radius,radius-.001,12).scale.x=1.14;
    tube(knifeCarrier,groove,[0,0,z+.012],[0,0,z+.017],radius-.004,radius-.004,12).scale.x=1.10;
  }
  tube(knifeCarrier,hardware,[0,0,.116],[0,0,.142],.037,.033,10).scale.x=1.23;
  tube(knifeCarrier,bevel,[0,0,.141],[0,0,.145],.016,.014,8);
  box(knifeCarrier,accent,.040,.007,.128,.004,.009,.008);
  bake(knifeCarrier);

  // The fingers and blade share the wrist. Finger pivots let the glove tighten without
  // sliding its palm or the blade away from the grip.
  pad(right,glove,.037,-.030,.054,.036,.035,.072);
  // Spherical wrist bridge at wristSocket seals the cuff seam during steep CS inspect/draw turns
  pad(right,groove,.049,-.046,.102,.044,.044,.044);
  pad(right,knuckle,.062,-.036,.056,.012,.029,.052);
  const seam=paint(0x737266,.95,.01);
  for(let i=0;i<8;i++)box(right,seam,.072,-.043,.019+i*.009,.002,.002,.004);
  const fingers=[];
  for(let i=0;i<4;i++){
    const z=.003+i*.027,y=-.021-i*.003;
    const finger=new T.Group();
    finger.position.set(.041,y,z);
    pad(finger,knuckle,-.001,.017,0,.015,.026,.014);
    pad(finger,knuckle,-.009,.039,.002,.013,.013,.013);
    tube(finger,glove,[0,.022,0],[-.023,.056,0],.013,.011,8);
    tube(finger,glove,[-.022,.055,0],[-.052,.053,0],.011,.010,8);
    pad(finger,glove,-.055,.043,0,.014,.015,.011);
    bake(finger);right.add(finger);fingers.push(finger);
  }
  const thumb=new T.Group();
  thumb.position.set(.039,-.032,.001);
  tube(thumb,knuckle,[0,0,.024],[-.018,-.006,-.022],.019,.014,9);
  pad(thumb,glove,-.025,-.007,-.031,.016,.013,.022);
  bake(thumb);right.add(thumb);bake(right);
  right.add(spinPivot);
  const {resetTrail,updateTrail}=addBayonetTrail(root,spinPivot,carrierOffset);

  // A sleeve anchored off camera follows the wrist instead of rotating through the palm.
  const arm=subdivide=>{
    const group=new T.Group();
    tube(group,cloth,[0,0,0],[0,1,0],.096,.049,12);
    for(const t of subdivide)tube(group,clothFold,[0,t-.021,0],[0,t+.022,0],.099-.047*t,.098-.047*t,12);
    tube(group,sleeveBand,[0,.78,0],[0,.855,0],.063,.059,12);
    tube(group,groove,[0,.9,0],[0,1.015,0],.056,.052,12);
    bake(group);
    return group;
  };
  sleeve.add(arm([.28,.64]));
  const supportSleeve=arm([.59]);
  supportSleeve.position.set(-.056,-.161,.235);
  supportSleeve.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),new T.Vector3(.056,.161,-.235).normalize());
  supportSleeve.scale.y=supportSleeve.position.length();
  left.add(supportSleeve);
  pad(left,glove,0,0,-.018,.041,.038,.050);
  for(let i=0;i<4;i++){
    const x=-.033+i*.021;
    tube(left,knuckle,[x,.010,-.028],[x,.015,-.068+i*.004],.012,.011,8);
    pad(left,glove,x,.002,-.071+i*.004,.012,.018,.022);
  }
  pad(left,knuckle,.035,-.001,-.034,.023,.020,.031);
  bake(left);
  return {root,right,left,sleeve,thumb,fingers,spinPivot,knifeCarrier,resetTrail,updateTrail};
}
