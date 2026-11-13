/** Работа с датами в локальном времени. Дата хранится строкой YYYY-MM-DD. */

export const iso = (d: Date): string =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
export const today = (): string => iso(new Date());
export const parse = (s: string): Date => {
  const [y, m, d] = s.split('-').map(Number);
  return new Date(y, m - 1, d);
};
export const addDays = (s: string, n: number): string => {
  const d = parse(s);
  d.setDate(d.getDate() + n);
  return iso(d);
};
/** 0 — понедельник … 6 — воскресенье */
export const weekday = (s: string): number => (parse(s).getDay() + 6) % 7;
export const startOfWeek = (s: string): string => addDays(s, -weekday(s));
export const weekDates = (s: string): string[] => {
  const st = startOfWeek(s);
  return Array.from({ length: 7 }, (_, i) => addDays(st, i));
};
export const diffDays = (a: string, b: string): number =>
  Math.round((parse(a).getTime() - parse(b).getTime()) / 86400000);
export const startOfMonth = (s: string): string => s.slice(0, 8) + '01';
/** сетка месяца: недели с понедельника, включая хвосты соседних месяцев */
export const monthGrid = (s: string): string[] => {
  const first = startOfMonth(s);
  const start = startOfWeek(first);
  const d = parse(first);
  const days = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
  const cells = Math.ceil((weekday(first) + days) / 7) * 7;
  return Array.from({ length: cells }, (_, i) => addDays(start, i));
};
export const addMonths = (s: string, n: number): string => {
  const d = parse(startOfMonth(s));
  d.setMonth(d.getMonth() + n);
  return iso(d);
};
