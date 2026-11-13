import { useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, ChevronRight, Clock, Dumbbell, Flame, Moon, Play, Plus, RefreshCw, Search, Trash2 } from 'lucide-react';
import { CATEGORIES, CATEGORY_SHORT, EXERCISES, EX_BY_ID, MUSCLE_NAMES, thumbUrl } from '../data/exercises';
import { today } from '../domain/dates';
import { COVER, estimateKcal, estimateMinutes, prescription, workoutForDate } from '../domain/plan';
import type { Category, Exercise, PlanItem } from '../domain/types';
import { fmtDate, useT, WEEKDAYS_LONG } from '../i18n';
import { back, nav } from '../router';
import { useStore } from '../store';
import { Confirm, Empty, Header, Sheet, Stepper, Thumb, toast } from '../ui/basic';

export function itemLabel(e: Exercise, it: { sets: number; reps: number }, t: ReturnType<typeof useT>['t']): string {
  if (e.kind === 'cardio') return `${it.reps} ${t('unit.min')}`;
  if (e.kind === 'time') return `${it.sets} × ${it.reps} ${t('unit.sec')}`;
  return `${t('common.sets', { n: it.sets })} × ${it.reps}`;
}

/** Экран тренировки на дату: состав и кнопка старта. */
export function DayPreview({ date }: { date: string }) {
  const { t, tr, lang } = useT();
  const plan = useStore((s) => s.plan);
  const profile = useStore((s) => s.profile)!;
  const active = useStore((s) => s.active);
  const start = useStore((s) => s.startWorkout);
  const [ask, setAsk] = useState(false);
  const w = plan ? workoutForDate(plan, date) : null;
  if (!w) {
    return (
      <div className="screen no-tabs">
        <Header title={fmtDate(lang, date, { weekday: 'long', day: 'numeric', month: 'long' })} onBack />
        <Empty icon={<Moon size={26} />} title={t('train.rest')} text={t('train.rest.d')} action={<button className="btn tint sm" onClick={() => nav(`/train?d=${date}`, true)}>{t('train.addHere')}</button>} />
      </div>
    );
  }
  const go = () => { if (start(w.id, today())) nav('/workout'); };
  const onStart = () => (active ? setAsk(true) : go());
  return (
    <div className="screen no-tabs">
      <Header title={t('train.program')} sub={fmtDate(lang, date, { weekday: 'long', day: 'numeric', month: 'long' })} onBack />
      <div className="hero-card" style={{ minHeight: 190 }}>
        <img className="img" src={thumbUrl(COVER[w.type])} alt="" />
        <div className="k" style={{ textTransform: 'uppercase', letterSpacing: '.05em' }}>{fmtDate(lang, date, { weekday: 'long' })}</div>
        <h2>{tr(w.name)}</h2>
        <div className="meta">
          <span><Dumbbell size={15} />{t('common.exercises', { n: w.items.length })}</span>
          <span><Clock size={15} />≈ {t('common.min', { n: estimateMinutes(w.items) })}</span>
          <span><Flame size={15} />≈ {estimateKcal(w.items, profile.weightKg)} {t('unit.kcal')}</span>
        </div>
      </div>
      <div className="card pad0 list">
        {w.items.map((it, i) => {
          const e = EX_BY_ID[it.exerciseId];
          if (!e) return null;
          return (
            <button key={i} className="list-item" onClick={() => nav(`/exercise/${e.id}`)}>
              <span className="idx num">{i + 1}</span>
              <Thumb id={e.id} size="sm" />
              <div className="grow"><div className="title">{tr(e.name)}</div><div className="sub">{itemLabel(e, it, t)}</div></div>
              <ChevronRight size={18} className="chev" />
            </button>
          );
        })}
      </div>
      <div className="sticky-cta">
        <button className="btn primary block" onClick={onStart}><Play size={18} fill="currentColor" />{t('home.start')}</button>
      </div>
      {ask ? <Confirm title={t('wk.replaceActive')} text={t('wk.replaceActive.d')} yes={t('wk.startNew')} no={t('home.resume')} onYes={go} onNo={() => nav('/workout')} /> : null}
    </div>
  );
}

