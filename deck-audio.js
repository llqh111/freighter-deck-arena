// Short, cached Web Audio samples. No audio nodes are created on page load.
export function createDeckAudio() {
  let context;
  let samples,master;let volume=.8,beat=0,waterIn=0,gullIn=8;
  let enabled = false;
  let countdown = .10;
  let foot = 0;
  const playing = new Set();

  function makeSample(duration, synth, pan = 0) {
    const rate = context.sampleRate;
    const buffer = context.createBuffer(2, Math.ceil(duration * rate), rate);
    const left = buffer.getChannelData(0);
    const right = buffer.getChannelData(1);
    const angle = (pan + 1) * Math.PI / 4;
    const l = Math.cos(angle), r = Math.sin(angle);
    for (let i = 0; i < left.length; i++) {
      const t = i / rate;
      const fade = Math.min(1, t / .0025, Math.max(0, (duration - t) / .016));
      const value = synth(t) * fade;
      left[i] = l * value;
      right[i] = r * value;
    }
    return buffer;
  }

  function shoe(side, fast) {
    let seed = 8374 + side * 321, smooth = 0, prev = 0;
    const base = (fast ? 74 : 63) + side * 3;
    const tau = 2 * Math.PI;
    const coefficient = 1 - Math.exp(-tau * 950 / context.sampleRate);
    return makeSample(.235, t => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      const white = seed / 2147483648 - 1;
      smooth += coefficient * (white - smooth);
      const scuff = .095 * (white - prev) * Math.exp(-85 * t);
      prev = white;
      const sole = .23 * Math.sin(tau * (base * t + .62 * (1 - Math.exp(-36 * t)))) * Math.exp(-28 * t);
      const plate = (.056 * Math.sin(tau * (360 + side * 17) * t) +
                     .032 * Math.sin(tau * (870 + side * 33) * t)) * Math.exp(-30 * t);
      return (sole + plate + scuff + .22 * smooth * Math.exp(-38 * t)) * (fast ? .96 : .73);
    }, side ? .15 : -.15);
  }

  function killSound(headshot, multi = 1, knife = false) {
    const tau = 2 * Math.PI;
    const steps = [0, 2, 4, 7, 9, 12];
    const semi = steps[Math.min(Math.max(1, multi) - 1, steps.length - 1)];
    const mult = Math.pow(2, semi / 12);
    const root = (knife ? 420 : 523.25) * mult;
    let seed = 9187 + multi * 97 + (headshot ? 31 : 0);
    function bell(t, pitch, level, decay = 18) {
      if (t < 0) return 0;
      const env = level * Math.min(1, t / .003) * Math.exp(-decay * t);
      return env * (Math.sin(tau * pitch * t) + .32 * Math.sin(tau * pitch * 2.005 * t) + .14 * Math.sin(tau * pitch * 3.01 * t));
    }
    const dur = headshot || multi >= 3 ? .46 : .34;
    return makeSample(dur, t => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      const noise = seed / 2147483648 - 1;
      // Tight sub-bass punch for physical kill confirmation weight.
      const sub = .34 * Math.sin(tau * (105 * t + 1.8 * (1 - Math.exp(-42 * t)))) * Math.exp(-32 * t);
      // Crisp transient snap.
      const snap = .18 * noise * Math.exp(-150 * t);
      // Escalating harmonic chord.
      let chord = bell(t, root, .24, 17) + bell(t - .036, root * 1.498, .26, 15);
      if (headshot) {
        // Metallic helmet dink + bright octave shimmer.
        chord += bell(t, 2380, .18, 34) + bell(t - .078, root * 2.0, .25, 13);
      } else if (multi >= 2) {
        chord += bell(t - .072, root * (multi >= 4 ? 2.0 : 1.888), .22, 13);
      }
      if (knife) {
        chord += .22 * Math.sin(tau * 165 * t) * Math.exp(-14 * t);
      }
      return Math.max(-.95, Math.min(.95, sub + snap + chord));
    });
  }

  function play(buffer,level=1,pan=0) {
    if (!enabled || context?.state !== 'running') return;
    const source = context.createBufferSource();
    source.buffer = buffer;
    const gain=context.createGain();gain.gain.value=Math.max(0,Math.min(1,level));
    const stereo=context.createStereoPanner?.();source.connect(gain);
    if(stereo){stereo.pan.value=pan;gain.connect(stereo);stereo.connect(master);}else gain.connect(master);
    playing.add(source);
    source.onended = () => {
      source.disconnect();gain.disconnect();stereo?.disconnect();
      playing.delete(source);
    };
    source.start();
  }

  function reset() {
    countdown = .10;
    foot = 0;
    for (const source of playing) {
      source.onended = null;
      source.stop();
      source.disconnect();
    }
    playing.clear();
  }

  function enable(value) {
    enabled = !!value;
    if (!enabled) {
      reset();
      if (context && context.state !== 'closed') context.suspend().catch(() => {});
      return;
    }
    if (!context) {
      if (globalThis.navigator?.userActivation?.hasBeenActive === false) return;
      const Audio = globalThis.AudioContext || globalThis.webkitAudioContext;
      if (!Audio) return;
      try {
        context = new Audio();master=context.createGain();master.gain.value=volume;master.connect(context.destination);
        samples = {
          walk: [shoe(0,false), shoe(1,false)],
          run: [shoe(0,true), shoe(1,true)],
          kill: killSound(false, 1, false),
          headshot: killSound(true, 1, false)
        };
      } catch {
        enabled = false;
        return;
      }
    }
    if (context.state !== 'closed') context.resume().catch(() => {});
  }

  function step(dt, {walking,sprint,grounded,alive,hp=100,quiet=false}) {
    if(enabled&&samples){
      waterIn-=dt;gullIn-=dt;if(waterIn<=0){sfx({kind:'sea',volume:.28,pan:Math.sin(gullIn)*.5});waterIn=2.6;}
      if(gullIn<=0){sfx({kind:'gull',volume:.20,pan:.6});gullIn=11+Math.random()*11;}
    }
    if(alive&&hp<=30&&samples&&enabled){beat-=dt;if(beat<=0){sfx({kind:'pulse'});beat=.85;}}
    if(quiet){countdown=.1;return;}
    if (!samples || !enabled || !walking || !grounded || !alive) {
      countdown = .10;
      return;
    }
    countdown -= Math.min(.1, Math.max(0, dt));
    if (countdown > 0) return;
    play((sprint ? samples.run : samples.walk)[foot]);
    foot ^= 1;
    countdown += sprint ? .287 : .417;
  }

  function cue(kind, opts = {}) {
    if (!enabled || !samples) return;
    if (kind === 'kill' || kind === 'headshot') {
      const head = kind === 'headshot' || !!opts.head;
      const multi = Math.max(1, Math.min(6, Number(opts.multi) || 1));
      const knife = opts.weapon === 'knife';
      const key = 'kill_' + (head ? 'h' : 'b') + '_' + multi + (knife ? '_k' : '');
      if (!samples[key]) samples[key] = killSound(head, multi, knife);
      play(samples[key], head || multi > 1 ? .92 : .80, 0);
    }
  }
  function sfx({kind,weapon='',volume:level=1,pan=0,head=false}){
    if(!enabled||!samples)return;
    const key=kind+weapon+(head?'Head':'');
    if(!samples[key]){
      const freq={ak47:94,m4a1:118,mp5:155,awm:61,deagle:83}[weapon]||110;
      const duration={sea:3.2,gull:.62,step:.18,land:.23,jump:.14,death:.22,hurt:.12,scope:.1,timber:.15,clang:.19,dry:.06,shot:.24,explode:.75,bolt:.22,reload:.42,bounce:.11,pulse:.21,hit:.09}[kind]||.14;
      let seed=3492,lp=0;
      samples[key]=makeSample(duration,t=>{
        seed=(Math.imul(seed,1664525)+1013904223)>>>0;const white=seed/2147483648-1;lp+=.15*(white-lp);
        if(kind==='shot'){
          const soft=weapon==='m4a1'||weapon==='mp5',sniper=weapon==='awm';
          const attack=(white-lp)*(soft?.17:.36)*Math.exp(-t*(sniper?105:160));
          const body=.42*Math.sin(2*Math.PI*(freq*t+.85*(1-Math.exp(-37*t))))*Math.exp(-t*(sniper?15:soft?36:24));
          const tail=lp*(sniper?.85:soft?.38:.64)*Math.exp(-t*(sniper?11:23));
          return attack+body+tail;
        }
        if(kind==='explode')return (.64*lp+.28*Math.sin(6.28*49*t*Math.exp(-1.9*t))+.12*white*Math.exp(-40*t))*Math.exp(-6*t);
        if(kind==='sea')return .22*lp*(Math.sin(Math.PI*t/duration)**2);
        if(kind==='gull')return .08*Math.sin(6.28*(960*t+65*Math.sin(t*5)))*Math.sin(Math.PI*t/duration)**2;
        if(['step','land','jump','death','hurt','timber'].includes(kind))return (.32*lp+.15*Math.sin(6.28*84*t))*Math.exp(-20*t);
        if(kind==='scope')return .08*Math.sin(6.28*630*t)*Math.exp(-46*t);
        if(kind==='pulse')return .18*Math.sin(6.28*56*t)*Math.exp(-18*t);
        if(kind==='hit'){
          if(head){
            const dink=(.28*Math.sin(6.28*2240*t)+.18*Math.sin(6.28*3560*t))*Math.exp(-34*t);
            const crunch=.26*white*Math.exp(-135*t)+.16*Math.sin(6.28*310*t)*Math.exp(-55*t);
            return Math.max(-.9,Math.min(.9,dink+crunch));
          }
          const tick=.22*Math.sin(6.28*960*t)*Math.exp(-62*t)+.18*(white-lp)*Math.exp(-150*t)+.12*Math.sin(6.28*220*t)*Math.exp(-48*t);
          return Math.max(-.85,Math.min(.85,tick));
        }
        if(kind==='light'||kind==='heavy'||kind==='throw')return lp*Math.sin(Math.PI*t/duration)*.47;
        const click=Math.exp(-68*t)+(kind==='reload'?Math.exp(-76*Math.abs(t-.26)):0);
        return click*(.3*white+.15*Math.sin(6.28*(kind==='bounce'?560:970)*t));
      });
    }
    play(samples[key],level,Math.max(-1,Math.min(1,pan)));
  }
  function setVolume(v){volume=Math.max(0,Math.min(1,v));if(master)master.gain.value=volume;}
  return {enable,step,cue,reset,sfx,setVolume};
}
