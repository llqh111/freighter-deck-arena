import * as T from './three.module.js';
import {buildWorld} from './world.js';
import {createMatch} from './match.js';
import {createViewModel} from './viewmodel.js';

const $=id=>document.getElementById(id);
const canvas=$('viewport'), panel=$('panel'), coarse=matchMedia('(pointer:coarse)').matches;
let renderer,world,match,view, elapsed=0, mode='menu', dialogKind='',lockPending=false;
let sensitivity=1, sound=true, pointerDrag=null, touchLook=null, locker=0;
try {sensitivity=Number(localStorage.getItem('df-sensitivity'))||1;sound=localStorage.getItem('df-sound')!=='off';}catch{}
const scene=new T.Scene(), camera=new T.PerspectiveCamera(72,1,.06,550);
const fly=new T.PerspectiveCamera(51,1,.15,550);
const icons={
  sound:'<path d="M11 5 6 9H3v6h3l5 4zM15 8a6 6 0 0 1 0 8m3-10a9 9 0 0 1 0 12"/>',
  mute:'<path d="M11 5 6 9H3v6h3l5 4zM16 9l6 6m0-6-6 6"/>',
  options:'<path d="M3 7h7m4 0h7M3 17h11m4 0h3"/><circle cx="12" cy="7" r="2.5"/><circle cx="16" cy="17" r="2.5"/>'};
