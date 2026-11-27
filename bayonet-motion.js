// Physically grounded CS-style M9 Bayonet motion & C1 critically-damped spring-inertialized state machine.
// Channels (14):
//  0..2 : wristX, wristY, wristZ
//  3..5 : wristPitch, wristYaw, wristRoll (neutral rest = [0.69, 0.65, -0.22])
//  6..8 : spinX, spinY, spinZ (independent M9 rotation around palm spinPivot)
//  9    : knifeLift (parabolic aerial toss offset along spinPivot Y)
// 10    : fingerOpen (0 = gripped, <0 = catch/impact squeeze, 1 = splayed clear of spinning blade)
// 11    : thumbOpen (0 = wrapped on guard/grip, 1 = swung clear of crossguard)
// 12    : support (left tactical guard hand pose/recoil)
// 13    : camKick (viewmodel-only tactile camera micro-impulse)
import {Euler, Quaternion, Vector3} from './three.module.js';
import {bayonetContactTime} from './bayonet-timing.js?v=3';

const CHANNELS = 14;
const PI = Math.PI;
const TAU = PI * 2;
const ROT_MASK = new Uint8Array([0, 0, 0, 1, 1, 1, 1, 1, 1, 0, 0, 0, 0, 0]);

const REST_POS = [0, 0, 0];
// CS2 natural dorsal-fist M9 hold (back of glove facing camera, blade pointing up-left, cutting edge up-right, sawback down-left)
const REST_ROT = [0.35, 0.94, 1.38];
const STOWED_POS = [0.028, -0.235, 0.065];
const STOWED_ROT = [-0.24, 0.35, 0.28];
const HIDDEN_POS = [0.035, -0.25, 0.08];
const HIDDEN_ROT = [-0.26, 0.32, 0.24];

function kf(t, w, r, s, h = {}, cue = '', volume = 0.78) {
  const row = new Float64Array(CHANNELS + 1);
  row[0] = t;
  row[1] = w[0]; row[2] = w[1]; row[3] = w[2];
  row[4] = r[0]; row[5] = r[1]; row[6] = r[2];
  row[7] = s[0]; row[8] = s[1]; row[9] = s[2];
  row[10] = h.lift ?? 0;
  row[11] = h.open ?? 0;
  row[12] = h.thumb ?? h.open ?? 0;
  row[13] = h.sup ?? 0;
  row[14] = h.kick ?? 0;
  row.cue = cue;
  row.volume = volume;
  return row;
}
export {kf as fixedBladeKeyframe};

const IDLE = kf(0, REST_POS, REST_ROT, [0, 0, 0]);
const drawCatchTimes = {equip: 0.305, rareEquip: 0.365};
const quickGripTime = 0.028;

