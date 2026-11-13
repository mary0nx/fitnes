import { useEffect, useMemo, useRef, useState } from 'react';
import { Calendar, Camera, ChevronRight, Clock, Crown, Droplet, Dumbbell, Eye, EyeOff, Flame, History, Lock, Plus, Ruler, Scale, Sparkles, Target, Trash2, Trophy, Zap } from 'lucide-react';
import { addDays, startOfWeek, today } from '../domain/dates';
import { targets } from '../domain/nutrition';
import { achievements, periodStats, type Achievement } from '../domain/stats';
import type { MeasureKey } from '../domain/types';
import { fromUnit, fmtW, toUnit } from '../domain/units';
import { fmtDate, useT } from '../i18n';
import { nav } from '../router';
import { useStore } from '../store';
import { deletePhoto, loadPhoto, savePhoto, shrinkImage } from '../storage/photos';
import { Confirm, Empty, Header, Seg, Sheet, Stepper, toast } from '../ui/basic';
import { BarChart, LineChart } from '../ui/Chart';

const MEASURES: MeasureKey[] = ['waist', 'hips', 'chest', 'arms', 'legs'];
const ACH_ICON: Record<string, JSX.Element> = {
  sparkles: <Sparkles size={24} />, flame: <Flame size={24} />, dumbbell: <Dumbbell size={24} />, trophy: <Trophy size={24} />,
  zap: <Zap size={24} />, calendar: <Calendar size={24} />, scale: <Scale size={24} />, droplet: <Droplet size={24} />,
  target: <Target size={24} />, crown: <Crown size={24} />, camera: <Camera size={24} />,
};

function useAchievements(): Achievement[] {
  const s = useStore();
  return useMemo(() => (s.profile ? achievements({
    profile: s.profile, plan: s.plan, history: s.history, weights: s.weights, measures: s.measures, photos: s.photos, days: s.days,
    waterTarget: targets(s.profile).waterMl,
  }) : []), [s.profile, s.plan, s.history, s.weights, s.measures, s.photos, s.days]);
}

function Delta({ v, unit, invert, digits = 1 }: { v: number; unit: string; invert?: boolean; digits?: number }) {
  if (Math.abs(v) < 0.05) return <span className="delta flat">0 {unit}</span>;
  const good = invert ? v > 0 : v < 0;
  return <span className={`delta num ${good ? '' : 'up'}`}>{v > 0 ? '+' : '−'}{Math.abs(v).toFixed(digits).replace(/\.0$/, '')} {unit}</span>;
}

