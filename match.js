import {newBurst,recoverBurst,firingCone,recordShot,spreadOffset} from './gunplay.js';
import * as T from './three.module.js';
import {arsenal,primaries,loadout,skills} from './arsenal.js?v=4';

const clamp = T.MathUtils.clamp;
const EYE=1.60,RADIUS=.32,ROUND=600,GOAL=50;
const sq = n => n*n;
const angleTo = (a,b) => Math.atan2(a.x-b.x,a.z-b.z);

function createSquad(scene,bots){
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
    for(const side of [-1,1]){
      part('ell',root,cloth,side*.237,1.326,-.06,.183,.285,.20,-.56);
      part('box',root,band,side*.285,1.335,-.06,.065,.076,.15);
      part('ell',root,cloth,side*.192,1.233,-.201,.15,.274,.16,-1.07);
      part('ell',root,dark,side*.124,1.218,-.305,.115,.126,.136);
    }
    part('box',root,'#1f272a',.095,1.264,-.34,.080,.093,.39);
    part('box',root,'#313537',.095,1.261,-.567,.043,.047,.20);
    part('box',root,dark,.095,1.172,-.321,.056,.139,.082,-.2);
    part('box',root,dark,.095,1.327,-.323,.054,.052,.097);
    bot.rig={root,legs};
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
      const {root,legs}=b.rig;
      root.position.set(b.x,b.y + (b.walking?.018*Math.abs(Math.sin(t*10+b.id)):0),b.z);
      root.rotation.y=b.yaw;root.scale.y=b.crouch?.75:1;
      legs.forEach((leg,i)=>{leg.rotation.x=b.walking?Math.sin(t*10+b.id+i*Math.PI)*.51:0;});
      root.updateMatrixWorld(true);
    }
    for(const {mesh,parts} of Object.values(batches)){
      mesh.count=visible?parts.length:0;
      if(visible)parts.forEach((p,i)=>mesh.setMatrixAt(i,p.bot.alive?p.o.matrixWorld:hidden));
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
function treadHeight(x,z,treads){
  let height=0;
  for(const s of treads)if(s.top>height && footprint(x,z,s))height=s.top;
  return height;
}

function makeNavigator(world,colliders,treads){
  const {minX,maxX,minZ,maxZ}=world.bounds, step=.9;
  const cols=Math.floor((maxX-minX)/step), rows=Math.floor((maxZ-minZ)/step), n=cols*rows;
  const walk=new Uint8Array(n), xOf=id=>minX+(id%cols+.5)*step, zOf=id=>minZ+(Math.floor(id/cols)+.5)*step;
  function clear(x,z,height){
    return x>=minX+RADIUS && x<=maxX-RADIUS && z>=minZ+RADIUS && z<=maxZ-RADIUS && !colliders.some(s=>s.bottom<height+HEIGHT && s.top>height+.001 && footprint(x,z,s,RADIUS));
  }
  const heights=new Float32Array(n), links=Array.from({length:n},()=>[]);
  for(let i=0;i<n;i++){
    heights[i]=treadHeight(xOf(i),zOf(i),treads);
    walk[i]=Number(clear(xOf(i),zOf(i),heights[i]));
  }
  // Validate the intervening segment, including individual stair risers.
  // A ledge has a downward edge but no edge in the opposite direction.
  for(let at=0;at<n;at++)if(walk[at]){
    for(const next of [at+cols,at-cols,at-1,at+1]){
      if(!walk[next] || Math.abs(next%cols-at%cols)>1)continue;
      let previous=heights[at],ok=true;
      for(let k=1;k<=6;k++){
        const x=T.MathUtils.lerp(xOf(at),xOf(next),k/6),z=T.MathUtils.lerp(zOf(at),zOf(next),k/6);
        const h=treadHeight(x,z,treads);
        if(h>previous+STEP || !clear(x,z,h)){ok=false;break;}
        previous=h;
      }
      if(ok)links[at].push(next);
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
    const path=[];
    for(let at=closest;at!==a;at=prev[at])path.push({x:xOf(at),z:zOf(at)});
    return path.reverse();
  }
  return {route};
}

export function createMatch({scene,camera,world,view,emit=()=>{}}){
  const colliders=world.solids.map(collider),treads=colliders.filter(s=>s.walkSurface);
  const navigator=makeNavigator(world,colliders,treads), keys={};
  const p={id:0,name:'你',team:0,x:0,y:0,z:0,yaw:0,hp:100,armor:100,inventory:loadout('ak47'),slot:0};
  const bots=[], units=[p], grenades=[], effects=[];
  let animate=null, skill=skills.normal, primary='ak47', sound=true;
  const state={phase:'idle',hp:100,armor:100,team:0,ammo:30,reserve:90,score:[0,0],kills:0,deaths:0,headshots:0,remaining:ROUND,target:GOAL,grounded:true,sprinting:false,alive:true,respawnIn:0,reloading:false,aiming:false,zoom:0,spread:0,weapon:'ak47',inventory:p.inventory,slot:0,scoreboard:[],rows:[],player:p,actors:bots};
  const ray=new T.Ray(), v=new T.Vector3(), dir=new T.Vector3(), eye=new T.Vector3(), aim=new T.Vector3(), tmp=new T.Vector3(), rot=new T.Euler(0,0,0,'YXZ');
  const localRay=new T.Ray(),bodyBox=new T.Box3(),headSphere=new T.Sphere(new T.Vector3(),.145);
  const tracerGeo=new T.CylinderGeometry(.010,.015,1,4),tracerMaterial=new T.MeshBasicMaterial({color:0xffce73,transparent:true,opacity:.86,depthWrite:false});
  const nadeGeo=new T.IcosahedronGeometry(.12,1),nadeMat=new T.MeshStandardMaterial({color:0x536043,metalness:.4,roughness:.6});
  const axis=new T.Vector3(0,1,0);
  let pitch=0,jumpVel=0,grounded=true,loadTimer=0,shotTimer=0,hudTimer=0,clock=0,bob=0;
  let fireTap=false,altTap=false,restoreZoom=0;
  let baseFov=camera.fov,lastSlot=0,semiLatch=false,shots=0,hits=0,scopeTime=0;
  const eyeHeight=a=>a.crouch?1.07:EYE;
  const active=a=>a.inventory[a.slot];
  function sfx(kind,weapon,a=p,extra={}){
    if(!sound)return;
    const x=a.x-p.x,z=a.z-p.z,dist=Math.hypot(x,z);
    emit('sfx',{kind,weapon,volume:1/(1+dist*.09),pan:clamp((x*Math.cos(p.yaw)-z*Math.sin(p.yaw))/Math.max(1,dist),-1,1),...extra});
  }
  function hud(){
    const w=active(p);
    Object.assign(state,{hp:Math.ceil(p.hp),armor:Math.ceil(p.armor),alive:p.alive,respawnIn:Math.max(0,p.respawn),reloading:loadTimer>0,weapon:w.id,ammo:w.ammo,reserve:w.reserve,inventory:p.inventory,slot:p.slot,protect:p.shield,kills:p.kills,deaths:p.deaths,headshots:p.headshots,accuracy:shots?Math.round(hits/shots*100):0,crouching:p.crouch});
    state.scoreboard=state.rows=units.map(({name,team,kills,deaths,headshots,alive,id})=>({name,team,kills,deaths,headshots,alive,isPlayer:id===0}));
    state.aimName='';state.aimTeam=null;
    if(p.alive){
      camera.getWorldDirection(dir);const sight=actorHit(p,camera.position,dir,wallDistance(camera.position,dir,110),true);
      if(sight){state.aimName=sight.unit.name;state.aimTeam=sight.unit.team;}
    }
    emit('hud',state);
  }
  function respawn(a,initial=false){
    const list=world.spawns[a.team], spot=list[initial?a.id%list.length:Math.floor(Math.random()*list.length)];
    Object.assign(a,{x:spot.x,y:0,z:spot.z,yaw:a.team?Math.PI:0,hp:100,armor:100,alive:true,respawn:0,shield:initial?.55:1.5,path:[],think:0,shot:.28+Math.random()*.45,walking:false,enemy:null,crouch:false,burst:newBurst(),vx:0,vz:0,tag:0,slot:0,inventory:loadout(a===p?primary:a.primary),radarT:0,fall:0,streak:0,multi:0,lastKill:-99,lastHeard:null,seen:null,nadeReady:clock+12+Math.random()*16});
    if(a===p){
      pitch=jumpVel=bob=loadTimer=0;grounded=true;shotTimer=.12;lastSlot=0;semiLatch=false;
      restoreZoom=0;state.zoom=0;state.aiming=false;state.killedBy='';view.equip?.(active(p).id);cameraAt(0);
    }
  }
  function cameraAt(dt){
    camera.position.set(p.x,p.y+(p.alive?eyeHeight(p):.65)+.025*Math.sin(bob)*Number(p.walking),p.z);
    const follow=state.aiming?.78:.43;
    camera.rotation.set(pitch+p.burst.pitch*follow,p.yaw+p.burst.yaw*follow,0,'YXZ');
    const desired=state.zoom===2?11:state.zoom===1?30:baseFov*(state.aiming?.75:1);
    if(Math.abs(camera.fov-desired)>.05){camera.fov=T.MathUtils.damp(camera.fov,desired,18,dt);camera.updateProjectionMatrix();}
    camera.updateMatrixWorld();
  }
  function move(a,dx,dz){
    const b=world.bounds,steps=Math.max(1,Math.ceil(Math.hypot(dx,dz)/.14));
    for(let i=0;i<steps;i++){
      let x=clamp(a.x+dx/steps,b.minX+RADIUS,b.maxX-RADIUS),z=clamp(a.z+dz/steps,b.minZ+RADIUS,b.maxZ-RADIUS);
      const surface=treadHeight(x,z,treads);
      const raised=(a!==p||grounded)&&surface<=a.y+STEP && surface>a.y;
      const y=raised?surface:a.y;
      // Project off each wall along its true contact normal to slide along oblique faces.
      for(let pass=0;pass<2;pass++)for(const s of colliders){
        if(s.bottom>=y+(a.crouch?1.22:HEIGHT) || s.top<=y+.001 || !footprint(x,z,s))continue;
        const lx=(x-s.x)*s.c-(z-s.z)*s.n,lz=(x-s.x)*s.n+(z-s.z)*s.c;
        const vx=lx-clamp(lx,-s.w/2,s.w/2),vz=lz-clamp(lz,-s.d/2,s.d/2);
        const d=Math.hypot(vx,vz);
        if(d<1e-8){x=a.x;z=a.z;continue;}
        const push=(RADIUS-d+.00001)/d;
        x+=(vx*s.c+vz*s.n)*push;z+=(-vx*s.n+vz*s.c)*push;
      }
      a.x=clamp(x,b.minX+RADIUS,b.maxX-RADIUS);a.z=clamp(z,b.minZ+RADIUS,b.maxZ-RADIUS);
      const actual=treadHeight(a.x,a.z,treads);
      if(raised && actual<=a.y+STEP)a.y=Math.max(a.y,actual);
    }
  }
  function vertical(dt){
    const old=p.y,wasGrounded=grounded;
    jumpVel-=18*dt;
    let next=old+jumpVel*dt, floor=0;
    for(const s of colliders){
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
  function damage(a,b,amount,id,head=false,wall=false){
    if(!b.alive||b.shield>0||state.phase!=='playing'||(a!==b&&a.team===b.team))return;
    const absorb=Math.min(b.armor,amount*(1-arsenal[id].armor));b.armor-=absorb;b.hp=Math.max(0,b.hp-amount+absorb);
    if(arsenal[id].interval)b.tag=.24;
    if(b!==p&&b!==a){b.lastHeard={x:a.x,z:a.z};b.yaw=angleTo(b,a);}
    if(b===p)sfx('hurt',id);
    if(b===p)emit('hurt',{bearing:angleTo(p,a),damage:amount-absorb});
    const kill=b.hp<=0;
    if(kill){
      sfx('death',id,b);b.alive=false;b.walking=false;b.respawn=2.5;b.deaths++;b.lastAttacker=a;
      if(a!==b){state.score[a.team]++;a.kills++;a.headshots+=+head;a.streak++;a.multi=clock-a.lastKill<5?a.multi+1:1;a.lastKill=clock;}
      if(b===p){state.killedBy=a===b?'自己的手雷':a.name;state.zoom=0;state.aiming=false;loadTimer=0;clearKeys();}
      emit('feed',{killer:a.name,victim:b.name,weapon:id,team:a.team,head,wall});
    }
    if(a===p&&a!==b){sfx('hit',id,p,{head});emit('hit',{kill,head,wall,weapon:id,victim:b.name,multi:kill?a.multi:0});}
    if(state.score[a.team]>=state.target)finish();
  }
  function shot(a,direction,id){
    const def=arsenal[id],src=new T.Vector3(a.x,a.y+eyeHeight(a),a.z);
    const hit=actorHit(a,src,direction,100),limit=hit?.distance??100;
    let factor=1,wood=false;
    const intersections=[];
    for(const s of colliders){
      const dx=src.x-s.x,dz=src.z-s.z;
      localRay.origin.set(dx*s.c-dz*s.n,src.y,dx*s.n+dz*s.c);
      localRay.direction.set(direction.x*s.c-direction.z*s.n,direction.y,direction.x*s.n+direction.z*s.c);
      const loc=localRay.intersectBox(s.box,tmp);if(!loc)continue;
      const distance=loc.distanceTo(localRay.origin);if(distance>=limit)continue;
      const nx=Math.abs(Math.abs(loc.x)-s.w/2)<.002?Math.sign(loc.x):0,nz=Math.abs(Math.abs(loc.z)-s.d/2)<.002?Math.sign(loc.z):0;
      intersections.push({s,distance,n:new T.Vector3(nx*s.c+nz*s.n,nx||nz?0:(direction.y<0?1:-1),nz*s.c-nx*s.n)});
    }
    if(direction.y<-.0001&&-src.y/direction.y<limit)intersections.push({s:{},distance:-src.y/direction.y,n:new T.Vector3(0,1,0)});
    intersections.sort((u,v)=>u.distance-v.distance);
    let end=limit;
    for(const ob of intersections){
      const pos=src.clone().addScaledVector(direction,ob.distance);world.fx.impact(pos,ob.n,ob.s.material);sfx(ob.s.material==='wood'?'timber':'clang',id,pos,{volume:.13});
      if(ob.s.material==='wood'&&def.power>=1&&!wood){wood=true;factor*=.48;continue;}
      end=ob.distance;factor=0;break;
    }
    if(hit&&factor){
      world.fx.wound?.(src.clone().addScaledVector(direction,hit.distance));damage(a,hit.unit,def.damage*(hit.head?def.head:hit.limb?.78:1)*factor,id,hit.head,wood);if(a===p)hits++;
    }
    const start=src.clone().addScaledVector(direction,.56);start.y-=.14;
    const dest=src.clone().addScaledVector(direction,end);
    const tracer=new T.Mesh(tracerGeo,tracerMaterial);tracer.position.copy(start).lerp(dest,.5);v.subVectors(dest,start);tracer.scale.y=v.length();tracer.quaternion.setFromUnitVectors(axis,v.normalize());scene.add(tracer);effects.push({m:tracer,left:.055});
    world.fx.muzzle(start,direction);world.fx.eject(start,direction);sfx('shot',id,a);a.shield=0;a.radarT=1.25;
    for(const b of bots)if(b.team!==a.team&&Math.hypot(b.x-a.x,b.z-a.z)<28)b.lastHeard={x:a.x,z:a.z};
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
      for(const b of units){
        const diff=new T.Vector3(b.x,b.y+.85,b.z).sub(pos),r=diff.length();
        if(r<7.5){const cover=wallDistance(pos,diff.normalize(),r)<r-.05?.24:1;damage(g.a,b,(1-r/7.5)*143*cover,'he');}
      }
      scene.remove(g.m);grenades.splice(i,1);
    }
  }
  function useSlot(slot){
    if(!p.alive||!p.inventory[slot]||p.slot===slot||(!p.inventory[slot].ammo&&slot===3))return;
    lastSlot=p.slot;p.slot=slot;restoreZoom=0;state.zoom=0;state.aiming=false;p.burst=newBurst();loadTimer=0;semiLatch=!!keys.fire;
    shotTimer=.26;view.equip(active(p).id);sfx('equip',active(p).id);hud();
  }
  function reload(){
    const w=active(p),d=arsenal[w.id];if(!p.alive||loadTimer||!d.reload||w.ammo>=w.max||!w.reserve)return;
    restoreZoom=0;state.zoom=0;state.aiming=false;loadTimer=d.reload;view.reload(loadTimer);sfx('reload',w.id);hud();
  }
  function advancePlayer(dt){
    const w=active(p),d=arsenal[w.id];
    recoverBurst(p.burst,d,clock,dt);p.crouch=!!keys.crouch;
    state.aiming=!loadTimer&&(w.id==='awm'?!!state.zoom:p.slot<2&&!!keys.aim);
    const sideways=Number(!!keys.right)-Number(!!keys.left),forward=Number(!!keys.forward)-Number(!!keys.back),mag=Math.hypot(sideways,forward);
    const speed=(p.crouch?2.15:keys.walk?2.65:state.aiming?3:keys.sprint?6.8:5.0)*d.speed;
    const oldX=p.x,oldZ=p.z;
    const c=Math.cos(p.yaw),s=Math.sin(p.yaw),stride=speed*(1-.45*Math.min(1,p.tag/.15))/Math.max(1,mag);
    const goalX=(c*sideways-s*forward)*stride,goalZ=(-s*sideways-c*forward)*stride;
    const dx=goalX-p.vx,dz=goalZ-p.vz,dv=Math.hypot(dx,dz);
    const acceleration=grounded?(mag?42:52):10;
    const ratio=dv?Math.min(1,acceleration*dt/dv):0;
    p.vx+=dx*ratio;p.vz+=dz*ratio;
    if(p.vx||p.vz)move(p,p.vx*dt,p.vz*dt);
    if(dt>0){p.vx=(p.x-oldX)/dt;p.vz=(p.z-oldZ)/dt;}
    p.quiet=!!keys.walk||p.crouch;const walked=Math.hypot(p.x-oldX,p.z-oldZ);p.walking=walked>dt*.1;
    if(p.walking&&!p.quiet&&grounded&&Math.floor(bob)!==Math.floor(bob+walked*2))for(const b of bots){
      if(b.team!==p.team&&Math.hypot(b.x-p.x,b.z-p.z)<8)b.lastHeard={x:p.x,z:p.z};
    }bob+=walked*2;vertical(dt);state.grounded=grounded;state.sprinting=!!keys.sprint&&p.walking&&!state.aiming;cameraAt(dt);
    if(loadTimer>0){loadTimer=Math.max(0,loadTimer-dt);if(!loadTimer){const add=Math.min(w.max-w.ammo,w.reserve);w.ammo+=add;w.reserve-=add;hud();}}
    const previous=shotTimer;shotTimer-=dt;if(w.id==='awm'&&previous>.78&&shotTimer<=.78)sfx('bolt','awm');
    if(w.id==='awm'&&restoreZoom&&shotTimer<=0){state.zoom=restoreZoom;restoreZoom=0;scopeTime=clock;sfx('scope','awm');}
    if(w.id==='he'&&!w.ammo&&shotTimer<=0){useSlot(lastSlot===3?0:lastSlot);return;}
    state.spread=firingCone(d,p.burst,{speed:Math.hypot(p.vx,p.vz),grounded,crouch:p.crouch,ads:state.aiming,scoped:w.id==='awm'&&state.zoom&&clock-scopeTime>.16});
    const trigger=keys.fire||fireTap,secondary=keys.aim||altTap;
    if(!trigger&&!(w.id==='knife'&&secondary))return;
    if(shotTimer>0||loadTimer){if(shotTimer>.3||loadTimer)fireTap=altTap=false;return;}
    fireTap=altTap=false;
    if(w.id==='knife'){
      const heavy=!!secondary;shotTimer=heavy?.91:.39;camera.getWorldDirection(dir);
      const reach=heavy?1.7:2.05;const hit=actorHit(p,camera.position,dir,wallDistance(camera.position,dir,reach));
      if(hit){
        const rear=Math.cos(hit.unit.yaw-p.yaw)>.5;
        damage(p,hit.unit,(heavy?105:54)*(rear?1.8:1)*(hit.head?1.3:1),'knife',hit.head);
      }else{const d=wallDistance(camera.position,dir,reach);if(d<reach)world.fx.impact(camera.position.clone().addScaledVector(dir,d),dir.clone().negate());}
      view.shoot(heavy?'heavy':'light');sfx(heavy?'heavy':'light','knife');p.shield=0;return;
    }
    if(semiLatch&&['awm','deagle','he'].includes(w.id))return;
    if(!w.ammo){if(!w.reserve){sfx('dry',w.id);shotTimer=.32;}else reload();return;}
    w.ammo--;semiLatch=true;view.shoot();camera.getWorldDirection(dir);
    if(w.id==='he'){toss(p,dir);shotTimer=.65;hud();return;}
    const deviation=spreadOffset(state.spread);
    rot.set(pitch+p.burst.pitch+deviation.y,p.yaw+p.burst.yaw+deviation.x,0,'YXZ');
    dir.set(0,0,-1).applyEuler(rot);shots++;shot(p,dir,w.id);
    const adsRate=state.aiming&&['ak47','m4a1','mp5'].includes(w.id)?.90:1;
    shotTimer=d.interval/adsRate+(previous>0?Math.max(-dt,shotTimer):0);
    recordShot(p.burst,d,clock,state.aiming,p.crouch);
    if(w.id==='awm'&&state.zoom){restoreZoom=state.zoom;state.zoom=0;state.aiming=false;}
    hud();
  }
  function advanceBot(b,dt){
    recoverBurst(b.burst,arsenal[active(b).id],clock,dt);
    const support=treadHeight(b.x,b.z,treads);
    if(b.y>support){b.fall=(b.fall||0)+18*dt;b.y=Math.max(support,b.y-b.fall*dt);}else b.fall=0;
    const enemies=units.filter(a=>a.alive && a.team!==b.team);
    if(b.walking){b.stepIn=(b.stepIn??0)-dt;if(b.stepIn<=0){sfx('step','',b);b.stepIn=.43;}}
    b.think-=dt;b.shot-=dt;b.walking=false;
    if(b.think<=0){
      b.think=skill.response+Math.random()*.25;
      enemies.sort((a,c)=>sq(b.x-a.x)+sq(b.z-a.z)-sq(b.x-c.x)-sq(b.z-c.z));
      b.enemy=enemies.find(e=>{
        const dx=e.x-b.x,dz=e.z-b.z,r=Math.hypot(dx,dz);
        const front=(-Math.sin(b.yaw)*dx-Math.cos(b.yaw)*dz)/Math.max(.01,r);
        return r<skill.sight&&(front>Math.cos(skill.fov)||r<7||e.radarT>0)&&visible(b,e);
      })||null;
      if(!b.enemy){
        const dest=b.lastHeard||enemies[b.id%Math.max(1,Math.min(enemies.length,2))] || world.spawns[1-b.team][0];
        b.path=navigator.route(b.x,b.z,dest.x,dest.z);b.lastHeard=null;
      }
    }
    if(b.enemy?.alive && visible(b,b.enemy)){
      const foe=b.enemy;
      b.yaw=angleTo(b,foe);
      if(b.shot<=0){
        const range=Math.hypot(b.x-foe.x,b.z-foe.z);
        const miss=skill.miss+range*.006;
        if(b.nadeReady<clock&&range>6&&range<16&&b.inventory[3].ammo){
          b.inventory[3].ammo=0;toss(b,new T.Vector3(foe.x-b.x,2.6,foe.z-b.z).normalize());b.nadeReady=Infinity;
        }
        dir.set(foe.x-b.x+(Math.random()-.5)*miss*2,foe.y+(Math.random()<skill.head?1.65:1.17)-b.y-eyeHeight(b)+(Math.random()-.5)*miss*1.9,foe.z-b.z+(Math.random()-.5)*miss*2).normalize();
        const w=active(b),def=arsenal[w.id];
        if(w.ammo>0){
          const spread=firingCone(def,b.burst,{speed:skill.strafe,grounded:!b.fall,crouch:b.crouch,scoped:w.id==='awm',ads:false});
          const offset=spreadOffset(spread);
          rot.set(Math.asin(dir.y)+b.burst.pitch+offset.y,Math.atan2(-dir.x,-dir.z)+b.burst.yaw+offset.x,0,'YXZ');
          dir.set(0,0,-1).applyEuler(rot);w.ammo--;shot(b,dir,w.id);recordShot(b.burst,def,clock,false,b.crouch);
          b.shot=def.interval+skill.response*(.24+Math.random()*.65);
        }
        else{b.shot=arsenal[w.id].reload;w.ammo=w.max;sfx('reload',w.id,b);}
      }
      if(skill.strafe>.1){const step=Math.sin(clock*2+b.id)*skill.strafe*dt*(b.tag>0?.55:1);move(b,Math.cos(b.yaw)*step,-Math.sin(b.yaw)*step);}
      return;
    }
    if(!b.path.length)return;
    let remaining=dt*(b.tag>0?.55:1)*(2.7+(b.id%3)*.18);
    while(remaining>0 && b.path.length){
      const q=b.path[0], dx=q.x-b.x,dz=q.z-b.z,dist=Math.hypot(dx,dz);
      if(dist<.025){b.path.shift();continue;}
      const step=Math.min(remaining,dist);
      b.yaw=angleTo(b,q);move(b,dx/dist*step,dz/dist*step);
      b.walking=true;remaining-=step;
      if(dist<=step+.001)b.path.shift();
    }
  }
  function clearKeys(){fireTap=altTap=false;for(const k in keys)keys[k]=false;}
  function start(opts={}){
    clearKeys();animate?.dispose();bots.length=0;units.length=1;
    for(const g of grenades)scene.remove(g.m);grenades.length=0;
    for(const e of effects)scene.remove(e.m);effects.length=0;world.fx.reset();
    p.team=opts.team===1?1:0;state.team=p.team;primary=primaries.includes(opts.primary)?opts.primary:'ak47';
    const size=[3,4,6,8].includes(opts.size)?opts.size:6;skill=skills[opts.diff]||skills.normal;
    state.target=[30,50,100].includes(opts.goal)?opts.goal:50;
    const names=['北辰','回声','夜航','长风','白鲸','赤隼','远山','银翼','苍鹭','天狼','灰狐','海燕','青锋','岩雀','信标'];
    for(let i=1;i<size*2;i++){
      const b={id:i,name:names[i-1],team:i<size?p.team:1-p.team,primary:primaries[(i+1)%4]};
      bots.push(b);units.push(b);
    }
    animate=createSquad(scene,bots);state.phase='playing';state.score=[0,0];state.remaining=size===3?300:600;
    shots=hits=clock=0;for(const a of units){a.kills=a.headshots=a.deaths=0;a.lastAttacker=null;respawn(a,true);}
    view.setTeam(p.team);state.grounded=true;state.sprinting=false;animate(0,true);hud();
  }
  function pause(){if(state.phase==='playing'){state.phase='paused';clearKeys();state.aiming=false;hud();}}
  function resume(){if(state.phase==='paused'){state.phase='playing';hud();}}
  function input(action,value){
    if(action==='sound'){sound=!!value;return;}
    if(action==='fov'){baseFov=clamp(Number(value)||78,65,100);return;}
    if(action==='primary'&&primaries.includes(value)){
      primary=value;
      if(p.alive&&Math.abs(p.z)>20&&(p.team===0?p.z>0:p.z<0)){
        p.inventory[0]=loadout(primary)[0];p.burst=newBurst();p.slot=0;state.zoom=0;loadTimer=0;shotTimer=.25;view.equip(primary);hud();return 'now';
      }return 'respawn';
    }
    if(state.phase!=='playing')return;
    if(action==='slot'){useSlot(value);return;}
    if(action==='last'){useSlot(lastSlot);return;}
    if(action==='cycle'){for(let i=1;i<=4;i++){const n=(p.slot+Math.sign(value)*i+8)%4;if(n!==3||p.inventory[3].ammo){useSlot(n);break;}}return;}
    const down=!!value;
    if(action==='jump'&&down&&!keys.jump&&grounded&&p.alive){sfx('jump',active(p).id);jumpVel=keys.crouch?8.4:7.1;grounded=false;}
    if(action==='fire'&&down&&!keys.fire){fireTap=true;semiLatch=false;}
    if(action==='aim'&&down&&!keys.aim)altTap=true;
    if(action==='fire'&&!down)semiLatch=false;
    if(action==='aim'&&down&&!keys.aim&&p.alive&&active(p).id==='awm'&&!loadTimer){if(restoreZoom){restoreZoom=0;}else{state.zoom=(state.zoom+1)%3;scopeTime=clock;sfx('scope','awm');}}
    if(action==='reload'&&down)reload();keys[action]=down;
  }
  function look(dx,dy){
    if(state.phase!=='playing'||!p.alive)return;
    const sens=state.aiming?.00136:.00205;
    p.yaw-=dx*sens;pitch=clamp(pitch-dy*sens,-1.38,1.38);
  }
  function update(dt){
    if(state.phase!=='playing')return;
    dt=clamp(dt,0,.08);clock+=dt;state.remaining=Math.max(0,state.remaining-dt);
    for(const a of units){
      a.shield=Math.max(0,a.shield-dt);a.radarT=Math.max(0,a.radarT-dt);a.tag=Math.max(0,a.tag-dt);
      if(!a.alive){a.respawn-=dt;if(a.respawn<=0)respawn(a);}
    }
    if(p.alive)advancePlayer(dt);else{
      camera.position.lerp(new T.Vector3(p.x,p.y+2.7,p.z+.3),Math.min(1,dt*3));
      if(p.lastAttacker&&p.lastAttacker!==p)camera.lookAt(p.lastAttacker.x,p.lastAttacker.y+1.25,p.lastAttacker.z);
    }
    updateGrenades(dt);
    for(const b of bots){if(state.phase==='playing'&&b.alive)advanceBot(b,dt);}
    animate(clock,true);
    view.update(dt,{moving:p.alive&&p.walking,aiming:state.aiming,reloading:loadTimer>0});
    for(let i=effects.length-1;i>=0;i--){const e=effects[i];e.left-=dt;if(e.left<=0){scene.remove(e.m);effects.splice(i,1);}}
    hudTimer-=dt;if(hudTimer<=0){hudTimer=.1;hud();}
    if(state.remaining===0)finish();
  }
  return {state,start,pause,resume,input,look,update};
}
