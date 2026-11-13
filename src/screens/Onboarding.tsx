import { useEffect, useMemo, useState } from 'react';
import { ArrowRight, Check, ChevronLeft, Dumbbell, Flame, Heart, Home, Info, Sparkles, Target, Trees, TrendingUp } from 'lucide-react';
import { mediaUrl } from '../data/exercises';
import { DEFAULT_DAYS } from '../domain/plan';
import { bmi, maxHealthyKg, minHealthyKg, weeksToGoal } from '../domain/nutrition';
import type { Goal, Level, Limitation, Place, Profile, WeightUnit } from '../domain/types';
import { fromUnit, toUnit } from '../domain/units';
import { useT, WEEKDAYS_SHORT } from '../i18n';
import { useStore } from '../store';
import { Ring, Seg, Thumb } from '../ui/basic';
import { Wheel } from '../ui/Wheel';

interface Draft {
  step: number; name: string; goal: Goal; age: number; heightCm: number; weightKg: number; targetKg: number;
  targetTouched: boolean; level: Level; place: Place; limitations: Limitation[]; days: number[]; customDays: boolean;
}
const DRAFT_KEY = 'wf-onboarding';
const INITIAL: Draft = {
  step: 0, name: '', goal: 'tone', age: 25, heightCm: 168, weightKg: 58, targetKg: 56, targetTouched: false,
  level: 1, place: 'gym', limitations: [], days: DEFAULT_DAYS[3], customDays: false,
};
const LAST = 10;

function loadDraft(): Draft {
  try { return { ...INITIAL, ...JSON.parse(sessionStorage.getItem(DRAFT_KEY) || '{}') }; } catch { return INITIAL; }
}

const round1 = (n: number) => Math.round(n * 10) / 10;

function defaultTarget(goal: Goal, kg: number, cm: number): number {
  const lo = minHealthyKg(cm);
  if (goal === 'lose') return round1(Math.max(lo, kg - Math.min(5, kg * 0.07)));
  if (goal === 'tone') return round1(Math.max(Math.min(kg, lo), kg - 2));
  if (goal === 'gain') return round1(kg + 3);
  return round1(kg);
}

