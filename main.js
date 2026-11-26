import {names,teams,groups,choices,meleeChoices,selectors,board,weaponIcon} from './lobby.js?v=13';
import * as T from './three.module.js';
import {buildWorld} from './world.js?v=7';
import {createMatch} from './match.js?v=13';
import {createViewModel} from './viewmodel.js?v=13';
import {isMelee,melees} from './arsenal.js?v=13';
import {createDeckAudio} from './deck-audio.js?v=13';
import {loadCrosshair,saveCrosshair,applyCrosshair,parseValorantCode,exportValorantCode,studioMarkup,CROSSHAIR_PRESETS} from './crosshair.js?v=13';

const deckAudio=createDeckAudio();
const $=id=>document.getElementById(id);
const hpBarFill=document.querySelector('.hpbar i'), ammoBox=document.querySelector('.ammoBox');
function put(id,val){const e=$(id),s=String(val);if(e.textContent!==s)e.textContent=s;}
addEventListener('pointerdown',()=>deckAudio.prime(),{once:true});
addEventListener('keydown',()=>deckAudio.prime(),{once:true});
const canvas=$('viewport'), panel=$('panel'), coarse=matchMedia('(pointer:coarse)').matches;
let renderer,world,match,view, elapsed=0, mode='menu', dialogKind='',lockPending=false, frameDirty=true, lastIdleRender=0;
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
function setMode(next){fireFingers.clear();mobileCrouch=false;document.querySelector('[data-touch=crouch]').setAttribute('aria-pressed','false');if(next!=='playing')globalThis.speechSynthesis?.cancel();$('roster').hidden=true;mode=next;frameDirty=true;draggingMouse=false;touchLook=null;deckAudio.enable(sound && next==='playing');document.body.dataset.mode=mode;$('hud').hidden=mode==='menu';$('touch').hidden=!(coarse&&mode==='playing');}
function showDialog(kind,sub,title,html){
  dialogKind=kind;panel.dataset.dialog=kind;$('panelSub').textContent=sub;$('panelTitle').textContent=title;$('panelContent').innerHTML=html;
  if(!panel.open)panel.showModal();
}
let crosshairCfg=loadCrosshair();
applyCrosshair($('cross'),crosshairCfg);
const prefs={team:0,size:6,goal:50,diff:'normal',primary:'ak47',melee:'nepal',wheel:'val',tod:'day',quality:coarse?'low':'high',vol:.8,fov:78};
try{const saved=JSON.parse(localStorage.getItem('df-lobby')||'{}');
  for(const [key,[,opts]] of Object.entries(groups))if(opts.some(([v])=>v===saved[key]))prefs[key]=saved[key];
  if(['ak47','m4a1','awm','mp5'].includes(saved.primary))prefs.primary=saved.primary;
  if(melees.includes(saved.melee))prefs.melee=saved.melee;
  if(Number.isFinite(saved.vol))prefs.vol=T.MathUtils.clamp(saved.vol,0,1);if(Number.isFinite(saved.fov))prefs.fov=T.MathUtils.clamp(saved.fov,65,100);
}catch{}
function save(){try{localStorage.setItem('df-lobby',JSON.stringify(prefs));}catch{}}
function summary(){$('statSize').innerHTML=prefs.size+' <em>VS</em> '+prefs.size;$('statGoal').textContent=prefs.goal;$('statTime').textContent=prefs.size===3?'05:00':'10:00';$('primaryName').textContent=names[prefs.primary]+' · '+names[prefs.melee];}
function applyPref(key){
  if(key==='tod')world?.setTime(prefs.tod);
  if(key==='quality'){world?.setQuality(prefs.quality);if(renderer&&view)resize();}
  if(renderer&&(key==='tod'||key==='quality'))renderer.shadowMap.needsUpdate=true;
  if(key==='fov')match?.input('fov',prefs.fov);
  if(key==='vol')deckAudio.setVolume(prefs.vol);
  frameDirty=true;save();summary();
}
function bindPrefs(){
  for(const btn of panel.querySelectorAll('[data-pref]'))btn.onclick=()=>{
    const key=btn.dataset.pref;prefs[key]=typeof prefs[key]==='number'?Number(btn.dataset.value):btn.dataset.value;
    for(const peer of btn.parentElement.querySelectorAll('button'))peer.setAttribute('aria-pressed',String(peer===btn));applyPref(key);
  };
}
function armory(inGame=false){
  if(inGame){if(mode==='playing')match.pause();setMode('paused');release();}
  showDialog(inGame?'loadout':'armory','LOADOUT','选择主武器与近战',
    '<div class="sectionTitle">主武器 PRIMARY</div>'+choices(prefs.primary)+
    '<div class="sectionTitle">近战武器 MELEE（滚轮下滚秒切刀 · F 键转刀检视）</div>'+meleeChoices(prefs.melee)+
    '<p class="panelNote">副武器和手雷随身配备。出生区内更换主武器或近战武器立即生效，离开出生区后在下次复活时领取。</p>');
  for(const b of panel.querySelectorAll('[data-weapon]'))b.onclick=()=>{
    prefs.primary=b.dataset.weapon;save();summary();
    for(const p of panel.querySelectorAll('[data-weapon]'))p.setAttribute('aria-pressed',String(p===b));
    if(inGame){const when=match.input('primary',prefs.primary);resume();notify((when==='now'?'已装备 ':'复活后装备 ')+names[prefs.primary]);}
  };
  for(const b of panel.querySelectorAll('[data-melee]'))b.onclick=()=>{
    prefs.melee=b.dataset.melee;save();summary();
    for(const p of panel.querySelectorAll('[data-melee]'))p.setAttribute('aria-pressed',String(p===b));
    if(inGame){const when=match.input('melee',prefs.melee);resume();notify((when==='now'?'已切出 ':'复活后装备 ')+names[prefs.melee]);}
  };
}
function crosshairStudio(){
  showDialog('crosshair','CROSSHAIR STUDIO','自定义准星工坊',studioMarkup(crosshairCfg));
  const sync=(cfg)=>{
    crosshairCfg=saveCrosshair(cfg);
    applyCrosshair($('cross'),crosshairCfg);
    for(const s of panel.querySelectorAll('.xhSample'))applyCrosshair(s,crosshairCfg);
    const codeInput=$('xhCode');if(codeInput&&document.activeElement!==codeInput)codeInput.value=exportValorantCode(crosshairCfg);
    $('xhColor').value=crosshairCfg.color;
    for(const sw of panel.querySelectorAll('.swatch'))sw.setAttribute('aria-pressed',String(sw.dataset.color===crosshairCfg.color));
    $('xhLen').value=crosshairCfg.length;$('xhLen').nextElementSibling.value=crosshairCfg.length;
    $('xhThick').value=crosshairCfg.thickness;$('xhThick').nextElementSibling.value=crosshairCfg.thickness;
    $('xhOff').value=crosshairCfg.offset;$('xhOff').nextElementSibling.value=crosshairCfg.offset;
    $('xhDotSize').value=crosshairCfg.dotSize;$('xhDotSize').nextElementSibling.value=crosshairCfg.dotSize;
    $('xhOutline').setAttribute('aria-pressed',String(crosshairCfg.outline));$('xhOutline').textContent='黑边描边：'+(crosshairCfg.outline?'开':'关');
    $('xhDot').setAttribute('aria-pressed',String(crosshairCfg.dot));$('xhDot').textContent='中心点：'+(crosshairCfg.dot?'开':'关');
  };
  sync(crosshairCfg);
  for(const btn of panel.querySelectorAll('[data-preset]'))btn.onclick=()=>{
    const found=CROSSHAIR_PRESETS.find(p=>p.id===btn.dataset.preset);
    if(found){sync({...found.cfg});notify('已应用预设：'+found.name);}
  };
  for(const sw of panel.querySelectorAll('.swatch'))sw.onclick=()=>sync({...crosshairCfg,color:sw.dataset.color});
  $('xhColor').oninput=e=>sync({...crosshairCfg,color:e.target.value});
  $('xhLen').oninput=e=>sync({...crosshairCfg,length:+e.target.value});
  $('xhThick').oninput=e=>sync({...crosshairCfg,thickness:+e.target.value});
  $('xhOff').oninput=e=>sync({...crosshairCfg,offset:+e.target.value});
  $('xhDotSize').oninput=e=>sync({...crosshairCfg,dotSize:+e.target.value});
  $('xhOutline').onclick=()=>sync({...crosshairCfg,outline:!crosshairCfg.outline});
  $('xhDot').onclick=()=>sync({...crosshairCfg,dot:!crosshairCfg.dot});
  $('xhImport').onclick=()=>{
    const parsed=parseValorantCode($('xhCode').value);
    if(!parsed){notify('准星代码格式无效，请粘贴完整的无畏契约准星代码。');return;}
    sync(parsed);notify('已成功导入无畏契约准星代码！');
  };
  $('xhCopy').onclick=()=>{
    const code=exportValorantCode(crosshairCfg);
    navigator.clipboard?.writeText(code).then(()=>notify('已复制无畏契约准星代码')).catch(()=>notify('代码：'+code));
  };
}
function setup(){showDialog('setup','MATCH SETUP','对局配置',selectors(prefs,['team','size','goal','diff','tod','quality'])+'<div class="actions"><button id="setupDone" class="primary">完成</button></div>');bindPrefs();$('setupDone').onclick=closePanel;}
const controlRows=()=>coarse?'<p class="panelNote">左侧摇杆移动，右侧拖动转向。轻点武器栏选择装备，暂停菜单可换装或查看战绩。</p>':[['移动 / 静步 / 冲刺','WASD / Shift / X'],['下蹲 / 跳跃','C / 空格'],['射击 / 瞄准或重击','鼠标左键 / 右键'],['滚轮切刀 / 快切','下滚秒切刀 · 上滚主枪 / Q'],['武器槽 / 转刀检视 / 换装','1–4 / F / B'],['战绩 / 暂停','Tab / Esc']].map(([a,b])=>'<div class="row"><span>'+a+'</span><kbd>'+b+'</kbd></div>').join('');
function settings(){
  let ranges='';for(const [id,name,min,max,step,value] of [['sens','视角灵敏度',.2,3,.05,sensitivity],['fov','视野',65,100,1,prefs.fov],['vol','音量',0,1,.05,prefs.vol]])ranges+='<div class="row"><label for="'+id+'">'+name+'</label><input type="range" id="'+id+'" min="'+min+'" max="'+max+'" step="'+step+'" value="'+value+'"><output>'+value+'</output></div>';
  showDialog('settings','CONTROLS','设置与操作',ranges+selectors(prefs,['wheel','tod','quality'])+'<div class="row"><span>自定义准星</span><button id="openXhFromSet" class="secondary">打开准星工坊</button></div>'+controlRows()+'<div class="row"><span>游戏声音</span><button id="audioToggle" class="secondary">'+(sound?'开启':'关闭')+'</button></div>');
  for(const el of panel.querySelectorAll('input'))el.oninput=()=>{
    el.nextElementSibling.value=el.value;if(el.id==='sens'){sensitivity=+el.value;try{localStorage.setItem('df-sensitivity',sensitivity);}catch{}}
    else{prefs[el.id]=+el.value;applyPref(el.id);}
  };bindPrefs();
  $('openXhFromSet').onclick=crosshairStudio;
  if(location.protocol!=='file:'){
    const download=document.createElement('a');download.className='offline';download.href='./transport-ship.html';download.download='运输船-离线版.html';download.textContent='下载单文件离线版';$('panelContent').append(download);
  }
  $('audioToggle').onclick=()=>{sound=!sound;setSound();$('audioToggle').textContent=sound?'开启':'关闭';};
}
$('battleSetup').onclick=setup;$('armory').onclick=()=>armory(false);$('openCrosshair').onclick=crosshairStudio;summary();
$('controls').onclick=$('options').onclick=settings;
const mapCache=new WeakMap();
function staticMapLayer(target,horizontal){
  const w=target.width,h=target.height,cached=mapCache.get(target);
  if(cached&&cached.w===w&&cached.h===h&&cached.horizontal===horizontal)return cached;
  const off=document.createElement('canvas');off.width=w;off.height=h;
  const ctx=off.getContext('2d'),b=world.bounds,m=8,dx=b.maxX-b.minX,dz=b.maxZ-b.minZ;
  const sc=Math.min((w-2*m)/(horizontal?dz:dx),(h-2*m)/(horizontal?dx:dz));
  ctx.save();ctx.translate(w/2,h/2);if(horizontal)ctx.rotate(-Math.PI/2);ctx.scale(sc,sc);
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
  ctx.restore();
  const entry={w,h,horizontal,sc,layer:off};mapCache.set(target,entry);return entry;
}
function drawMap(target,state=null,horizontal=false){
  if(!world||!target)return;
  const ctx=target.getContext('2d'),{w,h,sc,layer}=staticMapLayer(target,horizontal);
  ctx.clearRect(0,0,w,h);ctx.drawImage(layer,0,0);
  if(!state)return;
  ctx.save();ctx.translate(w/2,h/2);if(horizontal)ctx.rotate(-Math.PI/2);ctx.scale(sc,sc);
  for(const a of state.actors){if(!a.alive||a.team!==state.team&&!(a.radarT>0))continue;ctx.beginPath();ctx.fillStyle=a.team===state.team?'#8ed1ee':'#ff8170';ctx.arc(a.x,a.z,.75,0,7);ctx.fill();}
  if(state.alive){const p=state.player;ctx.translate(p.x,p.z);ctx.rotate(-p.yaw);ctx.beginPath();ctx.moveTo(0,0);ctx.arc(0,0,9.5,-Math.PI/2-.52,-Math.PI/2+.52);ctx.closePath();ctx.fillStyle='rgba(255,206,100,.14)';ctx.fill();ctx.beginPath();ctx.moveTo(0,-1.55);ctx.lineTo(.95,.90);ctx.lineTo(0,.55);ctx.lineTo(-.95,.90);ctx.closePath();ctx.fillStyle='#ffce64';ctx.fill();}
  ctx.restore();
}
$('openMap').onclick=()=>{if(!world)return;showDialog('map','DECK PLAN','甲板平面图','<canvas width="760" height="390" class="fullchart" id="fullChart"></canvas><div class="legend"><span><b style="color:var(--ice)">■</b>保卫者舱室</span><span><b style="color:var(--red)">■</b>潜伏者舱室</span><span><b style="color:var(--gold)">➤</b>管道出口方向</span></div>');drawMap($('fullChart'),null,true);};
function notify(msg){$('notice').hidden=false;$('notice').textContent=msg;clearTimeout(notify.timer);notify.timer=setTimeout(()=>{$('notice').hidden=true;},4200);}
function lock(){
  if(coarse||document.pointerLockElement===canvas)return;
  if(!canvas.requestPointerLock){notify('拖动鼠标转向，按住左键开火。');return;}
  lockPending=true;clearTimeout(locker);locker=setTimeout(()=>{lockPending=false;},700);
  const fallback=()=>{
    try{const req=canvas.requestPointerLock();req?.catch(()=>{lockPending=false;notify('点击画面锁定鼠标，也可以拖动转向。');});}
    catch{lockPending=false;}
  };
  try{
    const req=canvas.requestPointerLock({unadjustedMovement:true});
    if(req&&typeof req.catch==='function')req.catch(fallback);
  }catch{fallback();}
}
function release(){if(document.pointerLockElement)document.exitPointerLock();}
function closePanel(){if(panel.open)panel.close();dialogKind='';}
function start(){clearAnnouncement();deckAudio.reset();closePanel();$('feed').replaceChildren();$('notice').hidden=true;setMode('playing');setSound();match.start(prefs);match.input('fov',prefs.fov);canvas.focus();lock();}
function resume(){closePanel();setMode('playing');match.resume();canvas.focus();lock();}
function toMenu(){closePanel();release();setMode('menu');drawMap($('chart'),null,true);}
function pauseUI(){
  if(mode!=='playing'&&mode!=='paused')return;
  match.pause();setMode('paused');release();
  showDialog('pause','MATCH PAUSED','对局已暂停','<div class="actions"><button id="resume" class="primary">继续对局</button><button id="inLoadout" class="secondary">更换主武器/近战</button><button id="inCrosshair" class="secondary">自定义准星</button><button id="inBoard" class="secondary">查看战绩</button><button id="inSettings" class="secondary">设置与操作</button><button id="leave" class="secondary">返回甲板首页</button></div>');
  $('inLoadout').onclick=()=>armory(true);$('inCrosshair').onclick=crosshairStudio;$('inBoard').onclick=()=>showDialog('board','SCOREBOARD','团队战绩',board(match.state));$('resume').onclick=resume;$('inSettings').onclick=settings;$('leave').onclick=toMenu;
}
function dismiss(){if(dialogKind==='loadout'){resume();return;}if(dialogKind==='end'){toMenu();return;}if(dialogKind==='pause'){resume();return;}closePanel();if(mode==='paused')pauseUI();}
$('closePanel').onclick=dismiss;panel.oncancel=e=>{e.preventDefault();dismiss();};
$('deploy').onclick=start;$('pauseHud').onclick=pauseUI;
let calloutAnimation,hitAnimation;
function clearAnnouncement(){
  calloutAnimation?.cancel();
  $('callout').hidden=true;
}
let cfVoice=null;
function pickCfVoice(){
  if(cfVoice||!window.speechSynthesis?.getVoices)return cfVoice;
  const voices=speechSynthesis.getVoices();
  cfVoice=voices.find(v=>/^en[-_]US/i.test(v.lang))||voices.find(v=>/^en/i.test(v.lang))||null;
  return cfVoice;
}
window.speechSynthesis?.addEventListener?.('voiceschanged',()=>{cfVoice=null;pickCfVoice();});
function cfBadgeSvg(data){
  const meleeHit=isMelee(data.weapon);
  if(data.multi>1){
    // Classic CF multi-kill red/gold star crest (2 to 6+ stars + flame wings for 4+).
    const n=Math.min(6,data.multi);
    const wings=n>=4?'<path d="M12 38L2 24l18 4-10-12 20 8M84 38l10-14-18 4 10-12-20 8" fill="none" stroke="#ff5c38" stroke-width="2.5" stroke-linejoin="round"/>':'';
    let stars='';
    for(let i=0;i<n;i++){
      const x=48+(i-(n-1)/2)*(n>=5?14:17),y=30-Math.abs(i-(n-1)/2)*(n>=4?2.5:3.5);
      stars+=`<polygon points="${x},${y-9} ${x+2.6},${y-2.5} ${x+9.2},${y-2.5} ${x+3.8},${y+1.8} ${x+5.8},${y+8.4} ${x},${y+4.4} ${x-5.8},${y+8.4} ${x-3.8},${y+1.8} ${x-9.2},${y-2.5} ${x-2.6},${y-2.5}" fill="${data.head?'#ffe066':'#ff5236'}" stroke="#2a0905" stroke-width="1.2"/>`;
    }
    const crown=data.head?'<circle cx="48" cy="12" r="4" fill="#ffe066" stroke="#3a1c00" stroke-width="1.2"/>':'';
    return `<svg viewBox="0 0 96 66">${wings}<path d="M22 46h52l-6 12H28z" fill="#2a1110" stroke="#ff6240" stroke-width="1.6"/><text x="48" y="55" text-anchor="middle" fill="#ffd966" font-size="9" font-weight="900" font-family="Arial Black,sans-serif">${data.multi} KILL</text>${stars}${crown}</svg>`;
  }
  if(data.head){
    // Iconic CF Golden Headshot Skull + starburst + forehead bullet hole.
    return `<svg viewBox="0 0 96 66">
      <defs><linearGradient id="cfG" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#fff099"/><stop offset="55%" stop-color="#f7b731"/><stop offset="100%" stop-color="#a86408"/></linearGradient></defs>
      <path d="M48 3l5 12 13-6-5 13 15 2-12 9 10 11-15-1-3 14-8-10-8 10-3-14-15 1 10-11-12-9 15-2-5-13 13 6z" fill="#ffbe33" fill-opacity=".28" stroke="#ffd859" stroke-width="1"/>
      <path d="M31 28c0-11 7.6-18 17-18s17 7 17 18c0 6.5-3.2 10.5-6 13v7c0 2-1.5 3.5-3.5 3.5h-15c-2 0-3.5-1.5-3.5-3.5v-7c-2.8-2.5-6-6.5-6-13z" fill="url(#cfG)" stroke="#3d2100" stroke-width="2"/>
      <ellipse cx="41.5" cy="30" rx="4.2" ry="4.6" fill="#221000"/><ellipse cx="54.5" cy="30" rx="4.2" ry="4.6" fill="#221000"/>
      <path d="M48 34l-2.6 5h5.2z" fill="#221000"/>
      <path d="M40 44v6m4-6v6m4-6v6m4-6v6m4-6v6" stroke="#3d2100" stroke-width="1.8"/>
      <circle cx="52" cy="18" r="2.8" fill="#ff3b24" stroke="#fff3b0" stroke-width="1.2"/>
    </svg>`;
  }
  if(data.first){
    // First Kill blue-gold shield + lightning crest.
    return `<svg viewBox="0 0 96 66"><path d="M48 7l21 8v18c0 13-9 22-21 27-12-5-21-14-21-27V15z" fill="#133347" stroke="#66e0ff" stroke-width="2.2"/><path d="M51 16L38 35h9l-3 15 14-20h-9z" fill="#ffe066" stroke="#182a34" stroke-width="1.2"/></svg>`;
  }
  if(meleeHit){
    // Crossed cold-steel blades emblem (Kukri / Kris / Knife).
    return `<svg viewBox="0 0 96 66"><circle cx="48" cy="33" r="22" fill="#10292d" stroke="#78ffd6" stroke-width="1.8"/><path d="M27 49L65 15l4 4-36 34zm42 0L31 15l-4 4 36 34z" fill="#dffcf4" stroke="#0c262a" stroke-width="1.4"/></svg>`;
  }
  if(data.weapon==='he'){
    // Explosive grenade starburst emblem.
    return `<svg viewBox="0 0 96 66"><polygon points="48,5 56,19 72,14 66,29 80,38 64,44 68,58 53,51 48,62 43,51 28,58 32,44 16,38 30,29 24,14 40,19" fill="#ff6236" fill-opacity=".35" stroke="#ff944d" stroke-width="1.4"/><circle cx="48" cy="36" r="13" fill="#4f5f42" stroke="#ffd466" stroke-width="1.8"/><rect x="44" y="18" width="8" height="6" fill="#ffd466"/></svg>`;
  }
  if(data.wall){
    // Wallbang bullet piercing wooden crate emblem.
    return `<svg viewBox="0 0 96 66"><rect x="33" y="14" width="30" height="38" fill="#5e4730" stroke="#e2c282" stroke-width="1.8"/><path d="M16 33h64" stroke="#ffe066" stroke-width="3" stroke-dasharray="6 4"/><polygon points="82,33 70,27 70,39" fill="#ffe066"/></svg>`;
  }
  // Classic CF standard kill metallic star badge.
  return `<svg viewBox="0 0 96 66"><polygon points="48,8 55,24 72,25 59,36 63,53 48,44 33,53 37,36 24,25 41,24" fill="#d9e4e8" stroke="#2c3e47" stroke-width="2"/><polygon points="48,16 52,27 63,28 55,35 57,46 48,40 39,46 41,35 33,28 44,27" fill="#ffc44d"/></svg>`;
}
function announceHit(data){
  if(!data.kill)return;
  const banner=$('callout');
  const meleeHit=isMelee(data.weapon);
  const cfMultiEn=['','','DOUBLE KILL','MULTI KILL','ULTRA KILL','UNBREAKABLE','UNBELIEVABLE','YOU WANNA PIECE OF ME?','COME GET SOME!'];
  const cfMultiZh=['','','双杀','三连杀','四连杀','五连杀','六连杀','七连杀','超神连杀'];
  const cfVoiceEn=['','','Double Kill','Multi Kill','Ultra Kill','Unbreakable','Unbelievable','You wanna piece of me','Come get some'];
  let title='KILL', voiceLine='';
  const tags=[];
  if(data.multi>1){
    const idx=Math.min(data.multi,cfMultiEn.length-1);
    title=cfMultiEn[idx];
    voiceLine=cfVoiceEn[idx];
    tags.push(data.multi>=cfMultiZh.length?data.multi+' 连杀':cfMultiZh[idx]);
    if(data.first)tags.push('首杀');
    if(data.head)tags.push('黄金爆头');
    if(data.wall)tags.push('穿箱');
    if(meleeHit)tags.push(names[data.weapon]||'近战');
    else if(data.weapon==='he')tags.push('手雷');
  }else if(data.first){
    title='FIRST KILL';voiceLine='First Kill';
    tags.push('首杀');
    if(data.head)tags.push('黄金爆头');
    if(meleeHit)tags.push(names[data.weapon]||'近战');
    else if(data.weapon==='he')tags.push('手雷');
  }else if(data.head){
    title='HEADSHOT';voiceLine='Headshot';
    tags.push(data.wall?'穿箱爆头':'黄金爆头');
  }else if(meleeHit){
    title='KNIFE KILL';voiceLine='Knife Kill';
    tags.push((names[data.weapon]||'军刀')+'击杀');
  }else if(data.weapon==='he'){
    title='GRENADE KILL';voiceLine='Grenade Kill';
    tags.push('手雷击杀');
  }else if(data.wall){
    title='WALL SHOT';voiceLine='Wall Shot';
    tags.push('穿箱击杀');
  }else{
    title='KILL';
    tags.push('击杀');
  }
  if(data.victim)tags.push(data.victim);
  $('killBadge').innerHTML=cfBadgeSvg(data);
  put('killTitle',title);
  put('killDetail',tags.join(' · '));
  banner.classList.toggle('head',!!data.head);
  banner.classList.toggle('multi',data.multi>1);
  banner.classList.toggle('first',!!data.first&&data.multi<=1);
  banner.classList.toggle('knife',meleeHit&&data.multi<=1&&!data.head);
  banner.hidden=false;
  calloutAnimation?.cancel();
  calloutAnimation=banner.animate([
    {opacity:0,transform:'translate(-50%,12px) scale(.82)'},
    {opacity:1,transform:'translate(-50%,-3px) scale(1.08)',offset:.10},
    {opacity:1,transform:'translate(-50%,0) scale(1)',offset:.22},
    {opacity:1,transform:'translate(-50%,0) scale(1)',offset:.76},
    {opacity:0,transform:'translate(-50%,-6px) scale(.97)'}
  ],{duration:data.multi>1||data.first?2200:1850,fill:'forwards'});
  deckAudio.cue(data.head?'headshot':'kill',{multi:data.multi,head:data.head,weapon:data.weapon,first:data.first});
  if(sound&&prefs.vol>0&&voiceLine&&window.speechSynthesis&&typeof SpeechSynthesisUtterance==='function'){
    const line=new SpeechSynthesisUtterance(voiceLine);
    const v=pickCfVoice();if(v)line.voice=v;
    line.lang=v?.lang||'en-US';line.volume=prefs.vol*.72;line.rate=data.multi>=4?1.08:1.02;line.pitch=.88;
    speechSynthesis.cancel();speechSynthesis.speak(line);
  }
}
let rackKey='',boardKey='',lastBearing=null,lastHpPct=-1;
const labelPosition=new T.Vector3();
function friendTags(state){
  const group=$('friendTags'),w=innerWidth,h=innerHeight;
  let idx=0;
  for(const a of state.actors){
    if(!a.alive||a.team!==state.team)continue;
    while(group.children.length<=idx)group.append(document.createElement('small'));
    const tag=group.children[idx++];
    labelPosition.set(a.x,a.y+1.98,a.z).project(camera);
    const hide=labelPosition.z<0||labelPosition.z>1||Math.abs(labelPosition.x)>1||Math.abs(labelPosition.y)>1;
    if(tag.hidden!==hide)tag.hidden=hide;
    if(!hide){
      if(tag.textContent!==a.name)tag.textContent=a.name;
      const px=((.5+.5*labelPosition.x)*w).toFixed(1),py=((.5-.5*labelPosition.y)*h).toFixed(1);
      tag.style.transform='translate3d('+px+'px,'+py+'px,0) translate(-50%,-100%)';
    }
  }
  for(let i=idx;i<group.children.length;i++)if(!group.children[i].hidden)group.children[i].hidden=true;
}
function hudEvent(type,data){
  if(type==='sfx'){deckAudio.sfx(data);return;}

  if(type==='hud'){
    put('blue',String(data.score[0]).padStart(2,'0'));put('red',String(data.score[1]).padStart(2,'0'));
    put('hp',data.hp);put('ammo',isMelee(data.weapon)?'∞':data.ammo);put('reserve',data.reserve);
    put('goalText','目标 '+data.target);put('weaponName',names[data.weapon]);put('armor',data.armor);
    $('scopeOverlay').hidden=!data.zoom||!data.alive;
    $('adsOverlay').hidden=!data.aiming||!!data.zoom||!data.alive;
    put('aimName',data.aimName||'');$('aimName').style.color=data.aimTeam===data.team?'var(--ice)':'var(--red)';
    put('protection',data.protect>0&&data.alive?'出生保护 '+data.protect.toFixed(1)+' s':'');
    $('hud').classList.toggle('lowhp',data.hp<30&&data.alive);$('viewport').classList.toggle('spectate',!data.alive);
    const key=data.inventory.map(w=>w.id).join('/')+data.slot;
    if(key!==rackKey){rackKey=key;$('slotRack').innerHTML=data.inventory.map((w,i)=>'<button data-slot="'+i+'" class="'+(data.slot===i?'selected':'')+'" aria-label="'+names[w.id]+'"><b>'+(i+1)+'</b>'+weaponIcon(w.id)+'</button>').join('');}
    if(!$('roster').hidden){const html=board(data);if(html!==boardKey){boardKey=html;$('roster').innerHTML=html;}}
    if(lastBearing!==null)$('bearing').style.transform='translate(-50%,-50%) rotate('+(data.player.yaw-lastBearing)+'rad)';
    const s=Math.ceil(data.remaining);put('clock',[Math.floor(s/60),s%60].map(v=>String(v).padStart(2,'0')).join(':'));
    if(data.hp!==lastHpPct){lastHpPct=data.hp;hpBarFill.style.width=data.hp+'%';}
    const lowAmmo=data.alive&&data.maxAmmo>1&&data.ammo<=Math.max(1,Math.ceil(data.maxAmmo*.25));
    ammoBox?.classList.toggle('lowammo',lowAmmo);
    put('gunstatus',data.reloading?'正在换弹 '+Math.round((data.reloadProgress||0)*100)+'%':data.aiming?'瞄准':isMelee(data.weapon)?'右键重击':data.weapon==='he'?'投掷':!data.ammo?'弹匣已空':lowAmmo?'弹药不足':'就绪');
    $('cross').hidden=data.aiming||!data.alive;$('respawn').hidden=data.alive||data.phase==='ended';
    $('slotRack').hidden=!data.alive;
    if(!data.alive)put('respawn','被 '+data.killedBy+' 击倒 · '+Math.ceil(data.respawnIn)+' 秒后复活');drawMap($('radar'),data);
  }else if(type==='hit'||type==='hurt'){
    if(type==='hit'){
      announceHit(data);
      const e=$('hit');
      e.classList.toggle('head',!!data.head);e.classList.toggle('kill',!!data.kill);
      const pop=data.kill?1.52:data.head?1.32:1.18;
      hitAnimation?.cancel();
      hitAnimation=e.animate([
        {opacity:1,transform:'translate(-50%,-50%) rotate(45deg) scale('+pop+')'},
        {opacity:1,transform:'translate(-50%,-50%) rotate(45deg) scale(1)',offset:.35},
        {opacity:0,transform:'translate(-50%,-50%) rotate(45deg) scale(.92)'}
      ],{duration:data.kill?280:data.head?210:165,fill:'forwards'});
    }else{
      if(Number.isFinite(data.bearing)){lastBearing=data.bearing;$('bearing').hidden=false;$('bearing').animate([{opacity:1},{opacity:0}],{duration:850,fill:'forwards'});}
      $('damage').animate([{opacity:1},{opacity:0}],{duration:300});
    }
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
let lastWheelAt=0;
canvas.addEventListener('wheel',e=>{
  if(mode!=='playing')return;
  e.preventDefault();
  const now=performance.now();
  if(now-lastWheelAt<65)return;
  lastWheelAt=now;
  const dir=Math.sign(e.deltaY);
  if(!dir)return;
  if(prefs.wheel==='val')match.input('wheelVal',dir);
  else match.input('cycle',dir);
},{passive:false});
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
let lockGraceUntil=0,skipMoves=0,recentMoveMag=0,lastMoveTs=0;
document.addEventListener('mousemove',e=>{
  const locked=document.pointerLockElement===canvas;
  if(mode!=='playing'||(!locked&&!draggingMouse))return;
  const now=performance.now();
  if(locked&&(skipMoves>0||now<lockGraceUntil)){if(skipMoves>0)skipMoves--;lastMoveTs=now;return;}
  const mx=e.movementX,my=e.movementY;
  if(!Number.isFinite(mx)||!Number.isFinite(my)||(mx===0&&my===0))return;
  const dtMove=now-lastMoveTs;lastMoveTs=now;
  if(dtMove>120)recentMoveMag=0;
  const mag=Math.hypot(mx,my);
  // Drop Chromium/Windows pointer-lock cursor-recenter warp spikes while keeping fast flicks intact.
  if(Math.abs(mx)>220||Math.abs(my)>220||(mag>125&&recentMoveMag<24)){recentMoveMag*=.5;return;}
  const clampedX=T.MathUtils.clamp(mx,-160,160),clampedY=T.MathUtils.clamp(my,-160,160);
  recentMoveMag=recentMoveMag*.7+Math.min(mag,120)*.3;
  match.look(clampedX*sensitivity,clampedY*sensitivity);
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
document.addEventListener('pointerlockchange',()=>{
  const active=document.pointerLockElement===canvas;
  if(active){lockGraceUntil=performance.now()+85;skipMoves=2;recentMoveMag=0;lastMoveTs=0;}
  if(hadLock&&!active&&mode==='playing')pauseUI();
  hadLock=active;lockPending=false;
});
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
  for(const c of [camera,fly]){c.aspect=aspect;c.updateProjectionMatrix();}view.resize(aspect);frameDirty=true;
}
function render(time){
  const t=time*.001,dt=Math.min(.08,Math.max(0,t-elapsed));elapsed=t;
  if((mode==='paused'||mode==='ended')&&!frameDirty&&time-lastIdleRender<66)return;
  if(mode==='paused'||mode==='ended'){lastIdleRender=time;frameDirty=false;}
  world.update(t,dt);
  if(mode==='menu'){
    const drift=Math.sin(t*.07)*.6;
    fly.position.set(19+drift,11.3,28.8);fly.lookAt(-1.9,2.0,-6.3);
    renderer.clear();renderer.render(scene,fly);
  }else{
    if(mode==='playing'){
      match.update(dt,t);
      const s=match.state;
      const focalPixels=innerHeight/(2*Math.tan(camera.fov*Math.PI/360));
      $('cross').style.setProperty('--gap',Math.min(38,s.spread*focalPixels).toFixed(1)+'px');
      const scoped=s.alive&&s.zoom>0;
      const scopeEl=$('scopeOverlay');
      if(scopeEl.hidden===scoped)scopeEl.hidden=!scoped;
      if(scoped){
        scopeEl.classList.toggle('steady',s.spread<.012);
        put('scopeZoom',s.zoom===2?'5.0x':'2.5x');
      }
      const adsActive=s.alive&&s.aiming&&!s.zoom;
      const adsEl=$('adsOverlay');
      if(adsEl.hidden===adsActive)adsEl.hidden=!adsActive;
      if(adsActive){
        if(adsEl.dataset.weapon!==s.weapon)adsEl.dataset.weapon=s.weapon;
        const kick=Math.min(10,(s.player.burst?.pitch||0)*140);
        adsEl.style.setProperty('--kick',(-kick).toFixed(1)+'px');
      }
      friendTags(s);
      deckAudio.step(dt,{walking:s.player.walking,sprint:s.sprinting,grounded:s.grounded,alive:s.alive,hp:s.hp,quiet:s.crouching||s.player.quiet});
    }
    renderer.clear();renderer.render(scene,camera);
    if(match.state.alive&&!match.state.zoom){renderer.clearDepth();renderer.render(view.scene,view.camera);}
  }
}
async function prewarm(){
  const cleanup=match.warmup?.();
  const savedVis=[];
  view.scene.traverse(o=>{savedVis.push([o,o.visible]);o.visible=true;});
  try{
    if(renderer.compileAsync&&renderer.extensions.has('KHR_parallel_shader_compile')){
      await Promise.race([
        (async()=>{await renderer.compileAsync(scene,camera);await renderer.compileAsync(view.scene,view.camera);})(),
        new Promise(r=>setTimeout(r,2500))
      ]);
    }else{
      renderer.compile(scene,camera);
      renderer.compile(view.scene,view.camera);
    }
  }catch{}
  finally{
    for(const [o,v] of savedVis)o.visible=v;
    cleanup?.();
  }
}
async function init(){
  try{
    renderer=new T.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance',alpha:false});renderer.autoClear=false;
    renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;renderer.shadowMap.autoUpdate=false;renderer.shadowMap.needsUpdate=true;
    world=buildWorld(scene);view=createViewModel();match=createMatch({scene,camera,world,view,emit:hudEvent});for(const key of ['quality','tod','vol','fov'])applyPref(key);setSound();resize();
    await prewarm();
    render(performance.now());drawMap($('chart'),null,true);renderer.setAnimationLoop(render);
    $('deploy').disabled=false;$('deployLabel').textContent='开始对局';$('readyText').textContent='甲板就绪';addEventListener('resize',resize);
  }catch(e){console.error(e);$('deployLabel').textContent='无法载入';$('readyText').textContent='3D 场景未能启动';notify('无法启动 3D 画面。请在开启硬件加速的 Chrome 或 Edge 中打开。');}
}
init();