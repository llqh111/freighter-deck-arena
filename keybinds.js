const STORAGE_KEY='df-binds';

export const BIND_DEFS=[
  {action:'forward',label:'前进',defaultCode:'KeyW',kind:'hold'},
  {action:'back',label:'后退',defaultCode:'KeyS',kind:'hold'},
  {action:'left',label:'左移',defaultCode:'KeyA',kind:'hold'},
  {action:'right',label:'右移',defaultCode:'KeyD',kind:'hold'},
  {action:'jump',label:'跳跃',defaultCode:'Space',kind:'hold'},
  {action:'crouch',label:'下蹲',defaultCode:'KeyC',kind:'hold'},
  {action:'walk',label:'静步',defaultCode:'ShiftLeft',kind:'hold'},
  {action:'sprint',label:'冲刺',defaultCode:'KeyX',kind:'hold'},
  {action:'fire',label:'开火 / 轻击',defaultCode:'Mouse0',kind:'hold'},
  {action:'aim',label:'瞄准 / 重击',defaultCode:'Mouse2',kind:'hold'},
  {action:'reload',label:'换弹 / 刀连转',defaultCode:'KeyR',kind:'hold'},
  {action:'last',label:'快切上把武器',defaultCode:'KeyQ',kind:'tap'},
  {action:'inspect',label:'检视武器',defaultCode:'KeyF',kind:'tap'},
  {action:'loadout',label:'更换装备',defaultCode:'KeyB',kind:'tap'},
  {action:'roster',label:'查看战绩',defaultCode:'Tab',kind:'roster'}
];

export const DEFAULT_BINDS=Object.fromEntries(BIND_DEFS.map(d=>[d.action,d.defaultCode]));

export function loadBinds(){
  const binds={...DEFAULT_BINDS};
  try{
    const saved=JSON.parse(localStorage.getItem(STORAGE_KEY)||'{}');
    for(const {action} of BIND_DEFS){
      if(typeof saved[action]==='string'&&saved[action].length>0)binds[action]=saved[action];
    }
  }catch{}
  return binds;
}

export function saveBinds(binds){
  try{localStorage.setItem(STORAGE_KEY,JSON.stringify(binds));}catch{}
}

export function resetBinds(){
  const fresh={...DEFAULT_BINDS};
  saveBinds(fresh);
  return fresh;
}

export function assignBind(binds,action,code){
  const prev=binds[action];
  if(prev===code)return binds;
  for(const def of BIND_DEFS){
    if(def.action!==action&&binds[def.action]===code){
      binds[def.action]=prev;
    }
  }
  binds[action]=code;
  saveBinds(binds);
  return binds;
}

export function buildCodeMap(binds){
  const map=Object.create(null);
  for(const def of BIND_DEFS){
    map[binds[def.action]]=def;
  }
  return map;
}

export function mouseCode(button){
  return 'Mouse'+button;
}

const SPECIAL_LABELS={
  Mouse0:'鼠标左键',
  Mouse1:'鼠标中键',
  Mouse2:'鼠标右键',
  Mouse3:'鼠标侧键 4 (后退)',
  Mouse4:'鼠标侧键 5 (前进)',
  Space:'空格',
  ShiftLeft:'左 Shift',
  ShiftRight:'右 Shift',
  ControlLeft:'左 Ctrl',
  ControlRight:'右 Ctrl',
  AltLeft:'左 Alt',
  AltRight:'右 Alt',
  Tab:'Tab',
  CapsLock:'CapsLock',
  Backquote:'`',
  Minus:'-',
  Equal:'=',
  BracketLeft:'[',
  BracketRight:']',
  Backslash:'\\',
  Semicolon:';',
  Quote:"'",
  Comma:',',
  Period:'.',
  Slash:'/',
  ArrowUp:'↑',
  ArrowDown:'↓',
  ArrowLeft:'←',
  ArrowRight:'→'
};

export function bindLabel(code){
  if(!code)return '未绑定';
  if(SPECIAL_LABELS[code])return SPECIAL_LABELS[code];
  if(code.startsWith('Key'))return code.slice(3);
  if(code.startsWith('Digit'))return code.slice(5);
  if(code.startsWith('Numpad'))return '小键盘 '+code.slice(6);
  if(code.startsWith('Mouse'))return '鼠标键 '+(Number(code.slice(5))+1);
  return code;
}

export function keybindRowsMarkup(binds){
  return '<div class="kbHead"><span class="sectionTitle">自定义按键（支持键盘与鼠标侧键）</span><button id="resetBinds" class="secondary kbReset" type="button">恢复默认</button></div>'+
    '<div class="kbGrid">'+
    BIND_DEFS.map(({action,label})=>
      `<div class="kbRow"><span>${label}</span><button type="button" class="secondary kbBtn" data-bind-action="${action}">${bindLabel(binds[action])}</button></div>`
    ).join('')+
    '</div>';
}
