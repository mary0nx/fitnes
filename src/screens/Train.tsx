import { useMemo, useState } from 'react';
import { ArrowRightLeft, CalendarDays, Check, ChevronLeft, ChevronRight, Clock, Dumbbell, Flame, Heart, History, Moon, Pencil, Play, Plus, Search, Settings2, Trash2 } from 'lucide-react';
import { CATEGORIES, CATEGORY_SHORT, EQUIPMENT_NAMES, EXERCISES, EX_BY_ID, MUSCLE_NAMES } from '../data/exercises';
import { addDays, addMonths, monthGrid, startOfMonth, today, weekDates, weekday } from '../domain/dates';
import { doneSets, estimateKcal, estimateMinutes, programWeek, workoutForDate, workoutIdForDate } from '../domain/plan';
import type { Category, Session, WorkoutTemplate } from '../domain/types';
import { fmtDate, useT, WEEKDAYS_LONG, WEEKDAYS_SHORT } from '../i18n';
import { nav, useRoute } from '../router';
import { useStore } from '../store';
import { Empty, Header, Seg, Sheet, Thumb, toast } from '../ui/basic';

type Tab = 'program' | 'catalog' | 'history';
type CalView = 'week' | 'month' | 'list';

export function Train() {
  const { t } = useT();
  const { parts, query } = useRoute();
  const tab = (parts[1] as Tab) || 'program';
  return (
    <div className="screen">
      <Header large title={t('tab.train')} right={<button className="icon-btn" aria-label={t('sched.title')} onClick={() => nav('/schedule')}><Settings2 size={20} /></button>} />
      <Seg value={tab} onChange={(v) => nav(v === 'program' ? '/train' : `/train/${v}`, true)} options={[
        { value: 'program', label: t('train.program') }, { value: 'catalog', label: t('train.catalog') }, { value: 'history', label: t('train.history') },
      ]} />
      {tab === 'program' ? <Program initial={query.get('d')} /> : tab === 'catalog' ? <Catalog /> : <HistoryList />}
    </div>
  );
}

/* ================= программа ================= */