function icon(key){return '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+icons[key]+'</svg>';}
function setSound(){match?.input('sound',sound);$('sound').innerHTML=icon(sound?'sound':'mute');$('sound').setAttribute('aria-label',sound?'关闭声音':'开启声音');$('sound').setAttribute('aria-pressed',String(sound));try{localStorage.setItem('df-sound',sound?'on':'off');}catch{}}
$('options').innerHTML=icon('options');setSound();
$('sound').onclick=()=>{sound=!sound;setSound();};
function setMode(next){mode=next;document.body.dataset.mode=mode;$('hud').hidden=mode==='menu';$('touch').hidden=!(coarse&&mode==='playing');}
function showDialog(kind,sub,title,html){
  dialogKind=kind;$('panelSub').textContent=sub;$('panelTitle').textContent=title;$('panelContent').innerHTML=html;
  if(!panel.open)panel.showModal();
}
const controlRows=()=>coarse?'<div class="row">左侧摇杆移动，拖动右侧画面转向。</div><div class="row">用右下按钮开火、瞄准、换弹与跳跃。</div>':[['移动','W A S D'],['转向','鼠标'],['射击 / 瞄准','左键 / 右键'],['换弹 / 跳跃','R / 空格'],['奔跑 / 暂停','Shift / Esc']].map(([a,b])=>'<div class="row"><span>'+a+'</span><kbd>'+b+'</kbd></div>').join('');
function settings(){
  showDialog('settings','CONTROLS','设置与操作',controlRows()+'<div class="row"><label for="sens">视角灵敏度</label><input id="sens" type="range" min="0.4" max="2" step="0.1" value="'+sensitivity+'"><output id="sensValue">'+sensitivity.toFixed(1)+'</output></div><div class="row"><span>游戏声音</span><button id="audioToggle" class="secondary">'+(sound?'开启':'关闭')+'</button></div>');
  $('sens').oninput=e=>{sensitivity=+e.target.value;$('sensValue').value=sensitivity.toFixed(1);try{localStorage.setItem('df-sensitivity',sensitivity);}catch{}};
  $('audioToggle').onclick=()=>{sound=!sound;setSound();$('audioToggle').textContent=sound?'开启':'关闭';};
}
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
    ctx.fillStyle=s.bottom>1.8?'#65757566':s.top<2?'#a5997b':'#6d807e';
    ctx.fillRect(s.x-s.w/2,s.z-s.d/2,s.w,s.d);
  }
  for(let t=0;t<2;t++){
    ctx.fillStyle=t?'#ff816e':'#78cbea';const z=world.spawns[t][0].z;
    ctx.fillRect(-dx*.35,z-0.55,dx*.7,1.1);
  }
  if(state){for(const a of state.actors){if(!a.alive||a.team!==0)continue;ctx.beginPath();ctx.fillStyle='#8ed1ee';ctx.arc(a.x,a.z,.75,0,7);ctx.fill();}
    if(state.alive){const p=state.player;ctx.translate(p.x,p.z);ctx.rotate(-p.yaw);ctx.beginPath();ctx.moveTo(0,-1.55);ctx.lineTo(.95,.90);ctx.lineTo(0,.55);ctx.lineTo(-.95,.90);ctx.closePath();ctx.fillStyle='#ffce64';ctx.fill();}
  }
  ctx.restore();
}
$('openMap').onclick=()=>{if(!world)return;showDialog('map','DECK PLAN','甲板平面图','<canvas width="760" height="390" class="fullchart" id="fullChart"></canvas><div class="legend"><span><b style="color:var(--ice)">■</b>我方舱室</span><span><b style="color:var(--red)">■</b>对方舱室</span></div>');drawMap($('fullChart'),null,true);};
function notify(msg){$('notice').hidden=false;$('notice').textContent=msg;clearTimeout(notify.timer);notify.timer=setTimeout(()=>{$('notice').hidden=true;},4200);}
function lock(){
  if(coarse||document.pointerLockElement===canvas)return;
  if(!canvas.requestPointerLock){notify('拖动鼠标转向，按住左键开火。');return;}
  lockPending=true;clearTimeout(locker);locker=setTimeout(()=>{lockPending=false;},700);
  try{const req=canvas.requestPointerLock();req?.catch(()=>{lockPending=false;notify('点击画面锁定鼠标，也可以拖动转向。');});}catch{lockPending=false;}
}
function release(){if(document.pointerLockElement)document.exitPointerLock();}
function closePanel(){if(panel.open)panel.close();dialogKind='';}
function start(){closePanel();$('feed').replaceChildren();$('notice').hidden=true;setMode('playing');setSound();match.start();canvas.focus();lock();}
function resume(){closePanel();setMode('playing');match.resume();canvas.focus();lock();}
function toMenu(){closePanel();release();setMode('menu');drawMap($('chart'),null,true);}
function pauseUI(){
  if(mode!=='playing'&&mode!=='paused')return;
  match.pause();setMode('paused');release();
  showDialog('pause','MATCH PAUSED','对局已暂停','<div class="actions"><button id="resume" class="primary">继续对局</button><button id="inSettings" class="secondary">设置与操作</button><button id="leave" class="secondary">返回甲板首页</button></div>');
  $('resume').onclick=resume;$('inSettings').onclick=settings;$('leave').onclick=toMenu;
}
function dismiss(){if(dialogKind==='end'){toMenu();return;}if(dialogKind==='pause'){resume();return;}closePanel();if(mode==='paused')pauseUI();}
$('closePanel').onclick=dismiss;panel.oncancel=e=>{e.preventDefault();dismiss();};
$('deploy').onclick=start;$('pauseHud').onclick=pauseUI;
function hudEvent(type,data){
  if(type==='hud'){
    for(const [id,val] of [['blue',String(data.score[0]).padStart(2,'0')],['red',String(data.score[1]).padStart(2,'0')],['hp',data.hp],['ammo',data.ammo],['reserve',data.reserve]]) $(id).textContent=val;
    const s=Math.ceil(data.remaining);$('clock').textContent=[Math.floor(s/60),s%60].map(v=>String(v).padStart(2,'0')).join(':');
    document.querySelector('.hpbar i').style.width=data.hp+'%';$('gunstatus').textContent=data.reloading?'正在换弹':data.aiming?'瞄准':'制式步枪';
    $('cross').hidden=data.aiming||!data.alive;$('respawn').hidden=data.alive||data.phase==='ended';
    if(!data.alive)$('respawn').textContent='重返甲板 · '+Math.ceil(data.respawnIn)+' 秒';drawMap($('radar'),data);
  }else if(type==='hit'||type==='hurt'){
    const e=$(type==='hit'?'hit':'damage');e.classList.toggle('kill',!!data.kill);e.animate([{opacity:1},{opacity:0}],{duration:type==='hit'?160:300});
  }else if(type==='feed'){
    const line=document.createElement('div');const who=document.createElement('b');who.style.color=data.team?'var(--red)':'var(--ice)';who.textContent=data.killer;
    line.append(who,'　›　'+data.victim);$('feed').prepend(line);while($('feed').children.length>3)$('feed').lastChild.remove();setTimeout(()=>line.remove(),4000);
  }else if(type==='end'){
    setMode('ended');release();const [b,r]=data.score;
    showDialog('end','MATCH RESULT',b===r?'双方平局':b>r?'我方胜利':'对方胜利','<div class="result"><span>'+b+'</span> · <b>'+r+'</b></div><div class="row">个人击杀 <b>'+data.kills+'</b></div><div class="row">个人阵亡 <b>'+data.deaths+'</b></div><div class="actions"><button id="again" class="primary">再来一局</button><button id="home" class="secondary">返回首页</button></div>');$('again').onclick=start;$('home').onclick=toMenu;
  }
}
const keys={KeyW:'forward',KeyS:'back',KeyA:'left',KeyD:'right',Space:'jump',ShiftLeft:'sprint',ShiftRight:'sprint',KeyR:'reload',ArrowUp:'forward',ArrowDown:'back'};
for(const kind of ['keydown','keyup'])addEventListener(kind,e=>{
  const down=kind==='keydown';
  if(e.key==='Escape'&&down&&mode==='playing'){e.preventDefault();pauseUI();return;}
  if(down&&e.key==='?'&&mode==='menu'&&!panel.open)settings();
  if(mode!=='playing'||!match)return;
  if(keys[e.code]){e.preventDefault();match.input(keys[e.code],down);}
});
canvas.addEventListener('contextmenu',e=>e.preventDefault());
canvas.addEventListener('pointerdown',e=>{
  if(mode!=='playing')return;if(e.pointerType==='touch'){if(touchLook===null){touchLook={id:e.pointerId,x:e.clientX,y:e.clientY};canvas.setPointerCapture(e.pointerId);}return;}
  pointerDrag=e.pointerId;if(!document.pointerLockElement&&!lockPending)lock();
  if(e.button===0||e.button===2)match.input(e.button===2?'aim':'fire',true);
});
document.addEventListener('pointermove',e=>{
  if(mode!=='playing')return;
  if(touchLook?.id===e.pointerId){match.look((e.clientX-touchLook.x)*2*sensitivity,(e.clientY-touchLook.y)*2*sensitivity);touchLook.x=e.clientX;touchLook.y=e.clientY;return;}
  if(e.pointerType!=='touch'&&!document.pointerLockElement&&pointerDrag===e.pointerId)match.look(e.movementX*sensitivity,e.movementY*sensitivity);
});
for(const kind of ['pointerup','pointercancel'])document.addEventListener(kind,e=>{
  if(touchLook?.id===e.pointerId)touchLook=null;
  if(e.pointerType!=='touch'){pointerDrag=null;if(e.button===0||e.button===2)match?.input(e.button===2?'aim':'fire',false);}
});
document.addEventListener('mousemove',e=>{if(mode==='playing'&&document.pointerLockElement===canvas)match.look(e.movementX*sensitivity,e.movementY*sensitivity);});
document.addEventListener('mouseup',e=>{if(mode==='playing'&&(e.button===0||e.button===2))match.input(e.button===2?'aim':'fire',false);});
let hadLock=false;
document.addEventListener('pointerlockchange',()=>{const active=document.pointerLockElement===canvas;if(hadLock&&!active&&mode==='playing')pauseUI();hadLock=active;lockPending=false;});
addEventListener('blur',()=>{if(mode==='playing')pauseUI();});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&mode==='playing')pauseUI();});
const stick=$('stick');let stickId=null;
function stickMove(e){const r=stick.getBoundingClientRect(),dx=(e.clientX-r.left)/r.width*2-1,dy=(e.clientY-r.top)/r.height*2-1;
  for(const [k,v] of [['left',dx<-.22],['right',dx>.22],['forward',dy<-.22],['back',dy>.22]])match.input(k,v);
  stick.firstElementChild.style.transform='translate('+Math.max(-25,Math.min(25,dx*25))+'px,'+Math.max(-25,Math.min(25,dy*25))+'px)';}
