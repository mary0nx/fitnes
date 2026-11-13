import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { clone as cloneSkinned } from 'three/examples/jsm/utils/SkeletonUtils.js';

/**
 * Риг 3D-модели.
 *
 * Модель — скелетная (GLB, Mixamo-совместимый скелет). Позы описываются не в локальных осях
 * костей, а в «T-системе»: осях персонажа в T-позе (X — влево от персонажа, Y — вверх,
 * Z — вперёд), которые наследуются по иерархии. Это делает позы независимыми от
 * конкретной ориентации костей в файле: любую Mixamo-совместимую модель можно
 * подставить без переписывания анимаций.
 */

import { CENTER, SIDE, type BoneKey, type Pose, type V3 } from './pose';
export type { BoneKey, Pose, V3 } from './pose';

/** Имена костей: Mixamo (LeftUpLeg …) и 3ds Max Biped (Bip01_L_Thigh …). */
const NAME: Record<string, string> = {
  hips: 'Hips', spine: 'Spine', spine1: 'Spine1', spine2: 'Spine2', neck: 'Neck', head: 'Head',
  shoulder: 'Shoulder', arm: 'Arm', forearm: 'ForeArm', hand: 'Hand',
  upLeg: 'UpLeg', leg: 'Leg', foot: 'Foot', toe: 'ToeBase',
};
const BIPED: Record<string, string> = {
  hips: 'Pelvis', spine: 'Spine', spine1: 'Spine1', spine2: 'Spine2', neck: 'Neck', head: 'Head',
  shoulder: 'Clavicle', arm: 'UpperArm', forearm: 'Forearm', hand: 'Hand',
  upLeg: 'Thigh', leg: 'Calf', foot: 'Foot', toe: 'Toe0',
};

export const ALL_BONES: BoneKey[] = [
  ...CENTER,
  ...SIDE.flatMap((s) => [`${s}L`, `${s}R`] as BoneKey[]),
];

const D2R = Math.PI / 180;
const _e = new THREE.Euler();
const _q = new THREE.Quaternion();
const _q2 = new THREE.Quaternion();
const _v = new THREE.Vector3();

interface BoneInfo {
  bone: THREE.Bone;
  bindLocal: THREE.Quaternion;
  bindWorld: THREE.Quaternion;
  parentBindWorld: THREE.Quaternion;
  parentBindWorldInv: THREE.Quaternion;
}

let gltfPromise: Promise<THREE.Group> | null = null;

export const MODEL_URL = `${import.meta.env.BASE_URL}models/athlete.glb`;
export const MODEL_HEIGHT = 1.68;

/** Загрузка модели (один раз на приложение). */
export function loadModel(url = MODEL_URL): Promise<THREE.Group> {
  if (!gltfPromise) {
    const loader = new GLTFLoader();
    // режим preview: хостинг предпросмотра не отдаёт .glb, модель лежит рядом как base64 в JSON
    gltfPromise = (import.meta.env.MODE === 'preview'
      ? fetch(url.replace(/\.glb$/, '.json')).then((r) => r.json()).then((j: { glb: string }) => {
        const bin = atob(j.glb);
        const buf = new Uint8Array(bin.length);
        for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
        return loader.parseAsync(buf.buffer, '');
      })
      : loader.loadAsync(url)).then((g) => g.scene);
    gltfPromise.catch(() => { gltfPromise = null; });
  }
  return gltfPromise;
}

export interface GroundSpec { bones: BoneKey[]; y?: number }
export interface PinSpec { bone: BoneKey | 'feet' | 'hands' | 'toes'; x?: number; z?: number }
export type Chain = 'legL' | 'legR' | 'armL' | 'armR';
export interface IKGoal { chain: Chain; target: V3; pole?: V3 }
export interface ApplyOptions {
  ground?: GroundSpec;
  pin?: PinSpec;
  /** стопы параллельно опоре */
  flatFeet?: 'both' | 'L' | 'R' | 'none';
  /** наклон опоры под стопами, градусы вокруг X (платформа тренажёра) */
  feetTilt?: number;
  ik?: IKGoal[];
}

