// Physically grounded Butterfly Knife (Balisong) motion & C1 spring-inertialized state machine.
// Channels (18):
//  0..2 : wristX, wristY, wristZ
//  3..5 : wristPitch, wristYaw, wristRoll
//  6    : safeAngle  (0 = open locked, +pi = closed into safe channel)
//  7    : biteAngle  (0 = open locked, +pi = closed into bite channel)
//  8..10: spinX, spinY, spinZ (whole-knife rotation around dynamic fulcrum)
//  11   : pivotMode  (0 = grip, 1 = thumb barrel, 2 = index V-choil Chaplin, 3 = CoM aerial)
//  12   : knifeLift  (upward release out of palm during aerials)
//  13   : thumbPose  (0 = wrapped grip, 1 = thumb fulcrum post, -0.4 = pinch)
//  14   : indexCurl  (1 = wrapped grip, 0.15 = open clear, -0.42 = straight Chaplin bar)
//  15   : lowerCurl  (1 = clenched grip, 0.08 = wide open clear of swinging bite handle)
//  16   : leftPose   (0 = tucked below frame, 0.5 = peripheral balance, 1.0 = close tactical guard)
//  17   : camKick    (viewmodel-only tactile micro-impulse)

const CHANNELS = 18;
const PI = Math.PI;
const TAU = PI * 2;
const ROT_MASK = new Uint8Array([0, 0, 0, 1, 1, 1, 0, 0, 1, 1, 1, 0, 0, 0, 0, 0, 0, 0]);

function kf(t, w, j, s, h = {}, cue = '') {
  const row = new Float64Array(CHANNELS + 1);
  row[0] = t;
  row[1] = w[0]; row[2] = w[1]; row[3] = w[2];
  row[4] = w[3]; row[5] = w[4]; row[6] = w[5];
  row[7] = j[0]; row[8] = j[1];
  row[9] = s[0]; row[10] = s[1]; row[11] = s[2];
  row[12] = h.piv ?? 0;
  row[13] = h.lift ?? 0;
  row[14] = h.thumb ?? 0;
  row[15] = h.idx ?? 1;
  row[16] = h.low ?? 1;
  row[17] = h.left ?? 0;
  row[18] = h.kick ?? 0;
  row.cue = cue;
  return row;
}

const IDLE = kf(0, [0, 0, 0, 0, 0, 0], [0, 0], [0, 0, 0], {piv: 0, lift: 0, thumb: 0, idx: 1, low: 1, left: 0, kick: 0});

export const butterflyContactTime = {light: 0.090, heavy: 0.138};
const drawCatchTimes = {draw: 0.468, rareDraw: 0.475};
const quickGripTime = 0.028;

