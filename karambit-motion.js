// CS2 Exact Dorsal-Fist Karambit Draw (full 360° whip into horizontal claw hold)
// + Valorant Reaver/RGX Infinite High-Speed Ring Spin Inspect + CS F-R-F-R Toss Combo.
// Channels (10): [x, y, z, pitch, yaw, roll, ringZ, fingerOpen, thumbOpen, camKick]
const tau=2*Math.PI;
const idle=[0,0,0,0,0,0,0,0,0,0];
const drawCatchTime=.375;
const inspectPeriod=.48;   // 2 full 360° revolutions every 0.48s = 4.17 rev/sec iconic Valorant Reaver infinite spin!
const inspectTurn=-2*tau;
// Exact Valorant Reaver 00:03 spin-hand pose:
// Hand sits right-of-crosshair, yawed +1.08 rad so the spinning ring forms a gorgeous 3/4 foreshortened vertical ellipse
// right beside the crosshair with fingers stylishly splayed out!
const inspectGrip=[.132,.042,-.038,.12,1.08,-.30,0,1.00,.94,0];
const key=(time,pose=idle,cue='',volume=.75)=>({time,pose,cue,volume});
export const karambitContactTime={light:.105,heavy:.162};

const clips={
  // CS2 Classic Karambit Draw (0.72s):
  // Enters from low-left -> whips one decisive full 360° circle around the index finger ->
  // hard palm-clamp catch (+0.145 rad overshoot + tactile dip) -> heavy damped settle into exact CS2 horizontal dorsal-fist pose!
  draw:[
    key(0,     [-.085,-.105, .052, -.26, -.28,  .50,  5.95, .96, .90,  .00]),
    key(.065,  [-.052,-.044, .024, -.14, -.18,  .38,  5.02, .98, .92,  .00], 'karambitSpin', .84),
    key(.165,  [-.010, .032,-.012,  .04, -.02,  .16,  2.96, .96, .88,  .00]),
    key(.260,  [ .012, .042,-.020,  .12,  .12, -.10,  1.05, .74, .58,  .00], 'karambitFlick', .70),
    key(.335,  [ .006, .018,-.010,  .08,  .08, -.12,  .16,  .24, .16,  .00]),
    key(drawCatchTime, [-.005,-.016, .010, -.10, -.06,  .11, -.145, .00, .00,  .96], 'karambitCatch', .94),
    key(.475,  [ .002, .005,-.003,  .03,  .02, -.04,  .032, .00, .02, -.24]),
    key(.595,  [-.001,-.002, .001, -.01, -.01,  .01, -.008, .00, .00,  .04]),
    key(.720,  idle)
  ],

  // Valorant Reaver Karambit Inspect Intro (0.86s, matches reference video 00:00 -> 00:02 -> 00:03):
  // 1) Quick wrist-dip anticipation -> 2) Open-palm diagonal upward toss-whip (00:02) ->
  // 3) Smooth roll into 3/4 foreshortened vertical-ellipse Reaver spin pose -> 4) C1 tangent lock into infinite spin!
  inspectIn:[
    key(0,     idle),
    key(.110,  [ .024,-.026, .014,  .14,  .12,  .14,  .28,  .52, .60,  .00]),
    key(.280,  [ .098, .058,-.030,  .36,  .62, -.64, -1.65, .96, .92,  .00], 'karambitFlick', .80),
    key(.460,  [ .136, .072,-.042,  .28,  .92, -.52, -4.45, 1.00,.95,  .00], 'karambitSpin', .78),
    key(.660,  [ .138, .052,-.040,  .16, 1.04, -.34, -8.35, 1.00,.94,  .00], 'karambitRing', .66),
    key(.860,  [...inspectGrip.slice(0,6), -2*tau, inspectGrip[7], inspectGrip[8], 0])
  ],

  // Valorant Reaver Infinite 3/4-Ellipse Spin Loop (0.48s / 2 full revs = 4.17 rev/sec, runs forever until cancelled!):
  // Poised splayed-finger right hand on the right side of the crosshair, delicate gyroscopic orbital micro-pump!
  inspectLoop:[
    key(0,     inspectGrip),
    key(.120,  [ .126, .050,-.042,  .16, 1.04, -.34, -.5*tau,  1.00, .96, 0]),
    key(.240,  [ .136, .036,-.035,  .08, 1.12, -.26, -1.0*tau,  .96, .90, 0], 'karambitRing', .64),
    key(.360,  [ .140, .048,-.040,  .14, 1.11, -.28, -1.5*tau, 1.00, .96, 0]),
    key(inspectPeriod, [...inspectGrip.slice(0,6), inspectTurn, inspectGrip[7], inspectGrip[8], 0], 'karambitRing', .64)
  ],

  // Clean decelerating wrap-around catch from 3/4 Reaver spin back into CS2 horizontal dorsal-fist Idle (0.44s).
  inspectOut:[
    key(0,     inspectGrip),
    key(.115,  [ .084, .036,-.026,  .06,  .68, -.16, -2.35,  .88, .74, 0], 'karambitFlick', .60),
    key(.230,  [ .024, .016,-.010, -.02,  .22, -.06, -.28,   .24, .16, 0]),
    key(.285,  [-.006,-.016, .010, -.09, -.05,  .10,  .130,  .00, .00, .86], 'karambitCatch', .90),
    key(.365,  [ .002, .004,-.002,  .03,  .02, -.03, -.024,  .00, .02,-.18]),
    key(.440,  idle)
  ],

  // CS Karambit F-R-F-R Fidget A (0.46s): snappy forward 360° toss around index ring & hard clamp!
  spinA:[
    key(0,     idle),
    key(.062,  [-.014, .044,-.022, -.12,  .14, -.16, -.96,   .94, .88, 0], 'karambitFlick', .74),
    key(.178,  [-.028, .078,-.038, -.18,  .22, -.24, -3.78,  .98, .90, 0], 'karambitSpin', .72),
    key(.290,  [-.012, .036,-.018, -.04,  .08, -.04, -6.04,  .38, .22, 0]),
    key(.342,  [ .008,-.015, .010,  .08, -.04,  .09, -tau+.13, .00, .00, .82], 'karambitCatch', .88),
    key(.405,  [-.002, .004,-.002, -.02,  .01, -.03, -tau-.02, .00, .02,-.16]),
    key(.460,  [0,0,0,0,0,0,-tau,0,0,0])
  ],

  // CS Karambit F-R-F-R Fidget B (0.48s): snappy reverse +360° back-whip toss & hard clamp!
  spinB:[
    key(0,     idle),
    key(.066,  [ .016, .042,-.020, -.10, -.12,  .18,  .98,   .92, .86, 0], 'karambitFlick', .72),
    key(.188,  [-.020, .080,-.038, -.16,  .20, -.18,  3.86,  .98, .90, 0], 'karambitSpin', .74),
    key(.305,  [-.010, .034,-.016, -.04,  .06,  .04,  6.06,  .36, .20, 0]),
    key(.358,  [ .006,-.015, .010,  .08, -.03, -.08,  tau-.13, .00, .00, .82], 'karambitCatch', .88),
    key(.422,  [-.002, .004,-.002, -.02,  .01,  .02,  tau+.02, .00, .02,-.16]),
    key(.480,  [0,0,0,0,0,0,tau,0,0,0])
  ],

  // Light Slash 1: CS2 Karambit fast right-to-left horizontal rip sweeping the curved Doppler claw across center!
  light:[
    key(0,     idle),
    key(.042,  [ .056, .024, .024, -.14, -.26, -.22, -.12, .04, .04, -.20]),
    key(karambitContactTime.light, [-.178, .022,-.108,  .16,  .56,  .42,  .18, 0, 0, .86], 'karambitCut', .86),
    key(.178,  [-.212,-.024,-.072,  .24,  .68,  .52,  .22, 0, 0, -.24]),
    key(.275,  [-.062,-.014, .006,  .08,  .22,  .16,  .05, 0, 0,  .00]),
    key(.360,  idle)
  ],

  // Light Slash 2: CS2 Karambit backhand left-to-right upward rip
  backhand:[
    key(0,     idle),
    key(.044,  [-.098,-.018, .022,  .14,  .34,  .26,  .12, .04, .04, -.18]),
    key(karambitContactTime.light, [ .072, .052,-.096, -.16, -.48, -.34, -.16, 0, 0, .84], 'karambitCut', .86),
    key(.180,  [ .104, .032,-.060, -.20, -.58, -.42, -.18, 0, 0, -.22]),
    key(.278,  [ .032,-.008, .006, -.06, -.18, -.12, -.04, 0, 0,  .00]),
    key(.360,  idle)
  ],

  // Heavy Attack: CS2 iconic high-windup reverse-grip downward claw gouge (full curved blade visible inside frame!)
  heavy:[
    key(0,     idle),
    key(.088,  [ .016, .086, .048, -.38, -.18, -.34, -.32, .20, .16, -.35], 'karambitSpin', .76),
    key(karambitContactTime.heavy, [-.095, .022,-.165,  .34,  .32,  .38,  .18, 0, 0, 1.38], 'karambitCut', .94),
    key(.240,  [-.122,-.018,-.132,  .38,  .42,  .44,  .24, 0, 0, -.32]),
    key(.415,  [-.038,-.012,-.024,  .12,  .16,  .14,  .04, 0, 0,  .00]),
    key(.670,  idle)
  ]
};

