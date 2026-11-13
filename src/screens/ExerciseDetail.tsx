import { useMemo } from 'react';
import { Check, ChevronRight, CircleAlert, Heart, Info, X } from 'lucide-react';
import { CATEGORY_NAMES, EQUIPMENT_NAMES, EX_BY_ID, MUSCLE_NAMES, muscleUrl } from '../data/exercises';
import type { Exercise, Muscle } from '../domain/types';
import { fmtW } from '../domain/units';
import { fmtDate, useT } from '../i18n';
import { back, nav } from '../router';
import { useStore } from '../store';
import type { Region } from '../three/rig';
import { Empty, Header, Thumb } from '../ui/basic';
import { ExerciseViewer } from '../ui/Viewer';

export interface MuscleSets { primary: Region[]; secondary: Region[]; stabilizers: Region[] }
/** Мышцы упражнения для подсветки на модели. У кардио «основная» — сердце, поэтому показываем работающие мышцы. */
export function muscleSets(e: Exercise): MuscleSets {
  const reg = (m: Muscle[]) => m.filter((x) => x !== 'heart') as Region[];
  const p = reg(e.primary);
  return p.length
    ? { primary: p, secondary: reg(e.secondary), stabilizers: reg(e.stabilizers) }
    : { primary: reg(e.secondary), secondary: [], stabilizers: reg(e.stabilizers) };
}

