import { useMemo, useState } from 'react';
import { ChevronLeft, ChevronRight, Flame, Info, Minus, Plus, Search, Trash2 } from 'lucide-react';
import { FOODS } from '../data/foods';
import { addDays, today } from '../domain/dates';
import { macroOf, MEALS, sumDay, targets } from '../domain/nutrition';
import type { Food, MealKey } from '../domain/types';
import { fmtDate, useT } from '../i18n';
import { useFoodFinder, useStore } from '../store';
import { Bar, Empty, Header, Ring, Sheet, Stepper, toast, useCountUp } from '../ui/basic';

const MEAL_EMOJI: Record<MealKey, string> = { breakfast: '🥣', lunch: '🍲', dinner: '🥗', snack: '🍓' };
const GLASS = 250;

export function Nutrition() {
  const { t, tr, lang } = useT();
  const profile = useStore((s) => s.profile)!;
  const days = useStore((s) => s.days);
  const addWater = useStore((s) => s.addWater);
  const find = useFoodFinder();
  const [date, setDate] = useState(today());
  const [meal, setMeal] = useState<MealKey | null>(null);
  const now = today();
  const tg = useMemo(() => targets(profile), [profile]);
  const day = days[date];
  const sum = sumDay(day, find);
  const kcalShown = useCountUp(Math.round(sum.kcal));
  const water = day?.waterMl ?? 0;
  const glasses = Math.max(1, Math.round(tg.waterMl / GLASS));
  const left = tg.kcal - Math.round(sum.kcal);

  return (
    <div className="screen">
      <Header large title={t('tab.nutrition')} />
      <div className="card tight row between">
        <button className="icon-btn sm plain" aria-label={t('cal.prev')} onClick={() => setDate(addDays(date, -1))}><ChevronLeft size={20} /></button>
        <button className="bold" onClick={() => setDate(now)}>{date === now ? t('home.today') : fmtDate(lang, date, { weekday: 'short', day: 'numeric', month: 'long' })}</button>
        <button className="icon-btn sm plain" aria-label={t('cal.next')} disabled={date >= now} style={{ opacity: date >= now ? 0.3 : 1 }} onClick={() => setDate(addDays(date, 1))}><ChevronRight size={20} /></button>
      </div>

      <div className="card row" style={{ gap: 16 }}>
        <Ring value={sum.kcal / tg.kcal} size={128} stroke={12}>
          <div>
            <Flame size={18} color="var(--pink)" style={{ margin: '0 auto' }} />
            <div className="num" style={{ fontSize: 26, fontWeight: 800, letterSpacing: '-.02em', lineHeight: 1.1 }}>{Math.round(kcalShown)}</div>
            <div className="tiny muted bold">{t('nut.of', { n: tg.kcal })}</div>
          </div>
        </Ring>
        <div className="grow col" style={{ gap: 11 }}>
          <Macro label={t('nut.p')} v={sum.p} max={tg.p} g={t('unit.g')} />
          <Macro label={t('nut.f')} v={sum.f} max={tg.f} g={t('unit.g')} cls="amber" />
          <Macro label={t('nut.c')} v={sum.c} max={tg.c} g={t('unit.g')} cls="lav" />
        </div>
      </div>
      <div className="small muted center" style={{ marginTop: -4 }}>
        {left >= 0 ? t('nut.left', { n: left }) : t('nut.over', { n: -left })}
      </div>
      {tg.note !== 'none' ? <div className="note"><Info size={18} /><span>{t(tg.note === 'minor' ? 'nut.note.minor' : 'nut.note.floor')}</span></div> : null}

      <div className="card pad0 list">
        {MEALS.map((m) => {
          const s = sumDay(day, find, m);
          const names = (day?.meals[m] ?? []).map((e) => tr(find(e.foodId)?.name)).filter(Boolean);
          return (
            <button key={m} className="list-item" onClick={() => setMeal(m)}>
              <div className="meal-ico" aria-hidden>{MEAL_EMOJI[m]}</div>
              <div className="grow">
                <div className="title">{t(`meal.${m}`)}</div>
                <div className="sub ellipsis">{names.length ? names.join(', ') : t('nut.addHint')}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div className="bold num">{Math.round(s.kcal)}</div><div className="tiny muted">{t('unit.kcal')}</div>
              </div>
              <ChevronRight size={18} className="chev" />
            </button>
          );
        })}
      </div>

      <div className="card">
        <div className="row between" style={{ marginBottom: 12 }}>
          <div><div className="bold">💧 {t('nut.water')}</div><div className="small muted num">{(water / 1000).toFixed(2).replace(/0$/, '')} {t('nut.waterOf', { n: (tg.waterMl / 1000).toFixed(1) })}</div></div>
          <div className="row" style={{ gap: 6 }}>
            <button className="icon-btn sm" aria-label={t('nut.waterMinus')} disabled={water <= 0} onClick={() => addWater(date, -GLASS)}><Minus size={16} /></button>
            <button className="btn tint sm" onClick={() => addWater(date, GLASS)}><Plus size={16} />{GLASS} {t('unit.ml')}</button>
          </div>
        </div>
        <div className="glasses">
          {Array.from({ length: Math.max(glasses, Math.ceil(water / GLASS)) }, (_, i) => (
            <button key={i} className={`glass ${water >= (i + 1) * GLASS ? 'on' : ''}`} aria-label={`${(i + 1) * GLASS} ${t('unit.ml')}`}
              onClick={() => addWater(date, water >= (i + 1) * GLASS ? i * GLASS - water : (i + 1) * GLASS - water)} />
          ))}
        </div>
      </div>
      <p className="demo-tag">{t('nut.disclaimer')}</p>

      {meal ? <MealSheet date={date} meal={meal} onClose={() => setMeal(null)} /> : null}
    </div>
  );
}

