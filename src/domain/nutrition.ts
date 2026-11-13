import type { DayLog, Food, Goal, MealKey, Profile } from './types';

export interface Targets { kcal: number; p: number; f: number; c: number; waterMl: number; note: 'none' | 'floor' | 'minor' }

export const bmi = (kg: number, cm: number) => kg / (cm / 100) ** 2;

/** Нижняя граница здорового веса (ИМТ 18,5) для роста. */
export const minHealthyKg = (cm: number) => Math.ceil(18.5 * (cm / 100) ** 2 * 10) / 10;
export const maxHealthyKg = (cm: number) => Math.floor(24.9 * (cm / 100) ** 2 * 10) / 10;

/** Базовый обмен: формула Миффлина — Сан-Жеора (женщины). */
export const bmr = (p: Pick<Profile, 'weightKg' | 'heightCm' | 'age'>) =>
  10 * p.weightKg + 6.25 * p.heightCm - 5 * p.age - 161;

const GOAL_FACTOR: Record<Goal, number> = { lose: 0.85, tone: 0.95, gain: 1.1, maintain: 1 };

/**
 * Дневные цели по питанию. Безопасность:
 *  — дефицит не больше 15% и не ниже базового обмена / 1200 ккал;
 *  — до 18 лет и при весе у нижней границы нормы дефицит не назначается.
 */
export function targets(p: Profile): Targets {
  const activity = 1.3 + 0.045 * Math.min(6, p.days.length);
  const tdee = bmr(p) * activity;
  let factor = GOAL_FACTOR[p.goal];
  let note: Targets['note'] = 'none';
  const minor = p.age < 18;
  const underweight = bmi(p.weightKg, p.heightCm) < 19;
  if (factor < 1 && (minor || underweight)) { factor = 1; note = minor ? 'minor' : 'floor'; }
  let kcal = tdee * factor;
  const floor = Math.max(1200, bmr(p));
  if (kcal < floor) { kcal = floor; if (note === 'none') note = 'floor'; }
  kcal = Math.round(kcal / 10) * 10;
  const protein = Math.round(p.weightKg * (p.goal === 'gain' ? 1.8 : p.goal === 'maintain' ? 1.4 : 1.6));
  const fat = Math.round(Math.max(p.weightKg * 0.9, (kcal * 0.25) / 9));
  const carbs = Math.max(80, Math.round((kcal - protein * 4 - fat * 9) / 4));
  const waterMl = Math.round((p.weightKg * 30) / 250) * 250;
  return { kcal, p: protein, f: fat, c: carbs, waterMl, note };
}

/** Безопасный темп: не более ~0,7% массы тела в неделю. */
export function weeksToGoal(p: Pick<Profile, 'weightKg' | 'targetKg' | 'goal'>): number | null {
  const diff = Math.abs(p.weightKg - p.targetKg);
  if (diff < 0.3) return null;
  const perWeek = p.targetKg < p.weightKg ? Math.min(0.6, p.weightKg * 0.007) : 0.25;
  return Math.ceil(diff / perWeek);
}

export const emptyDay = (): DayLog => ({ meals: { breakfast: [], lunch: [], dinner: [], snack: [] }, waterMl: 0 });
export const MEALS: MealKey[] = ['breakfast', 'lunch', 'dinner', 'snack'];

export interface Macro { kcal: number; p: number; f: number; c: number }
export const macroOf = (food: Food, grams: number): Macro => ({
  kcal: (food.kcal * grams) / 100, p: (food.p * grams) / 100, f: (food.f * grams) / 100, c: (food.c * grams) / 100,
});
export function sumDay(day: DayLog | undefined, find: (id: string) => Food | undefined, meal?: MealKey): Macro {
  const out: Macro = { kcal: 0, p: 0, f: 0, c: 0 };
  if (!day) return out;
  for (const m of meal ? [meal] : MEALS) {
    for (const e of day.meals[m] ?? []) {
      const food = find(e.foodId);
      if (!food) continue;
      const x = macroOf(food, e.grams);
      out.kcal += x.kcal; out.p += x.p; out.f += x.f; out.c += x.c;
    }
  }
  return out;
}
