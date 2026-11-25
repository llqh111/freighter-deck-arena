import {buildArmory} from './armory-models.js?v=7';
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

export function createViewModel() {
  const scene = new T.Scene();
  const camera = new T.PerspectiveCamera(48, 1, .015, 5);
  const rig = new T.Group();
  const fixed = new T.Group(), magazine = new T.Group(), support = new T.Group();
  scene.add(rig);
  rig.add(fixed, magazine, support);
  scene.add(new T.HemisphereLight(0xe8f3ff, 0x8e7861, 2.1));
  const key = new T.DirectionalLight(0xffdfb1, 3.4);
  key.position.set(-2, 3, -2);
  scene.add(key);
  const rim = new T.DirectionalLight(0xa4d6f6, 1.5);
  rim.position.set(3, 2, 1);
  scene.add(rim);
  const steelGrain = brushedSurface(), twill = brushedSurface(true);
  const paint = (color, roughness, metalness, map) => new T.MeshStandardMaterial({color, roughness, metalness, map: map || null});
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
  const arsenal=buildArmory({box,tube,pad,profile,arm,bake,paint,graphite,alloy,edges,parker,rubber,amber,bone});
  const original=new T.Group();
  original.name='m4a1';original.add(fixed,magazine,support);
  arsenal.m4a1={root:original,mag:magazine,hand:support,sight:sightY,hipX:.222,hipY:-.191,hipZ:-.546,muzzle:-.65,kick:.94};
  for (const entry of Object.values(arsenal)){rig.add(entry.root);entry.root.visible=false;}
  let id='m4a1', current=arsenal[id];current.root.visible=true;
  let phase=0,recoil=0,spark=0,aim=0,walk=0,loading=-1,reloadSignal=false;
  let swayX=0,swayY=0,tilt=0;
  let aspect=1.7,draw=0,gesture=1,gestureDuration=.5,kind='',inspectT=1,loadDuration=1.45;
  const ease=(x,y,dt,rate)=>T.MathUtils.lerp(x,y,1-Math.exp(-rate*dt));
  function equip(value) {
    const raw=String(value?.id || value || '').toLowerCase().replace(/[-_ ]/g,'');
    const next=({grenade:'he',deserteagle:'deagle',ak:'ak47',m4:'m4a1'})[raw]||raw;
    if(!arsenal[next])return;
    current.root.visible=false;id=next;current=arsenal[id];current.root.visible=true;
    current.root.position.set(0,0,0);draw=1;gesture=inspectT=1;loading=-1;reloadSignal=false;aim=0;recoil=spark=0;
    flash.visible=false;flash.position.set(0,id==='deagle'?.029:.010,current.muzzle??-.5);
  }
  function reload(duration) {
    if(id==='he'||id==='knife'||loading>=0)return;
    loadDuration=Number.isFinite(duration)?Math.max(.30,duration):({awm:3.0,deagle:1.8,mp5:2.0,ak47:2.35,m4a1:2.15})[id];
    loading=0;inspectT=1;
  }
  function shoot(action='primary'){
    inspectT=1;gesture=0;kind=action;
    if(id==='knife'){gestureDuration=action==='heavy'?.74:.37;return;}
    if(id==='he'){gestureDuration=.65;return;}
    gestureDuration=id==='awm'?.95:.15;
    recoil=Math.min(1.85,recoil+current.kick);spark=.045;flash.visible=true;
    flash.rotation.z=Math.random()*Math.PI;flash.scale.setScalar(id==='mp5'?.70:id==='awm'?1.4:1);
  }
  function update(dt, values={}) {
    dt=Math.max(0,Math.min(dt,.1));
    if(values.reloading&&!reloadSignal)reload();reloadSignal=!!values.reloading;
    if(loading>=0){loading+=dt/loadDuration;if(loading>=1)loading=-1;}
    const t=Math.max(0,loading), lower=Math.sin(Math.PI*t);
    const drop=Math.sin(Math.PI*T.MathUtils.clamp((t-.12)/.68,0,1));
    current.mag.position.set(-drop*(id==='deagle'?.013:.06),-drop*(id==='mp5'?.20:.17),drop*.05);
    current.mag.rotation.x=id==='ak47'?drop*.42:0;
    current.hand.position.set(drop*.035,-drop*.054,drop*(id==='deagle'?.045:.12));
    current.hand.rotation.x=drop*.19;
    draw=Math.max(0,draw-dt*(id==='awm'?2.8:id==='knife'?5.4:3.6));
    inspectT=Math.min(1,inspectT+dt*.68);
    gesture=Math.min(1,gesture+dt/gestureDuration);
    if(values.aiming||values.reloading)inspectT=1;
    const inspection=Math.sin(Math.PI*inspectT)**2, movement=Math.sin(Math.PI*gesture)**2;
    const item=id==='knife'||id==='he';
    aim=ease(aim,values.aiming&&!item&&loading<0?1:0,dt,15);
    walk=ease(walk,values.moving?1:0,dt,10);
    const swayScale=1-.76*aim;
    swayX=ease(swayX,T.MathUtils.clamp((values.swayX||0)*swayScale,-.032,.032),dt,14);
    swayY=ease(swayY,T.MathUtils.clamp((values.swayY||0)*swayScale,-.026,.026),dt,14);
    tilt=ease(tilt,T.MathUtils.clamp((values.strafe||0)*swayScale,-1,1)*.048,dt,11);
    phase+=dt*(values.moving?10:1.8);recoil*=Math.exp(-dt*24);spark-=dt;
    flash.visible=spark>0&&!item;
    if(current.action){
      const bolt=id==='awm'?Math.sin(Math.PI*T.MathUtils.clamp((gesture-.22)/.62,0,1)):0;
      current.action.position.z=bolt*.083+(id==='deagle'?recoil*.042:0);
      current.action.rotation.z=bolt*.34;
      current.action.visible=id!=='he'||!(gesture>.34&&gesture<.97);
    }
    const offset=Math.min(current.hipX,.160*aspect),idle=1-aim;
    const slash=id==='knife'?movement:0,throwing=id==='he'?movement:0;
    const heavy=kind==='heavy';
    rig.position.set(idle*(offset+Math.sin(phase)*(.0014+walk*.005))+lower*.034-slash*(heavy?.09:.18)-inspection*.10-swayX,
      T.MathUtils.lerp(current.hipY,-current.sight,aim)+idle*Math.cos(phase*2)*(.0013+walk*.003)-lower*.044+recoil*.003-draw*.24+inspection*.027+throwing*.14+swayY,
      T.MathUtils.lerp(current.hipZ,-.48,aim)+recoil*(aim>.6?.021:.043)+lower*.038+draw*.07-slash*(heavy?.23:.079)-throwing*.12);
    rig.rotation.set(.045*idle+recoil*(id==='deagle'?.14:.077)*(1-.52*aim)+lower*.09-draw*.52+throwing*.85+swayY*1.4,
      .190*idle-lower*.19-slash*(heavy?.16:.97)-inspection*.57-swayX*1.5,
      -.056*idle+lower*(id==='deagle'?.36:.57)+draw*.22+slash*(heavy?.73:-.69)-inspection*.84-tilt);
    // Once magnified, the HUD supplies the full-field AWM reticle immediately like CS AWP.
    current.root.visible=!(id==='awm'&&values.aiming&&loading<0);
  }
  update(0);
  return {scene,camera,update,equip,reload,shoot,
    inspect(){if(loading<0&&gesture>=.98)inspectT=0;},
    setTeam(team){sleeveBand.color.set(team===1?0xae4c3b:0x47788b);},
    resize(value){aspect=value;camera.aspect=value;camera.updateProjectionMatrix();update(0);}};
}

