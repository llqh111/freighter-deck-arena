import {matchRules} from './match-rules.js?v=23';

export const names={ak47:'AK-47',m4a1:'M4A1',awm:'AWM',mp5:'MP5',deagle:'沙漠之鹰',knife:'军刀',nepal:'尼泊尔军刀',malay:'马来剑',butterfly:'蝴蝶刀',karambit:'爪刀',m9:'M9 · 舰卫',he:'手雷'};
export const teams=['保卫者','潜伏者'];
const profiles={ak47:['突击步枪','30 发','全自动'],m4a1:['突击步枪','30 发','全自动'],awm:['狙击步枪','5 发','双倍率'],mp5:['冲锋枪','30 发','全自动']};
const meleeProfiles={nepal:['反曲弯刀','重击高伤','甩刀手感'],malay:['波浪短剑','超远直刺','极速轻击'],knife:['制式军刀','经典均衡','轻快切刀'],butterfly:['CS 战术蝶刀','曲刃双柄','F/R 无限转刀'],karambit:['钩形短刃','反握快切','Y / F 翻面循环 · R 反向双转'],m9:['锯背固定刃','交替横斩 · 重击直刺','F / Y / R 双面检视']};
const silhouettes={
  ak47:'M3 13h12l5-4h28v2h14v2h24v3H55l-5 3-2 9-6-3 2-8h-5l-4 8-5-2 3-7h-9L5 23H3z',
  m4a1:'M3 12h14v2l6-4h11V6h13v4h23v2h16v3H65l-13 2-1 10-6-1-1-9h-6l-4 8-5-2 2-7H20L6 21H3z',
  awm:'M3 15h20l8-4h9V8h-7V5h20v3h-7v3h15v2h26v3H59l-5 2-3 8h-3l3-10H39l-4 7h-5l1-6H21L5 22H3z',
  mp5:'M8 14h14l6-5h26l4 2h10v4H55l-2 3-1 8-6 2-1-4 3-8h-9l-4 9-5-2 3-8H22l-12 5z',
  deagle:'M20 10h45v5l-7 2H41l-8 10-7-2 5-11H20z',
  knife:'M9 16h22l4-6h3l-1 4 38-6-8 8-28 4-4-2H10z',
  m9:'M7 14h25l2-5h4l1 4h7l2-3 3 3 3-3 3 3 3-3 3 3 4-2h8l13 7-14 5H39l-1 6h-4l-2-7H7z M48 17l2 3h12l3-3z',
  nepal:'M8 18l17-4 4-4 4 2c10-6 23-7 45-2-9 9-20 15-34 14-7-1-12-3-16-2l-4 3-16-2z',
  malay:'M8 15h17l3-6 4 2 7-3 7 4 7-4 7 4 8-3 10 3-10 5-8-2-7 4-7-4-7 4-7-3-4 2-3-5H8z',
  butterfly:'M6 10.5c10-2.2 21.5-2.1 30.5.8l4.5 2.7-4.8 1.9c-9-1.9-19.8-2-30.2-.9zm10 1.4a1.6 1.6 0 1 0 0 2.2 1.6 1.6 0 0 0 0-2.2zm7 0a1.5 1.5 0 1 0 0 2.1 1.5 1.5 0 0 0 0-2.1z M6 21.5c10 2.2 21.5 2.1 30.5-.8l4.5-2.7-4.8-1.9c-9 1.9-19.8 2-30.2.9zm-3.2.8h3.4v2.2H2.8z M40.5 14.2l5.8-3.2c13.8-1.4 26.8.6 39.7 5.8-11.2 4.3-23.6 5.4-38 2.2l-7.5-2.8zm13 .4 13.5 1.2-2.2 1.5-12.5-1.1z',
  karambit:'M9 18a7 7 0 1 1 14 0c9-4 18-7 29-6 13-6 25-5 35 0-13 0-20 4-24 9-5 5-12 6-18 2l-22 3c-4 5-14 5-14-8zm4 0a3.6 3.6 0 1 0 7.2 0 3.6 3.6 0 1 0-7.2 0z',
  he:'M35 9h15l4 6-1 8-6 4H35l-5-5v-8z M38 4h14l7 11-3 1-6-9H38z'};
