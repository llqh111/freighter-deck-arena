// All angles and timings are tuned for this game's deck, camera and hit boxes.
export function newBurst(){
  return {count:0,pitch:0,yaw:0,width:0,last:-Infinity,direction:1,nextTurn:6};
}

export function recoverBurst(burst,weapon,now,dt){
  if(!burst.count||!weapon.interval)return;
  const age=now-burst.last;
  const delay=Math.min(.15,weapon.interval*1.16);
  if(age<=delay)return;
  const window=burst.count<=3?.22:.36;
  const activeDt=Math.min(dt,age-delay);
  const decay=Math.exp(-activeDt*(5.5/window));
  burst.pitch*=decay;burst.yaw*=decay;burst.width*=decay;
  if(age>=delay+window*1.6 || (Math.abs(burst.pitch)<1e-4&&Math.abs(burst.yaw)<1e-4&&burst.width<1e-4)){
    Object.assign(burst,newBurst());
  }
}

export function firingCone(weapon,burst,motion){
  if(!weapon.interval)return 0;
  const rest=motion.scoped?.0003:weapon.base;
  const ratio=Math.min(1.25,motion.speed/(5*weapon.speed));
  const movement=Math.max(0,(ratio-(motion.scoped?.28:.24))/(motion.scoped?.72:.76));
  const base=rest*(motion.crouch?.77:1)*(motion.ads?.82:1);
  const run=movement*weapon.moving*(motion.crouch?.64:1);
  return base+run+burst.width*(motion.ads?.67:1)+(motion.grounded?0:Math.max(.095,weapon.moving*1.6));
}

export function recordShot(burst,weapon,now,ads,crouch){
  burst.last=now;burst.count++;
  const n=burst.count;
  const scale=(ads?.77:1)*(crouch?.82:1);
  const climb=n<=2?.51:n<=5?1:.65;
  burst.pitch=Math.min(weapon.recoil*8,burst.pitch+weapon.recoil*climb*scale);
  if(n===4)burst.direction=Math.random()<.5?-1:1;
  if(n>=4){
    if(n>=burst.nextTurn){burst.direction*=-1;burst.nextTurn=n+3+Math.floor(Math.random()*4);}
    burst.yaw=Math.max(-.041,Math.min(.041,burst.yaw+burst.direction*weapon.recoil*.58*scale));
  }
  burst.width=Math.min(weapon.bloom*4.6,burst.width+weapon.bloom*(n<3?.34:1)*scale);
}

// Sample a disc rather than two independent offsets, including at the edge.
export function spreadOffset(radius){
  const angle=Math.random()*Math.PI*2,r=Math.sqrt(Math.random())*radius;
  return {x:Math.cos(angle)*r,y:Math.sin(angle)*r};
}