const clips = {
  // Signature Zen Rollover Quick-Draw (0.68s): crisp upward whip from closed, thumb rollover, double-clack palm lock.
  draw: [
    kf(0.000, [ .048, -.215,  .055, -.54, -.08, -.32], [3.06, 3.06], [ 0.00,  .00,  .00], {piv: 0, thumb:  .35, idx:  .35, low:  .22, left:  .00}),
    kf(0.078, [ .016, -.058,  .014, -.12, -.24, -.58], [2.15, 2.88], [-0.92, -.16,  .28], {piv: 1, thumb:  .92, idx:  .22, low:  .08, left:  .16}, 'butterflyAir'),
    kf(0.172, [-.032,  .032, -.022,  .22, -.38, -.76], [1.18, 2.38], [-2.58, -.24,  .52], {piv: 1, thumb: 1.00, idx:  .18, low:  .06, left:  .24}, 'butterflyTick'),
    kf(0.285, [-.056,  .054, -.036,  .30, -.12,  .18], [0.24, 1.32], [-4.52,  .14,  .22], {piv: 1, thumb:  .78, idx:  .32, low:  .10, left:  .18}, 'butterflySpin'),
    kf(0.395, [-.024,  .018, -.014,  .10,  .12,  .28], [0.02, 0.22], [-6.08,  .06, -.06], {piv: 0, thumb:  .20, idx:  .78, low:  .42, left:  .08}, 'butterflyTick'),
    kf(drawCatchTimes.draw, [ .010, -.020,  .010, -.11,  .05, -.12], [0.00, 0.00], [-TAU,   .00,  .03], {piv: 0, thumb: -.08, idx: 1.08, low: 1.08, left:  .02, kick:  .85}),
    kf(0.575, [-.002,  .004, -.002,  .03, -.01,  .03], [0.00, 0.00], [-TAU,   .00, -.01], {piv: 0, thumb:  .00, idx: 1.00, low: 1.00, left:  .00, kick: -.18}),
    kf(0.680, [0, 0, 0, 0, 0, 0], [0, 0], [-TAU, 0, 0], {piv: 0, thumb: 0, idx: 1, low: 1, left: 0, kick: 0})
  ],

  // Rare Parabolic Icepick Aerial Draw (0.86s): flick launch out of palm, 360° CoM mid-air fan-spin, heavy catch.
  rareDraw: [
    kf(0.000, [ .042, -.210,  .048, -.46, -.04, -.24], [3.06, 3.06], [ 0.00,  .00,  .00], {piv: 0, lift: .000, thumb:  .30, idx:  .35, low:  .25, left: .00}),
    kf(0.095, [-.008, -.018,  .004,  .16, -.18, -.38], [1.92, 2.65], [-1.35, -.20,  .38], {piv: 3, lift: .028, thumb:  .88, idx:  .22, low:  .10, left: .22}, 'butterflyAir'),
    kf(0.225, [-.044,  .036, -.028,  .28, -.22, -.28], [0.78, 1.82], [-3.35,  .16,  .64], {piv: 3, lift: .078, thumb:  .95, idx:  .14, low:  .06, left: .36}, 'butterflySpin'),
    kf(0.355, [-.050,  .028, -.030,  .22,  .08,  .14], [0.16, 0.72], [-5.18,  .22,  .28], {piv: 3, lift: .052, thumb:  .82, idx:  .20, low:  .08, left: .28}, 'butterflyTick'),
    kf(drawCatchTimes.rareDraw, [ .006, -.028,  .014, -.16,  .08, -.16], [0.00, 0.00], [-TAU,   .00,  .04], {piv: 0, lift: .000, thumb: -.12, idx: 1.10, low: 1.12, left: .10, kick: 1.15}),
    kf(0.585, [-.006,  .007, -.004,  .05, -.02,  .05], [0.00, 0.00], [-TAU,   .00, -.02], {piv: 0, lift: .000, thumb:  .02, idx: 1.01, low: 1.02, left: .03, kick: -.25}),
    kf(0.725, [ .001, -.002,  .001, -.01,  .00, -.01], [0.00, 0.00], [-TAU,   .00,  .00], {piv: 0, lift: .000, thumb:  .00, idx: 1.00, low: 1.00, left: .00, kick:  .00}),
    kf(0.860, [0, 0, 0, 0, 0, 0], [0, 0], [-TAU, 0, 0], {piv: 0, lift: 0, thumb: 0, idx: 1, low: 1, left: 0, kick: 0})
  ],

  // Standard Inspect (2.22s): Y2K thumb rollover -> multi-angle hollow-grind light sweep -> index-pinch twirl reset.
  inspect: [
    IDLE,
    kf(0.075, [ .012, -.018,  .008, -.08,  .06,  .10], [0.08, 0.22], [ 0.12,  .04, -.06], {piv: 0, thumb:  .45, idx:  .55, low:  .35, left: .05}),
    kf(0.195, [-.048,  .042, -.038,  .18, -.22, -.44], [1.45, 2.18], [ 1.68, -.22,  .34], {piv: 1, thumb: 1.00, idx:  .18, low:  .06, left: .24}, 'butterflyAir'),
    kf(0.340, [-.086,  .074, -.062,  .34, -.12, -.22], [1.96, 1.42], [ 3.82, -.14,  .52], {piv: 1, thumb: 1.00, idx:  .16, low:  .06, left: .36}, 'butterflySpin'),
    kf(0.475, [-.078,  .066, -.058,  .22,  .24,  .28], [0.42, 0.88], [ 5.62,  .18, -.14], {piv: 1, thumb:  .58, idx:  .45, low:  .22, left: .42}, 'butterflyTick'),
    kf(0.585, [-.068,  .054, -.052,  .26,  .32,  .22], [0.00, 0.00], [ TAU,  -.16, -.06], {piv: 0, thumb: -.05, idx: 1.05, low: 1.06, left: .46, kick: .65}),
    // Slow cold-steel bevel light sweep: glides overhead key-light down the hollow-ground ridge to needle tip
    // Push-in beat: blade glides 36mm toward the lens while the bevelled ridge rolls over, then eases back.
    kf(0.960, [-.074,  .076, -.020,  .32,  .42,  .30], [0.00, 0.00], [ TAU,  -.34, -.10], {piv: 0, thumb:  .04, idx:  .98, low:  .98, left: .52}, 'butterflySheen'),
    kf(1.380, [-.064,  .056, -.050,  .18, -.14, -.26], [0.00, 0.00], [ TAU,   .24,  .14], {piv: 0, thumb:  .10, idx:  .94, low:  .95, left: .40}, 'butterflySheen'),
    // Crisp index-pinch fan snap back to guard
    kf(1.640, [-.048,  .044, -.036,  .24, -.22, -.34], [0.92, 1.48], [ TAU,   .08,  2.45], {piv: 0, thumb: -.32, idx:  .42, low:  .10, left: .24}, 'butterflySpin'),
    kf(1.860, [-.016,  .012, -.010,  .06,  .08,  .14], [0.04, 0.14], [ TAU,   .02,  TAU],  {piv: 0, thumb:  .12, idx:  .88, low:  .72, left: .10}, 'butterflyTick'),
    kf(1.980, [ .006, -.010,  .006, -.06,  .03, -.06], [0.00, 0.00], [ TAU,   .00,  TAU],  {piv: 0, thumb: -.04, idx: 1.04, low: 1.05, left: .02, kick: .48}),
    kf(2.220, [0, 0, 0, 0, 0, 0], [0, 0], [TAU, 0, TAU], {piv: 0, thumb: 0, idx: 1, low: 1, left: 0, kick: 0})
  ],

  // Grandmaster Rare Inspect (2.72s): Whip -> 720° Index Finger Chaplin -> Longitudinal Helicopter Fan -> Knuckle Ricochet -> Lock!
  rareInspect: [
    IDLE,
    kf(0.115, [-.042,  .038, -.032,  .16,  .18,  .28], [0.88, 1.72], [-0.85,  .14, -.22], {piv: 1, thumb:  .82, idx:  .28, low:  .12, left: .18}, 'butterflyAir'),
    kf(0.265, [-.078,  .068, -.058,  .30,  .24,  .42], [1.62, 0.24], [-2.45,  .18, -.18], {piv: 2, thumb:  .92, idx: -.42, low:  .06, left: .38}, 'butterflyTick'),
    // 720° high-speed Chaplin orbiting around extended index finger inside the V-choil!
    kf(0.545, [-.088,  .078, -.064,  .36,  .08,  .18], [1.66, 0.18], [-6.28,  .06, -.08], {piv: 2, thumb:  .95, idx: -.45, low:  .05, left: .52}, 'butterflySpin'),
    kf(0.835, [-.086,  .076, -.062,  .34, -.14, -.24], [1.60, 0.22], [-10.4, -.08,  .10], {piv: 2, thumb:  .92, idx: -.42, low:  .05, left: .56}, 'butterflySpin'),
    kf(1.060, [-.076,  .066, -.054,  .26, -.24, -.36], [1.34, 0.68], [-TAU*2,-.12,  .45], {piv: 0, thumb: -.34, idx:  .38, low:  .08, left: .48}, 'butterflyTick'),
    // Longitudinal Safe-Handle Helicopter Fanning (spinZ whirl!)
    kf(1.340, [-.068,  .058, -.048,  .22, -.16, -.48], [1.38, 0.82], [-TAU*2, .10,  3.65], {piv: 0, thumb: -.38, idx:  .42, low:  .08, left: .44}, 'butterflySpin'),
    kf(1.610, [-.062,  .052, -.044,  .28,  .18,  .26], [1.95, 1.55], [-TAU*2, .16,  TAU],  {piv: 1, thumb:  .88, idx: -.20, low:  .10, left: .38}, 'butterflyRicochet'),
    // Ricochet reversal off back of index knuckle straight into snap catch!
    kf(1.835, [-.044,  .036, -.030,  .16,  .28,  .34], [0.48, 0.92], [-10.2,  .10,  TAU],  {piv: 1, thumb:  .52, idx:  .44, low:  .22, left: .26}, 'butterflySpin'),
    kf(2.020, [ .008, -.018,  .010, -.12,  .08, -.14], [0.00, 0.00], [-TAU,   .00,  TAU],  {piv: 0, thumb: -.10, idx: 1.08, low: 1.10, left: .14, kick: .95}),
    // Brief poised admiration gleam & smooth settle
    kf(2.360, [-.032,  .026, -.024,  .16,  .20,  .12], [0.00, 0.00], [-TAU,  -.12,  TAU],  {piv: 0, thumb:  .00, idx: 1.00, low: 1.00, left: .08, kick: -.16}, 'butterflySheen'),
    kf(2.720, [0, 0, 0, 0, 0, 0], [0, 0], [-TAU, 0, TAU], {piv: 0, thumb: 0, idx: 1, low: 1, left: 0, kick: 0})
  ],

  // Fidget Combo 1 (0.46s): Crisp Forward Zen Rollover (elevated into clear 16:9 showcase zone)
  fidget1: [
    IDLE,
    kf(0.072, [-.032,  .052, -.024,  .20, -.18, -.42], [0.95, 1.78], [-1.52, -.14,  .30], {piv: 1, thumb:  .95, idx:  .20, low:  .06, left: .08}, 'butterflyAir'),
    kf(0.165, [-.064,  .076, -.040,  .34, -.32, -.66], [1.78, 2.42], [-3.68, -.12,  .48], {piv: 1, thumb: 1.00, idx:  .16, low:  .05, left: .14}, 'butterflySpin'),
    kf(0.262, [-.052,  .058, -.032,  .18, -.28, -.12], [0.68, 1.18], [-5.48,  .14,  .14], {piv: 1, thumb:  .55, idx:  .42, low:  .18, left: .10}, 'butterflyTick'),
    kf(0.342, [ .008, -.012,  .008, -.08,  .05, -.10], [0.00, 0.00], [-TAU,   .00,  .02], {piv: 0, thumb: -.08, idx: 1.06, low: 1.08, left: .02, kick: .62}),
    kf(0.460, [0, 0, 0, 0, 0, 0], [0, 0], [-TAU, 0, 0], {piv: 0, thumb: 0, idx: 1, low: 1, left: 0, kick: 0})
  ],

  // Fidget Combo 2 (0.47s): Reverse Wrist Figure-8 Rollover
  fidget2: [
    IDLE,
    kf(0.074, [-.036,  .054, -.026,  .18,  .22,  .38], [0.92, 1.68], [ 1.58,  .16, -.28], {piv: 1, thumb:  .92, idx:  .22, low:  .06, left: .10}, 'butterflyAir'),
    kf(0.168, [-.068,  .078, -.044,  .36,  .38,  .64], [1.82, 2.36], [ 3.74,  .10, -.46], {piv: 1, thumb: 1.00, idx:  .18, low:  .05, left: .16}, 'butterflyTick'),
    kf(0.268, [-.048,  .056, -.030,  .20, -.08,  .14], [0.62, 1.12], [ 5.52, -.14, -.12], {piv: 1, thumb:  .52, idx:  .45, low:  .20, left: .10}, 'butterflySpin'),
    kf(0.352, [ .006, -.010,  .007, -.07, -.04,  .09], [0.00, 0.00], [ TAU,   .00, -.02], {piv: 0, thumb: -.06, idx: 1.06, low: 1.07, left: .02, kick: .60}),
    kf(0.470, [0, 0, 0, 0, 0, 0], [0, 0], [TAU, 0, 0], {piv: 0, thumb: 0, idx: 1, low: 1, left: 0, kick: 0})
  ],

  // Fidget Combo 3 (0.54s): Expressive 360° Index Chaplin + Mini-Fan Snap
  fidget3: [
    IDLE,
    kf(0.075, [-.042,  .058, -.030,  .22,  .14,  .24], [1.55, 0.25], [-1.35,  .10,  .42], {piv: 2, thumb:  .90, idx: -.42, low:  .06, left: .16}, 'butterflyAir'),
    kf(0.195, [-.074,  .084, -.048,  .34, -.12, -.22], [1.62, 0.18], [-4.15, -.08,  2.10], {piv: 2, thumb:  .94, idx: -.44, low:  .05, left: .24}, 'butterflySpin'),
    kf(0.315, [-.056,  .060, -.036,  .22, -.22, -.30], [0.75, 1.05], [-5.68,  .08,  5.35], {piv: 0, thumb: -.28, idx:  .42, low:  .14, left: .16}, 'butterflyTick'),
    kf(0.405, [ .009, -.014,  .009, -.09,  .05, -.11], [0.00, 0.00], [-TAU,   .00,  TAU],  {piv: 0, thumb: -.08, idx: 1.08, low: 1.09, left: .04, kick: .75}),
    kf(0.540, [0, 0, 0, 0, 0, 0], [0, 0], [-TAU, 0, TAU], {piv: 0, thumb: 0, idx: 1, low: 1, left: 0, kick: 0})
  ],

  // Fidget Combo 4 (0.56s): Mini Parabolic Finger-Pop Aerial Finisher!
  fidget4: [
    IDLE,
    kf(0.078, [-.024,  .032, -.018,  .14, -.12, -.24], [0.96, 1.54], [-1.20, -.12,  .26], {piv: 3, lift: .018, thumb:  .86, idx:  .24, low:  .08, left: .14}, 'butterflyAir'),
    kf(0.195, [-.052,  .064, -.036,  .26, -.16, -.18], [0.58, 1.28], [-3.45,  .14,  .48], {piv: 3, lift: .058, thumb:  .92, idx:  .16, low:  .06, left: .26}, 'butterflySpin'),
    kf(0.315, [-.044,  .046, -.028,  .18,  .10,  .16], [0.14, 0.48], [-5.35,  .12,  .18], {piv: 3, lift: .034, thumb:  .72, idx:  .28, low:  .12, left: .18}, 'butterflyTick'),
    kf(0.415, [ .010, -.020,  .012, -.12,  .06, -.13], [0.00, 0.00], [-TAU,   .00,  .02], {piv: 0, lift: .000, thumb: -.10, idx: 1.09, low: 1.10, left: .06, kick: .92}),
    kf(0.560, [0, 0, 0, 0, 0, 0], [0, 0], [-TAU, 0, 0], {piv: 0, lift: 0, thumb: 0, idx: 1, low: 1, left: 0, kick: 0})
  ],

  // Light Slash 1 (0.33s): coiled forehand diagonal razor sweep (upper-right -> lower-left)
  light1: [
    IDLE,
    kf(0.034, [ .054,  .032,  .030, -.20,  .28,  .26], [0.00, 0.04], [0,  .08,  .10], {thumb: -.12, idx: 1.06, low: 1.06, left: .18}),
    kf(butterflyContactTime.light, [-.162,  .024, -.118,  .14, -.92, -.76], [0.00, 0.10], [0, -.26, -.28], {thumb: -.15, idx: 1.10, low: 1.10, left: .36, kick: .75}, 'butterflySlash'),
    kf(0.148, [-.212, -.038, -.082,  .30, -1.08, -.88],[0.00, 0.03], [0, -.30, -.36], {thumb: -.10, idx: 1.06, low: 1.06, left: .28, kick: -.22}),
    kf(0.238, [-.058, -.024,  .008,  .10, -.34, -.22], [0.00, 0.00], [0, -.06, -.08], {thumb:  .00, idx: 1.00, low: 1.00, left: .08}),
    kf(0.330, [0, 0, 0, 0, 0, 0], [0, 0], [0, 0, 0], {thumb: 0, idx: 1, low: 1, left: 0, kick: 0})
  ],

  // Light Slash 2 (0.33s): crisp backhand cross-slash return (lower-left -> upper-right)
  light2: [
    IDLE,
    kf(0.036, [-.096, -.014,  .022, -.12, -.48, -.46], [0.00, 0.05], [0, -.18, -.20], {thumb: -.12, idx: 1.06, low: 1.06, left: .18}),
    kf(butterflyContactTime.light, [ .088,  .036, -.112,  .10,  .66,  .58], [0.00, 0.12], [0,  .28,  .32], {thumb: -.15, idx: 1.10, low: 1.10, left: .34, kick: .72}, 'butterflySlash'),
    kf(0.152, [ .128, -.012, -.072,  .22,  .78,  .68], [0.00, 0.04], [0,  .24,  .26], {thumb: -.08, idx: 1.05, low: 1.05, left: .22, kick: -.20}),
    kf(0.242, [ .036, -.016,  .006,  .08,  .24,  .18], [0.00, 0.00], [0,  .06,  .06], {thumb:  .00, idx: 1.00, low: 1.00, left: .06}),
    kf(0.330, [0, 0, 0, 0, 0, 0], [0, 0], [0, 0, 0], {thumb: 0, idx: 1, low: 1, left: 0, kick: 0})
  ],

  // Heavy Attack (0.65s): coiled tactical re-grip snap + clean 3-point perspective viper lunge toward target!
  heavy: [
    IDLE,
    kf(0.072, [ .052, -.028,  .080, -.18,  .34,  .36], [0.16, 0.46], [-0.32,  .16,  .28], {piv: 0, thumb:  .32, idx:  .72, low:  .62, left: .68, kick: -.35}, 'butterflyTick'),
    kf(butterflyContactTime.heavy, [-.072,  .022, -.192, -.14, -.24, -.46], [0.00, 0.00], [-0.14, -.08, -.26], {piv: 0, thumb: -.18, idx: 1.14, low: 1.14, left: .95, kick: 1.35}, 'butterflyThrust'),
    kf(0.212, [-.102,  .030, -.242, -.18, -.32, -.54], [0.00, 0.00], [-0.18, -.12, -.32], {piv: 0, thumb: -.16, idx: 1.12, low: 1.12, left: .86, kick: -.30}),
    kf(0.305, [-.076,  .018, -.168, -.10, -.20, -.36], [0.00, 0.00], [-0.10, -.06, -.18], {piv: 0, thumb: -.08, idx: 1.05, low: 1.05, left: .52, kick:  .00}),
    kf(0.455, [-.018, -.012, -.032, -.04, -.08, -.08], [0.08, 0.18], [-0.10, -.02,  .16], {piv: 0, thumb:  .14, idx:  .92, low:  .90, left: .18}, 'butterflyAir'),
    kf(0.555, [ .004, -.006,  .004, -.03,  .02, -.04], [0.00, 0.00], [ 0.00,  .00,  .00], {piv: 0, thumb: -.02, idx: 1.02, low: 1.02, left: .04, kick:  .22}),
    kf(0.650, [0, 0, 0, 0, 0, 0], [0, 0], [0, 0, 0], {piv: 0, thumb: 0, idx: 1, low: 1, left: 0, kick: 0})
  ]
};

