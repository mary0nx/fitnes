import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, ArrowRightLeft, Check, ChevronLeft, ChevronRight, Droplet, Flag, Heart, Pause, Play, Plus, SkipForward, Timer, Trash2 } from 'lucide-react';
import { EQUIPMENT_NAMES, EXERCISES, EX_BY_ID, MUSCLE_NAMES, mediaUrl } from '../data/exercises';
import { today } from '../domain/dates';
import { doneSets, isAvailable, lastSets, tonnage, totalSets } from '../domain/plan';
import type { Exercise } from '../domain/types';
import { fromUnit, toUnit } from '../domain/units';
import { useT } from '../i18n';
import { beep, buzz, notify } from '../notify';
import { nav } from '../router';
import { useStore } from '../store';
import { Confirm, Ring, Seg, Sheet, Stepper, Thumb, toast } from '../ui/basic';
import { ExerciseViewer } from '../ui/Viewer';
import { MistakesCard, MusclesCard, TechniqueCard, muscleSets } from './ExerciseDetail';

const mmss = (s: number) => `${String(Math.floor(Math.max(0, s) / 60)).padStart(2, '0')}:${String(Math.max(0, s) % 60).padStart(2, '0')}`;

/** Обратный отсчёт по абсолютному времени — не сбивается, если вкладка уходила в фон. */
function useCountdown(end: number | null, onDone: () => void): number {
  const [left, setLeft] = useState(0);
  const cb = useRef(onDone);
  cb.current = onDone;
  useEffect(() => {
    if (!end) return;
    let fired = false;
    const tick = () => {
      const l = Math.ceil((end - Date.now()) / 1000);
      setLeft(Math.max(0, l));
      if (l <= 0 && !fired) { fired = true; cb.current(); }
    };
    tick();
    const id = setInterval(tick, 250);
    return () => clearInterval(id);
  }, [end]);
  return left;
}

