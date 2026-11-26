import * as T from './three.module.js';

const assetUrl=new URL('./assets/karambit/low_poly_karambit_bicagi.glb',import.meta.url).href;
// Source GLB lies in XY with ring hole along Z.
// RotateX(PI) + RotateZ(+0.92) places ring cleanly on the LEFT (0,0,0), handle horizontally LEFT->RIGHT (+X),
// concave finger grooves facing UP (+Y), and curved Doppler blade sweeping RIGHT & UPWARD — exact CS2 Karambit silhouette!
const ringCenter=new T.Vector3(-.271,-.708,.002);
// Compact Valorant Reaver Karambit scale (0.070 -> ~14.7cm radius) matching reference video hand-to-blade proportions
const mountTransform=new T.Matrix4().makeRotationZ(.92)
  .multiply(new T.Matrix4().makeRotationX(Math.PI))
  .multiply(new T.Matrix4().makeScale(.070,.070,.070))
  .multiply(new T.Matrix4().makeTranslation(-ringCenter.x,-ringCenter.y,-ringCenter.z));

async function loadKnife(){
  const response=await fetch(assetUrl);
  if(!response.ok)throw new Error('Karambit asset could not be loaded');
  const buffer=await response.arrayBuffer(),header=new DataView(buffer);
  if(header.getUint32(0,true)!==0x46546c67||header.getUint32(4,true)!==2)throw new Error('Invalid Karambit GLB');
  const jsonLength=header.getUint32(12,true),bin=28+jsonLength;
  const gltf=JSON.parse(new TextDecoder().decode(new Uint8Array(buffer,20,jsonLength)));
  const primitive=gltf.meshes[0].primitives[0];
  const geometry=new T.BufferGeometry();
  function accessor(index,Type,components){
    const a=gltf.accessors[index],view=gltf.bufferViews[a.bufferView];
    return new T.BufferAttribute(new Type(buffer,bin+(view.byteOffset??0)+(a.byteOffset??0),a.count*components),components);
  }
  geometry.setAttribute('position',accessor(primitive.attributes.POSITION,Float32Array,3));
  geometry.setAttribute('normal',accessor(primitive.attributes.NORMAL,Float32Array,3));
  geometry.setAttribute('uv',accessor(primitive.attributes.TEXCOORD_0,Float32Array,2));
  geometry.setIndex(accessor(primitive.indices,Uint32Array,1));
  geometry.applyMatrix4(mountTransform);

  const source=gltf.images[0],view=gltf.bufferViews[source.bufferView];
  const bytes=new Uint8Array(buffer,bin+(view.byteOffset??0),view.byteLength);
  const textureUrl=URL.createObjectURL(new Blob([bytes],{type:source.mimeType}));
  try{
    const map=await new T.TextureLoader().loadAsync(textureUrl);
    map.flipY=false;
    map.colorSpace=T.SRGBColorSpace;
    map.anisotropy=4;
    const material=new T.MeshStandardMaterial({
      map,roughness:.28,metalness:.40,side:T.DoubleSide
    });
    material.envMapIntensity=1.24;
    const mesh=new T.Mesh(geometry,material);
    mesh.name='OldTÜRK34 Karambit';
    return mesh;
  }finally{
    URL.revokeObjectURL(textureUrl);
  }
}