export function MusclesCard({ e }: { e: Exercise }) {
  const { t, tr } = useT();
  const names = (m: Muscle[]) => m.map((x) => tr(MUSCLE_NAMES[x])).join(', ');
  const tiers = [
    { cls: 'm1', title: t('ex.m.primary'), list: e.primary },
    { cls: 'm2', title: t('ex.m.secondary'), list: e.secondary },
    { cls: 'm3', title: t('ex.m.stab'), list: e.stabilizers },
  ].filter((x) => x.list.length);
  return (
    <div className="card">
      <div className="bold" style={{ marginBottom: 10 }}>{t('ex.muscles')}</div>
      <div className="muscle-card">
        <div className="muscle-map">
          {(['f', 'b'] as const).map((side) => (
            <img key={side} src={muscleUrl(e.id, side)} alt="" loading="lazy" onError={(ev) => ((ev.target as HTMLElement).style.visibility = 'hidden')} />
          ))}
        </div>
        <div className="grow col" style={{ gap: 10, justifyContent: 'center' }}>
          {tiers.map((x) => (
            <div key={x.cls} className={`tier ${x.cls}`}>
              <div className="tt">{x.title}</div>
              <div className="tl">{names(x.list)}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function TechniqueCard({ e }: { e: Exercise }) {
  const { t, tr } = useT();
  return (
    <div className="card">
      <div className="bold" style={{ marginBottom: 6 }}>{t('ex.technique')}</div>
      {e.technique.map((s, i) => <div key={i} className="check-li"><Check size={18} strokeWidth={2.6} /><span>{tr(s)}</span></div>)}
    </div>
  );
}

export function MistakesCard({ e }: { e: Exercise }) {
  const { t, tr } = useT();
  return (
    <div className="card">
      <div className="row bold" style={{ marginBottom: 6, gap: 8 }}><CircleAlert size={18} color="var(--bad)" />{t('ex.mistakes')}</div>
      {e.mistakes.map((s, i) => <div key={i} className="x-li"><X size={18} strokeWidth={2.6} /><span>{tr(s)}</span></div>)}
    </div>
  );
}

export function ExerciseDetail({ id }: { id: string }) {
  const { t, tr, lang } = useT();
  const e = EX_BY_ID[id];
  const favorites = useStore((s) => s.favorites);
  const toggle = useStore((s) => s.toggleFavorite);
  const history = useStore((s) => s.history);
  const unit = useStore((s) => s.settings.unit);

  const log = useMemo(() => {
    const out: { date: string; text: string; best: number }[] = [];
    for (const s of history) {
      const ex = s.exercises.find((x) => x.exerciseId === id);
      const done = ex?.sets.filter((x) => x.done) ?? [];
      if (!done.length || !e) continue;
      const best = Math.max(...done.map((x) => (e.kind === 'strength' ? x.weight : x.reps)));
      const u = t(unit === 'kg' ? 'unit.kg' : 'unit.lb');
      const text = done.map((x) => (e.kind === 'strength' ? `${fmtW(x.weight, unit, 1, lang).replace(/[,.]0$/, '')} ${u} × ${x.reps}` : e.kind === 'bodyweight' ? `× ${x.reps}` : e.kind === 'time' ? `${x.reps} ${t('unit.sec')}` : `${x.reps} ${t('unit.min')}`)).join(' · ');
      out.push({ date: s.date, text, best });
    }
    return out.reverse();
  }, [history, id, e, unit, lang, t]);

  if (!e) return <div className="screen no-tabs"><Header title={t('train.catalog')} onBack /><Empty icon={<Info size={26} />} title={t('cat.empty')} /></div>;
  const fav = favorites.includes(id);

  return (
    <div className="screen no-tabs flush">
      <div style={{ position: 'relative' }}>
        <ExerciseViewer animId={e.anim} height="min(58dvh, 460px)" muscles={muscleSets(e)} />
        <div style={{ position: 'absolute', top: 'calc(var(--safe-t) + 10px)', left: 14, right: 14, display: 'flex', justifyContent: 'space-between', pointerEvents: 'none' }}>
          <button className="glass-btn round" style={{ pointerEvents: 'auto' }} aria-label={t('common.back')} onClick={() => back()}><ChevronRight size={20} style={{ transform: 'rotate(180deg)' }} /></button>
          <button className={`glass-btn round ${fav ? 'on' : ''}`} style={{ pointerEvents: 'auto' }} aria-pressed={fav} aria-label={t('ex.fav')} onClick={() => toggle(id)}><Heart size={19} fill={fav ? 'currentColor' : 'none'} /></button>
        </div>
      </div>
      <div className="col" style={{ padding: '16px 18px calc(var(--safe-b) + 28px)', gap: 14 }}>
        <div>
          <h1 style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-.02em', lineHeight: 1.12 }}>{tr(e.name)}</h1>
          <div className="row" style={{ gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
            <span className="badge">{tr(CATEGORY_NAMES[e.category])}</span>
            <span className="badge">{t(`level.${e.level}`)}</span>
            {e.equipment.map((q) => <span key={q} className="badge lav">{tr(EQUIPMENT_NAMES[q])}</span>)}
          </div>
        </div>
        <MusclesCard e={e} />
        <TechniqueCard e={e} />
        <MistakesCard e={e} />

        {log.length ? (
          <div className="card">
            <div className="row between" style={{ marginBottom: 8 }}>
              <div className="bold">{t('ex.myResults')}</div>
              {e.kind === 'strength' ? <span className="badge">{t('ex.best')}: {fmtW(Math.max(...log.map((l) => l.best)), unit, 1, lang).replace(/[,.]0$/, '')} {t(unit === 'kg' ? 'unit.kg' : 'unit.lb')}</span> : null}
            </div>
            {log.slice(0, 4).map((l) => (
              <div key={l.date} className="row between small" style={{ padding: '6px 0', borderTop: '1px solid var(--line)' }}>
                <span className="muted">{fmtDate(lang, l.date, { day: 'numeric', month: 'short' })}</span><span className="bold num" style={{ textAlign: 'right' }}>{l.text}</span>
              </div>
            ))}
          </div>
        ) : null}

        <h2 className="section">{t('ex.alternatives')}</h2>
        <div className="card pad0 list">
          {e.alternatives.filter((a) => EX_BY_ID[a]).map((a) => (
            <button key={a} className="list-item" onClick={() => nav(`/exercise/${a}`, true)}>
              <Thumb id={a} size="sm" />
              <div className="grow"><div className="title">{tr(EX_BY_ID[a].name)}</div><div className="sub">{EX_BY_ID[a].primary.map((m) => tr(MUSCLE_NAMES[m])).join(', ')}</div></div>
              <ChevronRight size={18} className="chev" />
            </button>
          ))}
        </div>
        <p className="demo-tag">{t('ex.disclaimer')}</p>
      </div>
    </div>
  );
}
