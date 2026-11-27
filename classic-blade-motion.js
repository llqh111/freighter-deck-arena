import {fixedBladeKeyframe as key} from './bayonet-motion.js?v=6';
import {classicBladeContact} from './classic-blade-timing.js?v=1';

const zero=[0,0,0];
const profiles={
  knife:{
    rest:[.64,.53,.17],draw:.45,catchAt:.177,trail:.56,weight:.80,
    raise:[[.027,-.080,-.006],[.75,.45,-.63]],
    face:[[-.052,.069,.028],[.36,1.19,-1.17]],
    reverse:[[-.054,.063,.035],[.72,1.01,1.41]],
    strike:[[-.085,.026,-.096],[.52,.94,.19]],
    follow:[[-.143,-.041,-.048],[.24,1.18,.58]],
    thrust:[[-.114,.055,-.193],[.40,.23,-.29]],
    recover:.680,lightEnd:.338
  },
  nepal:{
    rest:[.61,.55,.24],draw:.61,catchAt:.231,trail:.71,weight:1.15,
    raise:[[.015,-.047,-.032],[.94,.56,-.72]],
    face:[[-.064,.076,.033],[.31,1.18,-1.34]],
    reverse:[[-.081,.068,.026],[.57,1.17,1.39]],
    strike:[[-.126,.058,-.125],[.58,1.05,.30]],
    follow:[[-.167,-.092,-.061],[-.37,1.04,.96]],
    thrust:[[-.106,.087,-.138],[.74,.63,.56]],
    recover:.803,lightEnd:.395
  },
  malay:{
    rest:[.59,.62,.36],draw:.43,catchAt:.157,trail:.37,weight:.65,
    raise:[[-.046,-.055,-.009],[.68,.78,.19]],
    face:[[-.055,.069,.033],[.27,1.27,-1.34]],
    reverse:[[-.057,.083,.032],[.74,1.13,1.57]],
    strike:[[-.083,.039,-.132],[.47,.51,-.43]],
    follow:[[-.073,.026,-.141],[.38,.60,-.22]],
    thrust:[[-.133,.061,-.234],[.42,.23,.27]],
    recover:.628,lightEnd:.262
  }
};

function makeProfile(id,p){
  const at=classicBladeContact[id];
  const idle=key(0,zero,p.rest,zero);
  const rest=t=>key(t,zero,p.rest,zero);
  const pose=(t,w,r,h={},cue='',volume=.65,roll=0)=>key(t,w,r,[0,0,roll],h,cue,volume);
  const show=(t,stage,h={},cue='',volume=.38,roll=0)=>pose(t,...stage,h,cue,volume,roll);
  function inspect(reversed){
    const a=reversed?p.reverse:p.face,b=reversed?p.face:p.reverse;
    const sign=reversed?-1:1;
    return [idle,
      pose(.18,[-.034,.030,.015],[.70,.82,-.44],{sup:.016},'classicCloth',.35),
      show(.46,a,{open:.10,sup:.026},'classicSheen',.38,-.10*sign),
      show(.79,a,{open:.04,sup:.028},'',.38,-.05*sign),
      pose(1.04,[-.075,.085,-.004],[.53,1.31,.05],{open:.21,sup:.030},'classicCloth',.42,.20*sign),
      show(1.33,b,{open:-.08,sup:.025},'classicSheen',.34,.10*sign),
      show(1.74,b,{open:.02,sup:.021},'',.38,.05*sign),
      pose(1.99,[-.029,.029,.008],[.64,.76,-.38],{sup:.011},'classicCatch',.35),
      rest(2.24)
    ];
  }
  function fidget(sign,twist){
    return [idle,
      pose(.095,[-.035,.052,.018],[.84,.81,-.30-sign*.55],
        {open:.18,sup:.024},'classicSheen',.54,sign*twist),
      pose(.221,[-.049,.066,.021],[.29,1.14,-.18+sign*.74],
        {open:.16,sup:.031},'classicCloth',.38,sign*twist*.38),
      pose(.342,[.006,-.021,.006],[.49,.54,-.38],
        {open:-.17,kick:p.weight*.68},'classicCatch',.63),
      rest(.50+(p.weight-.65)*.10)
    ];
  }
  const chopping=id==='nepal',piercing=id==='malay';
  function light(backhand){
    const cock=backhand?[-.067,-.009,.038]:[.055,.008,.046];
    const wind=backhand?[.58,1.13,.53]:[.55,.34,-.67];
    const impact=backhand?[[-.056,.035,piercing?-.144:-.091],[.70,.65,-.39]]:p.strike;
    const finish=backhand?[[.028,-.044,-.038],[.35,.34,-.64]]:p.follow;
    return [idle,
      pose(at.light*.46,cock,wind,{open:-.11,sup:.017},'classicLightAir',.69),
      show(at.light,impact,{open:-.19,sup:.046,kick:.72*p.weight}),
      show(at.light+.054,finish,{open:-.12,sup:.048,kick:-.17}),
      pose(p.lightEnd*.77,[-.014,-.035,-.012],[.51,.65,-.33],{open:-.04}),
      rest(p.lightEnd)
    ];
  }
  return {
    idle,contactTime:at,catchCue:'classicCatch',catchTimes:{equip:p.catchAt},trailStrength:p.trail,
    clips:{
      equip:[
        pose(0,[.017,-.218,.060],[-.24,.27,-.65],{open:.12},'classicDraw',.58),
        show(p.catchAt*.61,p.raise,{open:.22,sup:.038},'classicCloth',.42,chopping?.14:-.19),
        pose(p.catchAt,[.004,.012,-.016],[p.rest[0]+.22,p.rest[1]+.06,p.rest[2]+.09],
          {open:-.18,kick:p.weight*.76,sup:.030},'classicCatch',.72),
        pose(p.catchAt+.082,[.003,-.012,.008],[p.rest[0]-.13,p.rest[1]-.08,p.rest[2]-.07],{kick:-.18}),
        rest(p.draw)
      ],
      holster:[idle,pose(.135,[.046,-.236,.068],[-.22,.25,-.73])],
      inspect:inspect(false),rareInspect:inspect(true),
      fidget1:fidget(1,.31),fidget2:fidget(-1,.39),fidget3:fidget(1,.53),
      light:light(false),backhand:light(true),
      heavy:[
        idle,
        pose(at.heavy*.48,[.032,chopping?.077:-.024,.064],
          chopping?[1.36,.27,-.69]:[.60,.26,-.43],{open:-.10,sup:.051,kick:-.24}),
        pose(at.heavy*.75,[.006,chopping?.082:.010,.029],
          chopping?[1.26,.34,-.55]:[.46,.32,-.52],{open:-.19,sup:.062},'classicHeavyAir',.79),
        show(at.heavy,p.thrust,{open:-.22,sup:.079,kick:p.weight}),
        pose(at.heavy+.072,chopping?[-.159,-.082,-.119]:[-.130,.038,-.205],
          chopping?[-.40,.96,.75]:[.34,.29,-.28],{open:-.16,sup:.075,kick:-.20}),
        pose(p.recover*.64,[-.049,-.029,-.029],[.43,.53,-.35],{open:-.04,sup:.018}),
        rest(p.recover)
      ]
    }
  };
}

export const classicMotionProfiles=Object.fromEntries(Object.entries(profiles).map(([id,profile])=>
  [id,makeProfile(id,profile)]));

