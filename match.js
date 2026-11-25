import * as T from './three.module.js';

const clamp = T.MathUtils.clamp;
const EYE = 1.60, RADIUS = .32, MAG = 30, ROUND = 300, GOAL = 30;
const sq = n => n*n;
const angleTo = (a,b) => Math.atan2(a.x-b.x,a.z-b.z);

function audioMixer(){
  let ctx, noise, enabled=true;
  function unlock(){
    if(!enabled) return;
    try {
      ctx ||= new (window.AudioContext || window.webkitAudioContext)();
      if(ctx.state==='suspended') ctx.resume().catch(()=>{});
      if(!noise){
        noise=ctx.createBuffer(1,Math.round(ctx.sampleRate*.28),ctx.sampleRate);
        const samples=noise.getChannelData(0);
        for(let i=0;i<samples.length;i++) samples[i]=Math.random()*2-1;
      }
    } catch {}
  }
  function play(kind,volume=1,pan=0){
    if(!ctx || !enabled || ctx.state!=='running') return;
    const now=ctx.currentTime, gain=ctx.createGain(), filter=ctx.createBiquadFilter();
    const shot=kind==='shot', hit=kind==='hit', duration=shot?.15:hit?.065:.11;
    gain.gain.setValueAtTime(.0001,now);
    gain.gain.exponentialRampToValueAtTime(Math.max(.001,volume*(shot?.3:.09)),now+.004);
    gain.gain.exponentialRampToValueAtTime(.0001,now+duration);
    filter.type=shot?'lowpass':'highpass';
    filter.frequency.value=shot?2500:1050;
    filter.connect(gain);
    if(ctx.createStereoPanner){
      const p=ctx.createStereoPanner(); p.pan.value=clamp(pan,-1,1); gain.connect(p); p.connect(ctx.destination);
      p.onended=()=>p.disconnect();
    } else gain.connect(ctx.destination);
    const src=hit?ctx.createOscillator():ctx.createBufferSource();
    if(hit) { src.type='sine'; src.frequency.setValueAtTime(1650,now); src.frequency.exponentialRampToValueAtTime(1080,now+duration); }
    else src.buffer=noise;
    src.connect(filter); src.start(now); src.stop(now+duration);
    if(shot){
      const bass=ctx.createOscillator(); bass.frequency.setValueAtTime(128,now); bass.frequency.exponentialRampToValueAtTime(40,now+.12); bass.connect(gain); bass.start(now); bass.stop(now+.14);
    }
  }
  return {unlock,play,set(v){enabled=v;if(v)unlock();}};
}

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
  return function animate(t,visible){
    for(const b of bots){
      const {root,legs}=b.rig;
      root.position.set(b.x,b.y + (b.walking?.018*Math.abs(Math.sin(t*10+b.id)):0),b.z);
      root.rotation.y=b.yaw;
      legs.forEach((leg,i)=>{leg.rotation.x=b.walking?Math.sin(t*10+b.id+i*Math.PI)*.51:0;});
      root.updateMatrixWorld(true);
    }
    for(const {mesh,parts} of Object.values(batches)){
      mesh.count=visible?parts.length:0;
      if(visible)parts.forEach((p,i)=>mesh.setMatrixAt(i,p.bot.alive?p.o.matrixWorld:hidden));
      mesh.instanceMatrix.needsUpdate=true;
    }
  };
}

