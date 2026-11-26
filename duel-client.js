import * as T from './three.module.js';
import {createSquad} from './match.js?v=39';

export function createDuelClient({scene,camera,view,world,send,emit}){
  let actors=[],animate,target,sequence=0,pending=[];
  let lookX=0,lookY=0,viewTime=0,baseFov=78;
  const buttons=new Map(),state={};
  const rotation=new T.Quaternion(),angles=new T.Euler(0,0,0,'YXZ');
  const position=new T.Vector3(),tracers=[];
  const tracerMaterial=new T.LineBasicMaterial({color:0xffce73});
  const grenadeGeometry=new T.IcosahedronGeometry(.12,1);
  const grenadeMaterial=new T.MeshStandardMaterial({color:0x536043});
  const grenades=[];
  const renderedActions=new Set(['equip','reload','shoot','meleeContact','flourish','fidget','inspect']);
  const fxActions=new Set(['impact','headshot','wound','muzzle','eject','explode']);

  function apply(packet){
    if(packet.type==='started'){
      actors=packet.actors.filter(actor=>actor.id!==packet.state.player.id).map(actor=>({...actor}));
      animate=createSquad(scene,actors);
      camera.position.fromArray(packet.position);
      view.setTeam(packet.state.team);
      view.equip(packet.state.weapon);
    }
    target=packet;
    pending=pending.filter(input=>input.seq>packet.lookAck);
    Object.assign(state,packet.state,{actors});
    emit('hud',state);
  }
  function sensitivity(){
    if(state.zoom){
      const scopeFov=state.zoom===2?11:30;
      const ratio=Math.tan(T.MathUtils.degToRad(scopeFov*.5))/Math.tan(T.MathUtils.degToRad(baseFov*.5));
      return .00205*T.MathUtils.clamp(ratio*1.05,.14,.75);
    }
    return state.aiming?.00136:.00205;
  }
  function update(dt){
    if(!target)return;
    if(lookX||lookY){
      const x=T.MathUtils.clamp(lookX,-360,360),y=T.MathUtils.clamp(lookY,-360,360);
      lookX=lookY=0;
      const seq=++sequence;
      if(send({type:'look',seq,x,y}))pending.push({seq,x,y});
      if(pending.length>32)pending.shift();
    }
    const response=1-Math.exp(-60*dt);
    const targetPosition=position.fromArray(target.position);
    if(camera.position.distanceToSquared(targetPosition)>16)camera.position.copy(targetPosition);
    else camera.position.lerp(targetPosition,response);
    angles.setFromQuaternion(rotation.fromArray(target.rotation),'YXZ');
    if(state.alive){
      const sens=sensitivity();
      for(const input of pending){angles.y-=input.x*sens;angles.x-=input.y*sens;}
      angles.x=T.MathUtils.clamp(angles.x,-1.42,1.42);
    }
    camera.rotation.copy(angles);
    const fov=state.zoom===2?11:state.zoom===1?30:baseFov*(state.aiming?.75:1);
    if(camera.fov!==fov){camera.fov=fov;camera.updateProjectionMatrix();}
    camera.updateMatrixWorld();
    for(const actor of actors){
      const networkActor=target.actors.find(other=>other.id===actor.id);
      const {x,y,z,yaw,...flags}=networkActor;
      const snap=actor.alive!==flags.alive||Math.hypot(actor.x-x,actor.z-z)>4;
      const blend=snap?1:response;
      actor.x+=(x-actor.x)*blend;actor.y+=(y-actor.y)*blend;actor.z+=(z-actor.z)*blend;
      actor.yaw+=Math.atan2(Math.sin(yaw-actor.yaw),Math.cos(yaw-actor.yaw))*blend;
      Object.assign(actor,flags);
    }
    for(let i=0;i<target.grenades.length;i++){
      if(!grenades[i]){
        grenades[i]=new T.Mesh(grenadeGeometry,grenadeMaterial);
        scene.add(grenades[i]);
      }
      grenades[i].position.fromArray(target.grenades[i]);
      grenades[i].visible=true;
    }
    for(let i=target.grenades.length;i<grenades.length;i++)grenades[i].visible=false;
    for(let i=tracers.length-1;i>=0;i--){
      const tracer=tracers[i];
      tracer.life-=dt;
      if(tracer.life>0)continue;
      scene.remove(tracer.mesh);tracer.mesh.geometry.dispose();tracers.splice(i,1);
    }
    viewTime+=dt;
    animate?.(viewTime,true);
    const player=state.player;
    view.update(dt,{alive:state.alive,moving:player.walking,sprinting:state.sprinting,
      crouching:state.crouching,grounded:state.grounded,aiming:state.aiming,reloading:state.reloading,
      strafe:Number(!!buttons.get('right'))-Number(!!buttons.get('left'))});
  }
  function visual(packet){
    if(packet.type==='view'&&renderedActions.has(packet.name)){
      view[packet.name]?.(...packet.args);return;
    }
    if(packet.type==='fx'&&fxActions.has(packet.name)){
      world.fx[packet.name]?.(...packet.args.map(arg=>Array.isArray(arg)?new T.Vector3(...arg):arg));
      return;
    }
    if(packet.type==='event'&&packet.name==='tracer'){
      if(tracers.length>=48)return;
      const {start,end}=packet.data;
      const geometry=new T.BufferGeometry().setFromPoints([new T.Vector3(...start),new T.Vector3(...end)]);
      const mesh=new T.Line(geometry,tracerMaterial);
      scene.add(mesh);tracers.push({mesh,life:.055});
      return;
    }
    if(packet.type==='event')emit(packet.name,packet.data);
  }
  function input(action,value){
    if(action==='sound')return;
    if(action==='fov')baseFov=value;
    if(typeof value==='boolean'&&action!=='last'){
      if((buttons.get(action)??false)===value)return;
      buttons.set(action,value);
    }
    send({type:'input',action,value});
    if(action==='primary'||action==='melee'){
      const p=state.player;
      return state.alive&&Math.abs(p.z)>20&&(p.team===0?p.z>0:p.z<0)?'now':'respawn';
    }
  }
  return {
    state,apply,visual,input,update,
    look(x,y){if(state.alive){lookX+=x;lookY+=y;}},
    pause(){buttons.clear();lookX=lookY=0;send({type:'clear'});},
    resume(){},
    dispose(){
      animate?.dispose();
      for(const {mesh} of tracers){scene.remove(mesh);mesh.geometry.dispose();}
      for(const grenade of grenades)scene.remove(grenade);
      tracerMaterial.dispose();grenadeGeometry.dispose();grenadeMaterial.dispose();
      world.fx.reset();
    }
  };
}