export function Workout() {
  const { t, tr } = useT();
  const active = useStore((s) => s.active);
  const settings = useStore((s) => s.settings);
  const profile = useStore((s) => s.profile);
  const history = useStore((s) => s.history);
  const favorites = useStore((s) => s.favorites);
  const { patchSet, addSet, removeSet, replaceExercise, setIndex, tick, finishWorkout, discardWorkout, toggleFavorite, addWater } = useStore.getState();

  const [tab, setTab] = useState<'sets' | 'tech' | 'muscles'>('sets');
  const [paused, setPaused] = useState(false);
  const [rest, setRest] = useState<{ end: number; total: number; advance: boolean } | null>(null);
  const [restPause, setRestPause] = useState<number | null>(null);
  const [hold, setHold] = useState<{ set: number; end: number; total: number } | null>(null);
  const [replace, setReplace] = useState(false);
  const [finishAsk, setFinishAsk] = useState(false);
  const [sec, setSec] = useState(0);

  useEffect(() => { if (!active) nav('/', true); }, [active]);

  // часы тренировки: считаем локально, в хранилище сбрасываем раз в 5 секунд
  const pending = useRef(0);
  useEffect(() => {
    if (paused) return;
    const id = setInterval(() => {
      if (document.hidden) return;
      pending.current += 1;
      setSec((s) => s + 1);
      if (pending.current >= 5) { tick(pending.current); pending.current = 0; }
    }, 1000);
    return () => clearInterval(id);
  }, [paused, tick]);
  useEffect(() => {
    const flush = () => { if (pending.current) { useStore.getState().tick(pending.current); pending.current = 0; } };
    window.addEventListener('pagehide', flush);
    document.addEventListener('visibilitychange', flush);
    return () => { flush(); window.removeEventListener('pagehide', flush); document.removeEventListener('visibilitychange', flush); };
  }, []);

  // не даём экрану гаснуть во время тренировки
  useEffect(() => {
    let lock: { release?: () => Promise<void> } | null = null;
    const req = async () => {
      try { lock = await (navigator as unknown as { wakeLock?: { request: (k: string) => Promise<{ release: () => Promise<void> }> } }).wakeLock?.request('screen') ?? null; } catch { /* не поддерживается */ }
    };
    req();
    const onVis = () => { if (!document.hidden) req(); };
    document.addEventListener('visibilitychange', onVis);
    return () => { document.removeEventListener('visibilitychange', onVis); lock?.release?.().catch(() => undefined); };
  }, []);

  const idx = active?.index ?? 0;
  const ex = active?.exercises[idx];
  const e: Exercise | undefined = ex ? EX_BY_ID[ex.exerciseId] : undefined;
  const cur = ex ? ex.sets.findIndex((s) => !s.done) : -1;
  const last = !!active && idx === active.exercises.length - 1;
  const unit = settings.unit;
  const u = t(unit === 'kg' ? 'unit.kg' : 'unit.lb');

  const signal = useCallback(() => {
    if (settings.sound) beep();
    if (settings.vibration) buzz();
  }, [settings.sound, settings.vibration]);

  const endRest = useCallback((advance: boolean) => {
    setRest(null); setRestPause(null);
    const a = useStore.getState().active;
    if (advance && a && a.index < a.exercises.length - 1) { setIndex(a.index + 1); setTab('sets'); }
  }, [setIndex]);

  const restLeft = useCountdown(rest && restPause === null ? rest.end : null, () => {
    signal();
    if (document.hidden) notify(t('rest.over'), t('rest.over.d'));
    endRest(rest?.advance ?? false);
  });

  const completeSet = useCallback((i: number) => {
    const a = useStore.getState().active;
    const x = a?.exercises[a.index];
    if (!a || !x) return;
    patchSet(a.index, i, { done: true });
    const allDone = x.sets.every((s, j) => j === i || s.done);
    const isLast = a.index === a.exercises.length - 1;
    if (allDone && isLast) { toast(t('wk.allDone')); return; }
    const dur = x.restSec > 0 ? x.restSec : allDone ? 0 : settings.restSec;
    if (dur > 0) setRest({ end: Date.now() + dur * 1000, total: dur, advance: allDone });
    else if (allDone) { setIndex(a.index + 1); setTab('sets'); }
  }, [patchSet, setIndex, settings.restSec, t]);

  const holdLeft = useCountdown(hold ? hold.end : null, () => {
    if (!hold) return;
    signal();
    const s = hold.set;
    setHold(null);
    completeSet(s);
  });

  useEffect(() => { setHold(null); }, [idx]);

  const prevResult = useMemo(() => (ex ? lastSets(history, ex.exerciseId) : null), [history, ex?.exerciseId]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!active || !ex || !e) return null;

  const total = totalSets(active), done = doneSets(active);
  const pct = total ? Math.round((done / total) * 100) : 0;
  const elapsed = active.durationSec + pending.current + (sec && 0);
  const nextEx = !last ? EX_BY_ID[active.exercises[idx + 1].exerciseId] : null;
  const fav = favorites.includes(e.id);
  const timed = e.kind === 'time' || e.kind === 'cardio';
  const wStep = unit === 'kg' ? (e.equipment.includes('dumbbells') ? 1 : 2.5) : (e.equipment.includes('dumbbells') ? 2 : 5);
  const showW = (kg: number) => Math.round(toUnit(kg, unit) * 2) / 2;
  const curSet = cur >= 0 ? ex.sets[cur] : ex.sets[ex.sets.length - 1];

  const doFinish = () => {
    if (pending.current) { tick(pending.current); pending.current = 0; }
    if (doneSets(useStore.getState().active!) === 0) { discardWorkout(); toast(t('wk.discarded')); nav('/', true); return; }
    const s = finishWorkout();
    nav(s ? `/done/${s.id}` : '/', true);
  };
  const onFinish = () => (done > 0 && done < total ? setFinishAsk(true) : doFinish());

  return (
    <div className="screen flush no-tabs" style={{ animation: 'none' }}>
      <div className="wk-top">
        <button className="icon-btn" aria-label={t('common.back')} onClick={() => setPaused(true)}><ChevronLeft size={22} /></button>
        <div className="wk-progress">
          <div className="t"><span className="ellipsis">{tr(active.name)}</span><span className="num">{pct}%</span></div>
          <div className="segbar">
            {active.exercises.map((x, i) => <i key={i} className={x.sets.every((s) => s.done) ? 'done' : i === idx ? 'cur' : ''} />)}
          </div>
        </div>
        <span className="badge lav num" aria-label={t('wk.time')}><Timer size={13} />{mmss(elapsed)}</span>
      </div>
      <div className="wk-title">
        <div className="grow">
          <div className="tiny muted bold" style={{ textTransform: 'uppercase', letterSpacing: '.05em', marginBottom: 2 }}>{t('wk.exN', { n: idx + 1, m: active.exercises.length })}</div>
          <h1>{tr(e.name)}</h1>
        </div>
        <button className={`icon-btn ${fav ? 'on' : ''}`} aria-pressed={fav} aria-label={t('ex.fav')} onClick={() => toggleFavorite(e.id)}><Heart size={19} fill={fav ? 'currentColor' : 'none'} /></button>
      </div>

      <ExerciseViewer animId={e.anim} height="min(40dvh, 340px)" muscles={muscleSets(e)} compact paused={paused || !!rest} />

      <div className="wk-body">
        <Seg value={tab} onChange={setTab} options={[{ value: 'sets', label: t('wk.sets') }, { value: 'tech', label: t('wk.tech') }, { value: 'muscles', label: t('wk.muscles') }]} />

        {tab === 'sets' ? (
          <>
            <div className="card wk-now">
              <div><div className="stat-label">{t('wk.curSet')}</div><div className="v num">{Math.min(ex.sets.length, (cur < 0 ? ex.sets.length : cur + 1))} <small>{t('wk.of')} {ex.sets.length}</small></div></div>
              {hold ? (
                <div style={{ gridColumn: 'span 2' }}><div className="stat-label">{t('wk.left')}</div><div className="v num" style={{ color: 'var(--pink)' }}>{mmss(holdLeft)}</div></div>
              ) : (
                <>
                  <div><div className="stat-label">{e.kind === 'cardio' ? t('wk.minutes') : e.kind === 'time' ? t('wk.seconds') : t('wk.reps')}</div><div className="v num">{curSet.reps}</div></div>
                  <div><div className="stat-label">{e.kind === 'strength' ? t('wk.weight') : t('wk.rest')}</div><div className="v num">{e.kind === 'strength' ? <>{showW(curSet.weight)} <small>{u}</small></> : ex.restSec > 0 ? <>{ex.restSec} <small>{t('unit.sec')}</small></> : '—'}</div></div>
                </>
              )}
            </div>

            <div className="card tight sets">
              <div className="set-head" style={{ gridTemplateColumns: e.kind === 'strength' ? undefined : '34px 30px 1fr 30px' }}>
                <span>№</span><span /><span style={{ display: e.kind === 'strength' ? undefined : 'none' }}>{t('wk.weight')}, {u}</span>
                <span>{e.kind === 'cardio' ? t('wk.minutes') : e.kind === 'time' ? t('wk.seconds') : t('wk.reps')}</span><span />
              </div>
              {ex.sets.map((s, i) => (
                <div key={i} className={`set-row ${i === cur ? 'cur' : ''} ${s.done ? 'done' : ''}`} style={{ gridTemplateColumns: e.kind === 'strength' ? undefined : '34px 30px 1fr 30px' }}>
                  <span className="n num">{i + 1}</span>
                  <button className={`tick ${s.done ? 'on' : ''}`} aria-pressed={s.done} aria-label={t('wk.markSet', { n: i + 1 })}
                    onClick={() => (s.done ? patchSet(idx, i, { done: false }) : completeSet(i))}><Check size={16} strokeWidth={3} /></button>
                  {e.kind === 'strength' ? (
                    <Stepper value={showW(s.weight)} step={wStep} max={500} digits={1} label={`${t('wk.weight')} ${i + 1}`} onChange={(v) => patchSet(idx, i, { weight: Math.round(fromUnit(v, unit) * 100) / 100 })} />
                  ) : null}
                  <Stepper value={s.reps} min={1} max={e.kind === 'time' ? 600 : 200} step={e.kind === 'time' ? 5 : 1} label={`${t('wk.reps')} ${i + 1}`} onChange={(v) => patchSet(idx, i, { reps: v })} />
                  <button className="icon-btn sm plain" aria-label={t('wk.delSet', { n: i + 1 })} disabled={ex.sets.length <= 1} style={{ opacity: ex.sets.length <= 1 ? 0.3 : 1, width: 30 }} onClick={() => removeSet(idx, i)}><Trash2 size={15} /></button>
                </div>
              ))}
              <button className="btn ghost block sm" onClick={() => addSet(idx)}><Plus size={16} />{t('wk.addSet')}</button>
            </div>

            {timed && cur >= 0 ? (
              hold ? (
                <button className="btn soft block md" onClick={() => setHold(null)}><Pause size={17} />{t('wk.stopTimer')}</button>
              ) : (
                <button className="btn tint block md" onClick={() => { const d = curSet.reps * (e.kind === 'cardio' ? 60 : 1); setHold({ set: cur, end: Date.now() + d * 1000, total: d }); }}>
                  <Play size={17} fill="currentColor" />{t('wk.startTimer', { v: e.kind === 'cardio' ? `${curSet.reps} ${t('unit.min')}` : `${curSet.reps} ${t('unit.sec')}` })}
                </button>
              )
            ) : null}
            {!timed && cur >= 0 ? (
              <button className="btn tint block md" onClick={() => completeSet(cur)}><Check size={18} strokeWidth={2.8} />{t('wk.doneSet', { n: cur + 1 })}</button>
            ) : null}

            {prevResult && e.kind === 'strength' ? (
              <p className="small muted center">{t('wk.prev')}: <b className="num">{prevResult.map((s) => `${showW(s.weight)} × ${s.reps}`).join(' · ')}</b></p>
            ) : e.kind === 'strength' ? <p className="small muted center">{t('wk.firstTime')}</p> : null}
          </>
        ) : tab === 'tech' ? (
          <><TechniqueCard e={e} /><MistakesCard e={e} /><p className="demo-tag">{t('ex.disclaimer')}</p></>
        ) : <MusclesCard e={e} />}

        <div className="card tight next-card">
          {nextEx ? (
            <>
              <Thumb id={nextEx.id} size="sm" />
              <div className="grow"><div className="tiny muted bold">{t('wk.next')}</div><div className="bold ellipsis">{tr(nextEx.name)}</div></div>
            </>
          ) : <div className="grow"><div className="tiny muted bold">{t('wk.next')}</div><div className="bold">{t('wk.lastOne')}</div></div>}
          <button className="btn soft sm" onClick={() => setReplace(true)}><ArrowRightLeft size={15} />{t('wk.replace')}</button>
        </div>
        <button className="btn ghost block" onClick={onFinish}><Flag size={17} />{t('wk.finish')}</button>
      </div>

      <div className="wk-bar">
        <button className="btn soft" disabled={idx === 0} onClick={() => { setIndex(idx - 1); setTab('sets'); }}><ArrowLeft size={18} />{t('wk.prevBtn')}</button>
        <button className="btn primary" onClick={() => setPaused(true)}><Pause size={18} fill="currentColor" />{t('common.pause')}</button>
        {last ? <button className="btn soft" onClick={onFinish}>{t('wk.finishShort')}<Flag size={17} /></button>
          : <button className="btn soft" onClick={() => { setIndex(idx + 1); setTab('sets'); }}>{t('wk.nextBtn')}<ArrowRight size={18} /></button>}
      </div>

      {rest ? (
        <div className="rest-screen" role="dialog" aria-label={t('rest.title')}>
          <h2>{t('rest.title')}</h2>
          <Ring value={(restPause ?? restLeft) / Math.max(1, rest.total)} size={230} stroke={12} track="rgba(255,255,255,.16)">
            <div>
              <div className="time">{mmss(restPause ?? restLeft)}</div>
              <button className="glass-btn round" style={{ margin: '4px auto 0', background: 'rgba(255,255,255,.18)', color: '#fff', borderColor: 'rgba(255,255,255,.3)' }}
                aria-label={restPause === null ? t('common.pause') : t('common.continue')}
                onClick={() => {
                  if (restPause === null) setRestPause(restLeft);
                  else { setRest({ ...rest, end: Date.now() + restPause * 1000 }); setRestPause(null); }
                }}>
                {restPause === null ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" />}
              </button>
            </div>
          </Ring>
          <div className="adds">
            {[[15, t('rest.plus15')], [30, t('rest.plus30')], [60, t('rest.plus60')]].map(([n, label]) => (
              <button key={n} className="pill" onClick={() => {
                const add = Number(n);
                if (restPause !== null) { setRestPause(restPause + add); setRest({ ...rest, total: rest.total + add }); }
                else setRest({ ...rest, end: rest.end + add * 1000, total: rest.total + add });
              }}>{label}</button>
            ))}
          </div>
          <button className="pill" style={{ width: '100%', maxWidth: 380, justifyContent: 'center' }} onClick={() => { addWater(today(), 250); toast(t('rest.waterAdded')); }}>
            <Droplet size={17} />{t('rest.water')}
          </button>
          <div className="card tight row">
            <Thumb id={rest.advance && nextEx ? nextEx.id : e.id} size="sm" />
            <div className="grow" style={{ textAlign: 'left' }}>
              <div className="tiny muted bold">{rest.advance ? t('wk.next') : t('rest.nextSet')}</div>
              <div className="bold">{rest.advance && nextEx ? tr(nextEx.name) : `${tr(e.name)} · ${t('wk.setN', { n: Math.min(ex.sets.length, cur + 1), m: ex.sets.length })}`}</div>
            </div>
            <ChevronRight size={18} />
          </div>
          <button className="btn primary block" style={{ maxWidth: 380 }} onClick={() => endRest(rest.advance)}><SkipForward size={18} fill="currentColor" />{t('rest.skip')}</button>
        </div>
      ) : null}

      {paused ? (
        <Sheet title={t('wk.paused')} onClose={() => setPaused(false)}>
          <div className="card center">
            <div className="stat-label">{t('wk.time')}</div>
            <div className="stat-value num" style={{ fontSize: 34 }}>{mmss(elapsed)}</div>
            <div className="small muted">{t('wk.progress', { n: done, m: total })}</div>
          </div>
          <button className="btn primary block" onClick={() => setPaused(false)}><Play size={18} fill="currentColor" />{t('common.continue')}</button>
          <button className="btn soft block md" onClick={() => { if (pending.current) { tick(pending.current); pending.current = 0; } nav('/', true); }}>{t('wk.later')}</button>
          <button className="btn tint block md" onClick={() => { setPaused(false); onFinish(); }}><Flag size={17} />{t('wk.finish')}</button>
          <p className="small muted center">{t('wk.later.d')}</p>
        </Sheet>
      ) : null}

      {replace ? <ReplaceSheet current={e} used={active.exercises.map((x) => x.exerciseId)} onClose={() => setReplace(false)} onPick={(id) => { replaceExercise(idx, id); setReplace(false); setHold(null); toast(t('wk.replaced')); }} /> : null}
      {finishAsk ? <Confirm title={t('wk.finishEarly')} text={t('wk.finishEarly.d', { n: done, m: total })} yes={t('wk.finish')} no={t('common.continue')} onYes={() => { setFinishAsk(false); doFinish(); }} onNo={() => setFinishAsk(false)} /> : null}
    </div>
  );
}

function ReplaceSheet({ current, used, onPick, onClose }: { current: Exercise; used: string[]; onPick: (id: string) => void; onClose: () => void }) {
  const { t, tr } = useT();
  const profile = useStore((s) => s.profile)!;
  const [sel, setSel] = useState<string | null>(null);
  const options = useMemo(() => {
    const ids = new Set<string>();
    const out: Exercise[] = [];
    const push = (x?: Exercise) => { if (x && x.id !== current.id && !used.includes(x.id) && !ids.has(x.id)) { ids.add(x.id); out.push(x); } };
    current.alternatives.forEach((a) => push(EX_BY_ID[a]));
    // затем — упражнения на те же основные мышцы, доступные в выбранном месте
    EXERCISES.filter((x) => x.category === current.category && x.primary.some((m) => current.primary.includes(m)) && isAvailable(x, { ...profile, level: 3 })).forEach(push);
    return out.slice(0, 7);
  }, [current, used, profile]);
  return (
    <Sheet title={t('rep.title')} onClose={onClose} footer={<button className="btn primary block" disabled={!sel} onClick={() => sel && onPick(sel)}>{t('wk.replace')} <Check size={18} strokeWidth={2.8} /></button>}>
      <div className="card tight row">
        <Thumb id={current.id} />
        <div className="grow"><div className="bold">{tr(current.name)}</div><div className="small muted">{t('rep.current')}</div></div>
      </div>
      <div className="bold">{t('rep.choose')}</div>
      {options.map((x) => (
        <button key={x.id} className={`opt ${sel === x.id ? 'on' : ''}`} style={{ minHeight: 0 }} onClick={() => setSel(x.id)} aria-pressed={sel === x.id}>
          <Thumb id={x.id} />
          <div className="grow">
            <div className="t" style={{ fontSize: 15 }}>{tr(x.name)}</div>
            <div className="d">{x.primary.map((m) => tr(MUSCLE_NAMES[m])).join(', ')}</div>
            <div className="d">{tr(EQUIPMENT_NAMES[x.equipment[0]])} · {t(`level.${x.level}`)}</div>
          </div>
          <span className="check"><Check size={16} strokeWidth={3} /></span>
        </button>
      ))}
      {!options.length ? <p className="muted center">{t('rep.none')}</p> : null}
    </Sheet>
  );
}

/** Экран завершения тренировки. */
export function WorkoutDone({ id }: { id: string }) {
  const { t, tr } = useT();
  const s = useStore((st) => st.history.find((x) => x.id === id));
  const unit = useStore((st) => st.settings.unit);
  const confetti = useMemo(() => Array.from({ length: 36 }, (_, i) => ({
    left: `${(i * 37) % 100}%`, delay: `${(i % 9) * 0.18}s`, dur: `${2.6 + (i % 5) * 0.5}s`,
    color: ['#F7B4D1', '#FFD166', '#C6A7E8', '#FFFFFF', '#F05A9D'][i % 5], rot: `${(i * 53) % 360}deg`,
  })), []);
  useEffect(() => { if (!s) nav('/', true); }, [s]);
  if (!s) return null;
  const tons = tonnage(s);
  const exDone = s.exercises.filter((x) => x.sets.some((y) => y.done)).length;
  return (
    <div className="done-screen">
      <div className="confetti" aria-hidden>{confetti.map((c, i) => <i key={i} style={{ left: c.left, background: c.color, animationDelay: c.delay, animationDuration: c.dur, transform: `rotate(${c.rot})` }} />)}</div>
      <img className="hero-img" src={mediaUrl('hero')} alt="" />
      <div className="done-check"><Check size={40} strokeWidth={3} /></div>
      <h1>{t('done.title')}</h1>
      <p style={{ opacity: 0.9, marginTop: -8 }}>{tr(s.name)}</p>
      <div className="done-stats">
        <div><b className="num">{s.kcal}</b><span>{t('unit.kcal')}</span></div>
        <div><b className="num">{Math.max(1, Math.round(s.durationSec / 60))}</b><span>{t('unit.min')}</span></div>
        <div><b className="num">{exDone}</b><span>{t('done.exercises', { n: exDone })}</span></div>
      </div>
      {tons > 0 ? <p className="small" style={{ opacity: 0.9 }}>{t('done.tonnage', { v: Math.round(toUnit(tons, unit)), u: t(unit === 'kg' ? 'unit.kg' : 'unit.lb') })}</p> : null}
      <button className="btn primary block" onClick={() => nav('/', true)}>{t('done.ok')}</button>
      <button className="btn ghost" style={{ color: '#fff' }} onClick={() => nav('/progress', true)}>{t('done.progress')}</button>
    </div>
  );
}
