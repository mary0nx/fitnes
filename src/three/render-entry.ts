// Служебная страница: пререндер миниатюр упражнений и отладка поз (не входит в прод-сборку).
import { Stage } from './stage';
import { ANIMS, POSES } from './anims';
import { EXERCISES } from '../data/exercises';

const canvas = document.createElement('canvas');
document.body.appendChild(canvas);
let stage: Stage | null = null;

async function render(id: string, phase: number, o: { az?: number; el?: number; w?: number; h?: number; zoom?: number; type?: string; hi?: string[]; hi2?: string[] } = {}) {
  const w = o.w ?? 480, h = o.h ?? 480;
  canvas.style.width = `${w}px`; canvas.style.height = `${h}px`;
  if (!stage) {
    stage = new Stage(canvas, { preserve: true, maxPixelRatio: 1 });
    await stage.init();
  }
  const anim = ANIMS[id] ?? POSES[id];
  if (!anim) throw new Error(`no anim ${id}`);
  stage.playing = false;
  stage.resize();
  stage.setAnim(anim);
  if (o.az !== undefined) stage.az = o.az;
  if (o.el !== undefined) stage.el = o.el;
  if (o.zoom !== undefined) stage.zoom = o.zoom;
  stage.setHighlight((o.hi as never) ?? null, (o.hi2 as never) ?? []);
  stage.setPhase(phase);
  stage.render();
  return canvas.toDataURL(o.type ?? 'image/png', 0.9);
}
const BACK = new Set(['glutes', 'hamstrings', 'calves', 'lowerBack', 'lats', 'traps', 'triceps']);
const list = EXERCISES.map((e) => ({
  id: e.id, anim: e.anim, thumb: ANIMS[e.anim]?.thumb ?? 0.5,
  primary: e.primary.filter((m) => m !== 'heart'), secondary: e.secondary.filter((m) => m !== 'heart'),
  back: e.primary.filter((m) => BACK.has(m)).length * 2 >= e.primary.filter((m) => m !== 'heart').length && e.primary.some((m) => BACK.has(m)),
}));
Object.assign(window, { __render: render, __ids: Object.keys(ANIMS), __list: list });
(window as unknown as { __ready: boolean }).__ready = true;
