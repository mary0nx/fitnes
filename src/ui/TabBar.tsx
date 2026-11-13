import { Apple, BarChart3, Dumbbell, Home, User } from 'lucide-react';
import { nav } from '../router';
import { useT } from '../i18n';

const TABS = [
  { path: '/', key: 'tab.home', icon: Home },
  { path: '/train', key: 'tab.train', icon: Dumbbell },
  { path: '/nutrition', key: 'tab.nutrition', icon: Apple },
  { path: '/progress', key: 'tab.progress', icon: BarChart3 },
  { path: '/profile', key: 'tab.profile', icon: User },
] as const;

export function TabBar({ active }: { active: string }) {
  const { t } = useT();
  return (
    <nav className="tabbar">
      {TABS.map((tab) => {
        const on = active === tab.path;
        const Icon = tab.icon;
        return (
          <button key={tab.path} className={on ? 'on' : ''} aria-current={on ? 'page' : undefined} onClick={() => nav(tab.path)}>
            <span className="ico"><Icon size={21} strokeWidth={on ? 2.5 : 2} /></span>
            {t(tab.key)}
          </button>
        );
      })}
    </nav>
  );
}
