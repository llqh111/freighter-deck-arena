import {names,teams,groups,choices,selectors,board,weaponIcon} from './lobby.js';
import * as T from './three.module.js';
import {buildWorld} from './world.js?v=3';
import {createMatch} from './match.js?v=3';
import {createViewModel} from './viewmodel.js?v=3';

import {createDeckAudio} from './deck-audio.js?v=3';

const deckAudio=createDeckAudio();
const $=id=>document.getElementById(id);
const canvas=$('viewport'), panel=$('panel'), coarse=matchMedia('(pointer:coarse)').matches;
let renderer,world,match,view, elapsed=0, mode='menu', dialogKind='',lockPending=false;
let sensitivity=1, sound=true, draggingMouse=false, touchLook=null, locker=0;
try {sensitivity=Number(localStorage.getItem('df-sensitivity'))||1;sound=localStorage.getItem('df-sound')!=='off';}catch{}
const scene=new T.Scene(), camera=new T.PerspectiveCamera(72,1,.06,550);
const fly=new T.PerspectiveCamera(51,1,.15,550);
const icons={
  sound:'<path d="M11 5 6 9H3v6h3l5 4zM15 8a6 6 0 0 1 0 8m3-10a9 9 0 0 1 0 12"/>',
  mute:'<path d="M11 5 6 9H3v6h3l5 4zM16 9l6 6m0-6-6 6"/>',
  options:'<path d="M3 7h7m4 0h7M3 17h11m4 0h3"/><circle cx="12" cy="7" r="2.5"/><circle cx="16" cy="17" r="2.5"/>'};