export function Onboarding() {
  const { t, lang } = useT();
  const [d, setD] = useState<Draft>(loadDraft);
  const unit = useStore((s) => s.settings.unit);
  const setSettings = useStore((s) => s.setSettings);
  const complete = useStore((s) => s.completeOnboarding);
  const up = (patch: Partial<Draft>) => setD((x) => ({ ...x, ...patch }));

  useEffect(() => { try { sessionStorage.setItem(DRAFT_KEY, JSON.stringify(d)); } catch { /* приватный режим */ } }, [d]);

  // цель по весу подстраивается под анкету, пока её не трогали вручную
  useEffect(() => {
    if (!d.targetTouched) up({ targetKg: defaultTarget(d.goal, d.weightKg, d.heightCm) });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [d.goal, d.weightKg, d.heightCm]);

  const lo = minHealthyKg(d.heightCm);
  const next = () => up({ step: d.step + 1 });
  const prev = () => up({ step: Math.max(0, d.step - 1) });

  const finish = () => {
    const profile: Profile = {
      name: d.name.trim() || t('ob.defaultName'), goal: d.goal, age: d.age, heightCm: d.heightCm, weightKg: d.weightKg,
      targetKg: Math.max(lo, d.targetKg), level: d.level, place: d.place, days: [...d.days].sort((a, b) => a - b),
      limitations: d.limitations, createdAt: new Date().toISOString(),
    };
    complete(profile);
    try { sessionStorage.removeItem(DRAFT_KEY); } catch { /* */ }
  };

  if (d.step === 0) {
    return (
      <div className="welcome">
        <img className="hero-img" src={mediaUrl('hero')} alt="" />
        <div className="brand"><Sparkles size={18} /> Women’s Fitness</div>
        <div className="content">
          <h1>{t('ob.welcome.title')}</h1>
          <p>{t('ob.welcome.text')}</p>
          <div className="row" style={{ gap: 8 }}>
            <Seg value={lang} onChange={(v) => setSettings({ lang: v })} options={[{ value: 'ru', label: 'Русский' }, { value: 'pl', label: 'Polski' }]} />
          </div>
          <button className="btn primary block" onClick={next}>{t('common.start')} <ArrowRight size={20} /></button>
        </div>
      </div>
    );
  }
  if (d.step > LAST) return <Generating name={d.name} onDone={finish} />;

  const can = d.step === 1 ? d.name.trim().length > 0 : d.step === 10 ? d.days.length >= 1 : true;

  return (
    <div className="ob">
      <div className="ob-top">
        <button className="icon-btn" aria-label={t('common.back')} onClick={prev}><ChevronLeft size={22} /></button>
        <div className="ob-dots">{Array.from({ length: LAST }, (_, i) => <i key={i} className={i < d.step ? 'on' : ''} />)}</div>
        <span className="small muted bold num">{d.step}/{LAST}</span>
      </div>
      <Step key={d.step} d={d} up={up} unit={unit} />
      <button className="btn primary block" disabled={!can} onClick={next}>
        {d.step === LAST ? t('ob.create') : t('common.next')} <ArrowRight size={20} />
      </button>
    </div>
  );
}

function Step({ d, up, unit }: { d: Draft; up: (p: Partial<Draft>) => void; unit: WeightUnit }) {
  const { t, lang } = useT();
  const setSettings = useStore((s) => s.setSettings);
  const lo = minHealthyKg(d.heightCm);
  const u = t(unit === 'kg' ? 'unit.kg' : 'unit.lb');

  const unitSeg = (
    <div style={{ width: 150, margin: '0 auto' }}>
      <Seg value={unit} onChange={(v) => setSettings({ unit: v })} options={[{ value: 'kg', label: t('unit.kg') }, { value: 'lb', label: t('unit.lb') }]} />
    </div>
  );
  const weightSlider = (kg: number, minKg: number, maxKg: number, onChange: (kg: number) => void, label: string) => {
    const min = Math.ceil(toUnit(minKg, unit)), max = Math.floor(toUnit(maxKg, unit));
    const v = Math.min(max, Math.max(min, toUnit(kg, unit)));
    const step = unit === 'kg' ? 0.5 : 1;
    return (
      <>
        <div className="big-value num">{unit === 'kg' ? v.toFixed(1).replace('.0', '') : Math.round(v)}<small>{u}</small></div>
        <input
          className="range" type="range" aria-label={label} min={min} max={max} step={step} value={v}
          style={{ ['--p' as string]: `${((v - min) / (max - min)) * 100}%` }}
          onChange={(e) => onChange(round1(fromUnit(Number(e.target.value), unit)))}
        />
        <div className="range-ends num"><span>{min}</span><span>{max}</span></div>
      </>
    );
  };

  switch (d.step) {
    case 1:
      return (
        <div className="ob-body">
          <h1>{t('ob.name.title')}</h1>
          <p className="lead">{t('ob.name.text')}</p>
          <input className="field" autoFocus maxLength={24} placeholder={t('ob.name.ph')} value={d.name} onChange={(e) => up({ name: e.target.value })} autoComplete="given-name" />
        </div>
      );
    case 2: {
      const goals: { v: Goal; img: string; icon: JSX.Element }[] = [
        { v: 'lose', img: 'running', icon: <Flame size={20} /> },
        { v: 'tone', img: 'squat_bw', icon: <Sparkles size={20} /> },
        { v: 'gain', img: 'shoulder_press', icon: <Dumbbell size={20} /> },
        { v: 'maintain', img: 'stretch_side', icon: <Heart size={20} /> },
      ];
      return (
        <div className="ob-body">
          <h1>{t('ob.goal.title')}</h1>
          {goals.map((g) => (
            <button key={g.v} className={`opt ${d.goal === g.v ? 'on' : ''}`} onClick={() => up({ goal: g.v })} aria-pressed={d.goal === g.v}>
              <Thumb id={g.img} />
              <div className="grow"><div className="t">{t(`goal.${g.v}`)}</div><div className="d">{t(`goal.${g.v}.d`)}</div></div>
              <span className="check"><Check size={16} strokeWidth={3} /></span>
            </button>
          ))}
        </div>
      );
    }
    case 3:
      return (
        <div className="ob-body">
          <h1>{t('ob.age.title')}</h1>
          <p className="lead">{t('ob.age.text')}</p>
          <div style={{ flex: 1, display: 'grid', placeItems: 'center' }}>
            <Wheel min={14} max={75} value={d.age} onChange={(age) => up({ age })} label={t('ob.age.title')} />
          </div>
          {d.age < 18 ? <div className="note pink"><Info size={18} /><span>{t('ob.age.minor')}</span></div> : null}
        </div>
      );
    case 4: {
      const min = 140, max = 200;
      return (
        <div className="ob-body">
          <h1>{t('ob.height.title')}</h1>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 14 }}>
            <div className="big-value num">{d.heightCm}<small>{t('unit.cm')}</small></div>
            <input className="range" type="range" aria-label={t('ob.height.title')} min={min} max={max} value={d.heightCm}
              style={{ ['--p' as string]: `${((d.heightCm - min) / (max - min)) * 100}%` }} onChange={(e) => up({ heightCm: Number(e.target.value) })} />
            <div className="range-ends num"><span>{min}</span><span>{max}</span></div>
            <HeightFigure cm={d.heightCm} />
          </div>
        </div>
      );
    }
    case 5:
      return (
        <div className="ob-body">
          <h1>{t('ob.weight.title')}</h1>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 14 }}>
            {weightSlider(d.weightKg, 35, 160, (kg) => up({ weightKg: kg }), t('ob.weight.title'))}
            {unitSeg}
            <div className="card center" style={{ marginTop: 10 }}>
              <div className="stat-label">{t('ob.bmi')}</div>
              <div className="stat-value num">{bmi(d.weightKg, d.heightCm).toFixed(1)}</div>
              <div className="small muted">{t(bmiKey(bmi(d.weightKg, d.heightCm)))}</div>
            </div>
          </div>
        </div>
      );
    case 6: {
      const diff = round1(d.targetKg - d.weightKg);
      const weeks = weeksToGoal({ weightKg: d.weightKg, targetKg: d.targetKg, goal: d.goal });
      const shown = toUnit(Math.abs(diff), unit);
      return (
        <div className="ob-body">
          <h1>{t('ob.target.title')}</h1>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 14 }}>
            {weightSlider(Math.max(lo, d.targetKg), lo, Math.max(maxHealthyKg(d.heightCm) + 25, d.weightKg + 10), (kg) => up({ targetKg: Math.max(lo, kg), targetTouched: true }), t('ob.target.title'))}
            <div className="card row" style={{ justifyContent: 'center', gap: 14 }}>
              <div className="list-icon"><Target size={22} /></div>
              <div>
                <div className="stat-value num" style={{ marginTop: 0 }}>
                  {Math.abs(diff) < 0.05 ? t('ob.target.keep') : `${diff > 0 ? '+' : '−'}${shown.toFixed(1).replace('.0', '')} ${u}`}
                </div>
                <div className="small muted">{Math.abs(diff) < 0.05 ? t('ob.target.keep.d') : weeks ? t('ob.target.weeks', { n: weeks }) : t('ob.target.to')}</div>
              </div>
            </div>
            <div className="note"><Info size={18} /><span>{t('ob.target.safe', { kg: `${toUnit(lo, unit).toFixed(0)} ${u}` })}</span></div>
          </div>
        </div>
      );
    }
    case 7: {
      const levels: Level[] = [1, 2, 3];
      return (
        <div className="ob-body">
          <h1>{t('ob.level.title')}</h1>
          {levels.map((l) => (
            <button key={l} className={`opt ${d.level === l ? 'on' : ''}`} onClick={() => up({ level: l })} aria-pressed={d.level === l}>
              <div className="list-icon"><LevelBars n={l} /></div>
              <div className="grow"><div className="t">{t(`level.${l}`)}</div><div className="d">{t(`level.${l}.d`)}</div></div>
              <span className="check"><Check size={16} strokeWidth={3} /></span>
            </button>
          ))}
        </div>
      );
    }
    case 8: {
      const places: { v: Place; icon: JSX.Element }[] = [
        { v: 'home', icon: <Home size={22} /> }, { v: 'gym', icon: <Dumbbell size={22} /> }, { v: 'outdoor', icon: <Trees size={22} /> },
      ];
      return (
        <div className="ob-body">
          <h1>{t('ob.place.title')}</h1>
          {places.map((p) => (
            <button key={p.v} className={`opt ${d.place === p.v ? 'on' : ''}`} onClick={() => up({ place: p.v })} aria-pressed={d.place === p.v}>
              <div className="list-icon">{p.icon}</div>
              <div className="grow"><div className="t">{t(`place.${p.v}`)}</div><div className="d">{t(`place.${p.v}.d`)}</div></div>
              <span className="check"><Check size={16} strokeWidth={3} /></span>
            </button>
          ))}
        </div>
      );
    }
    case 9: {
      const lims: Limitation[] = ['knees', 'back', 'shoulders'];
      const toggle = (l: Limitation) => up({ limitations: d.limitations.includes(l) ? d.limitations.filter((x) => x !== l) : [...d.limitations, l] });
      return (
        <div className="ob-body">
          <h1>{t('ob.lim.title')}</h1>
          <p className="lead">{t('ob.lim.text')}</p>
          <button className={`opt compact ${d.limitations.length === 0 ? 'on' : ''}`} onClick={() => up({ limitations: [] })}><div className="t">{t('ob.lim.none')}</div></button>
          {lims.map((l) => (
            <button key={l} className={`opt compact ${d.limitations.includes(l) ? 'on' : ''}`} onClick={() => toggle(l)} aria-pressed={d.limitations.includes(l)}>
              <div className="t">{t(`lim.${l}`)}</div>
            </button>
          ))}
          <div className="note"><Info size={18} /><span>{t('ob.lim.note')}</span></div>
        </div>
      );
    }
    case 10: {
      const toggleDay = (i: number) => up({ days: d.days.includes(i) ? d.days.filter((x) => x !== i) : [...d.days, i] });
      return (
        <div className="ob-body">
          <h1>{t('ob.freq.title')}</h1>
          {[2, 3, 4, 5].map((n) => (
            <button key={n} className={`opt compact ${!d.customDays && d.days.length === n ? 'on' : ''}`} onClick={() => up({ days: DEFAULT_DAYS[n], customDays: false })}>
              <div className="t">{t('ob.freq.n', { n })}</div>
            </button>
          ))}
          <button className={`opt compact ${d.customDays ? 'on' : ''}`} onClick={() => up({ customDays: true })}><div className="t">{t('ob.freq.custom')}</div></button>
          <div className="card">
            <div className="stat-label" style={{ marginBottom: 10 }}>{d.customDays ? t('ob.freq.pick') : t('ob.freq.days')}</div>
            <div className="week-dots">
              {WEEKDAYS_SHORT[lang].map((w, i) => (
                <button key={i} className={`week-dot ${d.days.includes(i) ? 'done' : ''}`} onClick={() => { up({ customDays: true }); toggleDay(i); }} aria-pressed={d.days.includes(i)}>
                  <i>{d.days.includes(i) ? <Check size={16} strokeWidth={3} /> : null}</i>{w}
                </button>
              ))}
            </div>
          </div>
          {d.days.length >= 6 ? <div className="note pink"><Info size={18} /><span>{t('ob.freq.rest')}</span></div> : null}
        </div>
      );
    }
    default:
      return null;
  }
}

