import * as THREE from 'three';
import { Rig, loadModel, highlightMuscles, type Region, type BoneKey, type Chain, type GroundSpec, type IKGoal, type PinSpec, type Pose, type V3 } from './rig';

export interface IKSpec {
  /** 'legs' / 'arms' — цель для левой стороны, правая зеркально */
  chain: Chain | 'legs' | 'arms';
  target: V3 | ((phase: number) => V3);
  pole?: V3;
}

/** Примитив реквизита (штанга, скамья, тренажёр собираются из них). Размеры в метрах. */
export interface Prim {
  s: 'box' | 'cyl' | 'sphere' | 'cable';
  /** box: ш/в/г; cyl: радиус, длина; sphere: радиус; cable: толщина */
  size: V3 | [number, number] | [number];
  /** позиция в мире либо смещение от точки follow */
  p: V3;
  /** поворот, градусы */
  r?: V3;
  c?: 'metal' | 'dark' | 'pad' | 'accent' | 'plate' | 'mat' | 'soft';
  /** двигается вместе с суставом / серединой кистей или стоп */
  follow?: BoneKey | 'feet' | 'hands' | 'toes';
  /** какие оси следуют (по умолчанию все) */
  axes?: string;
  /** жёстко прикрепить к кости (наследует поворот) */
  attach?: boolean;
}

export interface ExerciseAnim {
  /** поза как функция фазы цикла 0..1 */
  pose: (phase: number) => Pose;
  /** длительность одного цикла, сек */
  duration: number;
  ground?: GroundSpec;
  pin?: PinSpec;
  flatFeet?: 'both' | 'L' | 'R' | 'none';
  feetTilt?: number;
  ik?: IKSpec[];
  grip?: number;
  props?: Prim[];
  /** ракурс по умолчанию */
  view?: { az?: number; el?: number; zoom?: number };
  /** фаза для миниатюры */
  thumb?: number;
}

const COLORS: Record<NonNullable<Prim['c']>, { color: number; rough: number; metal: number }> = {
  metal: { color: 0xd9d3e2, rough: 0.35, metal: 0.8 },
  dark: { color: 0x3c3144, rough: 0.6, metal: 0.3 },
  plate: { color: 0x2f2736, rough: 0.55, metal: 0.25 },
  pad: { color: 0x5a4563, rough: 0.8, metal: 0.0 },
  accent: { color: 0xf05a9d, rough: 0.5, metal: 0.1 },
  mat: { color: 0xc6a7e8, rough: 0.9, metal: 0 },
  soft: { color: 0xf3e6f5, rough: 0.9, metal: 0 },
};

const D2R = Math.PI / 180;

export interface StageOptions {
  shadows?: boolean;
  maxPixelRatio?: number;
  preserve?: boolean;
}

export class Stage {
  readonly renderer: THREE.WebGLRenderer;
  readonly scene = new THREE.Scene();
  readonly camera = new THREE.PerspectiveCamera(28, 1, 0.1, 50);
  rig: Rig | null = null;
  private anim: ExerciseAnim | null = null;
  private props = new THREE.Group();
  private dynamic: { prim: Prim; obj: THREE.Object3D }[] = [];
  private mats = new Map<string, THREE.MeshStandardMaterial>();
  private geos: THREE.BufferGeometry[] = [];
  private raf = 0;
  private last = 0;
  private disposed = false;
  private target = new THREE.Vector3(0, 0.85, 0);
  private fitDist = 5;

  phase = 0;
  playing = true;
  speed = 1;
  az = 30;
  el = 8;
  zoom = 1;
  onTick: ((phase: number) => void) | null = null;

  constructor(readonly canvas: HTMLCanvasElement, opts: StageOptions = {}) {
    this.renderer = new THREE.WebGLRenderer({
      canvas, alpha: true, antialias: true, powerPreference: 'high-performance',
      preserveDrawingBuffer: !!opts.preserve,
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, opts.maxPixelRatio ?? 2));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.15;
    this.renderer.shadowMap.enabled = opts.shadows !== false;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // студийный свет: мягкий заполняющий, ключевой и розовый контровой
    this.scene.add(new THREE.HemisphereLight(0xfff1f8, 0xb9a0cf, 1.25));
    const key = new THREE.DirectionalLight(0xfff4ee, 2.3);
    key.position.set(2.2, 4.2, 3.2);
    key.castShadow = true;
    key.shadow.mapSize.set(1024, 1024);
    key.shadow.camera.left = -2.2; key.shadow.camera.right = 2.2;
    key.shadow.camera.top = 2.6; key.shadow.camera.bottom = -1.2;
    key.shadow.camera.near = 0.5; key.shadow.camera.far = 12;
    key.shadow.bias = -0.0015;
    key.shadow.radius = 6;
    this.scene.add(key);
    const rim = new THREE.DirectionalLight(0xff7ab8, 1.6);
    rim.position.set(-3, 2.2, -3);
    this.scene.add(rim);
    const fill = new THREE.DirectionalLight(0xc9b3ff, 0.7);
    fill.position.set(-2.5, 1.5, 2.5);
    this.scene.add(fill);

    // пол: только тень + мягкий «подиум»
    const shadow = new THREE.Mesh(
      new THREE.PlaneGeometry(14, 14),
      new THREE.ShadowMaterial({ color: 0x5b3a6b, opacity: 0.22 }),
    );
    shadow.rotation.x = -Math.PI / 2;
    shadow.receiveShadow = true;
    this.scene.add(shadow);
    this.geos.push(shadow.geometry);

    const disc = new THREE.Mesh(new THREE.CircleGeometry(1.9, 64), new THREE.MeshBasicMaterial({
      map: radialTexture(), transparent: true, depthWrite: false, opacity: 0.9,
    }));
    disc.rotation.x = -Math.PI / 2;
    disc.position.y = -0.002;
    this.scene.add(disc);
    this.geos.push(disc.geometry);

    this.scene.add(this.props);
  }

