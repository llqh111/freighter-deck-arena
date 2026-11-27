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
  // Luminous multi-rail Valorant Reaver energy arc (zero-GC preallocated, AdditiveBlending + angular sub-stepping).
  // Soft deep-indigo outer aura -> vivid electric-violet mid core -> crisp bright lavender-blue razor edge.
  const rails=[
    {width:0.00, lifetime:.195, alpha:0.00, color:[.10,.05,.72]},
    {width:0.20, lifetime:.182, alpha:0.26, color:[.14,.10,.92]},
    {width:0.44, lifetime:.168, alpha:0.52, color:[.24,.20,1.0]},
    {width:0.66, lifetime:.156, alpha:0.32, color:[.38,.28,1.0]},
    {width:0.84, lifetime:.148, alpha:0.86, color:[.52,.46,1.0]},
    {width:0.95, lifetime:.142, alpha:0.98, color:[.74,.78,1.0]},
    {width:1.00, lifetime:.138, alpha:0.16, color:[.90,.92,1.0]}
  ];
  const count=136,railCount=rails.length;
  const positions=new Float32Array(count*railCount*3),colors=new Float32Array(count*railCount*4);
  const edges=new Float32Array(count*6),ages=new Float32Array(count),strengths=new Float32Array(count);
  const inspectSamples=new Uint8Array(count),indices=[];
  for(let i=0;i<count-1;i++)for(let j=0;j<railCount-1;j++){
    const a=i*railCount+j,b=a+railCount;
    indices.push(a,a+1,b,a+1,b+1,b);
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

  const edge=new T.Vector3(.92,.74,-.0054).applyMatrix4(mountTransform);
  const tip=new T.Vector3(1.29665,.69502,-.0054).applyMatrix4(mountTransform);
  const lastTip=new T.Vector3(),nextTip=new T.Vector3(),nextEdge=new T.Vector3();
  const lastSpin=new T.Quaternion(),spin=new T.Quaternion();
  const lastParentQuat=new T.Quaternion(),parentQuat=new T.Quaternion();
  const lastParentPos=new T.Vector3(),parentPos=new T.Vector3(),lastOffset=new T.Vector3();
  const stepQuat=new T.Quaternion(),stepPos=new T.Vector3(),unitScale=new T.Vector3(1,1,1);
  const parentScale=new T.Vector3();
  const stepParent=new T.Matrix4(),stepWorld=new T.Matrix4(),stepLocal=new T.Matrix4();
  let countUsed=0,lastStrength=0;

  function pushSample(matrix,age,strength,inspecting){
    countUsed=Math.min(countUsed+1,count);
    edges.copyWithin(6,0,(countUsed-1)*6);
    ages.copyWithin(1,0,countUsed-1);
    strengths.copyWithin(1,0,countUsed-1);
    inspectSamples.copyWithin(1,0,countUsed-1);
    nextEdge.copy(edge).applyMatrix4(matrix).toArray(edges,0);
    nextTip.copy(tip).applyMatrix4(matrix).toArray(edges,3);
    ages[0]=age;
    strengths[0]=strength;
    inspectSamples[0]=inspecting?1:0;
  }
  weapon.resetTrail=()=>{countUsed=0;lastStrength=0;ribbon.visible=false;};
  weapon.updateTrail=(dt,inspectWeight)=>{
    if(dt<=0)return;
    ring.updateWorldMatrix(true,false);
    ring.parent.matrixWorld.decompose(parentPos,parentQuat,parentScale);
    spin.copy(ring.quaternion);
    nextTip.copy(tip).applyMatrix4(ring.matrixWorld);
    const speed=countUsed?nextTip.distanceTo(lastTip)/dt:0;
    const inspecting=inspectWeight!==null&&inspectWeight!==undefined;
    let strength=T.MathUtils.clamp((speed-.55)/2.1,0,1);
    if(inspecting)strength=Math.max(strength*inspectWeight,inspectWeight*.88);
    for(let i=0;i<countUsed;i++)ages[i]+=dt;
    while(countUsed>1&&ages[countUsed-1]>.198)countUsed--;

    if(countUsed){
      const twist=lastSpin.angleTo(spin)+lastParentQuat.angleTo(parentQuat);
      const steps=Math.min(20,Math.max(1,Math.ceil(twist/.075)));
      for(let s=1;s<=steps;s++){
        const f=s/steps;
        stepParent.compose(stepPos.copy(lastParentPos).lerp(parentPos,f),
          stepQuat.copy(lastParentQuat).slerp(parentQuat,f),parentScale);
        stepLocal.compose(stepPos.copy(lastOffset).lerp(ring.position,f),
          stepQuat.copy(lastSpin).slerp(spin,f),unitScale);
        stepWorld.multiplyMatrices(stepParent,stepLocal);
        pushSample(stepWorld,dt*(1-f),T.MathUtils.lerp(lastStrength,strength,f),inspecting);
      }
    }else{
      pushSample(ring.matrixWorld,0,strength,inspecting);
    }

    lastTip.copy(tip).applyMatrix4(ring.matrixWorld);
    lastParentPos.copy(parentPos);
    lastParentQuat.copy(parentQuat);
    lastOffset.copy(ring.position);
    lastSpin.copy(spin);
    lastStrength=strength;

    let visible=false;
    for(let i=0;i<countUsed;i++){
      const old=i*6,inspect=inspectSamples[i];
      for(let j=0;j<railCount;j++){
        const rail=rails[j],vertex=i*railCount+j,p=vertex*3,c=vertex*4;
        const time=Math.max(0,1-ages[i]/(inspect?rail.lifetime:.115));
        const fade=time*time*strengths[i];
        const width=inspect?1-(1-rail.width)*(.58+.42*time):rail.width;
        for(let k=0;k<3;k++)positions[p+k]=T.MathUtils.lerp(edges[old+k],edges[old+3+k],width);
        colors[c]=inspect?rail.color[0]:.56;
        colors[c+1]=inspect?rail.color[1]:.52;
        colors[c+2]=inspect?rail.color[2]:1.0;
        colors[c+3]=fade*(inspect?rail.alpha:.48*rail.width);
        visible||=colors[c+3]>.010;
      }
    }
    ribbon.visible=visible&&countUsed>1;
    if(!ribbon.visible)return;
    ribbon.matrix.copy(weapon.root.matrixWorld).invert();
    ribbon.matrixWorldNeedsUpdate=true;
    geometry.setDrawRange(0,(countUsed-1)*(railCount-1)*6);
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
  const mount=new T.Group(),spinPivot=new T.Group(),thumb=new T.Group(),forearm=new T.Group();
  mount.name='KarambitMount';
  spinPivot.name='SpinPivot';
  const hand=weapon.hand,fingers=[],fingerTips=[];
  weapon.body.add(mount,forearm);
  mount.add(spinPivot);
  hand.add(thumb);

  // --- Proportioned Gloved Right Hand (matched to 0.070 karambit ring & grip) ---
  pad(hand,glove,.046,-.012,.028,.037,.027,.019);
  pad(hand,knuckle,.040,.010,.026,.033,.012,.014);
  pad(hand,armorPlate,.043,.007,.035,.027,.009,.006);
  for(let i=0;i<4;i++){
    pad(hand,knuckle,.017+i*.0165,.015-i*.003,.027,.0105,.0095,.011);
  }
  // Index finger curling from top-left knuckle cleanly THROUGH the 0.070 tail ring at (0,0,0)!
  tube(hand,glove,[.016,.014,.025],[.003,.003,.011],.0086,.0074,10);
  pad(hand,knuckle,.003,.003,.011,.0076,.0074,.0076);
  tube(hand,glove,[.003,.003,.011],[-.001,-.001,-.012],.0070,.0062,12);
  pad(hand,knuckle,-.001,-.001,-.012,.0064,.0064,.0064);

  const palmGrip=paint(0x414943,.87,.06);
  pad(hand,palmGrip,.049,-.012,.010,.022,.012,.004);
  pad(hand,glove,.029,-.020,.010,.011,.009,.005);
  // The forearm keeps its line when the palm rolls. Both parts meet at the cuff.
  const wPt=[.090,-.044,.040], ePt=[.281,-.211,.252];
  const wristJoint=new T.Vector3(...wPt);
  const aLerp=t=>[wPt[0]+(ePt[0]-wPt[0])*t,wPt[1]+(ePt[1]-wPt[1])*t,wPt[2]+(ePt[2]-wPt[2])*t];
  tube(hand,glove,[.060,-.019,.029],wPt,.024,.025,14);
  pad(forearm,cuffMatte,wPt[0],wPt[1],wPt[2],.026,.027,.026);
  tube(forearm,cuffMatte,wPt,aLerp(.14),.026,.032,14);
  tube(forearm,sleeveBand,aLerp(.14),aLerp(.23),.033,.035,14);
  tube(forearm,cloth,ePt,aLerp(.13),.053,.032,14);
  tube(forearm,clothFold,aLerp(.45),aLerp(.58),.042,.045,14);
  bake(forearm);

  // 3 articulated fingers (Middle, Ring, Pinky) proportioned to the 0.070 handle
  for(let i=0;i<3;i++){
    const finger=new T.Group(),tipJoint=new T.Group();
    const s=1-i*.09;
    finger.position.set(.031+i*.0165,.015-i*.003,.023);
    tipJoint.position.set(0,.006,-.020*s);
    tube(finger,glove,[0,0,0],tipJoint.position.toArray(),.0082*s,.0073*s,10);
    pad(finger,knuckle,0,.006,-.020*s,.0073*s,.0072*s,.0073*s);
    tube(tipJoint,glove,[0,0,0],[0,-.019*s,-.003*s],.0071*s,.0055*s,10);
    pad(tipJoint,knuckle,0,-.019*s,-.003*s,.0057*s,.0057*s,.0062*s);
    bake(finger);bake(tipJoint);
    finger.add(tipJoint);hand.add(finger);
    fingers.push(finger);fingerTips.push(tipJoint);
  }
  // Articulated thumb on lower-left palm
  thumb.position.set(.036,-.028,.024);
  tube(thumb,glove,[0,0,0],[-.021,.008,-.013],.010,.0086,10);
  pad(thumb,knuckle,-.011,.004,-.006,.0096,.0090,.0096);
  pad(thumb,knuckle,-.021,.008,-.013,.0086,.0084,.0088);
  bake(thumb);

  // --- INDEPENDENT TACTICAL LEFT GUARD ARM (matches Butterfly Knife craft; tucked in idle, rises during inspect/combat!) ---
  const leftRig=new T.Group();
  leftRig.name='KarambitLeftGuard';
  leftRig.position.set(-.34,-.30,-.04);
  leftRig.rotation.set(.16,-.24,.22);
  weapon.root.add(leftRig);
  const leftMesh=new T.Group();
  tube(leftMesh,cloth,[-.115,-.195,.34],[-.020,-.034,.062],.092,.052,11);
  tube(leftMesh,sleeveBand,[-.026,-.044,.078],[-.016,-.027,.048],.0545,.0515,11);
  tube(leftMesh,cuffMatte,[-.016,-.027,.048],[.002,.002,-.004],.050,.044,11);
  pad(leftMesh,glove,.012,.012,-.038,.019,.027,.042);
  pad(leftMesh,knuckle,.002,.020,-.036,.012,.023,.038);
  tube(leftMesh,glove,[.016,.028,-.024],[.032,.044,-.054],.0108,.0088,9);
  for(let i=0;i<4;i++){
    const zz=-.066+i*.018, s=1-i*.07;
    tube(leftMesh,glove,[.012,.018-i*.004,zz],[.034*s,.024-i*.005,zz-.022*s],.0096*s,.0078*s,8);
  }
  bake(leftMesh);
  leftRig.add(leftMesh);

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
  weapon.karambit={mount,spinPivot,ringPivot:spinPivot,fingers,fingerTips,thumb,forearm,leftRig,wristJoint,debugGizmo,updateDebugGizmo,ready};
}