const CHAINS: Record<Chain, [BoneKey, BoneKey, BoneKey]> = {
  legL: ['upLegL', 'legL', 'footL'], legR: ['upLegR', 'legR', 'footR'],
  armL: ['armL', 'forearmL', 'handL'], armR: ['armR', 'forearmR', 'handR'],
};

export class Rig {
  /** Корневая группа: её двигают «заземление» и pin. */
  readonly root = new THREE.Group();
  private info = new Map<BoneKey, BoneInfo>();
  private fingers: { bone: THREE.Bone; bindLocal: THREE.Quaternion; pInv: THREE.Quaternion; p: THREE.Quaternion; left: boolean; thumb: boolean }[] = [];
  /** высота сустава над опорой для каждой кости */
  private radius = new Map<BoneKey, number>();
  readonly model: THREE.Object3D;

  constructor(source: THREE.Group) {
    const model = cloneSkinned(source);
    this.model = model;
    // нормализуем рост
    model.updateMatrixWorld(true);
    const box = new THREE.Box3().setFromObject(model);
    const h = box.max.y - box.min.y;
    const s = MODEL_HEIGHT / h;
    model.scale.multiplyScalar(s);
    model.position.y = -box.min.y * s;
    model.position.x = -((box.max.x + box.min.x) / 2) * s;
    this.root.add(model);
    this.root.updateMatrixWorld(true);

    const byName = new Map<string, THREE.Bone>();
    const meshes: THREE.SkinnedMesh[] = [];
    model.traverse((o) => {
      if ((o as THREE.Bone).isBone) byName.set(o.name.replace(/^mixamorig:?/, '').replace(/^Bip01[_ ]?/, 'Bip:').replace(/ /g, '_'), o as THREE.Bone);
      const m = o as THREE.SkinnedMesh;
      if (m.isMesh) {
        m.castShadow = true;
        m.frustumCulled = false;
        if (m.isSkinnedMesh) meshes.push(m);
      }
    });
    const biped = byName.has('Bip:Pelvis');
    const find = (base: string, side: '' | 'L' | 'R'): THREE.Bone | undefined => (biped
      ? byName.get(`Bip:${side ? `${side}_` : ''}${BIPED[base]}`)
      : byName.get(`${side === 'L' ? 'Left' : side === 'R' ? 'Right' : ''}${NAME[base]}`));
    const bones = new Map<BoneKey, THREE.Bone>();
    for (const c of CENTER) { const b = find(c, ''); if (b) bones.set(c, b); }
    for (const sb of SIDE) for (const side of ['L', 'R'] as const) { const b = find(sb, side); if (b) bones.set(`${sb}${side}` as BoneKey, b); }

    // зоны мышц считаются по суставам в исходной позе модели — до приведения к T-позе
    const joints = {} as Record<BoneKey, THREE.Vector3>;
    bones.forEach((b, k) => { joints[k] = b.getWorldPosition(new THREE.Vector3()); });
    for (const m of meshes) styleMesh(m, joints);

    if (biped) {
      // у Biped бёдра висят на позвоночнике, а ключицы — на шее: переносим к тазу и груди
      const re = (child: BoneKey, parent: BoneKey) => { const c = bones.get(child), p = bones.get(parent); if (c && p && c.parent !== p) p.attach(c); };
      re('upLegL', 'hips'); re('upLegR', 'hips'); re('shoulderL', 'spine2'); re('shoulderR', 'spine2');
    }
    this.toTPose(bones, byName);

    const reg = (key: BoneKey, bone: THREE.Bone) => {
      const parentBindWorld = bone.parent!.getWorldQuaternion(new THREE.Quaternion());
      this.info.set(key, {
        bone,
        bindLocal: bone.quaternion.clone(),
        bindWorld: bone.getWorldQuaternion(new THREE.Quaternion()),
        parentBindWorld,
        parentBindWorldInv: parentBindWorld.clone().invert(),
      });
      this.radius.set(key, 0.06);
    };
    bones.forEach((b, k) => reg(k, b));
    // высоты опорных суставов из T-позы
    for (const k of ['footL', 'footR', 'toeL', 'toeR'] as BoneKey[]) {
      const i = this.info.get(k);
      if (i) this.radius.set(k, Math.max(0.01, i.bone.getWorldPosition(_v).y));
    }
    const R: Partial<Record<BoneKey, number>> = {
      hips: 0.1, spine: 0.1, spine1: 0.11, spine2: 0.12, head: 0.1, neck: 0.06,
      handL: 0.025, handR: 0.025, forearmL: 0.04, forearmR: 0.04, legL: 0.055, legR: 0.055,
      upLegL: 0.09, upLegR: 0.09, armL: 0.05, armR: 0.05,
    };
    for (const k in R) this.radius.set(k as BoneKey, R[k as BoneKey]!);

    byName.forEach((bone, name) => {
      const m = /^(Left|Right)Hand(Thumb|Index|Middle|Ring|Pinky)([123])$/.exec(name);
      const bp = /^Bip:([LR])_Finger(\d)(\d?)$/.exec(name);
      if (!m && !bp) return;
      const p = bone.parent!.getWorldQuaternion(new THREE.Quaternion());
      this.fingers.push({
        bone, bindLocal: bone.quaternion.clone(), p, pInv: p.clone().invert(),
        left: m ? m[1] === 'Left' : bp![1] === 'L', thumb: m ? m[2] === 'Thumb' : bp![2] === '0',
      });
    });
  }