function addBladeTrail(weapon,ring){
  // 112-segment angular-subdivided Reaver-style luminous crescent arc ribbon (zero-GC preallocated).
  // Sub-steps fast rotations every ~4.3 deg so the spin arc is razor-smooth at any FPS (no polygonal facets!).
  const count=112,lifetime=.155;
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
  weapon.root.add(ribbon);
  // Sleek narrow crescent band hugging the outer blade edge (matches Valorant Reaver energy arc)
  const edge=new T.Vector3(.96,.74,-.0054).applyMatrix4(mountTransform);
  const tip=new T.Vector3(1.29665,.69502,-.0054).applyMatrix4(mountTransform);
  const nextEdge=new T.Vector3(),nextTip=new T.Vector3(),lastTip=new T.Vector3();
  const prevQuat=new T.Quaternion(),curQuat=new T.Quaternion(),subQuat=new T.Quaternion();
  const prevPos=new T.Vector3(),curPos=new T.Vector3(),subPos=new T.Vector3();
  const subLocal=new T.Matrix4(),subWorld=new T.Matrix4(),unitScale=new T.Vector3(1,1,1);
  let samples=0;
  function pushSample(eVec,tVec,age,strength){
    samples=Math.min(samples+1,count);
    positions.copyWithin(6,0,(samples-1)*6);
    ages.copyWithin(1,0,samples-1);
    strengths.copyWithin(1,0,samples-1);
    eVec.toArray(positions,0);
    tVec.toArray(positions,3);
    ages[0]=age;
    strengths[0]=strength;
  }
  weapon.resetTrail=()=>{samples=0;ribbon.visible=false;};
  weapon.updateTrail=dt=>{
    if(dt<=0)return;
    ring.updateWorldMatrix(true,false);
    curQuat.copy(ring.quaternion);
    curPos.copy(ring.position);
    nextEdge.copy(edge).applyMatrix4(ring.matrixWorld);
    nextTip.copy(tip).applyMatrix4(ring.matrixWorld);
    const speed=samples?nextTip.distanceTo(lastTip)/dt:0;
    const strength=T.MathUtils.clamp((speed-0.65)/2.4,0,1);
    for(let i=0;i<samples;i++)ages[i]+=dt;
    if(samples>0&&ring.parent){
      const angleDelta=prevQuat.angleTo(curQuat);
      const subSteps=angleDelta>0.075?Math.min(10,Math.ceil(angleDelta/0.075)):1;
      if(subSteps>1){
        const parentWorld=ring.parent.matrixWorld;
        for(let s=1;s<=subSteps;s++){
          const f=s/subSteps;
          subQuat.copy(prevQuat).slerp(curQuat,f);
          subPos.copy(prevPos).lerp(curPos,f);
          subLocal.compose(subPos,subQuat,unitScale);
          subWorld.multiplyMatrices(parentWorld,subLocal);
          nextEdge.copy(edge).applyMatrix4(subWorld);
          nextTip.copy(tip).applyMatrix4(subWorld);
          pushSample(nextEdge,nextTip,dt*(1-f),strength);
        }
      }else{
        pushSample(nextEdge,nextTip,0,strength);
      }
    }else{
      pushSample(nextEdge,nextTip,0,strength);
    }
    prevQuat.copy(curQuat);
    prevPos.copy(curPos);
    lastTip.copy(nextTip);
    let visible=false;
    for(let i=0;i<samples;i++){
      const tNorm=Math.max(0,1-ages[i]/lifetime);
      const fade=(tNorm*tNorm)*Math.pow(tNorm,.15)*strengths[i];
      const offset=i*8;
      // Rich Valorant Reaver deep electric-indigo inner glow -> crisp violet-blue outer razor arc
      colors[offset]=.24;colors[offset+1]=.18;colors[offset+2]=.96;colors[offset+3]=fade*.15;
      colors[offset+4]=.54;colors[offset+5]=.58;colors[offset+6]=1.0;colors[offset+7]=fade*.72;
      visible||=fade>.012;
    }
    ribbon.visible=visible&&samples>1;
    if(!ribbon.visible)return;
    ribbon.matrix.copy(weapon.root.matrixWorld).invert();
    ribbon.matrixWorldNeedsUpdate=true;
    geometry.setDrawRange(0,(samples-1)*6);
    position.needsUpdate=true;color.needsUpdate=true;
  };
}

