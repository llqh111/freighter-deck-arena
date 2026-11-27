import * as T from './three.module.js';

function lattice(x,y){
  const a=Math.imul(x,1597334677)^Math.imul(y,3812015901);
  return ((Math.imul(a^(a>>>16),2246822519)>>>0)/4294967295);
}
function noise(x,y){
  const ix=Math.floor(x),iy=Math.floor(y);
  let u=x-ix,v=y-iy;
  u=u*u*(3-2*u);v=v*v*(3-2*v);
  const low=T.MathUtils.lerp(lattice(ix,iy),lattice(ix+1,iy),u);
  const high=T.MathUtils.lerp(lattice(ix,iy+1),lattice(ix+1,iy+1),v);
  return T.MathUtils.lerp(low,high,v);
}

function sapphireTexture(){
  const width=256,height=512,data=new Uint8Array(width*height*4);
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
    const u=x/(width-1),v=y/(height-1);
    const a=noise(u*2.4+5.1,v*6.2+.41),b=noise(u*3.6+8.0,v*2.9+6.3);
    const px=u+b*.42,py=v+a*.18;
    const cloud=noise(px*3.1+2.0,py*7.4+7.0);
    // Flow bands run ACROSS the blade (perpendicular to the +X spine), like CS Doppler flow lines.
    const wave=Math.sin(px*24.0+py*3.5+cloud*4.8);
    const band=Math.sin(px*58.0+py*8.0+noise(px*4.6,py*11.0)*7.5);
    const pigment=T.MathUtils.clamp(.40+.30*wave+.34*(cloud-.5)+.07*band,0,1);
    const vein=Math.max(0,1-Math.abs(band)*2.6)**2*Math.max(0,1-Math.abs(wave-.12)*1.3);
    const grit=noise(x*.71+31.0,y*.054+9.0);
    const i=(y*width+x)*4;
    data[i]=pigment*255;
    data[i+1]=vein*255;
    data[i+2]=grit*255;
    data[i+3]=255;
  }
  const map=new T.DataTexture(data,width,height);
  map.wrapS=map.wrapT=T.MirroredRepeatWrapping;
  map.magFilter=T.LinearFilter;map.minFilter=T.LinearMipmapLinearFilter;
  map.generateMipmaps=true;
  map.needsUpdate=true;
  return map;
}

export function sapphireMaterial(original){
  const material=original.clone();
  material.name='Sapphire steel';
  const flow=sapphireTexture();
  const palette=[0x081026,0x0c34c8,0x2f6bff,0x9adcff].map(hex=>new T.Color(hex));
  material.onBeforeCompile=shader=>{
    shader.uniforms.sapphireFlow={value:flow};
    shader.uniforms.sapphirePalette={value:palette};
    shader.vertexShader=shader.vertexShader
      .replace('#include <common>','#include <common>\nvarying vec3 sapphireLocal;')
      .replace('#include <begin_vertex>','#include <begin_vertex>\nsapphireLocal = position;');
    shader.fragmentShader=shader.fragmentShader
      .replace('#include <common>',`
        #include <common>
        varying vec3 sapphireLocal;
        uniform sampler2D sapphireFlow;
        uniform vec3 sapphirePalette[4];
      `)
      .replace('#include <map_fragment>',`
        #include <map_fragment>
        vec2 coords=vec2(sapphireLocal.x*7.5+.55+sapphireLocal.y*1.6,sapphireLocal.y*16.0);
        vec3 layers=texture2D(sapphireFlow,coords).rgb;
        vec3 pigment=mix(sapphirePalette[0],sapphirePalette[1],smoothstep(.10,.62,layers.r));
        pigment=mix(pigment,sapphirePalette[2],smoothstep(.46,1.0,layers.r)*.86);
        pigment=mix(pigment,sapphirePalette[3],layers.g*.58);
        diffuseColor.rgb=pigment*mix(.90,1.10,layers.b);
      `)
      .replace('#include <roughnessmap_fragment>',`
        #include <roughnessmap_fragment>
        roughnessFactor=mix(.06,.15,layers.b*.62+layers.r*.38);
      `)
      .replace('#include <metalnessmap_fragment>',`
        #include <metalnessmap_fragment>
        metalnessFactor=.86;
      `)
      .replace('#include <lights_physical_fragment>',`
        #include <lights_physical_fragment>
        material.clearcoat=1.0;
        material.clearcoatRoughness=.06;
        material.iridescence=.62;
        material.iridescenceThickness=mix(190.0,430.0,layers.r);
      `);
  };
  return material;
}