  /**
   * Приведение исходной позы к T-позе: руки в стороны, ноги вертикально.
   * Позы упражнений описаны относительно T-позы, а модели бывают и в A-позе.
   */
  private toTPose(bones: Map<BoneKey, THREE.Bone>, byName: Map<string, THREE.Bone>) {
    this.root.updateMatrixWorld(true);
    const a = new THREE.Vector3(), b = new THREE.Vector3();
    const align = (bone: THREE.Bone | undefined, child: THREE.Object3D | undefined, dir: THREE.Vector3) => {
      if (!bone || !child) return;
      bone.getWorldPosition(a); child.getWorldPosition(b);
      const q = new THREE.Quaternion().setFromUnitVectors(b.sub(a).normalize(), dir);
      const w = bone.getWorldQuaternion(new THREE.Quaternion()).premultiply(q);
      bone.quaternion.copy(bone.parent!.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(w));
      bone.updateWorldMatrix(false, true);
    };
    const down = new THREE.Vector3(0, -1, 0);
    for (const side of ['L', 'R'] as const) {
      const out = new THREE.Vector3(side === 'L' ? 1 : -1, 0, 0);
      const foot = bones.get(`foot${side}`);
      const footWorld = foot?.getWorldQuaternion(new THREE.Quaternion());
      align(bones.get(`upLeg${side}`), bones.get(`leg${side}`), down);
      align(bones.get(`leg${side}`), foot, down);
      if (foot && footWorld) { // стопа остаётся плоско на полу, как была
        foot.quaternion.copy(foot.parent!.getWorldQuaternion(new THREE.Quaternion()).invert().multiply(footWorld));
        foot.updateWorldMatrix(false, true);
      }
      align(bones.get(`arm${side}`), bones.get(`forearm${side}`), out);
      align(bones.get(`forearm${side}`), bones.get(`hand${side}`), out);
      const mid = byName.get(`Bip:${side}_Finger2`) ?? byName.get(`${side === 'L' ? 'Left' : 'Right'}HandMiddle1`);
      align(bones.get(`hand${side}`), mid, out);
    }
    this.root.updateMatrixWorld(true);
  }

  bone(key: BoneKey): THREE.Bone | undefined { return this.info.get(key)?.bone; }
  bindWorld(key: BoneKey): THREE.Quaternion | undefined { return this.info.get(key)?.bindWorld; }

  /** Мировая позиция сустава. */
  pos(key: BoneKey, out = new THREE.Vector3()): THREE.Vector3 {
    const b = this.info.get(key);
    return b ? b.bone.getWorldPosition(out) : out.set(0, 0, 0);
  }

  private setBone(key: BoneKey, v: V3 | undefined, mirror: boolean) {
    const i = this.info.get(key);
    if (!i) return;
    if (!v) { i.bone.quaternion.copy(i.bindLocal); return; }
    // бедро: отведение → сгибание → разворот (колени «в стороны» в приседе)
    _e.set(v[0] * D2R, v[1] * D2R, v[2] * D2R, key.startsWith('upLeg') ? 'YXZ' : 'XYZ');
    _q.setFromEuler(_e);
    if (mirror) { _q.y = -_q.y; _q.z = -_q.z; }
    // local' = Pw⁻¹ · D · Pw · L
    _q2.copy(i.parentBindWorldInv).multiply(_q).multiply(i.parentBindWorld).multiply(i.bindLocal);
    i.bone.quaternion.copy(_q2);
  }

