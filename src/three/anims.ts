import type { ExerciseAnim, Prim } from './stage';
import { lerpPose, smooth, type BoneKey, type Pose, type V3 } from './pose';

/**
 * Процедурные анимации упражнений: ключевые позы скелета + IK-цели (стопы на
 * платформе, кисти на грифе) + реквизит. Это демонстрационные анимации,
 * собранные вручную; они не являются записью motion capture.
 */

const TAU = Math.PI * 2;
const HANG: Pose = { arm: [0, 0, -78], forearm: [0, -10, 0] };

/** A → B → A с плавным ходом и короткими паузами в крайних точках. */
function pingpong(a: Pose, b: Pose, hold = 0.07): (p: number) => Pose {
  return (p) => {
    const t = p < 0.5 ? p * 2 : (1 - p) * 2;
    const k = smooth(Math.min(1, Math.max(0, (t - hold) / (1 - 2 * hold))));
    return lerpPose(a, b, k);
  };
}
/** 0 → 1 → 0, сглаженно */
const wave = (p: number, hold = 0.07) => {
  const t = p < 0.5 ? p * 2 : (1 - p) * 2;
  return smooth(Math.min(1, Math.max(0, (t - hold) / (1 - 2 * hold))));
};
const mix = (a: V3, b: V3, k: number): V3 => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k];

/* ---------- реквизит ---------- */

function dumbbell(side: 'L' | 'R', c: Prim['c'] = 'accent'): Prim[] {
  const s = side === 'L' ? 1 : -1;
  const follow = `hand${side}` as BoneKey;
  const base: V3 = [0.085 * s, -0.035, 0.01];
  const at = (dz: number): V3 => [base[0], base[1], base[2] + dz];
  return [
    { s: 'cyl', size: [0.013, 0.17], p: at(0), r: [90, 0, 0], c: 'metal', follow, attach: true },
    { s: 'cyl', size: [0.045, 0.05], p: at(0.085), r: [90, 0, 0], c, follow, attach: true },
    { s: 'cyl', size: [0.045, 0.05], p: at(-0.085), r: [90, 0, 0], c, follow, attach: true },
  ];
}
const dumbbells = (): Prim[] => [...dumbbell('L'), ...dumbbell('R')];

/** одна гантель вертикально между ладонями */
function gobletBell(off: V3 = [0, 0, 0]): Prim[] {
  return [
    { s: 'cyl', size: [0.014, 0.16], p: off, c: 'metal', follow: 'hands' },
    { s: 'cyl', size: [0.055, 0.055], p: [off[0], off[1] + 0.1, off[2]], c: 'accent', follow: 'hands' },
    { s: 'cyl', size: [0.055, 0.055], p: [off[0], off[1] - 0.1, off[2]], c: 'accent', follow: 'hands' },
  ];
}

function barbell(off: V3 = [0, 0, 0], plate = 0.2): Prim[] {
  const P = (x: number, r: number, w: number, c: Prim['c']): Prim =>
    ({ s: 'cyl', size: [r, w], p: [off[0] + x, off[1], off[2]], r: [0, 0, 90], c, follow: 'hands' });
  return [
    P(0, 0.013, 1.75, 'metal'),
    P(0.6, plate, 0.035, 'plate'), P(-0.6, plate, 0.035, 'plate'),
    P(0.645, plate * 0.72, 0.03, 'accent'), P(-0.645, plate * 0.72, 0.03, 'accent'),
    P(0.69, 0.03, 0.05, 'metal'), P(-0.69, 0.03, 0.05, 'metal'),
  ];
}

/** скамья: центр, длина вдоль Z, высота верха */
function bench(z: number, top: number, len = 1.2, w = 0.32, x = 0): Prim[] {
  return [
    { s: 'box', size: [w, 0.07, len], p: [x, top - 0.035, z], c: 'pad' },
    { s: 'box', size: [w * 0.75, 0.04, len * 0.9], p: [x, top - 0.09, z], c: 'dark' },
    { s: 'box', size: [w * 0.9, top - 0.11, 0.05], p: [x, (top - 0.11) / 2, z - len * 0.38], c: 'dark' },
    { s: 'box', size: [w * 0.9, top - 0.11, 0.05], p: [x, (top - 0.11) / 2, z + len * 0.38], c: 'dark' },
  ];
}
const mat = (z = 0, len = 1.9): Prim[] => [{ s: 'box', size: [0.66, 0.012, len], p: [0, 0.006, z], c: 'mat' }];

/** сиденье под тазом + (опционально) спинка */
function seat(back = true, backTilt = 0): Prim[] {
  const out: Prim[] = [
    { s: 'box', size: [0.36, 0.06, 0.38], p: [0, -0.125, 0.08], c: 'pad', follow: 'hips' },
    { s: 'box', size: [0.08, 0.36, 0.08], p: [0, 0.2, 0.05], c: 'dark', follow: 'hips', axes: 'xz' },
    { s: 'box', size: [0.5, 0.04, 0.6], p: [0, 0.02, 0.05], c: 'dark', follow: 'hips', axes: 'xz' },
  ];
  if (back) out.push({ s: 'box', size: [0.32, 0.62, 0.06], p: [0, 0.22, -0.16 - backTilt * 0.004], r: [-backTilt, 0, 0], c: 'pad', follow: 'hips' });
  return out;
}

/* ---------- позы-заготовки ---------- */

const SIT: Pose = { upLeg: [-86, 0, 5], leg: [88, 0, 0] };
const HANDS_HEAD: Pose = { arm: [0, -18, 28], forearm: [0, 0, 138] };
const FEET: BoneKey[] = ['footL', 'footR', 'toeL', 'toeR'];