function tangent(a, b, c, channel) {
  if (!a || !c) return 0;
  const incoming = (b[channel] - a[channel]) / (b[0] - a[0]);
  const outgoing = (c[channel] - b[channel]) / (c[0] - b[0]);
  return incoming * outgoing > 0 ? 2 * incoming * outgoing / (incoming + outgoing) : 0;
}

const wrapPi = a => ((a + PI) % TAU + TAU) % TAU - PI;

function evalClipAt(clip, time, section, outPose, outVel) {
  const left = clip[section], right = clip[section + 1];
  if (!right) {
    for (let i = 0; i < CHANNELS; i++) {
      outPose[i] = left[i + 1];
      outVel[i] = 0;
    }
    return;
  }
  const interval = right[0] - left[0];
  const inv = 1 / interval;
  const t = Math.max(0, Math.min(1, (time - left[0]) * inv));
  const t2 = t * t, t3 = t2 * t;
  const h00 = 2 * t3 - 3 * t2 + 1;
  const h10 = t3 - 2 * t2 + t;
  const h01 = -2 * t3 + 3 * t2;
  const h11 = t3 - t2;
  const dh00 = 6 * (t2 - t);
  const dh10 = 3 * t2 - 4 * t + 1;
  const dh01 = -6 * (t2 - t);
  const dh11 = 3 * t2 - 2 * t;
  const prev = clip[section - 1], next = clip[section + 2];
  for (let i = 0; i < CHANNELS; i++) {
    const ch = i + 1;
    const p0 = left[ch], p1 = right[ch];
    const m0 = tangent(prev, left, right, ch) * interval;
    const m1 = tangent(left, right, next, ch) * interval;
    outPose[i] = h00 * p0 + h10 * m0 + h01 * p1 + h11 * m1;
    outVel[i] = (dh00 * p0 + dh10 * m0 + dh01 * p1 + dh11 * m1) * inv;
  }
}