  /** Сгибание пальцев (0 — раскрытая ладонь, 1 — хват). */
  setGrip(g: number) {
    for (const f of this.fingers) {
      const a = (f.thumb ? 20 : 62) * g * D2R * (f.left ? -1 : 1);
      if (f.thumb) _e.set(0, f.left ? -a : -a, 0, 'XYZ'); else _e.set(0, 0, a, 'XYZ');
      _q.setFromEuler(_e);
      _q2.copy(f.pInv).multiply(_q).multiply(f.p).multiply(f.bindLocal);
      f.bone.quaternion.copy(_q2);
    }
  }

  /** Применить позу. */
  apply(pose: Pose, opts: ApplyOptions = {}) {
    const r = pose.root ?? [0, 0, 0];
    const p = pose.pos ?? [0, 0, 0];
    this.root.rotation.set(r[0] * D2R, r[1] * D2R, r[2] * D2R, 'YXZ');
    this.root.position.set(p[0], p[1], p[2]);

    for (const c of CENTER) this.setBone(c, pose[c], false);
    for (const sb of SIDE) {
      this.setBone(`${sb}L`, pose[`${sb}L`] ?? pose[sb], false);
      const rv = pose[`${sb}R`];
      if (rv) this.setBone(`${sb}R`, rv, false);
      else this.setBone(`${sb}R`, pose[sb], true);
    }
    this.root.updateMatrixWorld(true);

    if (opts.ground) {
      let min = Infinity;
      for (const k of opts.ground.bones) {
        const y = this.pos(k, _v).y - (this.radius.get(k) ?? 0.05);
        if (y < min) min = y;
      }
      if (isFinite(min)) this.root.position.y += (opts.ground.y ?? 0) - min;
      this.root.updateMatrixWorld(true);
    }
    if (opts.pin) {
      const c = this.point(opts.pin.bone);
      if (opts.pin.x !== undefined) this.root.position.x += opts.pin.x - c.x;
      if (opts.pin.z !== undefined) this.root.position.z += opts.pin.z - c.z;
      this.root.updateMatrixWorld(true);
    }

    for (const g of opts.ik ?? []) this.solveIK(g);

    const ff = opts.flatFeet ?? 'none';
    if (ff !== 'none') {
      const yaw = _q.setFromAxisAngle(_v.set(0, 1, 0), r[1] * D2R).clone();
      const tilt = new THREE.Quaternion().setFromAxisAngle(_v.set(1, 0, 0), (opts.feetTilt ?? 0) * D2R);
      for (const side of ['L', 'R'] as const) {
        if (ff !== 'both' && ff !== side) continue;
        const i = this.info.get(`foot${side}`);
        if (!i) continue;
        const fv = pose[`foot${side}`] ?? pose.foot;
        const d = new THREE.Quaternion();
        if (fv) {
          _e.set(0, fv[1] * D2R * (side === 'R' && !pose.footR ? -1 : 1), 0, 'XYZ');
          d.setFromEuler(_e);
        }
        const desired = yaw.clone().multiply(tilt).multiply(d).multiply(i.bindWorld);
        const parentWorld = i.bone.parent!.getWorldQuaternion(new THREE.Quaternion());
        i.bone.quaternion.copy(parentWorld.invert().multiply(desired));
      }
      this.root.updateMatrixWorld(true);
    }
  }

