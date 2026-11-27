// Thin-film temper colors on the blade and ring, in model coordinates.
export function caseHardenedMaterial(original){
  const material=original.clone();
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