export function Progress() {
  const { t, lang } = useT();
  const profile = useStore((s) => s.profile)!;
  const history = useStore((s) => s.history);
  const weights = useStore((s) => s.weights);
  const measures = useStore((s) => s.measures);
  const photos = useStore((s) => s.photos);
  const unit = useStore((s) => s.settings.unit);
  const [period, setPeriod] = useState<7 | 30 | 90>(30);
  const [sheet, setSheet] = useState<'weight' | 'measure' | null>(null);
  const [mKey, setMKey] = useState<MeasureKey>('waist');
  const ach = useAchievements();
  const now = today();
  const u = t(unit === 'kg' ? 'unit.kg' : 'unit.lb');

  const from = addDays(now, -(period - 1));
  const cur = periodStats(history, from, now);
  const prev = periodStats(history, addDays(from, -period), addDays(from, -1));
  const inPeriod = weights.filter((w) => w.date >= from);
  const base = inPeriod.length > 1 ? inPeriod[0].kg : weights.filter((w) => w.date < from).slice(-1)[0]?.kg ?? inPeriod[0]?.kg ?? profile.weightKg;
  const dW = toUnit(profile.weightKg - base, unit);
  const wPoints = (inPeriod.length ? inPeriod : weights.slice(-1)).map((w) => ({ label: fmtDate(lang, w.date, { day: 'numeric', month: 'short' }), value: Math.round(toUnit(w.kg, unit) * 10) / 10 }));
  const weeks = Array.from({ length: 6 }, (_, i) => {
    const st = addDays(startOfWeek(now), -7 * (5 - i));
    return { label: fmtDate(lang, st, { day: 'numeric', month: 'numeric' }), value: periodStats(history, st, addDays(st, 6)).workouts };
  });
  const lastM = measures[measures.length - 1];
  const firstM = measures[0];
  const mPoints = measures.filter((m) => m.values[mKey] !== undefined).map((m) => ({ label: fmtDate(lang, m.date, { day: 'numeric', month: 'short' }), value: m.values[mKey]! }));
  const got = ach.filter((a) => a.progress >= 1).length;

  return (
    <div className="screen">
      <Header large title={t('tab.progress')} right={<button className="icon-btn" aria-label={t('train.history')} onClick={() => nav('/train/history')}><History size={20} /></button>} />
      <Seg pink value={period} onChange={setPeriod} options={[{ value: 7, label: t('cal.week') }, { value: 30, label: t('cal.month') }, { value: 90, label: t('prog.3m') }]} />

      <div className="grid3">
        <div className="card center tight"><Dumbbell size={18} color="var(--pink)" style={{ margin: '0 auto 4px' }} /><div className="stat-value num" style={{ fontSize: 21 }}>{cur.workouts}</div><div className="stat-label">{t('prog.workouts')}</div></div>
        <div className="card center tight"><Flame size={18} color="var(--pink)" style={{ margin: '0 auto 4px' }} /><div className="stat-value num" style={{ fontSize: 21 }}>{cur.kcal}</div><div className="stat-label">{t('unit.kcal')}</div></div>
        <div className="card center tight"><Clock size={18} color="var(--pink)" style={{ margin: '0 auto 4px' }} /><div className="stat-value num" style={{ fontSize: 21 }}>{cur.minutes >= 60 ? `${Math.floor(cur.minutes / 60)}:${String(cur.minutes % 60).padStart(2, '0')}` : cur.minutes}</div><div className="stat-label">{cur.minutes >= 60 ? t('prog.hours') : t('unit.min')}</div></div>
      </div>

      <div className="card">
        <div className="row between">
          <div>
            <div className="stat-label">{t('prog.weight')}</div>
            <div className="stat-value num">{fmtW(profile.weightKg, unit, 1, lang)}<small>{u}</small></div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <Delta v={dW} unit={u} invert={profile.targetKg > profile.weightKg} />
            <div className="tiny muted" style={{ marginTop: 5 }}>{t('prog.target')}: <b className="num">{fmtW(profile.targetKg, unit, 1, lang)} {u}</b></div>
          </div>
        </div>
        <div style={{ margin: '10px -4px 0' }}>
          <LineChart points={wPoints} unit={` ${u}`} target={Math.round(toUnit(profile.targetKg, unit) * 10) / 10} />
        </div>
        {wPoints.length < 2 ? <p className="small muted center">{t('prog.weight.hint')}</p> : null}
        <button className="btn tint block md" style={{ marginTop: 10 }} onClick={() => setSheet('weight')}><Plus size={17} />{t('prog.addWeight')}</button>
      </div>

      <div className="card">
        <div className="bold" style={{ marginBottom: 4 }}>{t('prog.compare')}</div>
        <div className="small muted" style={{ marginBottom: 8 }}>{t('prog.compare.d', { n: period })}</div>
        {([['prog.workouts', cur.workouts, prev.workouts, ''], ['prog.minutes', cur.minutes, prev.minutes, t('unit.min')], ['prog.kcal', cur.kcal, prev.kcal, t('unit.kcal')], ['prog.tonnage', Math.round(toUnit(cur.tonnage, unit)), Math.round(toUnit(prev.tonnage, unit)), u]] as const).map(([k, a, b, un]) => (
          <div key={k} className="row between" style={{ padding: '8px 0', borderTop: '1px solid var(--line)' }}>
            <span className="small bold">{t(k)}</span>
            <span className="row" style={{ gap: 8 }}>
              <span className="small muted num">{b} →</span><b className="num">{a} {un}</b>
              <Delta v={a - b} unit="" invert digits={0} />
            </span>
          </div>
        ))}
      </div>

      <div className="card">
        <div className="bold" style={{ marginBottom: 8 }}>{t('prog.byWeek')}</div>
        <BarChart points={weeks} />
      </div>

      <div className="card">
        <div className="row between" style={{ marginBottom: 10 }}>
          <div className="row bold" style={{ gap: 8 }}><Ruler size={18} color="var(--pink)" />{t('prog.measures')}</div>
          <button className="link row" style={{ gap: 4 }} onClick={() => setSheet('measure')}><Plus size={16} />{t('common.add')}</button>
        </div>
        {lastM ? (
          <>
            {MEASURES.filter((k) => lastM.values[k] !== undefined || measures.some((m) => m.values[k] !== undefined)).map((k) => {
              const latest = [...measures].reverse().find((m) => m.values[k] !== undefined)?.values[k];
              const first = measures.find((m) => m.values[k] !== undefined)?.values[k];
              if (latest === undefined) return null;
              return (
                <button key={k} className="row between" style={{ width: '100%', padding: '8px 0', borderTop: '1px solid var(--line)' }} onClick={() => setMKey(k)}>
                  <span className={`small bold ${mKey === k ? '' : 'muted'}`} style={mKey === k ? { color: 'var(--pink)' } : undefined}>{t(`m.${k}`)}</span>
                  <span className="row" style={{ gap: 8 }}><b className="num">{latest} {t('unit.cm')}</b>{first !== undefined && firstM !== lastM ? <Delta v={latest - first} unit={t('unit.cm')} /> : null}</span>
                </button>
              );
            })}
            {mPoints.length > 1 ? <div style={{ margin: '8px -4px 0' }}><LineChart points={mPoints} height={120} color="#9B7BD6" digits={0} /></div> : <p className="small muted" style={{ marginTop: 8 }}>{t('prog.measures.hint')}</p>}
          </>
        ) : <p className="small muted">{t('prog.measures.empty')}</p>}
      </div>

      <button className="card tap" onClick={() => nav('/achievements')}>
        <div className="row between"><div className="bold">{t('prog.ach')}</div><span className="row small muted bold num" style={{ gap: 2 }}>{got} / {ach.length}<ChevronRight size={16} /></span></div>
        <div className="row" style={{ marginTop: 6, justifyContent: 'space-between' }}>
          {[...ach].sort((a, b) => b.progress - a.progress).slice(0, 4).map((a) => (
            <div key={a.id} className={`ach ${a.progress >= 1 ? 'got' : ''}`} style={{ padding: '8px 2px', flex: 1 }}>
              <div className="ico">{ACH_ICON[a.icon]}</div><div className="t">{a.title[lang]}</div>
            </div>
          ))}
        </div>
      </button>

      <button className="card tap row" onClick={() => nav('/photos')}>
        <div className="list-icon"><Camera size={20} /></div>
        <div className="grow"><div className="bold">{t('photo.title')}</div><div className="small muted">{photos.length ? t('photo.count', { n: photos.length }) : t('photo.private')}</div></div>
        <Lock size={16} className="chev" /><ChevronRight size={18} className="chev" />
      </button>

      {sheet === 'weight' ? <WeightSheet onClose={() => setSheet(null)} /> : null}
      {sheet === 'measure' ? <MeasureSheet onClose={() => setSheet(null)} /> : null}
    </div>
  );
}

