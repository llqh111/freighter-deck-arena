import {buildArmory} from './armory-models.js?v=36';
import {isMelee} from './arsenal.js?v=28';
import {createKarambitMotion,KARAMBIT_INSPECT_CONFIG,KARAMBIT_KEYFRAMES} from './karambit-motion.js?v=19';
import {createButterflyMotion} from './butterfly-motion.js?v=24';
import {buildBayonet} from './bayonet-model.js?v=3';
import {createBayonetMotion} from './bayonet-motion.js?v=4';
import * as T from './three.module.js';

function brushedSurface(fabric = false) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 128;
  const ctx = canvas.getContext('2d');
  const pixels = ctx.createImageData(128, 128);
  let seed = 2207;
  for (let y = 0; y < 128; y++) {
    for (let x = 0; x < 128; x++) {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      const base = fabric ? 215 + (x % 3 === 0 ? 18 : 0) - (y % 3 === 0 ? 22 : 0) : 232 + Math.sin(y * 2.9) * 5;
      const shade = base + (seed / 4294967296 - .5) * 19;
      const i = 4 * (y * 128 + x);
      pixels.data.set([shade, shade, shade, 255], i);
    }
  }
  ctx.putImageData(pixels, 0, 0);
  const texture = new T.CanvasTexture(canvas);
  texture.colorSpace = T.SRGBColorSpace;
  texture.wrapS = texture.wrapT = T.RepeatWrapping;
  texture.repeat.set(fabric ? 2 : 1, fabric ? 2 : 1);
  return texture;
}

// Lightweight maritime sky + steel-deck studio environment map so high-metalness blades reflect liquid highlights.
function maritimeStudioEnv() {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 128;
  const ctx = canvas.getContext('2d');
  const sky = ctx.createLinearGradient(0, 0, 0, 128);
  sky.addColorStop(0.00, '#5d8ab2');
  sky.addColorStop(0.32, '#bad9f2');
  sky.addColorStop(0.47, '#fff6e4');
  sky.addColorStop(0.52, '#6d777c');
  sky.addColorStop(0.72, '#3d4548');
  sky.addColorStop(1.00, '#23282b');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, 256, 128);
  // Crisp key-sun & cool rim studio cards for anisotropic-like blade bevel sweeps
  const sun = ctx.createRadialGradient(72, 38, 2, 72, 38, 42);
  sun.addColorStop(0, 'rgba(255,250,235,0.95)');
  sun.addColorStop(0.45, 'rgba(255,228,185,0.42)');
  sun.addColorStop(1, 'rgba(255,228,185,0)');
  ctx.fillStyle = sun;
  ctx.fillRect(0, 0, 160, 90);
  const rim = ctx.createRadialGradient(204, 44, 3, 204, 44, 48);
  rim.addColorStop(0, 'rgba(180,230,255,0.78)');
  rim.addColorStop(1, 'rgba(180,230,255,0)');
  ctx.fillStyle = rim;
  ctx.fillRect(140, 0, 116, 96);
  const tex = new T.CanvasTexture(canvas);
  tex.colorSpace = T.SRGBColorSpace;
  tex.mapping = T.EquirectangularReflectionMapping;
  return tex;
}

// Bake fixed pieces by finish so fine surface details cost few draw calls.
function bake(group) {
  const batches = new Map();
  for (const part of [...group.children]) {
    if (!part.isMesh) continue;
    part.updateMatrix();
    const g = part.geometry.index ? part.geometry.toNonIndexed() : part.geometry.clone();
    g.applyMatrix4(part.matrix);
    const material = part.material;
    if (!batches.has(material)) batches.set(material, {position: [], normal: [], uv: []});
    const batch = batches.get(material);
    for (const key of Object.keys(batch)) batch[key].push(...g.attributes[key].array);
    g.dispose();
    part.geometry.dispose();
    group.remove(part);
  }
  for (const [material, data] of batches) {
    const g = new T.BufferGeometry();
    for (const key of Object.keys(data)) g.setAttribute(key, new T.Float32BufferAttribute(data[key], key === 'uv' ? 2 : 3));
    group.add(new T.Mesh(g, material));
  }
}

// Pre-defined physical rotation fulcrums in spinMount local space:
// 0: palm grip center, 1: thumb barrel rollover, 2: V-notch index Chaplin axle, 3: blade-tang CoM aerial
const PIVOT_TABLE = [
  [ 0.000, -0.012,  0.044],
  [-0.003,  0.017,  0.042],
  [-0.003,  0.013,  0.014],
  [ 0.000, -0.013, -0.002]
];

