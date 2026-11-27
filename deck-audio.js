import {isMelee} from './arsenal.js?v=29';
import {bayonetSounds,bayonetLayers,bayonetSample} from './bayonet-audio.js?v=4';
import {classicCueNames,classicLayers,classicSound} from './classic-blade-audio.js?v=1';

const butterflyAssets = {
  latch: new URL('./assets/butterfly/mechanical-latch-light.wav', import.meta.url).href,
  swish: new URL('./assets/butterfly/swish-hard.wav', import.meta.url).href
};
// External foley starts just before its catalogued contact or peak, layered with CS2-inspired cold-steel synthesis.
const bladeMotionSounds = {
  butterflyAir: {asset: 'swish', offset: .040, mix: .30, pitch: 2340, ring: .046, duration: .120},
  butterflySpin: {asset: 'swish', offset: .034, mix: .42, pitch: 2940, ring: .092, duration: .118},
  butterflyTick: {asset: 'latch', offset: .048, mix: .46, pitch: 3180, ring: .19, duration: .064},
  butterflyRicochet: {asset: 'latch', offset: .047, mix: .36, pitch: 3560, ring: .20, duration: .082},
  butterflyCatch: {asset: 'latch', offset: .046, mix: .66, pitch: 1580, ring: .26, duration: .128},
  butterflySlash: {asset: 'swish', offset: .038, mix: .64, pitch: 1920, ring: .13, duration: .132},
  butterflyThrust: {asset: 'swish', offset: .035, mix: .72, pitch: 1120, ring: .16, duration: .168},
  // Inspect-only sheen: the near-silent ridge roll between showcase beats.
  butterflySheen: {asset: 'swish', offset: .012, mix: .14, pitch: 3640, ring: .062, duration: .26},
  karambitSpin: {asset: 'swish', offset: .036, mix: .44, pitch: 2740, ring: .088, duration: .142},
  karambitRing: {asset: 'swish', offset: .028, mix: .20, pitch: 3320, ring: .082, duration: .25},
  karambitFlick: {asset: 'swish', offset: .031, mix: .42, pitch: 2380, ring: .072, duration: .108},
  karambitCatch: {asset: 'latch', offset: .048, mix: .56, pitch: 2640, ring: .22, duration: .118},
  karambitCut: {asset: 'swish', offset: .034, mix: .64, pitch: 1680, ring: .13, duration: .152}
};

