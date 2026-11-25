// Distances are scene units, times in seconds. Each inventory owns its ammunition.
export const primaries=['ak47','m4a1','awm','mp5'];
const gun=(mag,reserve,reload,rpm,damage,head,armor,power,base,moving,bloom,recoil,speed=1)=>({
  mag,reserve,reload,interval:60/rpm,damage,head,armor,power,base,moving,bloom,recoil,speed
});
export const arsenal={
  ak47:gun(30,90,2.45,600,36,4,.78,1.2,.0028,.045,.0055,.011,.93),
  m4a1:gun(30,90,2.3,700,32,4,.72,1,.0024,.04,.0044,.008,.95),
  awm:gun(5,20,3.5,41,118,2.2,.95,2.6,.06,.09,0,.035,.82),
  mp5:gun(30,120,2.1,800,25,3.6,.6,.6,.004,.022,.0035,.006),
  deagle:gun(7,35,2,260,54,3.8,.8,1,.004,.05,.028,.03),
  knife:{mag:0,reserve:0,speed:1.08,armor:.84},he:{mag:1,reserve:0,speed:1,armor:.75}
};
export function loadout(primary){return [primary,'deagle','knife','he'].map(id=>({id,ammo:arsenal[id].mag,max:arsenal[id].mag,reserve:arsenal[id].reserve}));}
export const skills={
  easy:{response:.65,miss:.88,sight:31,fov:1.60,head:.07,strafe:.13},
  normal:{response:.42,miss:.61,sight:43,fov:1.85,head:.12,strafe:.30},
  hard:{response:.24,miss:.38,sight:55,fov:2.05,head:.30,strafe:.60},
  hell:{response:.14,miss:.20,sight:70,fov:2.30,head:.50,strafe:.88}
};
