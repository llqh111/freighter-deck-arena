// First-Person Karambit Reference-Replicated Procedural State Machine
// - Deterministic, repeatable, frame-scrubbable keyframe table replicating reference video 1.70s -> 3.90s
// - Independent armPos, armRot (Quaternion Slerp), wristRot (Quaternion Slerp), fingers[5], pivotPos,
//   unwrappedSpinAngle (cubic Hermite with explicit tangents — NEVER slerped), and local spinAxis
// - Strict tail-ring SpinPivot rotation; zero random sine waves; zero camera shake during inspect
// - Seamless 3.90s -> 1.90s continuous loop (or single-cycle mode); C1 inertialized interruption from live pose
import * as T from './three.module.js';

const tau = 2 * Math.PI;
const deg2rad = Math.PI / 180;
const rad2deg = 180 / Math.PI;
const clamp01 = v => (v < 0 ? 0 : v > 1 ? 1 : v);
const lerp = (a, b, t) => a + (b - a) * t;

const EASINGS = {
  linear: t => t,
  hermite: t => t,
  easeInOutCubic: t => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  easeOutCubic: t => 1 - Math.pow(1 - t, 3),
  easeInCubic: t => t * t * t,
  easeOutBack: t => {
    const s = 1.05, u = t - 1;
    return 1 + (s + 1) * u * u * u + s * u * u;
  }
};

// --- Exposed Tunable Config & Debug Controls ---
export const KARAMBIT_INSPECT_CONFIG = {
  introDur: 0.16,         // Smooth C1 launch from Idle -> Phase 1
  outroDur: 0.38,         // Outro natural catch -> Idle
  // Inspect-only tempo. Scales intro + loop + outro together, so the whole 检视 reads as one
  // continuous tempo instead of "slow in / fast middle / slow out". Script-time (the durations
  // above) stays untouched, so the seamless 2.40s -> 0.14s wrap and every C1 tangent survive
  // exactly as designed. Does NOT touch attacks / draw / holster: their contact frames must stay
  // locked to karambitContactTime or the hit would land off-pose.
  // 实测（60fps 逐步模拟，见 tools 验证输出）：
  //   1.00x → 稳态循环 2.267s，峰值 28.0°/帧
  //   1.15x → 稳态循环 1.967s，峰值 32.2°/帧   ← 当前值
  //   1.25x → 稳态循环 1.817s，峰值 35.0°/帧   ← 快速旋转段开始出阶梯感，别越过
  // 峰值永远落在「连续快转·前臂呼吸」段。刀光拖尾默认开启会填满扫描弧，关掉拖尾做审计时会
  // 更容易看出阶梯，所以上限压在 1.25；若还想更快，改 keyframe 的快速段而不是继续拉这个系数。
  inspectSpeed: 1.15,
  loopMode: 'loop',       // 'loop' (continuous complex flourish + fast spin) | 'single' (play 1 cycle then Outro)
  loopWrapTime: 0.14,     // 2.40s wraps seamlessly to 0.14s (exact pose, tangent & -3 turns!)
  slowMo: false,          // 0.2x slow-motion toggle
  slowMoScale: 0.2,
  paused: false,          // Pause playback for frame-by-frame inspection
  showGizmos: false,      // SpinPivot & spinAxis viewport gizmos + Debug Panel
  showTrail: true         // Toggle blade trail VFX (set false to audit pure hand+knife motion!)
};