function Macro({ label, v, max, g, cls = '' }: { label: string; v: number; max: number; g: string; cls?: string }) {
  return (
    <div className="macro">
      <div className="h"><span>{label}</span><span className="num">{Math.round(v)} / {max} {g}</span></div>
      <Bar value={v / max} cls={cls} />
    </div>
  );
}

function MealSheet({ date, meal, onClose }: { date: string; meal: MealKey; onClose: () => void }) {
  const { t, tr } = useT();
  const day = useStore((s) => s.days[date]);
  const { updateFood, removeFood } = useStore.getState();
  const find = useFoodFinder();
  const [adding, setAdding] = useState(false);
  const entries = day?.meals[meal] ?? [];
  const s = sumDay(day, find, meal);
  if (adding) return <AddFood date={date} meal={meal} onClose={() => setAdding(false)} />;
  return (
    <Sheet title={t(`meal.${meal}`)} onClose={onClose} footer={<button className="btn primary block" onClick={() => setAdding(true)}><Plus size={18} />{t('nut.add')}</button>}>
      {entries.length ? (
        <>
          <div className="small muted bold num">{Math.round(s.kcal)} {t('unit.kcal')} · {t('nut.p')} {Math.round(s.p)} · {t('nut.f')} {Math.round(s.f)} · {t('nut.c')} {Math.round(s.c)}</div>
          {entries.map((e) => {
            const f = find(e.foodId);
            if (!f) return null;
            return (
              <div key={e.id} className="card tight">
                <div className="row between">
                  <div className="grow"><div className="bold">{tr(f.name)}</div><div className="small muted num">{Math.round(macroOf(f, e.grams).kcal)} {t('unit.kcal')}</div></div>
                  <button className="icon-btn sm plain" aria-label={t('common.delete')} onClick={() => removeFood(date, meal, e.id)}><Trash2 size={16} /></button>
                </div>
                <div className="row" style={{ marginTop: 8 }}>
                  <Stepper value={e.grams} step={10} min={5} max={2000} unit={t('unit.g')} label={t('nut.grams')} onChange={(v) => updateFood(date, meal, e.id, v)} />
                </div>
              </div>
            );
          })}
        </>
      ) : <Empty icon={<span style={{ fontSize: 26 }}>{MEAL_EMOJI[meal]}</span>} title={t('nut.empty')} text={t('nut.empty.d')} />}
    </Sheet>
  );
}