  async init(): Promise<void> {
    const src = await loadModel();
    if (this.disposed) return;
    this.rig = new Rig(src);
    this.scene.add(this.rig.root);
    if (this.anim) this.setAnim(this.anim);
  }

  private mat(c: NonNullable<Prim['c']>): THREE.MeshStandardMaterial {
    let m = this.mats.get(c);
    if (!m) {
      const d = COLORS[c];
      m = new THREE.MeshStandardMaterial({ color: d.color, roughness: d.rough, metalness: d.metal });
      this.mats.set(c, m);
    }
    return m;
  }

  private buildProp(prim: Prim): THREE.Object3D {
    let geo: THREE.BufferGeometry;
    const sz = prim.size as number[];
    if (prim.s === 'box') geo = new THREE.BoxGeometry(sz[0], sz[1], sz[2]);
    else if (prim.s === 'sphere') geo = new THREE.SphereGeometry(sz[0], 24, 16);
    else if (prim.s === 'cable') geo = new THREE.CylinderGeometry(sz[0], sz[0], 1, 8);
    else geo = new THREE.CylinderGeometry(sz[0], sz[0], sz[1], 28);
    this.geos.push(geo);
    const mesh = new THREE.Mesh(geo, this.mat(prim.c ?? 'dark'));
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    if (prim.r) mesh.rotation.set(prim.r[0] * D2R, prim.r[1] * D2R, prim.r[2] * D2R);
    mesh.position.set(prim.p[0], prim.p[1], prim.p[2]);
    return mesh;
  }

  setAnim(anim: ExerciseAnim) {
    this.anim = anim;
    // очистка реквизита
    for (const d of this.dynamic) d.obj.removeFromParent();
    this.dynamic = [];
    this.props.clear();
    if (!this.rig) return;
    this.rig.setGrip(anim.grip ?? 0.15);
    for (const prim of anim.props ?? []) {
      const obj = this.buildProp(prim);
      if (prim.attach && prim.follow && this.rig.bone(prim.follow as BoneKey)) {
        const bone = this.rig.bone(prim.follow as BoneKey)!;
        const bw = this.rig.bindWorld(prim.follow as BoneKey)!.clone().invert();
        const scale = bone.getWorldScale(new THREE.Vector3());
        obj.quaternion.premultiply(bw);
        obj.position.applyQuaternion(bw).divide(scale);
        obj.scale.set(1 / scale.x, 1 / scale.y, 1 / scale.z);
        bone.add(obj);
        this.dynamic.push({ prim, obj });
      } else {
        this.props.add(obj);
        if (prim.follow || prim.s === 'cable') this.dynamic.push({ prim, obj });
      }
    }
    this.az = anim.view?.az ?? 35;
    this.el = anim.view?.el ?? 8;
    this.zoom = anim.view?.zoom ?? 1;
    this.fit();
    this.applyPose();
  }

  /** Подбор камеры: чтобы всё движение целиком помещалось в кадр. */
  private fit() {
    if (!this.rig || !this.anim) return;
    const box = new THREE.Box3();
    const v = new THREE.Vector3();
    const keys: BoneKey[] = ['head', 'handL', 'handR', 'footL', 'footR', 'toeL', 'toeR', 'hips', 'legL', 'legR', 'forearmL', 'forearmR'];
    for (let i = 0; i < 6; i++) {
      this.applyPose(i / 6);
      for (const k of keys) box.expandByPoint(this.rig.pos(k, v));
      const head = this.rig.pos('head', v);
      box.expandByPoint(v.set(head.x, head.y + 0.2, head.z));
    }
    this.props.updateMatrixWorld(true);
    const pb = new THREE.Box3().setFromObject(this.props);
    if (!pb.isEmpty()) {
      // реквизит учитываем частично, чтобы большой тренажёр не уменьшал модель
      pb.min.max(box.min.clone().subScalar(0.35));
      pb.max.min(box.max.clone().addScalar(0.35));
      box.union(pb);
    }
    box.min.y = Math.min(box.min.y, 0);
    const sphere = box.getBoundingSphere(new THREE.Sphere());
    this.target.copy(sphere.center);
    const fov = this.camera.fov * D2R;
    const aspect = this.camera.aspect || 1;
    const half = Math.min(fov / 2, Math.atan(Math.tan(fov / 2) * aspect));
    this.fitDist = (sphere.radius * 1.08) / Math.sin(half);
  }

