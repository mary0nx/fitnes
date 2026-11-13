import { useSyncExternalStore } from 'react';

/**
 * Мини-роутер. Обычный режим — на hash: работает из любой подпапки и без настройки сервера.
 * Режим preview (встроенный предпросмотр, где hash недоступен) — стек маршрутов в памяти.
 */
const MEMORY = import.meta.env.MODE === 'preview';
const stack: string[] = ['/'];
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((f) => f());

const read = () => (MEMORY ? stack[stack.length - 1] : window.location.hash.replace(/^#/, '') || '/');
const subscribe = (cb: () => void) => {
  if (MEMORY) { listeners.add(cb); return () => { listeners.delete(cb); }; }
  window.addEventListener('hashchange', cb);
  return () => window.removeEventListener('hashchange', cb);
};

export function useRoute(): { path: string; parts: string[]; query: URLSearchParams } {
  const raw = useSyncExternalStore(subscribe, read);
  const [path, q = ''] = raw.split('?');
  return { path, parts: path.split('/').filter(Boolean), query: new URLSearchParams(q) };
}

export const nav = (path: string, replace = false) => {
  if (MEMORY) {
    if (replace) stack[stack.length - 1] = path; else stack.push(path);
    emit();
  } else if (replace) window.location.replace(`#${path}`);
  else window.location.hash = path;
};
export const back = (fallback = '/') => {
  if (MEMORY) {
    if (stack.length > 1) stack.pop(); else stack[0] = fallback;
    emit();
  } else if (window.history.length > 1) window.history.back();
  else nav(fallback, true);
};
