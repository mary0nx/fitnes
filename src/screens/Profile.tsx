import { useEffect, useRef, useState } from 'react';
import { Bell, Camera, Check, ChevronRight, Database, Download, HeartPulse, Info, Lock, Pencil, Settings as SettingsIcon, Share, Smartphone, Sparkles, Target, Trash2, Trophy, Upload, User } from 'lucide-react';
import { today } from '../domain/dates';
import { bmi, minHealthyKg, targets } from '../domain/nutrition';
import type { Goal, Level, Limitation, Place } from '../domain/types';
import { fromUnit, fmtW, toUnit } from '../domain/units';
import { useT, WEEKDAYS_SHORT } from '../i18n';
import { requestReminders } from '../notify';
import { back, nav } from '../router';
import { useStore } from '../store';
import { clearPhotos } from '../storage/photos';
import { Confirm, Header, Seg, Sheet, Stepper, Switch, toast } from '../ui/basic';
import { canInstall, isStandalone, promptInstall, useInstallAvailable } from '../pwa';

export function Profile() {
  const { t, lang } = useT();
  const profile = useStore((s) => s.profile)!;
  const history = useStore((s) => s.history);
  const unit = useStore((s) => s.settings.unit);
  const updateProfile = useStore((s) => s.updateProfile);
  const file = useRef<HTMLInputElement>(null);
  const [about, setAbout] = useState(false);
  const u = t(unit === 'kg' ? 'unit.kg' : 'unit.lb');

  const onAvatar = async (f?: File) => {
    if (!f) return;
    try {
      const bmp = await createImageBitmap(f);
      const s = Math.min(bmp.width, bmp.height);
      const c = document.createElement('canvas');
      c.width = c.height = 256;
      c.getContext('2d')!.drawImage(bmp, (bmp.width - s) / 2, (bmp.height - s) / 2, s, s, 0, 0, 256, 256);
      updateProfile({ avatar: c.toDataURL('image/jpeg', 0.85) });
    } catch { toast(t('photo.error')); }
  };

  const items: { icon: JSX.Element; title: string; sub: string; go: () => void; lav?: boolean }[] = [
    { icon: <Target size={20} />, title: t('prof.plan'), sub: t('prof.plan.d'), go: () => nav('/profile/edit') },
    { icon: <User size={20} />, title: t('prof.data'), sub: t('prof.data.d'), go: () => nav('/profile/edit') },
    { icon: <Trophy size={20} />, title: t('prog.ach'), sub: t('prof.ach.d'), go: () => nav('/achievements'), lav: true },
    { icon: <SettingsIcon size={20} />, title: t('set.title'), sub: t('prof.settings.d'), go: () => nav('/settings'), lav: true },
    { icon: <Smartphone size={20} />, title: t('inst.title'), sub: t('prof.install.d'), go: () => nav('/install') },
    { icon: <Info size={20} />, title: t('prof.about'), sub: t('prof.about.d'), go: () => setAbout(true), lav: true },
  ];

  return (
    <div className="screen">
      <Header large title={t('tab.profile')} right={<button className="icon-btn" aria-label={t('set.title')} onClick={() => nav('/settings')}><SettingsIcon size={20} /></button>} />
      <div className="card row" style={{ gap: 16 }}>
        <button className="avatar xl" style={{ position: 'relative', overflow: 'visible' }} aria-label={t('prof.avatar')} onClick={() => file.current?.click()}>
          <span style={{ width: '100%', height: '100%', borderRadius: '50%', overflow: 'hidden', display: 'grid', placeItems: 'center' }}>
            {profile.avatar ? <img src={profile.avatar} alt="" /> : profile.name.charAt(0).toUpperCase()}
          </span>
          <span style={{ position: 'absolute', right: -4, bottom: -4, width: 28, height: 28, borderRadius: '50%', background: 'var(--card-solid)', color: 'var(--pink)', display: 'grid', placeItems: 'center', boxShadow: 'var(--shadow)' }}><Camera size={14} /></span>
        </button>
        <input ref={file} type="file" accept="image/*" hidden onChange={(e) => onAvatar(e.target.files?.[0])} />
        <div className="grow">
          <div className="row" style={{ gap: 8 }}>
            <h2 className="ellipsis" style={{ fontSize: 23, fontWeight: 800, letterSpacing: '-.02em' }}>{profile.name}</h2>
            <button className="icon-btn sm plain" aria-label={t('common.edit')} onClick={() => nav('/profile/edit')}><Pencil size={16} /></button>
          </div>
          <div className="muted small bold">{t('prof.age', { n: profile.age })} · {profile.heightCm} {t('unit.cm')}</div>
          <div className="row" style={{ gap: 6, marginTop: 8, flexWrap: 'wrap' }}>
            <span className="badge">{t(`goal.${profile.goal}`)}</span><span className="badge lav">{t(`level.${profile.level}`)}</span>
          </div>
        </div>
      </div>
      <div className="grid3">
        <div className="card center tight"><div className="stat-value num" style={{ fontSize: 20 }}>{fmtW(profile.weightKg, unit, 1, lang)}</div><div className="stat-label">{t('prog.weight')}, {u}</div></div>
        <div className="card center tight"><div className="stat-value num" style={{ fontSize: 20 }}>{fmtW(profile.targetKg, unit, 1, lang)}</div><div className="stat-label">{t('prog.target')}, {u}</div></div>
        <div className="card center tight"><div className="stat-value num" style={{ fontSize: 20 }}>{history.length}</div><div className="stat-label">{t('prog.workouts')}</div></div>
      </div>
      <div className="card pad0 list">
        {items.map((it, i) => (
          <button key={i} className="list-item" onClick={it.go}>
            <div className={`list-icon ${it.lav ? 'lav' : ''}`}>{it.icon}</div>
            <div className="grow"><div className="title">{it.title}</div><div className="sub">{it.sub}</div></div>
            <ChevronRight size={18} className="chev" />
          </button>
        ))}
      </div>
      {about ? (
        <Sheet title="Women’s Fitness" onClose={() => setAbout(false)}>
          <p style={{ lineHeight: 1.5 }}>{t('about.text')}</p>
          <div className="note"><HeartPulse size={18} /><span>{t('about.health')}</span></div>
          <div className="note pink"><Lock size={18} /><span>{t('about.privacy')}</span></div>
          <p className="small muted">{t('about.model')}</p>
          <p className="tiny muted center">v{__APP_VERSION__}</p>
        </Sheet>
      ) : null}
    </div>
  );
}