/** Недельное расписание. */
export function Schedule() {
  const { t, tr, lang } = useT();
  const plan = useStore((s) => s.plan);
  const setWeekDay = useStore((s) => s.setWeekDay);
  const regenerate = useStore((s) => s.regeneratePlan);
  const [day, setDay] = useState<number | null>(null);
  const [ask, setAsk] = useState(false);
  if (!plan) return null;
  return (
    <div className="screen no-tabs">
      <Header title={t('sched.title')} onBack />
      <p className="muted small">{t('sched.text')}</p>
      <div className="card pad0 list">
        {plan.week.map((id, i) => {
          const w = id ? plan.workouts[id] : null;
          return (
            <button key={i} className="list-item" onClick={() => setDay(i)}>
              <div className={`list-icon ${w ? '' : 'lav'}`}>{w ? <Dumbbell size={20} /> : <Moon size={20} />}</div>
              <div className="grow">
                <div className="tiny muted bold" style={{ textTransform: 'uppercase', letterSpacing: '.04em' }}>{WEEKDAYS_LONG[lang][i]}</div>
                <div className="title">{w ? tr(w.name) : t('train.rest')}</div>
              </div>
              <ChevronRight size={18} className="chev" />
            </button>
          );
        })}
      </div>
      <button className="btn soft block md" onClick={() => nav('/workout-edit/new')}><Plus size={17} />{t('train.create')}</button>
      <button className="btn tint block md" onClick={() => setAsk(true)}><RefreshCw size={17} />{t('sched.regen')}</button>
      {day !== null ? (
        <Sheet title={WEEKDAYS_LONG[lang][day]} onClose={() => setDay(null)}>
          <button className={`opt compact ${plan.week[day] === null ? 'on' : ''}`} onClick={() => { setWeekDay(day, null); setDay(null); }}><div className="t">{t('train.rest')}</div></button>
          {Object.values(plan.workouts).map((w) => (
            <button key={w.id} className={`opt ${plan.week[day] === w.id ? 'on' : ''}`} onClick={() => { setWeekDay(day, w.id); setDay(null); }}>
              <Thumb id={w.items[Math.min(1, w.items.length - 1)]?.exerciseId ?? 'walking'} />
              <div className="grow"><div className="t">{tr(w.name)}</div><div className="d">{t('common.exercises', { n: w.items.length })} · {t('common.min', { n: estimateMinutes(w.items) })}</div></div>
            </button>
          ))}
        </Sheet>
      ) : null}
      {ask ? <Confirm title={t('sched.regen')} text={t('sched.regen.d')} yes={t('sched.regen.yes')} no={t('common.cancel')} onYes={() => { regenerate(); setAsk(false); toast(t('sched.regen.ok')); }} onNo={() => setAsk(false)} /> : null}
    </div>
  );
}

/** Выбор упражнения из каталога (для редактора и замены). */
export function ExercisePicker({ onPick, onClose, exclude = [] }: { onPick: (id: string) => void; onClose: () => void; exclude?: string[] }) {
  const { t, tr, lang } = useT();
  const [q, setQ] = useState('');
  const [cat, setCat] = useState<Category | 'all'>('all');
  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return EXERCISES.filter((e) => !exclude.includes(e.id) && (cat === 'all' || e.category === cat) && (!s || e.name[lang].toLowerCase().includes(s)));
  }, [q, cat, exclude, lang]);
  return (
    <Sheet title={t('edit.add')} onClose={onClose}>
      <div className="search"><Search size={18} /><input className="field" placeholder={t('cat.search')} value={q} onChange={(e) => setQ(e.target.value)} /></div>
      <div className="chips">
        <button className={`chip ${cat === 'all' ? 'on' : ''}`} onClick={() => setCat('all')}>{t('cat.all')}</button>
        {CATEGORIES.map((c) => <button key={c} className={`chip ${cat === c ? 'on' : ''}`} onClick={() => setCat(c)}>{tr(CATEGORY_SHORT[c])}</button>)}
      </div>
      <div className="card pad0 list" style={{ minHeight: 240 }}>
        {list.map((e) => (
          <button key={e.id} className="list-item" onClick={() => onPick(e.id)}>
            <Thumb id={e.id} size="sm" />
            <div className="grow"><div className="title">{tr(e.name)}</div><div className="sub">{e.primary.map((m) => tr(MUSCLE_NAMES[m])).join(', ')}</div></div>
            <Plus size={18} className="chev" />
          </button>
        ))}
        {!list.length ? <p className="muted center" style={{ padding: 20 }}>{t('cat.empty')}</p> : null}
      </div>
    </Sheet>
  );
}

