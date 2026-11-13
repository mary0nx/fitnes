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

const NAME: Record<string, string> = {
  hips: 'Hips', spine: 'Spine', spine1: 'Spine1', spine2: 'Spine2', neck: 'Neck', head: 'Head',
  shoulder: 'Shoulder', arm: 'Arm', forearm: 'ForeArm', hand: 'Hand',
  upLeg: 'UpLeg', leg: 'Leg', foot: 'Foot', toe: 'ToeBase',
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
    model.traverse((o) => {
      if ((o as THREE.Bone).isBone) byName.set(o.name.replace(/^mixamorig:?/, ''), o as THREE.Bone);
      const m = o as THREE.SkinnedMesh;
      if (m.isMesh) {
        m.castShadow = true;
        m.frustumCulled = false;
        if (m.isSkinnedMesh) styleMesh(m);
      }
    });

    const reg = (key: BoneKey, name: string) => {
      const bone = byName.get(name);
      if (!bone) return;
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
    for (const c of CENTER) reg(c, NAME[c]);
    for (const sb of SIDE) {
      reg(`${sb}L`, `Left${NAME[sb]}`);
      reg(`${sb}R`, `Right${NAME[sb]}`);
    }
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
      if (!m) return;
      const p = bone.parent!.getWorldQuaternion(new THREE.Quaternion());
      this.fingers.push({ bone, bindLocal: bone.quaternion.clone(), p, pInv: p.clone().invert(), left: m[1] === 'Left', thumb: m[2] === 'Thumb' });
    });
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

/* ---------- внешний вид модели ---------- */

const LOOK = {
  skin: new THREE.Color('#e9b596'),
  outfit: new THREE.Color('#a56c9c'),
  outfitDark: new THREE.Color('#8a5685'),
  shoe: new THREE.Color('#fbf6fb'),
  joint: 0.86,
};

export type Region =
  | 'none' | 'glutes' | 'quads' | 'hamstrings' | 'calves' | 'abs' | 'obliques' | 'lowerBack'
  | 'lats' | 'traps' | 'chest' | 'shoulders' | 'biceps' | 'triceps' | 'forearms' | 'adductors';
const REGIONS: Region[] = ['none', 'glutes', 'quads', 'hamstrings', 'calves', 'abs', 'obliques', 'lowerBack',
  'lats', 'traps', 'chest', 'shoulders', 'biceps', 'triceps', 'forearms', 'adductors'];

interface Styled { base: Float32Array; region: Uint8Array }
const styled = new Map<THREE.BufferGeometry, Styled>();
const HI = new THREE.Color('#ff2f86');
const HI2 = new THREE.Color('#ff9cc6');
const DIM = new THREE.Color('#e8dcee');

/**
 * Демо-модель — нейтральный манекен без текстур. Чтобы он выглядел как спортсменка
 * в форме, красим вершины по ведущей кости: легинсы, топ, кроссовки, кожа.
 * Заодно каждая вершина получает анатомическую зону — для подсветки работающих мышц.
 * Для модели с собственными текстурами (map) раскраска не применяется.
 */