// --- Complex Multi-Phase C1-Smooth Karambit Choreography (0.00s -> 2.40s) ---
// Preserves all rich beats (launch -> brief catch -> side-blade showcase -> low-right windup ->
// reverse big left-arc flourish -> palm-flip high-speed continuous spin) while enforcing strict
// C1 continuity (matched inTangent === outTangent everywhere + Catmull-Rom splines) for zero stutter!
export const KARAMBIT_KEYFRAMES = [
  {
    time: 0.00, refTime: 1.80, phase: '松握蓄势起转',
    armPos: [-0.015, 0.010, -0.010], armRot: [0.06, 0.16, -0.14], wristRot: [0.05, 0.10, -0.08],
    fingers: [0, 0.52, 0.48, 0.46, 0.72], pivotPos: [0, 0, 0],
    unwrappedSpinAngle: -90, spinAxis: [0, 0, 1],
    curve: 'hermite', inTangent: -900, outTangent: -900
  },
  {
    time: 0.14, refTime: 1.94, phase: '展掌左上翻起',
    armPos: [0.014, 0.036, -0.026], armRot: [0.14, 0.28, -0.34], wristRot: [0.06, 0.16, -0.10],
    fingers: [0, 0.96, 0.98, 1.00, 0.96], pivotPos: [0, 0, 0],
    unwrappedSpinAngle: -270, spinAxis: [0, 0, 1],
    curve: 'hermite', inTangent: -1440, outTangent: -1440
  },
  {
    time: 0.26, refTime: 2.06, phase: '越掌顶转右下',
    armPos: [0.022, 0.040, -0.030], armRot: [0.12, 0.32, -0.28], wristRot: [0.04, 0.14, -0.06],
    fingers: [0, 0.88, 0.88, 0.86, 0.84], pivotPos: [0, 0, 0],
    unwrappedSpinAngle: -420, spinAxis: [0.02, -0.02, 1],
    curve: 'hermite', inTangent: -900, outTangent: -900
  },
  {
    time: 0.38, refTime: 2.18, phase: '收拢轻接停顿',
    armPos: [0.004, 0.020, -0.016], armRot: [0.07, 0.20, -0.44], wristRot: [-0.04, 0.06, -0.14],
    fingers: [0, 0.12, 0.10, 0.08, 0.16], pivotPos: [0, 0, 0],
    unwrappedSpinAngle: -475, spinAxis: [0, 0, 1],
    curve: 'hermite', inTangent: 0, outTangent: 0
  },
  {
    time: 0.54, refTime: 2.34, phase: '展掌朝镜·侧刃',
    armPos: [0.010, 0.034, -0.026], armRot: [0.14, 0.42, -0.48], wristRot: [0.08, 0.30, -0.10],
    fingers: [0, 0.92, 0.95, 0.98, 0.92], pivotPos: [0, 0, 0],
    unwrappedSpinAngle: -540, spinAxis: [0.05, -0.03, 1],
    curve: 'hermite', inTangent: -720, outTangent: -720
  },
  {
    time: 0.72, refTime: 2.52, phase: '翻腕越掌顶',
    armPos: [0.028, 0.044, -0.034], armRot: [0.16, 0.34, -0.30], wristRot: [0.14, 0.18, 0.14],
    fingers: [0, 0.94, 0.94, 0.92, 0.88], pivotPos: [0, 0, 0],
    unwrappedSpinAngle: -685, spinAxis: [0.04, 0.03, 1],
    curve: 'hermite', inTangent: -780, outTangent: -780
  },
  {
    time: 0.92, refTime: 2.72, phase: '右下回撤蓄势',
    armPos: [0.044, -0.006, -0.012], armRot: [-0.09, 0.24, -0.22], wristRot: [-0.12, 0.14, 0.12],
    fingers: [0, 0.56, 0.54, 0.52, 0.64], pivotPos: [0, 0, 0],
    unwrappedSpinAngle: -765, spinAxis: [0, 0, 1],
    curve: 'hermite', inTangent: 0, outTangent: 0
  },
  {
    time: 1.08, refTime: 2.88, phase: '右上伸展·反转起势',
    armPos: [0.036, 0.066, -0.038], armRot: [0.20, 0.28, -0.44], wristRot: [0.12, 0.14, -0.08],
    fingers: [0, 0.72, 0.70, 0.68, 0.76], pivotPos: [0, 0, 0],
    unwrappedSpinAngle: -670, spinAxis: [-0.02, 0.02, 1],
    curve: 'hermite', inTangent: 960, outTangent: 960
  },
  {
    time: 1.24, refTime: 3.04, phase: '前臂平推·左大弧线',
    armPos: [0.014, 0.044, -0.042], armRot: [0.04, 0.20, -0.08], wristRot: [0.02, 0.10, 0.06],
    fingers: [0, 0.94, 0.96, 0.94, 0.90], pivotPos: [0, 0, 0],
    unwrappedSpinAngle: -490, spinAxis: [-0.04, 0.02, 1],
    curve: 'hermite', inTangent: 1160, outTangent: 1160
  },
  {
    time: 1.40, refTime: 3.20, phase: '经下方回旋上提',
    armPos: [0.018, 0.034, -0.038], armRot: [0.08, 0.28, -0.26], wristRot: [0.04, 0.14, -0.02],
    fingers: [0, 0.86, 0.86, 0.84, 0.82], pivotPos: [0, 0, 0],
    unwrappedSpinAngle: -305, spinAxis: [0.02, 0.02, 1],
    curve: 'hermite', inTangent: 960, outTangent: 960
  },
  {
    time: 1.58, refTime: 3.38, phase: '沉腕翻掌蓄势',
    armPos: [0.026, 0.004, -0.024], armRot: [-0.04, 0.28, -0.20], wristRot: [0.06, 0.18, 0.16],
    fingers: [0, 0.68, 0.68, 0.66, 0.74], pivotPos: [0, 0, 0],
    unwrappedSpinAngle: -215, spinAxis: [0.02, -0.02, 1],
    curve: 'hermite', inTangent: 0, outTangent: 0
  },
  {
    time: 1.74, refTime: 3.54, phase: '展掌爆发连续快转·1',
    armPos: [0.024, 0.042, -0.036], armRot: [0.16, 0.34, -0.38], wristRot: [0.05, 0.18, -0.05],
    fingers: [0, 1.00, 1.00, 1.00, 0.98], pivotPos: [0, 0, 0],
    unwrappedSpinAngle: -340, spinAxis: [0.03, 0.02, 1],
    curve: 'hermite', inTangent: -1320, outTangent: -1320
  },
  {
    time: 1.96, refTime: 3.76, phase: '连续快转·微翻腕',
    armPos: [0.028, 0.038, -0.036], armRot: [0.14, 0.38, -0.36], wristRot: [0.08, 0.20, 0.04],
    fingers: [0, 0.98, 1.00, 1.00, 0.98], pivotPos: [0, 0, 0],
    unwrappedSpinAngle: -660, spinAxis: [-0.02, 0.03, 1],
    curve: 'hermite', inTangent: -1500, outTangent: -1500
  },
  {
    time: 2.18, refTime: 3.98, phase: '连续快转·前臂呼吸',
    armPos: [0.020, 0.042, -0.034], armRot: [0.17, 0.32, -0.40], wristRot: [0.04, 0.16, -0.06],
    fingers: [0, 1.00, 1.00, 1.00, 1.00], pivotPos: [0, 0, 0],
    unwrappedSpinAngle: -995, spinAxis: [0.02, -0.02, 1],
    curve: 'hermite', inTangent: -1520, outTangent: -1520
  },
  {
    // Exact pose & tangent match to t=0.14s (-270 deg) with exact -3 full turns (-1080 deg)!
    time: 2.40, refTime: 4.20, phase: '无缝衔接循环',
    armPos: [0.014, 0.036, -0.026], armRot: [0.14, 0.28, -0.34], wristRot: [0.06, 0.16, -0.10],
    fingers: [0, 0.96, 0.98, 1.00, 0.96], pivotPos: [0, 0, 0],
    unwrappedSpinAngle: -1350, spinAxis: [0, 0, 1],
    curve: 'hermite', inTangent: -1440, outTangent: -1440
  }
];

export const karambitContactTime = { light: .105, heavy: .162 };

// Non-inspect clips (CS2 classic draw, F-R-F-R fidget spins, light/backhand/heavy attacks, holster)
// Channels (10): [x, y, z, pitch, yaw, roll, ringZ(rad), fingerOpen, thumbOpen, camKick]
const idle = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
const drawCatchTime = .375;
const key = (time, pose = idle, cue = '', volume = .75) => ({ time, pose, cue, volume });