function sample(clip,i,time,raw,velocity){
  const a=clip[i],b=clip[i+1];
  const loop=clip===clips.inspectLoop;
  const entersLoop=clip===clips.inspectIn&&i===clip.length-2;
  const wrapBefore=loop&&i===0,wrapAfter=loop&&i===clip.length-2;
  const before=wrapBefore?clip.at(-2):clip[i-1]??a;
  const after=wrapAfter?clip[1]:clip[i+2]??b;
  const beforeTime=before.time-(wrapBefore?inspectPeriod:0);
  const afterTime=after.time+(wrapAfter?inspectPeriod:0);
  const duration=b.time-a.time,t=(time-a.time)/duration,t2=t*t,t3=t2*t;
  for(let j=0;j<raw.length;j++){
    const from=a.pose[j]??0,to=b.pose[j]??0;
    const previous=(before.pose[j]??0)-(wrapBefore&&j===6?inspectTurn:0);
    const following=(after.pose[j]??0)+(wrapAfter&&j===6?inspectTurn:0);
    const m0=before===a?(clip===clips.draw?(to-from)*1.15:0):(to-previous)/(b.time-beforeTime)*duration;
    let m1=after===b?0:(following-from)/(afterTime-a.time)*duration;
    if(entersLoop){
      const first=clips.inspectLoop[1],last=clips.inspectLoop.at(-2);
      m1=(first.pose[j]-last.pose[j]+(j===6?inspectTurn:0))/(first.time+inspectPeriod-last.time)*duration;
    }
    raw[j]=(2*t3-3*t2+1)*from+(t3-2*t2+t)*m0+(-2*t3+3*t2)*to+(t3-t2)*m1;
    velocity[j]=((6*t2-6*t)*(from-to)+(3*t2-4*t+1)*m0+(3*t2-2*t)*m1)/duration;
  }
}

