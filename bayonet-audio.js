// Original CS2-inspired M9 Bayonet foley: layered WAV acoustic transients + multi-stage cold-steel synthesis.
export const bayonetLayers={
  m9Unsheath:{asset:'swish',offset:.030,mix:.46},
  m9Flip:{asset:'swish',offset:.036,mix:.56},
  m9Spin:{asset:'swish',offset:.034,mix:.48},
  m9Catch:{asset:'latch',offset:.046,mix:.64},
  m9Sheen:{asset:'swish',offset:.012,mix:.14},
  m9LightAir:{asset:'swish',offset:.038,mix:.54},
  m9HeavyAir:{asset:'swish',offset:.034,mix:.66}
};
export const bayonetSounds={
  m9Unsheath:[.105,.42,.18,172,64,2240,.11,58,.014],
  m9Flip:[.118,.44,.16,156,56,2680,.14,58,.024],
  m9Spin:[.112,.40,.14,164,60,2940,.13,60,.024],
  m9Catch:[.132,.30,.38,134,42,2440,.24,62,0],
  m9Sheen:[.245,.10,.07,128,72,3360,.075,20,.048],
  m9Release:[.109,.25,.09,155,44,1880,.035,105,.023],
  m9Seat:[.094,.28,.04,235,83,2530,.14,91,0],
  m9Cloth:[.132,.048,.16,118,74,0,0,0,.034],
  m9LightAir:[.122,.39,.24,136,58,0,0,0,.040],
  m9HeavyAir:[.168,.32,.42,98,42,0,0,0,.044],
  m9Flesh:[.132,.22,.46,104,48,695,.07,105,0],
  m9Wood:[.118,.15,.40,318,58,885,.13,84,0],
  m9Stone:[.124,.34,.22,284,66,1380,.065,116,0],
  m9Metal:[.195,.28,.15,355,60,2240,.29,31,0]
};
export function bayonetSample(kind,head,sampleRate,sound=bayonetSounds[kind]){
  const [duration,high,body,bass,damping,ring,ringLevel,ringDamping,swellAt]=sound;
  const tau=2*Math.PI;
  const lowAlpha=1-Math.exp(-tau*920/sampleRate);
  const midAlpha=1-Math.exp(-tau*2650/sampleRate);
  const centerAlpha=1-Math.exp(-tau*5600/sampleRate);
  let seed=6619+kind.charCodeAt(2)*17+(kind.charCodeAt(3)||0)*31,low=0,mid=0,center=0;
  return (t)=>{
    seed=(Math.imul(seed,1664525)+1013904223)>>>0;
    const noise=seed/2147483648-1;
    low+=lowAlpha*(noise-low);
    mid+=midAlpha*(noise-mid);
    center+=centerAlpha*(noise-center);
    const bandMid=mid-low, bandHigh=center-mid, airBand=center-low;
    if(kind==='m9Unsheath'){
      // Cohesive with m9Flip: instant-response sharp blade pull (tight early razor-cut + grounded wrist snap + focused steel edge, no brittle click or floaty tail)
      const u=Math.min(1,t/duration);
      const env=Math.sin(Math.PI*u)**1.4;
      const peak=Math.exp(-(((t-.014)/.015)**2));
      const cut=(bandMid*.40+bandHigh*.30)*(.24*env+1.04*peak);
      const snap=.14*Math.sin(tau*172*t)*Math.exp(-68*t);
      const edge=.105*Math.exp(-58*t)*(Math.sin(tau*2240*t)+.44*Math.sin(tau*3520*t))*(.40+.60*peak);
      return Math.max(-.94,Math.min(.94,cut+snap+edge));
    }
    if(kind==='m9Flip'||kind==='m9Spin'){
      // CS2 crisp heavy-blade air-slice: tight early-peak razor whip + focused steel-edge zip (zero muddy thump, zero floaty wash)
      const u=Math.min(1,t/duration);
      const isFlip=kind==='m9Flip';
      const peakT=isFlip?.022:.024;
      const env=Math.sin(Math.PI*u)**1.45;
      const peak=Math.exp(-(((t-peakT)/(isFlip?.019:.021))**2));
      const whip=(bandMid*(isFlip?.36:.30)+bandHigh*(isFlip?.38:.34))*(.28*env+1.02*peak);
      const snap=(isFlip?.15:.11)*Math.sin(tau*(isFlip?164:182)*t)*Math.exp(-62*t);
      const ringF=isFlip?2680:3040;
      const edge=(isFlip?.115:.10)*Math.exp(-54*t)*(Math.sin(tau*ringF*t)+.48*Math.sin(tau*ringF*1.58*t)+.22*Math.sin(tau*ringF*2.32*t))*(.45+.55*peak);
      return Math.max(-.94,Math.min(.94,whip+snap+edge));
    }
    if(kind==='m9LightAir'||kind==='m9HeavyAir'){
      // CS2 heavy bayonet slash/lunge: tight air-whip transient + weighty low-mid push + subtle razor hiss
      const u=Math.min(1,t/duration);
      const heavy=kind==='m9HeavyAir';
      const peakT=heavy?.046:.036;
      const env=Math.sin(Math.PI*u)**1.55;
      const whip=Math.exp(-(((t-peakT)/(heavy?.032:.023))**2));
      const air=(bandMid*(heavy?.42:.34)+bandHigh*(heavy?.28:.36))*(.38*env+.95*whip);
      const subPush=(heavy?.38:.21)*low*(env+whip*.82)+(heavy?.28:.14)*Math.sin(tau*(heavy?94:138)*(t+.005*(1-Math.exp(-44*t))))*Math.exp(-(heavy?28:46)*t);
      const edgeHiss=(heavy?.09:.07)*Math.sin(tau*(heavy?1940:2580)*t)*Math.exp(-52*t)*whip;
      return Math.max(-.94,Math.min(.94,air+subPush+edgeHiss));
    }
    if(kind==='m9Flesh'){
      // CS2 visceral heavy blade flesh impact: deep pitch-drop sub thump + crisp wet shear + steel-bite transient
      const sub=.54*Math.sin(tau*(106*t+.72*(1-Math.exp(-52*t))))*Math.exp(-34*t);
      const tear=(bandMid*.48+bandHigh*.24)*Math.exp(-62*t)+.28*low*Math.exp(-46*t);
      const bite=.22*(noise-mid)*Math.exp(-190*t);
      const headCrack=head?(.20*Math.sin(tau*1480*t)+.12*Math.sin(tau*2890*t))*Math.exp(-88*t):0;
      return Math.max(-.95,Math.min(.95,sub+tear+bite+headCrack));
    }
    if(kind==='m9Metal'){
      // CS2 steel-on-steel impact: sharp spark crack + dense inharmonic cold-steel partials
      const crack=.34*(noise-low)*Math.exp(-185*t)+.22*Math.sin(tau*310*t)*Math.exp(-58*t);
      const clang=Math.exp(-26*t)*(.24*Math.sin(tau*2180*t)+.17*Math.sin(tau*3410*t)+.11*Math.sin(tau*5190*t)+.06*Math.sin(tau*7340*t));
      const scrape=.14*bandHigh*Math.exp(-42*t);
      return Math.max(-.95,Math.min(.95,crack+clang+scrape));
    }
    if(kind==='m9Catch'){
      // Two-stage weighty CS M9 catch: crossguard steel clack + meaty gloved palm slap
      const guardClick=Math.exp(-290*t)*(.30*(noise-low)+.25*Math.sin(tau*2440*t)+.14*Math.sin(tau*3980*t));
      const dtPalm=t-.010;
      const palmSlap=dtPalm>0?.42*Math.sin(tau*(134*dtPalm+.55*(1-Math.exp(-58*dtPalm))))*Math.exp(-38*dtPalm):0;
      const leather=dtPalm>0?.18*low*Math.exp(-95*dtPalm):0;
      return Math.max(-.94,Math.min(.94,guardClick+palmSlap+leather));
    }
    if(kind==='m9Sheen'){
      // Delicate cold-steel bevel shimmer + soft glove rustle for close-up inspect sweeps
      const breath=Math.sin(Math.PI*Math.min(1,t/duration))**2;
      const air=.11*airBand*breath+.05*low*breath;
      const gleam=(.068*Math.sin(tau*3320*t)+.038*Math.sin(tau*5120*t)+.018*Math.sin(tau*6980*t))*breath;
      return Math.max(-.85,Math.min(.85,air+gleam));
    }
    const breath=swellAt?Math.sin(Math.PI*Math.min(1,t/duration))**2:Math.exp(-t*155);
    const pulse=swellAt?Math.exp(-(((t-swellAt)/.026)**2)):0;
    const air=airBand*high*(.47*breath+.89*pulse)+low*body*(breath+pulse*.75);
    const thud=(swellAt?.32:.94)*body*Math.sin(tau*bass*(t+.003*(1-Math.exp(-66*t))))*Math.exp(-damping*t);
    const bell=ringLevel*Math.exp(-ringDamping*t)*(Math.sin(tau*ring*t)+.39*Math.sin(tau*ring*1.413*t)+.24*Math.sin(tau*ring*2.091*t));
    const accent=head?.10*Math.sin(tau*1410*t)*Math.exp(-115*t):0;
    return Math.max(-.94,Math.min(.94,air+thud+bell+accent));
  };
}
