const inviteCode=new URLSearchParams(location.search).get('room');
export const invited=/^[a-f0-9]{16}$/.test(inviteCode??'');
const teamNames=['保卫者','潜伏者'];

export function createDuelRoom({show,panel,notify,prefs,onPacket,onDisconnect}){
  let socket,room,config,selectedAddress,generation=0;
  const send=message=>{
    if(socket?.readyState!==WebSocket.OPEN||socket.bufferedAmount>32768)return false;
    socket.send(JSON.stringify(message));return true;
  };
  function inviteLink(address,code){
    const url=new URL('/',location.href);
    url.hostname=address;
    url.searchParams.set('room',code);
    return url.href;
  }
  function displayRoom(data){
    const you=data.players.find(player=>player.id===data.you);
    const host=data.host===data.you;
    show('duelRoom','1V1','好友房',
      '<p class="panelNote" id="duelStatus" role="status"></p><div id="duelPlayers"></div>'+
      '<fieldset class="choice"><legend>选择阵营</legend><button data-side="0">保卫者</button><button data-side="1">潜伏者</button></fieldset>'+
      (host?'<label for="duelAddress">邀请地址</label><select id="duelAddress"></select><input id="duelInvite" aria-label="邀请链接" readonly>':'')+
      '<div class="actions">'+(host?'<button id="duelCopy" class="secondary">复制邀请链接</button>':'')+
      '<button id="duelReady" class="secondary"></button>'+(host?'<button id="duelStart" class="primary">开始对局</button>':'')+'</div>');
    const status=panel.querySelector('#duelStatus');
    status.textContent=data.notice||(data.players.length<2?'等待好友加入 · 10 杀 / 5 分钟':'双方准备后由房主开局 · 10 杀 / 5 分钟');
    for(const player of data.players){
      const row=document.createElement('div');
      row.className='row';
      row.textContent=teamNames[player.team]+' · '+player.name+' · '+(player.id===data.host?'房主 · ':'')+(player.ready?'已准备':'未准备');
      panel.querySelector('#duelPlayers').append(row);
    }
    for(const button of panel.querySelectorAll('[data-side]')){
      const team=Number(button.dataset.side);
      button.setAttribute('aria-pressed',String(team===you.team));
      button.onclick=()=>send({type:'team',team});
    }
    const ready=panel.querySelector('#duelReady');
    ready.textContent=you.ready?'取消准备':'准备';
    ready.onclick=()=>send({type:'ready',ready:!you.ready,primary:prefs.primary,melee:prefs.melee});
    if(!host)return;
    const start=panel.querySelector('#duelStart');
    start.disabled=data.players.length!==2||!data.players.every(player=>player.ready);
    start.onclick=()=>send({type:'start'});
    const addresses=new Map([[location.hostname,'当前地址'],...config.addresses.map(({address,name})=>[address,name])]);
    const select=panel.querySelector('#duelAddress'),link=panel.querySelector('#duelInvite');
    for(const [address,name] of addresses){
      const option=document.createElement('option');
      option.value=address;
      option.textContent=name+' · '+address;
      select.append(option);
    }
    const isLocal=location.hostname==='localhost'||location.hostname==='127.0.0.1';
    select.value=selectedAddress??(isLocal&&config.addresses.length?config.addresses[0].address:location.hostname);
    select.onchange=()=>{selectedAddress=select.value;link.value=inviteLink(selectedAddress,data.code);};
    select.onchange();
    link.onclick=()=>link.select();
    panel.querySelector('#duelCopy').onclick=async()=>{
      link.select();
      try{
        if(navigator.clipboard)await navigator.clipboard.writeText(link.value);
        else if(!document.execCommand('copy'))throw Error();
        status.textContent='邀请链接已复制。';
      }catch{status.textContent='链接已选中，按 Ctrl+C 复制。';}
    };
  }
  async function open(join=false){
    const id=++generation;
    show('duelRoom','1V1','好友房','<p class="panelNote" role="status">正在检查好友房服务…</p>');
    try{
      if(location.protocol!=='http:'&&location.protocol!=='https:')throw Error();
      const response=await fetch('./duel-server.json',{cache:'no-store'});
      if(!response.ok)throw Error();
      config=await response.json();
      if(config.game!=='deckfire-duel')throw Error();
    }catch{
      if(id===generation)show('duelRoom','1V1','需要启动好友房服务',
        '<p class="panelNote">在项目目录运行 <code>npm.cmd ci</code>，再运行 <code>npm.cmd start</code>。从服务器显示的网址打开游戏。</p>');
      return;
    }
    if(id!==generation)return;
    show('duelRoom','1V1',join?'加入好友房':'创建好友房',
      '<form id="duelJoin"><label for="duelName">昵称</label> <input id="duelName" name="name" required maxlength="16">'+
      '<p id="duelStatus" class="panelNote" role="status"></p><div class="actions"><button class="primary" type="submit">'+(join?'加入房间':'创建房间')+'</button></div></form>');
    const form=panel.querySelector('#duelJoin'),input=panel.querySelector('#duelName');
    input.value=join?'挑战者':'房主';
    form.onsubmit=event=>{
      event.preventDefault();
      const status=panel.querySelector('#duelStatus'),button=form.querySelector('button');
      const name=input.value.trim();
      if(!name){status.textContent='请输入昵称。';return;}
      button.disabled=true;
      const message={type:join?'join':'create',code:inviteCode,name};
      if(send(message)){button.disabled=false;return;}
      const url=new URL('/duel',location.href);
      url.protocol=location.protocol==='https:'?'wss:':'ws:';
      const connection=new WebSocket(url);
      socket=connection;
      connection.addEventListener('open',()=>{if(socket===connection)send(message);});
      connection.addEventListener('message',event=>{
        if(socket!==connection)return;
        const packet=JSON.parse(event.data);
        if(packet.type==='error'){
          button.disabled=false;
          const status=panel.querySelector('#duelStatus');
          if(status)status.textContent=packet.message;else notify(packet.message);
        }else if(packet.type==='room'){
          room=packet;onDisconnect();displayRoom(room);
        }else onPacket(packet);
      });
      connection.addEventListener('close',()=>{
        if(socket!==connection)return;
        socket=null;
        if(room){room=null;onDisconnect();show('duelRoom','1V1','连接已断开','<p class="panelNote">请重新进入好友房。</p>');}
        else{status.textContent='无法连接好友房服务。';button.disabled=false;}
      });
    };
  }
  function leave(){
    generation++;
    const connection=socket;
    send({type:'leave'});
    socket=null;room=null;
    connection?.close();
  }
  return {open,leave,send,lobby:()=>send({type:'lobby'})};
}
