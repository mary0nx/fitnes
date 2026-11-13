import { useEffect } from 'react';
import { today } from './domain/dates';
import { workoutForDate } from './domain/plan';
import { translate } from './i18n';
import { notify } from './notify';
import { useRoute } from './router';
import { useStore } from './store';
import { ToastHost } from './ui/basic';
import { TabBar } from './ui/TabBar';
import { Onboarding } from './screens/Onboarding';
import { Home } from './screens/Home';
import { SessionDetail, Train } from './screens/Train';
import { DayPreview, Schedule, WorkoutEdit } from './screens/Plan';
import { ExerciseDetail } from './screens/ExerciseDetail';
import { Workout, WorkoutDone } from './screens/Workout';
import { Nutrition } from './screens/Nutrition';
import { Achievements, Photos, Progress } from './screens/Progress';
import { Install, Profile, ProfileEdit, Settings } from './screens/Profile';

/** Тема: light / dark / как в системе. */
function useTheme() {
  const theme = useStore((s) => s.settings.theme);
  const lang = useStore((s) => s.settings.lang);
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const apply = () => {
      const dark = theme === 'dark' || (theme === 'auto' && mq.matches);
      document.documentElement.dataset.theme = dark ? 'dark' : 'light';
      document.querySelector('meta[name="theme-color"]')?.setAttribute('content', dark ? '#231A29' : '#F9F2FA');
    };
    apply();
    mq.addEventListener?.('change', apply);
    return () => mq.removeEventListener?.('change', apply);
  }, [theme]);
  useEffect(() => { document.documentElement.lang = lang; }, [lang]);
}

/** Напоминание о тренировке: раз в день после выбранного времени, пока приложение открыто. */
function useReminder() {
  const settings = useStore((s) => s.settings);
  const plan = useStore((s) => s.plan);
  const history = useStore((s) => s.history);
  useEffect(() => {
    if (!settings.reminders || !plan) return;
    const check = () => {
      const d = today();
      const w = workoutForDate(plan, d);
      if (!w || history.some((s) => s.date === d)) return;
      const now = new Date();
      const hhmm = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
      let last = '';
      try { last = localStorage.getItem('wf-reminded') ?? ''; } catch { /* */ }
      if (hhmm < settings.reminderTime || last === d) return;
      try { localStorage.setItem('wf-reminded', d); } catch { /* */ }
      notify(translate(settings.lang, 'rem.title'), translate(settings.lang, 'rem.body', { name: w.name[settings.lang] }), 'wf-reminder');
    };
    check();
    const id = setInterval(check, 60000);
    return () => clearInterval(id);
  }, [settings.reminders, settings.reminderTime, settings.lang, plan, history]);
}

export function App() {
  useTheme();
  useReminder();
  const profile = useStore((s) => s.profile);
  const { parts, path } = useRoute();

  useEffect(() => { window.scrollTo(0, 0); }, [path]);

  if (!profile) return <div className="app"><Onboarding /><ToastHost /></div>;

  const [a, b, c] = parts;
  let screen: JSX.Element;
  let tab: string | null = null;
  switch (a) {
    case undefined: screen = <Home />; tab = '/'; break;
    case 'train': screen = <Train />; tab = '/train'; break;
    case 'day': screen = <DayPreview date={b ?? today()} />; break;
    case 'schedule': screen = <Schedule />; break;
    case 'workout-edit': screen = <WorkoutEdit key={b} id={b ?? 'new'} />; break;
    case 'exercise': screen = <ExerciseDetail key={b} id={b ?? ''} />; break;
    case 'workout': screen = <Workout />; break;
    case 'done': screen = <WorkoutDone id={b ?? ''} />; break;
    case 'session': screen = <SessionDetail id={b ?? ''} />; break;
    case 'nutrition': screen = <Nutrition />; tab = '/nutrition'; break;
    case 'progress': screen = <Progress />; tab = '/progress'; break;
    case 'achievements': screen = <Achievements />; break;
    case 'photos': screen = <Photos />; break;
    case 'profile': screen = b === 'edit' ? <ProfileEdit /> : <Profile />; tab = b ? null : '/profile'; break;
    case 'settings': screen = <Settings />; break;
    case 'install': screen = <Install />; break;
    default: screen = <Home />; tab = '/';
  }
  void c;
  return (
    <div className={`app ${tab ? 'has-tabs' : ''}`}>
      {screen}
      {tab ? <TabBar active={tab} /> : null}
      <ToastHost />
    </div>
  );
}