export function createViewModel(playMotionSound = () => {}) {
  const scene = new T.Scene();
  const camera = new T.PerspectiveCamera(48, 1, .015, 5);
  const rig = new T.Group();
  const fixed = new T.Group(), magazine = new T.Group(), support = new T.Group();
  scene.add(rig);
  rig.add(fixed, magazine, support);
  scene.add(new T.HemisphereLight(0xe8f3ff, 0x8e7861, 2.05));
  const key = new T.DirectionalLight(0xffdfb1, 3.35);
  key.position.set(-2, 3, -2);
  scene.add(key);
  const rim = new T.DirectionalLight(0xa4d6f6, 1.55);
  rim.position.set(3, 2, 1);
  scene.add(rim);
  const steelGrain = brushedSurface(), twill = brushedSurface(true);
  const paint = (color, roughness, metalness, map) => {
    const m = new T.MeshStandardMaterial({color, roughness, metalness, map: map || null});
    m.envMapIntensity = 0.28;
    return m;
  };
  const alloy = paint(0x465057, .43, .42, steelGrain), graphite = paint(0x2e3438, .49, .38, steelGrain);
  const parker = paint(0x171e22,.65,.26), edges = paint(0x748087,.42,.50), rubber = paint(0x202526,.90,.02,twill);
  const earth = paint(0x625e4d,.71,.12,steelGrain), inlay = paint(0x171c1c,.96,.01);
  const cloth = paint(0x55605b,.94,.01,twill), clothFold = paint(0x3c4741,.92,.01,twill);
  const glove = paint(0x373b35,.89,.015,twill), knuckle = paint(0x4e5046,.77,.025,twill);
  const amber = paint(0xd8a44c,.6,.13), bone = paint(0xb7c2ba,.62,.13);
  function mesh(parent, g, mat, x,y,z) {
    const obj = new T.Mesh(g, mat);
    obj.position.set(x,y,z);
    parent.add(obj);
    return obj;
  }
  function box(parent, mat, x,y,z, w,h,d) {
    return mesh(parent,new T.BoxGeometry(w,h,d),mat,x,y,z);
  }
  function profile(parent, mat, width, coords, x=0) {
    const shape = new T.Shape();
    coords.forEach(([z,y], i) => i ? shape.lineTo(-z,y) : shape.moveTo(-z,y));
    shape.closePath();
    const bevel = Math.min(.005, width * .09);
    const geo = new T.ExtrudeGeometry(shape,{depth:width,bevelEnabled:true,bevelThickness:bevel,bevelSize:bevel,bevelSegments:1});
    geo.translate(0,0,-width/2);
    geo.rotateY(Math.PI/2);
    return mesh(parent,geo,mat,x,0,0);
  }
  function tube(parent, mat, a,b, ra,rb, segments=12){
    const v = new T.Vector3(...a), end = new T.Vector3(...b), dir = end.clone().sub(v);
    const obj = mesh(parent,new T.CylinderGeometry(rb,ra,dir.length(),segments),mat,...v.clone().lerp(end,.5).toArray());
    obj.quaternion.setFromUnitVectors(new T.Vector3(0,1,0),dir.normalize());
    return obj;
  }
  function pad(parent, mat,x,y,z,a,b,c) {
    const obj = mesh(parent,new T.SphereGeometry(1,12,9),mat,x,y,z);
    obj.scale.set(a,b,c);
    return obj;
  }
  // Faceted receiver, overmoulded stock and a recessed side panel.
  profile(fixed,graphite,.109,[[.22,.057],[-.19,.057],[-.24,.035],[-.215,-.044],[-.145,-.069],[.17,-.069],[.22,-.035]]);
  profile(fixed,earth,.097,[[.19,-.036],[-.16,-.036],[-.153,-.097],[-.099,-.119],[-.024,-.115],[.002,-.077],[.124,-.080],[.164,-.10]]);
  profile(fixed,graphite,.09,[[.39,.012],[.24,.038],[.20,.028],[.20,-.032],[.30,-.056],[.392,-.169]]);
  profile(fixed,rubber,.096,[[.386,.013],[.410,.006],[.415,-.167],[.389,-.172]]);
  profile(fixed,earth,.099,[[.368,.025],[.24,.045],[.23,.013],[.342,-.005],[.38,-.006]]);
  for(const side of [-1,1]){
    box(fixed,alloy,side*.055,.004,.022,.004,.056,.274);
    box(fixed,parker,side*.057,.010,-.002,.004,.018,.184);
    box(fixed,edges,side*.059,.018,.041,.003,.003,.085);
    for (const z of [-.118,.138]) tube(fixed,edges,[side*.054,-.027,z],[side*.06,-.027,z],.007,.007,8);
    for(let i=0;i<3;i++)box(fixed,i===0?amber:bone,side*.054,-.055,.09-i*.012,.003,.006,.006);
  }
  profile(fixed,rubber,.065,[[.111,-.066],[.056,-.078],[.086,-.211],[.147,-.205]]);
  profile(magazine,graphite,.067,[[-.124,-.086],[-.047,-.09],[-.05,-.183],[-.066,-.259],[-.148,-.251],[-.125,-.175]]);
  profile(magazine,rubber,.073,[[-.143,-.236],[-.064,-.243],[-.062,-.261],[-.151,-.256]]);
  for (let i=0;i<5;i++) box(magazine,alloy,-.035,-.119-i*.022,-.089-i*.002,.005,.008,.058);
  // Slotted fore-end and top rail ribs.
  profile(fixed,earth,.092,[[-.16,.049],[-.475,.046],[-.502,.022],[-.493,-.037],[-.465,-.054],[-.17,-.053]]);
  for(const side of [-1,1]) {
    for(let i=0;i<6;i++) {
      const z=-.206-i*.047;
      box(fixed,inlay,side*.048,.009,z,.003,.020,.030);
      box(fixed,alloy,side*.049,-.022,z,.003,.007,.032);
    }
  }
  box(fixed,parker,0,.059,-.132,.043,.014,.646);
  for(let i=0;i<35;i++) box(fixed,alloy,0,.069,.181-i*.018,.053,.009,.010);
  tube(fixed,graphite,[0,.002,-.483],[0,.002,-.62],.023,.019,16);
  tube(fixed,alloy,[0,.002,-.584],[0,.002,-.637],.030,.029,12);
  tube(fixed,parker,[0,.002,-.635],[0,.002,-.642],.017,.017,12);
  // Sight hood is open through the middle to preserve the sight picture.
  box(fixed,parker,0,.081,.086,.061,.019,.091);
  const sightY=.139;
  const arch = [[-.042,.092],[-.045,.147],[-.031,.170],[.031,.170],[.045,.147],[.042,.092]];
  for(let i=1;i<arch.length;i++){
    const [a,b]=[arch[i-1],arch[i]];
    const block = box(fixed,graphite,(a[0]+b[0])/2,(a[1]+b[1])/2,.082,Math.hypot(b[0]-a[0],b[1]-a[1])+.003,.009,.043);
    block.rotation.z = Math.atan2(b[1]-a[1],b[0]-a[0]);
  }
  box(fixed,alloy,-.053,.116,.080,.018,.023,.026);
  const reflex = mesh(fixed,new T.CircleGeometry(.0018,12),new T.MeshBasicMaterial({color:0xff744e,toneMapped:false}),0,sightY,.079);
  const markCanvas=document.createElement('canvas');
  markCanvas.width=512; markCanvas.height=128;
  const pen=markCanvas.getContext('2d');
  pen.fillStyle='#c5c9ba'; pen.font='bold 39px monospace'; pen.fillText('F R T  /  7',14,44);
  pen.font='20px monospace';pen.fillText('MARITIME   04-27',14,82);
  for(let i=0;i<34;i++)pen.fillRect(300+i*5,23, i%4===0?4:2,57);
  const print=new T.CanvasTexture(markCanvas);print.colorSpace=T.SRGBColorSpace;
  const label=mesh(fixed,new T.PlaneGeometry(.111,.028),new T.MeshBasicMaterial({map:print,transparent:true,depthWrite:false}),-.0585,-.017,.02);
  label.rotation.y=-Math.PI/2;
  const sleeveBand=paint(0x47788b,.86,.02,twill);
  function arm(parent, shoulder, wrist, palm, isSupport) {
    const a=new T.Vector3(...shoulder), b=new T.Vector3(...wrist);
    const p=t=>a.clone().lerp(b,t).toArray();
    tube(parent,cloth,shoulder,wrist,.109,.057,11);
    for (const t of [.4,.68,.80]) tube(parent,clothFold,p(t-.025),p(t+.015),.11-.052*t,.108-.052*t,11);
    tube(parent,sleeveBand,p(.82),p(.875),.068,.065,11);
    tube(parent,rubber,p(.9),p(1.01),.064,.058);
    pad(parent,glove,...palm,.050,.051,.072);
    const [x,y,z]=palm;
    for (let i=0;i<4;i++) {
      if(isSupport) {
        const zz=z-.043+i*.023;
        pad(parent,knuckle,x-.014,y+.022,zz,.026,.030,.012);
        pad(parent,glove,x+.011,y+.044,zz-.003,.029,.015,.010);
      } else pad(parent,knuckle,x-.025,y+.042-i*.022,z-.022,.028,.012,.034);
    }
    pad(parent,knuckle,x+.024,y+.025,z+.023,.024,.023,.041);
  }
  arm(fixed,[.153,-.317,.44],[.108,-.152,.167],[.060,-.134,.117],false);
  arm(support,[-.19,-.294,.17],[-.086,-.109,-.209],[-.056,-.065,-.275],true);
  // Keep transparent markings after opaque batches in the render queue.
  fixed.remove(reflex,label);
  bake(fixed);bake(magazine);bake(support);
  fixed.add(reflex,label);
  const flash=new T.Group();
  rig.add(flash);
  flash.position.set(0,.002,-.650);
  const flare = new T.MeshBasicMaterial({color:0xffd27a,transparent:true,opacity:.9,depthWrite:false,blending:T.AdditiveBlending,toneMapped:false});
  const core = new T.MeshBasicMaterial({color:0xfff2c6,toneMapped:false});
  tube(flash,core,[0,0,0],[0,0,-.095],.024,.001,8);
  for(let i=0;i<5;i++) {
    const a=i*2*Math.PI/5;
    tube(flash,flare,[0,0,0],[Math.cos(a)*.067,Math.sin(a)*.067,-.100-(i%2)*.075],.022,.001,5);
  }
  bake(flash);
  flash.visible=false;
  const parts={
    box,tube,pad,profile,arm,bake,paint,
    graphite,alloy,edges,parker,rubber,amber,bone,
    cloth,clothFold,glove,knuckle,sleeveBand,steelGrain,twill
  };
  const arsenal=buildArmory(parts);
  const original=new T.Group();
  original.name='m4a1';original.add(fixed,magazine,support);
  arsenal.m4a1={root:original,mag:magazine,hand:support,sight:sightY,hipX:.222,hipY:-.191,hipZ:-.546,muzzle:-.65,kick:.94};
  for (const entry of Object.values(arsenal)){rig.add(entry.root);entry.root.visible=false;}
  const bayonet=buildBayonet(parts);
  bayonet.root.visible=false;
  scene.add(bayonet.root);
  arsenal.m9={root:bayonet.root,mag:new T.Group(),hand:new T.Group(),hipX:.22,hipY:-.20,hipZ:-.60,sight:.11};
  let id='m4a1', current=arsenal[id];current.root.visible=true;
  let phase=0,recoil=0,spark=0,aim=0,walk=0,sprintBlend=0,loading=-1,reloadSignal=false;
  let swayX=0,swayY=0,tilt=0,karambitFraming=0;
  let wasGrounded=true,airOffset=0,landDip=0,landVel=0,camKickPitch=0,camKickRoll=0;
  let lastAirSpeed=0;
  let curPivX=0,curPivY=-.012,curPivZ=.042;
  let aspect=1.7,draw=0,gesture=1,gestureDuration=.5,kind='',inspectT=1,loadDuration=1.45;
  const ease=(x,y,dt,rate)=>T.MathUtils.lerp(x,y,1-Math.exp(-rate*dt));
  const butterflyMotion=createButterflyMotion((cue,spinSpeed=0)=>{
    const boost=cue==='butterflySpin'?Math.min(.22,spinSpeed*.008):0;
    playMotionSound({kind:cue,weapon:'butterfly',volume:Math.min(.92,.72+boost),pan:.13});
  });
  const karambitMotion=createKarambitMotion((cue,volume)=>playMotionSound({kind:cue,weapon:'karambit',volume,pan:.13}));
  const bayonetMotion=createBayonetMotion((cue,volume)=>playMotionSound({kind:cue,weapon:'m9',volume,pan:.12}));
  const sleeveDirection=new T.Vector3(),wristUp=new T.Vector3(0,1,0);
  const wristSocket=new T.Vector3(.049,-.046,.102);
  const bayonetAdditive=new T.Quaternion(),bayonetEuler=new T.Euler(0,0,0,'YXZ');
  let bayonetCrouch=0,bayonetFov=78,bayonetGuard=0;
  const karambitBaseRigQ=new T.Quaternion(),karambitRigEul=new T.Euler(0,0,0,'YXZ');
  const karambitMountBaseQ=new T.Quaternion().setFromEuler(new T.Euler(.08,-.56,.18,'YXZ'));
  const karambitWristAnchor=arsenal.karambit.karambit.wristJoint.clone().applyQuaternion(karambitMountBaseQ);
  arsenal.karambit.karambit.forearm.quaternion.copy(karambitMountBaseQ);
  function equip(value) {
    const raw=String(value?.id || value || '').toLowerCase().replace(/[-_ ]/g,'');
    const next=({grenade:'he',deserteagle:'deagle',ak:'ak47',m4:'m4a1',kukri:'nepal',kris:'malay'})[raw]||raw;
    if(!arsenal[next])return;
    if(current.resetTrail)current.resetTrail();
    if(id==='m9'&&next!=='m9'){bayonet.resetTrail();bayonetMotion.holster();}
    else current.root.visible=false;
    id=next;current=arsenal[id];current.root.visible=true;
    current.root.position.set(0,0,0);draw=1;gesture=inspectT=1;loading=-1;reloadSignal=false;aim=0;recoil=spark=0;
    camKickPitch=camKickRoll=0;camera.rotation.set(0,0,0);
    butterflyMotion.reset();karambitMotion.reset();karambitFraming=0;
    if(id==='karambit'){draw=0;karambitMotion.draw();}
    if(id==='m9'){draw=0;bayonet.resetTrail();bayonetMotion.equip();}
    if(id==='butterfly'){
      // Keep a partial rig-level draw so the whole hand rises from the weapon's low rest pose
      // instead of popping up 10cm on the equip frame (draw decay 5.2/s -> ~119ms lift).
      draw=.62;
      curPivX=PIVOT_TABLE[0][0];curPivY=PIVOT_TABLE[0][1];curPivZ=PIVOT_TABLE[0][2];
      butterflyMotion.draw();
    }
    flash.visible=false;flash.position.set(0,id==='deagle'?.029:.010,current.muzzle??-.5);
  }
  function flourish(){
    if(id==='m9')bayonetMotion.flourish();
    else if(id==='karambit')karambitMotion.spin();
    else if(id==='butterfly')butterflyMotion.flourish();
    else if(isMelee(id)&&gesture>=.85){draw=.88;inspectT=1;}
  }
  function fidget(){
    if(id==='m9')bayonetMotion.fidget();
    else if(id==='karambit')karambitMotion.spin();
    else if(id==='butterfly')butterflyMotion.fidget();
  }
  function reload(duration) {
    if(id==='he'||isMelee(id)||loading>=0)return;
    loadDuration=Number.isFinite(duration)?Math.max(.30,duration):({awm:3.0,deagle:1.8,mp5:2.0,ak47:2.35,m4a1:2.15})[id];
    loading=0;inspectT=1;
  }
  function shoot(action='primary',frameTime=0){
    if(id==='m9'){bayonetMotion.attack(action,frameTime);return;}
    if(id==='karambit'){karambitMotion.attack(action==='heavy'?'heavy':'light');return;}
    if(id==='butterfly'){
      butterflyMotion.attack(action==='heavy'?'heavy':'light');
      return;
    }
    inspectT=1;gesture=0;kind=action;
    if(isMelee(id)){
      if(id==='malay')gestureDuration=action==='heavy'?.68:.26;
      else if(id==='nepal')gestureDuration=action==='heavy'?.78:.38;
      else gestureDuration=action==='heavy'?.74:.35;
      return;
    }
    if(id==='he'){gestureDuration=.65;return;}
    gestureDuration=id==='awm'?.95:.15;
    recoil=Math.min(1.85,recoil+current.kick);spark=.045;flash.visible=true;
    flash.rotation.z=Math.random()*Math.PI;flash.scale.setScalar(id==='mp5'?.70:id==='awm'?1.4:1);
  }
  function updateBayonet(dt,values){
    if(values.alive===false){bayonetMotion.reset();bayonet.resetTrail();}
    else bayonetMotion.update(dt);
    bayonet.root.visible=bayonetMotion.visible;
    if(!bayonet.root.visible)return;
    const {right,left,sleeve,spinPivot}=bayonet;
    const narrow=Math.max(0,1.48-aspect);
    const depth=narrow*.38;
    const zoom=Math.max(-.024,Math.min(.043,(78-bayonetFov)*.0011));
    const stride=walk*(.006+sprintBlend*.004);
    const offset=bayonetMotion.position;
    const sec=bayonetMotion.secondary;
    bayonetCrouch=ease(bayonetCrouch,values.crouching?.021:0,dt,12);
    const landing=Math.max(-.027,Math.min(.027,airOffset+landDip));
    right.position.set(
      Math.min(.226,aspect*.146)+Math.max(0,1-aspect)*.115+offset.x+Math.sin(phase)*stride-swayX*.57,
      -.193+offset.y+Math.cos(phase*2)*(.0018+stride*.55)+swayY*.55+landing-bayonetCrouch,
      -.609+offset.z-depth-zoom+bayonetMotion.impact*.013+sec.reboundZ);
    bayonetEuler.set(swayY*1.25-landing*.7,swayX*-.72,-tilt*.65+bayonetMotion.impact*.033+sec.reboundRoll,'YXZ');
    right.quaternion.copy(bayonetAdditive.setFromEuler(bayonetEuler)).multiply(bayonetMotion.rotation);
    spinPivot.position.set(0,bayonetMotion.knifeLift,.045);
    spinPivot.quaternion.copy(bayonetMotion.spin);
    sleeve.position.set(Math.min(.38,aspect*.27),-.397,-.245-narrow*.09-zoom);
    sleeveDirection.copy(wristSocket).applyQuaternion(right.quaternion).add(right.position).sub(sleeve.position);
    sleeve.scale.y=sleeveDirection.length();
    sleeve.quaternion.setFromUnitVectors(wristUp,sleeveDirection.normalize());
    const fOpen=bayonetMotion.fingerOpen;
    for(let i=0;i<bayonet.fingers.length;i++){
      bayonet.fingers[i].rotation.z=fOpen>=0?-fOpen*(.86+i*.07):-fOpen*(.42+i*.09);
    }
    const tOpen=bayonetMotion.thumbOpen;
    bayonet.thumb.rotation.set(
      tOpen>=0?-tOpen*.28:0,
      tOpen>=0?-tOpen*.62:0,
      tOpen>=0?-tOpen*.34:0
    );
    if(tOpen<0)bayonet.thumb.rotation.x=tOpen*.65;
    const brace=bayonetMotion.support;
    bayonetGuard=ease(bayonetGuard,bayonetMotion.activeGuard,dt,10);
    // Tuck left tactical guard hand cleanly below HP HUD in Idle; raise smoothly to balance draw/inspect/fidget/heavy!
    left.position.set(-Math.min(.272,aspect*.178)+bayonetGuard*.038+Math.sin(phase+.7)*stride*.7-brace*.54,
      -.328+bayonetGuard*.102-Math.cos(phase*2)*stride*.55+landing*.64-brace*.45-bayonetCrouch,
      -.586+brace*.30-depth-zoom);
    left.rotation.set(.12+brace*2.8,-.47-brace*2.5,.27+tilt*.47,'YXZ');
    if(id==='m9'){
      const kickTarget=bayonetMotion.camKick;
      camKickPitch=ease(camKickPitch,kickTarget*.0062,dt,28);
      camKickRoll=ease(camKickRoll,-kickTarget*.0082,dt,28);
      camera.rotation.set(camKickPitch,0,camKickRoll);
    }
    bayonet.updateTrail(dt,sec.trailIntensity);
  }
  function update(dt, values={}) {
    dt=Math.max(0,Math.min(dt,.1));
    const melee=isMelee(id);
    if(values.reloading&&!reloadSignal)reload();reloadSignal=!!values.reloading;
    if(loading>=0){loading+=dt/loadDuration;if(loading>=1)loading=-1;}
    const t=Math.max(0,loading), lower=Math.sin(Math.PI*t);
    const drop=Math.sin(Math.PI*T.MathUtils.clamp((t-.12)/.68,0,1));
    current.mag.position.set(-drop*(id==='deagle'?.013:.06),-drop*(id==='mp5'?.20:.17),drop*.05);
    current.mag.rotation.x=id==='ak47'?drop*.42:0;
    if(!current.isArticulatedButterfly){
      current.hand.position.set(drop*.035,-drop*.054,drop*(id==='deagle'?.045:.12));
      current.hand.rotation.x=drop*.19;
    }else{
      current.hand.position.set(0,0,0);
      current.hand.rotation.set(0,0,0);
    }
    draw=Math.max(0,draw-dt*(id==='awm'?2.8:melee?5.2:3.6));
    inspectT=Math.min(1,inspectT+dt*(melee?.78:.68));
    gesture=Math.min(1,gesture+dt/gestureDuration);
    if(values.aiming||values.reloading)inspectT=1;
    const inspection=Math.sin(Math.PI*inspectT)**2, movement=Math.sin(Math.PI*gesture)**2;
    const item=melee||id==='he';
    aim=ease(aim,values.aiming&&!item&&loading<0?1:0,dt,15);
    walk=ease(walk,values.moving?1:0,dt,10);
    sprintBlend=ease(sprintBlend,values.sprinting?1:0,dt,9);

    // Jump float & landing cushion physics
    const groundedNow=values.grounded!==false;
    const vy=Number(values.vy)||0;
    let landImpulse=0;
    if(!groundedNow)lastAirSpeed=vy;
    if(groundedNow&&!wasGrounded){
      landVel-=Math.min(.26,Math.max(.07,Math.abs(id==='m9'?lastAirSpeed:vy)*.024));
      landImpulse=1;
    }
    wasGrounded=groundedNow;
    airOffset=ease(airOffset,groundedNow?0:T.MathUtils.clamp(-vy*.0024,-.015,.018),dt,12);
    // Substep the landing spring so a slow frame cannot destabilize it.
    const steps=id==='m9'?Math.max(1,Math.ceil(dt/.016)):1;
    for(let i=0;i<steps;i++){
      const step=dt/steps;
      landVel+=(-landDip*195-landVel*19)*step;
      landDip+=landVel*step;
    }
    if(Math.abs(landDip)<1e-5&&Math.abs(landVel)<1e-4)landDip=landVel=0;

    const swayScale=1-.76*aim;
    swayX=ease(swayX,T.MathUtils.clamp((values.swayX||0)*swayScale,-.032,.032),dt,14);
    swayY=ease(swayY,T.MathUtils.clamp((values.swayY||0)*swayScale,-.026,.026),dt,14);
    tilt=ease(tilt,T.MathUtils.clamp((values.strafe||0)*swayScale,-1,1)*.048,dt,11);
    phase+=dt*(values.moving?(values.sprinting?12.4:10):1.8);recoil*=Math.exp(-dt*24);spark-=dt;
    flash.visible=spark>0&&!item;
    if(current.action){
      const bolt=id==='awm'?Math.sin(Math.PI*T.MathUtils.clamp((gesture-.22)/.62,0,1)):0;
      current.action.position.z=bolt*.083+(id==='deagle'?recoil*.042:0);
      current.action.rotation.z=bolt*.34;
      current.action.visible=id!=='he'||!(gesture>.34&&gesture<.97);
    }
    const offset=Math.min(current.hipX,.160*aspect),idle=1-aim;
    const slash=melee?movement:0,throwing=id==='he'?movement:0;
    const heavy=kind==='heavy';
    const drawArc=melee?Math.sin(Math.PI*draw):0;
    let mx=0,my=0,mz=0,mrx=0,mry=0,mrz=0,karambitTrail=null;
    if(melee&&id!=='m9'){
      if(id==='butterfly'&&current.rigParts){
        if(values.alive===false){
          butterflyMotion.reset();
          current.resetTrail?.();
        }else{
          butterflyMotion.update(dt,{swayX,swayY,landImpulse,moving:values.moving,sprinting:values.sprinting});
        }
        const p=butterflyMotion.pose;
        const sec=butterflyMotion.secondary;
        const rp=current.rigParts;

        // Decoupled right arm/wrist 6-DOF pose + sprint cadence + impact rebound
        const sprintSwing=sprintBlend*Math.sin(phase)*.012;
        rp.rightRig.position.set(
          rp.rightBasePos[0]+p[0]+sprintSwing,
          rp.rightBasePos[1]+p[1]+airOffset*.55+landDip*.65,
          rp.rightBasePos[2]+p[2]+sec.reboundZ
        );
        rp.rightRig.rotation.set(
          rp.rightBaseRot[0]+p[3]-sprintBlend*.08+landDip*1.6,
          rp.rightBaseRot[1]+p[4]+sprintSwing*1.8,
          rp.rightBaseRot[2]+p[5]+sec.reboundRoll
        );

        // Articulated thumb, index fulcrum, and staggered lower grip fingers
        const thumb=p[13], idxCurl=p[14], lowCurl=p[15];
        // At thumb=0, thumb hugs +X/+Y spine cleanly; at thumb=1, posts slightly inward as rollover barrel
        rp.thumbProximal.rotation.set(-.14*thumb,.18*thumb-.06,.34*thumb);
        rp.thumbDistal.rotation.set(.08*thumb,-.12*thumb,-.10*(1-thumb));

        // idxCurl: 1 = wrapped grip, 0 = open clear, < 0 = straight Chaplin axle threading right through V-notch!
        if(idxCurl<0){
          const ext=Math.min(1,-idxCurl/.42);
          rp.indexProximal.rotation.set(.32*ext,.10*ext,.68*ext);
          rp.indexDistal.rotation.set(0,.06*ext,-.32*ext);
        }else{
          const idxOpen=1-idxCurl;
          rp.indexProximal.rotation.set(.10*idxOpen,0,-.82*idxOpen);
          rp.indexDistal.rotation.set(0,0,-.95*idxOpen);
        }

        // lowerCurl: 1 = clenched around handles, 0 = swung down-right completely outside blade/handle YZ plane
        rp.lowerFingers.rotation.set(.06*(1-lowCurl),0,-1.18*(1-lowCurl));

        // Smooth dynamic rotation fulcrum (grip / thumb barrel / V-choil Chaplin / CoM aerial)
        const modeIdx=Math.max(0,Math.min(3,Math.round(p[11])));
        const targetPiv=PIVOT_TABLE[modeIdx];
        curPivX=ease(curPivX,targetPiv[0],dt,34);
        curPivY=ease(curPivY,targetPiv[1],dt,34);
        curPivZ=ease(curPivZ,targetPiv[2],dt,34);
        rp.spinPivot.position.set(curPivX,curPivY+p[12],curPivZ-p[12]*.24);
        rp.knifeCarrier.position.set(-curPivX,-curPivY,-curPivZ);
        rp.spinPivot.rotation.set(p[8],p[9],p[10]);

        // True serial balisong revolute joints + spring-driven T-latch
        rp.safeJoint.rotation.x=p[6];
        rp.biteJoint.rotation.x=p[7];
        rp.latchPivot.rotation.x=-sec.latchAngle;

        // Independent left tactical guard hand (tucked cleanly off-screen at leftPose = 0!)
        const lp=T.MathUtils.clamp(p[16]+sprintBlend*.18,0,1);
        rp.leftRig.position.set(
          -.195+lp*.048-Math.sin(phase)*.004*walk,
          -.325+lp*.142+airOffset*.4+landDip*.5,
          -.075-lp*.045
        );
        rp.leftRig.rotation.set(.18+lp*.28,-.22+lp*.18,.24-lp*.22);

        // Viewmodel-only tactile camera micro-kick (world crosshair stays 100% rock-steady!)
        const kickTarget=p[17];
        camKickPitch=ease(camKickPitch,kickTarget*.0065,dt,28);
        camKickRoll=ease(camKickRoll,-kickTarget*.0085,dt,28);
        camera.rotation.set(camKickPitch,0,camKickRoll);

        current.updateTrail?.(sec.trailIntensity);
      }else if(id==='karambit'){
        if(values.alive===false){
          karambitMotion.reset();
          current.resetTrail();
        }else karambitMotion.update(dt);
        [mx,my,mz]=karambitMotion.pose;
        karambitTrail=karambitMotion.inspectTrail;
        karambitFraming=ease(karambitFraming,Number(karambitTrail!==null),dt,18);
        // Keep intimate hero-weapon presence (matching Butterfly Knife); only pull back on narrow/portrait screens.
        mx+=karambitFraming*(.016-Math.max(0,1.78-aspect)*.12);
        my-=karambitFraming*.006;
        mz-=karambitFraming*(.018+Math.max(0,1.24-aspect)*.38);
        const part=current.karambit;
        // Independent tactical left guard hand (tucked off-screen in idle, rises smoothly during inspect & combat!)
        if(part.leftRig){
          const lp=T.MathUtils.clamp((karambitMotion.leftPose||0)+sprintBlend*.16,0,1);
          part.leftRig.position.set(
            -.325+lp*.078-Math.sin(phase)*.004*walk,
            -.315+lp*.148+airOffset*.4+landDip*.5,
            -.045-lp*.042
          );
          part.leftRig.rotation.set(.16+lp*.24,-.24+lp*.20,.22-lp*.18);
        }
        // The hand and ring rotate together around the wrist while the cuff stays on the arm.
        part.mount.quaternion.copy(karambitMountBaseQ).multiply(karambitMotion.wristQuat);
        part.mount.position.copy(part.wristJoint).applyQuaternion(part.mount.quaternion).negate().add(karambitWristAnchor);
        current.hand.position.copy(part.mount.position);
        current.hand.quaternion.copy(part.mount.quaternion);
        // Local SpinPivot offset + pure unwrapped-angle Quaternion rotation around spinAxis
        part.spinPivot.position.copy(karambitMotion.pivotPos);
        part.spinPivot.quaternion.copy(karambitMotion.spinQuat);
        if(part.debugGizmo)part.debugGizmo.position.copy(karambitMotion.pivotPos);
        part.updateDebugGizmo?.(karambitMotion.spinAxis,KARAMBIT_INSPECT_CONFIG.showGizmos);
        const fArr=karambitMotion.fingers;
        for(let i=0;i<part.fingers.length;i++){
          const opening=T.MathUtils.clamp(fArr[i+1],0,1);
          // Natural anatomical cascade fan (middle -> ring -> pinky progressively relaxed & fanned outward)
          part.fingers[i].rotation.x=opening*(.74-i*.07);
          part.fingers[i].rotation.z=-opening*(.14+i*.20);
          part.fingerTips[i].rotation.x=opening*(1.18-i*.12);
        }
        const thumbOpening=T.MathUtils.clamp(fArr[4],0,1);
        part.thumb.rotation.set(-thumbOpening*.55,thumbOpening*.42,thumbOpening*.48);
        const kick=(karambitMotion.pose[9]||0)-Math.min(1,karambitMotion.impact*24);
        camKickPitch=ease(camKickPitch,kick*.0058,dt,30);
        camKickRoll=ease(camKickRoll,-kick*.0082,dt,30);
        camera.rotation.set(camKickPitch,0,camKickRoll);
      }else if(id==='nepal'){
        // Kukri wrist-flip draw + heavy sweeping cleaver arc.
        mx=-drawArc*.055-slash*(heavy?.16:.21);
        my=drawArc*.045+(heavy?Math.sin(Math.PI*Math.min(1,gesture*1.35))*.055-slash*.08:0);
        mz=-slash*(heavy?.24:.10);
        mrx=-drawArc*.65+(heavy?-slash*.45:0);
        mry=-slash*(heavy?.58:1.05)+drawArc*.55;
        mrz=drawArc*2.25+slash*(heavy?1.15:-.85)+inspection*Math.PI*2;
      }else if(id==='malay'){
        // Kris swift horizontal spin draw + long straight forward thrust.
        mx=-drawArc*.04-slash*(heavy?.05:.11);
        my=drawArc*.035-slash*(heavy?.02:.03);
        mz=-slash*(heavy?.34:.18);
        mrx=slash*(heavy?-.28:-.14);
        mry=-drawArc*2.4-slash*(heavy?.10:.55)+inspection*Math.PI*2;
        mrz=-drawArc*1.15+slash*(heavy?.28:-.45);
      }else{
        mx=-slash*(heavy?.09:.18);
        mz=-slash*(heavy?.23:.079);
        mry=-slash*(heavy?.16:.97)-inspection*.57;
        mrz=drawArc*1.2+slash*(heavy?.73:-.69)-inspection*.84;
      }
    }
    const bflyScale=id==='butterfly'?.65:1;
    rig.position.set(
      idle*(offset+Math.sin(phase)*(.0014+walk*.005*bflyScale))+lower*.034+mx-(melee?0:inspection*.10)-swayX,
      T.MathUtils.lerp(current.hipY,-current.sight,aim)+idle*Math.cos(phase*2)*(.0013+walk*.003*bflyScale)-lower*.044+recoil*.003-draw*(id==='butterfly'?.15:(melee?.17:.24))+my+inspection*.027+throwing*.14+swayY+(id==='butterfly'?0:airOffset+landDip),
      T.MathUtils.lerp(current.hipZ,-.48,aim)+recoil*(aim>.6?.021:.043)+lower*.038+draw*.07+mz-throwing*.12);
    if(id==='karambit'){
      karambitRigEul.set(
        .045*idle+swayY*1.4,
        .190*idle-swayX*1.5,
        -.056*idle-tilt,
        'YXZ'
      );
      rig.quaternion.copy(karambitBaseRigQ.setFromEuler(karambitRigEul)).multiply(karambitMotion.handQuat);
    }else{
      rig.rotation.set(
        .045*idle+recoil*(id==='deagle'?.14:.077)*(1-.52*aim)+lower*.09-draw*(melee?.35:.52)+mrx+throwing*.85+swayY*1.4,
        .190*idle-lower*.19+mry-(melee?0:inspection*.57)-swayX*1.5,
        -.056*idle+lower*(id==='deagle'?.36:.57)+draw*.22+mrz-(melee?0:inspection*.84)-tilt);
    }
    if(id==='karambit'&&values.alive!==false){
      if(KARAMBIT_INSPECT_CONFIG.showTrail)current.updateTrail(dt,karambitTrail);
      else current.resetTrail();
    }
    // Keep built-in 3D reflex dot hidden so only the crisp HUD ADS dot is shown.
    reflex.visible=false;
    // Once magnified, the HUD supplies the full-field AWM reticle immediately like CS AWP.
    if(id!=='m9')current.root.visible=!(id==='awm'&&values.aiming&&loading<0);
    updateBayonet(dt,values);
  }
  update(0);
  return {scene,camera,ready:arsenal.karambit.karambit.ready,update,equip,flourish,fidget,reload,shoot,
    setButterflyFinish(finish){arsenal.butterfly.setFinish(finish);},
    meleeContact(hitKind){
      if(id==='m9')bayonetMotion.contact(hitKind);
      else if(id==='karambit')karambitMotion.contact(hitKind);
      else if(id==='butterfly')butterflyMotion.contact(hitKind);
    },
    inspect(){
      if(id==='m9')bayonetMotion.inspect();
      else if(id==='karambit')karambitMotion.inspect();
      else if(id==='butterfly')butterflyMotion.inspect();
      else if(loading<0&&gesture>=.98)inspectT=0;
    },
    holster(){
      if(id==='m9')bayonetMotion.holster();
      else if(id==='karambit')karambitMotion.holster();
    },
    karambitConfig:KARAMBIT_INSPECT_CONFIG,
    karambitKeyframes:KARAMBIT_KEYFRAMES,
    scrubKarambit(tSec,pause=true){karambitMotion.scrubTo(tSec,pause);},
    stepKarambit(deltaSec=1/60){karambitMotion.stepFrame(deltaSec);},
    getKarambitDebugState(){return karambitMotion.getDebugState();},
    isKarambitActive(){return id==='karambit';},
    setTeam(team){sleeveBand.color.set(team===1?0xae4c3b:0x47788b);},
    initEnv(renderer){
      if(scene.environment||!renderer)return;
      const pmrem=new T.PMREMGenerator(renderer);
      pmrem.compileEquirectangularShader();
      const raw=maritimeStudioEnv();
      scene.environment=pmrem.fromEquirectangular(raw).texture;
      raw.dispose();
      pmrem.dispose();
    },
    setBayonetFov(value){bayonetFov=value;},
    resize(value){aspect=value;camera.aspect=value;camera.updateProjectionMatrix();update(0);}};
}