function WeightSheet({ onClose }: { onClose: () => void }) {
  const { t, lang } = useT();
  const profile = useStore((s) => s.profile)!;
  const weights = useStore((s) => s.weights);
  const unit = useStore((s) => s.settings.unit);
  const { addWeight, removeWeight } = useStore.getState();
  const [v, setV] = useState(Math.round(toUnit(profile.weightKg, unit) * 10) / 10);
  const [date, setDate] = useState(today());
  const u = t(unit === 'kg' ? 'unit.kg' : 'unit.lb');
  return (
    <Sheet title={t('prog.addWeight')} onClose={onClose} footer={<button className="btn primary block" onClick={() => { addWeight(date, Math.round(fromUnit(v, unit) * 10) / 10); toast(t('common.saved')); onClose(); }}>{t('common.save')}</button>}>
      <div className="row between"><span className="bold">{t('prog.weight')}</span><Stepper value={v} step={0.1} min={30} max={400} digits={1} unit={u} label={t('prog.weight')} onChange={setV} /></div>
      <div className="row between"><span className="bold">{t('common.date')}</span><input className="field" style={{ width: 170 }} type="date" max={today()} value={date} onChange={(e) => e.target.value && setDate(e.target.value)} /></div>
      {weights.length > 1 ? (
        <>
          <div className="bold" style={{ marginTop: 6 }}>{t('prog.entries')}</div>
          <div className="card pad0 list">
            {[...weights].reverse().slice(0, 8).map((w) => (
              <div key={w.date} className="list-item">
                <div className="grow small">{fmtDate(lang, w.date, { day: 'numeric', month: 'long', year: 'numeric' })}</div>
                <b className="num">{fmtW(w.kg, unit, 1, lang)} {u}</b>
                <button className="icon-btn sm plain" aria-label={t('common.delete')} onClick={() => removeWeight(w.date)}><Trash2 size={15} /></button>
              </div>
            ))}
          </div>
        </>
      ) : null}
    </Sheet>
  );
}

