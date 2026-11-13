import { useSyncExternalStore } from 'react';

/** Мини-роутер на hash: работает из любой подпапки и без настройки сервера. */
const read = () => window.location.hash.replace(/^#/, '') || '/';
const subscribe = (cb: () => void) => {
  window.addEventListener('hashchange', cb);
  return () => window.removeEventListener('hashchange', cb);
};

export function useRoute(): { path: string; parts: string[]; query: URLSearchParams } {
  const raw = useSyncExternalStore(subscribe, read);
  const [path, q = ''] = raw.split('?');
  return { path, parts: path.split('/').filter(Boolean), query: new URLSearchParams(q) };
}

export const nav = (path: string, replace = false) => {
  if (replace) window.location.replace(`#${path}`);
  else window.location.hash = path;
};
export const back = (fallback = '/') => {
  if (window.history.length > 1) window.history.back();
  else nav(fallback, true);
};