export const weaponIcon=id=>'<svg aria-hidden="true" viewBox="0 0 90 32"><path fill="currentColor" d="'+(silhouettes[id]||'')+'"/></svg>';
export function choices(selected){
  return '<div class="weapons">'+Object.entries(profiles).map(([id,[type,ammo,mode]])=>'<button class="weaponCard" data-weapon="'+id+'" aria-pressed="'+(selected===id)+'"><small>'+type+'</small>'+weaponIcon(id)+'<b>'+names[id]+'</b><span>'+ammo+' · '+mode+'</span></button>').join('')+'</div>';
}
export function meleeChoices(selected){
  return '<div class="weapons meleeGrid">'+Object.entries(meleeProfiles).map(([id,[type,stat,feel]])=>'<button class="weaponCard" data-melee="'+id+'" aria-pressed="'+(selected===id)+'"><small>'+type+'</small>'+weaponIcon(id)+'<b>'+names[id]+'</b><span>'+stat+' · '+feel+'</span></button>').join('')+'</div>';
}
export const groups={map:['地图',[['ship','运输船'],['pyramid','新金字塔']]],mode:['对局模式',[['tdm','团队竞技'],['duel','单挑 1v1'],['knife','3v3 刀战']]],team:['阵营',[[0,'保卫者'],[1,'潜伏者']]],size:['队伍规模',[[3,'3v3'],[4,'4v4'],[6,'6v6'],[8,'8v8']]],goal:['团队竞技目标击杀',matchRules.tdm.goals.map(goal=>[goal,String(goal)])],knifeGoal:['刀战目标击杀',matchRules.knife.goals.map(goal=>[goal,String(goal)])],diff:['电脑难度',[['easy','简单'],['normal','普通'],['hard','困难'],['hell','地狱']]],botPrimary:['电脑武器（1v1）',[['mirror','跟随玩家'],['random','每局随机'],['ak47',names.ak47],['m4a1',names.m4a1],['awm',names.awm],['mp5',names.mp5]]],tod:['光照',[['day','白天'],['dusk','黄昏']]],quality:['画质',[['low','流畅'],['medium','均衡'],['high','极致']]],wheel:['滚轮模式',[['val','快捷'],['cycle','顺序循环']]], butterflyFinish:['蝴蝶刀涂装',[['steel','冷钢'],['violet-tide','紫黑 · 潮汐']]],m9Finish:['M9 涂装',[['fade','渐变'],['blue','蓝 · 深海'],['green','绿 · 翡翠'],['red','红 · 绯晶']]],karambitFinish:['爪刀涂装',[['default','原厂'],['hardened','淬火'],['sapphire','蓝宝石']]]};
export function selectors(settings,keys){return keys.map(key=>{const [title,opts]=groups[key];return '<fieldset class="choice"><legend>'+title+'</legend>'+opts.map(([v,label])=>'<button data-pref="'+key+'" data-value="'+v+'" aria-pressed="'+(settings[key]===v)+'">'+label+'</button>').join('')+'</fieldset>';}).join('');}
export function board(state){
 const rows=state.scoreboard||[];return '<div class="teamTables">'+teams.map((label,i)=>'<table><caption>'+label+'　'+state.score[i]+'</caption><thead><tr><th>队员</th><th>击杀</th><th>死亡</th><th>爆头</th></tr></thead><tbody>'+rows.filter(a=>a.team===i).sort((a,b)=>b.kills-a.kills||a.deaths-b.deaths).map(a=>'<tr class="'+(a.isPlayer?'myRow':'')+'"><td>'+a.name+(!a.alive?' · 阵亡':'')+'</td><td>'+a.kills+'</td><td>'+a.deaths+'</td><td>'+a.headshots+'</td></tr>').join('')+'</tbody></table>').join('')+'</div>';
}
