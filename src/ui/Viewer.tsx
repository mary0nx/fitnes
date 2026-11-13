import { useEffect, useRef, useState } from 'react';
import { Activity, Hand, Pause, Play, RotateCcw } from 'lucide-react';
import { getAnim } from '../three/anims';
import type { Stage } from '../three/stage';
import type { Region } from '../three/rig';
import { thumbUrl } from '../data/exercises';
import { useT } from '../i18n';

const SPEEDS = [0.5, 1, 1.5];
const VIEWS = [
  { key: 'front', az: 0 }, { key: 'side', az: 90 }, { key: 'back', az: 180 },
] as const;

/**
 * 3D-демонстрация упражнения: скелетная анимация модели, вращение пальцем,
 * ракурсы, скорость 0.5×/1×/1.5×, пауза, перемотка, подсветка мышц.
 * Three.js подгружается отдельным чанком — список и дашборд от него не зависят.
 */
export function ExerciseViewer({ animId, height = 380, muscles, secondary, compact, paused }: {
  animId: string; height?: number | string; muscles?: Region[]; secondary?: Region[]; compact?: boolean; paused?: boolean;
}) {
  const { t } = useT();
  const canvas = useRef<HTMLCanvasElement>(null);
  const stage = useRef<Stage | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>('loading');
  const [playing, setPlaying] = useState(true);
  const [speed, setSpeed] = useState(1);
  const [phase, setPhase] = useState(0);
  const [view, setView] = useState<string | null>(null);
  const [hi, setHi] = useState(false);
  const drag = useRef<{ x: number; y: number; id: number } | null>(null);
  const pinch = useRef(new Map<number, { x: number; y: number }>());
  const pinchDist = useRef(0);

  // создание сцены
  useEffect(() => {
    let alive = true;
    let st: Stage | null = null;
    let ro: ResizeObserver | null = null;
    let lastUi = 0;
    (async () => {
      try {
        const { Stage } = await import('../three/stage');
        if (!alive || !canvas.current) return;
        st = new Stage(canvas.current);
        stage.current = st;
        st.onTick = (p) => {
          const now = performance.now();
          if (now - lastUi > 80) { lastUi = now; setPhase(p); }
        };
        await st.init();
        if (!alive) return;
        st.resize();
        const a = getAnim(animId);
        if (a) st.setAnim(a);
        st.start();
        ro = new ResizeObserver(() => st?.resize());
        ro.observe(canvas.current);
        setStatus('ready');
      } catch (e) {
        console.error(e);
        if (alive) setStatus('error');
      }
    })();
    const onVis = () => { if (!st) return; if (document.hidden) st.stop(); else st.start(); };
    document.addEventListener('visibilitychange', onVis);
    return () => {
      alive = false;
      document.removeEventListener('visibilitychange', onVis);
      ro?.disconnect();
      st?.dispose();
      stage.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // смена упражнения
  useEffect(() => {
    const st = stage.current;
    const a = getAnim(animId);
    if (!st || !a || status !== 'ready') return;
    st.setAnim(a);
    st.setPhase(0);
    setView(null);
    st.setHighlight(hi && muscles ? muscles : null, secondary);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [animId, status]);

  useEffect(() => { if (stage.current) stage.current.playing = playing && !paused; }, [playing, paused, status]);
  useEffect(() => { if (stage.current) stage.current.speed = speed; }, [speed, status]);
  useEffect(() => { stage.current?.setHighlight(hi && muscles ? muscles : null, secondary); /* eslint-disable-next-line */ }, [hi, status]);

  const onDown = (e: React.PointerEvent) => {
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    pinch.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pinch.current.size === 1) drag.current = { x: e.clientX, y: e.clientY, id: e.pointerId };
    else { drag.current = null; pinchDist.current = 0; }
  };
  const onMove = (e: React.PointerEvent) => {
    const st = stage.current;
    if (!st || !pinch.current.has(e.pointerId)) return;
    pinch.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (pinch.current.size >= 2) {
      const [a, b] = [...pinch.current.values()];
      const d = Math.hypot(a.x - b.x, a.y - b.y);
      if (pinchDist.current) st.zoom = Math.max(0.7, Math.min(2.2, st.zoom * (d / pinchDist.current)));
      pinchDist.current = d;
    } else if (drag.current) {
      st.az -= (e.clientX - drag.current.x) * 0.45;
      st.el = Math.max(-5, Math.min(55, st.el + (e.clientY - drag.current.y) * 0.3));
      drag.current = { x: e.clientX, y: e.clientY, id: e.pointerId };
      setView(null);
    }
    if (!st.playing) st.render();
  };
  const onUp = (e: React.PointerEvent) => {
    pinch.current.delete(e.pointerId);
    pinchDist.current = 0;
    drag.current = null;
  };

  const pickView = (v: (typeof VIEWS)[number]) => {
    const st = stage.current;
    if (!st) return;
    st.az = v.az; st.el = 6; st.zoom = getAnim(animId)?.view?.zoom ?? 1;
    setView(v.key);
  };

  return (
    <div className="viewer" style={{ height }}>
      <img className="poster" src={thumbUrl(animId)} alt="" style={{ opacity: status === 'ready' ? 0 : 1 }} onError={(e) => ((e.target as HTMLElement).style.display = 'none')} />
      <canvas
        ref={canvas} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp}
        onWheel={(e) => { const st = stage.current; if (st) st.zoom = Math.max(0.7, Math.min(2.2, st.zoom * (e.deltaY < 0 ? 1.08 : 0.93))); }}
        style={{ opacity: status === 'ready' ? 1 : 0 }} aria-label={t('viewer.aria')}
      />
      {status === 'loading' ? <div className="loading"><span className="spin" />{t('viewer.loading')}</div> : null}
      {status === 'error' ? <div className="loading">{t('viewer.error')}</div> : null}
      {status === 'ready' && !compact ? <div className="hint"><Hand size={13} />{t('viewer.hint')}</div> : null}

      {status === 'ready' ? (
        <>
          <div className="views">
            {VIEWS.map((v) => (
              <button key={v.key} className={view === v.key ? 'on' : ''} onClick={() => pickView(v)}>
                <ViewIcon k={v.key} />
                {t(`viewer.${v.key}` as 'viewer.front')}
              </button>
            ))}
          </div>
          {muscles?.length ? (
            <div className="side">
              <button className={`glass-btn ${hi ? 'on' : ''}`} aria-pressed={hi} aria-label={t('viewer.muscles')} onClick={() => setHi(!hi)}><Activity size={20} /></button>
            </div>
          ) : null}
          <div className="controls">
            <div className="btns">
              <button className="glass-btn round num" aria-label={t('viewer.speed')} onClick={() => setSpeed(SPEEDS[(SPEEDS.indexOf(speed) + 1) % SPEEDS.length])}>{speed}×</button>
              <button className="play-btn" aria-label={playing ? t('common.pause') : t('viewer.play')} onClick={() => setPlaying(!playing)}>
                {playing ? <Pause size={24} fill="currentColor" /> : <Play size={24} fill="currentColor" style={{ marginLeft: 3 }} />}
              </button>
              <button className="glass-btn round" aria-label={t('viewer.restart')} onClick={() => { stage.current?.setPhase(0); setPhase(0); setPlaying(true); }}><RotateCcw size={19} /></button>
            </div>
            <input
              className="timeline" type="range" min={0} max={1000} value={Math.round(phase * 1000)} aria-label={t('viewer.timeline')}
              style={{ ['--p' as string]: `${phase * 100}%` }}
              onChange={(e) => { const p = Number(e.target.value) / 1000; setPlaying(false); stage.current?.setPhase(p); stage.current?.render(); setPhase(p); }}
            />
          </div>
        </>
      ) : null}
    </div>
  );
}

function ViewIcon({ k }: { k: string }) {
  // фигурки-пиктограммы ракурсов
  const common = { width: 22, height: 22, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.8, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };
  if (k === 'side') return (<svg {...common}><circle cx="13" cy="4.5" r="2.2" /><path d="M12 8c-2 2-2 5-1 8l-1 5M12 11l3 3M11 16l3 5" /></svg>);
  if (k === 'back') return (<svg {...common}><circle cx="12" cy="4.5" r="2.2" /><path d="M8 9h8l-1 7H9L8 9zM9.5 16l-.5 5M14.5 16l.5 5M8 9l-2 6M16 9l2 6M12 9v6" /></svg>);
  return (<svg {...common}><circle cx="12" cy="4.5" r="2.2" /><path d="M8 9h8l-1 7H9L8 9zM9.5 16l-.5 5M14.5 16l.5 5M8 9l-2 6M16 9l2 6" /></svg>);
}
