import { addDays, diffDays, today, weekDates } from './dates';
import { tonnage, workoutIdForDate } from './plan';
import type { DayLog, L, MeasureEntry, PhotoMeta, Plan, Profile, Session, WeightEntry } from './types';

export type DayState = 'done' | 'planned' | 'missed' | 'rest' | 'today';

export function dayState(plan: Plan | null, history: Session[], date: string, now = today()): DayState {
  if (history.some((s) => s.date === date)) return 'done';
  const id = plan ? workoutIdForDate(plan, date) : null;
  if (!id || id === 'recovery') return 'rest';
  if (date === now) return 'today';
  return date < now ? 'missed' : 'planned';
}

/** Серия: сколько запланированных тренировок выполнено подряд без пропуска. */
export function streak(plan: Plan | null, history: Session[], now = today()): number {
  if (!history.length) return 0;
  const first = history[0].date;
  let n = 0;
  for (let d = now; d >= first; d = addDays(d, -1)) {
    const st = dayState(plan, history, d, now);
    if (st === 'done') n++;
    else if (st === 'missed') break;
  }
  return n;
}

export interface PeriodStats { workouts: number; minutes: number; kcal: number; tonnage: number }
export function periodStats(history: Session[], from: string, to: string): PeriodStats {
  const out: PeriodStats = { workouts: 0, minutes: 0, kcal: 0, tonnage: 0 };
  for (const s of history) {
    if (s.date < from || s.date > to) continue;
    out.workouts++;
    out.minutes += Math.round(s.durationSec / 60);
    out.kcal += s.kcal;
    out.tonnage += tonnage(s);
  }
  return out;
}

export function weekPlanCount(plan: Plan | null, date = today()): number {
  if (!plan) return 0;
  return weekDates(date).filter((d) => { const id = workoutIdForDate(plan, d); return id && id !== 'recovery'; }).length;
}

/** прогресс к целевому весу 0..1 */
export function goalProgress(startKg: number, currentKg: number, targetKg: number): number {
  const total = Math.abs(startKg - targetKg);
  if (total < 0.05) return 1;
  const done = (startKg - currentKg) * Math.sign(startKg - targetKg);
  return Math.max(0, Math.min(1, done / total));
}

export interface Achievement { id: string; icon: string; title: L; desc: L; progress: number; value?: string }

export interface AchievementInput {
  profile: Profile; plan: Plan | null; history: Session[]; weights: WeightEntry[]; measures: MeasureEntry[];
  photos: PhotoMeta[]; days: Record<string, DayLog>; waterTarget: number;
}

export function achievements(a: AchievementInput): Achievement[] {
  const n = a.history.length;
  const kcal = a.history.reduce((x, s) => x + s.kcal, 0);
  const st = streak(a.plan, a.history);
  const startKg = a.weights[0]?.kg ?? a.profile.weightKg;
  const gp = goalProgress(startKg, a.profile.weightKg, a.profile.targetKg);
  const hasGoal = Math.abs(startKg - a.profile.targetKg) >= 0.5;
  const waterDays = Object.values(a.days).filter((d) => d.waterMl >= a.waterTarget).length;
  const cap = (v: number, max: number) => Math.max(0, Math.min(1, v / max));
  const L = (ru: string, pl: string) => ({ ru, pl });
  return [
    { id: 'first', icon: 'sparkles', title: L('Первый шаг', 'Pierwszy krok'), desc: L('Заверши первую тренировку', 'Ukończ pierwszy trening'), progress: cap(n, 1) },
    { id: 'streak3', icon: 'flame', title: L('3 подряд', '3 z rzędu'), desc: L('Три тренировки без пропусков', 'Trzy treningi bez opuszczenia'), progress: cap(st, 3) },
    { id: 'w10', icon: 'dumbbell', title: L('10 тренировок', '10 treningów'), desc: L('Заверши 10 тренировок', 'Ukończ 10 treningów'), progress: cap(n, 10) },
    { id: 'w25', icon: 'trophy', title: L('25 тренировок', '25 treningów'), desc: L('Заверши 25 тренировок', 'Ukończ 25 treningów'), progress: cap(n, 25) },
    { id: 'kcal1000', icon: 'zap', title: L('1000 ккал', '1000 kcal'), desc: L('Сожги 1000 ккал на тренировках', 'Spal 1000 kcal na treningach'), progress: cap(kcal, 1000) },
    { id: 'kcal5000', icon: 'zap', title: L('5000 ккал', '5000 kcal'), desc: L('Сожги 5000 ккал на тренировках', 'Spal 5000 kcal na treningach'), progress: cap(kcal, 5000) },
    { id: 'streak7', icon: 'calendar', title: L('Неделя в ритме', 'Tydzień w rytmie'), desc: L('7 тренировок подряд без пропусков', '7 treningów z rzędu bez opuszczenia'), progress: cap(st, 7) },
    { id: 'weigh5', icon: 'scale', title: L('Под контролем', 'Pod kontrolą'), desc: L('Запиши вес 5 раз', 'Zapisz wagę 5 razy'), progress: cap(a.weights.length, 5) },
    { id: 'water3', icon: 'droplet', title: L('Водный баланс', 'Nawodnienie'), desc: L('Выполни норму воды 3 дня', 'Wypij dzienną normę wody przez 3 dni'), progress: cap(waterDays, 3) },
    { id: 'half', icon: 'target', title: L('Полпути', 'Połowa drogi'), desc: L('Пройди половину пути к цели', 'Pokonaj połowę drogi do celu'), progress: hasGoal ? cap(gp, 0.5) : 0 },
    { id: 'goal', icon: 'crown', title: L('Цель достигнута', 'Cel osiągnięty'), desc: L('Достигни целевого веса', 'Osiągnij wagę docelową'), progress: hasGoal ? gp : 0 },
    { id: 'photo', icon: 'camera', title: L('Дневник', 'Dziennik'), desc: L('Добавь первое фото прогресса', 'Dodaj pierwsze zdjęcie postępów'), progress: cap(a.photos.length, 1) },
  ];
}

export const daysSince = (date: string) => diffDays(today(), date);
