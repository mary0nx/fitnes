import { useMemo, useState } from 'react';
import { Bell, CalendarCheck, Check, ChevronRight, Clock, Dumbbell, Flame, Moon, Play, Quote, Sparkles } from 'lucide-react';
import { thumbUrl } from '../data/exercises';
import { QUOTES } from '../data/quotes';
import { addDays, diffDays, today, weekDates } from '../domain/dates';
import { COVER, estimateKcal, estimateMinutes, nextWorkoutDate, programWeek, workoutForDate } from '../domain/plan';
import { dayState, goalProgress, streak, weekPlanCount } from '../domain/stats';
import { fmtW } from '../domain/units';
import { fmtDate, useT, WEEKDAYS_SHORT } from '../i18n';
import { nav } from '../router';
import { useStore } from '../store';
import { Ring, Sheet, Switch, toast } from '../ui/basic';
import { requestReminders } from '../notify';

export function Home() {
  const { t, tr, lang } = useT();
  const profile = useStore((s) => s.profile)!;
  const plan = useStore((s) => s.plan);
  const history = useStore((s) => s.history);
  const active = useStore((s) => s.active);
  const weights = useStore((s) => s.weights);
  const settings = useStore((s) => s.settings);
  const setSettings = useStore((s) => s.setSettings);
  const [bell, setBell] = useState(false);
  const now = today();
  const u = t(settings.unit === 'kg' ? 'unit.kg' : 'unit.lb');

  const doneToday = history.some((s) => s.date === now);
  const date = useMemo(() => (plan ? nextWorkoutDate(plan, now, (d) => history.some((s) => s.date === d)) : null), [plan, now, history]);
  const workout = plan && date ? workoutForDate(plan, date) : null;
  const startKg = weights[0]?.kg ?? profile.weightKg;
  const gp = goalProgress(startKg, profile.weightKg, profile.targetKg);
  const left = profile.targetKg - profile.weightKg;
  const st = streak(plan, history);
  const week = weekDates(now);
  const weekDone = week.filter((d) => history.some((s) => s.date === d)).length;
  const weekGoal = weekPlanCount(plan, now);
  const quote = QUOTES[(diffDays(now, '2024-01-01') % QUOTES.length + QUOTES.length) % QUOTES.length];
  const lastWeigh = weights[weights.length - 1]?.date;
  const notes: { icon: JSX.Element; text: string; go: string }[] = [];
  if (active) notes.push({ icon: <Play size={18} />, text: t('home.n.resume'), go: '/workout' });
  if (workout && date === now && !doneToday) notes.push({ icon: <Dumbbell size={18} />, text: t('home.n.today', { name: tr(workout.name) }), go: `/day/${now}` });
  if (lastWeigh && diffDays(now, lastWeigh) >= 7) notes.push({ icon: <Sparkles size={18} />, text: t('home.n.weigh'), go: '/progress' });

  const dayLabel = !date ? '' : date === now ? t('home.today') : date === addDays(now, 1) ? t('home.tomorrow') : fmtDate(lang, date, { weekday: 'long', day: 'numeric', month: 'long' });

  return (
    <div className="screen">
      <div className="header">
        <button className="avatar" onClick={() => nav('/profile')} aria-label={t('tab.profile')}>
          {profile.avatar ? <img src={profile.avatar} alt="" /> : profile.name.charAt(0).toUpperCase()}
        </button>
        <div className="grow">
          <div className="small muted bold">{fmtDate(lang, now, { weekday: 'long', day: 'numeric', month: 'long' })}</div>
          <h1 className="ellipsis" style={{ fontSize: 23 }}>{t('home.hello', { name: profile.name })} 🌸</h1>
        </div>
        <button className="icon-btn" aria-label={t('home.notifications')} onClick={() => setBell(true)} style={{ position: 'relative' }}>
          <Bell size={20} />
          {notes.length ? <i style={{ position: 'absolute', top: 9, right: 10, width: 9, height: 9, borderRadius: '50%', background: 'var(--pink)', border: '2px solid var(--bg)' }} /> : null}
        </button>
      </div>

      {active ? (
        <button className="card tap row" onClick={() => nav('/workout')} style={{ background: 'var(--grad-pink)', color: '#fff', borderColor: 'transparent' }}>
          <div className="list-icon" style={{ background: 'rgba(255,255,255,.25)', color: '#fff' }}><Play size={20} fill="currentColor" /></div>
          <div className="grow"><div className="bold">{t('home.resume')}</div><div className="small" style={{ opacity: 0.9 }}>{tr(active.name)} · {t('home.resume.at', { n: active.index + 1, m: active.exercises.length })}</div></div>
          <ChevronRight size={20} />
        </button>
      ) : null}

      {workout && date ? (
        <div className="hero-card">
          <img className="img" src={thumbUrl(COVER[workout.type] ?? workout.items[1]?.exerciseId)} alt="" />
          <div className="k">{doneToday && date !== now ? t('home.next') : t('home.todayWorkout')} · {dayLabel}</div>
          <h2>{tr(workout.name)}</h2>
          <div className="meta">
            <span><Clock size={15} />{t('common.min', { n: estimateMinutes(workout.items) })}</span>
            <span><Dumbbell size={15} />{t('common.exercises', { n: workout.items.length })}</span>
            <span><Flame size={15} />≈ {estimateKcal(workout.items, profile.weightKg)} {t('unit.kcal')}</span>
          </div>
          <button className="btn primary" style={{ marginTop: 14 }} onClick={() => nav(`/day/${date}`)}>
            {date === now ? t('home.start') : t('home.view')} <Play size={16} fill="currentColor" />
          </button>
        </div>
      ) : (
        <div className="card row">
          <div className="list-icon lav"><Moon size={20} /></div>
          <div className="grow"><div className="bold">{t('home.noPlan')}</div><div className="small muted">{t('home.noPlan.d')}</div></div>
          <button className="btn tint sm" onClick={() => nav('/schedule')}>{t('common.setup')}</button>
        </div>
      )}

      {doneToday ? (
        <div className="note pink"><Check size={18} /><span className="bold">{t('home.doneToday')}</span></div>
      ) : null}

      <div className="grid2">
        <button className="card tap" onClick={() => nav('/progress')}>
          <div className="stat-label">{t('home.weight')}</div>
          <div className="stat-value num">{fmtW(profile.weightKg, settings.unit, 1, lang)}<small>{u}</small></div>
        </button>
        <button className="card tap" onClick={() => nav('/profile/edit')}>
          <div className="stat-label">{t('home.target')}</div>
          <div className="stat-value num">{fmtW(profile.targetKg, settings.unit, 1, lang)}<small>{u}</small></div>
        </button>
      </div>

      <div className="card row" style={{ gap: 16 }}>
        <Ring value={gp} size={76} stroke={9}><b className="num" style={{ fontSize: 17 }}>{Math.round(gp * 100)}%</b></Ring>
        <div className="grow">
          <div className="stat-label">{t('home.progress')}</div>
          <div className="stat-value num">
            {Math.abs(left) < 0.05 ? t('home.reached') : <>{left > 0 ? '+' : '−'}{fmtW(Math.abs(left), settings.unit, 1, lang)}<small>{u}</small></>}
          </div>
          {Math.abs(left) >= 0.05 ? <div className="small muted">{t('home.left')}</div> : null}
        </div>
      </div>

      <div className="grid2">
        <div className="card row">
          <div className="list-icon"><Flame size={20} /></div>
          <div><div className="stat-label">{t('home.streak')}</div><div className="bold num" style={{ fontSize: 17 }}>{t('home.streak.n', { n: st })}</div></div>
        </div>
        <div className="card row">
          <div className="list-icon lav"><CalendarCheck size={20} /></div>
          <div><div className="stat-label">{t('home.week')}</div><div className="bold num" style={{ fontSize: 17 }}>{weekDone} / {Math.max(weekGoal, weekDone)}</div></div>
        </div>
      </div>

      <div className="card">
        <div className="row between" style={{ marginBottom: 12 }}>
          <div className="bold">{t('home.activity')}</div>
          <span className="small muted bold">{plan ? t('home.programWeek', { n: Math.min(programWeek(plan, now), plan.weeks), m: plan.weeks }) : ''}</span>
        </div>
        <div className="week-dots">
          {week.map((d, i) => {
            const s = dayState(plan, history, d, now);
            return (
              <button key={d} className={`week-dot ${s}`} onClick={() => nav(`/train?d=${d}`)} aria-label={d}>
                <i>{s === 'done' ? <Check size={16} strokeWidth={3} /> : s === 'rest' ? <Moon size={14} /> : <Dumbbell size={14} />}</i>
                {WEEKDAYS_SHORT[lang][i]}
              </button>
            );
          })}
        </div>
      </div>

      {settings.motivation ? (
        <div className="card quote"><Quote size={20} /><span>{tr(quote)}</span></div>
      ) : null}

      {bell ? (
        <Sheet title={t('home.notifications')} onClose={() => setBell(false)}>
          {notes.length ? (
            <div className="card pad0 list">
              {notes.map((n, i) => (
                <button key={i} className="list-item" onClick={() => { setBell(false); nav(n.go); }}>
                  <div className="list-icon">{n.icon}</div><div className="grow title">{n.text}</div><ChevronRight size={18} className="chev" />
                </button>
              ))}
            </div>
          ) : <p className="muted center" style={{ padding: 10 }}>{t('home.n.empty')}</p>}
          <div className="card row between">
            <div><div className="bold">{t('set.reminders')}</div><div className="small muted">{t('set.reminders.d')}</div></div>
            <Switch on={settings.reminders} label={t('set.reminders')} onChange={async (v) => {
              if (!v) return setSettings({ reminders: false });
              const ok = await requestReminders();
              setSettings({ reminders: ok });
              toast(ok ? t('set.reminders.on') : t('set.reminders.denied'));
            }} />
          </div>
        </Sheet>
      ) : null}
    </div>
  );
}
