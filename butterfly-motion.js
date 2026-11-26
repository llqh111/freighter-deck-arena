// CS-style Butterfly Knife keyframe motion.
// Each row: [t, wristX, wristY, wristZ, wristPitch, wristYaw, wristRoll,
//            bladeX, gripX, flipX, spinX, spinY, spinZ, soundCue?]
const CHANNELS = 12;
const rest = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
const TAU = Math.PI * 2;

const clips = {
  // Iconic CS standard draw: rapid flip-out, wrist flick, double-clack lock into palm.
  draw: [
    [0.000,  .055, -.240,  .060, -.52,  .10, -.26,  3.06,  .08,  .06,  0.00,  0.00,  0.00],
    [0.085,  .025, -.085,  .022, -.22, -.18, -.58,  2.42,  .22, 1.85, -1.05, -.18,  .42, 'butterflyAir'],
    [0.185, -.035,  .028, -.026,  .18, -.36, -.82,  1.28, -.12, 2.78, -2.55, -.25,  .62, 'butterflyTick'],
    [0.295, -.075,  .068, -.052,  .34, -.12,  .22, -.16,  .24, 1.48, -4.45,  .16,  .18, 'butterflySpin'],
    [0.415, -.045,  .032, -.020,  .14,  .14,  .34,  .06, -.05, -.10, -6.18,  .06, -.10, 'butterflyTick'],
    [0.505,  .008, -.016,  .010, -.08,  .04, -.10,  .00,  .00,  .04, -TAU,   .00,  .02, 'butterflyCatch'],
    [0.640,  .002, -.004,  .003, -.02,  .01, -.03,  .00,  .00,  .00, -TAU,   .00,  .00],
    [0.760,  0, 0, 0, 0, 0, 0, 0, 0, 0, -TAU, 0, 0]
  ],

  // CS rare draw: vertical aerial 360 spin-catch with handles fanned wide.
  rareDraw: [
    [0.000,  .050, -.235,  .055, -.48,  .08, -.22,  3.05,  .10,  .08,  0.00,  0.00,  0.00],
    [0.105, -.015, -.030,  .005,  .10, -.22, -.45,  2.10, 1.15, 2.25, -1.60, -.24,  .52, 'butterflyAir'],
    [0.230, -.068,  .088, -.048,  .36, -.32, -.72,  1.10, 1.85, 2.68, -3.40,  .12,  .74, 'butterflySpin'],
    [0.370, -.082,  .108, -.058,  .42,  .18,  .28,  .35,  .95, 1.95, -5.05,  .30,  .24, 'butterflyTick'],
    [0.510, -.048,  .045, -.025,  .20,  .22,  .38, -.08,  .12, -.12, -6.18,  .08, -.12, 'butterflyCatch'],
    [0.620,  .012, -.022,  .012, -.10,  .05, -.12,  .00,  .00,  .05, -TAU,   .00,  .03],
    [0.770,  .003, -.005,  .003, -.02,  .01, -.03,  .00,  .00,  .00, -TAU,   .00,  .00],
    [0.900,  0, 0, 0, 0, 0, 0, 0, 0, 0, -TAU, 0, 0]
  ],

  // CS normal inspect: thumb rollover twirl + tilted blade admiration hold.
  inspect: [
    rest,
    [0.130, -.082,  .062, -.062,  .14, -.22, -.38,  .24,  .14, 1.10,  0.75, -.20,  .30, 'butterflyAir'],
    [0.275, -.155,  .105, -.095,  .36, -.36, -.74,  1.62, -.18, 2.52,  2.35, -.32,  .62, 'butterflyTick'],
    [0.425, -.148,  .124, -.108,  .40,  .18,  .18,  2.28,  .32, 1.24,  4.10,  .24,  .20, 'butterflySpin'],
    [0.575, -.125,  .112, -.104,  .22,  .52,  .46,  .88, -.14, 1.78,  5.55,  .34, -.18, 'butterflyTick'],
    [0.720, -.112,  .094, -.098,  .30,  .34,  .24,  .02,  .00, -.10,  6.20, -.18, -.08, 'butterflyCatch'],
    // Admire curved blade & cutout in light
    [0.980, -.110,  .092, -.096,  .34,  .38,  .20,  .00,  .00,  .00,  TAU,  -.26, -.05],
    [1.240, -.095,  .078, -.086,  .28,  .32,  .12,  .00,  .00,  .00,  TAU,  -.16, -.02],
    [1.420, -.042,  .032, -.040,  .12,  .14,  .04,  .00,  .00,  .00,  TAU,  -.05,  .00],
    [1.560,  0, 0, 0, 0, 0, 0, 0, 0, 0, TAU, 0, 0]
  ],

  // CS rare inspect: continuous rapid multi-revolution finger spin!
  rareInspect: [
    rest,
    [0.140, -.105,  .078, -.074,  .20,  .26,  .36,  .38,  .28, 1.45, -1.25,  .18, -.28, 'butterflyAir'],
    [0.290, -.162,  .118, -.098,  .42,  .46,  .72,  1.88, 1.45, 2.65, -3.45,  .24, -.54, 'butterflySpin'],
    [0.460, -.168,  .128, -.104,  .46,  .08,  .22,  2.35, 1.65, 2.50, -6.28, -.12, -.30, 'butterflyTick'],
    [0.640, -.166,  .128, -.104,  .44, -.28, -.58,  1.95, 1.55, 2.58, -9.42, -.26,  .38, 'butterflySpin'],
    [0.820, -.152,  .116, -.100,  .34, -.36, -.66,  1.05,  .72, 1.80, -11.65, -.14,  .48, 'butterflyTick'],
    [0.980, -.124,  .095, -.096,  .26, -.16, -.22, -.06,  .00, -.12, -12.48,  .06, -.10, 'butterflyCatch'],
    [1.220, -.110,  .086, -.094,  .32, -.14, -.12,  .00,  .00,  .00, -TAU*2,  .08, -.04],
    [1.480, -.058,  .042, -.052,  .16, -.06, -.05,  .00,  .00,  .00, -TAU*2,  .03,  .00],
    [1.680,  0, 0, 0, 0, 0, 0, 0, 0, 0, -TAU*2, 0, 0]
  ],

  // CS F-R-F-R fidget flip A (forward snap spin)
  fidgetA: [
    rest,
    [0.075, -.036,  .046, -.032,  .22, -.20, -.46,  .32,  .18, 1.42, -1.55, -.16,  .36, 'butterflyAir'],
    [0.165, -.074,  .072, -.046,  .38, -.38, -.78,  1.72, -.16, 2.56, -3.65, -.12,  .56, 'butterflySpin'],
    [0.260, -.068,  .060, -.040,  .20, -.48, -.18,  1.02,  .24, 1.32, -5.45,  .18,  .18, 'butterflyTick'],
    [0.345, -.026,  .020, -.014,  .08, -.14,  .28,  .02, -.04, -.12, -6.20,  .04, -.08, 'butterflyCatch'],
    [0.415,  .008, -.010,  .008, -.06,  .04, -.08,  .00,  .00,  .03, -TAU,   .00,  .02],
    [0.485,  0, 0, 0, 0, 0, 0, 0, 0, 0, -TAU, 0, 0]
  ],

  // CS F-R-F-R fidget flip B (reverse wrist rollover)
  fidgetB: [
    rest,
    [0.075, -.042,  .048, -.034,  .20,  .24,  .42,  .36,  .22, 1.38,  1.65,  .18, -.34, 'butterflyAir'],
    [0.168, -.082,  .076, -.050,  .40,  .44,  .76,  1.84,  .30, 2.52,  3.75,  .10, -.52, 'butterflyTick'],
    [0.265, -.066,  .058, -.038,  .24, -.10,  .16,  .96, -.16, 1.28,  5.50, -.16, -.14, 'butterflySpin'],
    [0.350, -.024,  .018, -.012,  .08,  .12, -.26, -.04,  .02, -.10,  6.20, -.04,  .08, 'butterflyCatch'],
    [0.420,  .006, -.008,  .006, -.05, -.04,  .07,  .00,  .00,  .02,  TAU,   .00, -.02],
    [0.490,  0, 0, 0, 0, 0, 0, 0, 0, 0, TAU, 0, 0]
  ],

  // Light slash 1: crisp CS right-to-left diagonal slash
  light1: [
    rest,
    [0.036,  .056,  .024,  .028, -.18,  .24,  .22,  0, 0,  .08,  0,  .10,  .14],
    [0.088, -.158,  .038, -.112,  .15, -.94, -.72,  0, 0,  .16,  0, -.28, -.34, 'butterflySlash'],
    [0.148, -.204, -.026, -.076,  .32, -1.04, -.84, 0, 0,  .06,  0, -.32, -.42],
    [0.236, -.062, -.028,  .010,  .12, -.38, -.24,  0, 0,  .00,  0, -.08, -.10],
    [0.320, ...rest.slice(1)]
  ],

  // Light slash 2: crisp CS left-to-right backhand slash
  light2: [
    rest,
    [0.038, -.092,  .018,  .018, -.14, -.46, -.44,  0, 0,  .10,  0, -.22, -.24],
    [0.092,  .094,  .034, -.102,  .12,  .68,  .56,  0, 0,  .18,  0,  .32,  .38, 'butterflySlash'],
    [0.152,  .126, -.018, -.062,  .24,  .78,  .66,  0, 0,  .05,  0,  .26,  .30],
    [0.240,  .038, -.020,  .008,  .10,  .28,  .20,  0, 0,  .00,  0,  .08,  .08],
    [0.324, ...rest.slice(1)]
  ],

  // Heavy attack: quick tactical re-grip snap + decisive center forward stab
  heavy: [
    rest,
    [0.062,  .044, -.042,  .064, -.22,  .38,  .34,  .12, 0,  .46, -.28,  .16,  .22, 'butterflyTick'],
    [0.132, -.062,  .040, -.184,  .10, -.22, -.36,  .00, 0,  .00,  .10, -.12, -.38, 'butterflyThrust'],
    [0.214, -.108,  .056, -.258,  .22, -.46, -.54,  .00, 0,  .00,  .18, -.18, -.46],
    [0.305, -.088,  .040, -.202,  .20, -.26, -.36,  .00, 0,  .00,  .10, -.10, -.28],
    [0.440, -.022, -.024, -.048, -.02, -.14, -.12,  .00, 0,  .00,  .02, -.04, -.08],
    [0.640, ...rest.slice(1)]
  ]
};

