import * as T from './three.module.js';
import {installM9Finish} from './m9-finish.js?v=2';

export function bladeFinish(){
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

const assetUrl=new URL('./assets/bayonet/m9_bayonet_fade.glb',import.meta.url).href;
// Exact right-handed basis rotation (det = +1, winding-preserving) for CS2 dorsal-fist hold:
// GLB +X (blade thickness) -> Local +Y
// GLB +Y (pommel->tip)     -> Local -Z
// GLB +Z (sawback & ring)  -> Local -X (bottom-left/fingertips; cutting edge on +X/up-right!)
// Scale 1.66 + Z-offset +0.040 seats crossguard at Z=-0.026 and Bowie tip at Z=-0.348 matching the hand rig.
const mountTransform=new T.Matrix4()
  .makeTranslation(0,0,.040)
  .multiply(new T.Matrix4().makeScale(1.66,1.66,1.66))
  .multiply(new T.Matrix4().makeBasis(
    new T.Vector3(0,1,0),
    new T.Vector3(0,0,-1),
    new T.Vector3(-1,0,0)
  ));

async function loadBayonetMesh(){
  const response=await fetch(assetUrl);
  if(!response.ok)throw new Error('M9 Bayonet Fade GLB could not be loaded');
  const buffer=await response.arrayBuffer(),header=new DataView(buffer);
  if(header.getUint32(0,true)!==0x46546c67||header.getUint32(4,true)!==2)throw new Error('Invalid M9 Bayonet GLB');
  const jsonLength=header.getUint32(12,true),bin=28+jsonLength;
  const gltf=JSON.parse(new TextDecoder().decode(new Uint8Array(buffer,20,jsonLength)));
  const primitive=gltf.meshes[0].primitives[0];
  const geometry=new T.BufferGeometry();
  function accessor(index,Type,components){
    const a=gltf.accessors[index],view=gltf.bufferViews[a.bufferView];
    return new T.BufferAttribute(new Type(buffer,bin+(view.byteOffset??0)+(a.byteOffset??0),a.count*components),components);
  }
  const uv=accessor(primitive.attributes.TEXCOORD_0,Float32Array,2);
  geometry.setAttribute('position',accessor(primitive.attributes.POSITION,Float32Array,3));
  geometry.setAttribute('normal',accessor(primitive.attributes.NORMAL,Float32Array,3));
  geometry.setAttribute('uv',uv);
  const idxComp=gltf.accessors[primitive.indices].componentType;
  geometry.setIndex(accessor(primitive.indices,idxComp===5123?Uint16Array:Uint32Array,1));
  geometry.applyMatrix4(mountTransform);

  const loader=new T.TextureLoader();
  async function decodeImage(idx,colorSpace){
    const source=gltf.images[idx],view=gltf.bufferViews[source.bufferView];
    const bytes=new Uint8Array(buffer,bin+(view.byteOffset??0),view.byteLength);
    const url=URL.createObjectURL(new Blob([bytes],{type:source.mimeType}));
    try{
      const tex=await loader.loadAsync(url);
      tex.flipY=false;
      tex.colorSpace=colorSpace;
      tex.anisotropy=4;
      return tex;
    }finally{
      URL.revokeObjectURL(url);
    }
  }
  const [map,ormMap,normalMap]=await Promise.all([
    decodeImage(0,T.SRGBColorSpace),
    decodeImage(1,T.NoColorSpace),
    decodeImage(2,T.NoColorSpace)
  ]);
  const material=new T.MeshPhysicalMaterial({
    map,
    roughnessMap:ormMap,
    metalnessMap:ormMap,
    aoMap:ormMap,
    aoMapIntensity:.65,
    normalMap,
    normalScale:new T.Vector2(.85,.85),
    roughness:1.0,
    metalness:1.0,
    clearcoat:.89,
    clearcoatRoughness:.115,
    iridescence:.18,
    iridescenceIOR:1.31
  });
  material.envMapIntensity=1.50;
  const mesh=new T.Mesh(geometry,material);
  mesh.name='M9 Bayonet Fade';
  return {mesh,setFinish:installM9Finish(material)};
}

function addBladeTrail(root,spinPivot,carrierOffset,tip,style){
  // Angles are subdivided before writing the preallocated 5-rail ribbon so quick swipes stay silky smooth.
  const count=56,lifetime=style?.108:.078,rails=5;
  const positions=new Float32Array(count*rails*3),colors=new Float32Array(count*rails*4);
  const ages=new Float32Array(count),strengths=new Float32Array(count),indices=[];
  for(let i=0;i<count-1;i++){
    for(let j=0;j<rails-1;j++){
      const a=i*rails+j,b=a+rails;
      indices.push(a,a+1,b,a+1,b+1,b);
    }
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

  const baseLocal=new T.Vector3(0,0,style?-.08:-.22).add(carrierOffset);
  const tipLocal=tip.clone().add(carrierOffset);
  const pBase=new T.Vector3(),pTip=new T.Vector3(),railPos=new T.Vector3();
  const railStrength=[.02,.12,.22,.46,.10];
  const fadeRails=[
    [.48,.20,.88,.02],
    [.76,.26,.82,.10],
    [.98,.44,.68,.20],
    [1.0,.76,.54,.42],
    [1.0,.95,.84,.12]
  ];
  const finishTint=new T.Color();
  let tint=style?new T.Color(style.color):null;
  const lastParentPos=new T.Vector3(),parentPos=new T.Vector3();
  const lastParentQuat=new T.Quaternion(),parentQuat=new T.Quaternion();
  const parentScale=new T.Vector3(1,1,1),unitScale=new T.Vector3(1,1,1);
  const lastOffset=new T.Vector3(),lastSpin=new T.Quaternion();
  const stepPos=new T.Vector3(),stepQuat=new T.Quaternion();
  const stepParent=new T.Matrix4(),stepLocal=new T.Matrix4(),stepWorld=new T.Matrix4();
  let used=0,lastStrength=0;

  function pushSample(mat,age,strength){
    used=Math.min(used+1,count);
    positions.copyWithin(rails*3,0,(used-1)*rails*3);
    ages.copyWithin(1,0,used-1);
    strengths.copyWithin(1,0,used-1);
    pBase.copy(baseLocal).applyMatrix4(mat);
    pTip.copy(tipLocal).applyMatrix4(mat);
    for(let j=0;j<rails;j++)railPos.copy(pBase).lerp(pTip,j/(rails-1)).toArray(positions,j*3);
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
      const steps=Math.min(12,Math.max(1,Math.ceil(twist/(style?.075:.08))));
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
      const c=i*rails*4;
      if(tint){
        for(let j=0;j<rails;j++){
          const k=c+j*4,light=.67+j*.07;
          const railAlpha=rails===2?(j?.72:.20):railStrength[j];
          colors[k]=tint.r*light;colors[k+1]=tint.g*light;colors[k+2]=tint.b*light;
          colors[k+3]=fade*railAlpha;
        }
      }else{
        for(let j=0;j<rails;j++){
          const k=c+j*4,s=fadeRails[j];
          colors[k]=s[0];colors[k+1]=s[1];colors[k+2]=s[2];colors[k+3]=fade*s[3];
        }
      }
      visible||=fade>.02;
    }
    ribbon.visible=visible&&used>1;
    if(!ribbon.visible){
      if(strength<.03)resetTrail();
      return;
    }
    ribbon.matrix.copy(root.matrixWorld).invert();
    ribbon.matrixWorldNeedsUpdate=true;
    geometry.setDrawRange(0,(used-1)*(rails-1)*6);
    position.needsUpdate=true;color.needsUpdate=true;
  }

  function setTrailTint(hex){
    tint=hex===null?null:finishTint.setHex(hex);
    resetTrail();
  }
  return {resetTrail,updateTrail,setTrailTint};
}

export function buildBayonet(parts){
  let selected='fade',applyFinish;
  const model=buildFixedBladeRig(parts,'m9',carrier=>loadBayonetMesh().then(({mesh,setFinish})=>{
    applyFinish=setFinish;
    carrier.add(mesh);
    model.setTrailTint(applyFinish(selected));
  }),
    new T.Vector3(.006,0,-.348));
  model.setFinish=(id)=>{
    selected=id;
    if(applyFinish)model.setTrailTint(applyFinish(selected));
  };
  return model;
}

export function buildFixedBladeRig(parts,id,buildKnife,tip,style){
  const {box,tube,pad,bake,paint,cloth,clothFold,glove,knuckle,sleeveBand,twill}=parts;
  const root=new T.Group(), right=new T.Group(), left=new T.Group(), sleeve=new T.Group();
  const spinPivot=new T.Group(), knifeCarrier=new T.Group();
  const carrierOffset=new T.Vector3(0,0,-.045);
  spinPivot.position.set(0,0,.045);
  knifeCarrier.position.copy(carrierOffset);
  spinPivot.add(knifeCarrier);
  root.name=id;right.name=id+'-grip';left.name=id+'-support';
  spinPivot.name=id+'-spinPivot';knifeCarrier.name=id+'-knifeCarrier';
  root.add(right,left,sleeve);

  const groove=paint(0x292e28,.88,.04,twill);

  // The fingers and blade share the wrist. Finger pivots let the glove open clear during 360° flips.
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

  const ready=buildKnife(knifeCarrier);
  const trail=addBladeTrail(root,spinPivot,carrierOffset,tip,style);

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
  return {root,right,left,sleeve,thumb,fingers,spinPivot,knifeCarrier,...trail,ready};
}
