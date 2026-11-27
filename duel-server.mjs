import * as T from './three.module.js';
import {buildWorld} from './world.js';
import {createMatch} from './match.js';
import {primaries,melees} from './arsenal.js?v=31';

const step=1/60;
const world=buildWorld();
const booleans=new Set(['forward','back','left','right','walk','sprint','crouch','jump','fire','aim','reload']);
const viewActions=['equip','reload','shoot','meleeContact','flourish','fidget','inspect'];
const effects=['impact','headshot','wound','muzzle','eject','explode'];

function snapshot(match,camera){
  const {player,actors,...state}=match.state;
  const {id,team,x,y,z,yaw,walking,quiet,crouch,burst}=player;
  return {
    state:{...state,player:{id,team,x,y,z,yaw,walking,quiet,crouch,burst}},
    position:camera.position.toArray(),
    rotation:camera.quaternion.toArray(),
    grenades:match.grenadePositions()
  };
}

export function runDuel(members,send,broadcast,onEnd){
  const round={players:[],score:[0,0],firstBlood:true};
  let active=false;
  const fx={reset(){}};
  for(const name of effects){
    fx[name]=(...args)=>{if(active)broadcast({type:'fx',name,args:args.map(arg=>arg?.isVector3?arg.toArray():arg)});};
  }
  const controllers=[];
  for(const [ws,member] of members){
    const camera=new T.PerspectiveCamera(78,1,.05,120);
    const view={update(){},setTeam(){}};
    for(const name of viewActions)view[name]=(...args)=>{if(active)send(ws,{type:'view',name,args});};
    const match=createMatch({
      scene:new T.Scene(),camera,world:{...world,fx},view,
      network:{round,player:{id:member.id,name:member.name}},
      emit(name,data){
        if(!active)return;
        if(name==='feed'||name==='tracer')broadcast({type:'event',name,data});
        if(name==='hit'||name==='hurt'||name==='sfx')send(ws,{type:'event',name,data});
      }
    });
    round.players.push(match.state.player);
    controllers.push({ws,member,camera,match,lookAck:0});
  }
  for(const controller of controllers){
    const {member,match}=controller;
    match.start({mode:'duel',team:member.team,...member.loadout});
    member.receive=data=>{
      if(data.type==='clear'){match.clearKeys();return;}
      if(data.type==='look'){
        if(!Number.isSafeInteger(data.seq)||data.seq<=controller.lookAck||!Number.isFinite(data.x)||!Number.isFinite(data.y))return;
        controller.lookAck=data.seq;
        match.look(T.MathUtils.clamp(data.x,-360,360),T.MathUtils.clamp(data.y,-360,360));
        return;
      }
      if(data.type!=='input')return;
      const {action,value}=data;
      if(booleans.has(action)&&typeof value==='boolean'||
        action==='slot'&&Number.isInteger(value)&&value>=0&&value<4||
        (action==='wheelQuick'||action==='cycle')&&(value===1||value===-1)||
        action==='last'&&value===true||
        action==='fov'&&Number.isFinite(value)||
        action==='primary'&&primaries.includes(value)||
        action==='melee'&&melees.includes(value))match.input(action,value);
    };
  }
  function sendState(type){
    const actors=round.players.map(({id,name,team,x,y,z,yaw,alive,deathT,walking,crouch,radarT})=>({id,name,team,x,y,z,yaw,alive,deathT,walking,crouch,radarT}));
    const views=controllers.map(controller=>snapshot(controller.match,controller.camera));
    const grenades=views.flatMap(view=>view.grenades);
    controllers.forEach(({ws,lookAck},index)=>{
      const {state,position,rotation}=views[index];
      send(ws,{type,state,position,rotation,actors,grenades,lookAck});
    });
  }
  for(const {match} of controllers)match.hud();
  active=true;
  sendState('started');
  let previous=performance.now(),accumulator=0,ticks=0;
  const timer=setInterval(()=>{
    const now=performance.now();
    accumulator+=Math.min(.1,(now-previous)/1000);
    previous=now;
    while(accumulator>=step){
      accumulator-=step;
      for(const {match} of controllers){
        match.update(step);
        if(round.score.some(score=>score>=match.state.target))break;
      }
      const expired=controllers[0].match.state.remaining===0;
      if(expired||round.score.some(score=>score>=controllers[0].match.state.target)){
        for(const {match} of controllers)match.finish();
        sendState('ended');
        stop();
        onEnd();
        return;
      }
      if(++ticks%2===0)sendState('state');
    }
  },8);
  function stop(){
    active=false;
    clearInterval(timer);
    for(const {member} of controllers)delete member.receive;
  }
  return stop;
}
