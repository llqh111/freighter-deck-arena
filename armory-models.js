import * as T from './three.module.js';
import {buildKarambit} from './karambit-model.js?v=7';

// Compact exterior models built in camera space, with an independent magazine and action.
function violetTideTexture(){
  const canvas=document.createElement('canvas');
  const width=512,height=128;
  canvas.width=width;canvas.height=height;
  const ctx=canvas.getContext('2d');
  const base=ctx.createLinearGradient(0,height,width,0);
  base.addColorStop(0,'#242030');
  base.addColorStop(.32,'#4c306b');
  base.addColorStop(.69,'#6a4896');
  base.addColorStop(1,'#30243f');
  ctx.fillStyle=base;
  ctx.fillRect(0,0,width,height);
  for(let y=0;y<height;y+=2){
    ctx.fillStyle=y%6===0?'#eee1ff13':'#180e2713';
    ctx.fillRect(0,y,width,1);
  }

  // Bathymetric lines fan out around a deep point and taper toward the tip.
  for(let i=0;i<10;i++){
    const depth=i*9.4;
    ctx.beginPath();
    ctx.moveTo(38+depth*.85,142);
    ctx.bezierCurveTo(27+depth*.52,77-i*5,109+depth*.54,14-i*.7,193+depth,52-i*4.4);
    ctx.bezierCurveTo(290+depth*.53,94-i*2.5,321+depth,81-i*4.6,367+depth*1.55,-12);
    const major=i===2||i===6;
    ctx.strokeStyle=major?'#ead9fce0':'#cda9edaa';
    ctx.lineWidth=major?5.4:3;
    ctx.stroke();
  }
  ctx.strokeStyle='#e0c6f2a0';
  ctx.lineWidth=1.3;
  for(let x=113;x<=409;x+=16){
    const length=(x-113)%64===0?9:4;
    ctx.beginPath();
    ctx.moveTo(x,116);
    ctx.lineTo(x+3,116-length);
    ctx.stroke();
  }
  const texture=new T.CanvasTexture(canvas);
  texture.colorSpace=T.SRGBColorSpace;
  texture.repeat.set(1.40,3.07);
  texture.offset.set(-.086,-.89);
  texture.anisotropy=4;
  return texture;
}