function makeNavigator(world){
  const {minX,maxX,minZ,maxZ}=world.bounds, step=.9;
  const cols=Math.floor((maxX-minX)/step), rows=Math.floor((maxZ-minZ)/step), n=cols*rows;
  const walk=new Uint8Array(n), xOf=id=>minX+(id%cols+.5)*step, zOf=id=>minZ+(Math.floor(id/cols)+.5)*step;
  function clear(x,z){
    return x>=minX+RADIUS && x<=maxX-RADIUS && z>=minZ+RADIUS && z<=maxZ-RADIUS && !world.solids.some(s=>s.bottom<1.74 && s.top>.08 && Math.abs(x-s.x)<s.w/2+RADIUS+.04 && Math.abs(z-s.z)<s.d/2+RADIUS+.04);
  }
  for(let i=0;i<n;i++)walk[i]=Number(clear(xOf(i),zOf(i)));
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
      for(const next of [at+cols,at-cols,at-1,at+1]){
        if(next<0 || next>=n || Math.abs(next%cols-at%cols)>1 || !walk[next] || prev[next]!==-1)continue;
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
  const mixer=audioMixer(), navigator=makeNavigator(world);
  const keys={}, units=['你','北辰','回声','赤隼','鬼鲨','蝰蛇'].map((name,id)=>({
    id,name,team:id<3?0:1,x:0,y:0,z:0,yaw:0,hp:100,alive:false,respawn:0,shield:0,shot:0,think:0,path:[],walking:false
  }));
  const p=units[0], bots=units.slice(1), animate=createSquad(scene,bots);
  const state={phase:'idle',hp:100,ammo:MAG,reserve:120,score:[0,0],kills:0,deaths:0,remaining:ROUND,target:GOAL,alive:true,respawnIn:0,reloading:false,aiming:false,player:p,actors:bots};
  const ray=new T.Ray(), v=new T.Vector3(), dir=new T.Vector3(), eye=new T.Vector3(), aim=new T.Vector3(), tmp=new T.Vector3(), rot=new T.Euler(0,0,0,'YXZ');
  const boxes=world.solids.map(s=>new T.Box3(new T.Vector3(s.x-s.w/2,s.bottom,s.z-s.d/2),new T.Vector3(s.x+s.w/2,s.top,s.z+s.d/2)));
  const bodyBox=new T.Box3(),headSphere=new T.Sphere(new T.Vector3(),.145);
  const effects=[],tracerGeo=new T.CylinderGeometry(.010,.015,1,4), sparkGeo=new T.IcosahedronGeometry(.037,0);
  const tracerMaterial=new T.MeshBasicMaterial({color:0xffce73,transparent:true,opacity:.86,depthWrite:false});
  const sparkMaterial=new T.MeshBasicMaterial({color:0xffd579});
  const axis=new T.Vector3(0,1,0);
  let pitch=0, jumpVel=0, grounded=true,loadTimer=0,shotTimer=0,hudTimer=0,clock=0,kick=0,bob=0;
  const baseFov=camera.fov;

  function hud(){
    state.hp=Math.ceil(p.hp); state.respawnIn=Math.max(0,p.respawn);state.alive=p.alive; state.reloading=loadTimer>0;
    emit('hud',state);
  }
  function respawn(a,initial=false){
    const list=world.spawns[a.team];
    const spot=list[initial?a.id%3%list.length:Math.floor(Math.random()*list.length)];
    Object.assign(a,{x:spot.x,y:0,z:spot.z,yaw:a.team?Math.PI:0,hp:100,alive:true,respawn:0,shield:initial?.55:1.35,path:[],think:0,shot:.28+Math.random()*.5,walking:false,enemy:null});
    if(a===p){
      pitch=0;jumpVel=0;kick=0;bob=0;grounded=true;loadTimer=0;shotTimer=.12;state.ammo=MAG;state.reserve=120;state.aiming=false;
      cameraAt(0);
    }
  }
  function cameraAt(dt){
    camera.position.set(p.x,p.y+(p.alive?EYE:.65)+.025*Math.sin(bob)*Number(p.walking),p.z);
    camera.rotation.set(pitch+kick,p.yaw,0,'YXZ');
    const desired=baseFov*(state.aiming?.75:1);
    if(Math.abs(camera.fov-desired)>.05){camera.fov=T.MathUtils.damp(camera.fov,desired,18,dt);camera.updateProjectionMatrix();}
    camera.updateMatrixWorld();
  }
  function overlaps(x,z,s){
    return Math.abs(x-s.x)<s.w/2+RADIUS && Math.abs(z-s.z)<s.d/2+RADIUS;
  }
  function move(a,dx,dz){
    const b=world.bounds, y=a.y;
    const free=(x,z)=>!world.solids.some(s=>s.top>y+.08 && s.bottom<y+1.74 && overlaps(x,z,s));
    const x=clamp(a.x+dx,b.minX+RADIUS,b.maxX-RADIUS), z=clamp(a.z+dz,b.minZ+RADIUS,b.maxZ-RADIUS);
    if(free(x,a.z))a.x=x;
    if(free(a.x,z))a.z=z;
  }
  function vertical(dt){
    const old=p.y;
    jumpVel-=18*dt;
    let next=old+jumpVel*dt, floor=0;
    for(const s of world.solids){
      if(!overlaps(p.x,p.z,s))continue;
      if(s.top<=old+.085 && s.top>floor)floor=s.top;
      if(jumpVel>0 && s.bottom>=old+1.74-.001 && s.bottom<next+1.74){next=s.bottom-1.74;jumpVel=0;}
    }
    grounded=next<=floor;
    p.y=grounded?floor:next;
    if(grounded)jumpVel=0;
  }
  function wallDistance(origin,direction,max){
    ray.set(origin,direction);
    let dist=max;
    for(const box of boxes)if(ray.intersectBox(box,tmp)){
      const d=origin.distanceTo(tmp);if(d<dist)dist=d;
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
  function damage(a,victim,amount){
    if(!victim.alive || victim.shield>0)return false;
    victim.hp=Math.max(0,victim.hp-amount);
    if(victim===p)emit('hurt',{damage:amount});
    if(victim.hp===0){
      victim.alive=false;victim.walking=false;victim.respawn=2.5;
      state.score[a.team]++;
      if(a===p)state.kills++;
      if(victim===p){state.deaths++;loadTimer=0;state.aiming=false;keys.fire=false;}
      emit('feed',{killer:a.name,victim:victim.name,team:a.team});
    }
    if(a===p){mixer.play('hit',.5);emit('hit',{kill:!victim.alive,head:amount>=90});}
    hud();
    if(state.score[a.team]>=GOAL)finish();
    return true;
  }
  function trace(start,end,wallHit){
    const m=new T.Mesh(tracerGeo,tracerMaterial), range=v.subVectors(end,start).length();
    m.position.copy(start).lerp(end,.5);m.scale.y=range;
    if(range>0)m.quaternion.setFromUnitVectors(axis,v.multiplyScalar(1/range));
    scene.add(m);effects.push({m,left:.055});
    if(wallHit){
      const spark=new T.Mesh(sparkGeo,sparkMaterial);spark.position.copy(end);scene.add(spark);effects.push({m:spark,left:.105});
    }
  }
  function shot(a,direction){
    const isPlayer=a===p;
    eye.set(a.x,a.y+(isPlayer?EYE:1.37),a.z);
    let nearest=wallDistance(eye,direction,95),victim=null,head=false;
    for(const b of units){
      if(!b.alive || b.team===a.team)continue;
      bodyBox.min.set(b.x-.21,b.y+.13,b.z-.18); bodyBox.max.set(b.x+.21,b.y+1.51,b.z+.18);
      headSphere.center.set(b.x,b.y+1.63,b.z);
      if(ray.intersectBox(bodyBox,tmp)){
        const dist=eye.distanceTo(tmp);
        if(dist<nearest){nearest=dist;victim=b;head=false;}
      }
      if(ray.intersectSphere(headSphere,tmp)){
        const dist=eye.distanceTo(tmp);
        if(dist<nearest){nearest=dist;victim=b;head=true;}
      }
    }
    const end=aim.copy(eye).addScaledVector(direction,nearest);
    const start=new T.Vector3(a.x,a.y+(isPlayer?1.41:1.24),a.z);
    start.x+=Math.cos(a.yaw)*.16-Math.sin(a.yaw)*.50;start.z-=Math.sin(a.yaw)*.16+Math.cos(a.yaw)*.50;
    trace(start,end,!victim&&nearest<95);
    if(victim)damage(a,victim,isPlayer?(head?100:35):(head?30:16));
    const dx=a.x-p.x,dz=a.z-p.z, distance=Math.hypot(dx,dz);
    mixer.play('shot',isPlayer?.78:.52/(1+distance*.07),(dx*Math.cos(p.yaw)-dz*Math.sin(p.yaw))/Math.max(distance,1));
  }
  function reload(){
    if(!p.alive || loadTimer>0 || state.ammo===MAG || state.reserve<=0)return;
    loadTimer=1.68;state.aiming=false;view.reload();mixer.play('reload',.7);hud();
  }
  function advancePlayer(dt){
    kick*=Math.exp(-dt*12);
    state.aiming=Boolean(keys.aim && !loadTimer);
    const sideways=Number(!!keys.right)-Number(!!keys.left),forward=Number(!!keys.forward)-Number(!!keys.back);
    const mag=Math.hypot(sideways,forward),speed=state.aiming?2.65:keys.sprint?6.8:4.85;
    p.walking=mag>0;
    if(mag){
      const c=Math.cos(p.yaw),s=Math.sin(p.yaw);
      move(p,(c*sideways-s*forward)*dt*speed/mag,(-s*sideways-c*forward)*dt*speed/mag);
      bob+=dt*speed*2;
    }
    vertical(dt);cameraAt(dt);
    if(loadTimer>0){
      loadTimer=Math.max(0,loadTimer-dt);
      if(!loadTimer){const add=Math.min(MAG-state.ammo,state.reserve);state.ammo+=add;state.reserve-=add;hud();}
    }
    shotTimer-=dt;
    if(keys.fire && shotTimer<=0 && !loadTimer){
      if(!state.ammo){reload();return;}
      shotTimer=.103;state.ammo--;view.shoot();
      const spread=state.aiming?.0014:p.walking?.008:.003;
      rot.set(pitch+kick+(Math.random()-.5)*spread,p.yaw+(Math.random()-.5)*spread,0,'YXZ');
      dir.set(0,0,-1).applyEuler(rot);shot(p,dir);kick=Math.min(.038,kick+.009);hud();
    }
  }
  function advanceBot(b,dt){
    const enemies=units.filter(a=>a.alive && a.team!==b.team);
    b.think-=dt;b.shot-=dt;b.walking=false;
    if(b.think<=0){
      b.think=.38+Math.random()*.27;
      enemies.sort((a,c)=>sq(b.x-a.x)+sq(b.z-a.z)-sq(b.x-c.x)-sq(b.z-c.z));
      b.enemy=enemies.find(e=>visible(b,e))||null;
      if(!b.enemy){
        const dest=enemies[b.id%Math.max(1,Math.min(enemies.length,2))] || world.spawns[1-b.team][0];
        b.path=navigator.route(b.x,b.z,dest.x,dest.z);
      }
    }
    if(b.enemy?.alive && visible(b,b.enemy)){
      const foe=b.enemy;
      b.yaw=angleTo(b,foe);
      if(b.shot<=0){
        const range=Math.hypot(b.x-foe.x,b.z-foe.z);
        const miss=(foe===p?.47:.38)+range*.006;
        dir.set(foe.x-b.x+(Math.random()-.5)*miss*2,foe.y+1.18-b.y-1.37+(Math.random()-.5)*miss*1.9,foe.z-b.z+(Math.random()-.5)*miss*2).normalize();
        shot(b,dir);b.shot=.28+Math.random()*.34;
      }
      return;
    }
    if(!b.path.length)return;
    let remaining=dt*(2.7+(b.id%3)*.18);
    while(remaining>0 && b.path.length){
      const q=b.path[0], dx=q.x-b.x,dz=q.z-b.z,dist=Math.hypot(dx,dz);
      if(dist<.025){b.path.shift();continue;}
      const step=Math.min(remaining,dist);
      b.yaw=angleTo(b,q);move(b,dx/dist*step,dz/dist*step);
      b.walking=true;remaining-=step;
      if(dist<=step+.001)b.path.shift();
    }
  }
  function clearKeys(){for(const k in keys)keys[k]=false;}
  function start(){
    clearKeys();mixer.unlock();state.phase='playing';state.score=[0,0];state.deaths=state.kills=0;state.remaining=ROUND;
    for(const a of units)respawn(a,true);
    for(const e of effects)scene.remove(e.m);effects.length=0;
    clock=0;animate(0,true);hud();
  }
  function pause(){
    if(state.phase==='playing'){state.phase='paused';clearKeys();state.aiming=false;hud();}
  }
  function resume(){
    if(state.phase==='paused'){state.phase='playing';mixer.unlock();hud();}
  }
  function input(action,value){
    if(action==='sound'){mixer.set(!!value);return;}
    if(state.phase!=='playing')return;
    const down=!!value;
    if(action==='jump' && down && !keys.jump && grounded && p.alive){jumpVel=7.1;grounded=false;}
    if(action==='reload' && down)reload();
    keys[action]=down;
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
      a.shield=Math.max(0,a.shield-dt);
      if(!a.alive){a.respawn-=dt;if(a.respawn<=0)respawn(a);}
    }
    if(p.alive)advancePlayer(dt);else cameraAt(dt);
    for(const b of bots){if(state.phase==='playing'&&b.alive)advanceBot(b,dt);}
    animate(clock,true);
    view.update(dt,{moving:p.alive&&p.walking,aiming:state.aiming,reloading:loadTimer>0});
    for(let i=effects.length-1;i>=0;i--){const e=effects[i];e.left-=dt;if(e.left<=0){scene.remove(e.m);effects.splice(i,1);}}
    hudTimer-=dt;if(hudTimer<=0){hudTimer=.1;hud();}
    if(state.remaining===0)finish();
  }
  return {state,start,pause,resume,input,look,update};
}