export function createKarambitMotion(emit){
  const pose=new Float64Array(idle.length),raw=new Float64Array(idle.length);
  const velocity=new Float64Array(idle.length),offX=new Float64Array(idle.length),offV=new Float64Array(idle.length);
  let clip=null,time=0,section=0,springOmega=48;
  let contactAt=0,contactFrame=false,backhand=false,spinAlt=false,queued=null,rebound=0;

  function compose(dt){
    const w=springOmega,decay=Math.exp(-w*dt);
    for(let j=0;j<pose.length;j++){
      const x=offX[j],b=offV[j]+w*x;
      offX[j]=(x+b*dt)*decay;
      offV[j]=(offV[j]-b*w*dt)*decay;
      pose[j]=raw[j]+offX[j];
    }
    rebound*=Math.exp(-15*dt);
    pose[2]+=rebound;
    pose[5]+=rebound*2.4;
  }

  function start(name,transition=.072){
    clip=clips[name];time=section=contactAt=0;
    contactFrame=false;queued=null;
    if(transition){
      springOmega=4/transition;
      for(let j=0;j<pose.length;j++){
        const difference=pose[j]-(clip[0].pose[j]??0);
        offX[j]=j>=3&&j<=6?Math.atan2(Math.sin(difference),Math.cos(difference)):difference;
        offV[j]+=velocity[j];
      }
      offV[2]-=15*rebound;
      offV[5]-=36*rebound;
    }else{
      offX.fill(0);offV.fill(0);
    }
    rebound=0;
    sample(clip,0,0,raw,velocity);
    if(transition)for(let j=0;j<pose.length;j++)offV[j]-=velocity[j];
    compose(0);
  }

  function spin(){
    if(contactAt)return;
    if(clip===clips.draw&&time<.22){queued='spin';return;}
    if((clip===clips.spinA||clip===clips.spinB)&&time<.16)return;
    const next=spinAlt?'spinB':'spinA';
    spinAlt=!spinAlt;
    start(next,.066);
  }

  function inspect(){
    if(clip===clips.inspectIn||clip===clips.inspectLoop){start('inspectOut',.11);return;}
    if(contactAt)return;
    if(clip===clips.draw&&time<.26){
      queued=queued==='inspectIn'?null:'inspectIn';
      return;
    }
    start('inspectIn',.072);
  }

  function attack(kind){
    start(kind==='heavy'?'heavy':backhand?'backhand':'light',.050);
    if(kind==='light')backhand=!backhand;
    contactAt=karambitContactTime[kind];
  }

  function contact(kind){
    if(!contactAt)return;
    time=contactAt;contactAt=0;contactFrame=true;
    rebound=kind==='wall'?.034:kind==='flesh'?.018:0;
  }

  function reset(){
    clip=null;time=section=contactAt=rebound=0;
    backhand=spinAlt=contactFrame=false;queued=null;
    pose.fill(0);raw.fill(0);velocity.fill(0);offX.fill(0);offV.fill(0);
  }

  function update(dt){
    if(!clip){compose(dt);return;}
    if(!contactFrame)time=contactAt?Math.min(time+dt,contactAt-1e-6):time+dt;
    contactFrame=false;
    while(clip[section+1]&&time>=clip[section+1].time){
      const frame=clip[++section];
      if(frame.cue)emit(frame.cue,frame.volume);
      const end=!clip[section+1];
      const afterDraw=queued&&clip===clips.draw&&frame.time===drawCatchTime;
      if(!end&&!afterDraw)continue;
      const carry=time-frame.time;
      if(clip===clips.inspectLoop){
        time=carry;section=0;
        continue;
      }
      let next=queued??(clip===clips.inspectIn?'inspectLoop':null);
      if(next==='spin'){next=spinAlt?'spinB':'spinA';spinAlt=!spinAlt;}
      sample(clip,section-1,frame.time,raw,velocity);
      compose(dt-carry);
      dt=carry;
      if(!next){clip=null;raw.fill(0);velocity.fill(0);break;}
      start(next,next==='inspectLoop'?0:.072);
      time=carry;
    }
    if(clip)sample(clip,section,time,raw,velocity);
    compose(dt);
  }

  return {pose,reset,update,draw(){start('draw',0);},inspect,spin,attack,contact,get impact(){return rebound;}};
}