export function createButterflyMotion(emit) {
  const pose = new Float32Array(CHANNELS);
  const vel = new Float32Array(CHANNELS);
  const rawPose = new Float32Array(CHANNELS);
  const rawVel = new Float32Array(CHANNELS);
  // C1 critically-damped spring inertialization state: offset x & velocity offset v per channel
  const offX = new Float32Array(CHANNELS);
  const offV = new Float32Array(CHANNELS);

  // Secondary physics state (spring-loaded T-latch, hit rebound, wrist inertia)
  const secondary = {
    latchAngle: 0,
    latchVel: 0,
    reboundZ: 0,
    reboundVel: 0,
    reboundRoll: 0,
    trailIntensity: 0,
    spinSpeed: 0
  };

  let clip = null, clipName = '', time = 0, section = 0, springOmega = 48;
  let inspectAlt = false, comboStep = 0, comboWindow = 0, lightAlt = false, inspectQueued = false;
  let prevBiteTotal = 0;

  let contactAt = 0, contactFrame = false, quickGrip = false;
  function begin(name, blendHalfLife = 0.065) {
    contactAt = 0;
    quickGrip = false;
    const nextClip = clips[name];
    if (!nextClip) return;
    evalClipAt(nextClip, 0, 0, rawPose, rawVel);

    if (blendHalfLife > 0.001) {
      springOmega = 4.0 / blendHalfLife;
      for (let i = 0; i < CHANNELS; i++) {
        const cur = ROT_MASK[i] ? rawPose[i] + wrapPi(pose[i] - rawPose[i]) : pose[i];
        offX[i] = cur - rawPose[i];
        offV[i] = vel[i] - rawVel[i];
        pose[i] = cur;
      }
    } else {
      offX.fill(0);
      offV.fill(0);
      for (let i = 0; i < CHANNELS; i++) {
        pose[i] = rawPose[i];
        vel[i] = rawVel[i];
      }
    }
    clip = nextClip;
    clipName = name;
    time = 0;
    section = 0;
    inspectQueued = false;
  }

  function update(dt, ctx = {}) {
    dt = Math.max(0, Math.min(dt, 0.1));
    if (comboWindow > 0) comboWindow = Math.max(0, comboWindow - dt);

    if (clip) {
      // Wait for the match to resolve contact before passing the impact keyframe.
      if (!contactFrame) time = contactAt ? Math.min(time + dt, contactAt - 1e-6) : time + dt;
      contactFrame = false;
      if (quickGrip && time >= quickGripTime) {
        quickGrip = false;
        secondary.latchVel -= 8.5;
      }
      while (section + 1 < clip.length && time >= clip[section + 1][0]) {
        section++;
        const cue = clip[section].cue;
        if (cue) {
          // Modulate spin sound intensity slightly by angular velocity
          emit(cue, secondary.spinSpeed);
          if (cue === 'butterflyCatch') {
            secondary.latchVel -= 14.5;
          } else if (cue === 'butterflyTick' || cue === 'butterflyRicochet') {
            secondary.latchVel += 9.5;
          }
        }
      }
      if (!clip[section + 1]) {
        const startInspect = inspectQueued;
        clip = null;
        clipName = '';
        inspectQueued = false;
        // Normalize continuous spin angles cleanly when settling into idle
        for (let i = 0; i < CHANNELS; i++) {
          if (ROT_MASK[i]) pose[i] = wrapPi(pose[i]);
        }
        rawPose.set(IDLE.subarray(1, CHANNELS + 1));
        rawVel.fill(0);
        for (let i = 0; i < CHANNELS; i++) {
          offX[i] = ROT_MASK[i] ? wrapPi(pose[i] - rawPose[i]) : pose[i] - rawPose[i];
          offV[i] = vel[i];
        }
        springOmega = 42;
        if (startInspect) inspect();
      } else {
        evalClipAt(clip, time, section, rawPose, rawVel);
      }
    } else {
      rawPose.set(IDLE.subarray(1, CHANNELS + 1));
      rawVel.fill(0);
    }

    // Advance C1 critically-damped inertialization offsets: x(t) = e^(-w*dt) * (x0 + (v0 + w*x0)*dt)
    const w = springOmega;
    const exp = Math.exp(-w * dt);
    for (let i = 0; i < CHANNELS; i++) {
      const x0 = offX[i], v0 = offV[i];
      const b = v0 + w * x0;
      const nx = (x0 + b * dt) * exp;
      const nv = (v0 - b * w * dt) * exp;
      offX[i] = Math.abs(nx) < 1e-6 && Math.abs(nv) < 1e-5 ? 0 : nx;
      offV[i] = offX[i] === 0 ? 0 : nv;
      pose[i] = rawPose[i] + offX[i];
      vel[i] = rawVel[i] + offV[i];
    }

    // Clamp internal balisong joint angles strictly to physical tang/zen pin limits (tiny elastic stop flex allowed)
    pose[6] = Math.max(-0.025, Math.min(PI + 0.04, pose[6]));
    pose[7] = Math.max(-0.025, Math.min(PI + 0.04, pose[7]));

    // Secondary physics 1: Spring-loaded T-Latch pendulum driven by centrifugal force, handle whip & jump/land
    const biteTotal = pose[8] + pose[6] + pose[7];
    const biteOmega = dt > 1e-4 ? (biteTotal - prevBiteTotal) / dt : 0;
    prevBiteTotal = biteTotal;
    const spinMag = Math.hypot(vel[8], vel[10], vel[6] * 0.7, vel[7] * 0.7);
    secondary.spinSpeed = secondary.spinSpeed * Math.exp(-dt * 14) + spinMag * (1 - Math.exp(-dt * 14));

    const openLock = pose[6] < 0.08 && pose[7] < 0.08 && spinMag < 2.2;
    const latchTarget = openLock ? 0.0 : Math.min(1.35, 0.22 + Math.min(1.1, spinMag * 0.065));
    const latchStiff = openLock ? 340 : 85;
    const latchDamp = openLock ? 22 : 8.5;
    const landKick = (ctx.landImpulse || 0) * 18 - (ctx.swayY || 0) * 45;
    const centrifugal = Math.min(28, Math.abs(biteOmega) * 0.45);
    const latchAcc = (latchTarget - secondary.latchAngle) * latchStiff - secondary.latchVel * latchDamp +
      (openLock ? 0 : centrifugal) + landKick;
    secondary.latchVel += latchAcc * dt;
    secondary.latchAngle += secondary.latchVel * dt;
    if (secondary.latchAngle < -0.08) {
      secondary.latchAngle = -0.08;
      secondary.latchVel = Math.abs(secondary.latchVel) * 0.38;
    } else if (secondary.latchAngle > 1.65) {
      secondary.latchAngle = 1.65;
      secondary.latchVel = -Math.abs(secondary.latchVel) * 0.35;
    }

    // Secondary physics 2: Melee wall/flesh impact rebound decay
    const rebDecay = Math.exp(-dt * 26);
    secondary.reboundZ = (secondary.reboundZ + secondary.reboundVel * dt) * rebDecay;
    secondary.reboundVel = (secondary.reboundVel - secondary.reboundZ * 420 * dt) * rebDecay;
    secondary.reboundRoll *= rebDecay;

    // Blade motion-ribbon trail envelope: active during slashes and rapid spins
    const slashActive = clipName === 'light1' || clipName === 'light2' || clipName === 'heavy';
    const wantTrail = slashActive
      ? Math.min(1, Math.hypot(vel[0], vel[1], vel[2]) * 0.42 + spinMag * 0.05)
      : Math.max(0, Math.min(0.68, (spinMag - 8.5) * 0.048));
    secondary.trailIntensity += (wantTrail - secondary.trailIntensity) * (1 - Math.exp(-dt * 28));
  }

  function reset() {
    contactAt = 0;
    contactFrame = quickGrip = false;
    clip = null;
    clipName = '';
    time = 0;
    section = 0;
    inspectQueued = false;
    comboStep = 0;
    comboWindow = 0;
    pose.set(IDLE.subarray(1, CHANNELS + 1));
    vel.fill(0);
    offX.fill(0);
    offV.fill(0);
    secondary.latchAngle = 0;
    secondary.latchVel = 0;
    secondary.reboundZ = 0;
    secondary.reboundVel = 0;
    secondary.reboundRoll = 0;
    secondary.trailIntensity = 0;
    secondary.spinSpeed = 0;
    prevBiteTotal = 0;
  }

  function draw() {
    reset();
    begin(Math.random() < 0.35 ? 'rareDraw' : 'draw', 0);
  }

  function fidget() {
    if ((clipName === 'light1' || clipName === 'light2' || clipName === 'heavy') && time < 0.16) return;
    if (clipName.startsWith('fidget') && time < 0.14) return;
    if (comboWindow <= 0) comboStep = 0;
    const names = ['fidget1', 'fidget2', 'fidget3', 'fidget4'];
    const pick = names[comboStep % names.length];
    comboStep = (comboStep + 1) % names.length;
    comboWindow = 1.15;
    begin(pick, 0.066);
  }

  function inspect() {
    if (clipName === 'draw' || clipName === 'rareDraw') {
      if (time < 0.24) { inspectQueued = true; return; }
      fidget();
      return;
    }
    if ((clipName === 'light1' || clipName === 'light2' || clipName === 'heavy') && time < 0.16) return;
    if (clip) {
      if (time >= 0.15) fidget();
      return;
    }
    const rare = inspectAlt || Math.random() < 0.34;
    inspectAlt = !inspectAlt;
    begin(rare ? 'rareInspect' : 'inspect', 0.075);
  }

  function attack(kind) {
    const grip = time < drawCatchTimes[clipName];
    if (kind === 'heavy') {
      begin('heavy', grip ? quickGripTime : 0.052);
    } else {
      begin(lightAlt ? 'light2' : 'light1', grip ? quickGripTime : 0.045);
      lightAlt = !lightAlt;
    }
    quickGrip = grip;
    contactAt = butterflyContactTime[kind];
  }

  function contact(hitKind) {
    if (!contactAt) return;
    time = contactAt;
    contactAt = 0;
    contactFrame = true;
    if (hitKind === 'wall') {
      secondary.reboundVel += 0.38;
      secondary.reboundRoll += (lightAlt ? -1 : 1) * 0.16;
      secondary.latchVel += 12;
    } else if (hitKind === 'flesh') {
      secondary.reboundVel += 0.22;
      secondary.reboundRoll += (lightAlt ? -1 : 1) * 0.09;
    }
  }

  return {
    pose,
    secondary,
    update,
    reset,
    draw,
    inspect,
    fidget,
    attack,
    contact,
    flourish() { fidget(); }
  };
}