const clips = {
  draw: [
    key(0,             [-.085, -.105,  .052, -.26, -.28,  .50,  5.95, .96, .90,  .00]),
    key(.065,          [-.052, -.044,  .024, -.14, -.18,  .38,  5.02, .98, .92,  .00], 'karambitSpin', .84),
    key(.165,          [-.010,  .032, -.012,  .04, -.02,  .16,  2.96, .96, .88,  .00]),
    key(.260,          [ .012,  .042, -.020,  .12,  .12, -.10,  1.05, .74, .58,  .00], 'karambitFlick', .70),
    key(.335,          [ .006,  .018, -.010,  .08,  .08, -.12,  0.16, .24, .16,  .00]),
    key(drawCatchTime, [-.005, -.016,  .010, -.10, -.06,  .11, -.145, .00, .00,  .96], 'karambitCatch', .94),
    key(.475,          [ .002,  .005, -.003,  .03,  .02, -.04,  0.032, .00, .02, -.24]),
    key(.595,          [-.001, -.002,  .001, -.01, -.01,  .01, -.008, .00, .00,  .04]),
    key(.720,          idle)
  ],
  holster: [
    key(0,    idle),
    key(.080, [ .018, -.035,  .024, -.16, -.12,  .14,  .35, .25, .20, 0]),
    key(.240, [-.075, -.220,  .095, -.52, -.34,  .46,  1.45, .60, .55, 0])
  ],
  spinA: [
    key(0,    idle),
    key(.062, [-.014,  .044, -.022, -.12,  .14, -.16, -.96,      .94, .88,  0], 'karambitFlick', .74),
    key(.178, [-.028,  .078, -.038, -.18,  .22, -.24, -3.78,     .98, .90,  0], 'karambitSpin', .72),
    key(.290, [-.012,  .036, -.018, -.04,  .08, -.04, -6.04,     .38, .22,  0]),
    key(.342, [ .008, -.015,  .010,  .08, -.04,  .09, -tau+.13,  .00, .00, .82], 'karambitCatch', .88),
    key(.405, [-.002,  .004, -.002, -.02,  .01, -.03, -tau-.02,  .00, .02, -.16]),
    key(.460, [0, 0, 0, 0, 0, 0, -tau, 0, 0, 0])
  ],
  spinB: [
    key(0,    idle),
    key(.066, [ .016,  .042, -.020, -.10, -.12,  .18,  .98,      .92, .86,  0], 'karambitFlick', .72),
    key(.188, [-.020,  .080, -.038, -.16,  .20, -.18,  3.86,     .98, .90,  0], 'karambitSpin', .74),
    key(.305, [-.010,  .034, -.016, -.04,  .06,  .04,  6.06,     .36, .20,  0]),
    key(.358, [ .006, -.015,  .010,  .08, -.03, -.08,  tau-.13,  .00, .00, .82], 'karambitCatch', .88),
    key(.422, [-.002,  .004, -.002, -.02,  .01,  .02,  tau+.02,  .00, .02, -.16]),
    key(.480, [0, 0, 0, 0, 0, 0, tau, 0, 0, 0])
  ],
  light: [
    key(0,    idle),
    key(.042, [ .056,  .024,  .024, -.14, -.26, -.22, -.12, .04, .04, -.20]),
    key(karambitContactTime.light, [-.178, .022, -.108, .16, .56, .42, .18, 0, 0, .86], 'karambitCut', .86),
    key(.178, [-.212, -.024, -.072,  .24,  .68,  .52,  .22, 0, 0, -.24]),
    key(.275, [-.062, -.014,  .006,  .08,  .22,  .16,  .05, 0, 0,  .00]),
    key(.360, idle)
  ],
  backhand: [
    key(0,    idle),
    key(.044, [-.098, -.018,  .022,  .14,  .34,  .26,  .12, .04, .04, -.18]),
    key(karambitContactTime.light, [ .072, .052, -.096, -.16, -.48, -.34, -.16, 0, 0, .84], 'karambitCut', .86),
    key(.180, [ .104,  .032, -.060, -.20, -.58, -.42, -.18, 0, 0, -.22]),
    key(.278, [ .032, -.008,  .006, -.06, -.18, -.12, -.04, 0, 0,  .00]),
    key(.360, idle)
  ],
  heavy: [
    key(0,    idle),
    key(.088, [ .016,  .086,  .048, -.38, -.18, -.34, -.32, .20, .16, -.35], 'karambitSpin', .76),
    key(karambitContactTime.heavy, [-.095, .022, -.165, .34, .32, .38, .18, 0, 0, 1.38], 'karambitCut', .94),
    key(.240, [-.122, -.018, -.132,  .38,  .42,  .44,  .24, 0, 0, -.32]),
    key(.415, [-.038, -.012, -.024,  .12,  .16,  .14,  .04, 0, 0,  .00]),
    key(.670, idle)
  ]
};

function sampleClip(clip, i, time, outPose, outVel) {
  const a = clip[i], b = clip[i + 1];
  const before = clip[i - 1] ?? a;
  const after = clip[i + 2] ?? b;
  const duration = Math.max(1e-5, b.time - a.time);
  const t = clamp01((time - a.time) / duration), t2 = t * t, t3 = t2 * t;
  for (let j = 0; j < outPose.length; j++) {
    const from = a.pose[j] ?? 0, to = b.pose[j] ?? 0;
    const prev = before.pose[j] ?? 0, next = after.pose[j] ?? 0;
    const m0 = before === a ? (clip === clips.draw ? (to - from) * 1.15 : 0) : (to - prev) / (b.time - before.time) * duration;
    const m1 = after === b ? 0 : (next - from) / (after.time - a.time) * duration;
    outPose[j] = (2 * t3 - 3 * t2 + 1) * from + (t3 - 2 * t2 + t) * m0 + (-2 * t3 + 3 * t2) * to + (t3 - t2) * m1;
    outVel[j] = ((6 * t2 - 6 * t) * (from - to) + (3 * t2 - 4 * t + 1) * m0 + (3 * t2 - 2 * t) * m1) / duration;
  }
}

// Zero-GC scratch quaternion / vector helpers
const _eul = new T.Euler(0, 0, 0, 'YXZ');
const _qA = new T.Quaternion();
const _qB = new T.Quaternion();
const _qTmp = new T.Quaternion();
const _qErr = new T.Quaternion();
const _axisTmp = new T.Vector3();
const _vA = new T.Vector3();
const _vB = new T.Vector3();

function eulerArrToQuat(arr, target) {
  _eul.set(arr[0], arr[1], arr[2], 'YXZ');
  return target.setFromEuler(_eul);
}

function quatToRotVec(q, out) {
  const w = T.MathUtils.clamp(q.w, -1, 1);
  const sign = w < 0 ? -1 : 1;
  const qw = w * sign, qx = q.x * sign, qy = q.y * sign, qz = q.z * sign;
  const sinHalf = Math.hypot(qx, qy, qz);
  if (sinHalf < 1e-6) {
    out[0] = 2 * qx; out[1] = 2 * qy; out[2] = 2 * qz;
  } else {
    const scale = (2 * Math.atan2(sinHalf, qw)) / sinHalf;
    out[0] = qx * scale; out[1] = qy * scale; out[2] = qz * scale;
  }
}