function AddFood({ date, meal, onClose }: { date: string; meal: MealKey; onClose: () => void }) {
  const { t, tr, lang } = useT();
  const custom = useStore((s) => s.customFoods);
  const { addFood, addCustomFood } = useStore.getState();
  const [q, setQ] = useState('');
  const [food, setFood] = useState<Food | null>(null);
  const [grams, setGrams] = useState(100);
  const [form, setForm] = useState<null | { name: string; kcal: string; p: string; f: string; c: string; portion: string }>(null);

  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return [...custom, ...FOODS].filter((f) => !s || f.name[lang].toLowerCase().includes(s) || f.name.ru.toLowerCase().includes(s));
  }, [q, custom, lang]);

  if (form) {
    const num = (v: string) => Math.max(0, parseFloat(v.replace(',', '.')) || 0);
    const ok = form.name.trim().length > 1 && num(form.kcal) > 0;
    const F = (k: keyof typeof form, label: string, mode: 'text' | 'decimal' = 'decimal') => (
      <div className="col" style={{ gap: 4 }}>
        <label className="lbl" style={{ margin: 0 }}>{label}</label>
        <input className="field" inputMode={mode} value={form[k]} onChange={(e) => setForm({ ...form, [k]: e.target.value })} />
      </div>
    );
    return (
      <Sheet title={t('nut.custom')} onClose={() => setForm(null)} footer={
        <button className="btn primary block" disabled={!ok} onClick={() => {
          const id = addCustomFood({ name: { ru: form.name.trim(), pl: form.name.trim() }, kcal: num(form.kcal), p: num(form.p), f: num(form.f), c: num(form.c), portion: num(form.portion) || 100 });
          addFood(date, meal, id, num(form.portion) || 100);
          toast(t('nut.added'));
          onClose();
        }}>{t('common.save')}</button>}>
        {F('name', t('nut.custom.name'), 'text')}
        <div className="grid2">{F('kcal', t('nut.custom.kcal'))}{F('portion', t('nut.custom.portion'))}</div>
        <div className="grid3">{F('p', t('nut.p'))}{F('f', t('nut.f'))}{F('c', t('nut.c'))}</div>
        <p className="small muted">{t('nut.custom.hint')}</p>
      </Sheet>
    );
  }

  if (food) {
    const m = macroOf(food, grams);
    return (
      <Sheet title={tr(food.name)} onClose={() => setFood(null)} footer={
        <button className="btn primary block" onClick={() => { addFood(date, meal, food.id, grams); toast(t('nut.added')); onClose(); }}>{t('nut.addTo', { meal: t(`meal.${meal}`).toLowerCase() })}</button>}>
        <div className="card center">
          <div className="stat-value num" style={{ fontSize: 38 }}>{Math.round(m.kcal)}<small>{t('unit.kcal')}</small></div>
          <div className="grid3" style={{ marginTop: 12 }}>
            {[[t('nut.p'), m.p], [t('nut.f'), m.f], [t('nut.c'), m.c]].map(([l, v]) => (
              <div key={l as string}><div className="bold num">{(v as number).toFixed(1)} {t('unit.g')}</div><div className="tiny muted">{l}</div></div>
            ))}
          </div>
        </div>
        <div className="row between">
          <div className="bold">{t('nut.grams')}</div>
          <Stepper value={grams} step={10} min={5} max={2000} unit={t('unit.g')} label={t('nut.grams')} onChange={setGrams} />
        </div>
        <div className="bold">{t('nut.portion')} <span className="muted small">· {food.portion} {t('unit.g')}</span></div>
        <div className="row" style={{ gap: 8 }}>
          {[0.5, 1, 1.5, 2].map((k) => (
            <button key={k} className={`chip grow ${grams === Math.round(food.portion * k) ? 'on' : ''}`} style={{ justifyContent: 'center' }} onClick={() => setGrams(Math.round(food.portion * k))}>× {k}</button>
          ))}
        </div>
      </Sheet>
    );
  }

  return (
    <Sheet title={t('nut.add')} onClose={onClose}>
      <div className="search"><Search size={18} /><input className="field" autoFocus placeholder={t('nut.search')} value={q} onChange={(e) => setQ(e.target.value)} /></div>
      <div className="card pad0 list" style={{ minHeight: 260 }}>
        {list.map((f) => (
          <button key={f.id} className="list-item" onClick={() => { setFood(f); setGrams(f.portion); }}>
            <div className="grow"><div className="title">{tr(f.name)}</div><div className="sub num">{f.kcal} {t('unit.kcal')} / 100 {t('unit.g')} · {t('nut.portion').toLowerCase()} {f.portion} {t('unit.g')}</div></div>
            <Plus size={18} className="chev" />
          </button>
        ))}
        {!list.length ? <p className="muted center" style={{ padding: 20 }}>{t('nut.notFound')}</p> : null}
      </div>
      <button className="btn soft block md" onClick={() => setForm({ name: q, kcal: '', p: '', f: '', c: '', portion: '100' })}><Plus size={17} />{t('nut.custom')}</button>
    </Sheet>
  );
}
