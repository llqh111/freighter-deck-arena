// Original CS-style M9 Bayonet foley: layered WAV acoustic transients + multi-stage cold-steel synthesis.
export const bayonetLayers={
  m9Unsheath:{asset:'swish',offset:.022,mix:.38},
  m9Flip:{asset:'swish',offset:.035,mix:.52},
  m9Spin:{asset:'swish',offset:.030,mix:.48},
  m9Catch:{asset:'latch',offset:.046,mix:.64},
  m9Sheen:{asset:'swish',offset:.012,mix:.18},
  m9LightAir:{asset:'swish',offset:.040,mix:.62},
  m9HeavyAir:{asset:'swish',offset:.038,mix:.74}
};
export const bayonetSounds={
  m9Unsheath:[.148,.34,.08,168,52,3380,.15,38,.018],
  m9Flip:[.124,.38,.12,154,58,2180,.13,44,.032],
  m9Spin:[.118,.35,.10,162,62,2760,.14,48,.028],
  m9Catch:[.132,.30,.38,134,42,2440,.24,62,0],
  m9Sheen:[.240,.11,.08,125,70,3420,.085,18,.045],
  m9Release:[.109,.25,.09,155,44,1880,.035,105,.023],
  m9Seat:[.094,.28,.04,235,83,2530,.14,91,0],
  m9Cloth:[.132,.048,.16,118,74,0,0,0,.034],
  m9LightAir:[.115,.37,.22,142,64,0,0,0,.044],
  m9HeavyAir:[.154,.28,.38,107,48,0,0,0,.047],
  m9Flesh:[.119,.19,.43,118,55,695,.07,105,0],
  m9Wood:[.116,.14,.39,330,61,897,.14,82,0],
  m9Stone:[.121,.32,.21,292,68,1347,.06,119,0],
  m9Metal:[.179,.25,.14,360,62,2170,.28,34,0]
};
export function bayonetSample(kind,head,sampleRate,sound=bayonetSounds[kind]){
  const [duration,high,body,bass,damping,ring,ringLevel,ringDamping,swellAt]=sound;
  const tau=2*Math.PI,lowAlpha=1-Math.exp(-tau*960/sampleRate),centerAlpha=1-Math.exp(-tau*5300/sampleRate);
  let seed=6619+kind.charCodeAt(2)*17+(kind.charCodeAt(3)||0)*31,low=0,center=0;
  return (t)=>{
    seed=(Math.imul(seed,1664525)+1013904223)>>>0;
    const noise=seed/2147483648-1;
    low+=lowAlpha*(noise-low);center+=centerAlpha*(noise-center);
    if(kind==='m9Unsheath'){
      // Scabbard Kydex draw friction + upward steel shimmer + subtle detent release click
      const slide=Math.sin(Math.PI*Math.min(1,t/duration));
      const hiss=(center-low)*.34*slide*Math.exp(-12*t);
      const detent=t>.006?Math.exp(-260*(t-.006))*(.22*(noise-low)+.16*Math.sin(tau*2890*(t-.006))):0;
      const shimmer=.14*Math.exp(-32*t)*(Math.sin(tau*(3380+1150*t)*t)+.45*Math.sin(tau*5120*t));
      return Math.max(-.92,Math.min(.92,hiss+detent+shimmer));
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
      const air=.12*(center-low)*breath+.06*low*breath;
      const gleam=(.075*Math.sin(tau*3420*t)+.042*Math.sin(tau*5180*t))*breath;
      return Math.max(-.85,Math.min(.85,air+gleam));
    }
    const breath=swellAt?Math.sin(Math.PI*Math.min(1,t/duration))**2:Math.exp(-t*155);
    const pulse=swellAt?Math.exp(-(((t-swellAt)/.026)**2)):0;
    const air=(center-low)*high*(.47*breath+.89*pulse)+low*body*(breath+pulse*.75);
    const thud=(swellAt?.32:.94)*body*Math.sin(tau*bass*(t+.003*(1-Math.exp(-66*t))))*Math.exp(-damping*t);
    const bell=ringLevel*Math.exp(-ringDamping*t)*(Math.sin(tau*ring*t)+.39*Math.sin(tau*ring*1.413*t)+.24*Math.sin(tau*ring*2.091*t));
    const accent=head?.10*Math.sin(tau*1410*t)*Math.exp(-115*t):0;
    return Math.max(-.94,Math.min(.94,air+thud+bell+accent));
  };
}