  /** Аналитическая двухзвенная IK: стопа/кисть точно попадает в цель (педаль, гриф, пол). */
  private solveIK(g: IKGoal) {
    const [ka, kb, kc] = CHAINS[g.chain];
    const A = this.info.get(ka), B = this.info.get(kb);
    if (!A || !B) return;
    const a = this.pos(ka, new THREE.Vector3());
    const b = this.pos(kb, new THREE.Vector3());
    const c = this.pos(kc, new THREE.Vector3());
    const l1 = a.distanceTo(b), l2 = b.distanceTo(c);
    const t = new THREE.Vector3(g.target[0], g.target[1], g.target[2]);
    const dir = t.clone().sub(a);
    const dist = Math.min(Math.max(dir.length(), Math.abs(l1 - l2) + 1e-3), l1 + l2 - 1e-3);
    dir.normalize();
    const cosA = Math.min(1, Math.max(-1, (l1 * l1 + dist * dist - l2 * l2) / (2 * l1 * dist)));
    const sinA = Math.sqrt(1 - cosA * cosA);
    const pole = g.pole ? new THREE.Vector3(g.pole[0], g.pole[1], g.pole[2]) : b.clone().sub(a);
    pole.addScaledVector(dir, -pole.dot(dir));
    if (pole.lengthSq() < 1e-6) pole.copy(b).sub(a).addScaledVector(dir, -b.clone().sub(a).dot(dir));
    pole.normalize();
    const k = a.clone().addScaledVector(dir, l1 * cosA).addScaledVector(pole, l1 * sinA);
    const rot = (i: BoneInfo, from: THREE.Vector3, to: THREE.Vector3) => {
      const q = new THREE.Quaternion().setFromUnitVectors(from.normalize(), to.normalize());
      const w = i.bone.getWorldQuaternion(new THREE.Quaternion()).premultiply(q);
      const pw = i.bone.parent!.getWorldQuaternion(new THREE.Quaternion()).invert();
      i.bone.quaternion.copy(pw.multiply(w));
      i.bone.updateWorldMatrix(false, true);
    };
    rot(A, b.clone().sub(a), k.clone().sub(a));
    const b2 = this.pos(kb, new THREE.Vector3());
    const c2 = this.pos(kc, new THREE.Vector3());
    const tEff = a.clone().addScaledVector(dir, dist);
    rot(B, c2.sub(b2), tEff.sub(b2));
  }

  /** Опорная точка: сустав или середина пары. */
  point(key: BoneKey | 'feet' | 'hands' | 'toes', out = new THREE.Vector3()): THREE.Vector3 {
    if (key === 'feet' || key === 'hands' || key === 'toes') {
      const b = key === 'feet' ? 'foot' : key === 'hands' ? 'hand' : 'toe';
      const a = this.pos(`${b}L` as BoneKey, new THREE.Vector3());
      const c = this.pos(`${b}R` as BoneKey, new THREE.Vector3());
      return out.copy(a).add(c).multiplyScalar(0.5);
    }
    return this.pos(key, out);
  }
}

/* ---------- внешний вид модели и подсветка мышц ---------- */

export type Region =
  | 'glutes' | 'quads' | 'hamstrings' | 'calves' | 'abs' | 'obliques' | 'lowerBack'
  | 'lats' | 'traps' | 'chest' | 'shoulders' | 'biceps' | 'triceps' | 'forearms' | 'adductors';

/** Цвета: тело-скульптура и три уровня задействованных мышц. */
export const MUSCLE_COLORS = { body: '#aaa5b8', primary: '#f0397c', secondary: '#8f55e8', stabilizer: '#c9b0f5' };
const C_BODY = new THREE.Color(MUSCLE_COLORS.body);
const C_PRIMARY = new THREE.Color(MUSCLE_COLORS.primary);
const C_SECONDARY = new THREE.Color(MUSCLE_COLORS.secondary);
const C_STABILIZER = new THREE.Color(MUSCLE_COLORS.stabilizer);

type P = THREE.Vector3;
/** Мышечное «брюшко»: веретено от a к b, r — толщина в середине, taper — доля толщины на концах. */
interface Capsule { a: P; b: P; r: number; taper: number }
const MAX_CAPS = 26;

interface MuscleUniforms {
  uCA: { value: THREE.Vector4[] }; uCB: { value: THREE.Vector4[] }; uCC: { value: THREE.Vector4[] };
  uCapN: { value: number }; uMirN: { value: THREE.Vector3 }; uMirC: { value: THREE.Vector3 }; uUnit: { value: number };
}
interface Styled { caps: { region: Region; c: Capsule }[]; uniforms: MuscleUniforms }
const styled = new WeakMap<THREE.SkinnedMesh, Styled>();

/**
 * Анатомическая карта: отдельные головки мышц как веретёна вдоль костей в исходной позе модели.
 * Описана только левая половина тела — правая получается зеркалом в шейдере.
 * Всё строится от положения суставов, поэтому подходит любой модели с человеческим скелетом.
 */
