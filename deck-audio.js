// Short, cached Web Audio samples with idle prewarming and classic CF kill cues.
export function createDeckAudio() {
  let context, samples, master;
  let volume = .8, beat = 0, waterIn = 0, gullIn = 8;
  let enabled = false, prewarmed = false, prewarmIdx = 0;
  let countdown = .10, foot = 0;
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

  // Classic CrossFire transport-ship style kill / headshot / multi-kill / knife / grenade stingers.
  function cfKillSound(headshot, multi = 1, weapon = '', first = false) {
    const tau = 2 * Math.PI;
    const knife = weapon === 'knife';
    const grenade = weapon === 'he';
    const steps = [0, 2, 4, 7, 9, 12, 14, 16];
    const semi = steps[Math.min(Math.max(1, multi) - 1, steps.length - 1)];
    const mult = Math.pow(2, semi / 12);
    const root = (knife ? 392 : grenade ? 349.23 : 493.88) * mult;
    let seed = 9187 + multi * 97 + (headshot ? 31 : 0) + (first ? 13 : 0);
    let lp = 0;

    function metal(t, pitch, level, decay = 22) {
      if (t < 0) return 0;
      const env = level * Math.min(1, t / .002) * Math.exp(-decay * t);
      return env * (
        Math.sin(tau * pitch * t) +
        .42 * Math.sin(tau * pitch * 1.998 * t) +
        .24 * Math.sin(tau * pitch * 2.98 * t) +
        .12 * Math.sin(tau * pitch * 4.18 * t)
      );
    }

    const dur = (multi >= 4 || first || headshot) ? .56 : multi >= 2 ? .46 : .34;
    return makeSample(dur, t => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      const noise = seed / 2147483648 - 1;
      lp += .18 * (noise - lp);

      // Punchy sub impact.
      const sub = .36 * Math.sin(tau * (96 * t + 2.1 * (1 - Math.exp(-46 * t)))) * Math.exp(-26 * t);
      // Crisp metallic transient.
      const snap = .22 * (noise - lp) * Math.exp(-165 * t);

      let out = sub + snap;

      if (headshot) {
        // Signature CF golden headshot: bright steel helmet crack + high ringing ping.
        const crack = .34 * noise * Math.exp(-110 * t) + .24 * Math.sin(tau * 620 * t) * Math.exp(-48 * t);
        const ping =
          metal(t, 2460, .28, 28) +
          metal(t, 3780, .18, 36) +
          metal(t - .022, root * 2.0, .26, 15) +
          metal(t - .065, root * 2.498, .22, 13);
        out += crack + ping;
      } else {
        // Classic crisp metallic kill chime.
        out += metal(t, root, .24, 19) + metal(t - .034, root * 1.498, .25, 16);
      }

      if (first) {
        // First Kill heroic brass-like double accent.
        out += metal(t - .05, 587.33, .22, 12) + metal(t - .12, 880, .24, 10);
      }

      if (multi >= 2) {
        // Escalating multi-kill pulses.
        const count = Math.min(4, multi);
        for (let k = 1; k < count; k++) {
          out += metal(t - k * .058, root * (1.25 + k * .25), .20, 14);
        }
        if (multi >= 4) {
          // Ultra / Unbreakable / Unbelievable dramatic power chord & shimmer.
          out += .24 * Math.sin(tau * (root * .5) * t) * Math.exp(-8 * t) +
                 metal(t - .14, root * 3.0, .18, 11);
        }
      }

      if (knife) {
        // Blade unsheath slash sweep + cold steel ring.
        const slash = .30 * (noise - lp) * Math.sin(Math.PI * Math.min(1, t / .14)) * Math.exp(-16 * t);
        const blade = metal(t - .018, 1840 + 420 * Math.exp(-18 * t), .24, 20);
        out += slash + blade;
      } else if (grenade) {
        // Heavy low boom resonance + shrapnel sizzle.
        out += .32 * Math.sin(tau * 58 * t * Math.exp(-2.2 * t)) * Math.exp(-7 * t) +
               .16 * lp * Math.exp(-9 * t);
      }

      return Math.max(-.95, Math.min(.95, out));
    });
  }

  function getFoot(sprint, side) {
    const key = (sprint ? 'run_' : 'walk_') + side;
    if (!samples[key]) samples[key] = shoe(side, sprint);
    return samples[key];
  }

  function sampleFor(kind, weapon = '', head = false) {
    const key = kind + weapon + (head ? 'Head' : '');
    if (samples[key]) return samples[key];
    const freq = {ak47: 94, m4a1: 118, mp5: 155, awm: 61, deagle: 83}[weapon] || 110;
    const duration = {sea: 3.2, gull: .62, step: .18, land: .23, jump: .14, death: .22, hurt: .12, scope: .075, timber: .15, clang: .19, dry: .06, shot: weapon === 'awm' ? .52 : .24, explode: .75, bolt: .34, reload: .42, bounce: .11, pulse: .21, hit: .09}[kind] || .14;
    let seed = 3492, lp = 0;
    samples[key] = makeSample(duration, t => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      const white = seed / 2147483648 - 1;
      lp += .15 * (white - lp);
      if (kind === 'shot') {
        if (weapon === 'awm') {
          // Signature CS AWP heavy cannon crack + deep sub punch + deck reverb tail.
          const crack = (white - lp) * .52 * Math.exp(-t * 95);
          const boom = .62 * Math.sin(2 * Math.PI * (52 * t + 1.45 * (1 - Math.exp(-42 * t)))) * Math.exp(-t * 10.5);
          const bark = .32 * Math.sin(2 * Math.PI * (145 * t * Math.exp(-4 * t))) * Math.exp(-t * 24);
          const tail = lp * .82 * Math.exp(-t * 5.8);
          return Math.max(-.96, Math.min(.96, crack + boom + bark + tail));
        }
        const soft = weapon === 'm4a1' || weapon === 'mp5';
        const attack = (white - lp) * (soft ? .17 : .36) * Math.exp(-t * 160);
        const body = .42 * Math.sin(2 * Math.PI * (freq * t + .85 * (1 - Math.exp(-37 * t)))) * Math.exp(-t * (soft ? 36 : 24));
        const tail = lp * (soft ? .38 : .64) * Math.exp(-t * 23);
        return attack + body + tail;
      }
      if (kind === 'bolt') {
        // Two-stage CS AWP bolt cycle: crisp pull-back clack + push-forward lock.
        const pull = Math.exp(-75 * Math.abs(t - .04)) * (.36 * (white - lp) + .22 * Math.sin(6.28 * 1180 * t));
        const push = Math.exp(-65 * Math.abs(t - .20)) * (.32 * (white - lp) + .26 * Math.sin(6.28 * 860 * t));
        return Math.max(-.9, Math.min(.9, pull + push));
      }
      if (kind === 'explode') return (.64 * lp + .28 * Math.sin(6.28 * 49 * t * Math.exp(-1.9 * t)) + .12 * white * Math.exp(-40 * t)) * Math.exp(-6 * t);
      if (kind === 'sea') return .22 * lp * (Math.sin(Math.PI * t / duration) ** 2);
      if (kind === 'gull') return .08 * Math.sin(6.28 * (960 * t + 65 * Math.sin(t * 5))) * Math.sin(Math.PI * t / duration) ** 2;
      if (['step', 'land', 'jump', 'death', 'hurt', 'timber'].includes(kind)) return (.32 * lp + .15 * Math.sin(6.28 * 84 * t)) * Math.exp(-20 * t);
      if (kind === 'scope') return (.16 * Math.sin(6.28 * 1420 * t) + .14 * (white - lp)) * Math.exp(-62 * t);
      if (kind === 'pulse') return .18 * Math.sin(6.28 * 56 * t) * Math.exp(-18 * t);
      if (kind === 'hit') {
        if (head) {
          const dink = (.32 * Math.sin(6.28 * 2460 * t) + .22 * Math.sin(6.28 * 3780 * t)) * Math.exp(-30 * t);
          const crunch = .28 * white * Math.exp(-125 * t) + .16 * Math.sin(6.28 * 340 * t) * Math.exp(-52 * t);
          return Math.max(-.9, Math.min(.9, dink + crunch));
        }
        const tick = .22 * Math.sin(6.28 * 960 * t) * Math.exp(-62 * t) + .18 * (white - lp) * Math.exp(-150 * t) + .12 * Math.sin(6.28 * 220 * t) * Math.exp(-48 * t);
        return Math.max(-.85, Math.min(.85, tick));
      }
      if (kind === 'light' || kind === 'heavy' || kind === 'throw') return lp * Math.sin(Math.PI * t / duration) * .47;
      const click = Math.exp(-68 * t) + (kind === 'reload' ? Math.exp(-76 * Math.abs(t - .26)) : 0);
      return click * (.3 * white + .15 * Math.sin(6.28 * (kind === 'bounce' ? 560 : 970) * t));
    });
    return samples[key];
  }

  const prewarmQueue = [
    () => getFoot(false, 0), () => getFoot(false, 1),
    () => getFoot(true, 0), () => getFoot(true, 1),
    () => { if (!samples.kill_b_1__) samples.kill_b_1__ = cfKillSound(false, 1, '', false); },
    () => { if (!samples.kill_h_1__) samples.kill_h_1__ = cfKillSound(true, 1, '', false); },
    () => { if (!samples.kill_b_2__) samples.kill_b_2__ = cfKillSound(false, 2, '', false); },
    () => sampleFor('shot', 'ak47'), () => sampleFor('shot', 'm4a1'),
    () => sampleFor('shot', 'mp5'), () => sampleFor('shot', 'awm'), () => sampleFor('shot', 'deagle'),
    () => sampleFor('hit', '', false), () => sampleFor('hit', '', true),
    () => sampleFor('step'), () => sampleFor('reload', 'ak47'),
    () => sampleFor('clang'), () => sampleFor('timber'),
    () => sampleFor('sea'), () => sampleFor('hurt'), () => sampleFor('death')
  ];

  function schedulePrewarm() {
    if (prewarmed || !context || !samples) return;
    if (prewarmIdx >= prewarmQueue.length) { prewarmed = true; return; }
    const idle = globalThis.requestIdleCallback || (fn => setTimeout(fn, 0));
    idle(() => {
      if (!context || !samples || context.state === 'closed') return;
      if (prewarmIdx < prewarmQueue.length) {
        try { prewarmQueue[prewarmIdx++](); } catch {}
        schedulePrewarm();
      } else {
        prewarmed = true;
      }
    });
  }

  function ensureContext() {
    if (context) return true;
    if (globalThis.navigator?.userActivation?.hasBeenActive === false) return false;
    const Audio = globalThis.AudioContext || globalThis.webkitAudioContext;
    if (!Audio) return false;
    try {
      context = new Audio();
      master = context.createGain();
      master.gain.value = volume;
      master.connect(context.destination);
      samples = {};
      return true;
    } catch {
      return false;
    }
  }

  function prime() {
    if (!ensureContext()) return;
    if (!enabled && context.state === 'running') context.suspend().catch(() => {});
    schedulePrewarm();
  }

  function play(buffer, level = 1, pan = 0) {
    if (!enabled || context?.state !== 'running' || !buffer) return;
    if (level < .025) return;
    if (playing.size >= 40 && level < .35) return;
    const source = context.createBufferSource();
    source.buffer = buffer;
    const gain = context.createGain();
    gain.gain.value = Math.max(0, Math.min(1, level));
    const stereo = context.createStereoPanner?.();
    source.connect(gain);
    if (stereo) { stereo.pan.value = pan; gain.connect(stereo); stereo.connect(master); }
    else gain.connect(master);
    playing.add(source);
    source.onended = () => {
      source.disconnect(); gain.disconnect(); stereo?.disconnect();
      playing.delete(source);
    };
    source.start();
  }

  function reset() {
    countdown = .10;
    foot = 0;
    for (const source of playing) {
      source.onended = null;
      try { source.stop(); } catch {}
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
    if (!ensureContext()) { enabled = false; return; }
    schedulePrewarm();
    if (context.state !== 'closed') context.resume().catch(() => {});
  }

  function step(dt, {walking, sprint, grounded, alive, hp = 100, quiet = false}) {
    if (enabled && samples) {
      waterIn -= dt; gullIn -= dt;
      if (waterIn <= 0) { sfx({kind: 'sea', volume: .28, pan: Math.sin(gullIn) * .5}); waterIn = 2.6; }
      if (gullIn <= 0) { sfx({kind: 'gull', volume: .20, pan: .6}); gullIn = 11 + Math.random() * 11; }
    }
    if (alive && hp <= 30 && samples && enabled) {
      beat -= dt;
      if (beat <= 0) { sfx({kind: 'pulse'}); beat = .85; }
    }
    if (quiet) { countdown = .1; return; }
    if (!samples || !enabled || !walking || !grounded || !alive) {
      countdown = .10;
      return;
    }
    countdown -= Math.min(.1, Math.max(0, dt));
    if (countdown > 0) return;
    play(getFoot(sprint, foot));
    foot ^= 1;
    countdown += sprint ? .287 : .417;
  }

  function cue(kind, opts = {}) {
    if (!enabled || !samples) return;
    if (kind === 'kill' || kind === 'headshot') {
      const head = kind === 'headshot' || !!opts.head;
      const multi = Math.max(1, Math.min(8, Number(opts.multi) || 1));
      const weapon = opts.weapon === 'knife' || opts.weapon === 'he' ? opts.weapon : '';
      const first = !!opts.first;
      const key = 'kill_' + (head ? 'h' : 'b') + '_' + multi + '_' + weapon + '_' + (first ? 'f' : '');
      if (!samples[key]) samples[key] = cfKillSound(head, multi, weapon, first);
      play(samples[key], head || multi > 1 || first ? .95 : .82, 0);
    }
  }

  function sfx({kind, weapon = '', volume: level = 1, pan = 0, head = false}) {
    if (!enabled || !samples) return;
    if (level < .025) return;
    play(sampleFor(kind, weapon, head), level, Math.max(-1, Math.min(1, pan)));
  }

  function setVolume(v) {
    volume = Math.max(0, Math.min(1, v));
    if (master) master.gain.value = volume;
  }

  return {enable, prime, step, cue, reset, sfx, setVolume};
}
