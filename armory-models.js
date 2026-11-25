import * as T from './three.module.js';

// Compact exterior models built in camera space, with an independent magazine and action.
export function buildArmory(parts) {
  const {box,tube,pad,profile,arm,bake,paint,graphite,alloy,edges,parker,rubber,amber,bone}=parts;
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
    arm(body,[.16,-.31,.43],[.092,-.153,.16],[.045,-.126,.11],false);
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
