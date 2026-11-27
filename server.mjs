import {createServer} from 'node:http';
import {readFile, readdir} from 'node:fs/promises';
import {networkInterfaces} from 'node:os';
import {randomBytes} from 'node:crypto';
import {WebSocketServer, WebSocket} from 'ws';
import {runDuel} from './duel-server.mjs';

const port=Number(process.env.PORT??8787);
const addresses=Object.entries(networkInterfaces()).flatMap(([name,entries])=>entries
  .filter(address=>address.family==='IPv4'&&!address.internal)
  .map(({address})=>({address,name})));
const types={html:'text/html',js:'text/javascript',css:'text/css',svg:'image/svg+xml',webp:'image/webp',wav:'audio/wav',glb:'model/gltf-binary'};
const publicFiles=new Set((await readdir(new URL('./',import.meta.url),{withFileTypes:true}))
  .filter(entry=>entry.isFile()&&Object.hasOwn(types,entry.name.split('.').at(-1))).map(entry=>entry.name));
for(const file of await readdir(new URL('./assets/butterfly/',import.meta.url))){
  if(file.endsWith('.wav'))publicFiles.add('assets/butterfly/'+file);
}
publicFiles.add('assets/karambit/low_poly_karambit_bicagi.glb');
publicFiles.add('assets/bayonet/m9_bayonet_fade.glb');

const server=createServer(async(req,res)=>{
  if(req.method!=='GET'&&req.method!=='HEAD'){res.writeHead(405).end();return;}
  const file=req.url.split('?')[0].slice(1)||'index.html';
  if(file==='duel-server.json'){
    res.writeHead(200,{'Content-Type':'application/json','Cache-Control':'no-store'});
    res.end(JSON.stringify({game:'deckfire-duel',addresses}));return;
  }
  if(!publicFiles.has(file)){res.writeHead(404).end();return;}
  try{
    const data=await readFile(new URL(file,import.meta.url));
    res.writeHead(200,{'Content-Type':types[file.split('.').at(-1)],'Cache-Control':'no-cache'});
    res.end(data);
  }catch{res.writeHead(404).end();}
});
const wss=new WebSocketServer({noServer:true,maxPayload:2048});
server.on('upgrade',(req,socket,head)=>{
  if(req.url!=='/duel'||req.headers.origin!=='http://'+req.headers.host){socket.destroy();return;}
  wss.handleUpgrade(req,socket,head,ws=>wss.emit('connection',ws));
});

const rooms=new Map();
let nextId=1;
const playersPerTeam=1;
const send=(ws,data)=>{
  if(ws.readyState===WebSocket.OPEN&&ws.bufferedAmount<128_000)ws.send(JSON.stringify(data));
};
function publish(room,notice='',only=null){
  const players=[...room.members.values()].map(({id,name,team,ready})=>({id,name,team,ready}));
  for(const [ws,member] of room.members){
    if(only&&ws!==only)continue;
    send(ws,{type:'room',code:room.code,host:room.host.id,you:member.id,players,playersPerTeam,notice});
  }
}
function fail(ws,message){send(ws,{type:'error',message});}
function leave(ws){
  const room=ws.room;
  if(!room)return;
  ws.room=null;
  const member=room.members.get(ws);
  room.members.delete(ws);
  if(room.members.size===0){
    room.stop?.();
    rooms.delete(room.code);
    return;
  }
  if(room.host===member)room.host=room.members.values().next().value;
  const interrupted=!!room.stop;
  room.stop?.();
  room.stop=null;
  for(const member of room.members.values())member.ready=false;
  publish(room,interrupted?'对手已离开，本局结束。':'有玩家离开了房间。');
}
wss.on('connection',ws=>{
  ws.live=true;
  ws.limitSince=Date.now();
  ws.messages=0;
  ws.on('pong',()=>{ws.live=true;});
  ws.on('error',()=>leave(ws));
  ws.on('close',()=>leave(ws));
  ws.on('message',(raw,binary)=>{
    const now=Date.now();
    if(now-ws.limitSince>=1000){ws.limitSince=now;ws.messages=0;}
    if(++ws.messages>240){ws.close(1008);return;}
    if(binary)return;
    let data;
    try{data=JSON.parse(raw.toString());}catch{return;}
    if(!data||typeof data!=='object'||Array.isArray(data))return;
    if(data.type==='create'||data.type==='join'){
      if(ws.room)return;
      const name=typeof data.name==='string'?data.name.trim():'';
      if(!/^[\p{L}\p{N} _-]{1,16}$/u.test(name)){fail(ws,'昵称限 1–16 个汉字、字母、数字、空格或 _ -。');return;}
      let room=rooms.get(data.code);
      if(data.type==='create'){
        if(rooms.size>=32){fail(ws,'房间已达上限。');return;}
        const code=randomBytes(8).toString('hex');
        room={code,members:new Map(),host:null,stop:null};
        rooms.set(code,room);
      }
      if(!room){fail(ws,'房间不存在。请找房主获取新链接。');return;}
      if(room.stop||room.members.size>=2*playersPerTeam){fail(ws,'房间已满或正在对局。');return;}
      const team=[...room.members.values()].filter(member=>member.team===0).length<playersPerTeam?0:1;
      const member={id:nextId++,name,team,ready:false,loadout:{}};
      ws.room=room;
      room.members.set(ws,member);
      room.host??=member;
      publish(room);
      return;
    }
    const room=ws.room;
    if(!room)return;
    const member=room.members.get(ws);
    if(data.type==='leave'){leave(ws);return;}
    if(room.stop){member.receive?.(data);return;}
    if(data.type==='team'){
      if(data.team!==0&&data.team!==1||data.team===member.team)return;
      const otherSide=[...room.members.values()].filter(other=>other.team===data.team);
      if(otherSide.length>=playersPerTeam){
        if(playersPerTeam!==1||otherSide[0].ready){fail(ws,'该阵营已满。对手取消准备后可交换阵营。');return;}
        otherSide[0].team=member.team;
      }
      member.team=data.team;
      member.ready=false;
    }else if(data.type==='ready'){
      member.ready=data.ready===true;
      member.loadout={primary:data.primary,melee:data.melee};
    }else if(data.type==='start'){
      if(member!==room.host)return;
      const players=[...room.members.values()];
      if(![0,1].every(team=>players.filter(player=>player.team===team&&player.ready).length===playersPerTeam)){
        fail(ws,'双方选边并准备后才能开始。');return;
      }
      const broadcast=data=>{for(const peer of room.members.keys())send(peer,data);};
      room.stop=runDuel(room.members,send,broadcast,()=>{
        room.stop=null;
        for(const player of room.members.values())player.ready=false;
      });
      return;
    }else if(data.type==='lobby'){publish(room,'',ws);return;}
    else return;
    publish(room);
  });
});

setInterval(()=>{
  for(const ws of wss.clients){
    if(!ws.live){ws.terminate();continue;}
    ws.live=false;
    ws.ping();
  }
},10000).unref();

server.listen(port,'0.0.0.0',()=>{
  const actualPort=server.address().port;
  console.log('本机打开 http://127.0.0.1:'+actualPort);
  for(const {address,name} of addresses)console.log(name+' 好友访问 http://'+address+':'+actualPort);
});
