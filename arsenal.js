// Distances are scene units, times in seconds. Each inventory owns its ammunition.
export const primaries=['ak47','m4a1','awm','mp5'];
export const melees=['knife','nepal','malay','butterfly','karambit'];
export const isMelee=id=>melees.includes(id);
const gun=(mag,reserve,reload,rpm,damage,head,armor,power,base,moving,bloom,recoil,speed=1)=>({
  mag,reserve,reload,interval:60/rpm,damage,head,armor,power,base,moving,bloom,recoil,speed
});
const blade=(speed,armor,lightDmg,heavyDmg,lightCd,heavyCd,reach,heavyReach,drawCd)=>({
  mag:0,reserve:0,speed,armor,melee:true,lightDmg,heavyDmg,lightCd,heavyCd,reach,heavyReach,drawCd
});
// Balance pass 2026-11-26
// 步枪分家：M4 爆头 4.0->3.4（打护甲头 91.8 留 8.2 血不杀，无甲仍一枪），射速 660->600 收窄 TTK 差
// 冲锋枪补身位：MP5 伤害 25->28、穿甲 .60->.65（6 枪 375ms），speed 显式写 1.06（原先漏参走默认 1）
// 副武器降速：沙鹰 speed 1->.97（原先与 MP5 同为漏参默认值，是全场最快）
// 近战修阈值：军刀重击 105->120 一刀杀、移速 1.12、拔刀 .10；马来剑重击距离 2.42->2.30；
//             蝴蝶刀轻击 59/.38 两刀杀、重击 116->108（原 99.76 会留 0.24 血，HUD 显示"1 血"像 bug）
export const arsenal={
  ak47:gun(30,90,2.45,570,40,4,.80,1.2,.0026,.085,.0056,.011,.93),
  m4a1:gun(30,90,2.3,600,36,3.4,.75,1,.0021,.074,.0045,.0085,.95),
  awm:{...gun(5,20,3.4,42,115,2.2,.97,2,.072,.12,0,.028,.84),scopeSettle:.15},
  mp5:gun(30,120,2.1,800,28,3.5,.65,.6,.004,.029,.0038,.006,1.06),
  deagle:gun(7,35,2,260,54,3.8,.8,1,.0032,.069,.014,.023,.97),
  knife:blade(1.12,.84,54,120,.37,.86,2.05,1.95,.10),
  nepal:blade(1.10,.90,68,135,.43,.90,2.20,2.18,.11),
  malay:blade(1.12,.88,52,118,.29,.80,2.35,2.30,.10),
  butterfly:blade(1.11,.86,59,108,.38,.77,2.13,2.13,.22),
  karambit:blade(1.12,.87,58,116,.40,.89,2.07,2.07,.15),
  he:{mag:1,reserve:0,speed:1,armor:.75}
};
// 远距离伤害衰减：只给 MP5 与沙鹰，步枪与 AWM 不衰减
export const falloff={
  mp5:{from:14,to:26,floor:.72},
  deagle:{from:18,to:32,floor:.85}
};
export function loadout(primary,melee='nepal',knifeOnly=false){
  const m=melees.includes(melee)?melee:'nepal';
  const ids=knifeOnly?[m]:[primary,'deagle',m,'he'];
  return ids.map(id=>({id,ammo:arsenal[id].mag,max:arsenal[id].mag,reserve:arsenal[id].reserve}));
}
export const skills={
  easy:{response:.65,miss:.88,sight:31,fov:1.60,head:.07,strafe:.13},
  normal:{response:.42,miss:.61,sight:43,fov:1.85,head:.12,strafe:.30},
  hard:{response:.24,miss:.38,sight:55,fov:2.05,head:.30,strafe:.60},
  hell:{response:.14,miss:.20,sight:70,fov:2.30,head:.50,strafe:.88}
};