function muscleCapsules(j: Record<BoneKey, P>): { region: Region; c: Capsule }[] {
  const out: { region: Region; c: Capsule }[] = [];
  if (!j.hips || !j.upLegL || !j.legL || !j.footL || !j.armL || !j.forearmL || !j.handL || !j.spine2) return out;
  const k = (j.head?.y ?? 1.5) / 1.5; // масштаб под рост модели
  const v = (x: number, y: number, z: number) => new THREE.Vector3(x * k, y * k, z * k);
  const mix = (a: P, b: P, t: number) => a.clone().lerp(b, t);
  const push = (region: Region, a: P, b: P, r: number, taper = 0.5) => out.push({ region, c: { a, b, r: r * k, taper } });
  const hip = j.upLegL, knee = j.legL, ankle = j.footL, sh = j.armL, el = j.forearmL, wr = j.handL;
  const pel = j.hips, mid = j.spine1 ?? j.spine2, top = j.spine2, neck = j.neck ?? j.spine2;
  const cx = pel.x; // средняя линия тела
  const at = (y: number, x: number, z: number) => new THREE.Vector3(cx + x * k, y, pel.z + z * k);

  // бедро: три головки квадрицепса, две — бицепса бедра, приводящие
  push('quads', mix(hip, knee, 0.08).add(v(0.004, 0, 0.056)), mix(hip, knee, 0.86).add(v(0, 0, 0.036)), 0.056, 0.4);
  push('quads', mix(hip, knee, 0.16).add(v(0.05, 0, 0.022)), mix(hip, knee, 0.9).add(v(0.032, 0, 0.014)), 0.056, 0.42);
  push('quads', mix(hip, knee, 0.42).add(v(-0.04, 0, 0.026)), mix(hip, knee, 0.93).add(v(-0.03, 0, 0.022)), 0.05, 0.45);
  push('hamstrings', mix(hip, knee, 0.26).add(v(0.026, 0, -0.044)), mix(hip, knee, 0.93).add(v(0.022, 0, -0.026)), 0.054, 0.42);
  push('hamstrings', mix(hip, knee, 0.26).add(v(-0.026, 0, -0.046)), mix(hip, knee, 0.93).add(v(-0.02, 0, -0.026)), 0.054, 0.42);
  push('adductors', mix(hip, knee, 0.04).add(v(-0.058, 0, 0)), mix(hip, knee, 0.56).add(v(-0.042, 0, -0.004)), 0.05, 0.5);
  // голень: две головки икроножной
  push('calves', mix(knee, ankle, 0.04).add(v(0.022, 0, -0.03)), mix(knee, ankle, 0.52).add(v(0.012, 0, -0.018)), 0.046, 0.4);
  push('calves', mix(knee, ankle, 0.04).add(v(-0.022, 0, -0.032)), mix(knee, ankle, 0.56).add(v(-0.012, 0, -0.02)), 0.048, 0.4);
  // ягодицы: большая и средняя
  push('glutes', hip.clone().add(v(-0.026, 0.06, -0.062)), hip.clone().add(v(-0.002, -0.05, -0.058)), 0.104, 0.74);
  push('glutes', hip.clone().add(v(0.03, 0.105, -0.036)), hip.clone().add(v(0.05, 0.06, -0.02)), 0.056, 0.6);
  // пресс: «кубики» в три ряда, косые
  const y0 = pel.y + 0.03 * k, y1 = top.y - 0.055 * k, row = (y1 - y0) / 3;
  for (let i = 0; i < 3; i++) {
    push('abs', at(y0 + row * (i + 0.1), 0.036, 0.07), at(y0 + row * (i + 0.9), 0.036, 0.076), 0.046, 0.7);
  }
  push('obliques', pel.clone().add(v(0.1, 0.07, 0.03)), mid.clone().add(v(0.112, 0.05, 0.036)), 0.06, 0.5);
  // спина
  push('lowerBack', pel.clone().add(v(0.034, 0.07, -0.066)), mid.clone().add(v(0.04, 0.07, -0.08)), 0.052, 0.55);
  push('lats', mid.clone().add(v(0.085, 0.01, -0.062)), sh.clone().add(v(-0.036, -0.09, -0.056)), 0.086, 0.45);
  push('traps', neck.clone().add(v(0.026, 0, -0.036)), mix(neck, sh, 0.66).add(v(0, 0.018, -0.026)), 0.05, 0.5);
  push('traps', top.clone().add(v(0.03, 0.11, -0.076)), top.clone().add(v(0.036, -0.02, -0.086)), 0.058, 0.55);
  // грудь, плечо, рука
  push('chest', sh.clone().add(v(-0.04, -0.05, 0.066)), sh.clone().add(v(-0.124, -0.086, 0.086)), 0.074, 0.74);
  push('shoulders', sh.clone().add(v(0.012, 0.016, 0)), mix(sh, el, 0.34), 0.064, 0.62);
  push('biceps', mix(sh, el, 0.28).add(v(0, 0, 0.026)), mix(sh, el, 0.93).add(v(0, 0, 0.018)), 0.046, 0.42);
  push('triceps', mix(sh, el, 0.28).add(v(0, 0, -0.028)), mix(sh, el, 0.93).add(v(0, 0, -0.02)), 0.047, 0.46);
  push('forearms', mix(el, wr, 0.02), mix(el, wr, 0.74), 0.05, 0.5);
  return out;
}