// Thin-film temper colors on the blade and ring, in model coordinates.
export function caseHardenedMaterial(original){
  const material=new T.MeshStandardMaterial({map:original.map,roughness:.24,metalness:.56,side:T.DoubleSide,envMapIntensity:1.38});
  material.name='Case hardened steel';
  material.onBeforeCompile=shader=>{
    shader.vertexShader=shader.vertexShader
      .replace('#include <common>','#include <common>\nvarying vec3 temperPosition; varying float temperFace;')
      .replace('#include <begin_vertex>','#include <begin_vertex>\ntemperPosition = position; temperFace = abs(normal.z);');
    shader.fragmentShader=shader.fragmentShader
      .replace('#include <common>',`
        #include <common>
        varying vec3 temperPosition; varying float temperFace;
        float temperHash(vec2 p) {
          vec3 q = fract(vec3(p.xyx) * .1031);
          q += dot(q, q.yzx + 33.33);
          return fract((q.x + q.y) * q.z);
        }
        float temperNoise(vec2 p) {
          vec2 i = floor(p), f = fract(p);
          f = f*f*(3.0-2.0*f);
          return mix(mix(temperHash(i),temperHash(i+vec2(1,0)),f.x),
                     mix(temperHash(i+vec2(0,1)),temperHash(i+vec2(1,1)),f.x),f.y);
        }`)
      .replace('#include <map_fragment>',`
        #include <map_fragment>
        vec2 p=temperPosition.xy;
        float steel=max(smoothstep(.069,.076,p.x+.30*(p.y+.022)),
                        1.0-smoothstep(.008,.014,p.x-.23*p.y));
        vec2 q=p*vec2(97,149)+vec2(6.8,11.4);
        q+=vec2(temperNoise(q*1.15+3.4),temperNoise(q*1.32+9.7))*.89;
        float oxide=.69*temperNoise(q)+.23*temperNoise(q*2.55)+.08*temperNoise(q*5.5);
        float grain=temperNoise(p*vec2(170,5600)+25.0);
        vec3 blue=mix(vec3(.013,.038,.139),vec3(.025,.22,.39),smoothstep(.24,.57,oxide));
        vec3 violet=mix(vec3(.15,.021,.26),vec3(.27,.027,.095),smoothstep(.57,.70,oxide));
        vec3 bronze=mix(vec3(.31,.10,.021),vec3(.68,.43,.09),smoothstep(.69,.80,oxide));
        vec3 tempered=mix(blue,violet,smoothstep(.56,.63,oxide));
        tempered=mix(tempered,bronze,smoothstep(.64,.71,oxide));
        float bevel=smoothstep(.16,.72,1.0-temperFace);
        tempered=mix(tempered,vec3(.64,.77,.79),bevel*.34);
        diffuseColor.rgb=mix(diffuseColor.rgb*.61,tempered*(.97+.06*grain),steel);
      `)
      .replace('#include <roughnessmap_fragment>',`
        #include <roughnessmap_fragment>
        roughnessFactor=mix(.78,.24+(grain-.5)*.065-bevel*.09,steel);
      `)
      .replace('#include <metalnessmap_fragment>',`
        #include <metalnessmap_fragment>
        metalnessFactor=mix(.08,.79,steel);
      `);
  };
  return material;
}