stick.onpointerdown=e=>{stickId=e.pointerId;stick.setPointerCapture(stickId);stickMove(e);};stick.onpointermove=e=>{if(stickId===e.pointerId)stickMove(e);};stick.onlostpointercapture=()=>{stickId=null;for(const k of ['left','right','forward','back'])match.input(k,false);stick.firstElementChild.style.transform='none';};
for(const btn of document.querySelectorAll('[data-touch]')){const k=btn.dataset.touch;btn.onpointerdown=e=>{btn.setPointerCapture(e.pointerId);match.input(k,true);};btn.onlostpointercapture=()=>match.input(k,false);}
function resize(){
  const w=innerWidth,h=innerHeight,aspect=w/h;
  renderer.setPixelRatio(Math.min(devicePixelRatio,coarse?1.25:1.6));renderer.setSize(w,h,false);
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
    if(mode==='playing')match.update(dt,t);
    renderer.clear();renderer.render(scene,camera);
    if(match.state.alive){renderer.clearDepth();renderer.render(view.scene,view.camera);}
  }
}
async function init(){
  try{
    renderer=new T.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance',alpha:false});renderer.autoClear=false;
    renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;renderer.shadowMap.autoUpdate=false;renderer.shadowMap.needsUpdate=true;
    world=buildWorld(scene);view=createViewModel();match=createMatch({scene,camera,world,view,emit:hudEvent});setSound();resize();
    await renderer.compileAsync(scene,fly);drawMap($('chart'),null,true);renderer.setAnimationLoop(render);
    $('deploy').disabled=false;$('deployLabel').textContent='开始对局';$('readyText').textContent='甲板就绪';addEventListener('resize',resize);
  }catch(e){console.error(e);$('deployLabel').textContent='无法载入';$('readyText').textContent='3D 场景未能启动';notify('无法启动 3D 画面。请在开启硬件加速的 Chrome 或 Edge 中打开。');}
}
init();