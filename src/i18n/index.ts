import { useCallback } from 'react';
import type { L, Lang } from '../domain/types';
import { useStore } from '../store';
import { ru } from './ru';
import { pl } from './pl';

export type Key = keyof typeof ru;
const DICT: Record<Lang, Record<Key, string>> = { ru, pl };

/** формы множественного числа: «one|few|many» */
export function pluralIndex(lang: Lang, n: number): number {
  const a = Math.abs(n) % 100, b = a % 10;
  if (lang === 'pl') return n === 1 ? 0 : b >= 2 && b <= 4 && !(a >= 12 && a <= 14) ? 1 : 2;
  if (a > 10 && a < 20) return 2;
  return b === 1 ? 0 : b >= 2 && b <= 4 ? 1 : 2;
}

export function translate(lang: Lang, key: Key, vars?: Record<string, string | number>): string {
  let s = DICT[lang][key] ?? ru[key] ?? key;
  if (vars) {
    if (typeof vars.n === 'number' && s.includes('|')) s = s.split('|')[pluralIndex(lang, vars.n)] ?? s;
    for (const k in vars) s = s.split(`{${k}}`).join(String(vars[k]));
  }
  return s;
}

export function useT() {
  const lang = useStore((s) => s.settings.lang);
  const t = useCallback((key: Key, vars?: Record<string, string | number>) => translate(lang, key, vars), [lang]);
  const tr = useCallback((l: L | undefined) => (l ? l[lang] ?? l.ru : ''), [lang]);
  return { t, tr, lang };
}

const LOCALE: Record<Lang, string> = { ru: 'ru-RU', pl: 'pl-PL' };
export const locale = (lang: Lang) => LOCALE[lang];
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
export const fmtDate = (lang: Lang, iso: string, opts: Intl.DateTimeFormatOptions) =>
  cap(new Date(iso + 'T12:00:00').toLocaleDateString(LOCALE[lang], opts));
export const WEEKDAYS_SHORT: Record<Lang, string[]> = {
  ru: ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс'],
  pl: ['Pn', 'Wt', 'Śr', 'Cz', 'Pt', 'So', 'Nd'],
};
export const WEEKDAYS_LONG: Record<Lang, string[]> = {
  ru: ['Понедельник', 'Вторник', 'Среда', 'Четверг', 'Пятница', 'Суббота', 'Воскресенье'],
  pl: ['Poniedziałek', 'Wtorek', 'Środa', 'Czwartek', 'Piątek', 'Sobota', 'Niedziela'],
};