function Program({ initial }: { initial: string | null }) {
  const { t, tr, lang } = useT();
  const plan = useStore((s) => s.plan);
  const history = useStore((s) => s.history);
  const now = today();
  const [sel, setSel] = useState(initial && /^\d{4}-\d\d-\d\d$/.test(initial) ? initial : now);
  const [view, setView] = useState<CalView>('week');
  const [month, setMonth] = useState(startOfMonth(sel));
  if (!plan) return <Empty icon={<CalendarDays size={26} />} title={t('home.noPlan')} />;

  const has = (d: string) => !!workoutIdForDate(plan, d);
  const done = (d: string) => history.some((s) => s.date === d);
  const week = weekDates(sel);
  const custom = Object.values(plan.workouts).filter((w) => w.custom);

  return (
    <>
      <div className="row between">
        <div className="small muted bold">{t('home.programWeek', { n: Math.min(Math.max(1, programWeek(plan, sel)), plan.weeks), m: plan.weeks })}</div>
        <div style={{ width: 210 }}>
          <Seg value={view} onChange={setView} options={[{ value: 'week', label: t('cal.week') }, { value: 'month', label: t('cal.month') }, { value: 'list', label: t('cal.list') }]} />
        </div>
      </div>

      {view === 'week' ? (
        <>
          <div className="row between">
            <button className="icon-btn sm" aria-label={t('cal.prev')} onClick={() => setSel(addDays(sel, -7))}><ChevronLeft size={18} /></button>
            <div className="bold">{fmtDate(lang, week[0], { day: 'numeric', month: 'short' })} — {fmtDate(lang, week[6], { day: 'numeric', month: 'short' })}</div>
            <button className="icon-btn sm" aria-label={t('cal.next')} onClick={() => setSel(addDays(sel, 7))}><ChevronRight size={18} /></button>
          </div>
          <div className="daybar">
            {week.map((d, i) => (
              <button key={d} className={`${d === sel ? 'on' : ''} ${done(d) ? 'done' : has(d) ? 'has' : ''}`} onClick={() => setSel(d)} aria-pressed={d === sel}>
                {WEEKDAYS_SHORT[lang][i]}<b className="num">{Number(d.slice(8))}</b><span className="p" />
              </button>
            ))}
          </div>
        </>
      ) : null}

      {view === 'month' ? (
        <div className="card">
          <div className="row between" style={{ marginBottom: 10 }}>
            <button className="icon-btn sm" aria-label={t('cal.prev')} onClick={() => setMonth(addMonths(month, -1))}><ChevronLeft size={18} /></button>
            <div className="bold">{fmtDate(lang, month, { month: 'long', year: 'numeric' })}</div>
            <button className="icon-btn sm" aria-label={t('cal.next')} onClick={() => setMonth(addMonths(month, 1))}><ChevronRight size={18} /></button>
          </div>
          <div className="month">
            {WEEKDAYS_SHORT[lang].map((w) => <div key={w} className="wd">{w}</div>)}
            {monthGrid(month).map((d) => (
              <button key={d} onClick={() => setSel(d)} className={`num ${d.slice(0, 7) !== month.slice(0, 7) ? 'out' : ''} ${d === sel ? 'on' : ''} ${done(d) ? 'done' : has(d) ? 'has' : ''} ${d === now ? 'today' : ''}`}>
                {Number(d.slice(8))}<span className="p" />
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {view === 'list' ? (
        <div className="card pad0 list">
          {week.map((d, i) => {
            const w = workoutForDate(plan, d);
            return (
              <button key={d} className="list-item" onClick={() => { setSel(d); setView('week'); }}>
                <div className={`list-icon ${w ? '' : 'lav'}`}>{done(d) ? <Check size={20} /> : w ? <Dumbbell size={20} /> : <Moon size={20} />}</div>
                <div className="grow">
                  <div className="tiny muted bold" style={{ textTransform: 'uppercase', letterSpacing: '.04em' }}>{WEEKDAYS_LONG[lang][i]}</div>
                  <div className="title">{w ? tr(w.name) : t('train.rest')}</div>
                </div>
                {w ? <span className="small muted">{t('common.min', { n: estimateMinutes(w.items) })}</span> : null}
                <ChevronRight size={18} className="chev" />
              </button>
            );
          })}
        </div>
      ) : null}

      {view !== 'list' ? <DayCard date={sel} /> : null}

      <div className="row between" style={{ marginTop: 6 }}>
        <h2 className="section" style={{ margin: 0 }}>{t('train.mine')}</h2>
        <button className="link row" style={{ gap: 4 }} onClick={() => nav('/workout-edit/new')}><Plus size={16} />{t('train.create')}</button>
      </div>
      {custom.length ? (
        <div className="card pad0 list">
          {custom.map((w) => (
            <button key={w.id} className="list-item" onClick={() => nav(`/workout-edit/${w.id}`)}>
              <Thumb id={w.items[0]?.exerciseId ?? 'biceps_curl'} size="sm" />
              <div className="grow"><div className="title">{tr(w.name)}</div><div className="sub">{t('common.exercises', { n: w.items.length })} · {t('common.min', { n: estimateMinutes(w.items) })}</div></div>
              <Pencil size={17} className="chev" />
            </button>
          ))}
        </div>
      ) : <p className="small muted">{t('train.mine.empty')}</p>}
    </>
  );
}

/** Карточка выбранного дня: тренировка или отдых + действия. */
export function DayCard({ date }: { date: string }) {
  const { t, tr, lang } = useT();
  const plan = useStore((s) => s.plan)!;
  const profile = useStore((s) => s.profile)!;
  const history = useStore((s) => s.history);
  const setOverride = useStore((s) => s.setOverride);
  const moveWorkout = useStore((s) => s.moveWorkout);
  const [sheet, setSheet] = useState<'move' | 'add' | null>(null);
  const w = workoutForDate(plan, date);
  const session = history.find((s) => s.date === date);
  const now = today();
  const title = fmtDate(lang, date, { weekday: 'long', day: 'numeric', month: 'long' });

  if (session) {
    return (
      <button className="card tap" onClick={() => nav(`/session/${session.id}`)}>
        <div className="row between"><span className="badge ok"><Check size={13} />{t('train.done')}</span><span className="small muted">{title}</span></div>
        <div className="bold" style={{ fontSize: 19, marginTop: 8 }}>{tr(session.name)}</div>
        <div className="row small muted" style={{ marginTop: 6, gap: 14 }}>
          <span className="row" style={{ gap: 5 }}><Clock size={14} />{t('common.min', { n: Math.max(1, Math.round(session.durationSec / 60)) })}</span>
          <span className="row" style={{ gap: 5 }}><Flame size={14} />{session.kcal} {t('unit.kcal')}</span>
          <span className="row" style={{ gap: 5 }}><Dumbbell size={14} />{t('common.sets', { n: doneSets(session) })}</span>
        </div>
      </button>
    );
  }

  const moveTargets = Array.from({ length: 10 }, (_, i) => addDays(now > date ? now : date, i - (now > date ? 0 : 3)))
    .filter((d) => d !== date && d >= now && !workoutIdForDate(plan, d)).slice(0, 6);

  return (
    <>
      {w ? (
        <div className="card">
          <div className="row between"><span className="badge">{date === now ? t('home.today') : title}</span>{date in plan.overrides ? <button className="link small" onClick={() => setOverride(date, undefined)}>{t('train.reset')}</button> : null}</div>
          <div className="bold" style={{ fontSize: 21, marginTop: 8, letterSpacing: '-.01em' }}>{tr(w.name)}</div>
          <div className="row small muted" style={{ marginTop: 6, gap: 14, flexWrap: 'wrap' }}>
            <span className="row" style={{ gap: 5 }}><Dumbbell size={14} />{t('common.exercises', { n: w.items.length })}</span>
            <span className="row" style={{ gap: 5 }}><Clock size={14} />≈ {t('common.min', { n: estimateMinutes(w.items) })}</span>
            <span className="row" style={{ gap: 5 }}><Flame size={14} />≈ {estimateKcal(w.items, profile.weightKg)} {t('unit.kcal')}</span>
          </div>
          <div className="row" style={{ margin: '12px -2px 0', gap: 6, overflowX: 'auto' }}>
            {w.items.map((it, i) => <Thumb key={i} id={it.exerciseId} size="sm" />)}
          </div>
          <button className="btn primary block md" style={{ marginTop: 14 }} onClick={() => nav(`/day/${date}`)}>{t('train.open')} <ChevronRight size={18} /></button>
          <div className="row" style={{ marginTop: 8 }}>
            <button className="btn soft sm grow" onClick={() => setSheet('move')}><ArrowRightLeft size={16} />{t('train.move')}</button>
            <button className="btn soft sm grow" onClick={() => nav(`/workout-edit/${w.id}`)}><Pencil size={16} />{t('common.edit')}</button>
          </div>
        </div>
      ) : (
        <div className="card">
          <div className="row">
            <div className="list-icon lav"><Moon size={20} /></div>
            <div className="grow"><div className="bold">{t('train.rest')}</div><div className="small muted">{title} · {t('train.rest.d')}</div></div>
          </div>
          <button className="btn soft block sm" style={{ marginTop: 12 }} onClick={() => setSheet('add')}><Plus size={16} />{t('train.addHere')}</button>
        </div>
      )}

      {sheet === 'move' && w ? (
        <Sheet title={t('train.move.title')} onClose={() => setSheet(null)}>
          <p className="muted small">{t('train.move.text', { name: tr(w.name) })}</p>
          {moveTargets.length ? moveTargets.map((d) => (
            <button key={d} className="opt compact" onClick={() => { moveWorkout(date, d); setSheet(null); toast(t('train.moved')); }}>
              <div className="t">{fmtDate(lang, d, { weekday: 'long', day: 'numeric', month: 'long' })}</div>
            </button>
          )) : <p className="muted">{t('train.move.none')}</p>}
          <button className="btn danger block md" onClick={() => { setOverride(date, null); setSheet(null); toast(t('train.skipped')); }}>{t('train.skip')}</button>
        </Sheet>
      ) : null}
      {sheet === 'add' ? (
        <Sheet title={t('train.addHere')} onClose={() => setSheet(null)}>
          {Object.values(plan.workouts).map((x: WorkoutTemplate) => (
            <button key={x.id} className="opt" onClick={() => { setOverride(date, x.id); setSheet(null); }}>
              <Thumb id={x.items[Math.min(1, x.items.length - 1)]?.exerciseId ?? 'walking'} />
              <div className="grow"><div className="t">{tr(x.name)}</div><div className="d">{t('common.exercises', { n: x.items.length })} · {t('common.min', { n: estimateMinutes(x.items) })}</div></div>
            </button>
          ))}
          <button className="btn tint block md" onClick={() => nav('/workout-edit/new')}><Plus size={16} />{t('train.create')}</button>
        </Sheet>
      ) : null}
    </>
  );
}

/* ================= каталог ================= */

function Catalog() {
  const { t, tr, lang } = useT();
  const favorites = useStore((s) => s.favorites);
  const [cat, setCat] = useState<Category | 'all' | 'fav'>('all');
  const [q, setQ] = useState('');
  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return EXERCISES.filter((e) =>
      (cat === 'all' || (cat === 'fav' ? favorites.includes(e.id) : e.category === cat)) &&
      (!s || e.name[lang].toLowerCase().includes(s) || e.primary.some((m) => MUSCLE_NAMES[m][lang].toLowerCase().includes(s))));
  }, [cat, q, favorites, lang]);
  return (
    <>
      <div className="search"><Search size={18} /><input className="field" placeholder={t('cat.search')} value={q} onChange={(e) => setQ(e.target.value)} /></div>
      <div className="chips">
        <button className={`chip ${cat === 'all' ? 'on' : ''}`} onClick={() => setCat('all')}>{t('cat.all')}</button>
        {CATEGORIES.map((c) => <button key={c} className={`chip ${cat === c ? 'on' : ''}`} onClick={() => setCat(c)}>{tr(CATEGORY_SHORT[c])}</button>)}
        <button className={`chip ${cat === 'fav' ? 'on' : ''}`} onClick={() => setCat('fav')}><Heart size={14} />{t('cat.fav')}</button>
      </div>
      {list.length ? (
        <div className="col" style={{ gap: 10 }}>
          {list.map((e) => (
            <button key={e.id} className="card tap tight row" onClick={() => nav(`/exercise/${e.id}`)}>
              <Thumb id={e.id} size="lg" />
              <div className="grow">
                <div className="bold" style={{ fontSize: 15.5, lineHeight: 1.2 }}>{tr(e.name)}</div>
                <div className="small muted" style={{ marginTop: 3 }}>{e.primary.map((m) => tr(MUSCLE_NAMES[m])).join(', ')}</div>
                <div className="row" style={{ gap: 6, marginTop: 7, flexWrap: 'wrap' }}>
                  <span className="badge">{t(`level.${e.level}`)}</span>
                  <span className="badge lav">{tr(EQUIPMENT_NAMES[e.equipment[0]])}</span>
                </div>
              </div>
              <ChevronRight size={18} className="chev" />
            </button>
          ))}
        </div>
      ) : <Empty icon={<Search size={24} />} title={t('cat.empty')} text={cat === 'fav' ? t('cat.empty.fav') : undefined} />}
    </>
  );
}

/* ================= история ================= */

function HistoryList() {
  const { t, tr, lang } = useT();
  const history = useStore((s) => s.history);
  const list = [...history].reverse();
  if (!list.length) return <Empty icon={<History size={26} />} title={t('hist.empty')} text={t('hist.empty.d')} />;
  return (
    <div className="card pad0 list">
      {list.map((s: Session) => (
        <button key={s.id} className="list-item" onClick={() => nav(`/session/${s.id}`)}>
          <Thumb id={s.exercises[Math.min(1, s.exercises.length - 1)]?.exerciseId ?? 'walking'} size="sm" />
          <div className="grow">
            <div className="title">{tr(s.name)}</div>
            <div className="sub">{fmtDate(lang, s.date, { day: 'numeric', month: 'long', weekday: 'short' })} · {t('common.min', { n: Math.max(1, Math.round(s.durationSec / 60)) })} · {s.kcal} {t('unit.kcal')}</div>
          </div>
          <ChevronRight size={18} className="chev" />
        </button>
      ))}
    </div>
  );
}

/** Детали прошедшей тренировки. */
export function SessionDetail({ id }: { id: string }) {
  const { t, tr, lang } = useT();
  const s = useStore((st) => st.history.find((x) => x.id === id));
  const del = useStore((st) => st.deleteSession);
  const unit = useStore((st) => st.settings.unit);
  const [ask, setAsk] = useState(false);
  if (!s) return <div className="screen no-tabs"><Header title={t('train.history')} onBack /><Empty icon={<History size={26} />} title={t('hist.notFound')} /></div>;
  const k = unit === 'kg' ? 1 : 2.20462;
  return (
    <div className="screen no-tabs">
      <Header title={tr(s.name)} sub={fmtDate(lang, s.date, { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })} onBack
        right={<button className="icon-btn" aria-label={t('common.delete')} onClick={() => setAsk(true)}><Trash2 size={18} /></button>} />
      <div className="grid3">
        <div className="card center tight"><div className="stat-value num">{Math.max(1, Math.round(s.durationSec / 60))}</div><div className="stat-label">{t('unit.min')}</div></div>
        <div className="card center tight"><div className="stat-value num">{s.kcal}</div><div className="stat-label">{t('unit.kcal')}</div></div>
        <div className="card center tight"><div className="stat-value num">{doneSets(s)}</div><div className="stat-label">{t('hist.sets')}</div></div>
      </div>
      {s.exercises.map((ex, i) => {
        const e = EX_BY_ID[ex.exerciseId];
        if (!e) return null;
        const done = ex.sets.filter((x) => x.done);
        return (
          <div key={i} className="card tight">
            <button className="row" style={{ width: '100%', textAlign: 'left' }} onClick={() => nav(`/exercise/${e.id}`)}>
              <Thumb id={e.id} size="sm" />
              <div className="grow"><div className="bold">{tr(e.name)}</div>
                {ex.replacedFrom && EX_BY_ID[ex.replacedFrom] ? <div className="tiny muted">{t('hist.replaced', { name: tr(EX_BY_ID[ex.replacedFrom].name) })}</div> : null}
              </div>
            </button>
            <div className="row" style={{ flexWrap: 'wrap', gap: 6, marginTop: 10 }}>
              {done.length ? done.map((st, j) => (
                <span key={j} className="badge lav num">
                  {e.kind === 'strength' ? `${Math.round(st.weight * k * 10) / 10} ${t(unit === 'kg' ? 'unit.kg' : 'unit.lb')} × ${st.reps}` : e.kind === 'bodyweight' ? `× ${st.reps}` : e.kind === 'time' ? `${st.reps} ${t('unit.sec')}` : `${st.reps} ${t('unit.min')}`}
                </span>
              )) : <span className="small muted">{t('hist.skipped')}</span>}
            </div>
          </div>
        );
      })}
      {ask ? (
        <Sheet title={t('hist.delete')} onClose={() => setAsk(false)}>
          <p className="muted">{t('hist.delete.d')}</p>
          <button className="btn danger block" onClick={() => { del(s.id); nav('/train/history', true); }}>{t('common.delete')}</button>
          <button className="btn soft block md" onClick={() => setAsk(false)}>{t('common.cancel')}</button>
        </Sheet>
      ) : null}
    </div>
  );
}

export const weekdayOf = weekday;
