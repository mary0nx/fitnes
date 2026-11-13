/**
 * Позы скелета — чистые данные без зависимости от three.js,
 * чтобы описания анимаций не тянули 3D-движок в основной бандл.
 */

export type V3 = [number, number, number];

export const SIDE = ['shoulder', 'arm', 'forearm', 'hand', 'upLeg', 'leg', 'foot', 'toe'] as const;
export const CENTER = ['hips', 'spine', 'spine1', 'spine2', 'neck', 'head'] as const;
type SideBase = (typeof SIDE)[number];
type CenterKey = (typeof CENTER)[number];
export type BoneKey = CenterKey | `${SideBase}L` | `${SideBase}R`;

/** Поза: углы Эйлера в градусах (порядок XYZ) в T-системе. Ключ без L/R — обе стороны зеркально. */
export type Pose = Partial<Record<BoneKey | SideBase, V3>> & {
  /** поворот всего тела (YXZ), градусы */
  root?: V3;
  /** смещение тела в метрах (до «заземления») */
  pos?: V3;
};


/* ---------- интерполяция поз ---------- */

const POSE_KEYS = ['root', 'pos', ...CENTER, ...SIDE, ...SIDE.flatMap((s) => [`${s}L`, `${s}R`])] as (keyof Pose)[];

export function lerpPose(a: Pose, b: Pose, t: number): Pose {
  const out: Pose = {};
  for (const k of POSE_KEYS) {
    let av = a[k] as V3 | undefined;
    let bv = b[k] as V3 | undefined;
    if (!av && !bv) continue;
    // если одна из поз задаёт сторону явно, а другая — общим ключом, берём общий с зеркалом
    if (!av || !bv) {
      const m = /^(.*)([LR])$/.exec(k as string);
      const sym = m && (SIDE as readonly string[]).includes(m[1]) ? (m[1] as SideBase) : null;
      const fallback = (p: Pose): V3 => {
        if (sym && p[sym]) {
          const s = p[sym]!;
          return m![2] === 'R' ? [s[0], -s[1], -s[2]] : s;
        }
        return [0, 0, 0];
      };
      av = av ?? fallback(a);
      bv = bv ?? fallback(b);
    }
    (out as Record<string, V3>)[k as string] = [
      av[0] + (bv[0] - av[0]) * t,
      av[1] + (bv[1] - av[1]) * t,
      av[2] + (bv[2] - av[2]) * t,
    ];
  }
  // если есть и общий ключ, и явные L/R — явные главнее (Rig.apply так и работает),
  // но для R, заданного явно только в одной позе, нужно убрать зеркалирование общего ключа
  return out;
}

export const smooth = (t: number) => t * t * t * (t * (t * 6 - 15) + 10);

export function mergePose(base: Pose, over: Pose): Pose {
  return { ...base, ...over };
}
