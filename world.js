import * as T from './three.module.js';

// Panoramic sky photography: Kloofendal 48d Partly Cloudy, Poly Haven (CC0).
// https://polyhaven.com/a/kloofendal_48d_partly_cloudy
function randomSource(seed) {
  return () => ((seed = Math.imul(1664525, seed) + 1013904223 >>> 0) / 4294967296);
}
function sheet(w,h) {
  const el=document.createElement('canvas'); el.width=w; el.height=h;
  return el.getContext('2d');
}
function canvasMap(ctx) {
  const tex=new T.CanvasTexture(ctx.canvas);
  tex.colorSpace=T.SRGBColorSpace; tex.anisotropy=4;
  return tex;
}
function scuff(c,w,h,seed,count) {
  const r=randomSource(seed);
  for(let i=0;i<count;i++) {
    const x=r()*w,y=r()*h;
    c.fillStyle=r()>.38?'rgba(13,20,22,.14)':'rgba(255,232,185,.16)';
    c.fillRect(x,y,.5+r()*2,.7+r()*4);
  }
}
function boxSkin(base,id,door=false) {
  const w=door?384:768,h=320,c=sheet(w,h),r=randomSource(id+33);
  c.fillStyle=base;c.fillRect(0,0,w,h);
  for(let i=12;i<w-10;i+=door?48:27) {
    const g=c.createLinearGradient(i,0,i+19,0);
    g.addColorStop(0,'rgba(7,16,19,.43)'); g.addColorStop(.23,'rgba(7,16,19,.20)');
    g.addColorStop(.78,'rgba(220,218,190,.12)');g.addColorStop(1,'rgba(224,227,219,.33)');
    c.fillStyle=g;c.fillRect(i,9,19,h-19);
  }
  const stain=c.createLinearGradient(0,0,0,h);
  stain.addColorStop(0,'rgba(30,22,17,.4)');stain.addColorStop(.15,'rgba(33,29,20,.04)');stain.addColorStop(.68,'rgba(35,30,21,.04)');stain.addColorStop(1,'rgba(24,22,20,.46)');
  c.fillStyle=stain;c.fillRect(0,0,w,h);
  for(let i=0;i<180;i++){
    let x=r()*w,y=r()>.35?0:r()*h;
    c.fillStyle='rgba(64,42,25,'+(.04+r()*.16)+')'; c.fillRect(x,y,1+r()*4,8+r()*65);
  }
  c.fillStyle='rgba(233,224,195,.83)';
  if(!door) {
    c.font='bold 49px Arial'; c.fillText(['KLINE','MARITIME','NORTH SEA','PACIFIC'][id%4],48,102);
    c.font='bold 14px monospace';c.fillText('INTERMODAL  /  '+(56271+id*557),52,127);
    c.font='bold 13px monospace'; c.fillText('MAX. GR.  30 480 KG',w-168,h-53);
    c.fillText('CU. CAP.  33.2 CU.M',w-168,h-35);
  } else {
    c.font='bold 16px monospace'; c.fillText('FRTU '+(821045+id*727),200,50);c.fillText('22G1',200,71);
    c.fillStyle='#d6a83e'; c.fillRect(231,168,36,33);
    c.fillStyle='#262831';c.font='bold 24px monospace';c.fillText('!',241,193);
    for(const x of [51,135,248,333]){
      c.fillStyle='#282e2d';c.fillRect(x-3,8,8,h-17);c.fillStyle='#a5a6a0';c.fillRect(x,8,4,h-17);
      for(const y of [53,155,263]){c.fillStyle='#737976';c.fillRect(x-5,y,14,7)}
      c.fillStyle='#a5a6a0';c.fillRect(x-14,229,28,4);
    }
    c.fillStyle='#262c2d';c.fillRect(w/2-2,1,5,h);
  }
  for(const y of [3,h-10]){c.fillStyle='rgba(15,20,20,.6)';c.fillRect(0,y,w,7);c.fillStyle='rgba(233,217,179,.32)';c.fillRect(0,y,w,2)}
  for(const x of [2,w-12]) {c.fillStyle='rgba(35,37,31,.55)';c.fillRect(x,0,10,h);
    for(const y of [0,h-22]) {c.fillStyle='#595851';c.fillRect(x-2,y,13,22);c.fillStyle='#242824';c.fillRect(x+1,y+5,7,9);}
  }
  scuff(c,w,h,96+id,6000);return canvasMap(c);
}
function crateSkin() {
  const c=sheet(256,256),r=randomSource(61);
  for(let k=0;k<8;k++){
    c.fillStyle='hsl(33,31%,'+(43+r()*11)+'%)';c.fillRect(k*32,0,32,256);
    c.fillStyle='#574736';c.fillRect(k*32,0,2,256);
    for(let j=0;j<80;j++){c.fillStyle=r()>.5?'rgba(54,35,19,.14)':'rgba(255,210,145,.12)';c.fillRect(k*32+r()*32,r()*256,1,4+r()*76)}
  }
  c.strokeStyle='#564633';c.lineWidth=26;c.strokeRect(8,8,240,240);
  c.strokeStyle='#9d805a';c.lineWidth=16;c.strokeRect(8,8,240,240);c.beginPath();c.moveTo(16,232);c.lineTo(234,16);c.stroke();
  for(const x of [8,247])for(const y of [8,75,181,247]){c.fillStyle='#3e3c34';c.fillRect(x-2,y-2,4,4)}
  c.fillStyle='#363931';c.font='bold 18px monospace';c.fillText('↑↑',35,56);c.font='bold 12px monospace';c.fillText('FRT / 045',28,212);scuff(c,256,256,3,1500);return canvasMap(c);
}
function paintedSteel() {
  const c=sheet(384,256),r=randomSource(498);
  c.fillStyle='#e1e2da';c.fillRect(0,0,384,256);
  for(let i=0;i<2700;i++){
    const residue=r();c.fillStyle=residue>.28?'rgba(53,62,58,.047)':'rgba(125,72,36,.13)';
    c.fillRect(r()*384,r()*256,.4+r()*2.5,1+r()*13);
  }
  for(let j=0;j<3;j++){
    const y=j*125+3;c.fillStyle='rgba(54,63,58,.31)';c.fillRect(0,y,384,1);
    c.fillStyle='rgba(255,255,251,.7)';c.fillRect(0,y+1,384,1);
    for(let i=8;i<384;i+=30){c.fillStyle='#a3a69d';c.fillRect(i,y+4,2,2);c.fillStyle='rgba(159,105,70,.18)';c.fillRect(i,y+6,1,2+r()*9)}
  }
  scuff(c,384,256,58,2600);return canvasMap(c);
}
function deckSkin(blocks) {
  const c=sheet(1024,2048),w=1024,h=2048,r=randomSource(241);
  c.fillStyle='#72736a';c.fillRect(0,0,w,h);
  for(let j=0;j<20;j++)for(let i=-1;i<5;i++) {
    let x=i*256+(j%2)*128,y=j*106;
    c.fillStyle='rgba('+(r()>.5?'190,174,147':'44,46,42')+','+(r()*.12)+')';c.fillRect(x,y,256,106);
    c.fillStyle='rgba(30,31,30,.45)'; c.fillRect(x,y,256,2);c.fillRect(x,y,2,106);
    for(let v=10;v<250;v+=31){c.fillStyle='#55564e';c.fillRect(x+v,y+5,2,2)}
  }
  for(let i=0;i<11000;i++){c.fillStyle='rgba(38,39,36,.07)';c.fillRect(r()*w,r()*h,r()*17+1,r()*2+1)}
  for(const x of [95,920]){c.fillStyle='#c7ae59';c.fillRect(x,0,5,h);for(let y=0;y<h;y+=64)c.fillRect(x-11,y,2,34)}
  const sx=w/25, sz=h/53;
  for(const b of blocks.filter(b=>b.bottom===0)) {
    const x=(b.x-b.w/2+12.5)*sx,y=(b.z-b.d/2+26.5)*sz;
    c.fillStyle='rgba(40,36,26,.09)';
    c.beginPath(); c.moveTo(x,y); c.lineTo(x+b.w*sx,y); c.lineTo(x+b.w*sx+b.top*13,y+b.top*18);c.lineTo(x+b.w*sx+b.top*13,y+b.d*sz+b.top*18);c.lineTo(x+b.top*13,y+b.d*sz+b.top*18);c.lineTo(x,y+b.d*sz);c.fill();
    c.shadowColor='rgba(13,18,18,.6)';c.shadowBlur=12;c.fillStyle='rgba(36,35,28,.48)';c.fillRect(x,y,b.w*sx,b.d*sz);c.shadowBlur=0;
  }
  return canvasMap(c);
}
export function buildWorld(scene) {
  const solids=[], batches=new Map(), materials=new Map(), cube=new T.BoxGeometry(1,1,1);
  const unit=new T.Object3D(), axis=new T.Vector3(0,1,0), steelMap=paintedSteel();
  function mat(col) {
    if(typeof col!=='string')return col;
    if(!materials.has(col))materials.set(col,new T.MeshStandardMaterial({color:col,map:steelMap,roughness:.82,metalness:.07}));
    return materials.get(col);
  }
  function put(x,y,z,w,h,d,color,quat=null){
    const m=mat(color);
    if(!batches.has(m))batches.set(m,[]);
    unit.position.set(x,y,z);unit.scale.set(w,h,d);unit.quaternion.identity();if(quat)unit.quaternion.copy(quat);
    unit.updateMatrix();batches.get(m).push(unit.matrix.clone());
  }
  function beam(a,b,r,color,depth=r){
    const v=new T.Vector3(...b).sub(new T.Vector3(...a)),len=v.length();
    put((a[0]+b[0])/2,(a[1]+b[1])/2,(a[2]+b[2])/2,r,len,depth,color,new T.Quaternion().setFromUnitVectors(axis,v.normalize()));
  }
  function solid(x,z,w,d,bottom,top){solids.push({x,z,w,d,bottom,top})}
  function wall(x,z,w,d,bot,top,col){put(x,(bot+top)/2,z,w,top-bot,d,col);solid(x,z,w,d,bot,top)}
  const colors=['#904d3e','#38626e','#557576','#b98549','#59736a','#8e5141'];
  const skins=colors.map((color,i)=>{
    const side=new T.MeshStandardMaterial({map:boxSkin(color,i),roughness:.79,metalness:.12});
    const door=new T.MeshStandardMaterial({map:boxSkin(color,i,true),roughness:.76,metalness:.12});
    return {side,door,top:mat(color)};
  });
  function container(x,z,w,d,base,id){
    const {side,door,top}=skins[id%skins.length];
    const m=w>d?[door,door,top,top,side,side]:[side,side,top,top,door,door];
    put(x,base+1.33,z,w,2.66,d,m);solid(x,z,w,d,base,base+2.66);
    const count=Math.round(Math.max(w,d)*3);
    for(let i=1;i<count;i++){const t=i/count-.5;put(x+(w>d?t*w:0),base+2.67,z+(w>d?0:t*d),w>d?.075:w-.08,.027,w>d?d-.08:.075,top)}
  }
  const timber=new T.MeshStandardMaterial({map:crateSkin(),roughness:.98});
  function crate(x,z,s,base=0,h=s){wall(x,z,s,s,base,base+h,timber)}
  // The center lanes open between offset rows of freight. Both side galleries have two open ends.
  container(-5,12,6.2,2.85,0,1);container(5,8,2.85,7.2,0,0);
  container(-5,-8,2.85,7.2,0,2);container(5,-12,6.2,2.85,0,5);
  container(-1.8,3.9,6.1,2.85,0,3);container(1.8,-3.9,6.1,2.85,0,1);
  container(-7,.1,2.8,5.95,0,0);container(7,-.1,2.8,5.95,0,4);
  container(-7,.1,2.8,5.95,2.66,2);container(7,-.1,2.8,5.95,2.66,5);
  for(const sign of [-1,1]){
    crate(sign*2.3,sign*11,1.8);crate(sign*7,sign*16.3,1.7);crate(sign*5.6,sign*16.4,1.0);
    crate(sign*1.45,sign*6.45,1.25);crate(sign*7.1,sign*4.55,1.1);
    const x=sign*10.35,z=sign*6.5;
    wall(x-sign*1.2,z,.15,14,0,2.4,'#818d85');wall(x+sign*1.2,z,.15,14,0,2.4,'#76857e');
    wall(x,z,2.55,14,2.36,2.54,'#9aa69b');
    for(let i=-7;i<=7;i+=2){put(x,2.56,z+i,2.62,.08,.10,'#535f59');put(x-sign*1.28,1.23,z+i,.11,2.48,.09,'#535f59')}
  }
  const bone='#b9c1b5',dark='#354646',rail='#62716a',flame='#b66c43';
  const spawns=[[],[]];
  for(const sign of [-1,1]){
    const z=sign*24;
    wall(0,z+sign*2,24,.48,0,4.7,bone);
    for(const x of [-11.65,11.65])wall(x,z,0.5,4.4,0,4.3,bone);
    for(const x of [-9.4,0,9.4])wall(x,sign*20.8,x===0?7:4.7,.48,0,3.6,bone);
    wall(0,sign*23.5,24,5.8,3.58,4.05,'#8f9c90');
    put(0,5.32,z,16,2.54,3.5,bone);put(0,6.63,z,16.65,.22,4.12,'#78877d');
    for(const face of [-1,1])for(let i=-7;i<=7;i+=1.55)put(i,5.62,z+face*1.76,1.28,.76,.05,'#344f55');
    for(const x of [-10,10])for(let i=-1;i<=1;i++)put(x+i*.5,2.63,sign*20.53,.22,.57,.08,dark);
    put(sign*5,8.14,z,.18,3.15,.18,dark);put(sign*5,8.92,z,2.75,.11,.12,rail);
    put(sign*5,9.7,z,.16,.18,.16,flame);
    for(let i=-11;i<=11;i+=1.85)put(i,4.55,sign*20.65,.07,.96,.07,rail);
    put(0,4.99,sign*20.65,23,.08,.08,rail);
    put(0,4.61,sign*20.65,23,.05,.05,rail);
    for(const x of [-6,5.8,3,-3])spawns[sign===1?0:1].push({x,z:sign*23});
  }
  // Hull, bulwarks, timber fenders and handrails.
  put(0,-1.7,0,25,3.3,53,'#343d3b');put(0,-3.5,0,24.85,.8,52.9,'#874a37');
  for(const x of [-12.15,12.15]){
    wall(x,0,.24,52.8,0,.64,'#75827a');put(x,.66,0,.39,.09,52.8,bone);
    for(let z=-25;z<=25;z+=2.5){put(x,1.15,z,.075,1.02,.075,rail);put(x*1.035,-1.3,z,.11,1.92,.18,dark)}
    for(const y of [1.23,1.64])put(x,y,0,.065,.07,51.9,rail);
  }
  const dk=new T.Mesh(new T.PlaneGeometry(25,53),new T.MeshStandardMaterial({map:deckSkin(solids),roughness:.92}));
  dk.rotation.x=-Math.PI/2; dk.receiveShadow=true;scene.add(dk);
  const sky=new T.Color('#a7bab8');scene.fog=new T.FogExp2(sky,.0063);scene.background=sky;
  const sun=new T.DirectionalLight(0xffdfad,2.10);sun.position.set(-40,35,-48);
  sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);
  Object.assign(sun.shadow.camera,{left:-37,right:37,top:32,bottom:-32,near:12,far:117});sun.shadow.camera.updateProjectionMatrix();
  sun.shadow.bias=-.00024;sun.shadow.normalBias=.035;scene.add(sun);
  scene.add(new T.HemisphereLight(0xe2edff,0x809187,1.15));
  const skydome=new T.Mesh(new T.SphereGeometry(390,36,22),new T.ShaderMaterial({side:T.BackSide,depthWrite:false,
    vertexShader:'varying vec3 v;void main(){v=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader:`varying vec3 v;
    float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.54);}
    float noise2(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+1.),f.x),f.y);}
    void main(){vec3 n=normalize(v),s=normalize(vec3(-.72,.36,-.54));float h=max(n.y,0.),d=max(dot(n,s),0.);
    vec3 col=mix(vec3(.69,.71,.69),vec3(.18,.37,.50),pow(h,.57));col+=vec3(.32,.17,.056)*pow(d,7.);
    vec2 p=n.xz/(h+.12)*1.95;float f=noise2(p)*.53+noise2(p*2.1)*.26+noise2(p*4.4)*.14+noise2(p*9.)*.07;
    col=mix(col,vec3(.92,.86,.75),smoothstep(.49,.78,f)*smoothstep(.015,.21,h)*.69);col+=vec3(.77,.66,.39)*smoothstep(.9985,.99965,d);
    gl_FragColor=vec4(col,1.);
    #include <colorspace_fragment>
    }`}));
  scene.add(skydome);
  // Keep the procedural horizon while the bundled photographic sky decodes.
  new T.TextureLoader().load(new URL('./freighter-sky.webp',import.meta.url).href,photo=>{
    photo.colorSpace=T.SRGBColorSpace;photo.wrapS=T.RepeatWrapping;
    const original=skydome.material;
    skydome.material=new T.ShaderMaterial({side:T.BackSide,depthWrite:false,
      uniforms:{pano:{value:photo}},vertexShader:original.vertexShader,fragmentShader:`varying vec3 v; uniform sampler2D pano;
      void main(){vec3 n=normalize(v);
      vec2 uv=vec2(fract(atan(n.z,n.x)*.15915494+.958),.5+asin(clamp(n.y,-1.,1.))*.3183099);
      vec3 c=texture2D(pano,uv).rgb*vec3(.96,.94,.90);
      vec3 haze=mix(vec3(.50,.58,.59),vec3(.72,.68,.56),max(0.,dot(n,normalize(vec3(-.72,.1,-.64)))));
      c=mix(haze,c,smoothstep(.010,.16,n.y));gl_FragColor=vec4(c,1.);
      #include <colorspace_fragment>
      }`});
    original.dispose();
  });

  function stencil(words,x,y,z,w,h,invert=false){
    const c=sheet(512,128); c.fillStyle='#394641';c.fillRect(0,0,512,128);c.fillStyle='#d7cfc0';c.fillRect(7,7,498,114);c.fillStyle='#475149';c.fillRect(10,10,492,108);
    c.fillStyle='#eadab9';c.font='bold 71px Arial';c.textAlign='center';c.textBaseline='middle';c.fillText(words,256,68,472);
    const o=new T.Mesh(new T.PlaneGeometry(w,h),new T.MeshStandardMaterial({map:canvasMap(c),roughness:.94}));
    o.position.set(x,y,z);if(invert)o.rotation.y=Math.PI;scene.add(o);
  }
  stencil('A  /  01',0,2.15,20.54,3.25,.87,true);
  stencil('B  /  02',0,2.15,-20.54,3.25,.87);
  for(const sign of [-1,1]){
    const z=sign*24.4;
    put(-sign*2,7.58,z,2.1,1.92,1.56,'#ac664c');put(-sign*2,8.57,z,2.16,.32,1.61,'#414a46');
    for(const x of [-.66,0,.66])put(-sign*2+x,8.83,z,.34,.39,.44,'#343e3d');
    for(const x of [-9.9,9.9]){put(x,1.25,sign*20.53,.88,2.24,.08,'#616e65');put(x,1.81,sign*20.47,.47,.47,.05,'#2c4144');put(x+.28,1.10,sign*20.44,.17,.08,.06,'#bebcac')}
    for(const x of [-8,8]){put(x,3.17,sign*20.51,.53,.18,.12,'#e4c480');put(x,3.29,sign*20.47,.68,.05,.26,'#46514c')}
  }
  // Quayside gantries and their latticed booms establish a readable port silhouette.
  const steel='#747f78',yellow='#bb8b53', iron='#69746f';
  function gantry(x,z,scale,face) {
    const p=(a,b,c)=>[x+face*a*scale,b*scale-3.7,z+c*scale];
    const gir=(a,b,width,cl=steel,dep=width)=>beam(p(...a),p(...b),width*scale,cl,dep*scale);
    const bx=(a,b,c,w,h,d,cl)=>put(...p(a,b,c),w*scale,h*scale,d*scale,cl);
    for(const dz of [-4,4]){
      for(const dx of [-4.8,4.8]){
        gir([dx,0,dz],[dx*.63,14,dz],.47);bx(dx,1,dz,1.8,1.05,1.92,iron);
        gir([dx,1,dz],[0,9,dz],.20);gir([dx,4,dz],[dx,4,-dz],.24);
      }
      gir([-3,14,dz],[13.7,14,dz],.44,yellow);gir([-3,15.15,dz],[13.7,15.15,dz],.26,yellow);
      for(let n=-3;n<13;n+=2){gir([n,14,dz],[n+1,15.15,dz],.12,yellow);gir([n+1,15.15,dz],[n+2,14,dz],.12,yellow)}
      gir([-3,14,dz],[.9,22,dz*.78],.29);gir([.9,22,dz*.78],[10.7,15.15,dz],.1);
      gir([.9,22,dz*.78],[-4.1,15.1,dz],.12);
    }
    bx(-1,14.7,0,6.2,1.8,9,yellow);bx(1,22,0,.5,.44,6.55,steel);
    bx(6.4,13.68,0,1.8,1.1,8.6,iron);bx(7.1,12.76,3,1.45,1.47,1.67,bone);
    for(const dz of [-2,2])gir([6.4,13.2,dz],[6.4,8.5,dz],.045,dark);
    bx(6.4,8.4,0,1.3,.38,4.6,yellow);
  }
  for(const [x,z,s,f] of [[-43,-44,1.48,1],[-45,-6,1.17,1],[-47,35,1.22,1],[37,-75,1.27,-1],[75,-74,1.08,-1]])gantry(x,z,s,f);
  put(-70,-4.05,0,62,2.9,180,'#727b73');put(45,-4.05,-95,157,2.9,44,'#727b73');
  const rng=randomSource(827);
  for(let i=0;i<102;i++){
    const bank=i<63,k=bank?i:i-63,x=bank?-44-Math.floor(k/21)*6:-22+(k%20)*6.15,z=bank?-66+(k%21)*6.4:-83-Math.floor(k/20)*7;
    const levels=1+Math.floor(rng()*3);
    for(let j=0;j<levels;j++){
      const cl=colors[Math.floor(rng()*6)], y=-2.70+j*1.81+.9;
      put(x,y,z,bank?2.46:5.7,1.79,bank?5.9:2.45,cl);
      // Corner castings and rails separate the stacked freight even against the haze.
      if(bank){put(x+1.235,y+.81,z,.028,.08,5.91,iron);for(const a of [-2.81,2.81])put(x+1.24,y,z+a,.032,1.78,.07,iron);}
      else {put(x,y+.81,z+1.23,5.7,.08,.03,iron);for(const a of [-2.74,2.74])put(x+a,y,z+1.23,.07,1.78,.03,iron);}
    }
  }
  for(const [x,z] of [[-71,-58],[-77,-42],[81,-94]]){
    put(x,2,z,19,9,11,'#84908b');
    for(let i=0;i<5;i++)put(x-7+i*3.3,6.55,z,2.95,.34,11.8,'#8e9690');
    put(x+6,12,z-2,.72,18,.72,'#8c928b');put(x+6,17,z-2,.75,1.6,.75,'#a77561');
  }
  const water=new T.Mesh(new T.PlaneGeometry(590,590),new T.ShaderMaterial({
    uniforms:{time:{value:0}},vertexShader:'varying vec3 wp; void main(){wp=(modelMatrix*vec4(position,1.)).xyz;gl_Position=projectionMatrix*viewMatrix*vec4(wp,1.);}',
    fragmentShader:`varying vec3 wp; uniform float time;
    float waves(vec2 p){return sin(p.x*1.33+p.y*.74+time*1.2)+.5*sin(p.x*.56-p.y*2.+time*1.52)+.18*sin(5.3*p.y+p.x*1.6+time*2.1);}
    void main(){vec2 p=wp.xz;float w=waves(p*.53);vec3 norm=normalize(vec3(-.055*(waves((p+vec2(.16,0))*.53)-w)/.16,1.,-.09*(waves((p+vec2(0,.16))*.53)-w)/.16));
    vec3 eye=normalize(cameraPosition-wp),l=normalize(vec3(-.72,.36,-.54));float d=length(wp.xz-cameraPosition.xz);
    float spec=pow(max(dot(reflect(-l,norm),eye),0.),42.);
    vec3 col=mix(vec3(.064,.19,.20),vec3(.24,.37,.35),.45+.28*w);
    col+=spec*vec3(1.15,.71,.35);col=mix(col,vec3(.62,.70,.68),smoothstep(30.,235.,d)*.82);
    gl_FragColor=vec4(col,1.);
    #include <colorspace_fragment>
    }`}));
  water.position.y=-3.62;water.rotation.x=-Math.PI/2;scene.add(water);
  for(const [material,matrices] of batches) {
    const mesh=new T.InstancedMesh(cube,material,matrices.length);
    matrices.forEach((matrix,i)=>mesh.setMatrixAt(i,matrix));
    mesh.computeBoundingSphere();mesh.castShadow=true;mesh.receiveShadow=true;scene.add(mesh);
  }
  return {solids,bounds:{minX:-11.96,maxX:11.96,minZ:-25.65,maxZ:25.65},spawns,
    update(timeSeconds){water.material.uniforms.time.value=timeSeconds;},
  };
}