const V4 = () => Array.from({ length: MAX_CAPS }, () => new THREE.Vector4());

/**
 * Материал «скульптуры» + мышцы во фрагментном шейдере. Форма каждой мышцы считается
 * по позиции точки в исходной позе, поэтому контуры гладкие при любой детализации сетки
 * и остаются «приклеенными» к телу во время анимации. Те же формы дают рельеф (bump):
 * слабый по всему телу и выраженный на подсвеченных мышцах.
 */
function styleMesh(mesh: THREE.SkinnedMesh, joints: Record<BoneKey, P>) {
  const src = mesh.material as THREE.MeshStandardMaterial;
  mesh.updateMatrixWorld(true);
  const inv = mesh.matrixWorld.clone().invert();
  const unit = new THREE.Vector3().setFromMatrixScale(mesh.matrixWorld).x; // локальные единицы → метры
  const caps = muscleCapsules(joints);
  for (const { c } of caps) { c.a.applyMatrix4(inv); c.b.applyMatrix4(inv); c.r /= unit; }
  const mirC = new THREE.Vector3(joints.hips?.x ?? 0, joints.hips?.y ?? 1, joints.hips?.z ?? 0).applyMatrix4(inv);
  const mirN = new THREE.Vector3(1, 0, 0).transformDirection(inv);
  const uniforms: MuscleUniforms = {
    uCA: { value: V4() }, uCB: { value: V4() }, uCC: { value: V4() }, uCapN: { value: 0 },
    uMirN: { value: mirN }, uMirC: { value: mirC }, uUnit: { value: unit },
  };
  const mat = new THREE.MeshPhysicalMaterial({
    color: src.map ? 0xffffff : C_BODY, map: src.map ?? null, roughness: 0.52, metalness: 0,
    sheen: 0.35, sheenRoughness: 0.6, sheenColor: new THREE.Color('#e9defa'), clearcoat: 0.2, clearcoatRoughness: 0.5,
  });
  mat.onBeforeCompile = (shader) => {
    Object.assign(shader.uniforms, uniforms);
    shader.vertexShader = shader.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vBind;')
      .replace('#include <begin_vertex>', '#include <begin_vertex>\nvBind = position;');
    shader.fragmentShader = shader.fragmentShader
      .replace('#include <common>', `#include <common>
varying vec3 vBind;
uniform vec4 uCA[${MAX_CAPS}]; // a.xyz, радиус
uniform vec4 uCB[${MAX_CAPS}]; // b.xyz, сужение к концам
uniform vec4 uCC[${MAX_CAPS}]; // цвет, сила подсветки
uniform int uCapN;
uniform vec3 uMirN;
uniform vec3 uMirC;
uniform float uUnit;
float muscleH = 0.0;`)
      .replace('#include <color_fragment>', `#include <color_fragment>
{
  // зеркалим правую половину тела на левую
  vec3 mp = vBind - 2.0 * min(0.0, dot(vBind - uMirC, uMirN)) * uMirN;
  float best = 0.0;      // «уровень + выпуклость» лучшей мышцы в точке
  vec3 bestCol = vec3(0.0);
  float bestDome = 0.0;
  float bestFiber = 0.0;
  float cover = 0.0;
  for (int i = 0; i < ${MAX_CAPS}; i++) {
    if (i >= uCapN) break;
    vec3 a = uCA[i].xyz;
    vec3 ab = uCB[i].xyz - a;
    vec3 ap = mp - a;
    float t = clamp(dot(ap, ab) / max(dot(ab, ab), 1e-8), 0.0, 1.0);
    vec3 radial = ap - ab * t;
    float rad = uCA[i].w * mix(uCB[i].w, 1.0, pow(sin(3.14159265 * t), 0.6));
    float d = length(radial) / rad;
    float dome = clamp(1.0 - d * d, 0.0, 1.0);
    float tier = uCC[i].a;
    float al = step(0.5, tier);
    float w = (1.0 - smoothstep(0.88, 1.0, d)) * al;
    vec3 sd = normalize(cross(normalize(ab), vec3(0.31, 0.2, 0.93)));
    float fiber = sin(dot(radial, sd) / rad * 30.0);
    float score = (tier + dome) * step(0.001, w);
    if (score > best) { best = score; bestCol = uCC[i].rgb; bestDome = dome; bestFiber = fiber; }
    cover = max(cover, w);
    muscleH = max(muscleH, (dome * mix(0.1, 0.26, al) + al * dome * fiber * 0.006) * rad * uUnit);
  }
  // к границе головки цвет темнеет — так читаются отдельные пучки мышцы
  vec3 col = bestCol * (0.7 + 0.36 * smoothstep(0.0, 0.6, bestDome)) * (1.0 + 0.045 * bestFiber);
  diffuseColor.rgb = mix(diffuseColor.rgb, col, cover);
}`)
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
{
  // рельеф: наклоняем нормаль по градиенту высоты мышц
  vec3 dpdx = dFdx(-vViewPosition);
  vec3 dpdy = dFdy(-vViewPosition);
  vec3 r1 = cross(dpdy, normal);
  vec3 r2 = cross(normal, dpdx);
  float det = dot(dpdx, r1);
  if (abs(det) > 1e-14) {
    vec3 grad = (dFdx(muscleH) * r1 + dFdy(muscleH) * r2) / det;
    float gl = length(grad);
    if (gl > 1.2) grad *= 1.2 / gl;
    normal = normalize(normal - grad);
  }
}`);
  };
  mesh.material = mat;
  const st: Styled = { caps, uniforms };
  styled.set(mesh, st);
  applyMuscles(st, null, [], []);
}

function applyMuscles(st: Styled, primary: Region[] | null, secondary: Region[], stabilizers: Region[]) {
  const tier = (r: Region) => (!primary ? 0 : primary.includes(r) ? 3 : secondary.includes(r) ? 2 : stabilizers.includes(r) ? 1 : 0);
  const cols = [C_BODY, C_STABILIZER, C_SECONDARY, C_PRIMARY];
  // порядок важен: основные мышцы рисуются поверх остальных
  const list = st.caps.map((x) => ({ ...x, tier: tier(x.region) })).sort((a, b) => a.tier - b.tier).slice(-MAX_CAPS);
  const u = st.uniforms;
  list.forEach(({ c, tier: t }, i) => {
    u.uCA.value[i].set(c.a.x, c.a.y, c.a.z, c.r);
    u.uCB.value[i].set(c.b.x, c.b.y, c.b.z, c.taper);
    u.uCC.value[i].set(cols[t].r, cols[t].g, cols[t].b, t);
  });
  u.uCapN.value = list.length;
}

/**
 * Подсветка задействованных мышц прямо на модели: основные, дополнительные, стабилизаторы.
 * null — обычный вид без подсветки (остаётся только лёгкий рельеф).
 */
export function highlightMuscles(model: THREE.Object3D, primary: Region[] | null, secondary: Region[] = [], stabilizers: Region[] = []) {
  model.traverse((o) => {
    const m = o as THREE.SkinnedMesh;
    const st = m.isSkinnedMesh ? styled.get(m) : undefined;
    if (st) applyMuscles(st, primary, secondary, stabilizers);
  });
}