const bmiKey = (v: number) => (v < 18.5 ? 'bmi.low' : v < 25 ? 'bmi.ok' : v < 30 ? 'bmi.high' : 'bmi.vhigh');

function LevelBars({ n }: { n: number }) {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
      {[0, 1, 2].map((i) => <rect key={i} x={3 + i * 7} y={15 - i * 5} width="4.5" height={6 + i * 5} rx="2" opacity={i < n ? 1 : 0.28} />)}
    </svg>
  );
}

function HeightFigure({ cm }: { cm: number }) {
  const k = (cm - 140) / 60;
  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'flex-end', gap: 14, height: 190, marginTop: 6 }}>
      <img src={mediaUrl('stand')} alt="" style={{ height: `${72 + k * 28}%`, transition: 'height .2s', filter: 'drop-shadow(0 10px 16px rgba(120,60,130,.2))' }} />
      <div style={{ height: `${72 + k * 28}%`, transition: 'height .2s', width: 2, background: 'var(--pink-soft)', position: 'relative', borderRadius: 2 }}>
        {[0, 25, 50, 75, 100].map((p) => <i key={p} style={{ position: 'absolute', left: -5, width: 12, height: 2, top: `${p}%`, background: 'var(--pink-soft)', borderRadius: 2 }} />)}
      </div>
    </div>
  );
}

