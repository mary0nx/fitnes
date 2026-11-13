// Служебная страница: пререндер миниатюр упражнений и отладка поз (не входит в прод-сборку).
import * as THREE from 'three';
import { Stage } from './stage';
import { ANIMS, POSES } from './anims';
import { EXERCISES } from '../data/exercises';

const canvas = document.createElement('canvas');
document.body.appendChild(canvas);
let stage: Stage | null = null;

async function render(id: string, phase: number, o: { az?: number; el?: number; w?: number; h?: number; zoom?: number; type?: string; hi?: string[]; hi2?: string[]; hi3?: string[]; bg?: string } = {}) {
  const w = o.w ?? 480, h = o.h ?? 480;
  canvas.style.width = `${w}px`; canvas.style.height = `${h}px`;
  if (!stage) {
    stage = new Stage(canvas, { preserve: true, maxPixelRatio: 1 });
    await stage.init(new URLSearchParams(location.search).get('model') ?? undefined);
  }
  const anim = ANIMS[id] ?? POSES[id];
  if (!anim) throw new Error(`no anim ${id}`);
  stage.playing = false;
  stage.resize();
  stage.setAnim(anim);
  if (o.az !== undefined) stage.az = o.az;
  if (o.el !== undefined) stage.el = o.el;
  if (o.zoom !== undefined) stage.zoom = o.zoom;
  stage.setHighlight((o.hi as never) ?? null, (o.hi2 as never) ?? [], (o.hi3 as never) ?? []);
  stage.scene.background = o.bg ? new THREE.Color(o.bg) : null;
  stage.setPhase(phase);
  stage.render();
  return canvas.toDataURL(o.type ?? 'image/png', 0.9);
}
const reg = (m: string[]) => m.filter((x) => x !== 'heart');
const list = EXERCISES.map((e) => {
  // у кардио «основная мышца» — сердце: на модели показываем работающие мышцы как основные
  const primary = reg(e.primary).length ? reg(e.primary) : reg(e.secondary);
  return {
    id: e.id, anim: e.anim, thumb: ANIMS[e.anim]?.thumb ?? 0.5,
    primary, secondary: reg(e.primary).length ? reg(e.secondary) : [], stab: reg(e.stabilizers),
  };
});
Object.assign(window, { __render: render, __ids: Object.keys(ANIMS), __list: list });
(window as unknown as { __ready: boolean }).__ready = true;
