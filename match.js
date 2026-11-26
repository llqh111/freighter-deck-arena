import {newBurst,recoverBurst,firingCone,recordShot,spreadOffset} from './gunplay.js?v=8';
import * as T from './three.module.js';
import {arsenal,primaries,melees,isMelee,loadout,skills,falloff} from './arsenal.js?v=27';
import {karambitContactTime} from './karambit-motion.js?v=11';
import {butterflyContactTime} from './butterfly-motion.js?v=23';
import {matchRules,matchDuration} from './match-rules.js?v=23';

const clamp = T.MathUtils.clamp;
const EYE=1.60,RADIUS=.32,ROUND=600,GOAL=50;
const timedMeleeContacts={butterfly:butterflyContactTime,karambit:karambitContactTime};
const spatialSounds=new Set(['shot','step','land','jump','light','heavy','reload','clang','timber','throw','bounce','explode','death']);
const sq = n => n*n;
const rangeScale = (id,dist)=>{
  const f=falloff[id];if(!f||dist<=f.from)return 1;
  return Math.max(f.floor,1-(1-f.floor)*Math.min(1,(dist-f.from)/(f.to-f.from)));
};
const angleTo = (a,b) => Math.atan2(a.x-b.x,a.z-b.z);
const wrapAngle = a => Math.atan2(Math.sin(a),Math.cos(a));
const turnToward = (cur,target,maxDelta)=>{
  const d=wrapAngle(target-cur);
  return Math.abs(d)<=maxDelta?target:wrapAngle(cur+Math.sign(d)*maxDelta);
};

export function createSquad(scene,bots,knifeMode=false){
  const geometry={box:new T.BoxGeometry(1,1,1),ell:new T.SphereGeometry(.5,10,8)};
  const material=new T.MeshStandardMaterial({roughness:.76,metalness:.13});
  const batches={}, allParts=[];
  for(const bot of bots){
    const root=new T.Group();
    function joint(x,y,z){
      const j=new T.Group();j.position.set(x,y,z);root.add(j);return j;
    }
    function part(type,parent,color,x,y,z,w,h,d,tilt=0){
      const o=new T.Object3D();o.position.set(x,y,z);o.scale.set(w,h,d);o.rotation.x=tilt;parent.add(o);
      allParts.push({type,bot,o,color});
    }
    const cloth=bot.team?'#716150':'#384e5a', armor=bot.team?'#463e36':'#303f48', band=bot.team?'#ef7549':'#72c6d4', dark='#252b2b';
    const legs=[joint(-.103,.88,0),joint(.103,.88,0)];
    for(const leg of legs){
      part('ell',leg,cloth,0,-.19,0,.208,.50,.236);
      part('ell',leg,cloth,0,-.55,.012,.168,.48,.176);
      part('box',leg,dark,0,-.39,-.072,.152,.13,.072);
      part('ell',leg,dark,0,-.781,-.066,.192,.18,.32);
    }
    part('ell',root,cloth,0,.92,0,.405,.34,.29);
    part('ell',root,cloth,0,1.23,0,.49,.62,.31);
    part('box',root,armor,0,1.23,-.012,.41,.36,.315);
    part('box',root,dark,0,.993,-.014,.414,.067,.302);
    for(let j=-1;j<=1;j++)part('box',root,cloth,j*.115,1.145,-.176,.096,.138,.078);
    part('box',root,band,0,1.355,-.177,.23,.048,.012);
    part('box',root,band,0,1.33,.165,.20,.058,.018);
    part('ell',root,dark,0,1.571,-.016,.27,.31,.255);
    part('ell',root,'#957b68',0,1.606,-.109,.225,.112,.105);
    part('box',root,'#293334',0,1.623,-.152,.202,.055,.037);
    part('ell',root,armor,0,1.702,-.006,.326,.233,.30);
    part('box',root,cloth,0,1.675,-.10,.288,.048,.16);
    const strikeArm=knifeMode?joint(.237,1.326,-.06):null;
    for(const side of [-1,1]){
      const arm=side===1&&strikeArm?strikeArm:root;
      const {x,y,z}=arm.position;
      part('ell',arm,cloth,side*.237-x,1.326-y,-.06-z,.183,.285,.20,-.56);
      part('box',arm,band,side*.285-x,1.335-y,-.06-z,.065,.076,.15);
      part('ell',arm,cloth,side*.192-x,1.233-y,-.201-z,.15,.274,.16,-1.07);
      part('ell',arm,dark,side*.124-x,1.218-y,-.305-z,.115,.126,.136);
    }
    if(knifeMode){
      const grip=new T.Group();
      grip.position.set(-.113,-.108,-.245);strikeArm.add(grip);
      part('box',grip,'#242a2d',0,.01,-.03,.032,.038,.12,-.15);
      part('box',grip,'#cfd8dc',0,.045,-.17,.014,.052,.24,-.12);
      part('box',grip,'#eef4f6',0,.025,-.18,.010,.016,.22,-.12);
    }else{
      part('box',root,'#1f272a',.095,1.264,-.34,.080,.093,.39);
      part('box',root,'#313537',.095,1.261,-.567,.043,.047,.20);
      part('box',root,dark,.095,1.172,-.321,.056,.139,.082,-.2);
      part('box',root,dark,.095,1.327,-.323,.054,.052,.097);
    }
    bot.rig={root,legs,strikeArm};
  }
  for(const [type,g] of Object.entries(geometry)){
    const parts=allParts.filter(p=>p.type===type);
    const mesh=new T.InstancedMesh(g,material,parts.length);mesh.frustumCulled=false;mesh.castShadow=true;
    mesh.instanceMatrix.setUsage(T.DynamicDrawUsage);
    parts.forEach((p,i)=>mesh.setColorAt(i,new T.Color(p.color)));
    mesh.count=0; scene.add(mesh);batches[type]={mesh,parts};
  }
  const hidden=new T.Matrix4().makeScale(0,0,0);
  function animate(t,visible){
    for(const b of bots){
      const dying=!b.alive&&b.deathT<1.1;
      if(!b.alive&&!dying)continue;
      const {root,legs,strikeArm}=b.rig;
      if(dying){
        const fall=Math.min(1,b.deathT/.36);
        const ease=1-(1-fall)*(1-fall);
        root.position.set(b.x,b.y+.14*ease,b.z);
        root.rotation.set(-ease*1.48,b.yaw,ease*.22,'YXZ');
        root.scale.y=1;
        legs.forEach(leg=>{leg.rotation.x=ease*.25;});
        if(strikeArm)strikeArm.rotation.set(0,0,0);
      }else{
        root.position.set(b.x,b.y + (b.walking?.018*Math.abs(Math.sin(t*10+b.id)):0),b.z);
        root.rotation.set(0,b.yaw,0,'YXZ');root.scale.y=b.crouch?.75:1;
        legs.forEach((leg,i)=>{leg.rotation.x=b.walking?Math.sin(t*10+b.id+i*Math.PI)*.51:0;});
        if(strikeArm){
          let arc=0;
          if(b.strike)arc=clamp(1-(b.strike.at-t)/b.strike.windup,0,1)*.92;
          else if(b.swingT>0){
            const progress=1-b.swingT/.28;
            arc=progress<.28?T.MathUtils.lerp(.92,-1.30,progress/.28):-1.30*(1-progress)/.72;
          }
          strikeArm.rotation.set(arc,arc*.35,-arc*.2);
        }
      }
      root.updateMatrixWorld(true);
    }
    for(const {mesh,parts} of Object.values(batches)){
      mesh.count=visible?parts.length:0;
      if(visible)parts.forEach((p,i)=>mesh.setMatrixAt(i,(p.bot.alive||p.bot.deathT<1.1)?p.o.matrixWorld:hidden));
      mesh.instanceMatrix.needsUpdate=true;
    }
  }
  animate.dispose=()=>{for(const {mesh} of Object.values(batches)){scene.remove(mesh);mesh.dispose();}for(const g of Object.values(geometry))g.dispose();material.dispose();};
  return animate;
}

const STEP=.22, HEIGHT=1.74;

// Project the circular footprint into the collider's own coordinate system.
// Keeping both movement and navigation on this footprint avoids phantom corners.
function collider(s){
  const yaw=s.yaw||0, c=Math.cos(yaw), n=Math.sin(yaw);
  const box=new T.Box3(new T.Vector3(-s.w/2,s.bottom,-s.d/2),new T.Vector3(s.w/2,s.top,s.d/2));
  return {...s,c,n,box};
}
function footprint(x,z,s,r=RADIUS){
  const dx=x-s.x,dz=z-s.z;
  const ex=Math.max(0,Math.abs(dx*s.c-dz*s.n)-s.w/2);
  const ez=Math.max(0,Math.abs(dx*s.n+dz*s.c)-s.d/2);
  return ex*ex+ez*ez<r*r;
}
function makeGrid(list,bounds,cell=1,margin=RADIUS+.5){
  const ox=bounds.minX-3,oz=bounds.minZ-3;
  const cols=Math.ceil((bounds.maxX-bounds.minX+6)/cell),rows=Math.ceil((bounds.maxZ-bounds.minZ+6)/cell);
  const cells=Array.from({length:cols*rows},()=>[]);
  const ci=x=>clamp(Math.floor((x-ox)/cell),0,cols-1),ri=z=>clamp(Math.floor((z-oz)/cell),0,rows-1);
  for(const s of list){
    const hx=Math.abs(s.c)*s.w/2+Math.abs(s.n)*s.d/2+margin;
    const hz=Math.abs(s.n)*s.w/2+Math.abs(s.c)*s.d/2+margin;
    for(let r=ri(s.z-hz);r<=ri(s.z+hz);r++)for(let c=ci(s.x-hx);c<=ci(s.x+hx);c++)cells[r*cols+c].push(s);
  }
  return {at:(x,z)=>cells[ri(z)*cols+ci(x)]};
}
function treadHeight(x,z,treadGrid){
  let height=0;
  for(const s of treadGrid.at(x,z))if(s.top>height && footprint(x,z,s))height=s.top;
  return height;
}