function squat(armsTop: Pose, armsBottom: Pose, depth = 1): (p: number) => Pose {
  const top: Pose = { hips: [3, 0, 0], upLeg: [-4, 8, 7], leg: [4, 0, 0], foot: [0, 12, 0], ...armsTop };
  const bottom: Pose = {
    hips: [36 * depth, 0, 0], spine: [-4, 0, 0], neck: [-16 * depth, 0, 0],
    upLeg: [-116 * depth, 24, 7], leg: [108 * depth, 0, 0], foot: [0, 12, 0], ...armsBottom,
  };
  return pingpong(top, bottom);
}

const BAR_BACK: Pose = { arm: [14, 0, -50], forearm: [0, 0, 126] };

export const ANIMS: Record<string, ExerciseAnim> = {
  /* ===== ноги и ягодицы ===== */
  barbell_squat: {
    pose: squat(BAR_BACK, BAR_BACK),
    duration: 3.4, ground: { bones: FEET }, pin: { bone: 'feet', x: 0, z: 0 }, flatFeet: 'both', grip: 0.85,
    props: barbell([0, 0.035, -0.02]), view: { az: 35, el: 8 }, thumb: 0.5,
  },
  hack_squat: {
    pose: (p) => {
      const k = wave(p);
      return {
        root: [-22, 0, 0], pos: mix([0, -0.05, 0.25], [0, -0.356, 0.374], k),
        upLeg: [-25 - 80 * k, 6, 6], leg: [20 + 90 * k, 0, 0], arm: [10, 0, -55], forearm: [0, 0, 130],
      };
    },
    duration: 3.4, flatFeet: 'both', feetTilt: -22, grip: 0.8,
    ik: [{ chain: 'legs', target: [0.15, 0.26, 0.44], pole: [0.15, 0.3, 1] }],
    props: [
      { s: 'box', size: [0.62, 0.05, 0.44], p: [0, 0.14, 0.46], r: [-22, 0, 0], c: 'dark' },
      { s: 'box', size: [0.4, 0.74, 0.07], p: [0, 0.22, -0.2], r: [-22, 0, 0], c: 'pad', follow: 'spine1' },
      { s: 'box', size: [0.14, 0.09, 0.2], p: [0.2, 0.08, 0.02], r: [-22, 0, 0], c: 'pad', follow: 'shoulderL' },
      { s: 'box', size: [0.14, 0.09, 0.2], p: [-0.2, 0.08, 0.02], r: [-22, 0, 0], c: 'pad', follow: 'shoulderR' },
      { s: 'cyl', size: [0.025, 2.0], p: [0.36, 0.95, -0.42], r: [-22, 0, 0], c: 'metal' },
      { s: 'cyl', size: [0.025, 2.0], p: [-0.36, 0.95, -0.42], r: [-22, 0, 0], c: 'metal' },
      { s: 'box', size: [0.9, 0.06, 1.5], p: [0, 0.03, -0.1], c: 'dark' },
    ],
    view: { az: 62, el: 8 }, thumb: 0.5,
  },
  goblet_squat: {
    pose: squat(
      { arm: [-18, 0, -80], forearm: [0, -142, 6] },
      { arm: [-26, 0, -80], forearm: [0, -142, 6] },
    ),
    duration: 3.2, ground: { bones: FEET }, pin: { bone: 'feet', x: 0, z: 0 }, flatFeet: 'both', grip: 0.9,
    props: dumbbells(), view: { az: 35, el: 8 }, thumb: 0.5,
  },
  squat_bw: {
    pose: squat(HANG, { arm: [-112, 0, -84], forearm: [0, -6, 0] }),
    duration: 2.8, ground: { bones: FEET }, pin: { bone: 'feet', x: 0, z: 0 }, flatFeet: 'both',
    view: { az: 40, el: 8 }, thumb: 0.5,
  },
  bulgarian_split: {
    pose: pingpong(
      { hips: [8, 0, 0], upLegL: [-14, 0, 2], legL: [10, 0, 0], upLegR: [22, 0, -2], legR: [70, 0, 0], footR: [55, 0, 0], ...HANG },
      { hips: [20, 0, 0], upLegL: [-104, 0, 2], legL: [98, 0, 0], upLegR: [30, 0, -2], legR: [110, 0, 0], footR: [55, 0, 0], neck: [-10, 0, 0], ...HANG },
    ),
    duration: 3.2, ground: { bones: ['footL', 'toeL'] }, pin: { bone: 'footL', x: 0.1, z: 0.12 }, flatFeet: 'L', grip: 0.9,
    ik: [{ chain: 'legR', target: [-0.1, 0.5, -0.66], pole: [0, -0.6, 1] }],
    props: [...bench(-0.8, 0.42, 0.34, 1.0), ...dumbbells()],
    view: { az: 70, el: 6 }, thumb: 0.5,
  },
  lunge: {
    pose: pingpong(
      { hips: [4, 0, 0], upLegL: [-28, 0, 2], legL: [22, 0, 0], upLegR: [20, 0, -2], legR: [25, 0, 0], footR: [40, 0, 0], arm: [14, 0, -52], forearm: [0, -55, -70] },
      { hips: [8, 0, 0], upLegL: [-96, 0, 2], legL: [92, 0, 0], upLegR: [4, 0, -2], legR: [92, 0, 0], footR: [40, 0, 0], arm: [14, 0, -52], forearm: [0, -55, -70] },
    ),
    duration: 3, ground: { bones: ['footL', 'toeL'] }, pin: { bone: 'footL', x: 0.1, z: 0.32 }, flatFeet: 'L',
    ik: [{ chain: 'legR', target: [-0.1, 0.15, -0.5], pole: [0, -0.8, 1] }],
    view: { az: 72, el: 6 }, thumb: 0.5,
  },
  romanian_deadlift: {
    pose: pingpong(
      { hips: [4, 0, 0], upLeg: [-4, 0, 3], leg: [3, 0, 0], arm: [-2, 0, -82], forearm: [0, -4, 0] },
      { hips: [70, 0, 0], spine: [2, 0, 0], neck: [-28, 0, 0], head: [-10, 0, 0], upLeg: [-84, 0, 3], leg: [20, 0, 0], arm: [-66, 0, -84], forearm: [0, -4, 0] },
    ),
    duration: 3.4, ground: { bones: FEET }, pin: { bone: 'feet', x: 0, z: 0 }, flatFeet: 'both', grip: 0.9,
    props: dumbbells(), view: { az: 72, el: 6 }, thumb: 0.5,
  },
  glute_bridge: {
    pose: pingpong(
      { root: [-90, 0, 0], upLeg: [-50, 0, 4], leg: [105, 0, 0], arm: [0, 0, -72], forearm: [0, -4, 0], neck: [6, 0, 0] },
      { root: [-117, 0, 0], upLeg: [-8, 0, 4], leg: [80, 0, 0], arm: [27, 0, -72], forearm: [0, -4, 0], neck: [26, 0, 0], spine2: [6, 0, 0] },
    ),
    duration: 3, ground: { bones: ['hips', 'spine2', 'head', 'spine1'] }, pin: { bone: 'spine2', z: -0.42 }, flatFeet: 'both',
    ik: [{ chain: 'legs', target: [0.12, 0.085, 0.5], pole: [0, 1, 0.2] }],
    props: mat(0.1), view: { az: 68, el: 10 }, thumb: 0.5,
  },
  leg_press: {
    pose: (p) => {
      const k = wave(p);
      return { root: [-52, 0, 0], pos: [0, -0.2, 0.72], upLeg: [-100 + 45 * k, 4, 5], leg: [105 - 80 * k, 0, 0], arm: [8, 0, -70], forearm: [0, -18, 0], neck: [14, 0, 0] };
    },
    duration: 3.2, flatFeet: 'both', feetTilt: -128, grip: 0.7,
    ik: [{ chain: 'legs', target: (p) => mix([0.13, 0.6, 0.3], [0.13, 0.83, 0.59], wave(p)), pole: [0.2, 1, 0.2] }],
    props: [
      { s: 'box', size: [0.4, 0.08, 0.36], p: [0, -0.1, 0.04], r: [12, 0, 0], c: 'pad', follow: 'hips' },
      { s: 'box', size: [0.38, 0.8, 0.08], p: [0, -0.13, -0.02], r: [-52, 0, 0], c: 'pad', follow: 'spine1' },
      { s: 'box', size: [0.62, 0.5, 0.05], p: [0, 0.03, 0.1], r: [-38, 0, 0], c: 'dark', follow: 'feet' },
      { s: 'cyl', size: [0.025, 1.7], p: [0.36, 0.72, 0.5], r: [52, 0, 0], c: 'metal' },
      { s: 'cyl', size: [0.025, 1.7], p: [-0.36, 0.72, 0.5], r: [52, 0, 0], c: 'metal' },
      { s: 'box', size: [0.86, 0.06, 1.7], p: [0, 0.03, 0.1], c: 'dark' },
      { s: 'box', size: [0.5, 0.26, 0.5], p: [0, 0.14, -0.1], c: 'dark' },
    ],
    view: { az: 72, el: 8 }, thumb: 0.15,
  },
  kickback: {
    pose: pingpong(
      { hips: [24, 0, 0], neck: [-14, 0, 0], upLegL: [-26, 0, 2], legL: [6, 0, 0], upLegR: [-30, 0, 0], legR: [22, 0, 0], footR: [10, 0, 0], arm: [-70, 0, -80], forearm: [0, -30, 0] },
      { hips: [28, 0, 0], neck: [-14, 0, 0], upLegL: [-30, 0, 2], legL: [6, 0, 0], upLegR: [24, 0, 0], legR: [8, 0, 0], footR: [30, 0, 0], arm: [-70, 0, -80], forearm: [0, -30, 0] },
    ),
    duration: 2.8, ground: { bones: ['footL', 'toeL'] }, pin: { bone: 'footL', x: 0.09, z: 0 }, flatFeet: 'L', grip: 0.8,
    ik: [{ chain: 'arms', target: [0.2, 1.02, 0.52], pole: [0.4, -1, -0.4] }],
    props: [
      { s: 'cyl', size: [0.018, 0.6], p: [0, 1.0, 0.56], r: [0, 0, 90], c: 'metal' },
      { s: 'cyl', size: [0.03, 1.9], p: [0, 0.95, 0.72], c: 'dark' },
      { s: 'box', size: [0.5, 0.05, 0.5], p: [0, 0.025, 0.7], c: 'dark' },
      { s: 'box', size: [0.16, 0.5, 0.1], p: [0, 0.4, 0.74], c: 'plate' },
      { s: 'cable', size: [0.006], p: [0, 0.12, 0.66], c: 'metal', follow: 'footR' },
      { s: 'cyl', size: [0.05, 0.05], p: [0, 0.02, 0], c: 'accent', follow: 'footR' },
    ],
    view: { az: 78, el: 6 }, thumb: 0.5,
  },
  leg_curl: {
    pose: pingpong(
      { root: [90, 0, 0], pos: [0, 0.66, -0.9], leg: [6, 0, 0], foot: [-10, 0, 0], neck: [-30, 0, 0], arm: [-128, 0, -62], forearm: [0, -80, 0] },
      { root: [90, 0, 0], pos: [0, 0.66, -0.9], leg: [112, 0, 0], foot: [-10, 0, 0], neck: [-30, 0, 0], arm: [-128, 0, -62], forearm: [0, -80, 0] },
    ),
    duration: 2.8, grip: 0.7,
    props: [
      ...bench(0.2, 0.56, 1.4, 0.4),
      { s: 'cyl', size: [0.055, 0.42], p: [0, -0.02, -0.1], r: [0, 0, 90], c: 'pad', follow: 'feet' },
      { s: 'box', size: [0.2, 0.5, 0.2], p: [0, 0.25, -0.42], c: 'plate' },
    ],
    view: { az: 78, el: 10 }, thumb: 0.5,
  },
  leg_extension: {
    pose: pingpong(
      { root: [-8, 0, 0], pos: [0, -0.3, 0.13], upLeg: [-80, 0, 4], leg: [96, 0, 0], arm: [12, 0, -70], forearm: [0, -24, 0] },
      { root: [-8, 0, 0], pos: [0, -0.3, 0.13], upLeg: [-80, 0, 4], leg: [8, 0, 0], foot: [-14, 0, 0], arm: [12, 0, -70], forearm: [0, -24, 0] },
    ),
    duration: 2.8, grip: 0.7,
    props: [
      { s: 'box', size: [0.4, 0.07, 0.46], p: [0, 0.5, 0.2], c: 'pad' },
      { s: 'box', size: [0.36, 0.66, 0.07], p: [0, 0.88, -0.1], r: [-8, 0, 0], c: 'pad' },
      { s: 'box', size: [0.3, 0.46, 0.3], p: [0, 0.23, 0.12], c: 'dark' },
      { s: 'box', size: [0.6, 0.04, 0.8], p: [0, 0.02, 0.15], c: 'dark' },
      { s: 'cyl', size: [0.055, 0.42], p: [0, 0.0, 0.1], r: [0, 0, 90], c: 'pad', follow: 'feet' },
      { s: 'box', size: [0.2, 0.6, 0.16], p: [0.42, 0.3, -0.05], c: 'plate' },
    ],
    view: { az: 62, el: 8 }, thumb: 0.5,
  },

  /* ===== пресс ===== */
  crunch: {
    pose: pingpong(
      { root: [-90, 0, 0], upLeg: [-55, 0, 4], leg: [105, 0, 0], neck: [8, 0, 0], ...HANDS_HEAD },
      { root: [-90, 0, 0], upLeg: [-55, 0, 4], leg: [105, 0, 0], spine: [20, 0, 0], spine1: [22, 0, 0], spine2: [16, 0, 0], neck: [14, 0, 0], ...HANDS_HEAD },
    ),
    duration: 2.6, ground: { bones: ['hips', 'spine'] }, pin: { bone: 'hips', z: 0 }, flatFeet: 'both',
    ik: [{ chain: 'legs', target: [0.12, 0.085, 0.52], pole: [0, 1, 0.2] }],
    props: mat(-0.2), view: { az: 66, el: 12 }, thumb: 0.5,
  },
  plank: {
    pose: (p) => {
      const b = Math.sin(p * TAU);
      return {
        root: [78.5, 0, 0], spine: [1.5 * b, 0, 0], spine1: [-1.5 * b, 0, 0], neck: [-18, 0, 0],
        arm: [-80, 0, -84], forearm: [0, -88, 0], foot: [-62, 0, 0], toe: [-40, 0, 0],
      };
    },
    duration: 4, ground: { bones: ['toeL', 'toeR', 'forearmL', 'forearmR'] }, pin: { bone: 'toes', z: -0.75 },
    props: mat(-0.05), view: { az: 70, el: 10 }, thumb: 0.25,
  },
  leg_raise: {
    pose: pingpong(
      { root: [-90, 0, 0], upLeg: [-8, 0, 2], leg: [4, 0, 0], foot: [28, 0, 0], arm: [0, 0, -74], neck: [6, 0, 0] },
      { root: [-90, 0, 0], upLeg: [-88, 0, 2], leg: [6, 0, 0], foot: [28, 0, 0], arm: [0, 0, -74], neck: [6, 0, 0] },
    ),
    duration: 3, ground: { bones: ['hips', 'spine2', 'head'] }, pin: { bone: 'hips', z: 0 },
    props: mat(-0.05), view: { az: 66, el: 12 }, thumb: 0.5,
  },
  bicycle: {
    pose: (p) => {
      const s = Math.sin(p * TAU);
      return {
        root: [-90, 0, 0], spine: [18, 0, 0], spine1: [16, -16 * s, 0], spine2: [10, -16 * s, 0], neck: [14, 0, 0],
        upLegL: [-56 - 38 * s, 0, 3], legL: [56 + 46 * s, 0, 0],
        upLegR: [-56 + 38 * s, 0, -3], legR: [56 - 46 * s, 0, 0],
        ...HANDS_HEAD,
      };
    },
    duration: 2.4, ground: { bones: ['hips', 'spine'] }, pin: { bone: 'hips', z: 0 },
    props: mat(-0.2), view: { az: 62, el: 14 }, thumb: 0.25,
  },
  reverse_crunch: {
    pose: pingpong(
      { root: [-90, 0, 0], hips: [0, 0, 0], spine: [0, 0, 0], upLeg: [-88, 0, 2], leg: [88, 0, 0], arm: [0, 0, -72], neck: [6, 0, 0] },
      { root: [-90, 0, 0], hips: [-34, 0, 0], spine: [34, 0, 0], upLeg: [-108, 0, 2], leg: [96, 0, 0], arm: [0, 0, -72], neck: [6, 0, 0] },
    ),
    duration: 2.8, ground: { bones: ['hips', 'spine1', 'spine2', 'head'] }, pin: { bone: 'spine2', z: -0.4 },
    props: mat(-0.1), view: { az: 66, el: 12 }, thumb: 0.5,
  },

  /* ===== руки и плечи ===== */
  shoulder_press: {
    pose: pingpong(
      { ...SIT, arm: [0, -8, -18], forearm: [0, 0, 104] },
      { ...SIT, arm: [0, -4, 74], forearm: [0, 0, 12] },
    ),
    duration: 2.8, ground: { bones: FEET }, pin: { bone: 'hips', x: 0, z: 0 }, flatFeet: 'both', grip: 0.9,
    props: [...seat(true), ...dumbbells()], view: { az: 28, el: 8 }, thumb: 0.5,
  },
  front_raise: {
    pose: pingpong(
      { arm: [-4, 0, -80], forearm: [0, -8, 0] },
      { arm: [-88, 0, -84], forearm: [0, -8, 0] },
    ),
    duration: 2.8, ground: { bones: FEET }, pin: { bone: 'feet', x: 0, z: 0 }, grip: 0.9,
    props: dumbbells(), view: { az: 48, el: 8 }, thumb: 0.5,
  },
  lateral_raise: {
    pose: pingpong(
      { arm: [-4, 0, -78], forearm: [0, -14, 0] },
      { arm: [-4, 0, -4], forearm: [0, -14, 0] },
    ),
    duration: 2.8, ground: { bones: FEET }, pin: { bone: 'feet', x: 0, z: 0 }, grip: 0.9,
    props: dumbbells(), view: { az: 20, el: 8 }, thumb: 0.5,
  },
  triceps_extension: {
    pose: pingpong(
      { arm: [0, 0, 80], forearm: [0, 118, 0] },
      { arm: [0, 0, 80], forearm: [0, 8, 0] },
    ),
    duration: 2.8, ground: { bones: FEET }, pin: { bone: 'feet', x: 0, z: 0 }, grip: 0.5,
    props: gobletBell([0, 0.02, 0]), view: { az: 65, el: 8 }, thumb: 0.05,
  },
  biceps_curl: {
    pose: pingpong(
      { arm: [4, 0, -80], forearm: [0, -8, 0] },
      { arm: [2, 0, -80], forearm: [0, -138, 0] },
    ),
    duration: 2.6, ground: { bones: FEET }, pin: { bone: 'feet', x: 0, z: 0 }, grip: 0.9,
    props: dumbbells(), view: { az: 50, el: 8 }, thumb: 0.5,
  },

  /* ===== спина ===== */
  lat_pulldown: {
    pose: pingpong(
      { ...SIT, hips: [-4, 0, 0], arm: [0, 0, 62], forearm: [0, 0, 8] },
      { ...SIT, hips: [-14, 0, 0], spine2: [-6, 0, 0], arm: [0, 14, -30], forearm: [0, 0, 120] },
    ),
    duration: 3, ground: { bones: FEET }, pin: { bone: 'hips', x: 0, z: 0 }, flatFeet: 'both', grip: 0.9,
    ik: [{ chain: 'arms', target: (p) => mix([0.38, 1.5, 0.06], [0.36, 1.04, 0.1], wave(p)), pole: [1, -1, -0.5] }],
    props: [
      ...seat(false),
      { s: 'cyl', size: [0.014, 1.1], p: [0, 0.02, 0], r: [0, 0, 90], c: 'metal', follow: 'hands' },
      { s: 'cable', size: [0.006], p: [0, 2.25, 0.1], c: 'metal', follow: 'hands' },
      { s: 'cyl', size: [0.06, 0.4], p: [0, 0.16, 0.26], r: [0, 0, 90], c: 'pad', follow: 'hips' },
      { s: 'cyl', size: [0.035, 2.3], p: [0, 1.15, 0.62], c: 'dark' },
      { s: 'box', size: [0.1, 0.06, 0.62], p: [0, 2.28, 0.34], c: 'dark' },
      { s: 'box', size: [0.24, 0.7, 0.14], p: [0, 0.4, 0.66], c: 'plate' },
    ],
    view: { az: 150, el: 8 }, thumb: 0.5,
  },
  seated_row: {
    pose: pingpong(
      { hips: [10, 0, 0], upLeg: [-88, 0, 3], leg: [26, 0, 0], arm: [-80, 0, -80], forearm: [0, -6, 0] },
      { hips: [-6, 0, 0], spine2: [-6, 0, 0], upLeg: [-74, 0, 3], leg: [26, 0, 0], arm: [20, 0, -74], forearm: [0, -100, 0] },
    ),
    duration: 3, ground: { bones: ['hips'], y: 0.3 }, pin: { bone: 'hips', x: 0, z: 0 }, flatFeet: 'both', feetTilt: -62, grip: 0.9,
    ik: [
      { chain: 'legs', target: [0.12, 0.44, 0.76], pole: [0.1, 1, 0] },
      { chain: 'arms', target: (p) => mix([0.09, 0.76, 0.6], [0.1, 0.7, 0.2], wave(p)), pole: [0.5, -0.6, -1] },
    ],
    props: [
      { s: 'box', size: [0.34, 0.06, 0.5], p: [0, 0.27, 0.02], c: 'pad' },
      { s: 'box', size: [0.2, 0.24, 1.5], p: [0, 0.12, 0.4], c: 'dark' },
      { s: 'box', size: [0.5, 0.3, 0.04], p: [0, 0.46, 0.88], r: [-28, 0, 0], c: 'dark' },
      { s: 'cyl', size: [0.012, 0.3], p: [0, 0, 0.03], r: [0, 0, 90], c: 'metal', follow: 'hands' },
      { s: 'cable', size: [0.006], p: [0, 0.76, 1.22], c: 'metal', follow: 'hands' },
      { s: 'cyl', size: [0.035, 1.5], p: [0, 0.75, 1.25], c: 'dark' },
      { s: 'box', size: [0.24, 0.6, 0.14], p: [0, 0.3, 1.36], c: 'plate' },
    ],
    view: { az: 75, el: 8 }, thumb: 0.5,
  },
  dumbbell_row: {
    pose: pingpong(
      { hips: [64, 0, 0], neck: [-30, 0, 0], upLeg: [-78, 0, 5], leg: [22, 0, 0], armL: [-60, 0, -70], forearmL: [0, -20, 0], armR: [-64, 0, 82], forearmR: [0, 6, 0] },
      { hips: [64, -8, 0], neck: [-30, 0, 0], upLeg: [-78, 0, 5], leg: [22, 0, 0], armL: [-60, 0, -70], forearmL: [0, -20, 0], armR: [18, 0, 76], forearmR: [0, 96, 0] },
    ),
    duration: 2.8, ground: { bones: FEET }, pin: { bone: 'feet', x: 0, z: 0 }, flatFeet: 'both', grip: 0.9,
    ik: [{ chain: 'armL', target: [0.24, 0.5, 0.6], pole: [0.5, 0.2, -1] }],
    props: [...bench(0.78, 0.46, 1.1, 0.3, 0.24), ...dumbbell('R')],
    view: { az: -70, el: 8 }, thumb: 0.5,
  },
  hyperextension: {
    pose: pingpong(
      { root: [38, 0, 0], hips: [62, 0, 0], upLeg: [-62, 0, 2], leg: [3, 0, 0], spine: [6, 0, 0], neck: [-6, 0, 0], arm: [-38, 0, -70], forearm: [0, -128, 20] },
      { root: [38, 0, 0], hips: [0, 0, 0], upLeg: [0, 0, 2], leg: [3, 0, 0], neck: [-16, 0, 0], arm: [-38, 0, -70], forearm: [0, -128, 20] },
    ),
    duration: 3.2, ground: { bones: ['toeL', 'toeR'], y: 0.14 }, pin: { bone: 'feet', x: 0, z: -0.3 },
    props: [
      { s: 'box', size: [0.36, 0.1, 0.34], p: [0, -0.02, 0.2], r: [38, 0, 0], c: 'pad', follow: 'upLegL', axes: 'yz' },
      { s: 'cyl', size: [0.05, 0.42], p: [0, 0.06, -0.12], r: [0, 0, 90], c: 'pad', follow: 'feet' },
      { s: 'box', size: [0.46, 0.04, 0.3], p: [0, 0.1, -0.24], r: [38, 0, 0], c: 'dark' },
      { s: 'cyl', size: [0.03, 1.2], p: [0, 0.42, 0.08], r: [52, 0, 0], c: 'dark' },
      { s: 'cyl', size: [0.03, 0.7], p: [0, 0.34, 0.42], c: 'dark' },
      { s: 'box', size: [0.6, 0.05, 1.3], p: [0, 0.025, 0.05], c: 'dark' },
    ],
    view: { az: 72, el: 8 }, thumb: 0.92,
  },

  /* ===== грудь ===== */
  dumbbell_bench_press: {
    pose: pingpong(
      { root: [-90, 0, 0], upLeg: [-40, 0, 16], leg: [80, 0, 0], neck: [4, 0, 0], arm: [0, 16, -28], forearm: [0, -104, 0] },
      { root: [-90, 0, 0], upLeg: [-40, 0, 16], leg: [80, 0, 0], neck: [4, 0, 0], arm: [0, -84, -8], forearm: [0, -6, 0] },
    ),
    duration: 2.8, ground: { bones: ['hips', 'spine2', 'head'], y: 0.46 }, pin: { bone: 'hips', z: 0.3 }, flatFeet: 'both', grip: 0.9,
    ik: [{ chain: 'legs', target: [0.26, 0.085, 0.76], pole: [0.3, 1, 0.3] }],
    props: [...bench(-0.2, 0.46, 1.25), ...dumbbells()],
    view: { az: 58, el: 14 }, thumb: 0.5,
  },
  dumbbell_fly: {
    pose: pingpong(
      { root: [-90, 0, 0], upLeg: [-40, 0, 16], leg: [80, 0, 0], neck: [4, 0, 0], arm: [0, 14, -4], forearm: [0, -24, 0] },
      { root: [-90, 0, 0], upLeg: [-40, 0, 16], leg: [80, 0, 0], neck: [4, 0, 0], arm: [0, -80, -4], forearm: [0, -16, 0] },
    ),
    duration: 3, ground: { bones: ['hips', 'spine2', 'head'], y: 0.46 }, pin: { bone: 'hips', z: 0.3 }, flatFeet: 'both', grip: 0.9,
    ik: [{ chain: 'legs', target: [0.26, 0.085, 0.76], pole: [0.3, 1, 0.3] }],
    props: [...bench(-0.2, 0.46, 1.25), ...dumbbells()],
    view: { az: 40, el: 18 }, thumb: 0.1,
  },
  chest_press_machine: {
    pose: pingpong(
      { ...SIT, arm: [0, 18, -30], forearm: [0, -108, 0] },
      { ...SIT, arm: [0, -72, -14], forearm: [0, -10, 0] },
    ),
    duration: 2.8, ground: { bones: FEET }, pin: { bone: 'hips', x: 0, z: 0 }, flatFeet: 'both', grip: 0.9,
    props: [
      ...seat(true),
      { s: 'cyl', size: [0.016, 0.16], p: [0, 0, 0.02], c: 'accent', follow: 'handL' },
      { s: 'cyl', size: [0.016, 0.16], p: [0, 0, 0.02], c: 'accent', follow: 'handR' },
      { s: 'cable', size: [0.014], p: [0.3, 1.5, -0.2], c: 'metal', follow: 'handL' },
      { s: 'cable', size: [0.014], p: [-0.3, 1.5, -0.2], c: 'metal', follow: 'handR' },
      { s: 'box', size: [0.7, 1.6, 0.1], p: [0, 0.8, -0.32], c: 'dark' },
      { s: 'box', size: [0.26, 0.7, 0.16], p: [0, 0.4, -0.46], c: 'plate' },
    ],
    view: { az: 52, el: 8 }, thumb: 0.5,
  },
  pushup: {
    pose: (p) => {
      const k = wave(p);
      return {
        root: [65 + 16 * k, 0, 0], neck: [-22, 0, 0], foot: [-58, 0, 0], toe: [-40, 0, 0],
        arm: [-78, 0, -70], forearm: [0, -10 - 80 * k, 0], hand: [0, 0, 62],
      };
    },
    duration: 2.8, ground: { bones: ['toeL', 'toeR'] }, pin: { bone: 'toes', z: -0.75 },
    ik: [{ chain: 'arms', target: [0.27, 0.035, 0.5], pole: [0.7, 0.4, -1] }],
    props: mat(-0.05, 2.0), view: { az: 66, el: 10 }, thumb: 0.5,
  },

  /* ===== кардио и растяжка ===== */
  walking: {
    pose: (p) => {
      const leg = (ph: number) => {
        const s = Math.sin(ph * TAU), c = Math.max(0, Math.cos(ph * TAU));
        return { up: [-22 * s - 3, 0, 2] as V3, lo: [8 + 46 * c ** 1.5, 0, 0] as V3, ft: [8 * s, 0, 0] as V3 };
      };
      const L = leg(p), R = leg(p + 0.5);
      const s = Math.sin(p * TAU);
      return {
        hips: [3, 4 * s, 0], spine1: [0, -6 * s, 0],
        upLegL: L.up, legL: L.lo, footL: L.ft, upLegR: [R.up[0], 0, -2], legR: R.lo, footR: R.ft,
        armL: [22 * s, 0, -80], forearmL: [0, -22, 0], armR: [-22 * s, 0, 80], forearmR: [0, 22, 0],
      };
    },
    duration: 1.2, ground: { bones: FEET }, pin: { bone: 'hips', x: 0, z: 0 },
    view: { az: 62, el: 8 }, thumb: 0.25,
  },
  running: {
    pose: (p) => {
      const leg = (ph: number) => {
        const s = Math.sin(ph * TAU), c = Math.max(0, Math.cos(ph * TAU));
        return { up: [-38 * s - 12, 0, 2] as V3, lo: [18 + 82 * c ** 1.3, 0, 0] as V3, ft: [16 * s + 8, 0, 0] as V3 };
      };
      const L = leg(p), R = leg(p + 0.5);
      const s = Math.sin(p * TAU);
      return {
        hips: [10, 6 * s, 0], spine1: [0, -10 * s, 0], neck: [-6, 0, 0],
        pos: [0, 0.04 * Math.abs(Math.cos(p * TAU)), 0],
        upLegL: L.up, legL: L.lo, footL: L.ft, upLegR: [R.up[0], 0, -2], legR: R.lo, footR: R.ft,
        armL: [38 * s, 0, -80], forearmL: [0, -92, 0], armR: [-38 * s, 0, 80], forearmR: [0, 92, 0],
      };
    },
    duration: 0.8, ground: { bones: FEET }, pin: { bone: 'hips', x: 0, z: 0 }, grip: 0.6,
    view: { az: 62, el: 8 }, thumb: 0.22,
  },
  bike: {
    pose: () => ({ pos: [0, 0.03, -0.1], hips: [34, 0, 0], spine: [4, 0, 0], neck: [-26, 0, 0], upLeg: [-80, 0, 3], leg: [80, 0, 0], arm: [-62, 0, -80], forearm: [0, -20, 0] }),
    duration: 1.4, grip: 0.9, flatFeet: 'both', feetTilt: 12,
    ik: [
      { chain: 'legL', target: (p) => [0.13, 0.42 + 0.16 * Math.sin(p * TAU), 0.2 + 0.16 * Math.cos(p * TAU)], pole: [0.1, 0.4, 1] },
      { chain: 'legR', target: (p) => [-0.13, 0.42 - 0.16 * Math.sin(p * TAU), 0.2 - 0.16 * Math.cos(p * TAU)], pole: [-0.1, 0.4, 1] },
      { chain: 'arms', target: [0.2, 1.12, 0.52], pole: [0.5, -1, -0.5] },
    ],
    props: [
      { s: 'box', size: [0.22, 0.06, 0.28], p: [0, 0.82, -0.12], c: 'pad' },
      { s: 'cyl', size: [0.025, 0.6], p: [0, 0.54, -0.06], r: [-10, 0, 0], c: 'metal' },
      { s: 'cyl', size: [0.03, 0.9], p: [0, 0.4, 0.28], r: [62, 0, 0], c: 'dark' },
      { s: 'cyl', size: [0.025, 0.8], p: [0, 0.76, 0.6], r: [-12, 0, 0], c: 'metal' },
      { s: 'cyl', size: [0.016, 0.5], p: [0, 1.11, 0.54], r: [0, 0, 90], c: 'dark' },
      { s: 'cyl', size: [0.24, 0.06], p: [0, 0.36, 0.72], r: [0, 0, 90], c: 'plate' },
      { s: 'cyl', size: [0.1, 0.03], p: [0, 0.34, 0.2], r: [0, 0, 90], c: 'accent' },
      { s: 'box', size: [0.5, 0.04, 0.08], p: [0, 0.02, -0.25], c: 'dark' },
      { s: 'box', size: [0.5, 0.04, 0.08], p: [0, 0.02, 0.85], c: 'dark' },
      { s: 'box', size: [0.06, 0.05, 1.1], p: [0, 0.06, 0.3], c: 'dark' },
      { s: 'box', size: [0.1, 0.025, 0.2], p: [0.01, -0.09, 0.06], c: 'dark', follow: 'footL' },
      { s: 'box', size: [0.1, 0.025, 0.2], p: [-0.01, -0.09, 0.06], c: 'dark', follow: 'footR' },
    ],
    view: { az: 68, el: 8 }, thumb: 0.3,
  },
  elliptical: {
    pose: (p) => {
      const s = Math.sin(p * TAU);
      return { pos: [0, 0.14, 0], hips: [8, 5 * s, 0], spine1: [0, -8 * s, 0], upLeg: [-20, 0, 3], leg: [30, 0, 0], arm: [-50, 0, -78], forearm: [0, -50, 0] };
    },
    duration: 1.6, grip: 0.9, flatFeet: 'both',
    ik: [
      { chain: 'legL', target: (p) => [0.13, 0.3 + 0.07 * Math.sin(p * TAU), 0.02 + 0.24 * Math.cos(p * TAU)], pole: [0, 0.2, 1] },
      { chain: 'legR', target: (p) => [-0.13, 0.3 - 0.07 * Math.sin(p * TAU), 0.02 - 0.24 * Math.cos(p * TAU)], pole: [0, 0.2, 1] },
      { chain: 'armL', target: (p) => [0.24, 1.22, 0.36 - 0.13 * Math.cos(p * TAU)], pole: [0.6, -1, -0.6] },
      { chain: 'armR', target: (p) => [-0.24, 1.22, 0.36 + 0.13 * Math.cos(p * TAU)], pole: [-0.6, -1, -0.6] },
    ],
    props: [
      { s: 'box', size: [0.12, 0.03, 0.34], p: [0.01, -0.095, 0.05], c: 'dark', follow: 'footL' },
      { s: 'box', size: [0.12, 0.03, 0.34], p: [-0.01, -0.095, 0.05], c: 'dark', follow: 'footR' },
      { s: 'cable', size: [0.016], p: [0.24, 0.2, 0.62], c: 'metal', follow: 'handL' },
      { s: 'cable', size: [0.016], p: [-0.24, 0.2, 0.62], c: 'metal', follow: 'handR' },
      { s: 'cable', size: [0.014], p: [0.13, 0.18, 0.7], c: 'metal', follow: 'footL' },
      { s: 'cable', size: [0.014], p: [-0.13, 0.18, 0.7], c: 'metal', follow: 'footR' },
      { s: 'cyl', size: [0.26, 0.12], p: [0, 0.32, 0.86], r: [0, 0, 90], c: 'plate' },
      { s: 'cyl', size: [0.03, 1.3], p: [0, 0.8, 0.74], r: [-8, 0, 0], c: 'dark' },
      { s: 'box', size: [0.24, 0.14, 0.04], p: [0, 1.46, 0.64], r: [-30, 0, 0], c: 'accent' },
      { s: 'box', size: [0.56, 0.05, 1.5], p: [0, 0.025, 0.3], c: 'dark' },
    ],
    view: { az: 64, el: 8 }, thumb: 0.2,
  },
  stretch_forward: {
    pose: pingpong(
      { hips: [-4, 0, 0], upLeg: [-86, 0, 4], leg: [3, 0, 0], foot: [-12, 0, 0], arm: [-30, 0, -80], forearm: [0, -20, 0] },
      { hips: [42, 0, 0], spine: [16, 0, 0], spine1: [12, 0, 0], neck: [10, 0, 0], upLeg: [-128, 0, 4], leg: [5, 0, 0], foot: [-12, 0, 0], arm: [-96, 0, -84], forearm: [0, -6, 0] },
      0.2,
    ),
    duration: 6, ground: { bones: ['hips', 'footL', 'footR', 'legL'] }, pin: { bone: 'hips', z: -0.3 },
    props: mat(0.2), view: { az: 68, el: 10 }, thumb: 0.5,
  },
  stretch_side: {
    pose: (p) => {
      const s = Math.sin(p * TAU);
      const k = smooth(Math.abs(s)) * Math.sign(s); // >0 — наклон влево (к +X)
      const up = (x: number) => Math.max(0, x);
      return {
        upLeg: [0, 0, 11], leg: [2, 0, 0],
        spine: [0, 0, -9 * k], spine1: [0, 0, -11 * k], spine2: [0, 0, -9 * k], neck: [0, 0, -8 * k],
        armL: [0, 0, -76 + 20 * up(k) ], forearmL: [0, -12, 0],
        armR: [0, 0, 76 - 20 * up(-k)], forearmR: [0, 12, 0],
        ...(k > 0 ? { armR: [0, 0, 76 - 158 * up(k)] as V3, forearmR: [0, 0, -24 * up(k)] as V3 } : { armL: [0, 0, -76 + 158 * up(-k)] as V3, forearmL: [0, 0, 24 * up(-k)] as V3 }),
      };
    },
    duration: 7, ground: { bones: FEET }, pin: { bone: 'feet', x: 0, z: 0 }, flatFeet: 'both',
    view: { az: 8, el: 8 }, thumb: 0.25,
  },
};

/** Нейтральные позы для обложек и карты мышц (не упражнения). */
export const POSES: Record<string, ExerciseAnim> = {
  stand: { pose: () => ({ ...HANG, upLeg: [0, 0, 3] }), duration: 4, ground: { bones: FEET }, pin: { bone: 'feet', x: 0, z: 0 }, view: { az: 0, el: 4 } },
  hero: {
    pose: (p) => {
      const b = Math.sin(p * TAU);
      return {
        hips: [0, 6, -4], spine: [-2, -4, 3], spine2: [-3 + b, 0, 2], neck: [-14, 8, 0], head: [-6, 4, 0],
        upLegL: [-2, 0, 6], legL: [2, 0, 0], upLegR: [-10, -14, 2], legR: [16, 0, 0],
        armL: [10, 0, -50], forearmL: [0, -55, -72], armR: [4, 0, 76], forearmR: [0, 14, 0],
      };
    },
    duration: 5, ground: { bones: FEET }, pin: { bone: 'footL', x: 0.08, z: 0 }, flatFeet: 'L', view: { az: 24, el: 4 },
  },
};

export const getAnim = (id: string): ExerciseAnim | undefined => ANIMS[id] ?? POSES[id];