export function ProfileEdit() {
  const { t, lang } = useT();
  const profile = useStore((s) => s.profile)!;
  const unit = useStore((s) => s.settings.unit);
  const { updateProfile, addWeight } = useStore.getState();
  const [p, setP] = useState(profile);
  const [ask, setAsk] = useState(false);
  const u = t(unit === 'kg' ? 'unit.kg' : 'unit.lb');
  const up = (patch: Partial<typeof p>) => setP((x) => ({ ...x, ...patch }));
  const lo = minHealthyKg(p.heightCm);
  const planChanged = p.goal !== profile.goal || p.level !== profile.level || p.place !== profile.place ||
    p.days.join() !== profile.days.join() || p.limitations.join() !== profile.limitations.join();
  const tg = targets(p);

  const save = (regen: boolean) => {
    const targetKg = Math.max(lo, p.targetKg);
    updateProfile({ ...p, name: p.name.trim() || profile.name, targetKg, days: [...p.days].sort((a, b) => a - b) }, regen);
    if (Math.abs(p.weightKg - profile.weightKg) > 0.04) addWeight(today(), p.weightKg);
    toast(regen ? t('edit.planUpdated') : t('common.saved'));
    back('/profile');
  };
  const W = (kg: number, on: (kg: number) => void, label: string, min = 30) => (
    <Stepper value={Math.round(toUnit(kg, unit) * 10) / 10} step={unit === 'kg' ? 0.5 : 1} min={Math.round(toUnit(min, unit))} max={400} digits={1} unit={u} label={label} onChange={(v) => on(Math.round(fromUnit(v, unit) * 10) / 10)} />
  );
  const goals: Goal[] = ['lose', 'tone', 'gain', 'maintain'];
  const lims: Limitation[] = ['knees', 'back', 'shoulders'];

  return (
    <div className="screen no-tabs">
      <Header title={t('prof.data')} onBack />
      <div className="card col" style={{ gap: 14 }}>
        <div className="col" style={{ gap: 6 }}><label className="lbl">{t('ob.name.ph')}</label><input className="field" maxLength={24} value={p.name} onChange={(e) => up({ name: e.target.value })} /></div>
        <div className="row between"><span className="bold">{t('pe.age')}</span><Stepper value={p.age} min={14} max={90} label={t('pe.age')} onChange={(v) => up({ age: v })} /></div>
        <div className="row between"><span className="bold">{t('pe.height')}</span><Stepper value={p.heightCm} min={130} max={220} unit={t('unit.cm')} label={t('pe.height')} onChange={(v) => up({ heightCm: v })} /></div>
        <div className="row between"><span className="bold">{t('prog.weight')}</span>{W(p.weightKg, (kg) => up({ weightKg: kg }), t('prog.weight'))}</div>
        <div className="row between"><span className="bold">{t('prog.target')}</span>{W(Math.max(lo, p.targetKg), (kg) => up({ targetKg: Math.max(lo, kg) }), t('prog.target'), lo)}</div>
        <div className="small muted">{t('ob.bmi')}: <b className="num">{bmi(p.weightKg, p.heightCm).toFixed(1)}</b> · {t('pe.kcal')}: <b className="num">{tg.kcal} {t('unit.kcal')}</b></div>
      </div>

      <h2 className="section">{t('prof.plan')}</h2>
      <div className="card col" style={{ gap: 14 }}>
        <div className="col" style={{ gap: 8 }}>
          <span className="lbl">{t('pe.goal')}</span>
          <div className="row" style={{ flexWrap: 'wrap', gap: 8 }}>
            {goals.map((g) => <button key={g} className={`chip ${p.goal === g ? 'on' : ''}`} onClick={() => up({ goal: g })}>{t(`goal.${g}`)}</button>)}
          </div>
        </div>
        <div className="col" style={{ gap: 8 }}><span className="lbl">{t('pe.level')}</span>
          <Seg value={p.level} onChange={(v) => up({ level: v as Level })} options={[1, 2, 3].map((l) => ({ value: l as Level, label: t(`level.${l as Level}`) }))} /></div>
        <div className="col" style={{ gap: 8 }}><span className="lbl">{t('pe.place')}</span>
          <Seg value={p.place} onChange={(v) => up({ place: v as Place })} options={(['home', 'gym', 'outdoor'] as Place[]).map((x) => ({ value: x, label: t(`place.${x}`) }))} /></div>
        <div className="col" style={{ gap: 8 }}>
          <span className="lbl">{t('pe.days')} · {p.days.length}</span>
          <div className="week-dots">
            {WEEKDAYS_SHORT[lang].map((w, i) => (
              <button key={i} className={`week-dot ${p.days.includes(i) ? 'done' : ''}`} aria-pressed={p.days.includes(i)}
                onClick={() => up({ days: p.days.includes(i) ? (p.days.length > 1 ? p.days.filter((x) => x !== i) : p.days) : [...p.days, i] })}>
                <i>{p.days.includes(i) ? <Check size={16} strokeWidth={3} /> : null}</i>{w}
              </button>
            ))}
          </div>
        </div>
        <div className="col" style={{ gap: 8 }}>
          <span className="lbl">{t('pe.lims')}</span>
          <div className="row" style={{ flexWrap: 'wrap', gap: 8 }}>
            {lims.map((l) => <button key={l} className={`chip ${p.limitations.includes(l) ? 'on' : ''}`} onClick={() => up({ limitations: p.limitations.includes(l) ? p.limitations.filter((x) => x !== l) : [...p.limitations, l] })}>{t(`lim.${l}`)}</button>)}
          </div>
        </div>
      </div>
      {planChanged ? <div className="note pink"><Sparkles size={18} /><span>{t('pe.regenNote')}</span></div> : null}
      <div className="sticky-cta"><button className="btn primary block" onClick={() => (planChanged ? setAsk(true) : save(false))}>{t('common.save')}</button></div>
      {ask ? <Confirm title={t('pe.regen')} text={t('pe.regen.d')} yes={t('pe.regen.yes')} no={t('pe.regen.no')} onYes={() => save(true)} onNo={() => save(false)} /> : null}
    </div>
  );
}

