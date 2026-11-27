// Original synthesized foley. The existing swish/latch recordings provide a second, quiet layer.
export const classicLayers={
  classicDraw:{asset:'swish',offset:.018,mix:.28},
  classicCatch:{asset:'latch',offset:.048,mix:.38},
  classicLightAir:{asset:'swish',offset:.043,mix:.40},
  classicHeavyAir:{asset:'swish',offset:.036,mix:.46}
};
const sounds={
  classicDraw:[.131,.27,.12,168,59,2740,.08,61,.027],
  classicCatch:[.101,.24,.34,158,62,2350,.17,77,0],
  classicCloth:[.093,.07,.19,142,70,0,0,0,.034],
  classicSheen:[.142,.10,.08,160,81,3090,.052,44,.049],
  classicLightAir:[.108,.31,.23,163,61,0,0,0,.038],
  classicHeavyAir:[.158,.33,.35,117,44,0,0,0,.050],
  classicFlesh:[.124,.21,.43,135,62,781,.061,96,0],
  classicWood:[.113,.20,.40,326,62,823,.12,99,0],
  classicStone:[.136,.31,.25,294,65,1460,.069,117,0],
  classicMetal:[.162,.23,.20,351,71,2230,.27,41,0]
};
export const classicCueNames=Object.keys(sounds);

export function classicSound(kind,weapon){
  if(!Object.hasOwn(sounds,kind))return null;
  const [duration,high,body,bass,damping,ring,resonance,decay,swell]=sounds[kind];
  const pitch=weapon==='nepal'?.86:weapon==='malay'?1.16:1;
  return [duration/pitch,high,body/pitch,bass*pitch,damping*pitch,ring*pitch,
    resonance,decay*pitch,swell/pitch];
}