  applyPose(phase = this.phase) {
    if (!this.rig || !this.anim) return;
    const a = this.anim;
    const ik: IKGoal[] = [];
    for (const g of a.ik ?? []) {
      const t = typeof g.target === 'function' ? g.target(phase) : g.target;
      if (g.chain === 'legs' || g.chain === 'arms') {
        const base = g.chain === 'legs' ? 'leg' : 'arm';
        ik.push({ chain: `${base}L` as Chain, target: t, pole: g.pole });
        ik.push({ chain: `${base}R` as Chain, target: [-t[0], t[1], t[2]], pole: g.pole && [-g.pole[0], g.pole[1], g.pole[2]] });
      } else ik.push({ chain: g.chain, target: t, pole: g.pole });
    }
    this.rig.apply(a.pose(phase), { ground: a.ground, pin: a.pin, flatFeet: a.flatFeet, feetTilt: a.feetTilt, ik });
    const v = new THREE.Vector3();
    for (const d of this.dynamic) {
      const { prim, obj } = d;
      if (prim.attach) continue;
      if (prim.s === 'cable') {
        const to = this.rig.point(prim.follow ?? 'hands', v);
        const from = new THREE.Vector3(prim.p[0], prim.p[1], prim.p[2]);
        const dir = to.clone().sub(from);
        const len = dir.length();
        obj.position.copy(from).addScaledVector(dir, 0.5);
        obj.scale.set(1, len, 1);
        obj.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), dir.normalize());
        continue;
      }
      const c = this.rig.point(prim.follow!, v);
      const ax = prim.axes ?? 'xyz';
      obj.position.set(
        prim.p[0] + (ax.includes('x') ? c.x : 0),
        prim.p[1] + (ax.includes('y') ? c.y : 0),
        prim.p[2] + (ax.includes('z') ? c.z : 0),
      );
    }
  }

  private placeCamera() {
    const az = this.az * D2R, el = this.el * D2R;
    const d = this.fitDist / this.zoom;
    this.camera.position.set(
      this.target.x + d * Math.sin(az) * Math.cos(el),
      this.target.y + d * Math.sin(el),
      this.target.z + d * Math.cos(az) * Math.cos(el),
    );
    this.camera.lookAt(this.target);
  }

  resize() {
    const c = this.canvas;
    const w = c.clientWidth || c.width, h = c.clientHeight || c.height;
    if (!w || !h) return;
    this.renderer.setSize(w, h, false);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    this.fit();
    this.applyPose();
    this.render();
  }

  render() {
    if (this.disposed) return;
    this.placeCamera();
    this.renderer.render(this.scene, this.camera);
  }

  private loop = (t: number) => {
    if (this.disposed) return;
    this.raf = requestAnimationFrame(this.loop);
    const dt = Math.min(0.1, (t - this.last) / 1000);
    this.last = t;
    if (this.playing && this.anim && this.rig) {
      this.phase = (this.phase + (dt * this.speed) / this.anim.duration) % 1;
      this.applyPose();
      this.onTick?.(this.phase);
    }
    this.render();
  };

  /** Подсветить работающие мышцы на модели. */
  setHighlight(primary: Region[] | null, secondary: Region[] = []) {
    if (this.rig) highlightMuscles(this.rig.model, primary, secondary);
  }

  start() {
    if (this.raf) return;
    this.last = performance.now();
    this.raf = requestAnimationFrame(this.loop);
  }

  stop() {
    cancelAnimationFrame(this.raf);
    this.raf = 0;
  }

  setPhase(p: number) {
    this.phase = ((p % 1) + 1) % 1;
    this.applyPose();
    this.onTick?.(this.phase);
  }

  dispose() {
    this.disposed = true;
    this.stop();
    this.geos.forEach((g) => g.dispose());
    this.mats.forEach((m) => m.dispose());
    this.renderer.dispose();
  }
}

function radialTexture(): THREE.Texture {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d')!;
  const grad = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  grad.addColorStop(0, 'rgba(255,255,255,0.55)');
  grad.addColorStop(0.55, 'rgba(247,180,209,0.22)');
  grad.addColorStop(1, 'rgba(198,167,232,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 256, 256);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
