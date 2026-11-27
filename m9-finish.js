import * as T from './three.module.js';

const finishes={
  blue:{colors:[0x101c4a,0x1556ca,0x58dbff,0x6946dc],shift:.00,trail:0x72bfff},
  green:{colors:[0x082927,0x06a765,0x9dfda0,0x15c7b7],shift:.20,trail:0x68f2a6},
  red:{colors:[0x360910,0xc7182c,0xff765f,0x9b2337],shift:.39,trail:0xff7970}
};

function lattice(x,y){
  const a=Math.imul(x,1597334677)^Math.imul(y,3812015801);
  return ((Math.imul(a^(a>>>16),2246822519)>>>0)/4294967295);
}
function noise(x,y){
  const ix=Math.floor(x),iy=Math.floor(y);
  let u=x-ix,v=y-iy;
  u=u*u*(3-2*u);v=v*v*(3-2*v);
  const low=T.MathUtils.lerp(lattice(ix,iy),lattice(ix+1,iy),u);
  const high=T.MathUtils.lerp(lattice(ix,iy+1),lattice(ix+1,iy+1),u);
  return T.MathUtils.lerp(low,high,v);
}

function flowTexture(){
  const width=192,height=384,data=new Uint8Array(width*height*4);
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
    const u=x/(width-1),v=y/(height-1);
    const a=noise(u*3.1+2.8,v*4.5+.37),b=noise(u*4.2+7.0,v*3.7+9.2);
    const px=u+b*.38,py=v+a*.24;
    const cloud=noise(px*3.7+5,py*5.7+4);
    const twist=Math.sin(py*18+px*8.5+cloud*4.9);
    const ripple=Math.sin(py*49+px*15+noise(px*5.7,py*9)*9.0);
    const pigment=T.MathUtils.clamp(.48+.27*twist+.36*(cloud-.5)+.08*ripple,0,1);
    const vein=Math.max(0,1-Math.abs(ripple)*2.9)**2*Math.max(0,1-Math.abs(twist+.09)*1.25);
    const grit=noise(x*.67+27,y*.062+2);
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

export function installM9Finish(material){
  const uniforms={
    m9Flow:{value:flowTexture()},
    m9Active:{value:0},
    m9Shift:{value:0},
    m9Palette:{value:finishes.blue.colors.map(hex=>new T.Color(hex))}
  };
  material.customProgramCacheKey=()=> 'deckfire-m9-flow-v1';
  material.onBeforeCompile=shader=>{
    Object.assign(shader.uniforms,uniforms);
    shader.vertexShader=shader.vertexShader
      .replace('#include <common>','#include <common>\nvarying vec3 m9Local;')
      .replace('#include <begin_vertex>','#include <begin_vertex>\nm9Local = position;');
    shader.fragmentShader=shader.fragmentShader
      .replace('#include <common>',`
        #include <common>
        varying vec3 m9Local;
        uniform sampler2D m9Flow;
        uniform float m9Active;
        uniform float m9Shift;
        uniform vec3 m9Palette[4];
      `)
      .replace('#include <map_fragment>',`
        #include <map_fragment>
        // Local coordinates keep the pattern on the metal as the knife rolls.
        float m9Blade = m9Active * smoothstep(0.035, 0.041, -m9Local.z);
        vec3 m9Layers = vec3(0.0);
        if (m9Blade > 0.0) {
          vec2 coords = vec2(m9Local.x * 5.7 + 0.52 + m9Local.y * 2.1, (-m9Local.z - 0.036) * 3.10);
          m9Layers = texture2D(m9Flow, coords + vec2(m9Shift, m9Shift * 0.47)).rgb;
          vec3 pigment = mix(m9Palette[0], m9Palette[1], smoothstep(0.12, 0.64, m9Layers.r));
          pigment = mix(pigment, m9Palette[2], smoothstep(0.49, 1.0, m9Layers.r) * 0.83);
          pigment = mix(pigment, m9Palette[3], m9Layers.g * 0.54);
          diffuseColor.rgb = mix(diffuseColor.rgb, pigment * mix(0.93, 1.07, m9Layers.b), m9Blade);
        }
      `)
      .replace('#include <metalnessmap_fragment>',`
        #include <metalnessmap_fragment>
        roughnessFactor = mix(roughnessFactor, mix(0.14, 0.28, m9Layers.r * 0.55 + m9Layers.b * 0.45), m9Blade);
        metalnessFactor = mix(metalnessFactor, 0.88, m9Blade);
      `)
      .replace('#include <lights_physical_fragment>',`
        #include <lights_physical_fragment>
        material.clearcoat *= m9Blade;
        material.clearcoatRoughness = mix(material.clearcoatRoughness, 0.20, m9Layers.g * 0.65);
        material.iridescence *= m9Blade;
        material.iridescenceThickness = mix(154.0, 340.0, m9Layers.r);
      `);
  };
  return (id)=>{
    const preset=Object.hasOwn(finishes,id)?finishes[id]:null;
    uniforms.m9Active.value=Number(!!preset);
    if(!preset)return null;
    uniforms.m9Shift.value=preset.shift;
    uniforms.m9Palette.value.forEach((color,i)=>color.setHex(preset.colors[i]));
    return preset.trail;
  };
}

