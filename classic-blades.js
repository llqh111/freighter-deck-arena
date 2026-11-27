import * as T from './three.module.js';
import {buildFixedBladeRig} from './bayonet-model.js?v=6';

// Cross sections run from the guard to the tip. Values are axial distance, center and half width.
const kukri=[
  [.026,0,.023],[.065,.006,.026],[.105,.005,.024],[.137,-.006,.032],
  [.167,-.025,.046],[.209,-.043,.053],[.249,-.052,.050],[.285,-.056,.038],
  [.327,-.049,.024],[.352,-.035,.009],[.374,-.024,.0007]
];
const fieldKnife=[
  [.027,0,.028],[.050,0,.038],[.079,0,.041],[.130,.003,.041],
  [.186,.006,.040],[.235,.004,.036],[.263,-.004,.025],[.290,-.013,.013],[.314,-.023,.0007]
];
const kris=Array.from({length:43},(_,i)=>{
  const t=i/42;
  const width=(.025+.023*Math.exp(-t*11))*(1-t**4)+.0007;
  const wave=.016*Math.sin(10*Math.PI*t)*Math.sin(Math.PI*t)**.55;
  return [.034+t*.328,wave,width];
});

const profiles={
  knife:{sections:fieldKnife,metal:0x7f8e97,bevel:0xe0e8ed,trail:0xcbe9ff},
  nepal:{sections:kukri,metal:0x8c8c87,bevel:0xf0ebe0,trail:0xffe4c0},
  malay:{sections:kris,metal:0x737e88,bevel:0xe3ecf8,trail:0xc9ddff}
};

function bladeStrip(parent,sections,mat,otherFace,start,end,rails){
  const position=[],uv=[],indices=[];
  for(let i=0;i<sections.length;i++){
    const [z,center,half]=sections[i];
    const thick=.0058*(1-(i/(sections.length-1))**3)+.00055;
    for(const edge of [start,end]){
      const [width,height]=rails[edge];
      const x=center+half*width;
      position.push(x,(otherFace?-1:1)*thick*height,-z);
      uv.push(.5+x*6,z/.38);
    }
    if(!i)continue;
    const a=(i-1)*2,b=a+1,c=a+2,d=a+3;
    if(otherFace)indices.push(a,c,b,b,c,d);
    else indices.push(a,b,c,b,d,c);
  }
  const g=new T.BufferGeometry();
  g.setAttribute('position',new T.Float32BufferAttribute(position,3));
  g.setAttribute('uv',new T.Float32BufferAttribute(uv,2));
  g.setIndex(indices);g.computeVertexNormals();
  parent.add(new T.Mesh(g,mat));
}

function makeBlade(knife,materials,sections,id){
  // These hard seams produce separate metal planes with a thin cutting land and a thick spine.
  const rails=id==='nepal'?[[-1,0],[-.47,.84],[.12,1],[.9,.92],[1,0]]:
    id==='malay'?[[-1,0],[-.47,.68],[0,1],[.47,.68],[1,0]]:
    [[-1,0],[-.48,.89],[.14,1],[.78,.94],[1,0]];
  for(const back of [false,true]){
    for(let i=0;i<rails.length-1;i++){
      const outside=i===0||i===rails.length-2;
      const mat=outside?materials.bevel:i===1?materials.face:materials.spine;
      bladeStrip(knife,sections,mat,back,i,i+1,rails);
    }
  }
}

function makeHandle(knife,parts,id){
  const {tube,box,paint,steelGrain,twill}=parts;
  const dark=paint(0x283135,.45,.68,steelGrain);
  const bronze=paint(id==='nepal'?0x997143:0x8b7144,.36,.70,steelGrain);
  const cap=id==='knife'?dark:bronze;
  const grip=id==='knife'?paint(0x343a37,.84,.04,twill):
    paint(id==='nepal'?0x683525:0x503528,.58,.10,steelGrain);
  cap.envMapIntensity=.95;
  tube(knife,grip,[0,0,-.02],[0,0,.126],.034,.032,14).scale.x=1.10;
  tube(knife,cap,[0,0,.119],[0,0,.139],.035,.031,12).scale.x=1.12;
  tube(knife,cap,[0,0,-.031],[0,0,-.007],.034,.037,12).scale.x=1.1;
  if(id==='knife'){
    for(let i=0;i<7;i++){
      const z=-.008+i*.018;
      tube(knife,dark,[0,0,z],[0,0,z+.0035],.0348,.0348,14).scale.x=1.11;
    }
    const guard=new T.Shape();
    guard.moveTo(-.069,-.007);guard.quadraticCurveTo(-.064,-.021,-.052,-.022);
    guard.lineTo(.052,-.022);guard.quadraticCurveTo(.068,-.017,.066,-.006);
    guard.lineTo(.059,.014);guard.lineTo(-.06,.014);guard.closePath();
    const g=new T.ExtrudeGeometry(guard,{depth:.012,bevelSize:.0025,bevelThickness:.002,bevelSegments:2});
    g.translate(0,0,-.04);
    knife.add(new T.Mesh(g,dark));
    box(knife,bronze,0,0,.138,.022,.012,.003);
  }else if(id==='nepal'){
    for(const z of [.017,.076,.102])tube(knife,bronze,[0,0,z],[0,0,z+.003],.0346,.0346,14).scale.x=1.12;
    tube(knife,bronze,[0,0,-.036],[0,0,-.020],.035,.038,14).scale.x=1.21;
  }else{
    // The kris has an offset shoulder instead of a centered transverse crossguard.
    const shoulder=new T.Shape();
    shoulder.moveTo(-.073,-.024);shoulder.quadraticCurveTo(-.082,.002,-.052,.018);
    shoulder.lineTo(.042,.018);shoulder.quadraticCurveTo(.071,.016,.065,-.006);
    shoulder.quadraticCurveTo(.023,-.025,-.073,-.024);shoulder.closePath();
    const g=new T.ExtrudeGeometry(shoulder,{depth:.010,bevelSize:.002,bevelThickness:.002,bevelSegments:2});
    g.translate(0,0,-.042);
    knife.add(new T.Mesh(g,bronze));
    for(let i=0;i<5;i++){
      const z=.013+i*.021;
      tube(knife,cap,[0,0,z],[0,0,z+.0024],.0346,.0344,12).scale.x=1.12;
    }
  }
}

export function buildClassicBlades(parts){
  const map=parts.steelGrain;
  return Object.fromEntries(Object.entries(profiles).map(([id,p])=>{
    const {paint}=parts;
    const face=paint(p.metal,id==='malay'?.38:.34,.76,map);
    const spine=paint(p.metal,.42,.80,map);
    const bevel=paint(p.bevel,.24,.87,map);
    face.envMapIntensity=1.19;spine.envMapIntensity=1.13;bevel.envMapIntensity=1.51;
    const [z,x]=p.sections.at(-1);
    const tip=new T.Vector3(x,0,-z);
    const model=buildFixedBladeRig(parts,id,carrier=>{
      makeBlade(carrier,{face,spine,bevel},p.sections,id);
      makeHandle(carrier,parts,id);
      parts.bake(carrier);
    },tip,{color:p.trail});
    return [id,model];
  }));
}