const bladeFeedbackDurations = {bladeGrip: .066, bladeFlesh: .125, bladeWall: .18};

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
    const knife = isMelee(weapon);
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
    if(Object.hasOwn(bayonetSounds,kind)){
      return samples[key]=makeSample(bayonetSounds[kind][0],bayonetSample(kind,head,context.sampleRate));
    }
    const classic=classicSound(kind,weapon);
    if(classic)return samples[key]=makeSample(classic[0],bayonetSample(kind,head,context.sampleRate,classic));
    const freq = {ak47: 94, m4a1: 118, mp5: 155, awm: 61, deagle: 83}[weapon] || 110;
    const isBlade = isMelee(weapon);
    const motion = bladeMotionSounds[kind];
    const duration = motion?.duration ?? bladeFeedbackDurations[kind] ?? ({sea: 3.2, gull: .62, step: .18, land: .23, jump: .14, death: .22, hurt: .12, scope: .075, timber: .15, clang: .19, dry: .06, shot: weapon === 'awm' ? .52 : .24, explode: .75, bolt: .34, reload: .42, bounce: .11, pulse: .21, hit: .09, equip: isBlade ? .26 : .14, light: isBlade ? .18 : .14, heavy: isBlade ? .28 : .18}[kind] || .14);
    let seed = 3492, lp = 0, mp = 0;
    samples[key] = makeSample(duration, t => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      const white = seed / 2147483648 - 1;
      lp += .13 * (white - lp);
      mp += .42 * (white - mp);
      const midBand = mp - lp, highBand = white - mp;
      if (motion) {
        const tau = 2 * Math.PI;
        const u = Math.min(1, t / duration);
        if (kind === 'butterflyTick') {
          // CS2 signature balisong titanium-on-tang clack: ultra-dry dual micro-impulse + tight inharmonic titanium modes
          const hit1 = Math.exp(-420 * t) * (.34 * (white - lp) + .26 * Math.sin(tau * 3140 * t) + .16 * Math.sin(tau * 5080 * t) + .09 * Math.sin(tau * 7620 * t));
          const dt2 = t - .009;
          const hit2 = dt2 > 0 ? Math.exp(-360 * dt2) * (.20 * (white - lp) + .19 * Math.sin(tau * 2420 * dt2) + .11 * Math.sin(tau * 4310 * dt2)) : 0;
          const body = .09 * Math.sin(tau * 480 * t) * Math.exp(-130 * t);
          return Math.max(-.93, Math.min(.93, hit1 + hit2 + body));
        }
        if (kind === 'butterflyAir') {
          // Agile balisong opening whip: crisp rising air-cut + micro pivot click at onset
          const env = Math.sin(Math.PI * u) ** 1.5;
          const peak = Math.exp(-(((t - .030) / .024) ** 2));
          const air = (midBand * .24 + highBand * .20) * (.45 * env + .82 * peak);
          const pivot = Math.exp(-380 * t) * (.15 * highBand + .11 * Math.sin(tau * 3620 * t));
          return Math.max(-.9, Math.min(.9, air + pivot));
        }
        if (kind === 'butterflySpin') {
          // Centrifugal dual-handle flutter: brisk Doppler whoosh with subtle handle-whir modulation + steel whisper
          const env = Math.sin(Math.PI * u) ** 1.4;
          const flutter = .78 + .22 * Math.sin(tau * 32 * t);
          const air = (midBand * .28 + highBand * .22) * env * flutter;
          const bearing = .085 * Math.exp(-48 * t) * (Math.sin(tau * 3120 * t) + .42 * Math.sin(tau * 4890 * t));
          const tick = Math.exp(-340 * t) * .12 * Math.sin(tau * 4120 * t);
          return Math.max(-.91, Math.min(.91, air + bearing + tick));
        }
        if (kind === 'butterflySheen') {
          // Near-silent hollow-grind bevel whisper during inspect admiration
          const breath = Math.sin(Math.PI * u) ** 2;
          const air = (.08 * midBand + .06 * highBand) * breath;
          const glint = (.048 * Math.sin(tau * 3680 * t) + .026 * Math.sin(tau * 5620 * t)) * breath;
          return Math.max(-.82, Math.min(.82, air + glint));
        }
        if (kind === 'butterflySlash') {
          // CS2 fast razor whip-slash: early aggressive air-tear + tight wrist snap + cold edge zip
          const peak = Math.exp(-(((t - .026) / .022) ** 2));
          const env = Math.sin(Math.PI * u) ** 1.45;
          const cut = (midBand * .36 + highBand * .34) * (.35 * env + .98 * peak);
          const snap = .20 * Math.sin(tau * (175 * t + .38 * (1 - Math.exp(-62 * t)))) * Math.exp(-52 * t);
          const edge = .105 * Math.exp(-58 * t) * (Math.sin(tau * 2260 * t) + .45 * Math.sin(tau * 3780 * t)) * (.5 + .5 * peak);
          return Math.max(-.93, Math.min(.93, cut + snap + edge));
        }
        if (kind === 'butterflyThrust') {
          // CS2 heavy viper lunge: deep air rush + mechanical tension click + needle-tip hiss
          const peak = Math.exp(-(((t - .038) / .030) ** 2));
          const env = Math.sin(Math.PI * u) ** 1.5;
          const click = Math.exp(-360 * t) * (.18 * highBand + .15 * Math.sin(tau * 2980 * t));
          const rush = (midBand * .40 + highBand * .26) * (.40 * env + .96 * peak) + .26 * lp * (env + .75 * peak);
          const punch = .26 * Math.sin(tau * (108 * t + .58 * (1 - Math.exp(-46 * t)))) * Math.exp(-30 * t);
          const hiss = .095 * Math.exp(-45 * t) * Math.sin(tau * (2640 - 420 * u) * t) * peak;
          return Math.max(-.94, Math.min(.94, click + rush + punch + hiss));
        }
        if (kind === 'butterflyCatch') {
          // Authentic balisong double-clack (tang lock + handle mate 18ms apart) + gloved palm thud + subtle T-latch clink!
          const c1 = Math.exp(-320 * t) * (.28 * (white - lp) + .22 * Math.sin(tau * 2680 * t) + .12 * Math.sin(tau * 4890 * t));
          const dt2 = t - .018;
          const c2 = dt2 > 0 ? Math.exp(-290 * dt2) * (.32 * (white - lp) + .26 * Math.sin(tau * 1840 * dt2) + .14 * Math.sin(tau * 3420 * dt2)) : 0;
          const palm = .34 * Math.sin(tau * (138 * t + .45 * (1 - Math.exp(-55 * t)))) * Math.exp(-42 * t);
          const dt3 = t - .044;
          const latch = dt3 > 0 ? .11 * Math.sin(tau * 3960 * dt3) * Math.exp(-140 * dt3) : 0;
          return Math.max(-.92, Math.min(.92, c1 + c2 + palm + latch));
        }
        if (kind === 'butterflyRicochet') {
          // Gloved knuckle bounce + crisp titanium spine ping
          const tap = .24 * Math.sin(tau * 320 * t) * Math.exp(-76 * t) + .22 * (white - lp) * Math.exp(-280 * t);
          const ring = (.18 * Math.sin(tau * 3560 * t) + .11 * Math.sin(tau * 5740 * t) + .06 * Math.sin(tau * 8120 * t)) * Math.exp(-52 * t);
          return Math.max(-.91, Math.min(.91, tap + ring));
        }
        if (kind === 'karambitSpin') {
          // CS2 Karambit curved-blade arc whoosh: silky Doppler sweep + glassy high-steel whisper
          const env = Math.sin(Math.PI * u) ** 1.55;
          const peak = Math.exp(-(((t - .044) / .030) ** 2));
          const air = (midBand * .27 + highBand * .25) * (.44 * env + .86 * peak) + .11 * lp * env;
          const glint = (.072 * Math.sin(tau * (3080 + 480 * u) * t) + .038 * Math.sin(tau * 4920 * t) + .018 * Math.sin(tau * 7140 * t)) * env * Math.exp(-24 * t);
          return Math.max(-.9, Math.min(.9, air + glint));
        }
        if (kind === 'karambitFlick') {
          // Agile wrist-flick whip + crisp finger-ring bearing micro-tick
          const env = Math.sin(Math.PI * u) ** 1.45;
          const peak = Math.exp(-(((t - .026) / .020) ** 2));
          const whip = (midBand * .26 + highBand * .28) * (.38 * env + .92 * peak);
          const ringTick = Math.exp(-360 * t) * (.14 * highBand + .12 * Math.sin(tau * 4180 * t));
          const shimmer = .058 * Math.sin(tau * 2760 * t) * Math.exp(-54 * t);
          return Math.max(-.9, Math.min(.9, whip + ringTick + shimmer));
        }
        if (kind === 'karambitRing') {
          // Hypnotic CS2 continuous finger-ring whir: silky air vortex + delicate crystalline steel hum
          const swell = Math.sin(Math.PI * u);
          const air = (midBand * .16 + highBand * .14) * swell * swell;
          const hum = (.068 * Math.sin(tau * 3320 * t) + .036 * Math.sin(tau * 5180 * t) + .018 * Math.sin(tau * 7360 * t)) * swell;
          return Math.max(-.84, Math.min(.84, air + hum));
        }
        if (kind === 'karambitCut') {
          // CS2 razor-talon slash: crisp early air-tear + tight wrist snap + curved-edge zip
          const peak = Math.exp(-(((t - .028) / .024) ** 2));
          const env = Math.sin(Math.PI * u) ** 1.4;
          const tear = (midBand * .38 + highBand * .36) * (.34 * env + .98 * peak);
          const snap = .22 * Math.sin(tau * (152 * t + .44 * (1 - Math.exp(-56 * t)))) * Math.exp(-44 * t);
          const edge = .10 * Math.exp(-52 * t) * (Math.sin(tau * 2480 * t) + .42 * Math.sin(tau * 4120 * t)) * (.5 + .5 * peak);
          return Math.max(-.94, Math.min(.94, tear + snap + edge));
        }
        if (kind === 'karambitCatch') {
          // Weighty CS2 Karambit palm-clamp catch: crisp metallic ring-stop + warm gloved palm thud
          const click = Math.exp(-310 * t) * (.30 * (white - lp) + .24 * Math.sin(tau * 2640 * t) + .12 * Math.sin(tau * 4420 * t));
          const palm = .36 * Math.sin(tau * (145 * t + .42 * (1 - Math.exp(-52 * t)))) * Math.exp(-44 * t);
          return Math.max(-.92, Math.min(.92, click + palm));
        }
        const contact = motion.asset === 'latch';
        const noise = (white - lp) * (contact ? .26 * Math.exp(-340 * t) : .25 * Math.sin(Math.PI * u));
        const phase = tau * motion.pitch * t;
        const metal = (Math.sin(phase) + .38 * Math.sin(phase * 1.87) + .16 * Math.sin(phase * 2.73)) * motion.ring * Math.exp(-54 * t);
        return Math.max(-.92, Math.min(.92, noise + metal));
      }
      if (kind === 'bladeGrip') {
        const butterfly = weapon === 'butterfly';
        const pitch = butterfly ? 3240 : 2510;
        const click = (.26 * (white - lp) + .16 * Math.sin(2 * Math.PI * pitch * t)) * Math.exp(-250 * t);
        const latchTime = t - .012;
        const latch = butterfly && latchTime > 0
          ? .20 * Math.sin(2 * Math.PI * 2050 * latchTime) * Math.exp(-200 * latchTime) : 0;
        const grip = .18 * Math.sin(2 * Math.PI * 155 * t) * Math.exp(-68 * t);
        return click + latch + grip;
      }
      if (kind === 'bladeFlesh') {
        // CS2 crisp knife flesh hit: punchy pitch-drop chest thump + snappy wet tear + subtle steel bite
        const tau = 2 * Math.PI;
        const base = weapon === 'butterfly' ? 132 : 116;
        const thud = .52 * Math.sin(tau * (base * t + .62 * (1 - Math.exp(-56 * t)))) * Math.exp(-38 * t);
        const tear = (midBand * .44 + highBand * .22) * Math.exp(-68 * t) + .34 * lp * Math.exp(-52 * t);
        const bite = .20 * highBand * Math.exp(-195 * t);
        const headTick = head ? (.20 * Math.sin(tau * 1560 * t) + .12 * Math.sin(tau * 3080 * t)) * Math.exp(-92 * t) : 0;
        return Math.max(-.95, Math.min(.95, thud + tear + bite + headTick));
      }
      if (kind === 'bladeWall') {
        // CS2 cold-steel wall/metal strike: sharp impact crack + staggered inharmonic steel spark ring
        const tau = 2 * Math.PI;
        const pitch = weapon === 'butterfly' ? 2480 : 2060;
        const strike = .34 * (white - lp) * Math.exp(-175 * t) + .14 * highBand * Math.exp(-48 * t);
        const ring = (.28 * Math.sin(tau * pitch * t) + .16 * Math.sin(tau * pitch * 1.57 * t) + .09 * Math.sin(tau * pitch * 2.38 * t)) * Math.exp(-30 * t);
        const knock = .22 * Math.sin(tau * 290 * t) * Math.exp(-62 * t);
        return Math.max(-.95, Math.min(.95, strike + ring + knock));
      }
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
      if (kind === 'equip' && isBlade) {
        // Signature crisp cold-steel unsheath & spin flourish per melee weapon.
        const whoosh = .26 * (white - lp) * Math.sin(Math.PI * Math.min(1, t / .16)) * Math.exp(-10 * t);
        if (weapon === 'nepal') {
          const ring = (.24 * Math.sin(6.28 * (1180 + 520 * t) * t) + .14 * Math.sin(6.28 * 2460 * t)) * Math.exp(-16 * t);
          return Math.max(-.9, Math.min(.9, whoosh * 1.15 + ring + .12 * lp * Math.exp(-14 * t)));
        }
        if (weapon === 'malay') {
          const shimmer = (.26 * Math.sin(6.28 * (2180 - 320 * t) * t) + .16 * Math.sin(6.28 * 3480 * t)) * Math.exp(-18 * t);
          return Math.max(-.9, Math.min(.9, whoosh * .9 + shimmer));
        }
        const snap = (.20 * Math.sin(6.28 * 1620 * t) + .18 * white * Math.exp(-120 * t)) * Math.exp(-22 * t);
        return Math.max(-.9, Math.min(.9, whoosh + snap));
      }
      if (kind === 'light' || kind === 'heavy' || kind === 'throw') {
        if (isBlade && kind !== 'throw') {
          const heavy = kind === 'heavy';
          const air = (heavy ? .58 : .42) * (weapon === 'malay' ? (white - lp) * .7 + lp * .5 : lp) * Math.sin(Math.PI * t / duration);
          const edgePitch = weapon === 'malay' ? 2350 : weapon === 'nepal' ? 1120 : 1580;
          const steel = (heavy ? .18 : .11) * Math.sin(6.28 * edgePitch * t) * Math.exp(-24 * t);
          return Math.max(-.9, Math.min(.9, air + steel));
        }
        return lp * Math.sin(Math.PI * t / duration) * .47;
      }
      const click = Math.exp(-68 * t) + (kind === 'reload' ? Math.exp(-76 * Math.abs(t - .26)) : 0);
      return click * (.3 * white + .15 * Math.sin(6.28 * (kind === 'bounce' ? 560 : 970) * t));
    });
    return samples[key];
  }

  const prewarmQueue = [
    ...Object.keys(bayonetSounds).map(kind=>()=>sampleFor(kind,'m9')),
    () => sampleFor('m9Flesh','m9',true),
    ...['knife','nepal','malay'].flatMap(id=>[
      ...classicCueNames.map(kind=>()=>sampleFor(kind,id)),
      ()=>sampleFor('classicFlesh',id,true)
    ]),
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
    () => sampleFor('equip', 'nepal'), () => sampleFor('equip', 'malay'), () => sampleFor('equip', 'knife'),
    () => sampleFor('light', 'nepal'), () => sampleFor('heavy', 'nepal'),
    ...Object.keys(bladeMotionSounds).map(kind => () => sampleFor(kind, kind.startsWith('karambit') ? 'karambit' : 'butterfly')),
    ...['karambit', 'butterfly'].flatMap(weapon => [
      ...Object.keys(bladeFeedbackDurations).map(kind => () => sampleFor(kind, weapon)),
      () => sampleFor('bladeFlesh', weapon, true)
    ]),
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
      for (const [asset, url] of Object.entries(butterflyAssets)) {
        fetch(url)
          .then(response => response.ok ? response.arrayBuffer() : null)
          .then(data => data && context.decodeAudioData(data))
          .then(buffer => { if (buffer) samples[asset] = buffer; })
          .catch(() => {}); // The synthesized layer remains available if the asset cannot be loaded.
      }
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

  function play(buffer, level = 1, pan = 0, offset = 0, rate = 1) {
    if (!enabled || context?.state !== 'running' || !buffer) return;
    if (level < .025) return;
    if (playing.size >= 40 && level < .35) return;
    const source = context.createBufferSource();
    source.buffer = buffer;
    if (rate !== 1) source.playbackRate.value = rate;
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
    source.start(0, offset);
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
      const weapon = isMelee(opts.weapon) || opts.weapon === 'he' ? opts.weapon : '';
      const first = !!opts.first;
      const key = 'kill_' + (head ? 'h' : 'b') + '_' + multi + '_' + weapon + '_' + (first ? 'f' : '');
      if (!samples[key]) samples[key] = cfKillSound(head, multi, weapon, first);
      play(samples[key], head || multi > 1 || first ? .95 : .82, 0);
    }
  }

  function sfx({kind, weapon = '', volume: level = 1, pan = 0, head = false}) {
    if (!enabled || !samples) return;
    if (level < .025) return;
    const spread = Math.max(-1, Math.min(1, pan));
    const motion = bladeMotionSounds[kind] || bayonetLayers[kind] || classicLayers[kind];
    const varied = motion || bladeFeedbackDurations[kind] || Object.hasOwn(bayonetSounds,kind) || classicCueNames.includes(kind);
    const rate = varied ? .965 + Math.random() * .075 : 1;
    if (motion) play(samples[motion.asset], level * motion.mix, spread, motion.offset, rate);
    play(sampleFor(kind, weapon, head), level, spread, 0, rate);
  }

  function setVolume(v) {
    volume = Math.max(0, Math.min(1, v));
    if (master) master.gain.value = volume;
  }

  return {enable, prime, step, cue, reset, sfx, setVolume};
}
