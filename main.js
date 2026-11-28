import {names,teams,groups,choices,meleeChoices,selectors,board,weaponIcon} from './lobby.js?v=39';
import * as T from './three.module.js';
import {maps} from './maps.js?v=2';
import {createMatch} from './match.js?v=58';
import {createViewModel} from './viewmodel.js?v=64';
import {isMelee,melees} from './arsenal.js?v=31';
import {createDeckAudio} from './deck-audio.js?v=35';
import {loadCrosshair,saveCrosshair,applyCrosshair,drawViewportCrosshair,parseValorantCode,exportValorantCode,studioMarkup,CROSSHAIR_PRESETS} from './crosshair.js?v=15';
import {createDuelClient} from './duel-client.js?v=46';
import {createDuelRoom,invited} from './duel-room.js?v=23';
import {matchRules,matchDuration} from './match-rules.js?v=24';
import {loadBinds,resetBinds,assignBind,buildCodeMap,mouseCode,bindLabel,keybindRowsMarkup} from './keybinds.js?v=1';

const deckAudio=createDeckAudio();
const $=id=>document.getElementById(id);
const hpBarFill=document.querySelector('.hpbar i'), ammoBox=document.querySelector('.ammoBox');
const hitParts={head:'头部',body:'躯干',limb:'下肢',blast:'爆炸'};
function renderDeathReport(target,report){
  target.replaceChildren();
  if(!report)return;
  const number=value=>Number(value.toFixed(1));
  const add=(parent,tag,value,style)=>{
    const element=document.createElement(tag);
    element.textContent=value;
    if(style)element.className=style;
    parent.append(element);
    return element;
  };
  add(target,'strong','交火报告','combatHeading');
  const cards=add(target,'div','','combatCards');
  if(!report.targets?.length)add(cards,'p','本次生命没有命中敌人','combatNote');
  for(const {name,killer,damage} of report.targets||[]){
    const card=add(cards,'section','',killer?'combatCard combatKiller':'combatCard');
    const title=add(card,'div','','combatTarget');
    add(title,'strong',name);
    add(title,'b',number(damage?.health??0)+' 扣血');
    if(killer){
      add(card,'p','击杀者 · '+(names[report.weapon]||report.weapon)+' · '+hitParts[report.part]+' · 剩余 '+number(report.healthLeft)+' 生命','combatNote');
    }
    if(!damage){
      add(card,'p','未命中','combatNote');
      continue;
    }
    const zones=add(card,'ul','','combatZones');
    for(const [part,label] of Object.entries(hitParts)){
      const zone=damage.parts[part];
      if(!zone)continue;
      const row=add(zones,'li','');
      add(row,'span',label);
      add(row,'span',zone.hits+' 次','combatNote');
      add(row,'b',number(zone.health));
    }
  }
}
let shownDeathReport=null;
function put(id,val){const e=$(id),s=String(val);if(e.textContent!==s)e.textContent=s;}
addEventListener('pointerdown',()=>deckAudio.prime(),{once:true});
addEventListener('keydown',()=>deckAudio.prime(),{once:true});
const canvas=$('viewport'), panel=$('panel'), coarse=matchMedia('(pointer:coarse)').matches;
let renderer,world,match,localMatch,onlineMatch,view, elapsed=0, mode='menu', dialogKind='',lockPending=false, frameDirty=true, lastIdleRender=0;
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
let crosshairViewport;
function updateCrosshair(){drawViewportCrosshair($('cross'),crosshairCfg,crosshairViewport);}
updateCrosshair();
if(typeof ResizeObserver==='function'){
  // The game viewport keeps its layout size while the HUD or the crosshair is hidden.
  const observer=new ResizeObserver(([entry])=>{
    crosshairViewport=entry.devicePixelContentBoxSize?.[0];
    updateCrosshair();
  });
  try{observer.observe(canvas,{box:'device-pixel-content-box'});}
  catch{observer.observe(canvas);}
}
function watchCrosshairScale(){
  const resolution=matchMedia('(resolution: '+devicePixelRatio+'dppx)');
  resolution.addEventListener('change',()=>{
    updateCrosshair();
    watchCrosshairScale();
  },{once:true});
}
watchCrosshairScale();
const prefs={map:'ship',mode:'tdm',team:0,size:matchRules.tdm.size,goal:matchRules.tdm.goal,knifeGoal:matchRules.knife.goal,sniperGoal:matchRules.sniper.goal,diff:'normal',botPrimary:'random',primary:'ak47',melee:'nepal',butterflyFinish:'steel',m9Finish:'fade',karambitFinish:'hardened',wheel:'val',tod:'day',quality:coarse?'low':'high',vol:.8,fov:78};
try{const saved=JSON.parse(localStorage.getItem('df-lobby')||'{}');
  for(const [key,[,opts]] of Object.entries(groups))if(opts.some(([v])=>v===saved[key]))prefs[key]=saved[key];
  if(['ak47','m4a1','awm','mp5'].includes(saved.primary))prefs.primary=saved.primary;
  if(melees.includes(saved.melee))prefs.melee=saved.melee;
  if(Number.isFinite(saved.vol))prefs.vol=T.MathUtils.clamp(saved.vol,0,1);if(Number.isFinite(saved.fov))prefs.fov=T.MathUtils.clamp(saved.fov,65,100);
}catch{}
const params=new URLSearchParams(location.search);
const openMode=params.get('mode'),openMap=params.get('map');
if(Object.hasOwn(maps,openMap))prefs.map=openMap;
if(invited)prefs.mode='duel';
else if(Object.hasOwn(matchRules,openMode))prefs.mode=openMode;
const currentMap=()=>maps[prefs.map]||maps.ship;
function save(){try{localStorage.setItem('df-lobby',JSON.stringify(prefs));}catch{}}
const roundGoal=()=>prefs.mode==='duel'?matchRules.duel.goal:prefs.mode==='knife'?prefs.knifeGoal:prefs.mode==='sniper'?prefs.sniperGoal:prefs.goal;
const clockText=seconds=>[Math.floor(seconds/60),seconds%60].map(v=>String(v).padStart(2,'0')).join(':');
const botPrimaryLabel=()=>prefs.botPrimary==='mirror'?'镜像你的武器':prefs.botPrimary==='random'||!names[prefs.botPrimary]?'每局随机武器':names[prefs.botPrimary];
function summary(){
  const m=currentMap();
  const knife=prefs.mode==='knife',duel=prefs.mode==='duel',sniper=prefs.mode==='sniper';
  const sz=prefs.mode==='tdm'||sniper?prefs.size:matchRules[prefs.mode].size;
  const eyebrow=document.querySelector('.eyebrow');
  if(eyebrow)eyebrow.innerHTML=duel?'<b></b>单挑 1v1 <span>/</span> DUEL':knife?'<b></b>3v3 刀战 <span>/</span> KNIFE FIGHT':sniper?'<b></b>狙击对决 <span>/</span> SNIPER ONLY':'<b></b>团队竞技 <span>/</span> TEAM DEATHMATCH';
  put('mapTitle',m.name);put('mapEng',m.eng);
  $('modeIntro').textContent=duel?'单挑一名电脑对手（'+botPrimaryLabel()+'），或开房邀请好友。':knife?'和队友近身交锋，抢先达到目标击杀数。':sniper?'真人与电脑只能使用相同的枪械：全场统一 AWM，副武器与手雷照常，比的是架点预瞄与拉栓节奏。':m.intro;
  const mapName=document.querySelector('.map-name');if(mapName)mapName.textContent=m.mapTitle;
  const radarLabel=document.querySelector('#radarBox span');if(radarLabel)radarLabel.textContent=m.radarLabel;
  $('statSize').innerHTML=sz+' <em>VS</em> '+sz;
  $('statSize').nextElementSibling.textContent=duel?'单挑人数':'人机对抗';
  $('statGoal').textContent=roundGoal();
  $('statTime').textContent=clockText(matchDuration(prefs.mode,sz));
  $('primaryName').textContent=knife?('纯近战 · '+names[prefs.melee]):sniper?('AWM 锁定 · '+names[prefs.melee]):(names[prefs.primary]+' · '+names[prefs.melee]);
  for(const btn of $('mapPick').querySelectorAll('[data-pref=map]')){
    btn.setAttribute('aria-pressed',String(btn.dataset.value===prefs.map));
  }
  for(const btn of $('modePick').querySelectorAll('[data-pref=mode]')){
    btn.setAttribute('aria-pressed',String(btn.dataset.value===prefs.mode));
  }
  if(!$('deploy').disabled)put('deployLabel',duel?'开始单挑':knife?'开始刀战':sniper?'开始狙击对决':'开始对局');
}
function switchMap(mapId){
  const m=maps[mapId]||maps.ship;
  if(!renderer||world?.id===m.id)return;
  localMatch?.clearScene();
  world?.dispose?.();
  scene.clear();
  world=m.build(scene);
  match=localMatch=createMatch({scene,camera,world,view,emit:hudEvent});
  world.setQuality(prefs.quality);world.setTime(prefs.tod);
  match.input('fov',prefs.fov);
  renderer.shadowMap.needsUpdate=true;
  drawMap($('chart'),null,true);
  put('readyText',m.readyText);
}
function applyPref(key){
  if(key==='map')switchMap(prefs.map);
  if(key==='tod')world?.setTime(prefs.tod);
  if(key==='quality'){world?.setQuality(prefs.quality);if(renderer&&view)resize();}
  if(renderer&&(key==='tod'||key==='quality'))renderer.shadowMap.needsUpdate=true;
  if(key==='fov'){match?.input('fov',prefs.fov);view?.setBayonetFov(prefs.fov);}
  if(key==='vol')deckAudio.setVolume(prefs.vol);
  if(key==='butterflyFinish')view?.setButterflyFinish(prefs.butterflyFinish);
  if(key==='m9Finish')view?.setM9Finish(prefs.m9Finish);
  if(key==='karambitFinish')view?.setKarambitFinish(prefs.karambitFinish);
  if(key==='botPrimary'){
    const swap=match?.input('botPrimary',prefs.botPrimary);
    const line=$('botWeaponState');
    if(line)line.textContent=swap?('电脑现用 '+names[swap.id]+(swap.pending?' · 存活中，下次复活后换枪':' · 已立即换枪')):'对局中切换才会立即生效，当前改动从下一局开始。';
  }
  frameDirty=true;save();summary();
}
// 每个设置项只在对应模式下出现；狙击对决沿用团队竞技的人数档位，但目标击杀是独立一组数值。
const setupOwners={size:['tdm','sniper'],goal:['tdm'],sniperGoal:['sniper'],knifeGoal:['knife'],botPrimary:['duel']};
function syncSetupLocks(){
  for(const [key,modes] of Object.entries(setupOwners)){
    const group=panel.querySelector('[data-pref='+key+']')?.closest('fieldset');
    if(group)group.hidden=!modes.includes(prefs.mode);
  }
}
function bindPrefs(container=panel){
  for(const btn of container.querySelectorAll('[data-pref]'))btn.onclick=()=>{
    const key=btn.dataset.pref;prefs[key]=typeof prefs[key]==='number'?Number(btn.dataset.value):btn.dataset.value;
    for(const peer of btn.parentElement.querySelectorAll('button'))peer.setAttribute('aria-pressed',String(peer===btn));applyPref(key);syncSetupLocks();
  };
  syncSetupLocks();
}
function armory(inGame=false){
  if(inGame){if(mode==='playing')match.pause();setMode('paused');release();}
  const currentMode=inGame?match?.state?.mode:prefs.mode;
  const knife=currentMode==='knife',sniper=currentMode==='sniper';
  showDialog(inGame?'loadout':'armory','LOADOUT',knife?'选择近战武器（3v3 刀战）':sniper?'狙击对决 · 近战选择':'选择主武器与近战',
    (knife?'':sniper
      ?'<div class="sectionTitle">主武器 PRIMARY · 已锁定</div><div class="weapons"><div class="weaponCard locked" aria-disabled="true"><small>狙击步枪 · 真人与电脑统一</small>'+weaponIcon('awm')+'<b>AWM</b><span>5 发 · 双倍率 · 全场同枪</span></div></div>'
      :'<div class="sectionTitle">主武器 PRIMARY</div>'+choices(prefs.primary))+
    '<div class="sectionTitle">近战武器 MELEE（F / Y 检视 · R 把玩）</div>'+meleeChoices(prefs.melee)+
    selectors(prefs,['butterflyFinish','karambitFinish','m9Finish'])+
    '<p class="panelNote">'+(knife?'当前为 3v3 刀战模式，全场仅使用近战武器。出生区内更换近战立即生效，离开出生区后在下次复活时领取。':sniper?'当前为狙击对决：真人与电脑只能使用相同的枪械，主武器统一 AWM，副武器（沙漠之鹰）与手雷随身配备。近战武器可选，出生区内更换立即生效。':'副武器和手雷随身配备。出生区内更换主武器或近战武器立即生效，离开出生区后在下次复活时领取。')+'</p>');
  bindPrefs();
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
    updateCrosshair();
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
    if(!parsed){notify('未导入，已保留当前准星。请检查代码格式，工坊仅支持主准星的内线和中心点。');return;}
    sync(parsed);notify('已成功导入无畏契约准星代码！');
  };
  $('xhCopy').onclick=()=>{
    const code=exportValorantCode(crosshairCfg);
    navigator.clipboard?.writeText(code).then(()=>notify('已复制无畏契约准星代码')).catch(()=>notify('代码：'+code));
  };
}
function setup(){showDialog('setup','MATCH SETUP','对局配置',selectors(prefs,['map','mode','team','size','goal','sniperGoal','knifeGoal','diff','botPrimary','tod','quality'])+'<div class="actions"><button id="setupDone" class="primary">完成</button></div>');bindPrefs();$('setupDone').onclick=closePanel;}
function controlRows(){
  if(coarse)return '<p class="panelNote">左侧摇杆移动，右侧拖动转向。暂停菜单可换装或查看战绩。</p>';
  return keybindRowsMarkup(binds)+'<p class="panelNote">点击右侧按钮后按下键盘按键或鼠标侧键（侧键 4 / 侧键 5）即可改键，按 Esc 取消。数字键 1–4 切换武器槽，滚轮快速切枪。</p>';
}
function settings(){
  stopRebind();
  let ranges='';for(const [id,name,min,max,step,value] of [['sens','视角灵敏度',.2,3,.05,sensitivity],['fov','视野',65,100,1,prefs.fov],['vol','音量',0,1,.05,prefs.vol]])ranges+='<div class="row"><label for="'+id+'">'+name+'</label><input type="range" id="'+id+'" min="'+min+'" max="'+max+'" step="'+step+'" value="'+value+'"><output>'+value+'</output></div>';
  showDialog('settings','CONTROLS','设置与操作',ranges+selectors(prefs,['wheel','tod','quality'])+'<div class="row"><span>自定义准星</span><button id="openXhFromSet" class="secondary">打开准星工坊</button></div>'+controlRows()+'<div class="row"><span>游戏声音</span><button id="audioToggle" class="secondary">'+(sound?'开启':'关闭')+'</button></div>'+(mode==='paused'?'<div class="actions"><button id="settingsResume" class="primary">返回对局</button></div>':'')+'<p class="panelNote">爪刀模型 <a href="https://sketchfab.com/3d-models/low-poly-karambit-bicagi-9f48d6ee01584347ad54df3526170bd9" target="_blank" rel="noopener">OldTÜRK34</a> · <a href="https://creativecommons.org/licenses/by/4.0/" target="_blank" rel="noopener">CC BY 4.0</a> · 已适配握持与材质</p>');
  for(const el of panel.querySelectorAll('input'))el.oninput=()=>{
    el.nextElementSibling.value=el.value;if(el.id==='sens'){sensitivity=+el.value;try{localStorage.setItem('df-sensitivity',sensitivity);}catch{}}
    else{prefs[el.id]=+el.value;applyPref(el.id);}
  };bindPrefs();
  for(const btn of panel.querySelectorAll('.kbBtn'))btn.onclick=e=>{
    e.stopPropagation();
    const act=btn.dataset.bindAction;
    if(rebindAction===act){stopRebind();return;}
    stopRebind();
    rebindAction=act;
    btn.classList.add('listening');
    btn.textContent='请按键 / 侧键…';
  };
  const resetBtn=$('resetBinds');
  if(resetBtn)resetBtn.onclick=()=>{
    stopRebind();binds=resetBinds();codeMap=buildCodeMap(binds);
    for(const b of panel.querySelectorAll('.kbBtn'))b.textContent=bindLabel(binds[b.dataset.bindAction]);
    notify('已恢复默认按键');
  };
  $('openXhFromSet').onclick=crosshairStudio;
  const setResume=$('settingsResume');
  if(setResume)setResume.onclick=resume;
  if(location.protocol!=='file:'){
    const download=document.createElement('a');download.className='offline';download.href='./transport-ship.html';download.download='运输船-离线版.html';download.textContent='下载单文件离线版';$('panelContent').append(download);
  }
  $('audioToggle').onclick=()=>{sound=!sound;setSound();$('audioToggle').textContent=sound?'开启':'关闭';};
}
$('mapPick').innerHTML=selectors(prefs,['map']);bindPrefs($('mapPick'));
$('modePick').innerHTML=selectors(prefs,['mode']);bindPrefs($('modePick'));
$('battleSetup').onclick=setup;$('armory').onclick=()=>armory(false);$('openCrosshair').onclick=crosshairStudio;summary();
$('controls').onclick=$('options').onclick=settings;
const mapCache=new WeakMap();
function staticMapLayer(target,horizontal){
  const w=target.width,h=target.height,cached=mapCache.get(target);
  if(cached&&cached.world===world&&cached.w===w&&cached.h===h&&cached.horizontal===horizontal)return cached;
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
  const entry={world,w,h,horizontal,sc,layer:off};mapCache.set(target,entry);return entry;
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
$('openMap').onclick=()=>{if(!world)return;const m=currentMap();showDialog('map','TACTICAL PLAN',m.mapTitle,'<canvas width="760" height="390" class="fullchart" id="fullChart"></canvas><div class="legend"><span><b style="color:var(--ice)">■</b>'+m.legend[0]+'</span><span><b style="color:var(--red)">■</b>'+m.legend[1]+'</span><span><b style="color:var(--gold)">➤</b>'+m.legend[2]+'</span></div>');drawMap($('fullChart'),null,true);};
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
function closePanel(){stopRebind();if(panel.open)panel.close();dialogKind='';}
function resetFeedback(){clearAnnouncement();deckAudio.reset();$('feed').replaceChildren();$('notice').hidden=true;}
function start(){
  resetFeedback();closePanel();setMode('playing');setSound();
  match.start({...prefs,goal:roundGoal()});match.input('fov',prefs.fov);canvas.focus();lock();
}
function chooseOpponent(){
  if(prefs.mode!=='duel'){start();return;}
  showDialog('duelChoice','1V1','选择对手',
    '<div class="actions"><button id="duelComputer" class="primary">电脑对手</button><button id="duelFriend" class="secondary">好友房</button></div>'+
    selectors(prefs,['botPrimary'])+
    '<p class="panelNote">单挑的电脑只有一人，指定它的武器就能把对局变成专项练习：AWM 练爆头线与卡点，MP5 练近距离拉扯，跟随玩家则是完全镜像的公平枪法对枪。好友房不受此项影响。</p>');
  bindPrefs();
  $('duelComputer').onclick=start;
  $('duelFriend').onclick=()=>duelRoom.open();
}
function botWeapon(){
  if(mode==='playing')match.pause();
  setMode('paused');release();
  showDialog('botWeapon','1V1 DUEL','电脑对手武器',
    selectors(prefs,['botPrimary'])+
    '<p class="panelNote" id="botWeaponState">切换对当前对局立即生效：电脑存活时会在它下次复活后换枪。「跟随玩家」会同步你此刻装备的主武器。</p>'+
    '<p class="panelNote">把电脑钉在一把枪上，就是最省事的专项练习：AWM 练爆头线与卡点反制，MP5 练近距离身法拉扯，AK 练中距离压枪对枪。好友房不受此项影响。</p>');
  bindPrefs();
}
function stopOnlineMatch(){
  if(!onlineMatch)return;
  onlineMatch.dispose();
  onlineMatch=null;match=localMatch;
  release();setMode('menu');drawMap($('chart'),null,true);
}
const duelRoom=createDuelRoom({
  show:showDialog,panel,notify,prefs,onDisconnect:stopOnlineMatch,
  onPacket(packet){
    if(packet.type==='started'){
      const serverMap=packet.map||'ship';
      if(world?.id!==serverMap)switchMap(serverMap);
      localMatch.clearScene();resetFeedback();
      onlineMatch=createDuelClient({scene,camera,view,world,send:duelRoom.send,emit:hudEvent});
      match=onlineMatch;
      setMode('paused');
      setSound();
      match.apply(packet);match.input('fov',prefs.fov);
      showDialog('duelEnter','1V1','好友对局已开始',
        '<div class="actions"><button id="duelEnter" class="primary">进入对局</button></div>');
      $('duelEnter').onclick=resume;
      return;
    }
    if(!onlineMatch)return;
    if(packet.type==='state'||packet.type==='ended'){
      match.apply(packet);
      if(packet.type==='ended'){match.update(0);hudEvent('end',match.state);}
    }else if(packet.type==='event'||packet.type==='fx'||packet.type==='view')match.visual(packet);
  }
});
function resume(){closePanel();setMode('playing');match.resume();canvas.focus();lock();}
function toMenu(){duelRoom.leave();stopOnlineMatch();localMatch?.clearScene();closePanel();release();setMode('menu');drawMap($('chart'),null,true);}
function pauseUI(){
  if(mode!=='playing'&&mode!=='paused')return;
  match.pause();setMode('paused');release();
  const swapLabel=match.state.mode==='knife'||match.state.mode==='sniper'?'更换近战武器':'更换主武器/近战';
  const botSwap=match.state.mode==='duel'&&!onlineMatch;
  showDialog('pause','MATCH MENU',onlineMatch?'好友对局进行中':'对局已暂停','<div class="actions"><button id="resume" class="primary">继续对局</button><button id="inLoadout" class="secondary">'+swapLabel+'</button>'+(botSwap?'<button id="inBotWeapon" class="secondary">电脑武器</button>':'')+'<button id="inCrosshair" class="secondary">自定义准星</button><button id="inBoard" class="secondary">查看战绩</button><button id="inSettings" class="secondary">设置与操作</button><button id="leave" class="secondary">返回甲板首页</button></div>');
  $('inLoadout').onclick=()=>armory(true);if(botSwap)$('inBotWeapon').onclick=botWeapon;$('inCrosshair').onclick=crosshairStudio;$('inBoard').onclick=()=>showDialog('board','SCOREBOARD','团队战绩',board(match.state));$('resume').onclick=resume;$('inSettings').onclick=settings;$('leave').onclick=toMenu;
}
function dismiss(){if(dialogKind==='duelRoom'){duelRoom.leave();closePanel();return;}if(dialogKind==='duelEnter'){resume();return;}if(dialogKind==='loadout'){resume();return;}if(dialogKind==='end'){if(onlineMatch)duelRoom.lobby();else toMenu();return;}if(dialogKind==='pause'){resume();return;}closePanel();if(mode==='paused')pauseUI();}
$('closePanel').onclick=dismiss;panel.oncancel=e=>{e.preventDefault();dismiss();};
$('deploy').onclick=chooseOpponent;$('pauseHud').onclick=pauseUI;
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
function syncCombatHud(mode){
  const touch=$('touch');
  if(touch.dataset.rules===mode)return;
  touch.dataset.rules=mode;
  const knife=mode==='knife';
  $('ammo').parentElement.hidden=knife;
  touch.querySelector('[data-touch=cycle]').hidden=knife;
  touch.querySelector('[data-touch=reload]').textContent=knife?'检视':'换弹';
  touch.querySelector('[data-touch=aim]').textContent=knife?'重击':'瞄准';
  for(const button of touch.querySelectorAll('[data-touch=fire]')){
    button.textContent=knife?'轻击':'开火';
    if(button.classList.contains('leftTrigger'))button.setAttribute('aria-label',knife?'左侧轻击':'左侧开火');
  }
}
function hudEvent(type,data){
  if(type==='sfx'){deckAudio.sfx(data);return;}

  if(type==='hud'){
    syncCombatHud(data.mode);
    put('blue',String(data.score[0]).padStart(2,'0'));put('red',String(data.score[1]).padStart(2,'0'));
    put('hp',data.hp);put('ammo',isMelee(data.weapon)?'∞':data.ammo);put('reserve',data.reserve);
    put('goalText',(data.mode==='knife'?'3v3 刀战 · ':data.mode==='duel'?'单挑 1v1 · ':data.mode==='sniper'?'狙击对决 · ':'')+'目标 '+data.target);put('weaponName',names[data.weapon]);put('armor',data.armor);
    $('scopeOverlay').hidden=!data.zoom||!data.alive;
    $('adsOverlay').hidden=!data.aiming||!!data.zoom||!data.alive;
    put('aimName',data.aimName||'');$('aimName').style.color=data.aimTeam===data.team?'var(--ice)':'var(--red)';
    put('protection',data.protect>0&&data.alive?'出生保护 '+data.protect.toFixed(1)+' s':'');
    $('hud').classList.toggle('lowhp',data.hp<30&&data.alive);$('viewport').classList.toggle('spectate',!data.alive);
    const key=data.inventory.map(w=>w.id).join('/')+data.slot;
    if(key!==rackKey){rackKey=key;$('slotRack').innerHTML=data.inventory.map((w,i)=>'<button data-slot="'+i+'" class="'+(data.slot===i?'selected':'')+'" aria-label="'+names[w.id]+'"><b>'+(i+1)+'</b>'+weaponIcon(w.id)+'</button>').join('');}
    if(!$('roster').hidden){const html=board(data);if(html!==boardKey){boardKey=html;$('roster').innerHTML=html;}}
    if(lastBearing!==null)$('bearing').style.transform='translate(-50%,-50%) rotate('+(data.player.yaw-lastBearing)+'rad)';
    put('clock',clockText(Math.ceil(data.remaining)));
    if(data.hp!==lastHpPct){lastHpPct=data.hp;hpBarFill.style.width=data.hp+'%';}
    const lowAmmo=data.alive&&data.maxAmmo>1&&data.ammo<=Math.max(1,Math.ceil(data.maxAmmo*.25));
    ammoBox?.classList.toggle('lowammo',lowAmmo);
    put('gunstatus',data.reloading?'正在换弹 '+Math.round((data.reloadProgress||0)*100)+'%':data.aiming?'瞄准':isMelee(data.weapon)?'右键重击':data.weapon==='he'?'投掷':!data.ammo?'弹匣已空':lowAmmo?'弹药不足':'就绪');
    $('cross').hidden=data.aiming||!data.alive;$('respawn').hidden=data.alive||data.phase==='ended';
    $('slotRack').hidden=!data.alive;
    if(!data.alive)put('respawnLabel','被 '+data.killedBy+' 击倒 · '+Math.ceil(data.respawnIn)+' 秒后复活');
    const report=data.alive?null:data.deathReport;
    // Online snapshots re-create the object each tick; avoid re-announcing the same report.
    const reportKey=report?JSON.stringify(report):null;
    if(reportKey!==shownDeathReport){
      shownDeathReport=reportKey;
      renderDeathReport($('deathReport'),report);
    }
    drawMap($('radar'),data);
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
    const knife=data.mode==='knife';
    const accuracy=knife?'挥刀命中 '+data.hits+' / '+data.attempts+'（'+data.accuracy+'%）':data.headshots+' 爆头 · 命中率 '+data.accuracy+'%';
    showDialog('end',knife?'3v3 刀战 · 对局结算':data.mode==='duel'?'单挑 1v1 · 对局结算':data.mode==='sniper'?'狙击对决 · 对局结算':'MATCH RESULT',b===r?'双方平局':win?'我方胜利':'对方胜利','<div class="result"><span>'+b+'</span> · <b>'+r+'</b></div><div class="row">MVP <b>'+mvp.name+' · '+mvp.kills+' 击杀</b></div><p class="panelNote">你的战绩　'+data.kills+' 击杀 · '+data.deaths+' 阵亡 · '+accuracy+'</p>'+board(data)+'<div id="finalDeathReport"></div><div class="actions"><button id="again" class="primary">再来一局</button><button id="home" class="secondary">返回首页</button></div>');const finalReport=$('finalDeathReport');
    if(finalReport&&!data.alive)renderDeathReport(finalReport,data.deathReport);
    if(onlineMatch){$('again').textContent='返回好友房';$('again').onclick=duelRoom.lobby;}else $('again').onclick=start;$('home').onclick=toMenu;
  }
}
let binds=loadBinds(),codeMap=buildCodeMap(binds),rebindAction=null;
const fallbackCodes={ArrowUp:{action:'forward',kind:'hold'},ArrowDown:{action:'back',kind:'hold'},ArrowLeft:{action:'left',kind:'hold'},ArrowRight:{action:'right',kind:'hold'},ShiftRight:{action:'walk',kind:'hold'},KeyY:{action:'inspect',kind:'tap'}};
function stopRebind(){
  if(!rebindAction)return;
  rebindAction=null;
  for(const b of panel.querySelectorAll('.kbBtn')){
    b.classList.remove('listening');
    b.textContent=bindLabel(binds[b.dataset.bindAction]);
  }
}
function commitRebind(code){
  const act=rebindAction;
  assignBind(binds,act,code);
  codeMap=buildCodeMap(binds);
  stopRebind();
  notify('已更新按键：'+bindLabel(code));
}
function dispatchBind(code,down,repeat=false){
  const def=codeMap[code]||fallbackCodes[code];
  if(!def)return false;
  if(def.kind==='roster'){
    $('roster').hidden=!down;
    if(down)$('roster').innerHTML=board(match.state);
    return true;
  }
  if(def.kind==='hold'){
    match.input(def.action,down);
    return true;
  }
  if(def.kind==='tap'&&down&&!repeat){
    if(def.action==='last')match.input('last',true);
    else if(def.action==='inspect'&&match.state.alive)view.inspect();
    else if(def.action==='loadout')armory(true);
  }
  return true;
}
for(const kind of ['keydown','keyup'])addEventListener(kind,e=>{
  const down=kind==='keydown';
  if(rebindAction){
    e.preventDefault();e.stopPropagation();
    if(down&&!e.repeat){
      if(e.code==='Escape')stopRebind();
      else commitRebind(e.code);
    }
    return;
  }
  if(e.code===binds.loadout&&down&&!e.repeat&&dialogKind==='loadout'){e.preventDefault();resume();return;}
  if(e.key==='Escape'&&down&&mode==='playing'){e.preventDefault();pauseUI();return;}
  if(down&&e.key==='?'&&mode==='menu'&&!panel.open)settings();
  if(mode!=='playing'||!match)return;
  if(down&&!e.repeat){
    if(/^Digit[1-4]$/.test(e.code)&&!codeMap[e.code])match.input('slot',Number(e.code.at(-1))-1);
    // Keep debug toggles away from the gameplay inspect and fidget keys.
    if(e.code==='F8'&&view?.isKarambitActive?.()){
      e.preventDefault();
      view.karambitConfig.showGizmos=!view.karambitConfig.showGizmos;
      notify('爪刀 Debug 面板与 Gizmos：'+(view.karambitConfig.showGizmos?'开启（F8 切换）':'关闭'));
    }
    if(e.code==='F9'&&view?.isKarambitActive?.()){
      e.preventDefault();
      view.karambitConfig.slowMo=!view.karambitConfig.slowMo;
      notify('爪刀检视倍率：'+(view.karambitConfig.slowMo?'0.2x 慢动作（F9 切换）':'1.0x 正常速度'));
    }
    if(e.code==='BracketLeft'&&view?.isKarambitActive?.()&&view.karambitConfig.showGizmos){
      e.preventDefault();view.stepKarambit(-1/60);
    }
    if(e.code==='BracketRight'&&view?.isKarambitActive?.()&&view.karambitConfig.showGizmos){
      e.preventDefault();view.stepKarambit(1/60);
    }
    if(e.code==='KeyP'&&view?.isKarambitActive?.()&&view.karambitConfig.showGizmos){
      e.preventDefault();view.karambitConfig.paused=!view.karambitConfig.paused;
    }
  }
  if(dispatchBind(e.code,down,e.repeat))e.preventDefault();
});
$('slotRack').addEventListener('pointerdown',e=>{const btn=e.target.closest('[data-slot]');if(btn&&mode==='playing')match.input('slot',+btn.dataset.slot);});
let lastWheelAt=0;
canvas.addEventListener('wheel',e=>{
  if(mode!=='playing')return;
  e.preventDefault();
  if(!match.state.alive){
    $('respawn').scrollTop+=e.deltaY*(e.deltaMode===1?16:e.deltaMode===2?$('respawn').clientHeight:1);
    return;
  }
  const now=performance.now();
  if(now-lastWheelAt<65)return;
  lastWheelAt=now;
  const dir=Math.sign(e.deltaY);
  if(!dir)return;
  if(prefs.wheel==='val')match.input('wheelQuick',dir);
  else match.input('cycle',dir);
},{passive:false});
canvas.addEventListener('contextmenu',e=>e.preventDefault());
// Mouse events report each button transition, including side buttons (Mouse3/Mouse4).
window.addEventListener('auxclick',e=>{
  if(rebindAction||mode==='playing')e.preventDefault();
});
window.addEventListener('mousedown',e=>{
  if(rebindAction){
    if(e.target.closest?.('.kbBtn')&&e.button===0)return;
    e.preventDefault();e.stopPropagation();
    commitRebind(mouseCode(e.button));
    return;
  }
  if(mode!=='playing'||e.sourceCapabilities?.firesTouchEvents)return;
  if(e.target!==canvas&&document.pointerLockElement!==canvas)return;
  if(e.button>=1)e.preventDefault();
  if(!coarse&&canvas.requestPointerLock&&document.pointerLockElement!==canvas){
    if((e.button===0||e.button===2)&&!lockPending)lock();
    e.preventDefault();
    return;
  }
  if(document.pointerLockElement===canvas&&performance.now()<lockGraceUntil){
    e.preventDefault();
    return;
  }
  draggingMouse=!!(e.buttons&3);
  dispatchBind(mouseCode(e.button),true,false);
},true);
window.addEventListener('mouseup',e=>{
  if(rebindAction){
    if(e.button>=1)e.preventDefault();
    return;
  }
  if(mode!=='playing'||e.sourceCapabilities?.firesTouchEvents)return;
  if(e.button>=1)e.preventDefault();
  draggingMouse=!!(e.buttons&3);
  dispatchBind(mouseCode(e.button),false,false);
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
    if(action==='reload'&&match.state.mode==='knife'){
      if(match.state.alive)view.inspect();
      return;
    }
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
  updateCrosshair();frameDirty=true;
}
function render(time){
  const t=time*.001,dt=Math.min(.08,Math.max(0,t-elapsed));elapsed=t;
  if((mode==='paused'||mode==='ended')&&!frameDirty&&time-lastIdleRender<66)return;
  if(mode==='paused'||mode==='ended'){lastIdleRender=time;frameDirty=false;}
  world.update(t,dt);
  if(mode==='menu'){
    const drift=Math.sin(t*.07)*.6;
    const mc=world.menuCamera||{pos:[19,11.3,28.8],lookAt:[-1.9,2.0,-6.3]};
    fly.position.set(mc.pos[0]+drift,mc.pos[1],mc.pos[2]);fly.lookAt(...mc.lookAt);
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
      updateKarambitDebugBadge();
    }
    renderer.clear();renderer.render(scene,camera);
    if(match.state.alive&&!match.state.zoom){renderer.clearDepth();renderer.render(view.scene,view.camera);}
  }
}
async function prewarm(){
  const warmup=match.warmup();
  const savedVis=[];
  view.scene.traverse(o=>{savedVis.push([o,o.visible]);o.visible=true;});
  let deferredCleanup=false;
  try{
    if(renderer.compileAsync&&renderer.extensions.has('KHR_parallel_shader_compile')){
      deferredCleanup=true;
      const job=(async()=>{
        await renderer.compileAsync(scene,camera);
        await renderer.compileAsync(warmup.scene,camera,scene);
        await renderer.compileAsync(view.scene,view.camera);
      })();
      job.then(warmup.dispose,warmup.dispose);
      await Promise.race([job,new Promise(r=>setTimeout(r,2500))]);
    }else{
      renderer.compile(scene,camera);
      renderer.compile(warmup.scene,camera,scene);
      renderer.compile(view.scene,view.camera);
    }
  }catch{}
  finally{
    for(const [o,v] of savedVis)o.visible=v;
    if(!deferredCleanup)warmup.dispose();
  }
}
let karambitDebugEl=null,kdRefs=null;
function buildKarambitDebugPanel(){
  const el=document.createElement('div');
  el.id='karambitDebugBadge';
  el.style.cssText='position:fixed;left:14px;top:240px;z-index:30;width:336px;padding:9px 11px;border-radius:8px;background:rgba(10,16,22,.86);border:1px solid rgba(0,245,255,.45);color:#dff8ff;font:500 11.5px/1.45 ui-monospace,Consolas,monospace;backdrop-filter:blur(6px);user-select:none;';
  el.innerHTML=`
    <div id="kdTelemetry" style="white-space:pre;margin-bottom:6px;color:#9cf4ff;"></div>
    <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px;">
      <input id="kdScrub" type="range" min="0" max="2.10" step="0.005" value="0" style="flex:1;accent-color:#00f5ff;">
      <span id="kdTimeTxt" style="min-width:46px;text-align:right;">0.00s</span>
    </div>
    <div style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:7px;">
      <button id="kdPlay" style="padding:3px 7px;background:#16303d;color:#dff8ff;border:1px solid #398fa8;border-radius:4px;cursor:pointer;">暂停(P)</button>
      <button id="kdPrev" style="padding:3px 6px;background:#16303d;color:#dff8ff;border:1px solid #398fa8;border-radius:4px;cursor:pointer;">-1f [</button>
      <button id="kdNext" style="padding:3px 6px;background:#16303d;color:#dff8ff;border:1px solid #398fa8;border-radius:4px;cursor:pointer;">+1f ]</button>
      <button id="kdSlow" style="padding:3px 7px;background:#16303d;color:#dff8ff;border:1px solid #398fa8;border-radius:4px;cursor:pointer;">0.2x(F9)</button>
      <button id="kdLoop" style="padding:3px 7px;background:#16303d;color:#dff8ff;border:1px solid #398fa8;border-radius:4px;cursor:pointer;">持续循环</button>
      <button id="kdTrail" style="padding:3px 7px;background:#16303d;color:#dff8ff;border:1px solid #398fa8;border-radius:4px;cursor:pointer;">刀光:开</button>
      <label style="display:flex;align-items:center;gap:3px;padding:3px 6px;background:#16303d;color:#dff8ff;border:1px solid #398fa8;border-radius:4px;">检视速率<input id="kdSpeed" type="number" min="0.5" max="1.25" step="0.01" value="${view.karambitConfig.inspectSpeed}" style="width:44px;background:#0d1a22;color:#ffd24c;border:1px solid #398fa8;border-radius:3px;padding:1px 3px;font:inherit;"></label>
    </div>
    <div style="border-top:1px solid rgba(0,245,255,.22);padding-top:6px;">
      <div style="display:flex;align-items:center;gap:5px;margin-bottom:5px;">
        <span>KF:</span>
        <select id="kdKfSel" style="flex:1;background:#0d1a22;color:#dff8ff;border:1px solid #398fa8;border-radius:4px;padding:2px 4px;font:inherit;"></select>
      </div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:4px 8px;font-size:11px;">
        <label>Spin° <input id="kdSpin" type="number" step="5" style="width:68px;background:#0d1a22;color:#ffd24c;border:1px solid #398fa8;border-radius:3px;padding:1px 3px;"></label>
        <label>Finger <input id="kdFing" type="number" step="0.05" min="0" max="1" style="width:58px;background:#0d1a22;color:#dff8ff;border:1px solid #398fa8;border-radius:3px;padding:1px 3px;"></label>
        <label>ArmX <input id="kdAx" type="number" step="0.005" style="width:62px;background:#0d1a22;color:#dff8ff;border:1px solid #398fa8;border-radius:3px;padding:1px 3px;"></label>
        <label>ArmY <input id="kdAy" type="number" step="0.005" style="width:62px;background:#0d1a22;color:#dff8ff;border:1px solid #398fa8;border-radius:3px;padding:1px 3px;"></label>
        <label>ArmYaw <input id="kdRy" type="number" step="0.05" style="width:56px;background:#0d1a22;color:#dff8ff;border:1px solid #398fa8;border-radius:3px;padding:1px 3px;"></label>
        <label>ArmRoll <input id="kdRz" type="number" step="0.05" style="width:56px;background:#0d1a22;color:#dff8ff;border:1px solid #398fa8;border-radius:3px;padding:1px 3px;"></label>
        <label>WrsPitch <input id="kdWx" type="number" step="0.05" style="width:52px;background:#0d1a22;color:#dff8ff;border:1px solid #398fa8;border-radius:3px;padding:1px 3px;"></label>
        <label>WrsRoll <input id="kdWz" type="number" step="0.05" style="width:52px;background:#0d1a22;color:#dff8ff;border:1px solid #398fa8;border-radius:3px;padding:1px 3px;"></label>
      </div>
    </div>`;
  for(const ev of ['mousedown','pointerdown','click','wheel'])el.addEventListener(ev,e=>e.stopPropagation());
  document.body.append(el);
  const q=id=>el.querySelector('#'+id);
  const refs={el,telemetry:q('kdTelemetry'),scrub:q('kdScrub'),timeTxt:q('kdTimeTxt'),play:q('kdPlay'),prev:q('kdPrev'),next:q('kdNext'),slow:q('kdSlow'),loop:q('kdLoop'),trail:q('kdTrail'),speed:q('kdSpeed'),kfSel:q('kdKfSel'),spin:q('kdSpin'),fing:q('kdFing'),ax:q('kdAx'),ay:q('kdAy'),ry:q('kdRy'),rz:q('kdRz'),wx:q('kdWx'),wz:q('kdWz')};
  const kfs=view.karambitKeyframes;
  kfs.forEach((kf,idx)=>{
    const opt=document.createElement('option');
    opt.value=String(idx);opt.textContent=`${kf.time.toFixed(2)}s (${kf.phase})`;
    refs.kfSel.append(opt);
  });
  const syncKfInputs=()=>{
    const kf=kfs[Number(refs.kfSel.value)||0];
    refs.spin.value=kf.unwrappedSpinAngle;
    refs.fing.value=kf.fingers[1].toFixed(2);
    refs.ax.value=kf.armPos[0].toFixed(3);refs.ay.value=kf.armPos[1].toFixed(3);
    refs.ry.value=kf.armRot[1].toFixed(2);refs.rz.value=kf.armRot[2].toFixed(2);
    refs.wx.value=kf.wristRot[0].toFixed(2);refs.wz.value=kf.wristRot[2].toFixed(2);
  };
  syncKfInputs();
  refs.kfSel.onchange=()=>{syncKfInputs();const kf=kfs[Number(refs.kfSel.value)||0];view.scrubKarambit(kf.time,true);};
  const applyKf=()=>{
    const kf=kfs[Number(refs.kfSel.value)||0];
    kf.unwrappedSpinAngle=Number(refs.spin.value)||0;
    const fVal=T.MathUtils.clamp(Number(refs.fing.value)||0,0,1);
    kf.fingers[1]=kf.fingers[2]=kf.fingers[3]=kf.fingers[4]=fVal;
    kf.armPos[0]=Number(refs.ax.value)||0;kf.armPos[1]=Number(refs.ay.value)||0;
    kf.armRot[1]=Number(refs.ry.value)||0;kf.armRot[2]=Number(refs.rz.value)||0;
    kf.wristRot[0]=Number(refs.wx.value)||0;kf.wristRot[2]=Number(refs.wz.value)||0;
    view.scrubKarambit(kf.time,true);
  };
  for(const inp of [refs.spin,refs.fing,refs.ax,refs.ay,refs.ry,refs.rz,refs.wx,refs.wz])inp.oninput=applyKf;
  refs.scrub.oninput=()=>view.scrubKarambit(Number(refs.scrub.value),true);
  refs.play.onclick=()=>{view.karambitConfig.paused=!view.karambitConfig.paused;};
  refs.prev.onclick=()=>view.stepKarambit(-1/60);
  refs.next.onclick=()=>view.stepKarambit(1/60);
  refs.slow.onclick=()=>{view.karambitConfig.slowMo=!view.karambitConfig.slowMo;};
  refs.loop.onclick=()=>{view.karambitConfig.loopMode=view.karambitConfig.loopMode==='loop'?'single':'loop';};
  refs.trail.onclick=()=>{view.karambitConfig.showTrail=!view.karambitConfig.showTrail;};
  refs.speed.oninput=()=>{view.karambitConfig.inspectSpeed=T.MathUtils.clamp(Number(refs.speed.value)||1,.5,1.25);};
  return refs;
}
function updateKarambitDebugBadge(){
  if(!view?.karambitConfig)return;
  const cfg=view.karambitConfig;
  const show=view.isKarambitActive()&&(cfg.showGizmos||cfg.slowMo);
  if(!show){if(karambitDebugEl)karambitDebugEl.hidden=true;return;}
  if(!kdRefs){kdRefs=buildKarambitDebugPanel();karambitDebugEl=kdRefs.el;}
  const st=view.getKarambitDebugState();
  karambitDebugEl.hidden=false;
  kdRefs.telemetry.textContent=
    `State:${st.state} | ${st.phase}\n`+
    `t:${st.loopTime.toFixed(2)}s (Ref ${st.refTime.toFixed(2)}s) | Loop#${st.cycles} | ${st.timeScale}x | 检视 ${st.inspectSpeed}x\n`+
    `Spin:${st.unwrappedSpinDeg.toFixed(1)}° (${(st.unwrappedSpinDeg/360).toFixed(2)}圈) | ω:${st.spinVelDegS}°/s`;
  if(document.activeElement!==kdRefs.scrub){
    kdRefs.scrub.max=String(st.loopDuration);
    kdRefs.scrub.value=String(st.loopTime);
  }
  if(document.activeElement!==kdRefs.speed)kdRefs.speed.value=String(st.inspectSpeed);
  kdRefs.timeTxt.textContent=st.loopTime.toFixed(2)+'s';
  kdRefs.play.textContent=st.paused?'继续(P)':'暂停(P)';
  kdRefs.slow.textContent=cfg.slowMo?'0.2x:开':'0.2x:关';
  kdRefs.loop.textContent=cfg.loopMode==='loop'?'持续循环':'单次循环';
  kdRefs.trail.textContent=cfg.showTrail?'刀光:开':'刀光:关';
}
async function init(){
  try{
    renderer=new T.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance',alpha:false});renderer.autoClear=false;
    renderer.toneMapping=T.AgXToneMapping;renderer.toneMappingExposure=1.06;
    renderer.shadowMap.enabled=true;renderer.shadowMap.type=T.PCFSoftShadowMap;renderer.shadowMap.autoUpdate=false;renderer.shadowMap.needsUpdate=true;
    world=currentMap().build(scene);view=createViewModel(deckAudio.sfx);view.initEnv?.(renderer);
    const dbgParam=new URLSearchParams(location.search).get('debug');
    if(dbgParam==='karambit'||dbgParam==='karambit-notrail')view.karambitConfig.showGizmos=true;
    if(dbgParam==='karambit-notrail')view.karambitConfig.showTrail=false;
    globalThis.__KARAMBIT_DEBUG__={
      config:view.karambitConfig,
      keyframes:view.karambitKeyframes,
      getState:()=>view.getKarambitDebugState(),
      inspect:()=>view.inspect(),
      holster:()=>view.holster(),
      scrubTo:(t,pause=true)=>view.scrubKarambit(t,pause),
      step:(dt=1/60)=>view.stepKarambit(dt),
      toggleGizmos:()=>{view.karambitConfig.showGizmos=!view.karambitConfig.showGizmos;return view.karambitConfig.showGizmos;},
      toggleSlowMo:()=>{view.karambitConfig.slowMo=!view.karambitConfig.slowMo;return view.karambitConfig.slowMo;},
      toggleTrail:()=>{view.karambitConfig.showTrail=!view.karambitConfig.showTrail;return view.karambitConfig.showTrail;}
    };
    match=localMatch=createMatch({scene,camera,world,view,emit:hudEvent});for(const key of ['quality','tod','vol','fov','butterflyFinish','m9Finish','karambitFinish'])applyPref(key);setSound();resize();
    await view.ready;
    await prewarm();
    render(performance.now());drawMap($('chart'),null,true);renderer.setAnimationLoop(render);
    $('deploy').disabled=false;summary();$('readyText').textContent=currentMap().readyText;addEventListener('resize',resize);
    if(invited)duelRoom.open(true);
  }catch(e){console.error(e);$('deployLabel').textContent='无法载入';$('readyText').textContent='3D 场景未能启动';notify('无法启动 3D 画面。请在开启硬件加速的 Chrome 或 Edge 中打开。');}
}
init();