// Carry momentum through a waypoint unless a channel changes direction there.
function tangent(a, b, c, channel) {
  if (!a || !c) return 0;
  const incoming = (b[channel] - a[channel]) / (b[0] - a[0]);
  const outgoing = (c[channel] - b[channel]) / (c[0] - b[0]);
  return incoming * outgoing > 0 ? 2 * incoming * outgoing / (incoming + outgoing) : 0;
}

const wrapTau = a => ((a + Math.PI) % TAU + TAU) % TAU - Math.PI;

export function createButterflyMotion(emit) {
  const pose = new Float32Array(CHANNELS);
  const previousPose = new Float32Array(CHANNELS);
  let clip, clipName = '', time = 0, section = 0, blend = 0;
  let inspectAlt = false, fidgetAlt = false, lightAlt = false, inspectQueued = false;

  function begin(name, blendSeconds = 0) {
    // Normalize continuous spin channels modulo 2π before blending so transitions never unwind.
    for (let i = 0; i < CHANNELS; i++) {
      previousPose[i] = i >= 9 ? wrapTau(pose[i]) : pose[i];
    }
    clip = clips[name];
    clipName = name;
    time = section = 0;
    blend = blendSeconds;
    inspectQueued = false;
    if (!blend) pose.set(clip[0].slice(1, CHANNELS + 1));
  }

  function update(dt) {
    if (!clip) return;
    time += dt;
    while (section + 1 < clip.length && time >= clip[section + 1][0]) {
      const cue = clip[++section][CHANNELS + 1];
      if (cue) emit(cue);
    }
    const left = clip[section], right = clip[section + 1];
    if (!right) {
      const startInspect = inspectQueued;
      reset();
      if (startInspect) inspect();
      return;
    }
    const interval = right[0] - left[0], t = (time - left[0]) / interval;
    const t2 = t * t, t3 = t2 * t;
    const blendWeight = blend ? Math.min(1, time / blend) : 1;
    for (let i = 1; i <= CHANNELS; i++) {
      const startVelocity = tangent(clip[section - 1], left, right, i) * interval;
      const endVelocity = tangent(left, right, clip[section + 2], i) * interval;
      const next = (2 * t3 - 3 * t2 + 1) * left[i] + (t3 - 2 * t2 + t) * startVelocity +
        (-2 * t3 + 3 * t2) * right[i] + (t3 - t2) * endVelocity;
      pose[i - 1] = previousPose[i - 1] * (1 - blendWeight) + next * blendWeight;
    }
  }

  function reset() {
    clip = undefined;
    clipName = '';
    inspectQueued = false;
    pose.fill(0);
  }

  function draw() {
    begin(Math.random() < .35 ? 'rareDraw' : 'draw');
  }

  function inspect() {
    if (clipName === 'draw' || clipName === 'rareDraw') {
      if (time < .28) { inspectQueued = true; return; }
      // Mid-draw inspect cancel -> smooth CS fidget chain!
      fidget();
      return;
    }
    if (clipName === 'light1' || clipName === 'light2' || clipName === 'heavy') {
      if (time < .18) return;
    }
    if (clip) {
      // Pressing F/Y again mid-inspect chains into endless CS fidget spin!
      if (time >= .18) fidget();
      return;
    }
    const rare = inspectAlt || Math.random() < .32;
    begin(rare ? 'rareInspect' : 'inspect', .04);
    inspectAlt = !inspectAlt;
  }

  function fidget() {
    if ((clipName === 'light1' || clipName === 'light2' || clipName === 'heavy') && time < .16) return;
    if (clip && time < .16) return;
    begin(fidgetAlt ? 'fidgetB' : 'fidgetA', .05);
    fidgetAlt = !fidgetAlt;
  }

  function attack(kind) {
    if (kind === 'heavy') {
      begin('heavy', .045);
    } else {
      begin(lightAlt ? 'light2' : 'light1', .04);
      lightAlt = !lightAlt;
    }
  }

  return {
    pose, update, reset, draw, inspect, fidget, attack,
    flourish() { fidget(); }
  };
}