const clips = {
  // Signature CS M9 Draw (0.70s): snappy unsheath -> centered 360° forward palm-roll (100% inside 16:9!) -> punchy catch!
  equip: [
    kf(0.000, [0.008, -0.235, 0.060], [-0.28, 0.20, -0.72], [0.35, 0.00, 0.08], {lift: 0.000, open: 0.36, thumb: 0.34, sup: 0.04}, 'm9Unsheath', 0.74),
    kf(0.072, [-0.058, -0.055, -0.045], [0.22, 0.16, -0.28], [-1.42, -0.32, 0.22], {lift: 0.028, open: 0.92, thumb: 0.90, sup: 0.10}),
    kf(0.148, [-0.142, 0.022, -0.135], [0.58, -0.18, -0.04], [-3.52, -0.52, 0.20], {lift: 0.036, open: 0.98, thumb: 0.94, sup: 0.12}, 'm9Flip', 0.86),
    kf(0.232, [-0.078, 0.028, -0.078], [0.76, 0.36, -0.10], [-5.48, -0.24, -0.04], {lift: 0.016, open: 0.62, thumb: 0.56, sup: 0.08}),
    kf(drawCatchTimes.equip, [0.005, -0.018, 0.010], [0.24, 0.88, 1.24], [-TAU, 0.00, 0.04], {lift: 0.000, open: -0.12, thumb: -0.10, sup: 0.02, kick: 0.92}, 'm9Catch', 0.92),
    kf(0.415, [-0.002, 0.006, -0.004], [0.38, 0.96, 1.42], [-TAU, 0.00, -0.01], {lift: 0.000, open: 0.02, thumb: 0.02, sup: 0.00, kick: -0.22}),
    kf(0.545, [0.001, -0.002, 0.001], [0.34, 0.93, 1.37], [-TAU, 0.00, 0.00], {lift: 0.000, open: 0.00, thumb: 0.00, sup: 0.00, kick: 0.04}),
    kf(0.700, REST_POS, REST_ROT, [-TAU, 0, 0])
  ],

  // Rare CS M9 Pop-Flip Draw (0.84s): higher parabolic toss + longitudinal flash into heavy palm catch!
  rareEquip: [
    kf(0.000, [0.006, -0.230, 0.055], [-0.24, 0.22, -0.68], [0.25, 0.00, 0.00], {lift: 0.000, open: 0.38, thumb: 0.35, sup: 0.04}, 'm9Unsheath', 0.78),
    kf(0.090, [-0.068, -0.028, -0.055], [0.30, 0.14, -0.26], [-1.56, -0.36, 0.26], {lift: 0.044, open: 0.94, thumb: 0.92, sup: 0.12}),
    kf(0.195, [-0.148, 0.026, -0.142], [0.56, -0.20, -0.04], [-3.84, -0.48, 0.34], {lift: 0.048, open: 0.98, thumb: 0.94, sup: 0.14}, 'm9Flip', 0.88),
    kf(0.285, [-0.082, 0.028, -0.082], [0.74, 0.38, -0.10], [-5.66, -0.20, 0.12], {lift: 0.022, open: 0.64, thumb: 0.58, sup: 0.08}),
    kf(drawCatchTimes.rareEquip, [0.007, -0.024, 0.014], [0.22, 0.86, 1.20], [-TAU, 0.00, 0.05], {lift: 0.000, open: -0.14, thumb: -0.12, sup: 0.02, kick: 1.10}, 'm9Catch', 0.95),
    kf(0.495, [-0.004, 0.008, -0.005], [0.39, 0.97, 1.43], [-TAU, 0.00, -0.02], {lift: 0.000, open: 0.02, thumb: 0.02, sup: 0.00, kick: -0.26}),
    kf(0.655, [0.001, -0.002, 0.001], [0.34, 0.93, 1.37], [-TAU, 0.00, 0.00], {lift: 0.000, open: 0.00, thumb: 0.00, sup: 0.00, kick: 0.04}),
    kf(0.840, REST_POS, REST_ROT, [-TAU, 0, 0])
  ],

  holster: [
    IDLE,
    kf(0.140, HIDDEN_POS, HIDDEN_ROT, [0.22, 0, 0], {open: 0.15, thumb: 0.15, sup: 0.05})
  ],

  // Standard CS M9 Inspect (2.48s): clean mid-frame bevel showcase -> sawback & hollow-grind sheen sweep ->
  // crisp 180° flip showcasing guard ring & grooved handle -> snappy roll lock back to ready!
  inspect: [
    IDLE,
    kf(0.180, [-0.032, 0.018, -0.022], [0.42, 1.12, 1.06], [0.02, 0.04, -0.10], {open: 0.08, thumb: 0.05, sup: 0.012}, 'm9Cloth', 0.28),
    kf(0.420, [-0.024, 0.032, -0.024], [0.38, 1.18, 1.08], [0.00, 0.06, -0.14], {open: -0.06, thumb: -0.04, sup: 0.028}, 'm9Sheen', 0.56),
    kf(0.760, [-0.020, 0.034, -0.026], [0.34, 1.22, 0.96], [0.00, 0.04, -0.22], {open: -0.08, thumb: -0.05, sup: 0.030}),
    kf(1.060, [-0.030, 0.030, -0.032], [0.44, 1.26, 0.52], [-0.14, -0.08, 1.45], {lift: 0.012, open: 0.42, thumb: 0.36, sup: 0.024}, 'm9Spin', 0.52),
    kf(1.300, [-0.036, 0.028, -0.034], [0.56, 1.14, 0.84], [0.00, -0.06, 2.86], {open: -0.04, thumb: -0.02, sup: 0.016, kick: 0.24}, 'm9Sheen', 0.50),
    kf(1.740, [-0.032, 0.030, -0.032], [0.58, 1.10, 0.92], [0.00, -0.04, 3.04], {open: -0.06, thumb: -0.04, sup: 0.014}),
    kf(2.010, [-0.018, 0.020, -0.022], [0.46, 1.02, 1.16], [-0.08, 0.04, 5.52], {lift: 0.010, open: 0.48, thumb: 0.40, sup: 0.008}, 'm9Flip', 0.58),
    kf(2.180, [0.005, -0.010, 0.006], [0.28, 0.88, 1.28], [0.00, 0.00, TAU], {open: -0.08, thumb: -0.06, sup: 0.002, kick: 0.44}, 'm9Catch', 0.72),
    kf(2.310, [-0.001, 0.003, -0.002], [0.37, 0.96, 1.41], [0.00, 0.00, TAU], {open: 0.00, thumb: 0.00, sup: 0.000, kick: -0.10}),
    kf(2.480, REST_POS, REST_ROT, [0, 0, TAU])
  ],

  // Rare CS M9 Toss-Flip Inspect (2.76s): upward palm toss -> 360° aerial flip -> heavy catch -> slow bevel sheen!
  rareInspect: [
    IDLE,
    kf(0.110, [-0.048, 0.016, -0.048], [0.48, 0.62, 0.42], [0.18, 0.04, 0.08], {lift: 0.018, open: 0.78, thumb: 0.72, sup: 0.014}, 'm9Unsheath', 0.62),
    kf(0.280, [-0.118, 0.036, -0.118], [0.58, 0.14, 0.12], [-2.75, -0.32, 0.20], {lift: 0.048, open: 0.96, thumb: 0.92, sup: 0.026}, 'm9Flip', 0.84),
    kf(0.455, [-0.096, 0.034, -0.096], [0.64, 0.48, 0.32], [-5.28, -0.14, 0.06], {lift: 0.024, open: 0.72, thumb: 0.66, sup: 0.028}),
    kf(0.575, [-0.030, 0.022, -0.024], [0.32, 0.98, 1.12], [-TAU, 0.00, -0.10], {lift: 0.000, open: -0.12, thumb: -0.10, sup: 0.024, kick: 0.88}, 'm9Catch', 0.90),
    // Clean mid-frame bevel & sawback light sweep after the crisp catch
    kf(1.060, [-0.026, 0.034, -0.024], [0.38, 1.18, 1.06], [-TAU, 0.04, -0.14], {open: -0.04, thumb: -0.02, sup: 0.030, kick: -0.16}, 'm9Sheen', 0.56),
    kf(1.580, [-0.034, 0.032, -0.028], [0.54, 1.16, 0.82], [-TAU, -0.04, 0.76], {open: 0.08, thumb: 0.06, sup: 0.022}, 'm9Sheen', 0.44),
    kf(2.040, [-0.024, 0.024, -0.022], [0.46, 1.06, 1.14], [-TAU, 0.02, 0.24], {open: 0.04, thumb: 0.02, sup: 0.014}),
    kf(2.340, [-0.008, 0.010, -0.008], [0.32, 0.92, 1.32], [-TAU, 0.00, 0.02], {open: -0.04, thumb: -0.03, sup: 0.004, kick: 0.26}, 'm9Seat', 0.52),
    kf(2.760, REST_POS, REST_ROT, [-TAU, 0, 0])
  ],

  // Fidget 1 (0.50s): Crisp CS Draw-Roll Replay (forward 360° palm roll + weighty catch!)
  fidget1: [
    IDLE,
    kf(0.085, [-0.072, 0.028, -0.068], [0.52, 0.28, 0.16], [-1.72, -0.24, 0.14], {lift: 0.024, open: 0.92, thumb: 0.88, sup: 0.012}, 'm9Flip', 0.80),
    kf(0.205, [-0.118, 0.036, -0.112], [0.62, 0.12, 0.14], [-4.38, -0.34, -0.06], {lift: 0.022, open: 0.96, thumb: 0.90, sup: 0.018}),
    kf(0.325, [0.005, -0.014, 0.009], [0.24, 0.88, 1.24], [-TAU, 0.00, 0.03], {lift: 0.000, open: -0.12, thumb: -0.10, sup: 0.004, kick: 0.72}, 'm9Catch', 0.86),
    kf(0.415, [-0.002, 0.004, -0.002], [0.38, 0.96, 1.42], [-TAU, 0.00, -0.01], {open: 0.02, thumb: 0.02, kick: -0.16}),
    kf(0.500, REST_POS, REST_ROT, [-TAU, 0, 0])
  ],

  // Fidget 2 (0.52s): Reverse Backhand 360° Roll + Longitudinal Flash
  fidget2: [
    IDLE,
    kf(0.090, [-0.078, 0.028, -0.072], [0.46, 0.36, 0.26], [1.68, -0.22, 0.36], {lift: 0.022, open: 0.92, thumb: 0.88, sup: 0.014}, 'm9Spin', 0.78),
    kf(0.215, [-0.118, 0.038, -0.110], [0.54, 0.24, 0.22], [4.32, -0.28, 0.28], {lift: 0.020, open: 0.96, thumb: 0.92, sup: 0.018}),
    kf(0.340, [0.004, -0.012, 0.008], [0.26, 0.88, 1.26], [TAU, 0.00, -0.03], {lift: 0.000, open: -0.12, thumb: -0.10, sup: 0.004, kick: 0.66}, 'm9Catch', 0.84),
    kf(0.430, [-0.001, 0.004, -0.002], [0.38, 0.96, 1.41], [TAU, 0.00, 0.01], {open: 0.02, thumb: 0.02, kick: -0.14}),
    kf(0.520, REST_POS, REST_ROT, [TAU, 0, 0])
  ],

  // Fidget 3 (0.58s): Pommel-Pop Parabolic Aerial Flip Finisher!
  fidget3: [
    IDLE,
    kf(0.092, [-0.068, 0.022, -0.066], [0.52, 0.32, 0.22], [-1.45, -0.24, 0.24], {lift: 0.030, open: 0.90, thumb: 0.86, sup: 0.014}, 'm9Unsheath', 0.68),
    kf(0.230, [-0.120, 0.038, -0.114], [0.60, 0.14, 0.16], [-3.98, -0.32, 0.26], {lift: 0.048, open: 0.98, thumb: 0.94, sup: 0.024}, 'm9Flip', 0.84),
    kf(0.375, [0.006, -0.018, 0.011], [0.22, 0.86, 1.22], [-TAU, 0.00, 0.04], {lift: 0.000, open: -0.14, thumb: -0.12, sup: 0.006, kick: 0.90}, 'm9Catch', 0.90),
    kf(0.475, [-0.002, 0.005, -0.003], [0.38, 0.96, 1.42], [-TAU, 0.00, -0.01], {open: 0.02, thumb: 0.02, kick: -0.20}),
    kf(0.580, REST_POS, REST_ROT, [-TAU, 0, 0])
  ],

  // Light Slash 1 (0.368s): crisp forehand diagonal cut (broad blade face angled 35° to camera, exact contactTime)
  light: [
    IDLE,
    kf(0.054, [0.056, 0.009, 0.017], [0.46, 0.20, -0.69], [0.02, 0.06, -0.14], {open: -0.10, thumb: -0.08, sup: 0.012, kick: -0.22}, 'm9LightAir', 0.72),
    kf(bayonetContactTime.light, [-0.083, 0.045, -0.112], [0.51, 0.93, 0.28], [-0.08, 0.14, 0.34], {open: -0.14, thumb: -0.12, sup: 0.032, kick: 0.82}),
    kf(0.185, [-0.169, -0.037, -0.078], [0.28, 1.15, 0.69], [-0.12, 0.18, 0.40], {open: -0.08, thumb: -0.06, sup: 0.052, kick: -0.22}),
    kf(0.274, [-0.064, -0.048, -0.028], [0.48, 0.81, -0.33], [-0.04, 0.06, 0.08], {open: -0.02, thumb: -0.02, sup: 0.020}),
    kf(0.368, REST_POS, REST_ROT, [0, 0, 0])
  ],

  // Light Slash 2 (0.368s): crisp backhand cross-slash return
  backhand: [
    IDLE,
    kf(0.062, [-0.088, -0.033, 0.018], [0.43, 1.30, 0.66], [-0.04, -0.10, 0.26], {open: -0.10, thumb: -0.08, sup: 0.022, kick: -0.20}, 'm9LightAir', 0.70),
    kf(bayonetContactTime.light, [-0.039, 0.038, -0.104], [0.74, 0.78, -0.20], [0.06, -0.16, -0.32], {open: -0.14, thumb: -0.12, sup: 0.030, kick: 0.78}),
    kf(0.193, [0.106, 0.039, -0.022], [0.45, 0.24, -0.75], [0.08, -0.18, -0.36], {open: -0.08, thumb: -0.06, sup: 0.048, kick: -0.20}),
    kf(0.275, [0.053, -0.040, 0.015], [0.47, 0.39, -0.50], [0.02, -0.06, -0.08], {open: -0.02, thumb: -0.02, sup: 0.024}),
    kf(0.368, REST_POS, REST_ROT, [0, 0, 0])
  ],

  // Heavy Attack (0.762s): coiled tactical draw-back + deep forward lunge thrust (exact contactTime 0.211s)
  heavy: [
    IDLE,
    kf(0.092, [0.062, -0.014, 0.094], [0.60, 0.34, -0.42], [0.14, -0.06, -0.22], {open: -0.10, thumb: -0.08, sup: 0.021, kick: -0.32}),
    kf(0.153, [0.050, -0.020, 0.043], [0.43, 0.28, -0.30], [0.06, -0.04, -0.28], {open: -0.12, thumb: -0.10, sup: 0.032}, 'm9HeavyAir', 0.78),
    kf(bayonetContactTime.heavy, [-0.105, 0.062, -0.229], [0.38, 0.21, -0.10], [-0.04, 0.02, -0.36], {open: -0.16, thumb: -0.14, sup: 0.064, kick: 1.32}),
    kf(0.258, [-0.124, 0.053, -0.242], [0.34, 0.19, -0.07], [-0.06, 0.02, -0.40], {open: -0.14, thumb: -0.12, sup: 0.075, kick: -0.28}),
    kf(0.357, [-0.084, 0.004, -0.121], [0.16, 0.33, -0.22], [-0.02, 0.00, -0.20], {open: -0.06, thumb: -0.05, sup: 0.049}),
    kf(0.551, [0.015, -0.031, 0.011], [0.49, 0.59, -0.40], [0.02, 0.00, -0.05], {open: 0.02, thumb: 0.02, sup: 0.018}),
    kf(0.762, REST_POS, REST_ROT, [0, 0, 0])
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
  const interval = Math.max(1e-5, right[0] - left[0]);
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

export function createBayonetMotion(play = () => {}, profile) {
  const timeline=profile?.clips??clips;
  const idle=profile?.idle??IDLE;
  const contactTimes=profile?.contactTime??bayonetContactTime;
  const catchTimes=profile?.catchTimes??drawCatchTimes;
  const position = new Vector3();
  const rotation = new Quaternion();
  const spin = new Quaternion();
  const _euler = new Euler(0, 0, 0, 'YXZ');

  const pose = new Float64Array(CHANNELS);
  const vel = new Float64Array(CHANNELS);
  const rawPose = new Float64Array(CHANNELS);
  const rawVel = new Float64Array(CHANNELS);
  const offX = new Float64Array(CHANNELS);
  const offV = new Float64Array(CHANNELS);

  const secondary = {
    reboundZ: 0,
    reboundVel: 0,
    reboundRoll: 0,
    trailIntensity: 0,
    spinSpeed: 0
  };

  let clip = null, clipName = '', time = 0, section = 0, springOmega = 48;
  let visible = false, inspectAlt = false, comboStep = 0, comboWindow = 0;
  let reverse = false, lastSwing = Infinity, inspectQueued = false;
  let contactAt = 0, contactFrame = false, quickGrip = false, impact = 0, firstFrame = 0;

  function begin(name, blendHalfLife = 0.068) {
    contactAt = 0;
    firstFrame = 0;
    quickGrip = false;
    const nextClip = timeline[name];
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
    if (nextClip[0]?.cue) play(nextClip[0].cue, nextClip[0].volume);
  }

  function syncOutputs() {
    position.set(pose[0], pose[1], pose[2]);
    _euler.set(pose[3], pose[4], pose[5], 'YXZ');
    rotation.setFromEuler(_euler);
    _euler.set(pose[6], pose[7], pose[8], 'YXZ');
    spin.setFromEuler(_euler);
  }

  function reset() {
    clip = null;
    clipName = '';
    time = section = contactAt = impact = 0;
    visible = reverse = contactFrame = quickGrip = inspectQueued = false;
    comboStep = comboWindow = 0;
    lastSwing = Infinity;
    pose.set(idle.subarray(1, CHANNELS + 1));
    rawPose.set(idle.subarray(1, CHANNELS + 1));
    vel.fill(0);
    rawVel.fill(0);
    offX.fill(0);
    offV.fill(0);
    secondary.reboundZ = 0;
    secondary.reboundVel = 0;
    secondary.reboundRoll = 0;
    secondary.trailIntensity = 0;
    secondary.spinSpeed = 0;
    syncOutputs();
  }

  function equip() {
    const wasVisible = visible;
    inspectQueued = false;
    contactAt = 0;
    contactFrame = quickGrip = reverse = false;
    impact = 0;
    lastSwing = Infinity;
    const pick = timeline.rareEquip && Math.random() < 0.30 ? 'rareEquip' : 'equip';
    if (!wasVisible) {
      pose.set(timeline[pick][0].subarray(1, CHANNELS + 1));
      vel.fill(0);
    }
    visible = true;
    begin(pick, wasVisible ? 0.085 : 0);
    syncOutputs();
  }

  function holster() {
    if (!visible || clipName === 'holster') return;
    inspectQueued = false;
    impact = 0;
    begin('holster', 0.065);
  }

  function fidget() {
    if (!visible || clipName === 'holster') return;
    if (profile && contactAt) return;
    if ((clipName === 'light' || clipName === 'backhand' || clipName === 'heavy') && time < 0.16) return;
    if (clipName.startsWith('fidget') && time < 0.14) return;
    if (comboWindow <= 0) comboStep = 0;
    const names = ['fidget1', 'fidget2', 'fidget3'];
    const pick = names[comboStep % names.length];
    comboStep = (comboStep + 1) % names.length;
    comboWindow = 1.15;
    begin(pick, 0.064);
  }

  function inspect() {
    if (!visible || clipName === 'holster') return;
    if (profile && contactAt) return;
    if (clipName === 'equip' || clipName === 'rareEquip') {
      if (profile || time < 0.22) { inspectQueued = true; return; }
      fidget();
      return;
    }
    if ((clipName === 'light' || clipName === 'backhand' || clipName === 'heavy') && time < 0.16) return;
    if (clip) {
      if (time >= 0.14) fidget();
      return;
    }
    const rare = inspectAlt || !profile && Math.random() < 0.34;
    inspectAlt = !inspectAlt;
    begin(rare ? 'rareInspect' : 'inspect', 0.075);
  }

  function attack(kind, frameTime = 0) {
    if (!visible) visible = true;
    inspectQueued = false;
    if (lastSwing > 0.85) reverse = false;
    const catchT = catchTimes[clipName];
    const grip = Boolean(catchT && time < catchT);
    const nextName = kind === 'heavy' ? 'heavy' : reverse ? 'backhand' : 'light';
    begin(nextName, grip ? quickGripTime : kind === 'heavy' ? 0.052 : 0.045);
    quickGrip = grip;
    reverse = kind === 'light' && !reverse;
    lastSwing = 0;
    contactAt = contactTimes[kind === 'heavy' ? 'heavy' : 'light'];
    if (profile) firstFrame=frameTime;
    else if (frameTime > 0) time = Math.min(frameTime, Math.max(0, contactAt - 1e-6));
  }

  function contact(kind) {
    if (!contactAt && clipName !== 'light' && clipName !== 'backhand' && clipName !== 'heavy') return;
    if (contactAt) {
      time = contactAt;
      contactAt = 0;
      contactFrame = true;
    }
    if (kind === 'wall') {
      impact = 1;
      secondary.reboundVel += 0.36;
      secondary.reboundRoll += (reverse ? -1 : 1) * 0.15;
    } else if (kind === 'flesh') {
      impact = 0.48;
      secondary.reboundVel += 0.20;
      secondary.reboundRoll += (reverse ? -1 : 1) * 0.08;
    }
  }

  function update(dt) {
    if (!visible) return;
    dt = Math.max(0, Math.min(dt, 0.1));
    lastSwing += dt;
    impact *= Math.exp(-dt * 17);
    if (comboWindow > 0) comboWindow = Math.max(0, comboWindow - dt);

    if (clip) {
      const clipStep=Math.max(0,dt-firstFrame);
      firstFrame=0;
      if (!contactFrame) time = contactAt ? Math.min(time + clipStep, contactAt - 1e-6) : time + clipStep;
      contactFrame = false;
      if (quickGrip && time >= quickGripTime) {
        quickGrip = false;
        secondary.reboundVel += 0.14;
        play(profile?.catchCue??'m9Catch', 0.72);
      }
      while (section + 1 < clip.length && time >= clip[section + 1][0]) {
        section++;
        const frame = clip[section];
        if (frame.cue) play(frame.cue, frame.volume);
      }
      if (!clip[section + 1]) {
        if (clipName === 'holster') {
          reset();
          return;
        }
        const startInspect = inspectQueued;
        clip = null;
        clipName = '';
        inspectQueued = false;
        for (let i = 0; i < CHANNELS; i++) {
          if (ROT_MASK[i]) pose[i] = wrapPi(pose[i]);
        }
        rawPose.set(idle.subarray(1, CHANNELS + 1));
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
      rawPose.set(idle.subarray(1, CHANNELS + 1));
      rawVel.fill(0);
    }

    // C1 critically-damped spring inertialization
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

    // Secondary impact rebound & cold-steel motion-ribbon envelope
    const rebDecay = Math.exp(-dt * 26);
    secondary.reboundZ = (secondary.reboundZ + secondary.reboundVel * dt) * rebDecay;
    secondary.reboundVel = (secondary.reboundVel - secondary.reboundZ * 420 * dt) * rebDecay;
    secondary.reboundRoll *= rebDecay;

    const spinMag = Math.hypot(vel[6], vel[7], vel[8] * 0.65);
    secondary.spinSpeed = secondary.spinSpeed * Math.exp(-dt * 14) + spinMag * (1 - Math.exp(-dt * 14));
    const slashActive = clipName === 'light' || clipName === 'backhand' || clipName === 'heavy';
    const wantTrail = slashActive
      ? Math.min(0.88, Math.hypot(vel[0], vel[1], vel[2]) * 0.42 + spinMag * 0.05)
      : Math.max(0, Math.min(0.28, (spinMag - 9.0) * 0.025));
    secondary.trailIntensity += (wantTrail * (profile?.trailStrength??1) - secondary.trailIntensity) * (1 - Math.exp(-dt * 28));

    syncOutputs();
  }

  reset();
  return {
    position,
    rotation,
    spin,
    secondary,
    get visible() { return visible; },
    get knifeLift() { return pose[9]; },
    get fingerOpen() { return pose[10]; },
    get thumbOpen() { return pose[11]; },
    get grip() { return Math.max(0, -pose[10]); },
    get support() { return pose[12]; },
    get camKick() { return pose[13]; },
    get impact() { return impact; },
    get activeGuard() {
      return clipName === 'equip' || clipName === 'rareEquip' || clipName === 'inspect' ||
        clipName === 'rareInspect' || clipName.startsWith('fidget') || clipName === 'heavy' ? 1 : 0;
    },
    reset,
    equip,
    holster,
    inspect,
    fidget,
    flourish() { fidget(); },
    attack,
    contact,
    update
  };
}
