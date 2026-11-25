import * as T from './three.module.js';

// A single billboard batch carries short-lived dust, sparks, flash and exhaust.
export function makeEffects(scene) {
  const MAX=290, particles=[], positions=new Float32Array(MAX*3), colors=new Float32Array(MAX*3), data=new Float32Array(MAX*3);
  const geo=new T.BufferGeometry();
  for(const [name,array] of Object.entries({position:positions,color:colors,appearance:data})){
    geo.setAttribute(name,new T.BufferAttribute(array,3).setUsage(T.DynamicDrawUsage));
  }
  geo.setDrawRange(0,0);
  const particleMat=new T.ShaderMaterial({transparent:true,depthWrite:false,
    uniforms:{height:{value:800}},vertexShader:`attribute vec3 color,appearance;varying vec3 tint,p;uniform float height;
    void main(){vec4 mv=modelViewMatrix*vec4(position,1.);tint=color;p=appearance;gl_Position=projectionMatrix*mv;gl_PointSize=clamp(appearance.x*height*projectionMatrix[1][1]/max(.1,-2.*mv.z),1.,130.);}`,
    fragmentShader:`varying vec3 tint,p;
    void main(){vec2 uv=gl_PointCoord*2.-1.;float r=length(uv);float a=1.-smoothstep(.08,1.,r);if(p.z>.5)a=1.-smoothstep(.30,1.,r+sin(uv.x*11.+uv.y*5.)*.089+sin(uv.y*8.)*.07);if(a<.01)discard;gl_FragColor=vec4(tint,a*p.y);
    #include <colorspace_fragment>
    }`});
  const dots=new T.Points(geo,particleMat);dots.frustumCulled=false;dots.renderOrder=2;scene.add(dots);
  const resolution=new T.Vector2();dots.onBeforeRender=renderer=>{particleMat.uniforms.height.value=renderer.getDrawingBufferSize(resolution).y;};
  const decalCount=84,markCtx=document.createElement('canvas');markCtx.width=markCtx.height=32;
  const c=markCtx.getContext('2d'),grad=c.createRadialGradient(16,16,1,16,16,16);
  grad.addColorStop(0,'#0e1011');grad.addColorStop(.28,'#191916');grad.addColorStop(.44,'rgba(61,56,43,.8)');grad.addColorStop(.65,'rgba(93,84,66,.50)');grad.addColorStop(1,'rgba(98,87,72,0)');
  c.fillStyle=grad;c.fillRect(0,0,32,32);
  const stamps=new T.InstancedMesh(new T.PlaneGeometry(1,1),new T.MeshBasicMaterial({map:new T.CanvasTexture(markCtx),transparent:true,opacity:.91,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1}),decalCount);
  stamps.count=0;stamps.frustumCulled=false;stamps.renderOrder=1;scene.add(stamps);
  const brass=new T.InstancedMesh(new T.CylinderGeometry(.019,.023,.095,6),new T.MeshStandardMaterial({color:0xd2a458,roughness:.40,metalness:.55}),40);
  brass.count=0;brass.frustumCulled=false;scene.add(brass);
  let stamp=0,amount=1,casings=[],smokeClock=0;
  const obj=new T.Object3D(),up=new T.Vector3(0,1,0),front=new T.Vector3(0,0,1),n=new T.Vector3();
  const rand=(lo,hi)=>lo+Math.random()*(hi-lo);
  function puff(p,v,size,life,color,smoke=false,gravity=0){
    if(particles.length>=Math.floor(MAX*amount))particles.shift();
    particles.push({x:p.x,y:p.y,z:p.z,vx:v.x,vy:v.y,vz:v.z,size,life,max:life,color,smoke,gravity});
  }
  function drift(p,color,count,size,life){
    for(let i=0;i<Math.ceil(count*amount);i++)puff(p,{x:rand(-.8,.8),y:rand(.3,1.4),z:rand(-.8,.8)},size*rand(.65,1.15),life*rand(.57,1),color,true);
  }
  function impact(p,normal,material='metal'){
    n.copy(normal||up);if(n.lengthSq()<.02)n.copy(up);n.normalize();
    obj.position.copy(p).addScaledVector(n,.016);obj.quaternion.setFromUnitVectors(front,n);obj.rotateZ(Math.random()*6.28);
    obj.scale.setScalar(rand(.13,.23));obj.updateMatrix();
    stamps.setMatrixAt(stamp,obj.matrix);stamp=(stamp+1)%decalCount;stamps.count=Math.min(decalCount,stamps.count+1);stamps.instanceMatrix.needsUpdate=true;
    const wooden=material==='wood';
    for(let i=0;i<Math.ceil((wooden?5:7)*amount);i++){
      const speed=rand(1.2,3.4);
      puff(p,{x:n.x*speed+rand(-1.1,1.1),y:n.y*speed+rand(.3,1.9),z:n.z*speed+rand(-1.1,1.1)},wooden?.055:.065,rand(.11,.34),wooden?[.43,.29,.14]:[1,.62,.12],false,9);
    }
    drift(p,wooden?[.46,.35,.22]:[.31,.32,.29],3,.26,.55);
  }
  function explode(p) {
    const hot={x:p.x,y:p.y+.33,z:p.z};
    for(let i=0;i<Math.ceil(38*amount);i++){
      const theta=Math.random()*6.28,rad=rand(1,8);
      puff(hot,{x:Math.cos(theta)*rad,y:rand(.8,8),z:Math.sin(theta)*rad},rand(.1,.42),rand(.2,.62),[1,.36,.045],false,10);
    }
    puff(hot,{x:0,y:1,z:0},3,.18,[1,.89,.52]);
    drift(hot,[.99,.31,.035],14,1.35,.41);drift(hot,[.25,.25,.22],24,1.75,1.65);
  }
  function muzzle(p,dir){
    const v=dir||front;
    puff(p,{x:v.x*2,y:v.y*2,z:v.z*2},.28,.055,[1,.79,.38]);
    if(amount>.5)puff(p,{x:v.x*.62,y:.55+v.y*.62,z:v.z*.62},.22,.32,[.47,.48,.46],true);
  }
  function eject(p,dir) {
    if(casings.length>=Math.round(38*amount))casings.shift();
    const speed=rand(1.8,3.5);
    casings.push({x:p.x-dir.z*.12-dir.x*.24,y:p.y-.085,z:p.z+dir.x*.12-dir.z*.24,
      vx:-dir.z*speed+rand(-.3,.3),vy:rand(1.1,2.2),vz:dir.x*speed+rand(-.3,.3),spin:rand(5,17),t:0});
  }
  function update(dt){
    dt=Math.min(.06,Math.max(0,dt||0));
    smokeClock-=dt;
    if(smokeClock<=0){smokeClock=.32/amount;
      for(const sign of [-1,1])puff({x:-sign*2,y:9.05,z:sign*24.4},{x:.55,y:.62,z:.18},.80,3.5,[.27,.3,.30],true);
    }
    let live=0;
    for(let i=0;i<particles.length;i++){
      const p=particles[i];
      p.life-=dt;if(p.life<=0)continue;
      particles[live]=p;p.vy-=p.gravity*dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.z+=p.vz*dt;
      const k=live*3;
      positions[k]=p.x;positions[k+1]=p.y;positions[k+2]=p.z;
      colors[k]=p.color[0];colors[k+1]=p.color[1];colors[k+2]=p.color[2];
      const t=1-p.life/p.max;
      data[k]=p.size*(p.smoke?1+1.6*t:1);
      data[k+1]=p.smoke?.42*(1-t):Math.min(1,(1-t)*2);
      data[k+2]=p.smoke?1:0;
      live++;
    }
    particles.length=live;geo.setDrawRange(0,live);
    for(const attr of Object.values(geo.attributes)){attr.clearUpdateRanges();attr.addUpdateRange(0,live*3);attr.needsUpdate=true;}
    live=0;
    for(const b of casings){b.t+=dt;if(b.t>2.5)continue;casings[live]=b;
      b.x+=b.vx*dt;b.z+=b.vz*dt;b.vy-=10*dt;b.y+=b.vy*dt;
      if(b.y<.029){b.y=.029;if(b.vy<-.65)b.vy*=-.24;else b.vy=0;b.vx*=.78;b.vz*=.78;}
      obj.position.set(b.x,b.y,b.z);obj.rotation.set(b.y<=.03?Math.PI/2:b.t*b.spin,b.spin,b.t*b.spin*.5);obj.scale.setScalar(1);obj.updateMatrix();brass.setMatrixAt(live++,obj.matrix);
    }
    casings.length=live;brass.count=live;brass.instanceMatrix.needsUpdate=true;
  }
  function reset(){particles.length=casings.length=stamp=stamps.count=brass.count=0;geo.setDrawRange(0,0);}
  function headshot(p){
    drift(p,[.72,.10,.06],6,.24,.26);
    for(let i=0;i<Math.ceil(10*amount);i++){
      const a=Math.random()*6.28,sp=rand(1.6,4.2);
      puff(p,{x:Math.cos(a)*sp,y:rand(.8,3.2),z:Math.sin(a)*sp},.075,rand(.14,.32),[1,.82,.26],false,9.5);
    }
  }
  return {impact,muzzle,eject,explode,update,reset,wound(p){drift(p,[.58,.085,.055],5,.20,.22);},headshot,setQuality(level){amount={low:.36,medium:.68,high:1}[level]||.68;}};
}