function makeNavigator(world,solidGrid,treadGrid){
  const {minX,maxX,minZ,maxZ}=world.bounds, step=.9;
  const cols=Math.floor((maxX-minX)/step), rows=Math.floor((maxZ-minZ)/step), n=cols*rows;
  const walk=new Uint8Array(n), xOf=id=>minX+(id%cols+.5)*step, zOf=id=>minZ+(Math.floor(id/cols)+.5)*step;
  function clear(x,z,height){
    return x>=minX+RADIUS && x<=maxX-RADIUS && z>=minZ+RADIUS && z<=maxZ-RADIUS && !solidGrid.at(x,z).some(s=>s.bottom<height+HEIGHT && s.top>height+.001 && footprint(x,z,s,RADIUS));
  }
  const heights=new Float32Array(n), links=Array.from({length:n},()=>[]);
  for(let i=0;i<n;i++){
    heights[i]=treadHeight(xOf(i),zOf(i),treadGrid);
    walk[i]=Number(clear(xOf(i),zOf(i),heights[i]));
  }
  // Validate the intervening segment, including individual stair risers.
  // A ledge has a downward edge but no edge in the opposite direction.
  function canSegment(x0,z0,h0,x1,z1,samples){
    let previous=h0;
    for(let k=1;k<=samples;k++){
      const t=k/samples,x=T.MathUtils.lerp(x0,x1,t),z=T.MathUtils.lerp(z0,z1,t);
      const h=treadHeight(x,z,treadGrid);
      if(h>previous+STEP || !clear(x,z,h))return false;
      previous=h;
    }
    return true;
  }
  const dirs=[[0,1],[0,-1],[-1,0],[1,0],[1,1],[1,-1],[-1,1],[-1,-1]];
  for(let at=0;at<n;at++)if(walk[at]){
    const c0=at%cols,r0=Math.floor(at/cols);
    for(const [dc,dr] of dirs){
      const c1=c0+dc,r1=r0+dr;
      if(c1<0||c1>=cols||r1<0||r1>=rows)continue;
      const next=r1*cols+c1;
      if(!walk[next])continue;
      if(dc&&dr){
        const s1=r0*cols+c1,s2=r1*cols+c0;
        if(!walk[s1]||!walk[s2]||Math.abs(heights[s1]-heights[at])>STEP||Math.abs(heights[s2]-heights[at])>STEP)continue;
      }
      if(canSegment(xOf(at),zOf(at),heights[at],xOf(next),zOf(next),dc&&dr?8:6))links[at].push(next);
    }
  }
  function nearest(x,z){
    const col=clamp(Math.floor((x-minX)/step),0,cols-1), row=clamp(Math.floor((z-minZ)/step),0,rows-1);
    let best=-1,dist=Infinity;
    for(let r=0;r<Math.max(cols,rows);r++){
      for(let iz=Math.max(0,row-r);iz<=Math.min(rows-1,row+r);iz++)for(let ix=Math.max(0,col-r);ix<=Math.min(cols-1,col+r);ix++){
        if(Math.max(Math.abs(ix-col),Math.abs(iz-row))!==r)continue;
        const id=iz*cols+ix, d=sq(xOf(id)-x)+sq(zOf(id)-z);
        if(walk[id] && d<dist){best=id;dist=d;}
      }
      if(best>=0)return best;
    }
    return -1;
  }
  function flatClear(x0,z0,h0,x1,z1){
    const dist=Math.hypot(x1-x0,z1-z0),samples=Math.max(3,Math.ceil(dist/.42));
    for(let k=1;k<=samples;k++){
      const t=k/samples,x=T.MathUtils.lerp(x0,x1,t),z=T.MathUtils.lerp(z0,z1,t);
      const h=treadHeight(x,z,treadGrid);
      if(Math.abs(h-h0)>.06 || !clear(x,z,h))return false;
    }
    return true;
  }
  function route(x,z,tx,tz){
    const a=nearest(x,z),b=nearest(tx,tz);
    if(a<0||b<0||a===b)return [];
    const prev=new Int32Array(n).fill(-1), queue=new Int32Array(n);
    let start=0,end=1,closest=a,best=Infinity;
    queue[0]=a;prev[a]=a;
    while(start<end){
      const at=queue[start++], diff=sq(xOf(at)-tx)+sq(zOf(at)-tz);
      if(diff<best){best=diff;closest=at;} if(at===b)break;
      for(const next of links[at]){
        if(prev[next]!==-1)continue;
        prev[next]=at; queue[end++]=next;
      }
    }
    const raw=[];
    for(let at=closest;at!==a;at=prev[at])raw.push({x:xOf(at),z:zOf(at),h:heights[at]});
    raw.reverse();
    if(raw.length<=2)return raw.map(({x:px,z:pz})=>({x:px,z:pz}));
    const smooth=[];
    let anchor={x,z,h:heights[a]},i=0;
    while(i<raw.length){
      let far=i;
      const limit=Math.min(raw.length-1,i+8);
      for(let j=limit;j>i;j--){
        if(Math.abs(raw[j].h-anchor.h)<.06 && flatClear(anchor.x,anchor.z,anchor.h,raw[j].x,raw[j].z)){far=j;break;}
      }
      smooth.push({x:raw[far].x,z:raw[far].z});
      anchor=raw[far];
      i=far+1;
    }
    return smooth;
  }
  const coverOrigin=new T.Vector3(),coverDir=new T.Vector3();
  function findCover(x,z,threatX,threatY,threatZ,wallDistFn,maxRadius=8.5){
    const c0=clamp(Math.floor((x-minX)/step),0,cols-1),r0=clamp(Math.floor((z-minZ)/step),0,rows-1);
    const rad=Math.ceil(maxRadius/step);
    let best=null,bestScore=Infinity;
    for(let iz=Math.max(0,r0-rad);iz<=Math.min(rows-1,r0+rad);iz++){
      for(let ix=Math.max(0,c0-rad);ix<=Math.min(cols-1,c0+rad);ix++){
        const id=iz*cols+ix;
        if(!walk[id])continue;
        const cx=xOf(id),cz=zOf(id),dSelf=Math.hypot(cx-x,cz-z);
        if(dSelf<1.1||dSelf>maxRadius)continue;
        const dThreat=Math.hypot(cx-threatX,cz-threatZ);
        if(dThreat<4.5)continue;
        const h=heights[id];
        if(Math.abs(h-treadHeight(x,z,treadGrid))>.6)continue;
        coverOrigin.set(cx,h+1.22,cz);
        coverDir.set(threatX-cx,threatY+1.35-(h+1.22),threatZ-cz);
        const len=coverDir.length();
        if(len<.5)continue;
        coverDir.multiplyScalar(1/len);
        const hitDist=wallDistFn(coverOrigin,coverDir,len);
        if(hitDist<len-.45){
          // Prefer close cover that is near the blocking object (tight peekable cover).
          const score=dSelf+Math.min(hitDist,4)*.45-Math.min(dThreat,16)*.12;
          if(score<bestScore){bestScore=score;best={x:cx,z:cz};}
        }
      }
    }
    return best;
  }
  return {route,findCover};
}