function rotVecToQuat(rx, ry, rz, target) {
  const angle = Math.hypot(rx, ry, rz);
  if (angle < 1e-6) return target.identity();
  _axisTmp.set(rx / angle, ry / angle, rz / angle);
  return target.setFromAxisAngle(_axisTmp, angle);
}

// Compute automatic Catmull-Rom tangent (deg/s) for unwrappedSpinAngle at keyframe index idx
function autoSpinTangent(kfs, idx) {
  const cur = kfs[idx];
  const prev = kfs[Math.max(0, idx - 1)];
  const next = kfs[Math.min(kfs.length - 1, idx + 1)];
  if (prev === cur) return (next.unwrappedSpinAngle - cur.unwrappedSpinAngle) / Math.max(1e-4, next.time - cur.time);
  if (next === cur) return (cur.unwrappedSpinAngle - prev.unwrappedSpinAngle) / Math.max(1e-4, cur.time - prev.time);
  return (next.unwrappedSpinAngle - prev.unwrappedSpinAngle) / Math.max(1e-4, next.time - prev.time);
}

export function createKarambitMotion(emit = () => {}) {
  // Exported live evaluated pose channels
  const pose = new Float64Array(idle.length); // [x, y, z, rx, ry, rz, unwrappedSpinRad, avgFinger, thumb, camKick]
  const fingers = new Float64Array(5);        // [index, middle, ring, pinky, thumb]
  const pivotPos = new T.Vector3();
  const handQuat = new T.Quaternion();        // forearm / rig rotation (Quaternion Slerp + inertialized)
  const wristQuat = new T.Quaternion();       // independent wrist rotation (Quaternion Slerp + inertialized)
  const spinQuat = new T.Quaternion();        // SpinPivot rotation from unwrappedSpinAngle around spinAxis
  const spinAxis = new T.Vector3(0, 0, 1);

  // Raw (pre-inertialization) targets
  const raw = new Float64Array(idle.length);
  const rawFingers = new Float64Array(5);
  const rawPivot = new T.Vector3();
  const rawHandQuat = new T.Quaternion();
  const rawWristQuat = new T.Quaternion();
  const rawSpinAxis = new T.Vector3(0, 0, 1);

  // C1 critically-damped inertialization buffers (position, fingers, pivot, unwrappedSpin, handQuat, wristQuat)
  const velocity = new Float64Array(idle.length);
  const offX = new Float64Array(idle.length);
  const offV = new Float64Array(idle.length);
  const fOffX = new Float64Array(5);
  const fOffV = new Float64Array(5);
  const pOffX = new Float64Array(3);
  const pOffV = new Float64Array(3);
  const handRotOffX = new Float64Array(3), handRotOffV = new Float64Array(3);
  const wristRotOffX = new Float64Array(3), wristRotOffV = new Float64Array(3);
  const prevRawHandQ = new T.Quaternion(), prevRawWristQ = new T.Quaternion();
  const handAngVel = new Float64Array(3), wristAngVel = new Float64Array(3);

  let state = 'idle'; // 'idle' | 'equip' | 'inspectIntro' | 'inspectLoop' | 'inspectOutro' | 'attack' | 'holster' | 'spin'
  let phaseLabel = 'IDLE';
  let clip = null, time = 0, section = 0, springOmega = 48;
  let contactAt = 0, contactFrame = false, backhand = false, spinAlt = false, queued = null, rebound = 0;

  // Deterministic inspect timeline trackers
  let introClock = 0;
  let loopTime = 0;         // 0.00 .. 2.10s inside KARAMBIT_KEYFRAMES
  let loopCycles = 0;
  let cycleAngleOffsetDeg = 0; // exact integer-turn offset accumulated across loops
  let curSpinVelDegS = 0;
  let lastKfIdx = -1;

  // Outro live-pose capture (guarantees smooth exit from ANY live evaluated pose!)
  const outroStartPos = [0, 0, 0];
  const outroStartHandQ = new T.Quaternion();
  const outroStartWristQ = new T.Quaternion();
  const outroStartFingers = new Float64Array(5);
  const outroStartPivot = new T.Vector3();
  let outroStartSpinRad = 0;
  let outroTargetSpinRad = 0;
  let outroTime = 0;
  let outroCatchCued = false;

  const loopDuration = () => KARAMBIT_KEYFRAMES[KARAMBIT_KEYFRAMES.length - 1].time;

  // Periodic C1 Catmull-Rom helper so forearm/wrist/fingers glide smoothly with zero segment kinks
  const catmull = (p0, p1, p2, p3, u) => {
    const u2 = u * u, u3 = u2 * u;
    return 0.5 * ((2 * p1) + (-p0 + p2) * u + (2 * p0 - 5 * p1 + 4 * p2 - p3) * u2 + (-p0 + 3 * p1 - 3 * p2 + p3) * u3);
  };
  const _rotScratch = [0, 0, 0];

  // Evaluate deterministic keyframe table at t (0 .. loopDuration)
  function evalKeyframesAt(t) {
    const kfs = KARAMBIT_KEYFRAMES;
    const lastIdx = kfs.length - 1;
    const maxT = kfs[lastIdx].time;
    const clampedT = T.MathUtils.clamp(t, 0, maxT);
    let i = 0;
    while (i < lastIdx - 1 && clampedT >= kfs[i + 1].time) i++;
    const a = kfs[i], b = kfs[i + 1];
    const prev = kfs[i > 0 ? i - 1 : 0];
    const next = kfs[i + 2 <= lastIdx ? i + 2 : Math.min(lastIdx, 2)];
    const dur = Math.max(1e-5, b.time - a.time);
    const u = clamp01((clampedT - a.time) / dur);

    // 1. Forearm position via periodic C1 Catmull-Rom spline (zero velocity kinks!)
    for (let k = 0; k < 3; k++) raw[k] = catmull(prev.armPos[k], a.armPos[k], b.armPos[k], next.armPos[k], u);

    // 2. Forearm rotation via C1 Catmull-Rom -> Quaternion
    for (let k = 0; k < 3; k++) _rotScratch[k] = catmull(prev.armRot[k], a.armRot[k], b.armRot[k], next.armRot[k], u);
    eulerArrToQuat(_rotScratch, rawHandQuat);

    // 3. Independent wrist rotation via C1 Catmull-Rom -> Quaternion
    for (let k = 0; k < 3; k++) _rotScratch[k] = catmull(prev.wristRot[k], a.wristRot[k], b.wristRot[k], next.wristRot[k], u);
    eulerArrToQuat(_rotScratch, rawWristQuat);

    // 4. Independent fingers[5] via C1 Catmull-Rom
    for (let f = 0; f < 5; f++) rawFingers[f] = clamp01(catmull(prev.fingers[f], a.fingers[f], b.fingers[f], next.fingers[f], u));
    raw[7] = (rawFingers[1] + rawFingers[2] + rawFingers[3]) / 3;
    raw[8] = rawFingers[4];
    raw[9] = 0; // Zero fake camera shake during inspect!

    // 5. SpinPivot local offset
    rawPivot.set(
      catmull(prev.pivotPos[0], a.pivotPos[0], b.pivotPos[0], next.pivotPos[0], u),
      catmull(prev.pivotPos[1], a.pivotPos[1], b.pivotPos[1], next.pivotPos[1], u),
      catmull(prev.pivotPos[2], a.pivotPos[2], b.pivotPos[2], next.pivotPos[2], u)
    );

    // 6. Local spin axis (smooth C1 blend)
    rawSpinAxis.set(
      catmull(prev.spinAxis[0], a.spinAxis[0], b.spinAxis[0], next.spinAxis[0], u),
      catmull(prev.spinAxis[1], a.spinAxis[1], b.spinAxis[1], next.spinAxis[1], u),
      catmull(prev.spinAxis[2], a.spinAxis[2], b.spinAxis[2], next.spinAxis[2], u)
    ).normalize();

    // 7. Continuous unwrappedSpinAngle via cubic Hermite (NEVER slerped!)
    const m0Deg = (a.outTangent !== null && a.outTangent !== undefined ? a.outTangent : autoSpinTangent(kfs, i)) * dur;
    const m1Deg = (b.inTangent !== null && b.inTangent !== undefined ? b.inTangent : autoSpinTangent(kfs, i + 1)) * dur;
    const u2 = u * u, u3 = u2 * u;
    const p0 = a.unwrappedSpinAngle, p1 = b.unwrappedSpinAngle;
    const angleDeg = (2 * u3 - 3 * u2 + 1) * p0 + (u3 - 2 * u2 + u) * m0Deg + (-2 * u3 + 3 * u2) * p1 + (u3 - u2) * m1Deg;
    curSpinVelDegS = ((6 * u2 - 6 * u) * (p0 - p1) + (3 * u2 - 4 * u + 1) * m0Deg + (3 * u2 - 2 * u) * m1Deg) / dur;
    raw[6] = (angleDeg + cycleAngleOffsetDeg) * deg2rad;

    phaseLabel = a.phase;
    return i;
  }

  function evalIntro(t) {
    const dur = Math.max(0.04, KARAMBIT_INSPECT_CONFIG.introDur);
    const u = clamp01(t / dur);
    const eu = EASINGS.easeInOutCubic(u);
    const k0 = KARAMBIT_KEYFRAMES[0];

    raw[0] = lerp(0, k0.armPos[0], eu);
    raw[1] = lerp(0, k0.armPos[1], eu);
    raw[2] = lerp(0, k0.armPos[2], eu);

    _qA.identity();
    eulerArrToQuat(k0.armRot, _qB);
    rawHandQuat.copy(_qA).slerp(_qB, eu);

    eulerArrToQuat(k0.wristRot, _qB);
    rawWristQuat.copy(_qA).slerp(_qB, eu);

    for (let f = 0; f < 5; f++) rawFingers[f] = lerp(0, k0.fingers[f], eu);
    raw[7] = (rawFingers[1] + rawFingers[2] + rawFingers[3]) / 3;
    raw[8] = rawFingers[4];
    raw[9] = 0;

    rawPivot.set(
      lerp(0, k0.pivotPos[0], eu),
      lerp(0, k0.pivotPos[1], eu),
      lerp(0, k0.pivotPos[2], eu)
    );
    rawSpinAxis.set(k0.spinAxis[0], k0.spinAxis[1], k0.spinAxis[2]).normalize();

    // Smooth Hermite from Idle (0 deg, vel 0) into 1.80s (-90 deg)
    const m1 = (k0.inTangent ?? -600) * dur;
    const u2 = u * u, u3 = u2 * u;
    const angleDeg = (-2 * u3 + 3 * u2) * k0.unwrappedSpinAngle + (u3 - u2) * m1;
    curSpinVelDegS = ((6 * u2 - 6 * u) * (0 - k0.unwrappedSpinAngle) + (3 * u2 - 2 * u) * m1) / dur;
    raw[6] = angleDeg * deg2rad;
    phaseLabel = 'INTRO 1.70s->1.80s';
    return u >= 1;
  }

  function evalOutro(t) {
    const dur = Math.max(0.18, KARAMBIT_INSPECT_CONFIG.outroDur);
    const u = clamp01(t / dur);
    const eu = EASINGS.easeInOutCubic(u);
    const eSpin = EASINGS.easeOutBack(u);
    const clampDip = Math.exp(-Math.pow((u - 0.66) / 0.14, 2));

    raw[0] = lerp(outroStartPos[0], 0, eu);
    raw[1] = lerp(outroStartPos[1], 0, eu) - clampDip * 0.012;
    raw[2] = lerp(outroStartPos[2], 0, eu);

    _qB.identity();
    rawHandQuat.copy(outroStartHandQ).slerp(_qB, eu);
    rawWristQuat.copy(outroStartWristQ).slerp(_qB, eu);

    const fClose = EASINGS.easeInOutCubic(clamp01((u - 0.12) / 0.50));
    for (let f = 0; f < 5; f++) rawFingers[f] = lerp(outroStartFingers[f], 0, fClose);
    raw[7] = (rawFingers[1] + rawFingers[2] + rawFingers[3]) / 3;
    raw[8] = rawFingers[4];
    raw[9] = 0;

    rawPivot.copy(outroStartPivot).lerp(_vA.set(0, 0, 0), eu);
    rawSpinAxis.set(0, 0, 1);

    const prevRad = raw[6];
    raw[6] = lerp(outroStartSpinRad, outroTargetSpinRad, eSpin);
    curSpinVelDegS = (raw[6] - prevRad) * rad2deg / Math.max(1e-3, dur * 0.05);
    phaseLabel = 'OUTRO 收刀回Idle';
    if (!outroCatchCued && u >= 0.64) {
      outroCatchCued = true;
      emit('karambitCatch', .86);
    }
    return u >= 1;
  }

  function compose(dt) {
    const w = springOmega;
    const decay = Math.exp(-w * dt);

    for (let j = 0; j < pose.length; j++) {
      const x = offX[j], b = offV[j] + w * x;
      offX[j] = (x + b * dt) * decay;
      offV[j] = (offV[j] - b * w * dt) * decay;
      pose[j] = raw[j] + offX[j];
    }
    for (let f = 0; f < 5; f++) {
      const x = fOffX[f], b = fOffV[f] + w * x;
      fOffX[f] = (x + b * dt) * decay;
      fOffV[f] = (fOffV[f] - b * w * dt) * decay;
      fingers[f] = clamp01(rawFingers[f] + fOffX[f]);
    }
    for (let k = 0; k < 3; k++) {
      const px = pOffX[k], pb = pOffV[k] + w * px;
      pOffX[k] = (px + pb * dt) * decay;
      pOffV[k] = (pOffV[k] - pb * w * dt) * decay;

      const hx = handRotOffX[k], hb = handRotOffV[k] + w * hx;
      handRotOffX[k] = (hx + hb * dt) * decay;
      handRotOffV[k] = (handRotOffV[k] - hb * w * dt) * decay;

      const wx = wristRotOffX[k], wb = wristRotOffV[k] + w * wx;
      wristRotOffX[k] = (wx + wb * dt) * decay;
      wristRotOffV[k] = (wristRotOffV[k] - wb * w * dt) * decay;
    }

    rebound *= Math.exp(-15 * dt);
    pose[2] += rebound;
    pivotPos.set(rawPivot.x + pOffX[0], rawPivot.y + pOffX[1], rawPivot.z + pOffX[2]);

    // Compose final hand & wrist Quaternions with exponential-map inertialization (shortest-arc, zero jump!)
    rotVecToQuat(handRotOffX[0], handRotOffX[1], handRotOffX[2], _qErr);
    handQuat.copy(_qErr).multiply(rawHandQuat).normalize();

    rotVecToQuat(wristRotOffX[0], wristRotOffX[1], wristRotOffX[2], _qErr);
    wristQuat.copy(_qErr).multiply(rawWristQuat).normalize();

    // SpinPivot orientation strictly from unwrappedSpinAngle (pose[6]) around spinAxis!
    const axisAlpha = dt > 0 ? 1 - Math.exp(-24 * dt) : 1;
    spinAxis.lerp(rawSpinAxis, axisAlpha).normalize();
    spinQuat.setFromAxisAngle(spinAxis, pose[6]);
  }

  function snapshotLive() {
    return {
      pose: Float64Array.from(pose),
      fingers: Float64Array.from(fingers),
      pivot: pivotPos.clone(),
      handQ: handQuat.clone(),
      wristQ: wristQuat.clone()
    };
  }

  function applyInertialization(snap, transition) {
    if (transition > 0) {
      springOmega = 4 / transition;
      for (let j = 0; j < pose.length; j++) {
        const diff = snap.pose[j] - raw[j];
        offX[j] = j === 6 ? Math.atan2(Math.sin(diff), Math.cos(diff)) : diff;
        offV[j] = velocity[j] * 0.5;
      }
      for (let f = 0; f < 5; f++) { fOffX[f] = snap.fingers[f] - rawFingers[f]; fOffV[f] = 0; }
      pOffX[0] = snap.pivot.x - rawPivot.x; pOffX[1] = snap.pivot.y - rawPivot.y; pOffX[2] = snap.pivot.z - rawPivot.z;
      pOffV.fill(0);

      _qErr.copy(snap.handQ).multiply(_qTmp.copy(rawHandQuat).invert());
      quatToRotVec(_qErr, handRotOffX);
      for (let k = 0; k < 3; k++) handRotOffV[k] = handAngVel[k];

      _qErr.copy(snap.wristQ).multiply(_qTmp.copy(rawWristQuat).invert());
      quatToRotVec(_qErr, wristRotOffX);
      for (let k = 0; k < 3; k++) wristRotOffV[k] = wristAngVel[k];
    } else {
      offX.fill(0); offV.fill(0);
      fOffX.fill(0); fOffV.fill(0);
      pOffX.fill(0); pOffV.fill(0);
      handRotOffX.fill(0); handRotOffV.fill(0);
      wristRotOffX.fill(0); wristRotOffV.fill(0);
    }
    rebound = 0;
    prevRawHandQ.copy(rawHandQuat);
    prevRawWristQ.copy(rawWristQuat);
    compose(0);
  }

  function applyClipRaw() {
    eulerArrToQuat([raw[3], raw[4], raw[5]], rawHandQuat);
    rawWristQuat.identity();
    rawFingers[0] = 0;
    rawFingers[1] = rawFingers[2] = rawFingers[3] = raw[7];
    rawFingers[4] = raw[8];
    rawPivot.set(0, 0, 0);
    rawSpinAxis.set(0, 0, 1);
  }

  function startClip(name, nextState, transition = .072) {
    const snap = snapshotLive();
    state = nextState;
    phaseLabel = nextState.toUpperCase();
    clip = clips[name];
    time = section = contactAt = 0;
    contactFrame = false;
    queued = null;
    KARAMBIT_INSPECT_CONFIG.paused = false;
    sampleClip(clip, 0, 0, raw, velocity);
    applyClipRaw();
    applyInertialization(snap, transition);
  }

  function startInspectIntro(transition = .072) {
    const snap = snapshotLive();
    state = 'inspectIntro';
    clip = null;
    contactAt = 0; contactFrame = false; queued = null;
    introClock = 0; loopTime = 0; loopCycles = 0; cycleAngleOffsetDeg = 0; lastKfIdx = -1;
    KARAMBIT_INSPECT_CONFIG.paused = false;
    evalIntro(0);
    velocity.fill(0);
    applyInertialization(snap, transition);
  }

  function startInspectOutro(transition = .075) {
    const snap = snapshotLive();
    state = 'inspectOutro';
    clip = null;
    contactAt = 0; contactFrame = false; queued = null;
    KARAMBIT_INSPECT_CONFIG.paused = false;
    outroTime = 0; outroCatchCued = false;
    outroStartPos[0] = pose[0]; outroStartPos[1] = pose[1]; outroStartPos[2] = pose[2];
    outroStartHandQ.copy(handQuat);
    outroStartWristQ.copy(wristQuat);
    outroStartFingers.set(fingers);
    outroStartPivot.copy(pivotPos);
    outroStartSpinRad = pose[6];
    const dir = curSpinVelDegS <= 0 ? -1 : 1;
    outroTargetSpinRad = dir < 0
      ? Math.floor(outroStartSpinRad / tau) * tau
      : Math.ceil(outroStartSpinRad / tau) * tau;
    if (Math.abs(outroTargetSpinRad - outroStartSpinRad) < 0.8) outroTargetSpinRad += dir * tau;
    evalOutro(0);
    velocity.fill(0);
    applyInertialization(snap, transition);
  }

  // Direct deterministic timeline scrubbing for Debug Panel (pauses & evaluates exact frame!)
  function scrubTo(tSec, pause = true) {
    const maxT = loopDuration();
    state = 'inspectLoop';
    clip = null;
    contactAt = 0; contactFrame = false; queued = null;
    loopTime = T.MathUtils.clamp(tSec, 0, maxT);
    cycleAngleOffsetDeg = 0;
    KARAMBIT_INSPECT_CONFIG.paused = pause;
    offX.fill(0); offV.fill(0);
    fOffX.fill(0); fOffV.fill(0);
    pOffX.fill(0); pOffV.fill(0);
    handRotOffX.fill(0); handRotOffV.fill(0);
    wristRotOffX.fill(0); wristRotOffV.fill(0);
    evalKeyframesAt(loopTime);
    spinAxis.copy(rawSpinAxis);
    compose(0);
  }

  function stepFrame(deltaSec = 1 / 60) {
    const maxT = loopDuration();
    let next = (state === 'inspectLoop' ? loopTime : 0) + deltaSec;
    if (next > maxT) next = KARAMBIT_INSPECT_CONFIG.loopWrapTime + (next - maxT);
    if (next < 0) next = maxT + next;
    scrubTo(next, true);
  }

  function spin() {
    if (contactAt) return;
    if (state === 'equip' && time < .22) { queued = 'spin'; return; }
    if (state === 'spin' && time < .16) return;
    const next = spinAlt ? 'spinB' : 'spinA';
    spinAlt = !spinAlt;
    startClip(next, 'spin', .066);
  }

  function inspect() {
    if (state === 'inspectIntro' || state === 'inspectLoop') {
      startInspectOutro(.075);
      return;
    }
    if (contactAt) return;
    if (state === 'equip' && time < .26) {
      queued = queued === 'inspect' ? null : 'inspect';
      return;
    }
    startInspectIntro(.072);
  }

  function attack(kind) {
    const clipName = kind === 'heavy' ? 'heavy' : backhand ? 'backhand' : 'light';
    startClip(clipName, 'attack', .048);
    if (kind === 'light') backhand = !backhand;
    contactAt = karambitContactTime[kind];
  }

  function holster() {
    if (state === 'holster') return;
    startClip('holster', 'holster', .065);
  }

  function contact(kind) {
    if (!contactAt) return;
    time = contactAt; contactAt = 0; contactFrame = true;
    rebound = kind === 'wall' ? .034 : kind === 'flesh' ? .018 : 0;
  }

  function reset() {
    state = 'idle'; phaseLabel = 'IDLE';
    clip = null; time = section = contactAt = rebound = 0;
    introClock = loopTime = loopCycles = cycleAngleOffsetDeg = outroTime = curSpinVelDegS = 0;
    lastKfIdx = -1;
    backhand = spinAlt = contactFrame = false; queued = null;
    KARAMBIT_INSPECT_CONFIG.paused = false;
    pose.fill(0); raw.fill(0); velocity.fill(0); offX.fill(0); offV.fill(0);
    fingers.fill(0); rawFingers.fill(0); fOffX.fill(0); fOffV.fill(0);
    pOffX.fill(0); pOffV.fill(0);
    handRotOffX.fill(0); handRotOffV.fill(0); wristRotOffX.fill(0); wristRotOffV.fill(0);
    handAngVel.fill(0); wristAngVel.fill(0);
    pivotPos.set(0, 0, 0); rawPivot.set(0, 0, 0);
    handQuat.identity(); rawHandQuat.identity(); prevRawHandQ.identity();
    wristQuat.identity(); rawWristQuat.identity(); prevRawWristQ.identity();
    spinQuat.identity(); spinAxis.set(0, 0, 1); rawSpinAxis.set(0, 0, 1);
  }

  const prevRawPose = new Float64Array(idle.length);

  function update(rawDt) {
    const cfg = KARAMBIT_INSPECT_CONFIG;
    if (cfg.paused && (state === 'inspectIntro' || state === 'inspectLoop')) {
      // Re-evaluate live in case user edited keyframe values in Debug Panel while paused!
      if (state === 'inspectLoop') evalKeyframesAt(loopTime);
      else evalIntro(introClock);
      spinAxis.copy(rawSpinAxis);
      compose(0);
      return;
    }

    const scale = cfg.slowMo ? cfg.slowMoScale : 1;
    let dt = Math.max(0, Math.min(rawDt, 0.1)) * scale;
    if (dt === 0 && state === 'idle') { compose(0); return; }

    // Inspect-only tempo multiplier (see KARAMBIT_INSPECT_CONFIG.inspectSpeed). idt is the script
    // clock; compose() below still runs on real dt so the inertialization spring settles in real time.
    const inspecting = state === 'inspectIntro' || state === 'inspectLoop' || state === 'inspectOutro';
    const idt = inspecting ? dt * T.MathUtils.clamp(cfg.inspectSpeed || 1, 0.25, 3) : dt;

    prevRawPose.set(raw);

    if (state === 'inspectIntro') {
      introClock += idt;
      const done = evalIntro(introClock);
      if (done) {
        const carry = Math.max(0, introClock - Math.max(0.04, cfg.introDur));
        state = 'inspectLoop';
        loopTime = carry;
        lastKfIdx = evalKeyframesAt(loopTime);
      }
      if (idt > 1e-6) for (let j = 0; j < pose.length; j++) velocity[j] = (raw[j] - prevRawPose[j]) / idt;
    } else if (state === 'inspectLoop') {
      const maxT = loopDuration();
      loopTime += idt;
      if (loopTime >= maxT) {
        if (cfg.loopMode === 'single') {
          loopTime = maxT;
          evalKeyframesAt(loopTime);
          compose(0);
          startInspectOutro(.075);
          return;
        }
        // Seamless continuous wrap: 3.90s (2.10s) -> 1.90s (loopWrapTime = 0.10s)
        const wrapT = T.MathUtils.clamp(cfg.loopWrapTime, 0, maxT - 0.1);
        const endAngle = KARAMBIT_KEYFRAMES[KARAMBIT_KEYFRAMES.length - 1].unwrappedSpinAngle;
        const wrapKf = KARAMBIT_KEYFRAMES.find(k => Math.abs(k.time - wrapT) < 1e-3) || KARAMBIT_KEYFRAMES[1];
        // Accumulate exact integer-turn offset so unwrappedSpinAngle never snaps!
        cycleAngleOffsetDeg += (endAngle - wrapKf.unwrappedSpinAngle);
        loopTime = wrapT + (loopTime - maxT);
        loopCycles++;
        lastKfIdx = -1;
      }
      const kfIdx = evalKeyframesAt(loopTime);
      if (kfIdx !== lastKfIdx) {
        lastKfIdx = kfIdx;
        if (kfIdx === 1 || kfIdx === 5 || kfIdx === 8 || kfIdx === 11) emit('karambitSpin', .72);
        else if (kfIdx === 3) emit('karambitCatch', .66);
        else if (kfIdx === 12 || kfIdx === 13) emit('karambitRing', .56);
      }
      if (idt > 1e-6) for (let j = 0; j < pose.length; j++) velocity[j] = (raw[j] - prevRawPose[j]) / idt;
    } else if (state === 'inspectOutro') {
      outroTime += idt;
      const done = evalOutro(outroTime);
      if (idt > 1e-6) for (let j = 0; j < pose.length; j++) velocity[j] = (raw[j] - prevRawPose[j]) / idt;
      if (done) {
        state = 'idle'; phaseLabel = 'IDLE';
        raw.fill(0); velocity.fill(0); rawFingers.fill(0);
        rawPivot.set(0, 0, 0); rawHandQuat.identity(); rawWristQuat.identity();
        rawSpinAxis.set(0, 0, 1); curSpinVelDegS = 0;
      }
    } else if (clip) {
      if (!contactFrame) time = contactAt ? Math.min(time + dt, contactAt - 1e-6) : time + dt;
      contactFrame = false;
      while (clip[section + 1] && time >= clip[section + 1].time) {
        const frame = clip[++section];
        if (frame.cue) emit(frame.cue, frame.volume);
        const end = !clip[section + 1];
        const afterDraw = queued && state === 'equip' && frame.time === drawCatchTime;
        if (!end && !afterDraw) continue;
        const carry = time - frame.time;
        sampleClip(clip, section - 1, frame.time, raw, velocity);
        applyClipRaw();
        compose(Math.max(0, dt - carry));
        dt = carry;
        const nextAction = queued; queued = null;
        if (nextAction === 'inspect') { startInspectIntro(.072); introClock = carry; break; }
        if (nextAction === 'spin') {
          const sName = spinAlt ? 'spinB' : 'spinA'; spinAlt = !spinAlt;
          startClip(sName, 'spin', .066); time = carry; break;
        }
        if (state === 'holster') { time = frame.time; break; }
        clip = null; state = 'idle'; phaseLabel = 'IDLE';
        raw.fill(0); velocity.fill(0); rawFingers.fill(0);
        rawPivot.set(0, 0, 0); rawHandQuat.identity(); rawWristQuat.identity();
        rawSpinAxis.set(0, 0, 1); curSpinVelDegS = 0;
        break;
      }
      if (clip) { sampleClip(clip, section, time, raw, velocity); applyClipRaw(); }
    }

    // Track angular velocities in quaternion tangent space for C1 interrupts
    if (dt > 1e-6) {
      _qErr.copy(rawHandQuat).multiply(_qTmp.copy(prevRawHandQ).invert());
      quatToRotVec(_qErr, handAngVel);
      handAngVel[0] /= dt; handAngVel[1] /= dt; handAngVel[2] /= dt;

      _qErr.copy(rawWristQuat).multiply(_qTmp.copy(prevRawWristQ).invert());
      quatToRotVec(_qErr, wristAngVel);
      wristAngVel[0] /= dt; wristAngVel[1] /= dt; wristAngVel[2] /= dt;
    } else {
      handAngVel.fill(0); wristAngVel.fill(0);
    }
    prevRawHandQ.copy(rawHandQuat);
    prevRawWristQ.copy(rawWristQuat);

    compose(dt);
  }

  return {
    pose,
    fingers,
    pivotPos,
    handQuat,
    wristQuat,
    spinQuat,
    spinAxis,
    reset,
    update,
    draw() { startClip('draw', 'equip', 0); },
    holster,
    inspect,
    spin,
    attack,
    contact,
    scrubTo,
    stepFrame,
    get impact() { return rebound; },
    getDebugState() {
      const refT = state === 'inspectLoop' ? (1.80 + loopTime) : (state === 'inspectIntro' ? (1.70 + introClock) : 1.70);
      return {
        state,
        phase: phaseLabel,
        loopTime: Number(loopTime.toFixed(3)),
        loopDuration: loopDuration(),
        refTime: Number(refT.toFixed(2)),
        cycles: loopCycles,
        unwrappedSpinDeg: Number((pose[6] * rad2deg).toFixed(1)),
        spinVelDegS: Math.round(curSpinVelDegS),
        paused: KARAMBIT_INSPECT_CONFIG.paused,
        timeScale: KARAMBIT_INSPECT_CONFIG.slowMo ? KARAMBIT_INSPECT_CONFIG.slowMoScale : 1,
        inspectSpeed: KARAMBIT_INSPECT_CONFIG.inspectSpeed,
        loopMode: KARAMBIT_INSPECT_CONFIG.loopMode,
        showGizmos: KARAMBIT_INSPECT_CONFIG.showGizmos,
        showTrail: KARAMBIT_INSPECT_CONFIG.showTrail
      };
    }
  };
}