function icon(key){return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+icons[key]+'</svg>';}
function setSound(){deckAudio.enable(sound && mode==='playing');match?.input('sound',sound);if(!sound)globalThis.speechSynthesis?.cancel();$('sound').innerHTML=icon(sound?'sound':'mute');$('sound').setAttribute('aria-label',sound?'关闭声音':'开启声音');$('sound').setAttribute('aria-pressed',String(sound));try{localStorage.setItem('df-sound',sound?'on':'off');}catch{}}
$('options').innerHTML=icon('options');setSound();
$('sound').onclick=()=>{sound=!sound;setSound();};
function setMode(next){fireFingers.clear();mobileCrouch=false;document.querySelector('[data-touch=crouch]').setAttribute('aria-pressed','false');if(next!=='playing')globalThis.speechSynthesis?.cancel();$('roster').hidden=true;mode=next;draggingMouse=false;touchLook=null;deckAudio.enable(sound && next==='playing');document.body.dataset.mode=mode;$('hud').hidden=mode==='menu';$('touch').hidden=!(coarse&&mode==='playing');}
function showDialog(kind,sub,title,html){
  dialogKind=kind;panel.dataset.dialog=kind;$('panelSub').textContent=sub;$('panelTitle').textContent=title;$('panelContent').innerHTML=html;
  if(!panel.open)panel.showModal();
}
const prefs={team:0,size:6,goal:50,diff:'normal',primary:'ak47',tod:'day',quality:coarse?'low':'high',vol:.8,fov:78};
try{const saved=JSON.parse(localStorage.getItem('df-lobby')||'{}');
  for(const [key,[,opts]] of Object.entries(groups))if(opts.some(([v])=>v===saved[key]))prefs[key]=saved[key];
  if(['ak47','m4a1','awm','mp5'].includes(saved.primary))prefs.primary=saved.primary;
  if(Number.isFinite(saved.vol))prefs.vol=T.MathUtils.clamp(saved.vol,0,1);if(Number.isFinite(saved.fov))prefs.fov=T.MathUtils.clamp(saved.fov,65,100);
}catch{}
function save(){try{localStorage.setItem('df-lobby',JSON.stringify(prefs));}catch{}}
function summary(){$('statSize').innerHTML=prefs.size+' <em>VS</em> '+prefs.size;$('statGoal').textContent=prefs.goal;$('statTime').textContent=prefs.size===3?'05:00':'10:00';$('primaryName').textContent=names[prefs.primary];}
function applyPref(key){
  if(key==='tod')world?.setTime(prefs.tod);
  if(key==='quality'){world?.setQuality(prefs.quality);if(renderer&&view)resize();}
  if(renderer&&(key==='tod'||key==='quality'))renderer.shadowMap.needsUpdate=true;
  if(key==='fov')match?.input('fov',prefs.fov);
  if(key==='vol')deckAudio.setVolume(prefs.vol);
  save();summary();
}
function bindPrefs(){
  for(const btn of panel.querySelectorAll('[data-pref]'))btn.onclick=()=>{
    const key=btn.dataset.pref;prefs[key]=typeof prefs[key]==='number'?Number(btn.dataset.value):btn.dataset.value;
    for(const peer of btn.parentElement.querySelectorAll('button'))peer.setAttribute('aria-pressed',String(peer===btn));applyPref(key);
  };
}
function armory(inGame=false){
  if(inGame){if(mode==='playing')match.pause();setMode('paused');release();}
  showDialog(inGame?'loadout':'armory','LOADOUT','选择主武器',choices(prefs.primary)+'<p class="panelNote">副武器、军刀和手雷随身配备。出生区内更换立即生效，离开出生区后在下次复活时领取。</p>');
  for(const b of panel.querySelectorAll('[data-weapon]'))b.onclick=()=>{
    prefs.primary=b.dataset.weapon;save();summary();
    if(inGame){const when=match.input('primary',prefs.primary);resume();notify((when==='now'?'已装备 ':'复活后装备 ')+names[prefs.primary]);}else closePanel();
  };
}
function setup(){showDialog('setup','MATCH SETUP','对局配置',selectors(prefs,['team','size','goal','diff','tod','quality'])+'<div class="actions"><button id="setupDone" class="primary">完成</button></div>');bindPrefs();$('setupDone').onclick=closePanel;}
const controlRows=()=>coarse?'<p class="panelNote">左侧摇杆移动，右侧拖动转向。轻点武器栏选择装备，暂停菜单可换装或查看战绩。</p>':[['移动 / 静步 / 冲刺','WASD / Shift / X'],['下蹲 / 跳跃','C / 空格'],['射击 / 瞄准或重击','鼠标左键 / 右键'],['武器槽 / 快切','1–4 / Q / 滚轮'],['换弹 / 检视 / 换装','R / F / B'],['战绩 / 暂停','Tab / Esc']].map(([a,b])=>'<div class="row"><span>'+a+'</span><kbd>'+b+'</kbd></div>').join('');
function settings(){
  let ranges='';for(const [id,name,min,max,step,value] of [['sens','视角灵敏度',.2,3,.05,sensitivity],['fov','视野',65,100,1,prefs.fov],['vol','音量',0,1,.05,prefs.vol]])ranges+='<div class="row"><label for="'+id+'">'+name+'</label><input type="range" id="'+id+'" min="'+min+'" max="'+max+'" step="'+step+'" value="'+value+'"><output>'+value+'</output></div>';
  showDialog('settings','CONTROLS','设置与操作',ranges+selectors(prefs,['tod','quality'])+controlRows()+'<div class="row"><span>游戏声音</span><button id="audioToggle" class="secondary">'+(sound?'开启':'关闭')+'</button></div>');
  for(const el of panel.querySelectorAll('input'))el.oninput=()=>{
    el.nextElementSibling.value=el.value;if(el.id==='sens'){sensitivity=+el.value;try{localStorage.setItem('df-sensitivity',sensitivity);}catch{}}
    else{prefs[el.id]=+el.value;applyPref(el.id);}
  };bindPrefs();
  if(location.protocol!=='file:'){
    const download=document.createElement('a');download.className='offline';download.href='./transport-ship.html';download.download='运输船-离线版.html';download.textContent='下载单文件离线版';$('panelContent').append(download);
  }
  $('audioToggle').onclick=()=>{sound=!sound;setSound();$('audioToggle').textContent=sound?'开启':'关闭';};
}
$('battleSetup').onclick=setup;$('armory').onclick=()=>armory(false);summary();
$('controls').onclick=$('options').onclick=settings;
function drawMap(target,state=null,horizontal=false){
  if(!world||!target)return;
  const ctx=target.getContext('2d'),w=target.width,h=target.height;
  const b=world.bounds,m=8,dx=b.maxX-b.minX,dz=b.maxZ-b.minZ;
  const sc=Math.min((w-2*m)/(horizontal?dz:dx),(h-2*m)/(horizontal?dx:dz));
  ctx.clearRect(0,0,w,h);ctx.save();ctx.translate(w/2,h/2);if(horizontal)ctx.rotate(-Math.PI/2);ctx.scale(sc,sc);
  ctx.fillStyle='#203138';ctx.strokeStyle='#8a9c95';ctx.lineWidth=1/sc;
  ctx.fillRect(-dx/2,-dz/2,dx,dz);ctx.strokeRect(-dx/2,-dz/2,dx,dz);
  for(const s of world.solids){
    ctx.save();ctx.translate(s.x,s.z);ctx.rotate(-(s.yaw||0));
    ctx.fillStyle=s.bottom>1.8?'#65757566':s.top<2?'#a5997b':'#6d807e';
    ctx.fillRect(-s.w/2,-s.d/2,s.w,s.d);ctx.restore();
  }
  for(let t=0;t<2;t++){
    ctx.fillStyle=t?'#ff816e':'#78cbea';const z=world.spawns[t][0].z;
    ctx.fillRect(-dx*.35,z-0.55,dx*.7,1.1);
  }
  for(const {entry,exit} of world.vents||[]){
    const x=exit.x-entry.x,z=exit.z-entry.z,length=Math.hypot(x,z);
    ctx.save();ctx.translate(entry.x,entry.z);ctx.rotate(Math.atan2(z,x));
    ctx.strokeStyle='#f1c675';ctx.fillStyle='#f1c675';ctx.lineWidth=.26;
    ctx.setLineDash([.8,.65]);ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(length-.8,0);ctx.stroke();
    ctx.beginPath();ctx.moveTo(length,0);ctx.lineTo(length-1.5,-.82);ctx.lineTo(length-1.5,.82);ctx.closePath();ctx.fill();ctx.restore();
  }
  if(state){for(const a of state.actors){if(!a.alive||a.team!==state.team&&!(a.radarT>0))continue;ctx.beginPath();ctx.fillStyle=a.team===state.team?'#8ed1ee':'#ff8170';ctx.arc(a.x,a.z,.75,0,7);ctx.fill();}
    if(state.alive){const p=state.player;ctx.translate(p.x,p.z);ctx.rotate(-p.yaw);ctx.beginPath();ctx.moveTo(0,-1.55);ctx.lineTo(.95,.90);ctx.lineTo(0,.55);ctx.lineTo(-.95,.90);ctx.closePath();ctx.fillStyle='#ffce64';ctx.fill();}
  }
  ctx.restore();
}
$('openMap').onclick=()=>{if(!world)return;showDialog('map','DECK PLAN','甲板平面图','<canvas width="760" height="390" class="fullchart" id="fullChart"></canvas><div class="legend"><span><b style="color:var(--ice)">■</b>保卫者舱室</span><span><b style="color:var(--red)">■</b>潜伏者舱室</span><span><b style="color:var(--gold)">➤</b>管道出口方向</span></div>');drawMap($('fullChart'),null,true);};
function notify(msg){$('notice').hidden=false;$('notice').textContent=msg;clearTimeout(notify.timer);notify.timer=setTimeout(()=>{$('notice').hidden=true;},4200);}
function lock(){
  if(coarse||document.pointerLockElement===canvas)return;
  if(!canvas.requestPointerLock){notify('拖动鼠标转向，按住左键开火。');return;}
  lockPending=true;clearTimeout(locker);locker=setTimeout(()=>{lockPending=false;},700);
  try{const req=canvas.requestPointerLock();req?.catch(()=>{lockPending=false;notify('点击画面锁定鼠标，也可以拖动转向。');});}catch{lockPending=false;}
}
function release(){if(document.pointerLockElement)document.exitPointerLock();}
function closePanel(){if(panel.open)panel.close();dialogKind='';}
function start(){clearAnnouncement();deckAudio.reset();closePanel();$('feed').replaceChildren();$('notice').hidden=true;setMode('playing');setSound();match.start(prefs);match.input('fov',prefs.fov);canvas.focus();lock();}
function resume(){closePanel();setMode('playing');match.resume();canvas.focus();lock();}
function toMenu(){closePanel();release();setMode('menu');drawMap($('chart'),null,true);}
function pauseUI(){
  if(mode!=='playing'&&mode!=='paused')return;
  match.pause();setMode('paused');release();
  showDialog('pause','MATCH PAUSED','对局已暂停','<div class="actions"><button id="resume" class="primary">继续对局</button><button id="inLoadout" class="secondary">更换主武器</button><button id="inBoard" class="secondary">查看战绩</button><button id="inSettings" class="secondary">设置与操作</button><button id="leave" class="secondary">返回甲板首页</button></div>');
  $('inLoadout').onclick=()=>armory(true);$('inBoard').onclick=()=>showDialog('board','SCOREBOARD','团队战绩',board(match.state));$('resume').onclick=resume;$('inSettings').onclick=settings;$('leave').onclick=toMenu;
}
function dismiss(){if(dialogKind==='loadout'){resume();return;}if(dialogKind==='end'){toMenu();return;}if(dialogKind==='pause'){resume();return;}closePanel();if(mode==='paused')pauseUI();}
$('closePanel').onclick=dismiss;panel.oncancel=e=>{e.preventDefault();dismiss();};
$('deploy').onclick=start;$('pauseHud').onclick=pauseUI;
let calloutAnimation;
function clearAnnouncement(){
  calloutAnimation?.cancel();
  $('callout').hidden=true;
}
function announceHit(data){
  if(!data.kill)return;
  const banner=$('callout');
  $('killTitle').textContent=data.multi>1?data.multi+' 连杀':data.head?'爆头击杀':data.wall?'穿箱击杀':data.weapon==='knife'?'近身击杀':data.weapon==='he'?'手雷击杀':'确认击杀';
  $('killDetail').textContent=(data.head&&data.multi>1?'爆头 · ':'')+(data.victim||'');
  banner.hidden=false;
  calloutAnimation?.cancel();
  calloutAnimation=banner.animate([{opacity:0},{opacity:1,offset:.1},{opacity:1,offset:.74},{opacity:0}],{duration:1800,fill:'forwards'});
  deckAudio.cue(data.head?'headshot':'kill');
  if(sound&&prefs.vol>0&&(data.head||data.multi>1)&&window.speechSynthesis&&typeof SpeechSynthesisUtterance==='function'){
    const line=new SpeechSynthesisUtterance(data.multi>1?data.multi+' 连杀':'爆头');line.lang='zh-CN';line.volume=prefs.vol*.6;line.rate=1.15;
    speechSynthesis.cancel();speechSynthesis.speak(line);
  }
}
let rackKey='',boardKey='',lastBearing=null;
const labelPosition=new T.Vector3();
function friendTags(state){
  const group=$('friendTags');const mates=state.actors.filter(a=>a.alive&&a.team===state.team);
  while(group.children.length<mates.length)group.append(document.createElement('small'));
  for(let i=0;i<group.children.length;i++){
    const tag=group.children[i],a=mates[i];if(!a){tag.hidden=true;continue;}
    labelPosition.set(a.x,a.y+1.98,a.z).project(camera);
    tag.hidden=labelPosition.z<0||labelPosition.z>1||Math.abs(labelPosition.x)>1||Math.abs(labelPosition.y)>1;
    if(!tag.hidden){tag.textContent=a.name;tag.style.left=(50+50*labelPosition.x)+'%';tag.style.top=(50-50*labelPosition.y)+'%';}
  }
}
function hudEvent(type,data){
  if(type==='sfx'){deckAudio.sfx(data);return;}

  if(type==='hud'){
    for(const [id,val] of [['blue',String(data.score[0]).padStart(2,'0')],['red',String(data.score[1]).padStart(2,'0')],['hp',data.hp],['ammo',data.ammo],['reserve',data.reserve]]) $(id).textContent=val;
    $('goalText').textContent='目标 '+data.target;$('weaponName').textContent=names[data.weapon];$('armor').textContent=data.armor;
    if(data.weapon==='knife')$('ammo').textContent='∞';
    $('scopeOverlay').hidden=!data.zoom||!data.alive;
    $('aimName').textContent=data.aimName||'';$('aimName').style.color=data.aimTeam===data.team?'var(--ice)':'var(--red)';
    $('protection').textContent=data.protect>0&&data.alive?'出生保护 '+data.protect.toFixed(1)+' s':'';
    $('hud').classList.toggle('lowhp',data.hp<30&&data.alive);$('viewport').classList.toggle('spectate',!data.alive);
    $('cross').style.scale=String(1+Math.min(1.7,(data.spread||0)*12));
    const key=data.inventory.map(w=>w.id).join('/')+data.slot;
    if(key!==rackKey){rackKey=key;$('slotRack').innerHTML=data.inventory.map((w,i)=>'<button data-slot="'+i+'" class="'+(data.slot===i?'selected':'')+'" aria-label="'+names[w.id]+'"><b>'+(i+1)+'</b>'+weaponIcon(w.id)+'</button>').join('');}
    if(!$('roster').hidden){const html=board(data);if(html!==boardKey){boardKey=html;$('roster').innerHTML=html;}}
    if(lastBearing!==null)$('bearing').style.transform='translate(-50%,-50%) rotate('+(data.player.yaw-lastBearing)+'rad)';
    friendTags(data);
    const s=Math.ceil(data.remaining);$('clock').textContent=[Math.floor(s/60),s%60].map(v=>String(v).padStart(2,'0')).join(':');
    document.querySelector('.hpbar i').style.width=data.hp+'%';$('gunstatus').textContent=data.reloading?'正在换弹':data.aiming?'瞄准':data.weapon==='knife'?'右键重击':data.weapon==='he'?'投掷':!data.ammo?'弹匣已空':'就绪';
    $('cross').hidden=data.aiming||!data.alive;$('respawn').hidden=data.alive||data.phase==='ended';
    $('slotRack').hidden=!data.alive;
    if(!data.alive)$('respawn').textContent='被 '+data.killedBy+' 击倒 · '+Math.ceil(data.respawnIn)+' 秒后复活';drawMap($('radar'),data);
  }else if(type==='hit'||type==='hurt'){
    if(type==='hit')announceHit(data);
    else if(Number.isFinite(data.bearing)){lastBearing=data.bearing;$('bearing').hidden=false;$('bearing').animate([{opacity:1},{opacity:0}],{duration:850,fill:'forwards'});}
    const e=$(type==='hit'?'hit':'damage');e.classList.toggle('kill',!!data.kill);e.animate([{opacity:1},{opacity:0}],{duration:type==='hit'?160:300});
  }else if(type==='feed'){
    const line=document.createElement('div');const who=document.createElement('b');who.style.color=data.team?'var(--red)':'var(--ice)';who.textContent=data.killer;
    line.append(who,'　'+(names[data.weapon]||'')+(data.head?' · 爆头':'')+(data.wall?' · 穿箱':'')+'　'+data.victim);$('feed').prepend(line);while($('feed').children.length>3)$('feed').lastChild.remove();setTimeout(()=>line.remove(),4000);
  }else if(type==='end'){
    setMode('ended');release();const [b,r]=data.score;
    const win=data.score[data.team]>data.score[1-data.team];
    const mvp=[...data.scoreboard].sort((a,b)=>(b.kills*2-b.deaths+b.headshots)-(a.kills*2-a.deaths+a.headshots))[0];
    showDialog('end','MATCH RESULT',b===r?'双方平局':win?'我方胜利':'对方胜利','<div class="result"><span>'+b+'</span> · <b>'+r+'</b></div><div class="row">MVP <b>'+mvp.name+' · '+mvp.kills+' 击杀</b></div><p class="panelNote">你的战绩　'+data.kills+' 击杀 · '+data.deaths+' 阵亡 · '+data.headshots+' 爆头 · 命中率 '+data.accuracy+'%</p>'+board(data)+'<div class="actions"><button id="again" class="primary">再来一局</button><button id="home" class="secondary">返回首页</button></div>');$('again').onclick=start;$('home').onclick=toMenu;
  }
}
const keys={KeyW:'forward',KeyS:'back',KeyA:'left',KeyD:'right',Space:'jump',ShiftLeft:'walk',ShiftRight:'walk',KeyX:'sprint',KeyC:'crouch',ArrowLeft:'left',ArrowRight:'right',KeyR:'reload',ArrowUp:'forward',ArrowDown:'back'};
for(const kind of ['keydown','keyup'])addEventListener(kind,e=>{
  const down=kind==='keydown';
  if(e.code==='KeyB'&&down&&!e.repeat&&dialogKind==='loadout'){e.preventDefault();resume();return;}
  if(e.key==='Escape'&&down&&mode==='playing'){e.preventDefault();pauseUI();return;}
  if(down&&e.key==='?'&&mode==='menu'&&!panel.open)settings();
  if(mode!=='playing'||!match)return;
  if(e.code==='Tab'){e.preventDefault();$('roster').hidden=!down;if(down){$('roster').innerHTML=board(match.state);}return;}
  if(down&&!e.repeat){
    if(/^Digit[1-4]$/.test(e.code))match.input('slot',Number(e.code.at(-1))-1);
    if(e.code==='KeyQ')match.input('last',true);
    if(e.code==='KeyF')view.inspect();
    if(e.code==='KeyB'){e.preventDefault();armory(true);return;}
  }
  if(keys[e.code]){e.preventDefault();match.input(keys[e.code],down);}
});
$('slotRack').addEventListener('pointerdown',e=>{const btn=e.target.closest('[data-slot]');if(btn&&mode==='playing')match.input('slot',+btn.dataset.slot);});
canvas.addEventListener('wheel',e=>{if(mode==='playing'){e.preventDefault();match.input('cycle',Math.sign(e.deltaY));}},{passive:false});
canvas.addEventListener('contextmenu',e=>e.preventDefault());
// Mouse events report each button transition, including a second press during ADS.
function syncMouse(buttons){
  draggingMouse=!!(buttons&3);
  match.input('fire',!!(buttons&1));
  match.input('aim',!!(buttons&2));
}
canvas.addEventListener('mousedown',e=>{
  if(mode!=='playing'||e.sourceCapabilities?.firesTouchEvents||!(e.button===0||e.button===2))return;
  if(!document.pointerLockElement&&!lockPending)lock();
  syncMouse(e.buttons);
});
window.addEventListener('mouseup',e=>{
  if(mode==='playing'&&draggingMouse&&!e.sourceCapabilities?.firesTouchEvents)syncMouse(e.buttons);
});
document.addEventListener('mousemove',e=>{
  if(mode==='playing'&&(document.pointerLockElement===canvas||draggingMouse))match.look(e.movementX*sensitivity,e.movementY*sensitivity);
});
canvas.addEventListener('pointerdown',e=>{
  if(mode!=='playing'||e.pointerType!=='touch'||touchLook!==null)return;
  touchLook={id:e.pointerId,x:e.clientX,y:e.clientY};canvas.setPointerCapture(e.pointerId);
});
canvas.addEventListener('pointermove',e=>{
  if(mode!=='playing'||touchLook?.id!==e.pointerId)return;
  match.look((e.clientX-touchLook.x)*2*sensitivity,(e.clientY-touchLook.y)*2*sensitivity);
  touchLook.x=e.clientX;touchLook.y=e.clientY;
});
canvas.addEventListener('lostpointercapture',e=>{if(touchLook?.id===e.pointerId)touchLook=null;});
let hadLock=false;
document.addEventListener('pointerlockchange',()=>{const active=document.pointerLockElement===canvas;if(hadLock&&!active&&mode==='playing')pauseUI();hadLock=active;lockPending=false;});
addEventListener('blur',()=>{if(mode==='playing')pauseUI();});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&mode==='playing')pauseUI();});
const stick=$('stick');let stickId=null;
function stickMove(e){const r=stick.getBoundingClientRect(),dx=(e.clientX-r.left)/r.width*2-1,dy=(e.clientY-r.top)/r.height*2-1;
  for(const [k,v] of [['left',dx<-.22],['right',dx>.22],['forward',dy<-.22],['back',dy>.22]])match.input(k,v);
  stick.firstElementChild.style.transform='translate('+Math.max(-25,Math.min(25,dx*25))+'px,'+Math.max(-25,Math.min(25,dy*25))+'px)';}