/** Редактор тренировки: своя или из плана. */
export function WorkoutEdit({ id }: { id: string }) {
  const { t, tr } = useT();
  const plan = useStore((s) => s.plan);
  const profile = useStore((s) => s.profile)!;
  const save = useStore((s) => s.saveWorkout);
  const del = useStore((s) => s.deleteWorkout);
  const existing = id !== 'new' ? plan?.workouts[id] : undefined;
  const isCustom = !existing || !!existing.custom;
  const [name, setName] = useState(existing ? tr(existing.name) : '');
  const [items, setItems] = useState<PlanItem[]>(existing?.items ?? []);
  const [pick, setPick] = useState(false);
  const [ask, setAsk] = useState(false);

  const patch = (i: number, p: Partial<PlanItem>) => setItems((xs) => xs.map((x, j) => (j === i ? { ...x, ...p } : x)));
  const move = (i: number, d: number) => setItems((xs) => {
    const j = i + d;
    if (j < 0 || j >= xs.length) return xs;
    const c = [...xs];
    [c[i], c[j]] = [c[j], c[i]];
    return c;
  });
  const onSave = () => {
    if (!items.length) return toast(t('edit.needItems'));
    save({ id: existing?.id, name: name.trim() || t('edit.defaultName'), items });
    toast(t('common.saved'));
    back('/train');
  };

  return (
    <div className="screen no-tabs">
      <Header title={existing ? t('edit.title') : t('train.create')} onBack
        right={existing?.custom ? <button className="icon-btn" aria-label={t('common.delete')} onClick={() => setAsk(true)}><Trash2 size={18} /></button> : undefined} />
      {isCustom ? (
        <input className="field" placeholder={t('edit.name')} maxLength={32} value={name} onChange={(e) => setName(e.target.value)} />
      ) : <div className="bold" style={{ fontSize: 20 }}>{name}</div>}
      <div className="small muted">{t('common.exercises', { n: items.length })} · ≈ {t('common.min', { n: estimateMinutes(items) })} · ≈ {estimateKcal(items, profile.weightKg)} {t('unit.kcal')}</div>

      {items.length ? items.map((it, i) => {
        const e = EX_BY_ID[it.exerciseId];
        if (!e) return null;
        return (
          <div key={`${it.exerciseId}-${i}`} className="card tight">
            <div className="row">
              <Thumb id={e.id} size="sm" />
              <div className="grow bold">{tr(e.name)}</div>
              <button className="icon-btn sm plain" aria-label={t('edit.up')} disabled={i === 0} onClick={() => move(i, -1)}><ArrowUp size={16} /></button>
              <button className="icon-btn sm plain" aria-label={t('edit.down')} disabled={i === items.length - 1} onClick={() => move(i, 1)}><ArrowDown size={16} /></button>
              <button className="icon-btn sm plain" aria-label={t('common.delete')} onClick={() => setItems((xs) => xs.filter((_, j) => j !== i))}><Trash2 size={16} /></button>
            </div>
            <div className="row" style={{ marginTop: 10, gap: 14, flexWrap: 'wrap' }}>
              {e.kind !== 'cardio' ? (
                <div className="col" style={{ gap: 4 }}><span className="tiny muted bold">{t('wk.sets')}</span><Stepper value={it.sets} min={1} max={8} onChange={(v) => patch(i, { sets: v })} label={t('wk.sets')} /></div>
              ) : null}
              <div className="col" style={{ gap: 4 }}>
                <span className="tiny muted bold">{e.kind === 'cardio' ? t('unit.min') : e.kind === 'time' ? t('unit.sec') : t('wk.reps')}</span>
                <Stepper value={it.reps} min={1} max={e.kind === 'time' ? 300 : 120} step={e.kind === 'time' ? 5 : 1} onChange={(v) => patch(i, { reps: v })} label={t('wk.reps')} />
              </div>
              {e.kind !== 'cardio' ? (
                <div className="col" style={{ gap: 4 }}><span className="tiny muted bold">{t('wk.rest')}, {t('unit.sec')}</span><Stepper value={it.restSec} min={0} max={300} step={15} onChange={(v) => patch(i, { restSec: v })} label={t('wk.rest')} /></div>
              ) : null}
            </div>
          </div>
        );
      }) : <Empty icon={<Dumbbell size={26} />} title={t('edit.empty')} text={t('edit.empty.d')} />}

      <button className="btn soft block md" onClick={() => setPick(true)}><Plus size={17} />{t('edit.add')}</button>
      <div className="sticky-cta"><button className="btn primary block" onClick={onSave}>{t('common.save')}</button></div>

      {pick ? <ExercisePicker onClose={() => setPick(false)} onPick={(eid) => {
        setItems((xs) => [...xs, { exerciseId: eid, ...prescription(EX_BY_ID[eid], profile.goal, profile.level) }]);
        setPick(false);
      }} /> : null}
      {ask && existing ? <Confirm danger title={t('edit.delete')} text={t('edit.delete.d')} yes={t('common.delete')} no={t('common.cancel')} onYes={() => { del(existing.id); nav('/train', true); }} onNo={() => setAsk(false)} /> : null}
    </div>
  );
}