function Generating({ name, onDone }: { name: string; onDone: () => void }) {
  const { t } = useT();
  const [n, setN] = useState(0);
  const steps = useMemo(() => ['ob.gen.1', 'ob.gen.2', 'ob.gen.3', 'ob.gen.4'] as const, []);
  useEffect(() => {
    if (n >= steps.length) { const id = setTimeout(onDone, 650); return () => clearTimeout(id); }
    const id = setTimeout(() => setN(n + 1), 720);
    return () => clearTimeout(id);
  }, [n, onDone, steps.length]);
  return (
    <div className="gen">
      <div className="pulse">
        <Ring value={n / steps.length} size={170} stroke={12}>
          <div style={{ width: 96, height: 96, borderRadius: '50%', background: 'var(--grad-soft)', display: 'grid', placeItems: 'center', color: 'var(--pink)' }}>
            {n >= steps.length ? <Check size={44} strokeWidth={2.6} /> : <TrendingUp size={40} />}
          </div>
        </Ring>
      </div>
      <h1>{n >= steps.length ? t('ob.gen.done', { name: name.trim() }) : t('ob.gen.title')}</h1>
      <div className="gen-steps">
        {steps.map((s, i) => (
          <div key={s} className={`gen-step ${i < n ? 'on' : ''}`}><span className="dot"><Check size={15} strokeWidth={3} /></span>{t(s)}</div>
        ))}
      </div>
    </div>
  );
}