stick.onpointerdown=e=>{stickId=e.pointerId;stick.setPointerCapture(stickId);stickMove(e);};stick.onpointermove=e=>{if(stickId===e.pointerId)stickMove(e);};stick.onlostpointercapture=()=>{stickId=null;for(const k of ['left','right','forward','back'])match.input(k,false);stick.firstElementChild.style.transform='none';};
const fireFingers=new Set();let mobileCrouch=false;
for(const btn of document.querySelectorAll('[data-touch]')){
  const action=btn.dataset.touch;
  btn.onpointerdown=e=>{
    btn.setPointerCapture(e.pointerId);
    if(action==='crouch'){mobileCrouch=!mobileCrouch;match.input('crouch',mobileCrouch);btn.setAttribute('aria-pressed',String(mobileCrouch));return;}
    if(action==='fire')fireFingers.add(e.pointerId);
    match.input(action,action==='cycle'?1:true);
  };
  btn.onlostpointercapture=e=>{
    if(action==='fire'){fireFingers.delete(e.pointerId);if(fireFingers.size)return;}
    if(action!=='cycle'&&action!=='crouch')match.input(action,false);
  };
}
function resize(){
  const w=innerWidth,h=innerHeight,aspect=w/h;
  renderer.setPixelRatio(Math.min(devicePixelRatio,prefs.quality==='low'?1:prefs.quality==='medium'?1.3:1.8));renderer.setSize(w,h,false);
  for(const c of [camera,fly]){c.aspect=aspect;c.updateProjectionMatrix();}view.resize(aspect);
}
function render(time){
  const t=time*.001,dt=Math.min(.08,Math.max(0,t-elapsed));elapsed=t;
  world.update(t,dt);
  if(mode==='menu'){
    const drift=Math.sin(t*.07)*.6;
    fly.position.set(19+drift,11.3,28.8);fly.lookAt(-1.9,2.0,-6.3);
    renderer.clear();renderer.render(scene,fly);
  }else{
    if(mode==='playing'){
      match.update(dt,t);
      const s=match.state;
      deckAudio.step(dt,{walking:s.player.walking,sprint:s.sprinting,grounded:s.grounded,alive:s.alive,hp:s.hp,quiet:s.crouching||s.player.quiet});
    }
    renderer.clear();renderer.render(scene,camera);
    if(match.state.alive&&!match.state.zoom){renderer.clearDepth();renderer.render(view.scene,view.camera);}
  }
}
async function init(){
  try{
    renderer=new T.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance',alpha:false});renderer.autoClear=false;
    renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;renderer.shadowMap.autoUpdate=false;renderer.shadowMap.needsUpdate=true;
    world=buildWorld(scene);view=createViewModel();match=createMatch({scene,camera,world,view,emit:hudEvent});for(const key of ['quality','tod','vol','fov'])applyPref(key);setSound();resize();
    render(performance.now());drawMap($('chart'),null,true);renderer.setAnimationLoop(render);
    $('deploy').disabled=false;$('deployLabel').textContent='开始对局';$('readyText').textContent='甲板就绪';addEventListener('resize',resize);
  }catch(e){console.error(e);$('deployLabel').textContent='无法载入';$('readyText').textContent='3D 场景未能启动';notify('无法启动 3D 画面。请在开启硬件加速的 Chrome 或 Edge 中打开。');}
}
init();