export function Settings() {
  const { t } = useT();
  const s = useStore((st) => st.settings);
  const { setSettings, exportData, importData, resetAll } = useStore.getState();
  const file = useRef<HTMLInputElement>(null);
  const [ask, setAsk] = useState(false);

  const doExport = () => {
    const blob = new Blob([exportData()], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `womens-fitness-${today()}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
    toast(t('set.exported'));
  };
  const doImport = async (f?: File) => {
    if (!f) return;
    const ok = importData(await f.text());
    toast(ok ? t('set.imported') : t('set.importError'));
    if (file.current) file.current.value = '';
  };
  const Row = ({ icon, title, sub, children }: { icon?: JSX.Element; title: string; sub?: string; children: React.ReactNode }) => (
    <div className="list-item">
      {icon ? <div className="list-icon lav">{icon}</div> : null}
      <div className="grow"><div className="title">{title}</div>{sub ? <div className="sub">{sub}</div> : null}</div>
      {children}
    </div>
  );

  return (
    <div className="screen no-tabs">
      <Header title={t('set.title')} onBack />
      <div className="card col" style={{ gap: 14 }}>
        <div className="col" style={{ gap: 8 }}><span className="lbl">{t('set.lang')}</span>
          <Seg value={s.lang} onChange={(v) => setSettings({ lang: v })} options={[{ value: 'ru', label: 'Русский' }, { value: 'pl', label: 'Polski' }]} /></div>
        <div className="col" style={{ gap: 8 }}><span className="lbl">{t('set.theme')}</span>
          <Seg value={s.theme} onChange={(v) => setSettings({ theme: v })} options={[{ value: 'light', label: t('set.theme.light') }, { value: 'dark', label: t('set.theme.dark') }, { value: 'auto', label: t('set.theme.auto') }]} /></div>
        <div className="col" style={{ gap: 8 }}><span className="lbl">{t('set.units')}</span>
          <Seg value={s.unit} onChange={(v) => setSettings({ unit: v })} options={[{ value: 'kg', label: t('set.units.kg') }, { value: 'lb', label: t('set.units.lb') }]} /></div>
      </div>

      <h2 className="section">{t('set.workout')}</h2>
      <div className="card pad0 list">
        <Row title={t('set.rest')} sub={t('set.rest.d')}><Stepper value={s.restSec} step={15} min={15} max={300} unit={t('unit.sec')} label={t('set.rest')} onChange={(v) => setSettings({ restSec: v })} /></Row>
        <Row title={t('set.sound')} sub={t('set.sound.d')}><Switch on={s.sound} label={t('set.sound')} onChange={(v) => setSettings({ sound: v })} /></Row>
        <Row title={t('set.vibration')}><Switch on={s.vibration} label={t('set.vibration')} onChange={(v) => setSettings({ vibration: v })} /></Row>
      </div>

      <h2 className="section">{t('set.notify')}</h2>
      <div className="card pad0 list">
        <Row icon={<Bell size={20} />} title={t('set.reminders')} sub={t('set.reminders.d')}>
          <Switch on={s.reminders} label={t('set.reminders')} onChange={async (v) => {
            if (!v) return setSettings({ reminders: false });
            const ok = await requestReminders();
            setSettings({ reminders: ok });
            toast(ok ? t('set.reminders.on') : t('set.reminders.denied'));
          }} />
        </Row>
        {s.reminders ? <Row title={t('set.reminderTime')}><input className="field" style={{ width: 120 }} type="time" value={s.reminderTime} onChange={(e) => e.target.value && setSettings({ reminderTime: e.target.value })} /></Row> : null}
        <Row icon={<Sparkles size={20} />} title={t('set.motivation')} sub={t('set.motivation.d')}><Switch on={s.motivation} label={t('set.motivation')} onChange={(v) => setSettings({ motivation: v })} /></Row>
      </div>

      <h2 className="section">{t('set.privacy')}</h2>
      <div className="card pad0 list">
        <Row icon={<Lock size={20} />} title={t('set.hidePhotos')} sub={t('set.hidePhotos.d')}><Switch on={s.hidePhotos} label={t('set.hidePhotos')} onChange={(v) => setSettings({ hidePhotos: v })} /></Row>
      </div>
      <div className="note"><Database size={18} /><span>{t('set.local')}</span></div>

      <h2 className="section">{t('set.data')}</h2>
      <input ref={file} type="file" accept="application/json,.json" hidden onChange={(e) => doImport(e.target.files?.[0])} />
      <button className="btn soft block md" onClick={doExport}><Download size={17} />{t('set.export')}</button>
      <button className="btn soft block md" onClick={() => file.current?.click()}><Upload size={17} />{t('set.import')}</button>
      <button className="btn danger block md" onClick={() => setAsk(true)}><Trash2 size={17} />{t('set.reset')}</button>
      {ask ? <Confirm danger title={t('set.reset')} text={t('set.reset.d')} yes={t('set.reset.yes')} no={t('common.cancel')}
        onYes={async () => { await clearPhotos().catch(() => undefined); resetAll(); nav('/', true); }} onNo={() => setAsk(false)} /> : null}
    </div>
  );
}

export function Install() {
  const { t } = useT();
  const available = useInstallAvailable();
  const [standalone, setStandalone] = useState(isStandalone());
  useEffect(() => {
    const m = window.matchMedia('(display-mode: standalone)');
    const on = () => setStandalone(isStandalone());
    m.addEventListener?.('change', on);
    return () => m.removeEventListener?.('change', on);
  }, []);
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) || (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  return (
    <div className="screen no-tabs">
      <Header title={t('inst.title')} onBack />
      {standalone ? (
        <div className="note pink"><Check size={18} /><span className="bold">{t('inst.done')}</span></div>
      ) : (
        <>
          <p className="muted">{t('inst.text')}</p>
          {available && canInstall() ? (
            <button className="btn primary block" onClick={async () => { const ok = await promptInstall(); if (ok) toast(t('inst.ok')); }}><Download size={18} />{t('inst.button')}</button>
          ) : null}
          <div className="card">
            <div className="bold" style={{ marginBottom: 12 }}>{ios ? 'iPhone / iPad · Safari' : 'iPhone · Safari'}</div>
            <div className="install-steps">
              <div><span>{t('inst.ios.1')} <Share size={15} style={{ verticalAlign: -2 }} /></span></div>
              <div><span>{t('inst.ios.2')}</span></div>
              <div><span>{t('inst.ios.3')}</span></div>
            </div>
          </div>
          <div className="card">
            <div className="bold" style={{ marginBottom: 12 }}>Android · Chrome</div>
            <div className="install-steps">
              <div><span>{t('inst.and.1')}</span></div>
              <div><span>{t('inst.and.2')}</span></div>
              <div><span>{t('inst.and.3')}</span></div>
            </div>
          </div>
        </>
      )}
      <div className="note"><Info size={18} /><span>{t('inst.offline')}</span></div>
    </div>
  );
}
