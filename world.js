import * as T from './three.module.js';
import {makeEffects} from './deck-effects.js?v=7';

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
    c.font='bold 49px Arial'; c.fillText(['FREIGHT','SEALINE','NORTH SEA','PACIFIC'][id%4],48,102);
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
  c.fillStyle='#363931';c.font='bold 18px monospace';c.fillText('\u2191\u2191',35,56);c.font='bold 12px monospace';c.fillText('FRT / 045',28,212);scuff(c,256,256,3,1500);return canvasMap(c);
}
function canvasCargo() {
  const c=sheet(512,256), r=randomSource(804);
  c.fillStyle='#394535';c.fillRect(0,0,512,256);
  for(let i=0;i<5500;i++){
    c.fillStyle=r()>.55?'rgba(186,190,151,.09)':'rgba(11,19,13,.14)';
    c.fillRect(r()*512,r()*256,1+r()*6,1+r()*3);
  }
  for(let x=8;x<512;x+=42){
    c.strokeStyle='rgba(14,25,17,.20)';c.lineWidth=2;c.beginPath();
    c.moveTo(x,0);c.quadraticCurveTo(x+12,39,x-2,80+r()*76);c.stroke();
  }
  for(const x of [7,127,255,383,500]) {c.fillStyle='#262e27';c.fillRect(x,0,6,248);c.fillStyle='#60634c';c.fillRect(x+1,0,1,248);}
  c.fillStyle='#202821';c.fillRect(0,239,512,17);
  return canvasMap(c);
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
  c.fillStyle='#545459';c.fillRect(0,0,w,h);
  for(let j=0;j<20;j++)for(let i=-1;i<5;i++) {
    let x=i*256+(j%2)*128,y=j*106;
    c.fillStyle='rgba('+(r()>.5?'190,174,147':'44,46,42')+','+(r()*.12)+')';c.fillRect(x,y,256,106);
    c.fillStyle='rgba(30,31,30,.45)'; c.fillRect(x,y,256,2);c.fillRect(x,y,2,106);
    for(let v=10;v<250;v+=31){c.fillStyle='#55564e';c.fillRect(x+v,y+5,2,2)}
  }
  for(let i=0;i<11000;i++){c.fillStyle='rgba(38,39,36,.07)';c.fillRect(r()*w,r()*h,r()*17+1,r()*2+1)}
  for(const x of [21,1003]){c.fillStyle='#c7ae59';c.fillRect(x,0,5,h);for(let y=0;y<h;y+=64)c.fillRect(x-11,y,2,34)}
  const sx=w/25, sz=h/53;
  for(const b of blocks.filter(b=>b.bottom===0)) {
    const yaw=b.yaw||0, cos=Math.cos(yaw),sin=Math.sin(yaw);
    const pts=[[-1,-1],[1,-1],[1,1],[-1,1]].map(([a,e])=>{
      const dx=a*b.w*.5,dz=e*b.d*.5;
      return [(b.x+dx*cos+dz*sin+12.5)*sx,(b.z+dz*cos-dx*sin+26.5)*sz];
    });
    c.shadowColor='rgba(13,18,18,.58)';c.shadowBlur=11;c.shadowOffsetX=3;c.shadowOffsetY=4;
    c.fillStyle='rgba(36,35,28,.35)';c.beginPath();pts.forEach(([x,y],i)=>i?c.lineTo(x,y):c.moveTo(x,y));c.closePath();c.fill();
    c.shadowOffsetX=c.shadowOffsetY=c.shadowBlur=0;
  }
  return canvasMap(c);
}
export function buildWorld(scene) {
  const headless=!scene;
  const solids=[], vents=[], batches=new Map(), materials=new Map(), cube=new T.BoxGeometry(1,1,1);
  const unit=new T.Object3D(), axis=new T.Vector3(0,1,0), steelMap=headless?null:paintedSteel();
  function mat(col) {
    if(typeof col!=='string')return col;
    if(!materials.has(col))materials.set(col,new T.MeshStandardMaterial({color:col,map:steelMap,roughness:.82,metalness:.07}));
    return materials.get(col);
  }
  function put(x,y,z,w,h,d,color,quat=null){
    if(headless)return;
    const m=mat(color);
    if(!batches.has(m))batches.set(m,[]);
    unit.position.set(x,y,z);unit.scale.set(w,h,d);unit.quaternion.identity();if(quat)unit.quaternion.copy(quat);
    unit.updateMatrix();batches.get(m).push(unit.matrix.clone());
  }
  function beam(a,b,r,color,depth=r){
    const v=new T.Vector3(...b).sub(new T.Vector3(...a)),len=v.length();
    put((a[0]+b[0])/2,(a[1]+b[1])/2,(a[2]+b[2])/2,r,len,depth,color,new T.Quaternion().setFromUnitVectors(axis,v.normalize()));
  }
  function solid(x,z,w,d,bottom,top,extra={}){solids.push({x,z,w,d,bottom,top,...extra})}
  function wall(x,z,w,d,bot,top,col,extra){put(x,(bot+top)/2,z,w,top-bot,d,col);solid(x,z,w,d,bot,top,extra)}
  const colors=['#746f58','#465d70','#586650','#8d8572','#66705c','#596b75'];
  const skins=headless?colors.map(()=>({})):colors.map((color,i)=>{
    const side=new T.MeshStandardMaterial({map:boxSkin(color,i),roughness:.79,metalness:.12});
    const door=new T.MeshStandardMaterial({map:boxSkin(color,i,true),roughness:.76,metalness:.12});
    return {side,door,top:mat(color)};
  });
  function container(x,z,w,d,base,id,yaw=0){
    const {side,door,top}=skins[id%skins.length];
    const m=w>d?[door,door,top,top,side,side]:[side,side,top,top,door,door];
    const rotation=new T.Quaternion().setFromAxisAngle(axis,yaw);
    put(x,base+1.33,z,w,2.66,d,m,rotation);solid(x,z,w,d,base,base+2.66,{yaw});
    const count=Math.round(Math.max(w,d)*3),cos=Math.cos(yaw),sin=Math.sin(yaw);
    for(let i=1;i<count;i++){
      const t=i/count-.5,dx=w>d?t*w:0,dz=w>d?0:t*d;
      put(x+dx*cos+dz*sin,base+2.67,z+dz*cos-dx*sin,w>d?.075:w-.08,.027,w>d?d-.08:.075,top,rotation);
    }
  }
  const timber=new T.MeshStandardMaterial({map:headless?null:crateSkin(),roughness:.98});
  function crate(x,z,s,base=0,h=s){wall(x,z,s,s,base,base+h,timber,{material:'wood'})}
  const tarp=new T.MeshStandardMaterial({map:headless?null:canvasCargo(),roughness:1});
  const greenTimber=new T.MeshStandardMaterial({map:timber.map,color:'#a7ad8c',roughness:.98});
  function coveredFreight(x,z,w,d,yaw=0){
    const rot=new T.Quaternion().setFromAxisAngle(axis,yaw);
    put(x,.18,z,w,.36,d,greenTimber,rot);
    put(x,1.27,z,w+.04,1.83,d+.04,tarp,rot);
    solid(x,z,w+.04,d+.04,0,2.185,{yaw,material:'wood'});
  }
  // The two offset diagonals part the center crossing. Each approach has a
  // transverse freight box, a low stack and a long canvas-covered load.
  coveredFreight(-4.6,-.38,2.32,5.35,.78);
  coveredFreight(4.2,.94,2.40,5.48,-1.00);
  container(.9,-9.4,7.0,2.48,0,3);
  coveredFreight(5.95,-10.65,2.45,5.9);
  coveredFreight(-4.05,8.08,6.6,2.42);
  container(3.2,14.75,6.55,2.44,0,1);
  coveredFreight(-2.9,-15.55,6.55,2.56);
  for(const ax of [-4.65,-2.88,-1.1])crate(ax,-15.55,1.73,2.185,1.38);
  for(const ax of [1.5,3.22,4.96])crate(ax,14.75,1.68,2.66,1.45);
  crate(.98,-4.15,1.55);crate(.98,-6.0,1.2);crate(.98,-4.15,1.0,1.55,.85);
  crate(-.06,9.60,1.48);crate(-.06,11.08,1.42);
  crate(5.8,-7.46,1.2);crate(-1.34,14.8,1.18);
  for(const sign of [-1,1]){
    crate(sign*7.28,sign*16.05,1.78);
    crate(sign*6.83,sign*17.55,1.05);
    const x=sign*10.35,entry=17.6, rise=.18, run=.48, steps=12, platform=steps*rise;
    const stairEnd=entry-steps*run, exit=-6.4, length=stairEnd-exit, center=sign*(stairEnd+exit)/2;
    vents.push({entry:{x,z:sign*entry}, exit:{x,z:sign*exit}});
    const tread='#69736c', arch='#56655f', sill='#dfb358';
    for(let i=1;i<=steps;i++){
      const z=sign*(entry-(i-.5)*run), high=i*rise;
      wall(x,z,2.38,run,0,high,tread,{walkSurface:true});
      put(x,high+.008,z+sign*(run/2-.035),2.27,.015,.058,sill);
      if(i%3===1)for(const dx of [-1.15,1.15])put(x+dx,high+.52,z,.065,1.04,.065,arch);
    }
    for(const dx of [-1.16,1.16])beam([x+dx,1.12,sign*entry],[x+dx,platform+1.12,sign*stairEnd],.07,sill);
    wall(x,center,2.54,length,0,platform,tread,{walkSurface:true});
    const ceiling=platform+2.17;
    for(const dx of [-1.20,1.20])wall(x+dx,center,.15,length,platform,ceiling,'#78877c');
    wall(x,center,2.55,length,ceiling,ceiling+.17,'#97a398');
    for(let at=exit+.12;at<stairEnd;at+=2.5){
      const z=sign*at;
      put(x,ceiling+.18,z,2.63,.09,.13,arch);
      for(const dx of [-1.28,1.28])put(x+dx,ceiling*.5,z,.09,ceiling,.12,arch);
      put(x,ceiling-.055,z,.12,.07,.62,'#e1cb9c');
    }
    // Corrugated cargo siding shares the passage walls. Crates at its drop
    // form a second, jumpable path along the top of the side stacks.
    const bayCount=3,bay=length/bayCount;
    for(let j=0;j<bayCount;j++){
      const z=sign*(exit+(j+.5)*bay), panelX=x-sign*1.275;
      put(panelX,platform*.50,z,.035,platform-.08,bay-.10,skins[1].side);
      put(panelX,platform+1.08,z,.035,2.08,bay-.10,skins[j%2?0:3].side);
    }
    const lip=sign*exit;
    crate(x+sign*.65,lip-sign*3.45,1.12,0,1.02);
    wall(x+sign*.67,lip-sign*2.15,1.27,1.46,0,2.04,greenTimber,{material:'wood'});
    wall(x+sign*.67,lip-sign*.71,1.27,1.38,0,3.22,timber,{material:'wood'});
    // Square steel coaming and amber nosing identify the drop at the enemy end.
    for(const end of [exit,stairEnd]){
      const z=sign*end;
      for(const dx of [-1.2,1.2])put(x+dx,platform+1.1,z,.18,2.22,.11,sill);
      put(x,ceiling-.02,z,2.55,.13,.12,sill);
    }
    put(x,platform+.012,sign*(exit+.09),2.32,.023,.18,sill);
    for(let i=-4;i<=4;i++)put(x+i*.24,platform+.026,sign*(exit+.09),.11,.008,.17,arch);

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
    if(sign>0){
    put(sign*5,8.14,z,.18,3.15,.18,dark);put(sign*5,8.92,z,2.75,.11,.12,rail);
    put(sign*5,9.7,z,.16,.18,.16,flame);
    }
    for(let i=-11;i<=11;i+=1.85)put(i,4.55,sign*20.65,.07,.96,.07,rail);
    put(0,4.99,sign*20.65,23,.08,.08,rail);
    put(0,4.61,sign*20.65,23,.05,.05,rail);
    // A stair and lookout outside each bulkhead leave both original spawn doors open.
    const lookoutZ=sign*18.7;
    wall(0,lookoutZ,4.4,1.97,0,1.80,'#7b877b',{walkSurface:true});
    for(let i=0;i<10;i++){
      const x=sign*(-5.82+i*.38),height=(i+1)*.18;
      wall(x,lookoutZ,.38,1.84,0,height,'#65756f',{walkSurface:true});
      put(x-sign*.145,height+.009,lookoutZ,.06,.018,1.8,'#d6ad58');
    }
    const back=lookoutZ+sign*.91;
    beam([sign*-6.01,.89,back],[sign*-2.21,2.69,back],.065,'#ccaa5e');
    for(const x of [-2,0,2])put(x,2.27,back,.07,.94,.07,rail);
    put(0,2.72,back,4.18,.07,.07,rail);
    wall(sign*1.31,lookoutZ-sign*.85,1.57,.24,1.80,2.56,'#859180');
    // Fire cabinets, hose and life ring hung on the spawn bulkhead.
    put(sign*8.1,1.43,sign*20.50,.76,.97,.20,'#994331');put(sign*8.1,1.46,sign*20.38,.47,.64,.05,'#ad6548');
    for(const xx of [-.18,.18])put(sign*8.1+xx,1.45,sign*20.34,.035,.4,.05,'#b4afa0');
    if(!headless){
      const ring=new T.Mesh(new T.TorusGeometry(.31,.082,7,28),mat('#d9773c'));
      ring.position.set(-sign*8.4,1.69,sign*20.43);scene.add(ring);
      for(const a of [.78,2.36,3.93,5.50])put(ring.position.x+Math.cos(a)*.31,1.69+Math.sin(a)*.31,sign*20.41,.10,.11,.11,'#cdc6af');
    }
    for(const depth of [23,24.7])for(const x of [-6,5.8,3,-3])spawns[sign===1?0:1].push({x,z:sign*depth});
  }
  // A tandem-rotor airframe parked on the far deck gives that spawn its skyline.
  const heliPaint='#424940',heliGlass='#27383c', padZ=-24.0;
  function ellipsoid(x,y,z,sx,sy,sz,color){
    if(headless)return;
    const shell=new T.Mesh(new T.SphereGeometry(1,16,10),mat(color));
    shell.position.set(x,y,z);shell.scale.set(sx,sy,sz);shell.castShadow=true;scene.add(shell);
  }
  put(-.8,6.85,padZ,17.6,.20,4.65,'#59615c');
  ellipsoid(-.6,8.10,padZ,5.0,1.02,1.04,heliPaint);
  ellipsoid(-4.10,8.13,padZ,.95,.83,.99,heliGlass);
  for(const side of [-1,1]){
    for(let j=0;j<6;j++)ellipsoid(-2.92+j*.97,8.27,padZ+side*.95,.20,.23,.043,heliGlass);
    for(const x of [-3.6,2.65]){put(x,7.23,padZ+side*.68,.13,.63,.12,dark);ellipsoid(x,7.02,padZ+side*.80,.29,.27,.15,'#272c29');}
  }
  for(const [x,h] of [[-4.0,9.32],[3.35,9.82]]){
    ellipsoid(x,8.86,padZ,.68,h-8.74,.64,heliPaint);
    put(x,h+.18,padZ,.14,.47,.14,dark);
    for(let j=0;j<3;j++){
      const a=j*Math.PI*2/3+(x>0?.52:0);
      beam([x,h+.39,padZ],[x+3.72*Math.cos(a),h+.36,padZ+3.72*Math.sin(a)],.085,'#353c39',.18);
    }
  }
  // Hull, bulwarks, timber fenders and handrails.
  put(0,-1.7,0,25,3.3,53,'#343d3b');put(0,-3.5,0,24.85,.8,52.9,'#874a37');
  for(const x of [-12.15,12.15]){
    wall(x,0,.24,52.8,0,.64,'#75827a');put(x,.66,0,.39,.09,52.8,bone);
    for(let z=-25;z<=25;z+=2.5){put(x,1.15,z,.075,1.02,.075,rail);put(x*1.035,-1.3,z,.11,1.92,.18,dark)}
    for(let z=-20;z<20;z+=.85){
      beam([x,.72,z],[x,2.66,z+.85],.018,rail);
      beam([x,2.66,z],[x,.72,z+.85],.018,rail);
    }
    put(x,2.68,0,.065,.07,40.8,'#ba9a55');
    for(const y of [1.23,1.64])put(x,y,0,.065,.07,51.9,rail);
  }
  const bounds={minX:-11.96,maxX:11.96,minZ:-25.65,maxZ:25.65};
  if(headless)return {solids,vents,bounds,spawns};
  const dk=new T.Mesh(new T.PlaneGeometry(25,53),new T.MeshStandardMaterial({map:deckSkin(solids),roughness:.92}));
  dk.rotation.x=-Math.PI/2; dk.receiveShadow=true;scene.add(dk);
  const sky=new T.Color('#a7bab8');scene.fog=new T.FogExp2(sky,.0063);scene.background=sky;
  const sun=new T.DirectionalLight(0xffdfad,2.10);sun.position.set(-40,35,-48);
  sun.castShadow=true;sun.shadow.mapSize.set(2048,2048);
  Object.assign(sun.shadow.camera,{left:-37,right:37,top:32,bottom:-32,near:12,far:117});sun.shadow.camera.updateProjectionMatrix();
  sun.shadow.bias=-.00024;sun.shadow.normalBias=.035;scene.add(sun);
  const hemi=new T.HemisphereLight(0xe2edff,0x809187,1.15);scene.add(hemi);
  const dusk={value:0};
  const skydome=new T.Mesh(new T.SphereGeometry(390,36,22),new T.ShaderMaterial({side:T.BackSide,depthWrite:false,uniforms:{dusk},
    vertexShader:'varying vec3 v;void main(){v=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader:`varying vec3 v; uniform float dusk;
    float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.54);}
    float noise2(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+1.),f.x),f.y);}
    void main(){vec3 n=normalize(v),s=normalize(vec3(-.72,.36,-.54));float h=max(n.y,0.),d=max(dot(n,s),0.);
    vec3 col=mix(vec3(.69,.71,.69),vec3(.18,.37,.50),pow(h,.57));col+=vec3(.32,.17,.056)*pow(d,7.);
    vec2 p=n.xz/(h+.12)*1.95;float f=noise2(p)*.53+noise2(p*2.1)*.26+noise2(p*4.4)*.14+noise2(p*9.)*.07;
    col=mix(col,vec3(.92,.86,.75),smoothstep(.49,.78,f)*smoothstep(.015,.21,h)*.69);col+=vec3(.77,.66,.39)*smoothstep(.9985,.99965,d);
    col=mix(col,col*vec3(.78,.45,.42)+vec3(.12,.04,.09),dusk);gl_FragColor=vec4(col,1.);
    #include <colorspace_fragment>
    }`}));
  scene.add(skydome);
  // Keep the procedural horizon while the bundled photographic sky decodes.
  new T.TextureLoader().load(new URL('./freighter-sky.webp',import.meta.url).href,photo=>{
    photo.colorSpace=T.SRGBColorSpace;photo.wrapS=T.RepeatWrapping;
    const original=skydome.material;
    skydome.material=new T.ShaderMaterial({side:T.BackSide,depthWrite:false,
      uniforms:{pano:{value:photo},dusk},vertexShader:original.vertexShader,fragmentShader:`varying vec3 v; uniform sampler2D pano; uniform float dusk;
      void main(){vec3 n=normalize(v);
      vec2 uv=vec2(fract(atan(n.z,n.x)*.15915494+.958),.5+asin(clamp(n.y,-1.,1.))*.3183099);
      vec3 c=texture2D(pano,uv).rgb*vec3(.96,.94,.90);
      vec3 haze=mix(vec3(.50,.58,.59),vec3(.72,.68,.56),max(0.,dot(n,normalize(vec3(-.72,.1,-.64)))));
      c=mix(haze,c,smoothstep(.010,.16,n.y));
      vec3 sunset=c*mix(vec3(1.10,.47,.26),vec3(.44,.37,.64),smoothstep(.02,.76,n.y));
      float glow=pow(max(dot(n,normalize(vec3(-.68,.115,-.72))),0.),18.);
      sunset+=vec3(.50,.16,.034)*glow;gl_FragColor=vec4(mix(c,sunset,dusk),1.);
      #include <colorspace_fragment>
      }`});
    original.dispose();
  });

  function stencil(words,x,y,z,w,h,invert=false,paint='#475149'){
    const c=sheet(512,128); c.fillStyle='#394641';c.fillRect(0,0,512,128);c.fillStyle='#d7cfc0';c.fillRect(7,7,498,114);c.fillStyle=paint;c.fillRect(10,10,492,108);
    c.fillStyle='#eadab9';c.font='bold 71px Arial';c.textAlign='center';c.textBaseline='middle';c.fillText(words,256,68,472);
    const o=new T.Mesh(new T.PlaneGeometry(w,h),new T.MeshStandardMaterial({map:canvasMap(c),roughness:.94}));
    o.position.set(x,y,z);if(invert)o.rotation.y=Math.PI;scene.add(o);
  }
  stencil('01   /   BLUE',0,2.13,20.54,4.05,.91,true,'#284c62');
  stencil('02   /   RED',0,2.13,-20.54,4.05,.91,false,'#804336');
  for(const sign of [-1,1]){
    stencil('VENT   /   IN',sign*10.35,4.40,sign*11.89,2.41,.30,sign<0);
    stencil('DROP   /   2.2 M',sign*10.35,1.16,-sign*6.42,1.93,.42,sign>0);
  }
  for(const sign of [-1,1]){
    const z=sign*24.4;
    if(sign>0){
    put(-sign*2,7.58,z,2.1,1.92,1.56,'#ac664c');put(-sign*2,8.57,z,2.16,.32,1.61,'#414a46');
    for(const x of [-.66,0,.66])put(-sign*2+x,8.83,z,.34,.39,.44,'#343e3d');
    }
    for(const x of [-9.9,9.9]){put(x,1.25,sign*20.53,.88,2.24,.08,'#616e65');put(x,1.81,sign*20.47,.47,.47,.05,'#2c4144');put(x+.28,1.10,sign*20.44,.17,.08,.06,'#bebcac')}
    for(const x of [-8,8]){put(x,3.17,sign*20.51,.53,.18,.12,'#e4c480');put(x,3.29,sign*20.47,.68,.05,.26,'#46514c')}
  }
  // The two long yellow derricks run outside the rails at opposite ends.
  for(const sign of [-1,1]){
    const x=sign*12.95,z=sign*21.8,end=-sign*3.2,gold='#b59a51';
    put(x,.55,z,1.54,1.7,1.73,dark);
    for(const side of [-.48,.48]){
      beam([x+side,.8,z],[x+side,7,z],.14,gold);
      beam([x+side,6.33,z],[x+side,4.83,end],.13,gold);
      beam([x+side,7.02,z],[x+side,5.52,end],.11,gold);
      for(let j=0;j<18;j++){
        const f=j/18,g=(j+1)/18;
        beam([x+side,6.33-1.5*f+(j%2)*.69,z+(end-z)*f],
             [x+side,6.33-1.5*g+((j+1)%2)*.69,z+(end-z)*g],.067,gold);
      }
    }
    for(let i=0;i<=6;i++){const f=i/6;put(x,7.02-1.5*f,z+(end-z)*f,1.07,.10,.10,gold);}
    beam([x,5.42,end],[x,3.42,end],.029,dark);
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
    uniforms:{time:{value:0},dusk},vertexShader:'varying vec3 wp; void main(){wp=(modelMatrix*vec4(position,1.)).xyz;gl_Position=projectionMatrix*viewMatrix*vec4(wp,1.);}',
    fragmentShader:`varying vec3 wp; uniform float time,dusk;
    float waves(vec2 p){return sin(p.x*1.33+p.y*.74+time*1.2)+.5*sin(p.x*.56-p.y*2.+time*1.52)+.18*sin(5.3*p.y+p.x*1.6+time*2.1);}
    void main(){vec2 p=wp.xz;float w=waves(p*.53);vec3 norm=normalize(vec3(-.055*(waves((p+vec2(.16,0))*.53)-w)/.16,1.,-.09*(waves((p+vec2(0,.16))*.53)-w)/.16));
    vec3 eye=normalize(cameraPosition-wp),l=normalize(vec3(-.72,.36,-.54));float d=length(wp.xz-cameraPosition.xz);
    float spec=pow(max(dot(reflect(-l,norm),eye),0.),42.);
    vec3 col=mix(vec3(.064,.19,.20),vec3(.24,.37,.35),.45+.28*w);
    col+=spec*vec3(1.15,.71,.35);col=mix(col,vec3(.62,.70,.68),smoothstep(30.,235.,d)*.82);col=mix(col,col*vec3(.82,.56,.61),dusk);
    gl_FragColor=vec4(col,1.);
    #include <colorspace_fragment>
    }`}));
  water.position.y=-3.62;water.rotation.x=-Math.PI/2;scene.add(water);
  // Davits suspend the rescue boat outside the starboard play boundary.
  for(const z of [18.0,21.8]){
    beam([11.82,.25,z],[12.48,3.75,z],.19,bone);beam([12.48,3.75,z],[14.13,3.32,z],.16,bone);
    beam([13.94,3.36,z],[13.94,.57,z],.045,dark);
  }
  const rescueBoat=new T.Mesh(new T.SphereGeometry(1,24,12),mat('#cf733b'));rescueBoat.position.set(13.94,.37,19.9);
  rescueBoat.scale.set(1.0,.72,2.98);scene.add(rescueBoat);
  put(13.94,.77,19.98,1.39,.41,2.8,'#b96334');
  for(const side of [-1,1])for(let i=0;i<4;i++)put(13.94+side*.704,.79,19.00+i*.59,.032,.25,.46,'#40585a');
  put(13.94,1.02,19.98,1.52,.07,2.83,'#ded3af');
  // Crane trolley carries a pendulum load well outside the playable deck.
  const hook=new T.Group();hook.position.set(-43+6.4*1.48,8.4*1.48-3.7,-44);
  const load=new T.Mesh(cube,[skins[5].door,skins[5].door,skins[5].top,skins[5].top,skins[5].side,skins[5].side]);
  load.scale.set(7.45,2.65,2.68);load.position.y=-4.1;hook.add(load);
  for(const dx of [-3.5,3.5])for(const dz of [-1.2,1.2]){
    const a=new T.Vector3(dx*.20,0,dz),b=new T.Vector3(dx,-2.78,dz),sling=new T.Mesh(cube,mat(iron));
    sling.position.copy(a).lerp(b,.5);sling.scale.set(.035,a.distanceTo(b),.035);sling.quaternion.setFromUnitVectors(axis,b.sub(a).normalize());hook.add(sling);
  }
  scene.add(hook);
  const wingGeo=new T.BufferGeometry();wingGeo.setAttribute('position',new T.Float32BufferAttribute(
    [-.08,.01,.18,.77,.17,-.07,.45,.08,-.15,.45,.08,-.15,.77,.17,-.07,1.07,.05,-.16],3));wingGeo.computeVertexNormals();
  const birds=[],wingMat=new T.MeshBasicMaterial({color:'#c6c9c0',side:T.DoubleSide});
  for(let i=0;i<7;i++){
    const body=new T.Group(),wings=[];
    for(const sign of [-1,1]){const wing=new T.Mesh(wingGeo,wingMat);wing.scale.x=sign;body.add(wing);wings.push(wing);}
    body.scale.setScalar(.62+i%3*.14);scene.add(body);birds.push({body,wings});
  }
  for(const [material,matrices] of batches) {
    const mesh=new T.InstancedMesh(cube,material,matrices.length);
    matrices.forEach((matrix,i)=>mesh.setMatrixAt(i,matrix));
    mesh.computeBoundingSphere();mesh.castShadow=true;mesh.receiveShadow=true;scene.add(mesh);
  }
  const fx=makeEffects(scene);
  function setTime(mode){
    const late=mode==='dusk';dusk.value=late?1:0;
    sun.color.set(late?'#ff9d64':'#fff0d0');sun.intensity=late?1.75:2.1;
    sun.position.set(-40,late?22:41,-48);sun.shadow.needsUpdate=true;
    hemi.color.set(late?'#b6bad9':'#e2edff');hemi.groundColor.set(late?'#786b67':'#809187');hemi.intensity=late?1.1:1.25;
    sky.set(late?'#c7a395':'#a7bab8');scene.fog.color.copy(sky);scene.fog.density=late?.008:.0063;
  }
  function setQuality(level){
    const px={low:512,medium:1024,high:2048}[level]||1024;
    sun.castShadow=level!=='low';sun.shadow.mapSize.set(px,px);
    if(sun.shadow.map&&sun.shadow.map.width!==px){sun.shadow.map.dispose();sun.shadow.map=null;}
    sun.shadow.needsUpdate=true;fx.setQuality(level);
    birds.forEach(({body},i)=>{body.visible=i<(level==='low'?2:level==='medium'?4:7);});
  }
  setTime('day');
  let lastTime=0;
  return {solids,vents,bounds,spawns,fx,setTime,setQuality,
    update(timeSeconds,dt){
      dt=Number.isFinite(dt)?dt:Math.max(0,Math.min(.06,timeSeconds-lastTime));lastTime=timeSeconds;
      water.material.uniforms.time.value=timeSeconds;fx.update(dt);
      hook.rotation.z=Math.sin(timeSeconds*.64)*.044;hook.rotation.x=Math.sin(timeSeconds*.39)*.022;
      birds.forEach(({body,wings},i)=>{
        if(!body.visible)return;const t=timeSeconds*.067+i*1.5;
        body.position.set(-7+Math.cos(t)*(19+i*1.25),12+i*.65+Math.sin(t*2)*.7,-8+Math.sin(t)*(26+i*.64));
        body.rotation.y=-t;const flap=.17+Math.sin(timeSeconds*4.2+i)*.36;
        wings[0].rotation.z=-flap;wings[1].rotation.z=flap;
      });
    },
  };
}