export function createMatch({scene,camera,world,view,emit=()=>{},network}){
  const colliders=world.solids.map(collider),treads=colliders.filter(s=>s.walkSurface);
  const solidGrid=makeGrid(colliders,world.bounds),treadGrid=makeGrid(treads,world.bounds);
  const navigator=network?null:makeNavigator(world,solidGrid,treadGrid), keys={};
  const p={id:0,name:'你',team:0,x:0,y:0,z:0,yaw:0,hp:100,armor:100,inventory:loadout('ak47','nepal'),slot:0};
  if(network)Object.assign(p,network.player,{takeHit,playSfx});
  const bots=[], units=network?.round.players??[p], grenades=[], effects=[];
  let animate=null, skill=skills.normal, primary='ak47', melee='nepal', sound=true, firstBlood=true, knifeMode=false;
  const state={phase:'idle',mode:'tdm',hp:100,armor:100,team:0,ammo:30,reserve:90,score:[0,0],kills:0,deaths:0,headshots:0,remaining:ROUND,target:GOAL,grounded:true,sprinting:false,alive:true,respawnIn:0,reloading:false,aiming:false,zoom:0,spread:0,weapon:'ak47',inventory:p.inventory,slot:0,scoreboard:[],rows:[],player:p,actors:bots};
  const ray=new T.Ray(), v=new T.Vector3(), dir=new T.Vector3(), eye=new T.Vector3(), aim=new T.Vector3(), tmp=new T.Vector3(), rot=new T.Euler(0,0,0,'YXZ');
  const localRay=new T.Ray(),bodyBox=new T.Box3(),headSphere=new T.Sphere(new T.Vector3(),.145);
  const tracerGeo=new T.CylinderGeometry(.010,.015,1,4),tracerMaterial=new T.MeshBasicMaterial({color:0xffce73,transparent:true,opacity:.86,depthWrite:false});
  const tracerPool=Array.from({length:36},()=>{const m=new T.Mesh(tracerGeo,tracerMaterial);m.visible=false;m.frustumCulled=false;scene.add(m);return {m,left:0};});
  let tracerCursor=0;
  const srcVec=new T.Vector3(),startVec=new T.Vector3(),destVec=new T.Vector3(),hitPos=new T.Vector3(),deadCam=new T.Vector3();
  const nadeGeo=new T.IcosahedronGeometry(.12,1),nadeMat=new T.MeshStandardMaterial({color:0x536043,metalness:.4,roughness:.6});
  const axis=new T.Vector3(0,1,0);
  let pitch=0,jumpVel=0,grounded=true,loadTimer=0,loadDuration=1,shotTimer=0,hudTimer=0,clock=0,bob=0;
  let camY=EYE,bobAmp=0,recoilFollow=.43,shake=0,lookSwayX=0,lookSwayY=0;
  let fireTap=false,altTap=false,restoreZoom=0,pendingStrike=null;
  let baseFov=camera.fov,lastSlot=0,semiLatch=false,attempts=0,hits=0,scopeTime=0;
  const eyeHeight=a=>a.crouch?1.07:EYE;
  const active=a=>a.inventory[a.slot];
  function sfx(kind,weapon,a=p,extra={}){
    if(network&&spatialSounds.has(kind)){
      for(const player of units)player.playSfx(kind,weapon,a,extra);
    }else playSfx(kind,weapon,a,extra);
  }
  function playSfx(kind,weapon,a,extra){
    if(!sound)return;
    const x=a.x-p.x,z=a.z-p.z,dist=Math.hypot(x,z);
    emit('sfx',{kind,weapon,volume:1/(1+dist*.09),pan:clamp((x*Math.cos(p.yaw)-z*Math.sin(p.yaw))/Math.max(1,dist),-1,1),...extra});
  }
  function hud(){
    const w=active(p);
    const reloadProgress=loadTimer>0&&loadDuration>0?clamp(1-loadTimer/loadDuration,0,1):0;
    Object.assign(state,{hp:Math.ceil(p.hp),armor:Math.ceil(p.armor),alive:p.alive,respawnIn:Math.max(0,p.respawn),reloading:loadTimer>0,reloadProgress,weapon:w.id,ammo:w.ammo,maxAmmo:w.max,reserve:w.reserve,inventory:p.inventory,slot:p.slot,protect:p.shield,kills:p.kills,deaths:p.deaths,headshots:p.headshots,attempts,hits,accuracy:attempts?Math.round(hits/attempts*100):0,crouching:p.crouch});
    state.scoreboard=state.rows=units.map(({name,team,kills,deaths,headshots,alive,id})=>({name,team,kills,deaths,headshots,alive,isPlayer:id===p.id}));
    state.aimName='';state.aimTeam=null;
    if(p.alive){
      camera.getWorldDirection(dir);const sight=actorHit(p,camera.position,dir,wallDistance(camera.position,dir,110),true);
      if(sight){state.aimName=sight.unit.name;state.aimTeam=sight.unit.team;}
    }
    emit('hud',state);
  }
  function respawn(a,initial=false){
    const list=world.spawns[a.team], spot=list[initial?a.id%list.length:Math.floor(Math.random()*list.length)];
    const role=a===p?'player':knifeMode?'duelist':a.primary==='awm'?'sniper':a.primary==='mp5'?'flanker':(a.team===p.team&&a.id===1)?'wingman':'rifle';
    const lane=a.id%3-1;
    Object.assign(a,{x:spot.x,y:0,z:spot.z,yaw:a.team?Math.PI:0,hp:100,armor:100,alive:true,deathT:9,respawn:0,shield:initial?.55:1.5,path:[],think:Math.random()*.25,shot:.28+Math.random()*.45,walking:false,enemy:null,crouch:false,burst:newBurst(),vx:0,vz:0,tag:0,slot:0,inventory:loadout(a===p?primary:a.primary,a===p?melee:(a.melee||'knife'),knifeMode),radarT:0,fall:0,streak:0,multi:0,lastKill:-99,lastHeard:null,lastSeen:null,nadeReady:clock+12+Math.random()*16,role,lane,strafeDir:Math.random()<.5?-1:1,strafeAt:clock+.7+Math.random()*.9,reloadUntil:0,coverUntil:0,alertYaw:null,alertUntil:0,hurtAt:-99,burstLeft:3+Math.floor(Math.random()*3),stuckPos:{x:spot.x,z:spot.z},stuckAt:clock+.7,holdPos:null,holdUntil:0,swingT:0});
    a.strike=null;a.scopeTarget=null;
    if(a===p){
      pendingStrike=null;
      pitch=jumpVel=bob=loadTimer=0;grounded=true;shotTimer=.12;lastSlot=0;semiLatch=false;
      restoreZoom=0;state.zoom=0;state.aiming=false;state.killedBy='';camY=EYE;bobAmp=0;recoilFollow=.43;shake=0;lookSwayX=lookSwayY=0;
      view.equip?.(active(p).id);cameraAt(0);
    }
  }
  function cameraAt(dt){
    const targetY=p.y+(p.alive?eyeHeight(p):.65);
    camY=dt>0?T.MathUtils.damp(camY,targetY,18,dt):targetY;
    bobAmp=dt>0?T.MathUtils.damp(bobAmp,p.walking?1:0,14,dt):0;
    recoilFollow=dt>0?T.MathUtils.damp(recoilFollow,state.aiming?.78:.43,18,dt):.43;
    shake=dt>0?shake*Math.exp(-dt*18):0;
    const sx=shake>1e-4?Math.sin(clock*68)*shake:0,sy=shake>1e-4?Math.cos(clock*83)*shake*.75:0;
    camera.position.set(p.x,camY+.022*Math.sin(bob)*bobAmp,p.z);
    camera.rotation.set(pitch+p.burst.pitch*recoilFollow+sy,p.yaw+p.burst.yaw*recoilFollow+sx,sx*.45,'YXZ');
    const desired=state.zoom===2?11:state.zoom===1?30:baseFov*(state.aiming?.75:1);
    if(Math.abs(camera.fov-desired)>.05){
      camera.fov=active(p).id==='awm'?desired:T.MathUtils.damp(camera.fov,desired,18,dt);
      camera.updateProjectionMatrix();
    }
    camera.updateMatrixWorld();
  }
  function move(a,dx,dz){
    const b=world.bounds,steps=Math.max(1,Math.ceil(Math.hypot(dx,dz)/.14));
    for(let i=0;i<steps;i++){
      let x=clamp(a.x+dx/steps,b.minX+RADIUS,b.maxX-RADIUS),z=clamp(a.z+dz/steps,b.minZ+RADIUS,b.maxZ-RADIUS);
      const surface=treadHeight(x,z,treadGrid);
      const raised=(a!==p||grounded)&&surface<=a.y+STEP && surface>a.y;
      const y=raised?surface:a.y;
      // Project off each wall along its true contact normal to slide along oblique faces.
      for(let pass=0;pass<2;pass++)for(const s of solidGrid.at(x,z)){
        if(s.bottom>=y+(a.crouch?1.22:HEIGHT) || s.top<=y+.001 || !footprint(x,z,s))continue;
        const lx=(x-s.x)*s.c-(z-s.z)*s.n,lz=(x-s.x)*s.n+(z-s.z)*s.c;
        const vx=lx-clamp(lx,-s.w/2,s.w/2),vz=lz-clamp(lz,-s.d/2,s.d/2);
        const d=Math.hypot(vx,vz);
        if(d<1e-8){x=a.x;z=a.z;continue;}
        const push=(RADIUS-d+.00001)/d;
        x+=(vx*s.c+vz*s.n)*push;z+=(-vx*s.n+vz*s.c)*push;
      }
      a.x=clamp(x,b.minX+RADIUS,b.maxX-RADIUS);a.z=clamp(z,b.minZ+RADIUS,b.maxZ-RADIUS);
      const actual=treadHeight(a.x,a.z,treadGrid);
      if(raised && actual<=a.y+STEP)a.y=Math.max(a.y,actual);
    }
  }
  function vertical(dt){
    const old=p.y,wasGrounded=grounded;
    jumpVel-=18*dt;
    let next=old+jumpVel*dt, floor=0;
    for(const s of solidGrid.at(p.x,p.z)){
      if(!footprint(p.x,p.z,s))continue;
      if(s.top<=old+.085 && s.top>floor)floor=s.top;
      const height=p.crouch?1.22:HEIGHT;
      if(jumpVel>0 && s.bottom>=old+height-.001 && s.bottom<next+height){next=s.bottom-height;jumpVel=0;}
    }
    grounded=next<=floor;
    p.y=grounded?floor:next;
    if(grounded&&!wasGrounded&&jumpVel< -2.4)sfx('land',active(p).id);
    if(grounded)jumpVel=0;
  }
  function wallDistance(origin,direction,max){
    ray.set(origin,direction);
    let dist=max;
    for(const s of colliders){
      const x=origin.x-s.x,z=origin.z-s.z;
      localRay.origin.set(x*s.c-z*s.n,origin.y,x*s.n+z*s.c);
      localRay.direction.set(direction.x*s.c-direction.z*s.n,direction.y,direction.x*s.n+direction.z*s.c);
      if(localRay.intersectBox(s.box,tmp))dist=Math.min(dist,localRay.origin.distanceTo(tmp));
    }
    if(direction.y<-.0001)dist=Math.min(dist,-origin.y/direction.y);
    return dist;
  }
  function visible(a,b){
    eye.set(a.x,a.y+1.52,a.z);aim.set(b.x,b.y+1.33,b.z).sub(eye);
    const len=aim.length();
    return len>0 && wallDistance(eye,aim.multiplyScalar(1/len),len)>=len-.02;
  }
  function finish(){
    if(state.phase!=='playing')return;
    state.phase='ended';state.aiming=false;clearKeys();hud();emit('end',state);
  }
  function actorHit(shooter,origin,direction,limit,friends=false){
    ray.set(origin,direction);let best=null;
    for(const unit of units){
      if(unit===shooter||!unit.alive||(!friends&&unit.team===shooter.team))continue;
      const h=unit.crouch?.72:1;
      headSphere.center.set(unit.x,unit.y+1.63*h,unit.z);
      bodyBox.min.set(unit.x-.22,unit.y+.10,unit.z-.2);
      bodyBox.max.set(unit.x+.22,unit.y+1.49*h,unit.z+.2);
      for(const head of [true,false]){
        const point=head?ray.intersectSphere(headSphere,tmp):ray.intersectBox(bodyBox,tmp);
        if(!point)continue;
        const distance=point.distanceTo(origin);if(distance>=limit)continue;
        limit=distance;best={unit,distance,head,limb:!head&&point.y<unit.y+.78*h};
      }
    }
    return best;
  }
  function takeHit(a,amount,id,kill){
    sfx('hurt',id);shake=Math.min(.022,shake+amount*.00035);
    emit('hurt',{bearing:angleTo(p,a),damage:amount});
    if(kill){pendingStrike=null;state.killedBy=a===p?'自己的手雷':a.name;state.zoom=0;state.aiming=false;loadTimer=0;clearKeys();}
  }
  function damage(a,b,amount,id,head=false,wall=false){
    if(!b.alive||b.shield>0||state.phase!=='playing'||(a!==b&&a.team===b.team))return;
    const absorb=Math.min(b.armor,amount*(1-arsenal[id].armor));b.armor-=absorb;b.hp=Math.max(0,b.hp-amount+absorb);
    if(arsenal[id].interval)b.tag=.24;
    if(b!==a){
      b.lastAttacker=a;b.hurtAt=clock;
      if(!network&&b!==p){b.lastHeard={x:a.x,z:a.z,t:clock};b.alertYaw=angleTo(b,a);b.alertUntil=clock+1.8;b.think=Math.min(b.think,.12);}
      for(const mate of bots){
        if(mate!==b&&mate.alive&&mate.team===b.team&&!mate.enemy&&Math.hypot(mate.x-b.x,mate.z-b.z)<16){
          mate.lastHeard={x:a.x,z:a.z,t:clock};mate.alertYaw=angleTo(mate,a);mate.alertUntil=clock+1.4;
        }
      }
    }
    const kill=b.hp<=0;
    let first=false;
    if(kill){
      sfx('death',id,b);b.alive=false;b.deathT=0;b.walking=false;b.respawn=2.5;b.deaths++;b.lastAttacker=a;
      if(a!==b){
        first=network?network.round.firstBlood:firstBlood;
        if(network)network.round.firstBlood=false;
        firstBlood=false;state.score[a.team]++;a.kills++;a.headshots+=+head;a.streak++;a.multi=clock-a.lastKill<5?a.multi+1:1;a.lastKill=clock;}
    }
    if(b===p)takeHit(a,amount-absorb,id,kill);
    else if(network)b.takeHit(a,amount-absorb,id,kill);
    if(kill)emit('feed',{killer:a.name,victim:b.name,weapon:id,team:a.team,head,wall,first});
    if(a===p&&a!==b){
      if(knifeMode&&isMelee(id))hits++;
      sfx('hit',id,p,{head});emit('hit',{kill,head,wall,first,weapon:id,victim:b.name,multi:kill?a.multi:0});
    }
    if(!network&&state.score[a.team]>=state.target)finish();
  }
  function shot(a,direction,id){
    const def=arsenal[id];srcVec.set(a.x,a.y+eyeHeight(a),a.z);
    const hit=actorHit(a,srcVec,direction,100),limit=hit?.distance??100;
    let factor=1,wood=false;
    const intersections=[];
    for(const s of colliders){
      const dx=srcVec.x-s.x,dz=srcVec.z-s.z;
      localRay.origin.set(dx*s.c-dz*s.n,srcVec.y,dx*s.n+dz*s.c);
      localRay.direction.set(direction.x*s.c-direction.z*s.n,direction.y,direction.x*s.n+direction.z*s.c);
      const loc=localRay.intersectBox(s.box,tmp);if(!loc)continue;
      const distance=loc.distanceTo(localRay.origin);if(distance>=limit)continue;
      const nx=Math.abs(Math.abs(loc.x)-s.w/2)<.002?Math.sign(loc.x):0,nz=Math.abs(Math.abs(loc.z)-s.d/2)<.002?Math.sign(loc.z):0;
      intersections.push({s,distance,n:new T.Vector3(nx*s.c+nz*s.n,nx||nz?0:(direction.y<0?1:-1),nz*s.c-nx*s.n)});
    }
    if(direction.y<-.0001&&-srcVec.y/direction.y<limit)intersections.push({s:{},distance:-srcVec.y/direction.y,n:new T.Vector3(0,1,0)});
    intersections.sort((u,v)=>u.distance-v.distance);
    let end=limit;
    for(const ob of intersections){
      hitPos.copy(srcVec).addScaledVector(direction,ob.distance);world.fx.impact(hitPos,ob.n,ob.s.material);sfx(ob.s.material==='wood'?'timber':'clang',id,hitPos,{volume:.13});
      if(ob.s.material==='wood'&&def.power>=1&&!wood){wood=true;factor*=Math.min(.72,.30+.15*def.power);continue;}
      end=ob.distance;factor=0;break;
    }
    if(hit&&factor){
      hitPos.copy(srcVec).addScaledVector(direction,hit.distance);
      if(hit.head)world.fx.headshot?.(hitPos);else world.fx.wound?.(hitPos);
      damage(a,hit.unit,def.damage*(hit.head?def.head:hit.limb?.78:1)*factor*rangeScale(id,hit.distance),id,hit.head,wood);if(a===p)hits++;
    }
    startVec.copy(srcVec).addScaledVector(direction,.56);startVec.y-=.14;
    destVec.copy(srcVec).addScaledVector(direction,end);
    if(network)emit('tracer',{start:startVec.toArray(),end:destVec.toArray()});
    const slot=tracerPool[tracerCursor];tracerCursor=(tracerCursor+1)%tracerPool.length;
    slot.m.position.copy(startVec).lerp(destVec,.5);v.subVectors(destVec,startVec);
    slot.m.scale.y=Math.max(.01,v.length());slot.m.quaternion.setFromUnitVectors(axis,v.normalize());
    slot.m.visible=true;slot.left=.055;
    world.fx.muzzle(startVec,direction);world.fx.eject(startVec,direction);sfx('shot',id,a);a.shield=0;a.radarT=1.25;
    for(const b of bots)if(b.team!==a.team&&Math.hypot(b.x-a.x,b.z-a.z)<28)b.lastHeard={x:a.x,z:a.z,t:clock};
  }
  function toss(a,direction){
    const m=new T.Mesh(nadeGeo,nadeMat);m.position.set(a.x,a.y+eyeHeight(a)-.13,a.z);scene.add(m);
    grenades.push({a,m,velocity:direction.clone().multiplyScalar(12).add(new T.Vector3(0,3.5,0)),time:2.55});sfx('throw','he',a);a.shield=0;
  }
  function updateGrenades(dt){
    for(let i=grenades.length-1;i>=0;i--){
      const g=grenades[i],pos=g.m.position;g.time-=dt;g.velocity.y-=12*dt;
      const delta=g.velocity.clone().multiplyScalar(dt),length=delta.length(),toward=delta.clone().normalize();
      if(length&&wallDistance(pos,toward,length+.12)<length+.11){
        if(Math.abs(g.velocity.y)>1)sfx('bounce','he',pos);
        for(const k of ['x','y','z']){
          const c=g.velocity[k],v=new T.Vector3();v[k]=Math.sign(c);
          if(c&&wallDistance(pos,v,Math.abs(c)*dt+.13)<Math.abs(c)*dt+.12)g.velocity[k]*=-.42;
        }
        g.velocity.multiplyScalar(.84);
      }
      pos.addScaledVector(g.velocity,dt);pos.y=Math.max(.13,pos.y);g.m.rotation.x+=dt*g.velocity.length();
      if(g.time>0)continue;
      world.fx.explode(pos);sfx('explode','he',pos);
      const distP=Math.hypot(p.x-pos.x,p.z-pos.z);
      if(p.alive&&distP<16)shake=Math.min(.032,shake+(1-distP/16)*.026);
      for(const b of units){
        const diff=new T.Vector3(b.x,b.y+.85,b.z).sub(pos),r=diff.length();
        if(r<7.5){const cover=wallDistance(pos,diff.normalize(),r)<r-.05?.24:1;damage(g.a,b,(1-r/7.5)*143*cover,'he');}
      }
      scene.remove(g.m);grenades.splice(i,1);
    }
  }
  function useSlot(slot,reequip=false){
    if(!p.alive||!p.inventory[slot]||(!reequip&&p.slot===slot)||(!p.inventory[slot].ammo&&slot===3))return;
    // A tap buffered during the Karambit draw belongs to that weapon.
    if(active(p).id==='karambit'||p.inventory[slot].id==='karambit')fireTap=altTap=false;
    pendingStrike=null;
    if(p.slot!==slot)lastSlot=p.slot;
    p.slot=slot;restoreZoom=0;state.zoom=0;state.aiming=false;p.burst=newBurst();loadTimer=0;semiLatch=!!keys.fire;
    const w=active(p),def=arsenal[w.id];
    shotTimer=def.melee?(def.drawCd??.12):w.id==='awm'?.34:.26;
    view.equip(w.id);
    if(!timedMeleeContacts[w.id])sfx('equip',w.id);
    hud();
  }
  function reload(){
    const w=active(p),d=arsenal[w.id];if(!p.alive||loadTimer||!d.reload||w.ammo>=w.max||!w.reserve)return;
    restoreZoom=0;state.zoom=0;state.aiming=false;loadTimer=loadDuration=d.reload;view.reload(loadTimer);sfx('reload',w.id);hud();
  }
  function playerMelee(id,heavy){
    const def=arsenal[id],reach=heavy?def.heavyReach:def.reach;
    camera.getWorldDirection(dir);
    const wallDist=wallDistance(camera.position,dir,reach);
    const hit=actorHit(p,camera.position,dir,wallDist);
    if(hit){
      if(timedMeleeContacts[id]&&hit.unit.shield>0)return 'air';
      const rear=Math.cos(hit.unit.yaw-p.yaw)>.5;
      const baseDmg=heavy?def.heavyDmg:def.lightDmg;
      damage(p,hit.unit,baseDmg*(rear?1.8:1)*(hit.head?1.3:1),id,hit.head);
      return 'flesh';
    }
    if(wallDist<reach){
      world.fx.impact(camera.position.clone().addScaledVector(dir,wallDist),dir.clone().negate());
      sfx('clang',id,p,{volume:.26});
      return 'wall';
    }
    return 'air';
  }
  function advancePlayer(dt){
    const w=active(p),d=arsenal[w.id];
    recoverBurst(p.burst,d,clock,dt);p.crouch=!!keys.crouch;
    state.aiming=!loadTimer&&!d.melee&&(w.id==='awm'?!!state.zoom:p.slot<2&&!!keys.aim);
    const sideways=Number(!!keys.right)-Number(!!keys.left),forward=Number(!!keys.forward)-Number(!!keys.back),mag=Math.hypot(sideways,forward);
    const speed=(p.crouch?2.15:keys.walk?2.65:state.zoom?2.25:state.aiming?3:keys.sprint?6.8:5.0)*d.speed;
    const oldX=p.x,oldZ=p.z;
    const c=Math.cos(p.yaw),s=Math.sin(p.yaw),stride=speed*(1-.45*Math.min(1,p.tag/.15))/Math.max(1,mag);
    const peeking=grounded&&sideways!==0&&!p.crouch&&!state.aiming&&!keys.walk&&!keys.sprint;
    const lateral=peeking?sideways*1.08:sideways;
    const goalX=(c*lateral-s*forward)*stride,goalZ=(-s*lateral-c*forward)*stride;
    if(grounded){
      const dx=goalX-p.vx,dz=goalZ-p.vz,dv=Math.hypot(dx,dz);
      const acceleration=peeking?45:mag?42:52;
      const ratio=dv?Math.min(1,acceleration*dt/dv):0;
      p.vx+=dx*ratio;p.vz+=dz*ratio;
    }else if(mag){
      const wishSpeed=Math.hypot(goalX,goalZ);
      const wishX=goalX/wishSpeed,wishZ=goalZ/wishSpeed;
      const speedAlongWish=p.vx*wishX+p.vz*wishZ;
      const acceleration=clamp(wishSpeed*.55-speedAlongWish,0,wishSpeed*8*dt);
      // Let active air strafes keep momentum without adding much top speed.
      const maxSpeed=Math.max(Math.hypot(p.vx,p.vz),wishSpeed*1.06);
      p.vx+=wishX*acceleration;p.vz+=wishZ*acceleration;
      const horizontalSpeed=Math.hypot(p.vx,p.vz);
      if(horizontalSpeed>maxSpeed){p.vx*=maxSpeed/horizontalSpeed;p.vz*=maxSpeed/horizontalSpeed;}
    }else{
      p.vx=T.MathUtils.damp(p.vx,0,2.6,dt);
      p.vz=T.MathUtils.damp(p.vz,0,2.6,dt);
    }
    if(p.vx||p.vz)move(p,p.vx*dt,p.vz*dt);
    if(dt>0){p.vx=(p.x-oldX)/dt;p.vz=(p.z-oldZ)/dt;}
    p.quiet=!!keys.walk||p.crouch;const walked=Math.hypot(p.x-oldX,p.z-oldZ);p.walking=walked>dt*.1;
    if(p.walking&&!p.quiet&&grounded&&Math.floor(bob)!==Math.floor(bob+walked*2))for(const b of bots){
      if(b.team!==p.team&&Math.hypot(b.x-p.x,b.z-p.z)<8)b.lastHeard={x:p.x,z:p.z};
    }bob+=walked*2;vertical(dt);state.grounded=grounded;state.sprinting=!!keys.sprint&&p.walking&&!state.aiming;cameraAt(dt);
    if(pendingStrike&&clock+1e-8>=pendingStrike.at){
      const {id,heavy}=pendingStrike;
      pendingStrike=null;
      view.meleeContact(playerMelee(id,heavy));
      if(state.phase!=='playing')return;
    }
    if(loadTimer>0){loadTimer=Math.max(0,loadTimer-dt);if(!loadTimer){const add=Math.min(w.max-w.ammo,w.reserve);w.ammo+=add;w.reserve-=add;hud();}}
    const previous=shotTimer;shotTimer-=dt;if(w.id==='awm'&&previous>.88&&shotTimer<=.88)sfx('bolt','awm');
    if(w.id==='awm'&&restoreZoom&&shotTimer<=0){state.zoom=restoreZoom;restoreZoom=0;scopeTime=clock;sfx('scope','awm');}
    if(w.id==='he'&&!w.ammo&&shotTimer<=0){useSlot(lastSlot===3?0:lastSlot);return;}
    state.spread=firingCone(d,p.burst,{speed:Math.hypot(p.vx,p.vz),grounded,crouch:p.crouch,ads:state.aiming,scope:d.scopeSettle&&state.zoom?(clock-scopeTime)/d.scopeSettle:0});
    const trigger=keys.fire||fireTap,secondary=keys.aim||altTap;
    if(!trigger&&!(d.melee&&secondary))return;
    if(shotTimer>0||loadTimer){if(shotTimer>.3||loadTimer)fireTap=altTap=false;return;}
    fireTap=altTap=false;
    if(d.melee){
      if(knifeMode)attempts++;
      const heavy=!!secondary,action=heavy?'heavy':'light';
      shotTimer=heavy?d.heavyCd:d.lightCd;
      const contactTime=timedMeleeContacts[w.id]?.[action];
      if(contactTime){
        pendingStrike={id:w.id,heavy,at:clock+contactTime};
        view.shoot(action);
      }else{
        playerMelee(w.id,heavy);
        view.shoot(action);
        sfx(action,w.id);
      }
      p.shield=0;return;
    }
    if(semiLatch&&['awm','deagle','he'].includes(w.id))return;
    if(!w.ammo){if(!w.reserve){sfx('dry',w.id);shotTimer=.32;}else reload();return;}
    w.ammo--;semiLatch=true;view.shoot();camera.getWorldDirection(dir);
    if(w.id==='he'){toss(p,dir);shotTimer=.65;hud();return;}
    const deviation=spreadOffset(state.spread);
    rot.set(pitch+p.burst.pitch+deviation.y,p.yaw+p.burst.yaw+deviation.x,0,'YXZ');
    dir.set(0,0,-1).applyEuler(rot);attempts++;shot(p,dir,w.id);
    const adsRate=state.aiming&&['ak47','m4a1','mp5'].includes(w.id)?.90:1;
    shotTimer=d.interval/adsRate+(previous>0?Math.max(-dt,shotTimer):0);
    recordShot(p.burst,d,clock,state.aiming,p.crouch);
    if(w.id==='awm'){shake=Math.max(shake,.024);if(state.zoom){restoreZoom=state.zoom;state.zoom=0;state.aiming=false;}}
    hud();
  }
  function botWeaponRange(id){
    if(id==='awm')return {min:15,max:38};
    if(id==='mp5')return {min:4.5,max:13.5};
    if(id==='deagle')return {min:5,max:16};
    return {min:9.5,max:23};
  }
  function friendlyInLine(b,tx,tz,range){
    const dx=tx-b.x,dz=tz-b.z,len=Math.hypot(dx,dz);
    if(len<.5)return false;
    const ux=dx/len,uz=dz/len;
    for(const u of units){
      if(u===b||!u.alive||u.team!==b.team)continue;
      const rx=u.x-b.x,rz=u.z-b.z,proj=rx*ux+rz*uz;
      if(proj>.35&&proj<Math.min(range,len)-.4){
        const perp=Math.abs(rx*uz-rz*ux);
        if(perp<.72)return true;
      }
    }
    return false;
  }
  function startBotReload(b){
    const w=active(b),def=arsenal[w.id];
    if(!def.reload||w.ammo>=w.max||b.reloadUntil>clock)return false;
    b.reloadUntil=clock+def.reload;b.shot=Math.max(b.shot,def.reload);
    b.reloadingSlot=b.slot;sfx('reload',w.id,b);return true;
  }
  function pickBotDest(b,enemies){
    const dirZ=b.team===0?-1:1;
    if(knifeMode){
      if(b.lastSeen&&clock-b.lastSeen.t<4.2)return {x:b.lastSeen.x,z:b.lastSeen.z};
      if(enemies.length){
        let target=enemies[0],bestD=Infinity;
        for(const e of enemies){
          const d=Math.hypot(e.x-b.x,e.z-b.z)+(e.shield>0?18:0);
          if(d<bestD){bestD=d;target=e;}
        }
        return {x:clamp(target.x+b.lane*1.1,-10.2,10.2),z:clamp(target.z,-21,21)};
      }
      return {x:b.lane*4.2,z:0};
    }
    if(b.lastSeen&&clock-b.lastSeen.t<3.8){
      if(b.role==='sniper'){
        const cov=navigator.findCover(b.x,b.z,b.lastSeen.x,b.lastSeen.y||0,b.lastSeen.z,wallDistance,7);
        if(cov)return cov;
      }
      return {x:b.lastSeen.x,z:b.lastSeen.z};
    }
    if(b.lastHeard&&clock-(b.lastHeard.t||0)<4.8)return b.lastHeard;
    if(b.role==='wingman'&&p.alive&&Math.abs(p.z)<20.5){
      const side=p.x>0?-4.2:4.2;
      const tx=clamp(p.x+side,-10.2,10.2),tz=clamp(p.z+dirZ*3.5,-20,20);
      if(Math.hypot(b.x-tx,b.z-tz)>3.2)return {x:tx,z:tz};
    }
    if(b.role==='sniper'){
      const spots=b.team===0?[{x:0,z:18.7},{x:-7.8,z:13.5},{x:7.8,z:12.5}]:[{x:0,z:-18.7},{x:7.8,z:-13.5},{x:-7.8,z:-12.5}];
      if(!b.holdPos||clock>b.holdUntil){
        b.holdPos=spots[Math.floor(Math.random()*spots.length)];
        b.holdUntil=clock+8+Math.random()*7;
      }
      return b.holdPos;
    }
    if(b.role==='flanker'&&world.vents?.length){
      const vent=world.vents[b.team===0?1:0];
      const ownSide=b.team===0?b.z>8:b.z<-8;
      if(ownSide&&Math.hypot(b.x-vent.entry.x,b.z-vent.entry.z)<14&&!b.ventUsed){
        if(Math.hypot(b.x-vent.entry.x,b.z-vent.entry.z)<2.2){b.ventUsed=true;return vent.exit;}
        return vent.entry;
      }
      if(b.ventUsed&&Math.hypot(b.x-vent.exit.x,b.z-vent.exit.z)>3.2&&(b.team===0?b.z>-5:b.z<5))return vent.exit;
    }
    const laneX=b.lane*7.0;
    const laneEnemy=enemies.find(e=>Math.abs(e.x-laneX)<7.5);
    if(laneEnemy&&Math.random()<.65)return {x:laneEnemy.x,z:laneEnemy.z};
    if(!b.holdPos||clock>b.holdUntil||Math.hypot(b.x-b.holdPos.x,b.z-b.holdPos.z)<2.2){
      const advanceZ=clamp(b.z+dirZ*(9+Math.random()*8),-19,19);
      b.holdPos={x:clamp(laneX+(Math.random()-.5)*4.5,-10.2,10.2),z:advanceZ};
      b.holdUntil=clock+5+Math.random()*4;
    }
    return b.holdPos;
  }
  function resolveBotStrike(b){
    if(!b.strike||clock<b.strike.at)return;
    const {foe,heavy}=b.strike;
    b.strike=null;
    b.swingT=.28;
    b.shield=0;
    b.radarT=.9;
    const {id}=active(b),def=arsenal[id];
    sfx(heavy?'heavy':'light',id,b);
    const reach=heavy?def.heavyReach:def.reach;
    const distance=Math.hypot(foe.x-b.x,foe.z-b.z);
    const facing=Math.abs(wrapAngle(b.yaw-angleTo(b,foe)));
    if(!foe.alive||foe.shield>0||distance>reach||Math.abs(b.y-foe.y)>.75||facing>.55||!visible(b,foe))return;
    const rear=Math.cos(foe.yaw-b.yaw)>.5;
    const head=Math.random()<skill.head*.8;
    const damageAmount=heavy?def.heavyDmg:def.lightDmg;
    damage(b,foe,damageAmount*(rear?1.8:1)*(head?1.3:1),id,head);
  }
  function advanceBot(b,dt){
    const wNow=active(b);
    recoverBurst(b.burst,arsenal[wNow.id],clock,dt);
    const support=treadHeight(b.x,b.z,treadGrid);
    if(b.y>support){b.fall=(b.fall||0)+18*dt;b.y=Math.max(support,b.y-b.fall*dt);}else b.fall=0;
    if(b.reloadUntil>0&&clock>=b.reloadUntil){
      const rw=b.inventory[b.reloadingSlot??b.slot];
      if(rw){rw.ammo=rw.max;}
      b.reloadUntil=0;b.crouch=false;
    }
    const enemies=units.filter(a=>a.alive && a.team!==b.team);
    if(b.walking){b.stepIn=(b.stepIn??0)-dt;if(b.stepIn<=0){sfx('step','',b);b.stepIn=.43;}}
    b.think-=dt;b.shot-=dt;b.swingT=Math.max(0,(b.swingT||0)-dt);b.walking=false;
    if(knifeMode){
      resolveBotStrike(b);
      if(state.phase!=='playing')return;
    }
    const turnSpeed=5.8+(1-skill.response)*7.5;
    // Soft separation so teammates do not clump or body-block the player.
    let sepX=0,sepZ=0;
    for(const u of units){
      if(u===b||!u.alive)continue;
      const dx=b.x-u.x,dz=b.z-u.z,d=Math.hypot(dx,dz);
      const minD=knifeMode&&u.team!==b.team?.86:(u===p?1.35:1.05);
      if(d>1e-4&&d<minD){const push=(minD-d)/minD;sepX+=dx/d*push;sepZ+=dz/d*push;}
    }
    if(sepX||sepZ){const mag=Math.hypot(sepX,sepZ);move(b,sepX/mag*Math.min(1,mag)*1.4*dt,sepZ/mag*Math.min(1,mag)*1.4*dt);}
    if(b.think<=0){
      b.think=skill.response*.75+Math.random()*.18;
      let bestFoe=null,bestScore=-Infinity;
      for(const e of enemies){
        const dx=e.x-b.x,dz=e.z-b.z,r=Math.hypot(dx,dz);
        if(r>skill.sight)continue;
        const front=(-Math.sin(b.yaw)*dx-Math.cos(b.yaw)*dz)/Math.max(.01,r);
        const aware=front>Math.cos(skill.fov)||r<8||e.radarT>0||(e===b.lastAttacker&&clock-b.hurtAt<3.5);
        if(!aware||!visible(b,e))continue;
        let sc=52-r;
        if(e.shield>0)sc-=65;
        if(e.hp<42)sc+=14;
        if(e===b.enemy)sc+=10;
        if(e===b.lastAttacker&&clock-b.hurtAt<3.5)sc+=22;
        if(b.role==='wingman'&&p.alive&&Math.hypot(e.x-p.x,e.z-p.z)<15)sc+=16;
        if(sc>bestScore){bestScore=sc;bestFoe=e;}
      }
      b.enemy=bestFoe;
      if(bestFoe){
        b.lastSeen={x:bestFoe.x,y:bestFoe.y,z:bestFoe.z,t:clock};
        // Share target intel with nearby teammates.
        for(const mate of bots){
          if(mate!==b&&mate.alive&&mate.team===b.team&&!mate.enemy&&Math.hypot(mate.x-b.x,mate.z-b.z)<14){
            mate.lastHeard={x:bestFoe.x,z:bestFoe.z,t:clock};
          }
        }
        // Seek cover if low HP or reloading under fire.
        if(!knifeMode&&(b.hp<38||b.reloadUntil>clock)&&clock>b.coverUntil){
          const cov=navigator.findCover(b.x,b.z,bestFoe.x,bestFoe.y,bestFoe.z,wallDistance,8.5);
          if(cov){b.path=navigator.route(b.x,b.z,cov.x,cov.z);b.coverUntil=clock+2.4;}
        }
      }else{
        // Out of combat: switch back to primary and do proactive tactical reload.
        if(!knifeMode){
          if(b.slot===1&&b.reloadUntil<=clock){b.slot=0;b.burst=newBurst();}
          const prim=b.inventory[0];
          if(b.slot===0&&prim.ammo<Math.ceil(prim.max*.42)&&(!b.lastSeen||clock-b.lastSeen.t>2.2)){
            startBotReload(b);
          }
        }
        if(clock>b.coverUntil){
          const dest=pickBotDest(b,enemies);
          if(dest)b.path=navigator.route(b.x,b.z,dest.x,dest.z);
          if(b.lastHeard&&clock-(b.lastHeard.t||0)>4.8)b.lastHeard=null;
        }
      }
    }
    const reloading=b.reloadUntil>clock;
    const hasSight=b.enemy?.alive&&visible(b,b.enemy);
    if(hasSight){
      const foe=b.enemy;
      b.lastSeen={x:foe.x,y:foe.y,z:foe.z,t:clock};
      const range=Math.hypot(b.x-foe.x,b.z-foe.z);
      const aimYaw=angleTo(b,foe);
      b.yaw=turnToward(b.yaw,aimYaw,turnSpeed*(knifeMode?1.35:1)*dt);
      const aligned=Math.abs(wrapAngle(b.yaw-aimYaw))<(knifeMode?.48:.34);
      const w=active(b),def=arsenal[w.id];
      if(knifeMode){
        b.crouch=false;
        if(clock>=b.strafeAt){b.strafeDir*=-1;b.strafeAt=clock+.42+Math.random()*.7;}
        const speed=3.65*def.speed*(b.strike?.35:b.tag>0?.65:1);
        const fwdX=-Math.sin(b.yaw),fwdZ=-Math.cos(b.yaw);
        const sideX=Math.cos(b.yaw)*b.strafeDir,sideZ=-Math.sin(b.yaw)*b.strafeDir;
        const baitBack=!b.strike&&b.shot>.16&&range<def.reach*1.2;
        const lungeIn=range>(def.heavyReach*.78)&&!baitBack;
        const strafeW=(.45+skill.strafe*.85)*(range<4.5?1.15:.65);
        let mx=sideX*speed*strafeW*.65,mz=sideZ*speed*strafeW*.65;
        if(lungeIn){mx+=fwdX*speed;mz+=fwdZ*speed;}
        else if(baitBack){mx-=fwdX*speed*.62;mz-=fwdZ*speed*.62;}
        const mLen=Math.hypot(mx,mz);
        if(mLen>speed){mx=mx/mLen*speed;mz=mz/mLen*speed;}
        const oldX=b.x,oldZ=b.z;
        move(b,mx*dt,mz*dt);
        const moved=Math.hypot(b.x-oldX,b.z-oldZ);
        b.walking=moved>dt*.2;
        if(moved<dt*.12){b.strafeDir*=-1;b.strafeAt=clock+.35;}
        if(aligned&&!b.strike&&b.shot<=0&&foe.shield<=0&&Math.abs(b.y-foe.y)<=.75){
          const wantHeavy=range<=def.heavyReach&&(foe.hp>def.lightDmg&&Math.random()<(.42+skill.head*.65));
          const atkReach=wantHeavy?def.heavyReach:def.reach;
          if(range<=atkReach){
            const windup=wantHeavy?.22+skill.response*.22:.11+skill.response*.17;
            b.strike={foe,heavy:wantHeavy,windup,at:clock+windup};
            b.shot=windup+(wantHeavy?def.heavyCd:def.lightCd)+skill.response*(.28+Math.random()*.42);
          }
        }
        return;
      }
      // The sniper reacquires its scope after a bolt cycle or after losing sight.
      const settling=def.scopeSettle&&w.ammo>0&&!reloading&&aligned&&b.shot<=0;
      if(settling){
        if(b.scopeTarget!==foe){b.scopeTarget=foe;b.scopeSince=clock;}
      }else b.scopeTarget=null;
      const scopeReady=!settling||clock-b.scopeSince+1e-8>=def.scopeSettle;
      const pref=botWeaponRange(w.id);
      b.crouch=reloading||(w.id==='awm'&&range>13)||(range>16&&b.burst.count>=2&&skill.strafe<.65);
      // If retreating to cover while low HP or reloading, follow cover path while still facing threat.
      if((b.hp<38||reloading)&&b.path.length&&clock<b.coverUntil){
        const q=b.path[0],dx=q.x-b.x,dz=q.z-b.z,dist=Math.hypot(dx,dz);
        if(dist<.18)b.path.shift();
        else{const spd=dt*(b.tag>0?.55:1)*3.1;move(b,dx/dist*Math.min(spd,dist),dz/dist*Math.min(spd,dist));b.walking=true;}
      }else{
        // Natural non-sinusoidal strafing + weapon-aware range control.
        if(clock>=b.strafeAt){b.strafeDir*=-1;b.strafeAt=clock+.55+Math.random()*.95;}
        const strafeSpd=skill.strafe*1.75*(b.crouch?.45:1)*(b.tag>0?.55:1);
        let mx=Math.cos(b.yaw)*b.strafeDir*strafeSpd,mz=-Math.sin(b.yaw)*b.strafeDir*strafeSpd;
        const fwdX=-Math.sin(b.yaw),fwdZ=-Math.cos(b.yaw);
        if(range<pref.min){mx-=fwdX*1.6;mz-=fwdZ*1.6;}
        else if(range>pref.max&&w.id!=='awm'){mx+=fwdX*1.85;mz+=fwdZ*1.85;}
        if(friendlyInLine(b,foe.x,foe.z,range)){mx+=Math.cos(b.yaw)*b.strafeDir*2.2;mz+=-Math.sin(b.yaw)*b.strafeDir*2.2;}
        const oldX=b.x,oldZ=b.z;
        move(b,mx*dt,mz*dt);
        const moved=Math.hypot(b.x-oldX,b.z-oldZ);
        b.walking=moved>dt*.25;
        if(moved<dt*.15&&strafeSpd>.2){b.strafeDir*=-1;b.strafeAt=clock+.5;}
      }
      if(!reloading&&aligned&&scopeReady&&b.shot<=0&&foe.shield<=0&&!friendlyInLine(b,foe.x,foe.z,range)){
        if(w.ammo>0){
          const miss=skill.miss*(b.crouch?.78:1)+range*.0055;
          dir.set(foe.x-b.x+(Math.random()-.5)*miss*2,foe.y+(Math.random()<skill.head?1.63:1.18)-b.y-eyeHeight(b)+(Math.random()-.5)*miss*1.75,foe.z-b.z+(Math.random()-.5)*miss*2).normalize();
          const spread=firingCone(def,b.burst,{speed:b.walking?skill.strafe*1.6:0,grounded:!b.fall,crouch:b.crouch,scoped:!!def.scopeSettle,ads:w.id!=='mp5'});
          const offset=spreadOffset(spread);
          rot.set(Math.asin(clamp(dir.y,-1,1))+b.burst.pitch+offset.y,Math.atan2(-dir.x,-dir.z)+b.burst.yaw+offset.x,0,'YXZ');
          dir.set(0,0,-1).applyEuler(rot);w.ammo--;shot(b,dir,w.id);recordShot(b.burst,def,clock,w.id!=='mp5',b.crouch);
          b.burstLeft=(b.burstLeft||3)-1;
          const autoGun=['ak47','m4a1','mp5'].includes(w.id);
          if(autoGun&&b.burstLeft<=0){
            b.burstLeft=3+Math.floor(Math.random()*3);
            b.shot=def.interval+.16+skill.response*.38;
          }else{
            b.shot=def.interval+skill.response*(autoGun?.14:.26)*(0.5+Math.random()*.7);
          }
        }else if(b.slot===0&&range<13.5&&b.inventory[1].ammo>0){
          // Quick switch to Desert Eagle in close-quarters when primary runs dry!
          b.slot=1;b.burst=newBurst();b.shot=.32;sfx('equip','deagle',b);
        }else{
          startBotReload(b);
          const cov=navigator.findCover(b.x,b.z,foe.x,foe.y,foe.z,wallDistance,8);
          if(cov){b.path=navigator.route(b.x,b.z,cov.x,cov.z);b.coverUntil=clock+def.reload;}
        }
      }
      return;
    }
    b.scopeTarget=null;
    // Tactical grenade toward enemy last-known cover when they break line of sight.
    if(!knifeMode&&!reloading&&b.lastSeen&&clock-b.lastSeen.t>.35&&clock-b.lastSeen.t<2.4&&b.nadeReady<clock&&b.inventory[3]?.ammo){
      const range=Math.hypot(b.x-b.lastSeen.x,b.z-b.lastSeen.z);
      const mateNear=units.some(u=>u.alive&&u.team===b.team&&Math.hypot(u.x-b.lastSeen.x,u.z-b.lastSeen.z)<5.5);
      if(range>6.5&&range<16.5&&!mateNear){
        b.inventory[3].ammo=0;b.nadeReady=Infinity;b.shot=Math.max(b.shot,.55);
        toss(b,new T.Vector3(b.lastSeen.x-b.x,2.9,b.lastSeen.z-b.z).normalize());
      }
    }
    b.crouch=reloading||(b.role==='sniper'&&b.holdPos&&Math.hypot(b.x-b.holdPos.x,b.z-b.holdPos.z)<1.6);
    if(!b.path.length){
      // Hold angle / scan toward last seen or alert direction instead of staring at a wall.
      if(b.lastSeen&&clock-b.lastSeen.t<3.8)b.yaw=turnToward(b.yaw,angleTo(b,b.lastSeen),turnSpeed*.75*dt);
      else if(b.alertYaw!==null&&clock<b.alertUntil)b.yaw=turnToward(b.yaw,b.alertYaw,turnSpeed*.85*dt);
      else if(b.role==='sniper')b.yaw=turnToward(b.yaw,b.team===0?0:Math.PI,3.5*dt);
      return;
    }
    // Stuck recovery check.
    if(clock>=b.stuckAt){
      if(Math.hypot(b.x-b.stuckPos.x,b.z-b.stuckPos.z)<.28){
        b.lane=((b.lane+2)%3)-1;b.holdPos=null;b.path=[];b.think=0;
      }
      b.stuckPos={x:b.x,z:b.z};b.stuckAt=clock+.65;
    }
    let remaining=dt*(b.tag>0?.55:1)*(knifeMode?(3.75+(b.id%3)*.18)*arsenal[wNow.id].speed:(b.crouch?2.0:b.role==='flanker'?3.35:2.95+(b.id%3)*.16));
    while(remaining>0 && b.path.length){
      const q=b.path[0], dx=q.x-b.x,dz=q.z-b.z,dist=Math.hypot(dx,dz);
      if(dist<.12){b.path.shift();continue;}
      const step=Math.min(remaining,dist);
      const lookTarget=(b.lastSeen&&clock-b.lastSeen.t<2.8)?angleTo(b,b.lastSeen):(b.alertYaw!==null&&clock<b.alertUntil)?b.alertYaw:angleTo(b,q);
      b.yaw=turnToward(b.yaw,lookTarget,turnSpeed*.75*dt);
      move(b,dx/dist*step,dz/dist*step);
      b.walking=true;remaining-=step;
      if(dist<=step+.02)b.path.shift();
    }
  }
  function clearKeys(){fireTap=altTap=false;for(const k in keys)keys[k]=false;}
  function clearScene(){
    pendingStrike=null;
    animate?.dispose();animate=null;bots.length=0;if(!network)units.length=1;
    for(const g of grenades)scene.remove(g.m);grenades.length=0;
    for(const t of tracerPool){t.m.visible=false;t.left=0;}
    for(const e of effects)scene.remove(e.m);effects.length=0;world.fx.reset();
  }
  // 1v1 spawns a single bot, so pinning its loadout turns the duel into a focused practice rep.
  // TDM keeps the rotating mix because respawn() derives sniper/flanker/rifle roles from primary.
  function duelBotPrimary(pref){
    if(pref==='mirror')return primary;
    if(primaries.includes(pref))return pref;
    return primaries[Math.floor(Math.random()*primaries.length)];
  }
  function start(opts={}){
    clearKeys();clearScene();
    p.team=opts.team===1?1:0;state.team=p.team;primary=primaries.includes(opts.primary)?opts.primary:'ak47';
    melee=melees.includes(opts.melee)?opts.melee:'nepal';
    state.mode=Object.hasOwn(matchRules,opts.mode)?opts.mode:'tdm';
    knifeMode=state.mode==='knife';
    const rules=matchRules[state.mode];
    const size=state.mode==='tdm'&&[3,4,6,8].includes(opts.size)?opts.size:rules.size;
    skill=skills[opts.diff]||skills.normal;
    state.target=rules.goals.includes(opts.goal)?opts.goal:rules.goal;
    const names=['北辰','回声','夜航','长风','白鲸','赤隼','远山','银翼','苍鹭','天狼','灰狐','海燕','青锋','岩雀','信标'];
    const duelBot=size===1?duelBotPrimary(opts.botPrimary):null;
    for(let i=1;!network&&i<size*2;i++){
      const b={id:i,name:names[i-1],team:i<size?p.team:1-p.team,primary:duelBot||primaries[(i+1)%4],melee:melees[(i+1)%melees.length]};
      bots.push(b);units.push(b);
    }
    animate=network?null:createSquad(scene,bots,knifeMode);state.phase='playing';state.score=network?.round.score??[0,0];state.remaining=matchDuration(state.mode,size);firstBlood=true;
    attempts=hits=clock=0;for(const a of network?[p]:units){a.kills=a.headshots=a.deaths=0;a.lastAttacker=null;respawn(a,true);}
    view.setTeam(p.team);state.grounded=true;state.sprinting=false;animate?.(0,true);hud();
  }
  function pause(){if(state.phase==='playing'){state.phase='paused';clearKeys();state.aiming=false;hud();}}
  function resume(){if(state.phase==='paused'){state.phase='playing';hud();}}
  function input(action,value){
    if(action==='sound'){sound=!!value;return;}
    if(action==='fov'){baseFov=clamp(Number(value)||78,65,100);return;}
    if(action==='primary'&&primaries.includes(value)){
      primary=value;
      if(!knifeMode&&p.alive&&Math.abs(p.z)>20&&(p.team===0?p.z>0:p.z<0)){
        pendingStrike=null;
        p.inventory[0]=loadout(primary,melee,false)[0];p.burst=newBurst();p.slot=0;state.zoom=0;loadTimer=0;shotTimer=.25;view.equip(primary);hud();return 'now';
      }return 'respawn';
    }
    if(action==='melee'&&melees.includes(value)){
      melee=value;
      if(p.alive&&Math.abs(p.z)>20&&(p.team===0?p.z>0:p.z<0)){
        const mSlot=knifeMode?0:2;
        p.inventory[mSlot]=loadout(primary,melee,knifeMode)[mSlot];
        useSlot(mSlot,true);
        return 'now';
      }return 'respawn';
    }
    if(action==='botPrimary'){
      if(network||state.mode!=='duel'||(state.phase!=='playing'&&state.phase!=='paused'))return null;
      const id=duelBotPrimary(value);
      let pending=false;
      // A living bot finishes the duel with the gun in its hands; the swap lands on its next respawn.
      for(const b of bots){b.primary=id;if(b.alive&&active(b).id!==id)pending=true;}
      return {id,pending};
    }
    if(state.phase!=='playing')return;
    if(action==='slot'){useSlot(value);return;}
    if(action==='last'){useSlot(lastSlot);return;}
    if(action==='wheelQuick'){
      if(!p.alive)return;
      if(knifeMode){
        if(value<0){
          view.flourish?.();
          if(!timedMeleeContacts[active(p).id])sfx('equip',active(p).id);
        }else if(value>0){
          view.inspect?.();
        }
        return;
      }
      if(value<0){
        if(p.slot!==2)useSlot(2);
        else{
          view.flourish?.();
          if(!timedMeleeContacts[active(p).id])sfx('equip',active(p).id);
        }
      }else if(value>0){
        useSlot(0);
      }
      return;
    }
    if(action==='cycle'){if(p.inventory.length<=1)return;for(let i=1;i<=p.inventory.length;i++){const n=(p.slot+Math.sign(value)*i+p.inventory.length*2)%p.inventory.length;if(n!==3||p.inventory[3]?.ammo){useSlot(n);break;}}return;}
    const down=!!value;
    if(action==='jump'&&down&&!keys.jump&&grounded&&p.alive){sfx('jump',active(p).id);jumpVel=keys.crouch?8.4:7.1;grounded=false;}
    if(action==='fire'&&down&&!keys.fire){fireTap=true;semiLatch=false;}
    if(action==='aim'&&down&&!keys.aim)altTap=true;
    if(action==='fire'&&!down)semiLatch=false;
    if(action==='aim'&&down&&!keys.aim&&p.alive&&active(p).id==='awm'&&!loadTimer){if(restoreZoom){restoreZoom=0;}else{state.zoom=(state.zoom+1)%3;scopeTime=clock;sfx('scope','awm');}}
    if(action==='reload'&&down){if(p.alive&&timedMeleeContacts[active(p).id])view.fidget?.();else reload();}keys[action]=down;
  }
  function look(dx,dy){
    if(state.phase!=='playing'||!p.alive)return;
    if(!Number.isFinite(dx)||!Number.isFinite(dy))return;
    let sens=.00205;
    if(state.zoom){
      const ratio=Math.tan(camera.fov*Math.PI/360)/Math.tan(baseFov*Math.PI/360);
      sens*=clamp(ratio*1.05,.14,.75);
    }else if(state.aiming)sens=.00136;
    p.yaw=wrapAngle(p.yaw-dx*sens);pitch=clamp(pitch-dy*sens,-1.38,1.38);
    lookSwayX=clamp(lookSwayX+dx*.00028,-.035,.035);
    lookSwayY=clamp(lookSwayY+dy*.00022,-.028,.028);
  }
  function update(dt){
    if(state.phase!=='playing')return;
    dt=clamp(dt,0,.08);clock+=dt;state.remaining=Math.max(0,state.remaining-dt);
    for(const a of network?[p]:units){
      a.shield=Math.max(0,a.shield-dt);a.radarT=Math.max(0,a.radarT-dt);a.tag=Math.max(0,a.tag-dt);
      if(!a.alive){a.deathT=(a.deathT??0)+dt;a.respawn-=dt;if(a.respawn<=0)respawn(a);}
    }
    if(p.alive)advancePlayer(dt);else{
      deadCam.set(p.x,p.y+2.7,p.z+.3);
      camera.position.lerp(deadCam,Math.min(1,dt*3));
      if(p.lastAttacker&&p.lastAttacker!==p)camera.lookAt(p.lastAttacker.x,p.lastAttacker.y+1.25,p.lastAttacker.z);
    }
    updateGrenades(dt);
    for(const b of bots){if(state.phase==='playing'&&b.alive)advanceBot(b,dt);}
    animate?.(clock,true);
    const swayDecay=Math.exp(-dt*12);
    view.update(dt,{alive:p.alive,moving:p.alive&&p.walking,sprinting:state.sprinting,crouching:p.crouch,grounded,vy:jumpVel,aiming:state.aiming,reloading:loadTimer>0,swayX:lookSwayX,swayY:lookSwayY,strafe:Number(!!keys.right)-Number(!!keys.left)});
    lookSwayX*=swayDecay;lookSwayY*=swayDecay;
    for(const t of tracerPool){if(t.left>0){t.left-=dt;if(t.left<=0)t.m.visible=false;}}
    for(let i=effects.length-1;i>=0;i--){const e=effects[i];e.left-=dt;if(e.left<=0){scene.remove(e.m);effects.splice(i,1);}}
    hudTimer-=dt;if(hudTimer<=0){hudTimer=.1;hud();}
    if(!network&&state.remaining===0)finish();
  }
  function warmup(){
    const warmScene=new T.Scene();
    const dummy={id:99,team:0,x:0,y:0,z:0,yaw:0,alive:true,deathT:0,walking:false,crouch:false};
    const warmAnim=createSquad(warmScene,[dummy]);warmAnim(0,true);
    warmScene.add(new T.Mesh(nadeGeo,nadeMat),new T.Mesh(tracerGeo,tracerMaterial));
    return {scene:warmScene,dispose(){
      warmAnim.dispose();
      warmScene.clear();
    }};
  }
  return {state,start,pause,resume,input,look,update,warmup,finish,clearKeys,clearScene,hud,
    grenadePositions:()=>grenades.map(g=>g.m.position.toArray())};
}