export function buildArmory(parts) {
  const {box,tube,pad,profile,arm,bake,paint,graphite,alloy,edges,parker,rubber,amber,bone,cloth,clothFold,glove,knuckle,sleeveBand,steelGrain,twill}=parts;
  const olive=paint(0x64724e,.8,.13), wood=paint(0x94532f,.54,.13);
  const grain=paint(0xb37349,.67,.07), chrome=paint(0xc2c7c5,.32,.55);
  const blade=paint(0x858f91,.38,.45), edge=paint(0xd5d7ce,.30,.49);
  const opticInk=new T.MeshBasicMaterial({color:0xff6950,toneMapped:false});
  const guns={};
  function model(id, setup) {
    const body=new T.Group(), mag=new T.Group(), action=new T.Group(), hand=new T.Group();
    const root=new T.Group();
    root.name=id;root.add(body,mag,action,hand);
    const model={root,body,mag,action,hand,muzzle:-.5,sight:.11,hipX:.21,hipY:-.18,hipZ:-.53,kick:1};
    setup(model);
    if(!model.hinges)arm(body,[.16,-.31,.43],[.092,-.153,.16],[.045,-.126,.11],false);
    for(const g of [body,mag,action,hand])bake(g);
    return guns[id]=model;
  }
  function forearm(w,z) { arm(w.hand,[-.19,-.305,.17],[-.077,-.107,z+.060],[-.050,-.067,z],true); }
  function grip(w) {profile(w.body,rubber,.059,[[.14,-.05],[.065,-.048],[.07,-.098],[.105,-.195],[.156,-.181]]);}
  function belly(w,mat,z,width,depth,curve) {
    const upper=z+depth/2, front=z-depth/2;
    profile(w.mag,mat,width,[[upper,-.042],[front,-.043],[front-.008,-.165],[front-curve,-.25],[upper-curve,-.258],[upper-.003,-.152]]);
    for(let i=0;i<3;i++) {
      const stripe=box(w.mag,alloy,-width/2-.003,-.152,z-depth*.29+i*depth*.26,.004,.119,.004);
      stripe.rotation.x=curve*.7;
    }
  }
  function halo(w,z,y,r,mat=graphite) {
    const hoop=new T.Mesh(new T.TorusGeometry(r,.0045,5,20),mat);
    hoop.position.set(0,y,z);w.body.add(hoop);
    box(w.body,parker,0,y-r-.010,z,.029,.024,.028);
  }
  function dot(w,z) {
    // Reticle dot is rendered crisply by the HUD ADS overlay to avoid 3D double-dot overlap.
  }
  function muzzle(w,z,r=.021) {
    tube(w.body,graphite,[0,.010,z+.07],[0,.010,z],r,r*1.08);
    tube(w.body,parker,[0,.010,z],[0,.010,z-.003],r*.69,r*.69);
    w.muzzle=z-.009;
  }
  model('ak47',w=>{
    w.kick=1.12;w.sight=.098;w.hipX=.212;
    profile(w.body,wood,.079,[[.38,.022],[.165,.033],[.132,-.047],[.223,-.061],[.375,-.135]]);
    profile(w.body,rubber,.083,[[.38,.024],[.398,.016],[.395,-.138],[.375,-.135]]);
    profile(w.body,graphite,.085,[[.187,.039],[-.179,.036],[-.193,-.047],[-.13,-.067],[.158,-.064]]);
    tube(w.body,alloy,[0,.037,.15],[0,.037,-.162],.036,.035);
    profile(w.body,wood,.096,[[-.155,.017],[-.399,.013],[-.413,-.04],[-.352,-.065],[-.16,-.055]]);
    for(let i=0;i<4;i++)box(w.body,grain,-.05,-.019-i*.006,-.291,.002,.002,.15-i*.019);
    tube(w.body,alloy,[0,.014,-.38],[0,.01,-.64],.021,.015);
    tube(w.body,graphite,[0,.041,-.16],[0,.04,-.418],.021,.015);
    halo(w,.02,w.sight,.035);halo(w,-.558,.07,.022);
    dot(w,.025);grip(w);belly(w,graphite,-.085,.064,.086,.078);
    box(w.action,alloy,-.05,.012,-.055,.029,.014,.054);
    muzzle(w,-.66);forearm(w,-.305);
  });
  model('mp5',w=>{
    w.kick=.62;w.hipZ=-.477;w.hipX=.191;w.sight=.103;
    for(const side of [-1,1])tube(w.body,edges,[side*.034,-.01,.12],[side*.034,-.01,.32],.008,.008);
    profile(w.body,rubber,.069,[[.325,.023],[.354,.011],[.357,-.125],[.321,-.12],[.309,-.083]]);
    tube(w.body,graphite,[0,.017,.155],[0,.017,-.285],.043,.034);
    profile(w.body,parker,.084,[[.14,-.002],[-.19,-.001],[-.18,-.061],[.141,-.065]]);
    profile(w.body,graphite,.084,[[-.142,.006],[-.318,.011],[-.344,-.045],[-.169,-.064]]);
    for(let i=0;i<7;i++)box(w.body,rubber,-.044,-.028,-.172-i*.022,.003,.039,.012);
    halo(w,.09,w.sight,.031);halo(w,-.328,.073,.030);dot(w,.10);
    grip(w);belly(w,alloy,-.11,.046,.050,.029);
    muzzle(w,-.402,.022);forearm(w,-.225);
  });
  model('awm',w=>{
    w.kick=1.6;w.hipX=.196;w.hipZ=-.61;w.sight=.148;
    profile(w.body,olive,.096,[[.414,.009],[.202,.035],[.11,.016],[-.46,.032],[-.531,-.022],[-.502,-.052],[-.148,-.073],[.015,-.071],[.057,-.112],[.141,-.103],[.194,-.055],[.374,-.105]]);
    profile(w.body,rubber,.104,[[.394,.019],[.425,.012],[.426,-.107],[.39,-.113]]);
    box(w.body,graphite,0,.036,.282,.096,.033,.176);grip(w);
    tube(w.body,alloy,[0,.044,.166],[0,.044,-.31],.029,.032);
    tube(w.body,parker,[0,.011,-.39],[0,.011,-.805],.029,.017);muzzle(w,-.855,.028);
    // Hollow optical housing leaves the magnified game view clear.
    for(const [z,r] of [[.175,.046],[.155,.045],[.038,.027],[-.074,.028],[-.19,.059],[-.206,.061]])halo(w,z,w.sight,r);
    for(let i=0;i<12;i++){
      const a=i*Math.PI/6;
      const path=[[.168,.046],[.038,.027],[-.074,.028],[-.196,.059]];
      for(let k=1;k<path.length;k++) {
        const [z1,r1]=path[k-1],[z2,r2]=path[k];
        tube(w.body,graphite,[Math.cos(a)*r1,w.sight+Math.sin(a)*r1,z1],[Math.cos(a)*r2,w.sight+Math.sin(a)*r2,z2],r1*.25,r2*.25,6);
      }
    }
    for(const z of [.04,-.10])box(w.body,alloy,0,.091,z,.036,.063,.027);
    tube(w.action,edges,[.019,.036,.095],[.081,-.013,.115],.009,.009);
    pad(w.action,graphite,.083,-.014,.117,.019,.019,.019);
    box(w.mag,graphite,0,-.093,-.083,.064,.094,.115);
    forearm(w,-.324);
  });
  model('deagle',w=>{
    w.kick=1.48;w.hipX=.134;w.hipY=-.145;w.hipZ=-.409;w.sight=.087;
    profile(w.body,alloy,.065,[[.162,.007],[-.227,.007],[-.215,-.024],[-.053,-.058],[.021,-.059],[.066,-.177],[.142,-.166],[.106,-.056],[.149,-.046]]);
    profile(w.action,chrome,.069,[[.148,.050],[.096,.069],[-.212,.063],[-.267,.036],[-.26,.005],[.128,.005]]);
    for(let i=0;i<7;i++)box(w.action,graphite,-.036,.029,.123-i*.009,.003,.032,.0035);
    tube(w.action,parker,[0,.028,-.253],[0,.028,-.268],.019,.018);
    profile(w.body,rubber,.075,[[.10,-.054],[.044,-.06],[.076,-.173],[.145,-.162]]);
    box(w.mag,graphite,0,-.18,.103,.08,.024,.08);
    for(const x of [-.016,.016])box(w.action,parker,x,.075,.12,.013,.018,.03);
    box(w.action,amber,0,.079,-.206,.008,.014,.014);dot(w,.122);
    arm(w.hand,[-.145,-.30,.32],[-.057,-.151,.10],[-.029,-.109,.077],true);
    w.muzzle=-.276;
  });
  model('knife',w=>{
    w.hipX=.149;w.hipZ=-.386;w.hipY=-.17;
    // The swept blade and polished edge face the player at a slight cant.
    const g=new T.Group();w.body.add(g);
    tube(g,rubber,[0,-.139,.128],[0,-.035,.010],.029,.03);
    for(let i=0;i<5;i++)tube(g,graphite,[0,-.128+i*.018,.112-i*.020],[0,-.123+i*.018,.108-i*.020],.032,.032);
    box(g,graphite,0,-.03,.004,.109,.024,.027);
    profile(g,blade,.012,[[.015,-.02],[-.14,.155],[-.256,.221],[-.211,.121],[-.052,-.002],[-.014,-.035]]);
    profile(g,edge,.013,[[-.254,.22],[-.215,.124],[-.055,.001],[-.027,-.019],[-.061,.018],[-.218,.145]]);
    g.rotation.z=-.42;g.rotation.y=-.38;bake(g);
    arm(w.hand,[-.229,-.318,.28],[-.17,-.19,-.012],[-.144,-.156,-.044],true);
  });
  model('nepal',w=>{
    // Iconic Kukri recurve blade with rosewood grip and brass bolster/pommel.
    w.hipX=.158;w.hipZ=-.395;w.hipY=-.175;
    const g=new T.Group();w.body.add(g);
    const rosewood=paint(0x52291c,.62,.08);
    tube(g,rosewood,[0,-.15,.135],[0,-.038,.012],.028,.031);
    tube(g,amber,[0,-.156,.142],[0,-.142,.127],.034,.031);
    for(const t of [.35,.68])tube(g,amber,[0,-.15+t*.11,.135-t*.12],[0,-.143+t*.11,.128-t*.12],.0315,.0315);
    box(g,amber,0,-.033,.008,.052,.036,.042);
    // Broad forward-curving kukri belly & spine.
    profile(g,blade,.014,[[.012,-.015],[-.07,.085],[-.185,.175],[-.315,.225],[-.365,.195],[-.275,.075],[-.155,.015],[-.055,-.005],[-.015,-.032]]);
    profile(g,edge,.015,[[-.363,.194],[-.278,.072],[-.156,.012],[-.058,-.008],[-.028,-.024],[-.068,.006],[-.168,.032],[-.278,.094],[-.346,.192]]);
    // Fuller / spine highlight.
    profile(g,chrome,.0155,[[-.02,.015],[-.09,.092],[-.19,.168],[-.30,.208],[-.29,.192],[-.185,.152],[-.085,.078],[-.015,.006]]);
    g.rotation.z=-.38;g.rotation.y=-.34;bake(g);
    arm(w.hand,[-.235,-.32,.29],[-.175,-.192,-.010],[-.145,-.155,-.040],true);
  });
  model('malay',w=>{
    // Iconic Kris wavy double-edged dagger with ornate asymmetric brass guard.
    w.hipX=.148;w.hipZ=-.390;w.hipY=-.168;
    const g=new T.Group();w.body.add(g);
    const walnut=paint(0x4a3121,.66,.06);
    tube(g,walnut,[0,-.145,.132],[0,-.040,.018],.025,.029);
    tube(g,amber,[0,-.150,.138],[0,-.136,.124],.031,.027);
    // Asymmetric wide Kris crossguard (ganja).
    profile(g,amber,.022,[[.028,-.020],[.010,-.055],[-.042,-.042],[-.058,.012],[-.016,.024]]);
    // Wavy flame-shaped double-edged blade (5 undulations).
    profile(g,blade,.011,[
      [-.012,-.020],[-.055,.040],[-.098,.062],[-.138,.118],[-.186,.132],[-.232,.186],[-.284,.198],[-.342,.242],
      [-.302,.174],[-.248,.154],[-.204,.106],[-.154,.086],[-.112,.040],[-.068,.014],[-.028,-.032]
    ]);
    profile(g,edge,.0125,[
      [-.018,-.018],[-.058,.034],[-.102,.056],[-.142,.110],[-.190,.124],[-.236,.178],[-.288,.190],[-.342,.242],
      [-.296,.182],[-.244,.162],[-.198,.114],[-.150,.094],[-.108,.048],[-.064,.022],[-.024,-.026]
    ]);
    g.rotation.z=-.36;g.rotation.y=-.32;bake(g);
    arm(w.hand,[-.226,-.315,.285],[-.168,-.188,-.015],[-.142,-.154,-.045],true);
  });
  model('butterfly',w=>{
    // Precision custom Balisong: true 2-joint serial kinematics (Safe Handle -> Blade -> Bite Handle),
    // skeletonized twin-scale titanium channels with real through-holes, 3D multi-plane hollow-ground
    // recurve clip-point blade with through-fuller, spring T-latch, articulated 5-finger right hand,
    // independent tactical left guard, and zero-GC cold-steel specular motion ribbon.
    w.hipX=.160;w.hipY=-.092;w.hipZ=-.452;
    w.hinges=true;
    w.isArticulatedButterfly=true;

    const D=.0130; // Half-span between Safe Pivot and Bite Pivot (26mm center-to-center)
    const tiScale=paint(0x3d4a54,.25,.76,steelGrain);
    const tiDark=paint(0x1f262c,.38,.64,steelGrain);
    const tiChamfer=paint(0xcbd6de,.16,.89);
    const cryoAccent=paint(0x66bfd6,.24,.78);
    const bronzeWasher=paint(0xc98f49,.26,.82);
    const satinFlat=paint(0x9aa8b2,.21,.84,steelGrain);
    const hollowBevel=paint(0xd2dde4,.11,.92);
    const mirrorEdge=paint(0xf4f9fb,.06,.97);
    const cuffMatte=paint(0x1d2224,.88,.04);
    const dialGlass=paint(0x132028,.18,.65);
    for(const m of [tiScale,tiDark,tiChamfer,cryoAccent,bronzeWasher,satinFlat,hollowBevel,mirrorEdge,dialGlass]){
      m.envMapIntensity=1.38;
    }
    mirrorEdge.envMapIntensity=1.62;
    const handleRail=tiChamfer.clone(),bladeSpine=tiChamfer.clone();
    const finishColors=[
      [tiScale,0x3d4a54,0x23212a],[tiDark,0x1f262c,0x19151e],
      [tiChamfer,0xcbd6de,0xb1a5c5],[handleRail,0xcbd6de,0xa370ed],
      [cryoAccent,0x66bfd6,0xb38bef],[bronzeWasher,0xc98f49,0x8964af],
      [satinFlat,0x9aa8b2,0xe4d9ef],[bladeSpine,0xcbd6de,0xd4bfe9],
      [hollowBevel,0xd2dde4,0xac94c5],[mirrorEdge,0xf4f9fb,0xf0e9fa]
    ];
    let tide=false,tideTexture;
    w.setFinish=value=>{
      const next=value==='violet-tide';
      if(next===tide)return;
      tide=next;
      if(tide&&!tideTexture)tideTexture=violetTideTexture();
      for(const [material,steel,coated] of finishColors)material.color.setHex(tide?coated:steel);
      satinFlat.map=tide?tideTexture:steelGrain;
      bladeSpine.map=tide?tideTexture:null;
      satinFlat.metalness=tide?.67:.84;
      bladeSpine.metalness=tide?.68:.89;
      bladeSpine.needsUpdate=true;
    };

    // Extrude helper with real 3D through-holes (Shape.holes)
    function scalePlate(parent,mat,thickness,outerPts,holesPts,xOff){
      const shape=new T.Shape();
      outerPts.forEach(([z,y],i)=>i?shape.lineTo(-z,y):shape.moveTo(-z,y));
      shape.closePath();
      for(const hPts of holesPts){
        const p=new T.Path();
        hPts.forEach(([z,y],i)=>i?p.lineTo(-z,y):p.moveTo(-z,y));
        p.closePath();
        shape.holes.push(p);
      }
      const bev=Math.min(.0006,thickness*.18);
      const geo=new T.ExtrudeGeometry(shape,{depth:thickness,bevelEnabled:true,bevelThickness:bev,bevelSize:bev,bevelSegments:1});
      geo.translate(0,0,-thickness/2);
      geo.rotateY(Math.PI/2);
      const m=new T.Mesh(geo,mat);
      m.position.set(xOff,0,0);
      parent.add(m);
      return m;
    }

    function ovalHole(zc,yc,rz,ry,segs=10){
      const pts=[];
      for(let i=0;i<segs;i++){
        const a=(i/segs)*Math.PI*2;
        pts.push([zc+Math.cos(a)*rz,yc+Math.sin(a)*ry]);
      }
      return pts;
    }

    // Build high-resolution 3D hollow-ground curved Bowie clip-point blade with smooth longitudinal normals
    function buildHollowBlade(parent){
      // Control profile: [z, ySpine, yRidge, yFlatBot, yEdgeTop, yEdge, halfThick]
      // Sweeps into an iconic concave clip-point swedge + recurve S-belly meeting at upswept needle tip (-0.184, +0.0026)
      const ctrl=[
        [-.016,  .0044, -.0024, -.0160, -.0242, -.0264, .00215],
        [-.028,  .0060, -.0018, -.0145, -.0228, -.0252, .00220],
        [-.046,  .0072, -.0010, -.0104, -.0214, -.0238, .00220],
        [-.068,  .0070, -.0008, -.0102, -.0218, -.0242, .00215],
        [-.092,  .0074, -.0005, -.0102, -.0248, -.0276, .00208],
        [-.116,  .0080,  .0002, -.0098, -.0272, -.0302, .00196],
        [-.134,  .0062, -.0006, -.0092, -.0266, -.0296, .00178],
        [-.150,  .0038, -.0012, -.0078, -.0232, -.0260, .00150],
        [-.164,  .0026, -.0010, -.0056, -.0172, -.0196, .00112],
        [-.175,  .0024, -.0002, -.0028, -.0096, -.0112, .00064],
        [-.181,  .0025,  .0012,  .0002, -.0032, -.0042, .00028],
        [-.1845, .0026,  .0026,  .0026,  .0026,  .0026, .00008]
      ];
      // Subdivide control stations via Catmull-Rom interpolation for liquid-smooth silhouette & specular flow
      const stations=[];
      const catmull=(p0,p1,p2,p3,t)=>{
        const t2=t*t,t3=t2*t;
        return .5*((2*p1)+(-p0+p2)*t+(2*p0-5*p1+4*p2-p3)*t2+(-p0+3*p1-3*p2+p3)*t3);
      };
      for(let i=0;i<ctrl.length-1;i++){
        const p0=ctrl[Math.max(0,i-1)],p1=ctrl[i],p2=ctrl[i+1],p3=ctrl[Math.min(ctrl.length-1,i+2)];
        const subs=i>=5?3:2;
        for(let s=0;s<subs;s++){
          const t=s/subs,row=[];
          for(let c=0;c<7;c++)row.push(catmull(p0[c],p1[c],p2[c],p3[c],t));
          stations.push(row);
        }
      }
      stations.push(ctrl[ctrl.length-1]);

      // Build indexed-then-smoothed per-group meshes so normals are smooth ALONG z, razor-sharp ACROSS bevel ridges!
      function makeGroupBuilder(){
        return {verts:[],uvs:[],indices:[],map:new Map()};
      }
      const groups={
        swedgeL:makeGroupBuilder(),swedgeR:makeGroupBuilder(),swedgeCap:makeGroupBuilder(),
        flatL:makeGroupBuilder(),flatR:makeGroupBuilder(),
        bevelL:makeGroupBuilder(),bevelR:makeGroupBuilder(),
        edgeL:makeGroupBuilder(),edgeR:makeGroupBuilder()
      };
      const va=new T.Vector3(),vb=new T.Vector3(),vc=new T.Vector3(),ab=new T.Vector3(),ac=new T.Vector3(),nrm=new T.Vector3();

      function vIdx(grp,p,weld=true){
        if(weld){
          const key=Math.round(p[0]*200000)+','+Math.round(p[1]*200000)+','+Math.round(p[2]*200000);
          const hit=grp.map.get(key);
          if(hit!==undefined)return hit;
          const id=grp.verts.length/3;
          grp.verts.push(p[0],p[1],p[2]);
          grp.uvs.push(-p[2]*4,p[1]*12+.5);
          grp.map.set(key,id);
          return id;
        }
        const id=grp.verts.length/3;
        grp.verts.push(p[0],p[1],p[2]);
        grp.uvs.push(-p[2]*4,p[1]*12+.5);
        return id;
      }
      function tri(grpName,p0,p1,p2,outX,outY=0,weld=true){
        const grp=groups[grpName];
        va.set(...p0);vb.set(...p1);vc.set(...p2);
        ab.subVectors(vb,va);ac.subVectors(vc,va);nrm.crossVectors(ab,ac);
        if(nrm.lengthSq()<1e-13)return;
        const dot=nrm.x*outX+nrm.y*outY;
        const seq=dot<0?[p0,p2,p1]:[p0,p1,p2];
        grp.indices.push(vIdx(grp,seq[0],weld),vIdx(grp,seq[1],weld),vIdx(grp,seq[2],weld));
      }
      function quad(grpName,a,b,c,d,outX,outY=0,weld=true){
        tri(grpName,a,b,c,outX,outY,weld);
        tri(grpName,a,c,d,outX,outY,weld);
      }

      // Through-fuller slot spans z in [-0.046, -0.116] (stations 4..10)
      const slotStart=4,slotEnd=10;
      for(let i=0;i<stations.length-1;i++){
        const [z0,sp0,rg0,fb0,et0,ed0,t0]=stations[i];
        const [z1,sp1,rg1,fb1,et1,ed1,t1]=stations[i+1];
        const crown0=t0*.32,crown1=t1*.32;
        const edgeT0=Math.min(.00035,t0*.24),edgeT1=Math.min(.00035,t1*.24);
        const inSlot=i>=slotStart&&i<slotEnd;

        for(const side of [-1,1]){
          const sfx=side<0?'L':'R';
          quad('swedge'+sfx,[side*crown0,sp0,z0],[side*crown1,sp1,z1],[side*t1,rg1,z1],[side*t0,rg0,z0],side,.35);
          if(inSlot){
            const sTop0=rg0-.0020,sTop1=rg1-.0020;
            const sBot0=fb0+.0020,sBot1=fb1+.0020;
            quad('flat'+sfx,[side*t0,rg0,z0],[side*t1,rg1,z1],[side*t1,sTop1,z1],[side*t0,sTop0,z0],side,0);
            quad('flat'+sfx,[side*t0,sBot0,z0],[side*t1,sBot1,z1],[side*t1,fb1,z1],[side*t0,fb0,z0],side,0);
          }else{
            quad('flat'+sfx,[side*t0,rg0,z0],[side*t1,rg1,z1],[side*t1,fb1,z1],[side*t0,fb0,z0],side,0);
          }
          quad('bevel'+sfx,[side*t0,fb0,z0],[side*t1,fb1,z1],[side*edgeT1,et1,z1],[side*edgeT0,et0,z0],side,-.24);
          quad('edge'+sfx,[side*edgeT0,et0,z0],[side*edgeT1,et1,z1],[0,ed1,z1],[0,ed0,z0],side,-.45);
        }
        quad('swedgeCap',[-crown0,sp0,z0],[crown0,sp0,z0],[crown1,sp1,z1],[-crown1,sp1,z1],0,1,false);
        if(inSlot){
          const sTop0=rg0-.0020,sTop1=rg1-.0020;
          const sBot0=fb0+.0020,sBot1=fb1+.0020;
          quad('swedgeCap',[-t0,sTop0,z0],[t0,sTop0,z0],[t1,sTop1,z1],[-t1,sTop1,z1],0,-1,false);
          quad('swedgeCap',[-t0,sBot0,z0],[t0,sBot0,z0],[t1,sBot1,z1],[-t1,sBot1,z1],0,1,false);
        }
      }
      for(const [idx,dirZ] of [[slotStart,-1],[slotEnd,1]]){
        const [z,sp,rg,fb,et,ed,t]=stations[idx];
        const a=[-t,rg-.0020,z],b=[t,rg-.0020,z],c=[t,fb+.0020,z],d=[-t,fb+.0020,z];
        if(dirZ<0)quad('swedgeCap',a,b,c,d,0,0,false);
        else quad('swedgeCap',b,a,d,c,0,0,false);
      }

      const matFor={
        swedgeL:bladeSpine,swedgeR:bladeSpine,swedgeCap:tiChamfer,
        flatL:satinFlat,flatR:satinFlat,
        bevelL:hollowBevel,bevelR:hollowBevel,
        edgeL:mirrorEdge,edgeR:mirrorEdge
      };
      for(const [name,grp] of Object.entries(groups)){
        if(!grp.indices.length)continue;
        const g=new T.BufferGeometry();
        g.setAttribute('position',new T.Float32BufferAttribute(grp.verts,3));
        g.setAttribute('uv',new T.Float32BufferAttribute(grp.uvs,2));
        g.setIndex(grp.indices);
        g.computeVertexNormals();
        parent.add(new T.Mesh(g,matFor[name]));
      }
    }

    // --- 1. RIGHT ARTICULATED ARM, WRIST, PALM & 5-FINGER RIG ---
    const rightRig=new T.Group();
    const rightBasePos=[.008,-.014,-.010];
    const rightBaseRot=[.22,.37,-.22];
    rightRig.position.set(...rightBasePos);
    rightRig.rotation.set(...rightBaseRot);
    w.body.add(rightRig);

    const wristGroup=new T.Group();
    rightRig.add(wristGroup);

    // Seamless wrist gaiter + tapered tactical forearm + flush dorsal chronometer (zero cuff gap or blocky UV!)
    const forearmGroup=new T.Group();
    wristGroup.add(forearmGroup);
    const wristBridge=[.023,-.024,.096], wristPt=[.030,-.034,.138], elbowPt=[.165,-.230,.465];
    const armLerp=t=>[
      wristPt[0]+(elbowPt[0]-wristPt[0])*t,
      wristPt[1]+(elbowPt[1]-wristPt[1])*t,
      wristPt[2]+(elbowPt[2]-wristPt[2])*t
    ];
    // Smooth neoprene wrist gaiter with spherical joint bridges (zero wedge gap & zero concentric z-fighting!)
    tube(forearmGroup,glove,[.020,-.022,.074],wristBridge,.033,.040,14);
    pad(forearmGroup,cuffMatte,wristBridge[0],wristBridge[1],wristBridge[2],.041,.041,.041);
    tube(forearmGroup,cuffMatte,wristBridge,wristPt,.041,.049,14);
    pad(forearmGroup,cuffMatte,wristPt[0],wristPt[1],wristPt[2],.050,.050,.050);
    tube(forearmGroup,cuffMatte,wristPt,armLerp(.14),.050,.055,14);
    tube(forearmGroup,sleeveBand,armLerp(.14),armLerp(.22),.0565,.0595,14);
    tube(forearmGroup,cloth,elbowPt,armLerp(.13),.098,.0555,12);
    for(const t of [.28,.52,.74]){
      tube(forearmGroup,clothFold,armLerp(t-.03),armLerp(t+.02),.099-.042*t,.097-.042*t,12);
    }
    // Proud dark-titanium watch band (+3.5mm radial clearance over cuffMatte -> zero z-fighting!)
    const bandA=[.025,-.027,.106], bandB=[.028,-.031,.122];
    tube(forearmGroup,tiDark,bandA,bandB,.0468,.0488,14);
    const watchCase=tube(forearmGroup,tiChamfer,[.041,-.019,.114],[.047,-.017,.114],.0115,.0108,12);
    watchCase.rotation.y=.18;
    const watchDial=tube(forearmGroup,dialGlass,[.044,-.018,.114],[.048,-.016,.114],.0088,.0088,12);
    watchDial.rotation.y=.18;
    bake(forearmGroup);

    // Sculpted palm + dorsal carbon-knuckle armor
    const palmGroup=new T.Group();
    wristGroup.add(palmGroup);
    pad(palmGroup,glove,.024,-.025,.074,.021,.031,.054);
    pad(palmGroup,glove,.018,-.009,.082,.019,.021,.034);
    pad(palmGroup,knuckle,.034,-.022,.068,.011,.027,.046);
    for(let i=0;i<4;i++){
      pad(palmGroup,knuckle,.028,-.014-i*.008,.032+i*.024,.012,.010,.011);
    }
    bake(palmGroup);

    // 2-Segment Articulated Thumb: rests cleanly along +X/+Y Safe Handle spine in idle (never blocking -X scales!),
    // and swings into rollover barrel position at thumbPose = 1!
    const thumbProximal=new T.Group();
    thumbProximal.position.set(.018,.002,.082);
    wristGroup.add(thumbProximal);
    const thumbMesh1=new T.Group();
    tube(thumbMesh1,glove,[0,0,0],[-.006,.009,-.026],.0122,.0108,10);
    pad(thumbMesh1,knuckle,-.003,.005,-.013,.0118,.0102,.014);
    bake(thumbMesh1);
    thumbProximal.add(thumbMesh1);

    const thumbDistal=new T.Group();
    thumbDistal.position.set(-.006,.009,-.026);
    thumbProximal.add(thumbDistal);
    const thumbMesh2=new T.Group();
    tube(thumbMesh2,glove,[0,0,0],[-.003,.003,-.023],.0105,.0090,10);
    pad(thumbMesh2,knuckle,-.003,.003,-.023,.0092,.0086,.010);
    bake(thumbMesh2);
    thumbDistal.add(thumbMesh2);

    // 2-Segment Articulated Index Finger: hugs -X handle face cleanly in grip, extends straight through V-choil in Chaplin!
    const indexProximal=new T.Group();
    indexProximal.position.set(.018,-.012,.024);
    wristGroup.add(indexProximal);
    const indexMesh1=new T.Group();
    tube(indexMesh1,glove,[0,0,0],[-.016,-.018,-.004],.0110,.0098,10);
    pad(indexMesh1,knuckle,-.007,-.008,-.002,.0112,.0095,.011);
    bake(indexMesh1);
    indexProximal.add(indexMesh1);

    const indexDistal=new T.Group();
    indexDistal.position.set(-.016,-.018,-.004);
    indexProximal.add(indexDistal);
    const indexMesh2=new T.Group();
    tube(indexMesh2,glove,[0,0,0],[-.015,.011,-.002],.0096,.0082,10);
    pad(indexMesh2,glove,-.015,.011,-.002,.0084,.0080,.0088);
    bake(indexMesh2);
    indexDistal.add(indexMesh2);

    // 3 Staggered Lower Fingers (Middle, Ring, Pinky) wrapping cleanly onto x = -0.014 without clipping scales!
    const lowerFingers=new T.Group();
    lowerFingers.position.set(.015,-.042,.076);
    wristGroup.add(lowerFingers);
    const lowerMesh=new T.Group();
    const fingerSpecs=[
      [-.022, 1.02, .0106], // Middle
      [ .002, 0.96, .0100], // Ring
      [ .025, 0.85, .0092]  // Pinky
    ];
    for(const [fz,len,rad] of fingerSpecs){
      const p1=[-0.019*len,-.004,fz], p2=[-0.029*len,.019*len,fz-.002];
      tube(lowerMesh,glove,[0,0,fz],p1,rad,rad*.90,9);
      pad(lowerMesh,knuckle,p1[0]*.55,-.003,fz,rad*1.02,rad*.92,rad*1.02);
      tube(lowerMesh,glove,p1,p2,rad*.88,rad*.76,9);
      pad(lowerMesh,glove,p2[0],p2[1],p2[2],rad*.78,rad*.75,rad*.82);
    }
    bake(lowerMesh);
    lowerFingers.add(lowerMesh);

    // --- 2. INDEPENDENT TACTICAL LEFT GUARD ARM ---
    const leftRig=new T.Group();
    leftRig.position.set(-.180,-.315,-.068);
    leftRig.rotation.set(.18,-.22,.24);
    w.hand.add(leftRig);
    const leftMesh=new T.Group();
    tube(leftMesh,cloth,[-.115,-.195,.34],[-.020,-.034,.062],.096,.054,11);
    tube(leftMesh,sleeveBand,[-.026,-.044,.078],[-.016,-.027,.048],.056,.053,11);
    tube(leftMesh,cuffMatte,[-.016,-.027,.048],[.002,.002,-.004],.052,.046,11);
    pad(leftMesh,glove,.012,.012,-.038,.020,.028,.044);
    pad(leftMesh,knuckle,.002,.020,-.036,.013,.024,.040);
    tube(leftMesh,glove,[.016,.028,-.024],[.032,.044,-.054],.0112,.0092,9);
    for(let i=0;i<4;i++){
      const zz=-.068+i*.019, s=1-i*.07;
      tube(leftMesh,glove,[.012,.018-i*.004,zz],[.034*s,.024-i*.005,zz-.022*s],.0100*s,.0082*s,8);
    }
    bake(leftMesh);
    leftRig.add(leftMesh);

    // --- 3. TRUE 2-JOINT SERIAL BALISONG HIERARCHY ---
    const spinMount=new T.Group();
    spinMount.position.set(0,0,0);
    wristGroup.add(spinMount);

    const spinPivot=new T.Group();
    spinMount.add(spinPivot);

    const knifeCarrier=new T.Group();
    spinPivot.add(knifeCarrier);

    // Base Link: Safe Handle (origin at P_safe = (0, 0, 0))
    const safeHandle=new T.Group();
    knifeCarrier.add(safeHandle);

    // Joint 1: Safe Pivot -> Blade Group (rotates around X in [0, +pi])
    const safeJoint=new T.Group();
    safeHandle.add(safeJoint);

    // Joint 2: Bite Pivot attached to Blade Tang at (0, -2*D, 0) (rotates around X in [0, +pi])
    const biteJoint=new T.Group();
    biteJoint.position.set(0,-2*D,0);
    safeJoint.add(biteJoint);

    const biteHandle=new T.Group();
    biteJoint.add(biteHandle);

    // Build Twin-Scale Skeletonized Channel Handle (192mm elongated silhouette so 184mm curved clip-point nests 100% inside)
    function populateHandle(target,isBite){
      const sign=isBite?1:-1;
      const outer=[
        [-.009, .0065],[-.004, .0106],[.034, .0112],[.096, .0116],[.158, .0108],[.187, .0084],
        [.192, .0000],[.187,-.0084],[.158,-.0108],[.096,-.0114],[.034,-.0110],[-.004,-.0106],[-.009,-.0065]
      ];
      const holes=[
        ovalHole(.036,0,.0115,.0048,10),
        ovalHole(.070,0,.0128,.0050,10),
        ovalHole(.106,0,.0128,.0048,10),
        ovalHole(.141,0,.0120,.0044,10),
        ovalHole(.168,0,.0068,.0034,8)
      ];
      const scaleX=.0072, scaleThick=.0030;
      for(const side of [-1,1]){
        scalePlate(target,tiScale,scaleThick,outer,holes,side*scaleX);
        profile(target,handleRail,.0009,[
          [.018, .0102],[.096, .0108],[.178, .0092],[.178, .0074],[.096, .0088],[.018, .0084]
        ],side*(scaleX+.0017));
        profile(target,handleRail,.0009,[
          [.018,-.0084],[.096,-.0088],[.178,-.0074],[.178,-.0092],[.096,-.0108],[.018,-.0102]
        ],side*(scaleX+.0017));
        const px=side*(scaleX+.0018);
        tube(target,isBite?bronzeWasher:cryoAccent,[side*(scaleX+.0012),0,0],[px,0,0],.0064,.0064,14);
        tube(target,tiChamfer,[px,0,0],[px+side*.0005,0,0],.0048,.0045,12);
        tube(target,tiDark,[px+side*.0003,0,0],[px+side*.0008,0,0],.0024,.0024,6);
        tube(target,tiChamfer,[px,sign*.0055,.183],[px+side*.0005,sign*.0055,.183],.0028,.0028,8);
      }
      for(let k=0;k<4;k++){
        const jz=.016+k*.0055;
        for(const side of [-1,1]){
          box(target,tiDark,side*scaleX,-sign*.0108,jz,.0032,.0018,.0024);
        }
      }
      tube(target,isBite?bronzeWasher:cryoAccent,[-scaleX,sign*.0062,.183],[scaleX,sign*.0062,.183],.0030,.0030,10);
      tube(target,tiChamfer,[-scaleX,sign*.0072,.124],[scaleX,sign*.0072,.124],.0020,.0020,8);
      bake(target);
    }

    populateHandle(safeHandle,false);
    populateHandle(biteHandle,true);

    // Articulated Spring-Loaded T-Latch on Bite Handle pommel
    const latchPivot=new T.Group();
    latchPivot.position.set(0,-.0058,.187);
    biteHandle.add(latchPivot);
    const latchMesh=new T.Group();
    tube(latchMesh,tiChamfer,[0,0,0],[0,.002,.019],.0026,.0024,8);
    box(latchMesh,tiScale,0,.002,.020,.0125,.0056,.0052);
    tube(latchMesh,bronzeWasher,[-.0068,.002,.020],[.0068,.002,.020],.0022,.0022,8);
    bake(latchMesh);
    latchPivot.add(latchMesh);

    // Populate Blade Tang, Phosphor-Bronze Washers, Zen/Tang Pins & 3D Hollow-Ground Blade
    const bladeMeshGroup=new T.Group();
    safeJoint.add(bladeMeshGroup);
    // Stonewashed tang & ricasso block bridging P_safe (0,0,0) and P_bite (0,-2D,0)
    profile(bladeMeshGroup,tiDark,.0042,[
      [.007, .0055],[-.018, .0050],[-.024,-.0040],[-.024,-.0220],[-.018,-.0310],[.007,-.0315],[.009,-.0130]
    ]);
    // Phosphor-bronze pivot washers visible inside handle gaps at both pivots
    for(const py of [0,-2*D]){
      tube(bladeMeshGroup,bronzeWasher,[-.0054,py,0],[.0054,py,0],.0062,.0062,12);
    }
    // Dual hardened steel Tang Pins (open lock stop & closed stop)
    tube(bladeMeshGroup,tiChamfer,[-.0086,-.0130,-.0085],[.0086,-.0130,-.0085],.0024,.0024,10);
    tube(bladeMeshGroup,tiChamfer,[-.0082, .0052,-.0135],[.0082, .0052,-.0135],.0020,.0020,8);
    buildHollowBlade(bladeMeshGroup);
    bake(bladeMeshGroup);

    // --- 4. ZERO-GC COLD-STEEL SPECULAR MOTION RIBBON (active during fast spins & slashes) ---
    const TRAIL_STEPS=12;
    const trailPos=new Float32Array(TRAIL_STEPS*2*3);
    const trailCol=new Float32Array(TRAIL_STEPS*2*4);
    const trailIdx=[];
    for(let i=0;i<TRAIL_STEPS-1;i++){
      const a=i*2,b=a+1,c=a+2,d=a+3;
      trailIdx.push(a,b,c, b,d,c);
    }
    const trailGeo=new T.BufferGeometry();
    trailGeo.setAttribute('position',new T.BufferAttribute(trailPos,3).setUsage(T.DynamicDrawUsage));
    trailGeo.setAttribute('color',new T.BufferAttribute(trailCol,4).setUsage(T.DynamicDrawUsage));
    trailGeo.setIndex(trailIdx);
    const trailMat=new T.MeshBasicMaterial({
      vertexColors:true,
      transparent:true,
      opacity:.56,
      depthWrite:false,
      side:T.DoubleSide,
      blending:T.AdditiveBlending,
      toneMapped:false
    });
    const trailRibbon=new T.Mesh(trailGeo,trailMat);
    trailRibbon.frustumCulled=false;
    trailRibbon.visible=false;
    w.root.add(trailRibbon);

    const pBase=new T.Vector3(),pTip=new T.Vector3(),invRoot=new T.Matrix4();
    let trailPrimed=false;
    w.resetTrail=()=>{trailPrimed=false;trailRibbon.visible=false;};
    w.updateTrail=(intensity)=>{
      if(intensity<.035){
        trailPrimed=false;
        trailRibbon.visible=false;
        return;
      }
      w.root.updateMatrixWorld(true);
      invRoot.copy(w.root.matrixWorld).invert();
      pBase.set(0,-.010,-.054).applyMatrix4(safeJoint.matrixWorld).applyMatrix4(invRoot);
      pTip.set(0,.0025,-.183).applyMatrix4(safeJoint.matrixWorld).applyMatrix4(invRoot);
      if(!trailPrimed){
        for(let i=0;i<TRAIL_STEPS;i++){
          const k=i*6;
          trailPos[k]=pBase.x;trailPos[k+1]=pBase.y;trailPos[k+2]=pBase.z;
          trailPos[k+3]=pTip.x;trailPos[k+4]=pTip.y;trailPos[k+5]=pTip.z;
        }
        trailPrimed=true;
      }else{
        trailPos.copyWithin(6,0,(TRAIL_STEPS-1)*6);
        trailPos[0]=pBase.x;trailPos[1]=pBase.y;trailPos[2]=pBase.z;
        trailPos[3]=pTip.x;trailPos[4]=pTip.y;trailPos[5]=pTip.z;
      }
      for(let i=0;i<TRAIL_STEPS;i++){
        const fade=Math.pow(1-i/(TRAIL_STEPS-1),1.65)*intensity;
        const c=i*8;
        trailCol[c]=.76;trailCol[c+1]=.88;trailCol[c+2]=.96;trailCol[c+3]=fade*.22;
        trailCol[c+4]=.94;trailCol[c+5]=.98;trailCol[c+6]=1.0;trailCol[c+7]=fade*.74;
      }
      trailGeo.attributes.position.needsUpdate=true;
      trailGeo.attributes.color.needsUpdate=true;
      trailRibbon.visible=true;
    };

    w.rigParts={
      rightRig,rightBasePos,rightBaseRot,
      leftRig,
      thumbProximal,thumbDistal,
      indexProximal,indexDistal,
      lowerFingers,
      spinPivot,knifeCarrier,
      safeJoint,biteJoint,latchPivot
    };
  });
  model('karambit',w=>buildKarambit(w,parts));
  model('he',w=>{
    w.hipX=.133;w.hipZ=-.38;w.hipY=-.136;
    pad(w.action,olive,0,-.039,.065,.068,.086,.066);
    for(const y of [-.081,-.046,-.006]) {
      const r=.067*Math.sqrt(1-((y+.039)/.088)**2);
      tube(w.action,parker,[0,y-.001,.065],[0,y+.002,.065],r,r,20);
    }
    tube(w.action,amber,[0,.011,.065],[0,.018,.065],.052,.047,20);
    tube(w.action,graphite,[0,.035,.06],[0,.069,.06],.034,.025);
    box(w.action,alloy,0,.070,.067,.034,.014,.086);
    const lever=box(w.action,edges,.006,.006,.127,.028,.121,.012);lever.rotation.x=-.30;
    const ring=new T.Mesh(new T.TorusGeometry(.029,.0037,6,21),edges);
    ring.position.set(-.044,.043,.061);ring.rotation.y=.68;w.action.add(ring);
  });
  return guns;
}