function MeasureSheet({ onClose }: { onClose: () => void }) {
  const { t } = useT();
  const measures = useStore((s) => s.measures);
  const addMeasure = useStore((s) => s.addMeasure);
  const last = measures[measures.length - 1]?.values ?? {};
  const [vals, setVals] = useState<Record<MeasureKey, string>>(() => Object.fromEntries(MEASURES.map((k) => [k, last[k] !== undefined ? String(last[k]) : ''])) as Record<MeasureKey, string>);
  const save = () => {
    const out: Partial<Record<MeasureKey, number>> = {};
    for (const k of MEASURES) {
      const n = parseFloat(vals[k].replace(',', '.'));
      if (!Number.isNaN(n) && n > 0 && n < 300) out[k] = Math.round(n * 10) / 10;
    }
    if (!Object.keys(out).length) return toast(t('prog.measures.need'));
    addMeasure(today(), out);
    toast(t('common.saved'));
    onClose();
  };
  return (
    <Sheet title={t('prog.measures.add')} onClose={onClose} footer={<button className="btn primary block" onClick={save}>{t('common.save')}</button>}>
      <p className="small muted">{t('prog.measures.tip')}</p>
      {MEASURES.map((k) => (
        <div key={k} className="row between">
          <span className="bold">{t(`m.${k}`)}</span>
          <div className="row" style={{ gap: 8 }}>
            <input className="field num" style={{ width: 110, textAlign: 'center' }} inputMode="decimal" placeholder="—" aria-label={t(`m.${k}`)} value={vals[k]} onChange={(e) => setVals({ ...vals, [k]: e.target.value })} />
            <span className="muted small bold">{t('unit.cm')}</span>
          </div>
        </div>
      ))}
    </Sheet>
  );
}

