import * as T from './three.module.js';

const assetUrl=new URL('./assets/karambit/low_poly_karambit_bicagi.glb',import.meta.url).href;
// Source GLB lies in XY with ring hole along Z.
// RotateX(PI) + RotateZ(+0.92) places ring cleanly on the LEFT (0,0,0), handle horizontally LEFT->RIGHT (+X),
// concave finger grooves facing UP (+Y), and curved Doppler blade sweeping RIGHT & UPWARD — exact CS2 Karambit silhouette!
const ringCenter=new T.Vector3(-.271,-.708,.002);
const mountTransform=new T.Matrix4().makeRotationZ(.92)
  .multiply(new T.Matrix4().makeRotationX(Math.PI))
  .multiply(new T.Matrix4().makeScale(.132,.132,.132))
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
  // 28-segment luminous Valorant Reaver / Doppler continuous ~270° spin vortex & slash ribbon (zero-GC preallocated).
  const count=28,lifetime=.172;
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
  const edge=new T.Vector3(.76,.72,-.0054).applyMatrix4(mountTransform);
  const tip=new T.Vector3(1.29665,.69502,-.0054).applyMatrix4(mountTransform);
  const nextEdge=new T.Vector3(),nextTip=new T.Vector3(),lastTip=new T.Vector3();
  let samples=0;
  weapon.resetTrail=()=>{samples=0;ribbon.visible=false;};
  weapon.updateTrail=dt=>{
    if(dt<=0)return;
    ring.updateWorldMatrix(true,false);
    nextEdge.copy(edge).applyMatrix4(ring.matrixWorld);
    nextTip.copy(tip).applyMatrix4(ring.matrixWorld);
    const speed=samples?nextTip.distanceTo(lastTip)/dt:0;
    lastTip.copy(nextTip);
    samples=Math.min(samples+1,count);
    positions.copyWithin(6,0,(samples-1)*6);
    ages.copyWithin(1,0,samples-1);
    strengths.copyWithin(1,0,samples-1);
    nextEdge.toArray(positions,0);nextTip.toArray(positions,3);
    ages[0]=0;
    strengths[0]=T.MathUtils.clamp((speed-0.85)/3.1,0,1);
    let visible=false;
    for(let i=0;i<samples;i++){
      if(i)ages[i]+=dt;
      const fade=Math.max(0,1-ages[i]/lifetime)**1.45*strengths[i];
      const offset=i*8;
      // Rich Reaver/Doppler violet-crimson inner vortex fading to glowing ice-lavender razor edge
      colors[offset]=.62;colors[offset+1]=.24;colors[offset+2]=.92;colors[offset+3]=fade*.16;
      colors[offset+4]=.88;colors[offset+5]=.78;colors[offset+6]=1.0;colors[offset+7]=fade*.52;
      visible||=fade>.015;
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
  // Exact CS2 Karambit dorsal-fist idle framing: ring at lower-center-right, dorsal glove across middle,
  // full curved Doppler blade & upturned claw tip 100% visible inside 16:9 without right-edge cropping!
  weapon.hipX=.006;weapon.hipY=-.106;weapon.hipZ=-.515;
  weapon.hinges=true;

  const cuffMatte=paint(0x1d2224,.88,.04);
  const armorPlate=paint(0x2d3230,.58,.18);
  const mount=new T.Group(),ringPivot=new T.Group(),thumb=new T.Group();
  const hand=weapon.hand,fingers=[];
  weapon.body.add(mount);
  mount.add(ringPivot);
  hand.add(thumb);

  // --- CS2 DORSAL RIGHT FIST (Back of gloved hand facing +Z camera, angled up-left from bottom-right forearm!) ---
  pad(hand,glove,.062,-.014,.034,.052,.038,.026);
  // Contoured anatomical hard-knuckle dorsal guard (smooth ellipsoid, zero boxy edges!)
  pad(hand,knuckle,.054,.014,.032,.044,.017,.021);
  pad(hand,armorPlate,.058,.010,.043,.038,.014,.010);
  for(let i=0;i<4;i++){
    pad(hand,knuckle,.024+i*.022,.020-i*.004,.034,.0135,.012,.014);
  }
  // Index finger curling from top-left knuckle cleanly THROUGH the Karambit ring at (0,0,0)!
  tube(hand,glove,[.022,.018,.032],[.004,.005,.016],.0125,.0112,10);
  pad(hand,knuckle,.004,.005,.016,.0115,.011,.0115);
  tube(hand,glove,[.004,.005,.016],[-.002,-.002,-.016],.0108,.0094,12);
  pad(hand,knuckle,-.002,-.002,-.016,.0095,.0095,.0095);

  // Seamless wrist gaiter & diagonal forearm sweeping cleanly off bottom-right corner (zero z-fighting!)
  const wPt=[.114,-.054,.048], ePt=[.265,-.235,.295];
  const aLerp=t=>[wPt[0]+(ePt[0]-wPt[0])*t,wPt[1]+(ePt[1]-wPt[1])*t,wPt[2]+(ePt[2]-wPt[2])*t];
  tube(hand,glove,[.078,-.024,.036],wPt,.034,.036,14);
  pad(hand,cuffMatte,wPt[0],wPt[1],wPt[2],.039,.039,.039);
  tube(hand,cuffMatte,wPt,aLerp(.14),.039,.044,14);
  tube(hand,sleeveBand,aLerp(.14),aLerp(.24),.0468,.0495,14);
  tube(hand,cloth,ePt,aLerp(.13),.072,.044,14);
  tube(hand,clothFold,aLerp(.45),aLerp(.58),.057,.060,14);

  // 3 articulated fingers (Middle, Ring, Pinky) hinged along the top-back knuckle ridge (y = +0.020, z = +0.028):
  // At opening=0 (CS2 Idle), they curl OVER the top and down around the horizontal handle;
  // At opening=1 (CS2 Draw & Valorant Spin), they uncurl UP/BACK (+Z/+Y) cleanly clearing the XY spin plane!
  for(let i=0;i<3;i++){
    const finger=new T.Group();
    const s=1-i*.07;
    finger.position.set(.042+i*.022,.020-i*.004,.028);
    tube(finger,glove,[0,0,0],[0,.008,-.026*s],.0108*s,.0096*s,10);
    pad(finger,knuckle,0,.008,-.026*s,.0098*s,.0096*s,.010*s);
    tube(finger,glove,[0,.008,-.026*s],[0,-.022*s,-.030*s],.0094*s,.0082*s,10);
    pad(finger,knuckle,0,-.022*s,-.030*s,.0084*s,.0084*s,.0086*s);
    bake(finger);
    hand.add(finger);
    fingers.push(finger);
  }
  // Articulated thumb on lower-left palm capping under the ring-neck in idle, swinging back (+Z) during spins
  thumb.position.set(.048,-.036,.030);
  tube(thumb,glove,[0,0,0],[-.028,.010,-.016],.0125,.0108,10);
  pad(thumb,knuckle,-.014,.005,-.008,.0120,.0112,.0120);
  pad(thumb,knuckle,-.028,.010,-.016,.0108,.0104,.0110);
  bake(thumb);

  addBladeTrail(weapon,ringPivot);
  const ready=loadKnife().then(mesh=>{ringPivot.add(mesh);});
  weapon.karambit={mount,ringPivot,fingers,thumb,ready};
}
