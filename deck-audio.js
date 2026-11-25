// Short, cached Web Audio samples. No audio nodes are created on page load.
export function createDeckAudio() {
  let context;
  let samples;
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

  function chime(headshot) {
    const tau = 2 * Math.PI;
    function note(t, pitch, level) {
      if (t < 0) return 0;
      return level * Math.min(1,t / .005) * Math.exp(-25 * t) *
        (Math.sin(tau * pitch * t) + .16 * Math.sin(tau * pitch * 2.07 * t));
    }
    return makeSample(headshot ? .32 : .22, t =>
      note(t, 555, .13) + note(t - .044, 830, .14) +
      (headshot ? note(t - .103, 1245, .14) : 0));
  }

  function play(buffer) {
    if (!enabled || context?.state !== 'running') return;
    const source = context.createBufferSource();
    source.buffer = buffer;
    source.connect(context.destination);
    playing.add(source);
    source.onended = () => {
      source.disconnect();
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
        context = new Audio();
        samples = {
          walk: [shoe(0,false), shoe(1,false)],
          run: [shoe(0,true), shoe(1,true)],
          kill: chime(false), headshot: chime(true)
        };
      } catch {
        enabled = false;
        return;
      }
    }
    if (context.state !== 'closed') context.resume().catch(() => {});
  }

  function step(dt, {walking, sprint, grounded, alive}) {
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

  function cue(kind) {
    if (samples && (kind === 'kill' || kind === 'headshot')) play(samples[kind]);
  }
  return {enable, cue, step, reset};
}