export function Achievements() {
  const { t, lang } = useT();
  const ach = useAchievements();
  return (
    <div className="screen no-tabs">
      <Header title={t('prog.ach')} sub={`${ach.filter((a) => a.progress >= 1).length} / ${ach.length}`} onBack />
      <div className="grid3">
        {ach.map((a) => (
          <div key={a.id} className={`card tight ach ${a.progress >= 1 ? 'got' : ''}`}>
            <div className="ico">{ACH_ICON[a.icon]}</div>
            <div className="t">{a.title[lang]}</div>
            <div className="d">{a.desc[lang]}</div>
            {a.progress < 1 ? <div className="bar thin" style={{ width: '100%', marginTop: 2 }}><i style={{ width: `${a.progress * 100}%` }} /></div> : null}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ================= фото-дневник ================= */

function usePhotoUrl(id: string): string | null {
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let u: string | null = null, alive = true;
    loadPhoto(id).then((b) => { if (b && alive) { u = URL.createObjectURL(b); setUrl(u); } }).catch(() => undefined);
    return () => { alive = false; if (u) URL.revokeObjectURL(u); };
  }, [id]);
  return url;
}

function PhotoTile({ id, date, hidden, onOpen }: { id: string; date: string; hidden: boolean; onOpen: () => void }) {
  const { lang } = useT();
  const url = usePhotoUrl(id);
  return (
    <button className={`photo ${hidden ? 'hidden' : ''}`} onClick={onOpen}>
      {url ? <img src={url} alt="" /> : null}
      {hidden ? <span className="lock"><Lock size={22} /></span> : null}
      <span className="cap">{fmtDate(lang, date, { day: 'numeric', month: 'short', year: '2-digit' })}</span>
    </button>
  );
}

function PhotoFull({ id }: { id: string }) {
  const url = usePhotoUrl(id);
  return url ? <img src={url} alt="" style={{ width: '100%', borderRadius: 18, maxHeight: '58dvh', objectFit: 'contain', background: 'var(--field)' }} /> : <div style={{ height: 200 }} />;
}

export function Photos() {
  const { t, lang } = useT();
  const photos = useStore((s) => s.photos);
  const hide = useStore((s) => s.settings.hidePhotos);
  const { addPhotoMeta, removePhotoMeta, setSettings } = useStore.getState();
  const file = useRef<HTMLInputElement>(null);
  const [revealed, setRevealed] = useState(false);
  const [open, setOpen] = useState<string | null>(null);
  const [compare, setCompare] = useState(false);
  const [ask, setAsk] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const hidden = hide && !revealed;

  const onFile = async (f: File | undefined) => {
    if (!f) return;
    setBusy(true);
    try {
      const blob = await shrinkImage(f);
      const id = `p_${Date.now().toString(36)}`;
      await savePhoto(id, blob);
      addPhotoMeta({ id, date: today() });
      toast(t('photo.added'));
    } catch { toast(t('photo.error')); }
    setBusy(false);
    if (file.current) file.current.value = '';
  };
  const opened = photos.find((p) => p.id === open);

  return (
    <div className="screen no-tabs">
      <Header title={t('photo.title')} onBack right={
        <button className="icon-btn" aria-label={hidden ? t('photo.show') : t('photo.hide')} onClick={() => (hide ? setRevealed(!revealed) : setSettings({ hidePhotos: true }))}>{hidden ? <Eye size={19} /> : <EyeOff size={19} />}</button>} />
      <div className="note pink"><Lock size={18} /><span>{t('photo.note')}</span></div>
      <input ref={file} type="file" accept="image/*" hidden onChange={(e) => onFile(e.target.files?.[0])} />
      {photos.length ? (
        <div className="photo-grid">
          {photos.map((p) => <PhotoTile key={p.id} id={p.id} date={p.date} hidden={hidden} onOpen={() => (hidden ? setRevealed(true) : setOpen(p.id))} />)}
        </div>
      ) : <Empty icon={<Camera size={26} />} title={t('photo.empty')} text={t('photo.empty.d')} />}
      {photos.length >= 2 ? <button className="btn soft block md" onClick={() => { setRevealed(true); setCompare(true); }}>{t('photo.compare')}</button> : null}
      <div className="sticky-cta"><button className="btn primary block" disabled={busy} onClick={() => file.current?.click()}><Camera size={18} />{busy ? t('common.loading') : t('photo.add')}</button></div>

      {opened ? (
        <Sheet title={fmtDate(lang, opened.date, { day: 'numeric', month: 'long', year: 'numeric' })} onClose={() => setOpen(null)}>
          <PhotoFull id={opened.id} />
          <button className="btn danger block md" onClick={() => setAsk(opened.id)}><Trash2 size={17} />{t('common.delete')}</button>
        </Sheet>
      ) : null}
      {compare && photos.length >= 2 ? (
        <Sheet title={t('photo.compare')} onClose={() => setCompare(false)}>
          <div className="grid2">
            {[photos[0], photos[photos.length - 1]].map((p, i) => (
              <div key={p.id} className="col" style={{ gap: 6 }}>
                <PhotoFull id={p.id} />
                <div className="center small bold">{i === 0 ? t('photo.before') : t('photo.after')} · {fmtDate(lang, p.date, { day: 'numeric', month: 'short' })}</div>
              </div>
            ))}
          </div>
        </Sheet>
      ) : null}
      {ask ? <Confirm danger title={t('photo.delete')} text={t('photo.delete.d')} yes={t('common.delete')} no={t('common.cancel')}
        onYes={async () => { await deletePhoto(ask).catch(() => undefined); removePhotoMeta(ask); setAsk(null); setOpen(null); }} onNo={() => setAsk(null)} /> : null}
    </div>
  );
}