function styleMesh(mesh: THREE.SkinnedMesh) {
  const src = mesh.material as THREE.MeshStandardMaterial;
  if (src.map) {
    src.metalness = 0; src.roughness = 0.8; src.metalnessMap = null; src.roughnessMap = null;
    src.needsUpdate = true;
    return;
  }
  const geo = mesh.geometry;
  const pos = geo.getAttribute('position');
  const si = geo.getAttribute('skinIndex');
  const sw = geo.getAttribute('skinWeight');
  if (!si || !sw) return;
  const material = new THREE.MeshPhysicalMaterial({
    vertexColors: true, roughness: 0.62, metalness: 0, sheen: 0.6, sheenRoughness: 0.5,
    sheenColor: new THREE.Color('#ffd9ea'), clearcoat: 0.12, clearcoatRoughness: 0.6,
  });
  mesh.material = material;
  if (styled.has(geo)) return;
  const bones = mesh.skeleton.bones.map((b) => b.name.replace(/^mixamorig:?/, ''));
  const bonePos = mesh.skeleton.bones.map((b) => b.getWorldPosition(new THREE.Vector3()));
  const isJoint = /joint/i.test(src.name) || /joint/i.test(mesh.name);
  mesh.updateMatrixWorld(true);
  const colors = new Float32Array(pos.count * 3);
  const region = new Uint8Array(pos.count);
  const c = new THREE.Color();
  const v = new THREE.Vector3();
  const H = MODEL_HEIGHT;
  for (let i = 0; i < pos.count; i++) {
    let best = 0, bw = -1;
    for (let k = 0; k < 4; k++) {
      const w = sw.getComponent(i, k);
      if (w > bw) { bw = w; best = si.getComponent(i, k); }
    }
    const name = bones[best] ?? '';
    const bp = bonePos[best];
    v.fromBufferAttribute(pos, i).applyMatrix4(mesh.matrixWorld);
    const y = v.y / H;
    const front = v.z > (bp ? bp.z : 0);
    let r: Region = 'none';
    if (/Foot|Toe/.test(name)) c.copy(LOOK.shoe);
    else if (/^Hips$|UpLeg|Leg/.test(name)) {
      c.copy(y > 0.5 ? LOOK.outfitDark : LOOK.outfit);
      if (name === 'Hips') r = front ? 'abs' : 'glutes';
      else if (/UpLeg/.test(name)) {
        const inner = Math.abs(v.x) < Math.abs(bp.x) - 0.035;
        r = front ? (inner && y > 0.38 ? 'adductors' : 'quads') : (y > 0.47 ? 'glutes' : 'hamstrings');
      } else r = front ? 'none' : 'calves';
    } else if (/^Spine[12]$/.test(name) || /Shoulder/.test(name)) {
      const strap = Math.abs(v.x) < 0.085;
      c.copy(y < 0.805 || (strap && y < 0.83 && Math.abs(v.x) > 0.045) ? LOOK.outfit : LOOK.skin);
      if (/Shoulder/.test(name)) r = Math.abs(v.x) > 0.11 ? 'shoulders' : 'traps';
      else if (front) r = y > 0.73 ? 'chest' : 'abs';
      else r = y > 0.8 ? 'traps' : 'lats';
    } else if (name === 'Spine') {
      c.copy(LOOK.skin);
      r = Math.abs(v.x) > 0.09 ? 'obliques' : front ? 'abs' : 'lowerBack';
    } else {
      c.copy(LOOK.skin);
      if (/(Left|Right)Arm$/.test(name)) r = Math.abs(v.x - bp.x) < 0.085 ? 'shoulders' : front ? 'biceps' : 'triceps';
      else if (/ForeArm/.test(name)) r = 'forearms';
    }
    if (isJoint) c.multiplyScalar(LOOK.joint);
    colors[i * 3] = c.r; colors[i * 3 + 1] = c.g; colors[i * 3 + 2] = c.b;
    region[i] = REGIONS.indexOf(r);
  }
  geo.setAttribute('color', new THREE.BufferAttribute(colors.slice(), 3));
  styled.set(geo, { base: colors, region });
}

/** Подсветка работающих мышц на модели (null — обычный вид). */
export function highlightMuscles(model: THREE.Object3D, primary: Region[] | null, secondary: Region[] = []) {
  model.traverse((o) => {
    const m = o as THREE.SkinnedMesh;
    if (!m.isSkinnedMesh) return;
    const st = styled.get(m.geometry);
    if (!st) return;
    const attr = m.geometry.getAttribute('color') as THREE.BufferAttribute;
    const arr = attr.array as Float32Array;
    if (!primary) arr.set(st.base);
    else {
      const p = new Set(primary.map((r) => REGIONS.indexOf(r)));
      const s = new Set(secondary.map((r) => REGIONS.indexOf(r)));
      for (let i = 0; i < st.region.length; i++) {
        const r = st.region[i];
        const col = p.has(r) ? HI : s.has(r) ? HI2 : null;
        const j = i * 3;
        if (col) { arr[j] = col.r; arr[j + 1] = col.g; arr[j + 2] = col.b; }
        else {
          // остальное тело — приглушённое, чтобы подсветка читалась
          arr[j] = st.base[j] * 0.35 + DIM.r * 0.65;
          arr[j + 1] = st.base[j + 1] * 0.35 + DIM.g * 0.65;
          arr[j + 2] = st.base[j + 2] * 0.35 + DIM.b * 0.65;
        }
      }
    }
    attr.needsUpdate = true;
  });
}
