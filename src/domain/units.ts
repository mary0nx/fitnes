import type { WeightUnit } from './types';

export const KG_PER_LB = 0.45359237;
export const toUnit = (kg: number, u: WeightUnit) => (u === 'kg' ? kg : kg / KG_PER_LB);
export const fromUnit = (v: number, u: WeightUnit) => (u === 'kg' ? v : v * KG_PER_LB);
/** число для показа: 58 → «58,0» */
export const fmt = (n: number, digits = 1, lang = 'ru') =>
  n.toLocaleString(lang === 'pl' ? 'pl-PL' : 'ru-RU', { minimumFractionDigits: digits, maximumFractionDigits: digits });
export const fmtW = (kg: number, u: WeightUnit, digits = 1, lang = 'ru') => fmt(toUnit(kg, u), digits, lang);
/** шаг изменения веса на снаряде */
export const stepFor = (u: WeightUnit) => (u === 'kg' ? 2.5 : 5);
/** округление рабочего веса до шага 0,5 кг / 1 lb */
export const roundLoad = (kg: number, u: WeightUnit) =>
  u === 'kg' ? Math.round(kg * 2) / 2 : fromUnit(Math.round(toUnit(kg, u)), u);
