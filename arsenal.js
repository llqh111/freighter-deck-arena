// Distances are scene units, times in seconds. Each inventory owns its ammunition.
export const primaries=['ak47','m4a1','awm','mp5'];
export const melees=['knife','nepal','malay'];
export const isMelee=id=>melees.includes(id);
const gun=(mag,reserve,reload,rpm,damage,head,armor,power,base,moving,bloom,recoil,speed=1)=>({
  mag,reserve,reload,interval:60/rpm,damage,head,armor,power,base,moving,bloom,recoil,speed
});
const blade=(speed,armor,lightDmg,heavyDmg,lightCd,heavyCd,reach,heavyReach,drawCd)=>({
  mag:0,reserve:0,speed,armor,melee:true,lightDmg,heavyDmg,lightCd,heavyCd,reach,heavyReach,drawCd
});
export const arsenal={
  ak47:gun(30,90,2.45,570,40,4,.80,1.2,.0026,.085,.0056,.011,.93),
  m4a1:gun(30,90,2.3,660,36,4,.75,1,.0021,.074,.0045,.0085,.95),
  awm:gun(5,20,3.4,42,115,2.2,.97,2.8,.072,.12,0,.028,.84),
  mp5:gun(30,120,2.1,800,25,3.6,.6,.6,.004,.029,.0038,.006),
  deagle:gun(7,35,2,260,54,3.8,.8,1,.0032,.069,.014,.023),
  knife:blade(1.08,.84,54,105,.37,.86,2.05,1.80,.13),
  nepal:blade(1.10,.90,68,135,.43,.90,2.20,2.18,.11),
  malay:blade(1.12,.88,52,118,.29,.80,2.35,2.42,.10),
  he:{mag:1,reserve:0,speed:1,armor:.75}
};
export function loadout(primary,melee='nepal'){
  const m=melees.includes(melee)?melee:'nepal';
  return [primary,'deagle',m,'he'].map(id=>({id,ammo:arsenal[id].mag,max:arsenal[id].mag,reserve:arsenal[id].reserve}));
}
export const skills={
  easy:{response:.65,miss:.88,sight:31,fov:1.60,head:.07,strafe:.13},
  normal:{response:.42,miss:.61,sight:43,fov:1.85,head:.12,strafe:.30},
  hard:{response:.24,miss:.38,sight:55,fov:2.05,head:.30,strafe:.60},
  hell:{response:.14,miss:.20,sight:70,fov:2.30,head:.50,strafe:.88}
};