export function buildKarambit(weapon,parts){
  const {tube,pad,bake,paint,glove,knuckle,cloth,clothFold,sleeveBand}=parts;
  // Lower-right Valorant Reaver Karambit framing (compact, never obstructing center/top HUD)
  weapon.hipX=.098;weapon.hipY=-.142;weapon.hipZ=-.585;
  weapon.hinges=true;

  const cuffMatte=paint(0x1d2224,.88,.04);
  const armorPlate=paint(0x2d3230,.58,.18);
  const mount=new T.Group(),spinPivot=new T.Group(),thumb=new T.Group();
  mount.name='KarambitMount';
  spinPivot.name='SpinPivot';
  const hand=weapon.hand,fingers=[];
  weapon.body.add(mount);
  mount.add(spinPivot);
  hand.add(thumb);

  // --- Proportioned Gloved Right Hand (matched to 0.070 karambit ring & grip) ---
  pad(hand,glove,.046,-.012,.028,.040,.030,.021);
  pad(hand,knuckle,.040,.010,.026,.034,.014,.017);
  pad(hand,armorPlate,.043,.007,.035,.030,.011,.008);
  for(let i=0;i<4;i++){
    pad(hand,knuckle,.017+i*.0165,.015-i*.003,.027,.0105,.0095,.011);
  }
  // Index finger curling from top-left knuckle cleanly THROUGH the 0.070 tail ring at (0,0,0)!
  tube(hand,glove,[.016,.014,.025],[.003,.003,.011],.0086,.0074,10);
  pad(hand,knuckle,.003,.003,.011,.0076,.0074,.0076);
  tube(hand,glove,[.003,.003,.011],[-.001,-.001,-.012],.0070,.0062,12);
  pad(hand,knuckle,-.001,-.001,-.012,.0064,.0064,.0064);

  // Seamless wrist gaiter & diagonal forearm sweeping cleanly off bottom-right corner
  const wPt=[.090,-.044,.040], ePt=[.235,-.215,.275];
  const aLerp=t=>[wPt[0]+(ePt[0]-wPt[0])*t,wPt[1]+(ePt[1]-wPt[1])*t,wPt[2]+(ePt[2]-wPt[2])*t];
  tube(hand,glove,[.060,-.019,.029],wPt,.028,.030,14);
  pad(hand,cuffMatte,wPt[0],wPt[1],wPt[2],.033,.033,.033);
  tube(hand,cuffMatte,wPt,aLerp(.14),.033,.038,14);
  tube(hand,sleeveBand,aLerp(.14),aLerp(.24),.0408,.0435,14);
  tube(hand,cloth,ePt,aLerp(.13),.066,.038,14);
  tube(hand,clothFold,aLerp(.45),aLerp(.58),.051,.054,14);

  // 3 articulated fingers (Middle, Ring, Pinky) proportioned to the 0.070 handle
  for(let i=0;i<3;i++){
    const finger=new T.Group();
    const s=1-i*.07;
    finger.position.set(.031+i*.0165,.015-i*.003,.023);
    tube(finger,glove,[0,0,0],[0,.006,-.020*s],.0086*s,.0076*s,10);
    pad(finger,knuckle,0,.006,-.020*s,.0078*s,.0076*s,.0080*s);
    tube(finger,glove,[0,.006,-.020*s],[0,-.017*s,-.023*s],.0074*s,.0064*s,10);
    pad(finger,knuckle,0,-.017*s,-.023*s,.0066*s,.0066*s,.0068*s);
    bake(finger);
    hand.add(finger);
    fingers.push(finger);
  }
  // Articulated thumb on lower-left palm
  thumb.position.set(.036,-.028,.024);
  tube(thumb,glove,[0,0,0],[-.021,.008,-.013],.010,.0086,10);
  pad(thumb,knuckle,-.011,.004,-.006,.0096,.0090,.0096);
  pad(thumb,knuckle,-.021,.008,-.013,.0086,.0084,.0088);
  bake(thumb);

  // --- Debug Gizmos anchored at SpinPivot (tail-ring center 0,0,0) ---
  const debugGizmo=new T.Group();
  debugGizmo.name='KarambitDebugGizmo';
  debugGizmo.visible=false;
  const gizmoMat=(color,opacity=1)=>new T.MeshBasicMaterial({
    color,transparent:opacity<1,opacity,depthTest:false,depthWrite:false,toneMapped:false
  });
  // Cyan glowing marker sphere at exact SpinPivot center
  const pivotDot=new T.Mesh(new T.SphereGeometry(.0105,14,10),gizmoMat(0x00f5ff,.95));
  pivotDot.renderOrder=999;
  debugGizmo.add(pivotDot);
  // Local XYZ triad ticks at SpinPivot
  const makeLine=(a,b,color,opacity=.9)=>{
    const geo=new T.BufferGeometry().setFromPoints([new T.Vector3(...a),new T.Vector3(...b)]);
    const line=new T.Line(geo,new T.LineBasicMaterial({color,transparent:opacity<1,opacity,depthTest:false,depthWrite:false,toneMapped:false}));
    line.renderOrder=999;
    return line;
  };
  debugGizmo.add(
    makeLine([0,0,0],[.045,0,0],0xff4d6d,.85),
    makeLine([0,0,0],[0,.045,0],0x52ff8a,.85),
    makeLine([0,0,0],[0,0,.045],0x4da6ff,.85)
  );
  // Dynamic spin-axis vector + orbital spin-plane ring (rotates with current spinAxis!)
  const spinAxisGroup=new T.Group();
  spinAxisGroup.add(makeLine([0,0,-.085],[0,0,.110],0xffd24c,1));
  const axisTip=new T.Mesh(new T.ConeGeometry(.007,.020,10),gizmoMat(0xffd24c,1));
  axisTip.position.set(0,0,.115);
  axisTip.rotation.x=Math.PI/2;
  axisTip.renderOrder=999;
  spinAxisGroup.add(axisTip);
  const ringPts=[];
  for(let i=0;i<=48;i++){
    const a=i/48*Math.PI*2;
    ringPts.push(new T.Vector3(Math.cos(a)*.070,Math.sin(a)*.070,0));
  }
  const planeRing=new T.Line(
    new T.BufferGeometry().setFromPoints(ringPts),
    new T.LineBasicMaterial({color:0x00f5ff,transparent:true,opacity:.52,depthTest:false,depthWrite:false,toneMapped:false})
  );
  planeRing.renderOrder=998;
  spinAxisGroup.add(planeRing);
  debugGizmo.add(spinAxisGroup);
  mount.add(debugGizmo);

  const zAxis=new T.Vector3(0,0,1),tmpAxis=new T.Vector3();
  const updateDebugGizmo=(axisVec,visible)=>{
    debugGizmo.visible=!!visible;
    if(!visible||!axisVec)return;
    tmpAxis.copy(axisVec).normalize();
    spinAxisGroup.quaternion.setFromUnitVectors(zAxis,tmpAxis);
  };

  addBladeTrail(weapon,spinPivot);
  const ready=loadKnife().then(mesh=>{spinPivot.add(mesh);});
  weapon.karambit={mount,spinPivot,ringPivot:spinPivot,fingers,thumb,debugGizmo,updateDebugGizmo,ready};
}
