import { EX_BY_ID, EXERCISES } from '../data/exercises';
import { addDays, diffDays, weekday } from './dates';
import type {
  Exercise, Goal, L, Level, Plan, PlanItem, Profile, Session, SessionExercise, SetLog, WorkoutTemplate, WorkoutType,
} from './types';

export const WORKOUT_NAMES: Record<WorkoutType, L> = {
  legs: { ru: 'Ноги и ягодицы', pl: 'Nogi i pośladki' },
  upper: { ru: 'Верх тела', pl: 'Góra ciała' },
  full: { ru: 'Всё тело', pl: 'Całe ciało' },
  cardio: { ru: 'Кардио и пресс', pl: 'Kardio i brzuch' },
  glutes: { ru: 'Ягодицы и пресс', pl: 'Pośladki i brzuch' },
  recovery: { ru: 'Восстановление', pl: 'Regeneracja' },
  custom: { ru: 'Моя тренировка', pl: 'Mój trening' },
};

/** обложка тренировки — миниатюра «главного» упражнения */
export const COVER: Record<WorkoutType, string> = {
  legs: 'barbell_squat', upper: 'shoulder_press', full: 'goblet_squat', cardio: 'running',
  glutes: 'glute_bridge', recovery: 'stretch_forward', custom: 'biceps_curl',
};

/** Слоты: в каждом — кандидаты по приоритету; берётся первый доступный. */
const SLOTS: Record<Exclude<WorkoutType, 'custom' | 'recovery' | 'cardio'>, string[][]> = {
  legs: [
    ['barbell_squat', 'goblet_squat', 'squat_bw'],
    ['leg_press', 'hack_squat', 'lunge', 'squat_bw'],
    ['romanian_deadlift', 'glute_bridge'],
    ['bulgarian_split', 'lunge', 'glute_bridge'],
    ['kickback', 'glute_bridge', 'reverse_crunch'],
    ['leg_curl', 'leg_extension', 'plank', 'crunch'],
  ],
  upper: [
    ['lat_pulldown', 'dumbbell_row', 'pushup'],
    ['dumbbell_bench_press', 'chest_press_machine', 'pushup', 'plank'],
    ['shoulder_press', 'lateral_raise', 'crunch'],
    ['seated_row', 'dumbbell_row', 'hyperextension', 'bicycle'],
    ['biceps_curl', 'lateral_raise', 'reverse_crunch'],
    ['triceps_extension', 'front_raise', 'leg_raise', 'plank'],
  ],
  full: [
    ['goblet_squat', 'leg_press', 'squat_bw'],
    ['romanian_deadlift', 'glute_bridge'],
    ['dumbbell_row', 'lat_pulldown', 'pushup', 'lunge'],
    ['pushup', 'chest_press_machine', 'dumbbell_bench_press', 'plank'],
    ['lateral_raise', 'shoulder_press', 'lunge', 'crunch'],
    ['plank', 'crunch', 'bicycle'],
  ],
  glutes: [
    ['glute_bridge'],
    ['bulgarian_split', 'lunge', 'squat_bw'],
    ['romanian_deadlift', 'squat_bw', 'lunge'],
    ['kickback', 'hyperextension', 'squat_bw', 'reverse_crunch'],
    ['reverse_crunch', 'leg_raise', 'crunch'],
    ['plank', 'bicycle'],
  ],
};

const CORE = ['crunch', 'bicycle', 'plank', 'reverse_crunch', 'leg_raise'];

export function isAvailable(e: Exercise, p: Pick<Profile, 'place' | 'level' | 'limitations'>): boolean {
  if (!e.places.includes(p.place)) return false;
  if (e.level > Math.min(3, p.level + 1)) return false;
  if (e.avoid?.some((l) => p.limitations.includes(l))) return false;
  return true;
}

/** Подходы/повторы/отдых под цель и уровень. */
export function prescription(e: Exercise, goal: Goal, level: Level): Omit<PlanItem, 'exerciseId'> {
  if (e.kind === 'cardio') return { sets: 1, reps: [15, 20, 25][level - 1], restSec: 0 };
  if (e.kind === 'time') {
    return e.category === 'cardio'
      ? { sets: 2, reps: 40, restSec: 15 }
      : { sets: 3, reps: [30, 45, 60][level - 1], restSec: 40 };
  }
  const sets = goal === 'gain' && level > 1 ? 4 : level === 3 ? 4 : 3;
  if (e.kind === 'bodyweight') return { sets, reps: [12, 15, 20][level - 1], restSec: goal === 'lose' ? 40 : 50 };
  const reps = goal === 'lose' ? 15 : goal === 'gain' ? 10 : 12;
  const restSec = goal === 'lose' ? 45 : goal === 'gain' ? 90 : 60;
  return { sets, reps, restSec };
}

const item = (id: string, goal: Goal, level: Level, over: Partial<PlanItem> = {}): PlanItem =>
  ({ exerciseId: id, ...prescription(EX_BY_ID[id], goal, level), ...over });

function cardioPick(p: Profile): string {
  const order = p.place === 'gym' ? ['elliptical', 'bike', 'walking'] : p.place === 'outdoor' ? ['running', 'walking'] : ['walking'];
  return order.find((id) => isAvailable(EX_BY_ID[id], p)) ?? 'walking';
}

function buildWorkout(type: WorkoutType, p: Profile): WorkoutTemplate {
  const { goal, level } = p;
  const items: PlanItem[] = [];
  const used = new Set<string>();
  const take = (cands: string[]): string | null => {
    const id = cands.find((c) => !used.has(c) && isAvailable(EX_BY_ID[c], p));
    if (id) used.add(id);
    return id ?? null;
  };
  const warm = cardioPick({ ...p, limitations: [...p.limitations, 'knees'] }); // разминка всегда щадящая
  if (type === 'recovery') {
    items.push(item('walking', goal, level, { reps: 10 }));
    for (const id of ['stretch_side', 'stretch_forward', 'glute_bridge', 'plank']) {
      if (isAvailable(EX_BY_ID[id], p)) items.push(item(id, goal, level, id === 'glute_bridge' ? { sets: 2, reps: 12 } : id === 'plank' ? { sets: 2, reps: 30 } : {}));
    }
  } else if (type === 'cardio') {
    items.push(item(cardioPick(p), goal, level));
    const n = level + 2;
    for (const id of CORE) {
      if (items.length > n) break;
      if (isAvailable(EX_BY_ID[id], p)) items.push(item(id, goal, level));
    }
    items.push(item('stretch_forward', goal, level));
  } else if (type !== 'custom') {
    items.push(item(warm, goal, level, { reps: 5 }));
    const n = Math.min(6, level + 4); // 5 / 6 / 6 основных упражнений
    for (const slot of SLOTS[type].slice(0, n)) {
      const id = take(slot);
      if (id) items.push(item(id, goal, level));
    }
    // добор, если из-за ограничений/места слотов не хватило
    if (items.length < 5) {
      for (const e of EXERCISES) {
        if (items.length >= 5) break;
        if (e.kind !== 'cardio' && e.category !== 'cardio' && !used.has(e.id) && isAvailable(e, p)) {
          used.add(e.id);
          items.push(item(e.id, goal, level));
        }
      }
    }
    items.push(item(type === 'upper' ? 'stretch_side' : 'stretch_forward', goal, level));
  }
  return { id: type, type, name: WORKOUT_NAMES[type], items };
}

export const DEFAULT_DAYS: Record<number, number[]> = {
  2: [1, 4], 3: [0, 2, 4], 4: [1, 2, 3, 5], 5: [0, 1, 3, 4, 5], 6: [0, 1, 2, 3, 4, 5], 7: [0, 1, 2, 3, 4, 5, 6],
};

function split(n: number, goal: Goal): WorkoutType[] {
  switch (Math.max(1, Math.min(7, n))) {
    case 1: return ['full'];
    case 2: return ['full', 'legs'];
    case 3: return goal === 'lose' ? ['legs', 'cardio', 'full'] : ['legs', 'upper', 'full'];
    case 4: return goal === 'gain' ? ['legs', 'upper', 'glutes', 'full'] : ['legs', 'cardio', 'upper', 'full'];
    case 5: return ['legs', 'upper', 'cardio', 'glutes', 'full'];
    case 6: return ['legs', 'upper', 'cardio', 'glutes', 'full', 'recovery'];
    default: return ['legs', 'upper', 'cardio', 'glutes', 'full', 'recovery', 'recovery'];
  }
}

/** Персональный план по анкете. */
export function generatePlan(p: Profile, startDate: string): Plan {
  const days = [...p.days].sort((a, b) => a - b);
  const types = split(days.length, p.goal);
  const workouts: Record<string, WorkoutTemplate> = {};
  for (const t of new Set<WorkoutType>([...types, 'recovery'])) workouts[t] = buildWorkout(t, p);
  const week: (string | null)[] = Array(7).fill(null);
  days.forEach((d, i) => { week[d] = types[i]; });
  // лёгкий восстановительный день в воскресенье, если оно свободно
  if (days.length >= 4 && days.length < 6 && week[6] === null) week[6] = 'recovery';
  return { startDate, weeks: 8, workouts, week, overrides: {} };
}

export function workoutIdForDate(plan: Plan, date: string): string | null {
  if (date in plan.overrides) return plan.overrides[date];
  return plan.week[weekday(date)] ?? null;
}
export function workoutForDate(plan: Plan, date: string): WorkoutTemplate | null {
  const id = workoutIdForDate(plan, date);
  return id ? plan.workouts[id] ?? null : null;
}
export const programWeek = (plan: Plan, date: string) =>
  Math.max(1, Math.floor(diffDays(date, plan.startDate) / 7) + 1);

/** ближайшая (включая сегодня) дата с тренировкой */
export function nextWorkoutDate(plan: Plan, from: string, skip: (d: string) => boolean = () => false): string | null {
  for (let i = 0; i < 14; i++) {
    const d = addDays(from, i);
    if (workoutIdForDate(plan, d) && !skip(d)) return d;
  }
  return null;
}

/* ---------- оценки ---------- */

/** чистая длительность одного подхода, сек */
const setSeconds = (e: Exercise, reps: number) =>
  e.kind === 'cardio' ? reps * 60 : e.kind === 'time' ? reps : Math.max(35, reps * 3.5);

export function estimateMinutes(items: PlanItem[]): number {
  let s = 0;
  for (const it of items) {
    const e = EX_BY_ID[it.exerciseId];
    if (!e) continue;
    s += it.sets * setSeconds(e, it.reps) + Math.max(0, it.sets - 1) * it.restSec + 75; // + переход и подготовка снаряда
  }
  return Math.max(5, Math.round(s / 60 / 5) * 5);
}

export function estimateKcal(items: PlanItem[], weightKg: number): number {
  let kcal = 0;
  for (const it of items) {
    const e = EX_BY_ID[it.exerciseId];
    if (!e) continue;
    const active = it.sets * setSeconds(e, it.reps);
    const rest = Math.max(0, it.sets - 1) * it.restSec;
    kcal += (e.met * weightKg * active) / 3600 + (2.3 * weightKg * (rest + 75)) / 3600;
  }
  return Math.round(kcal / 10) * 10;
}

/** фактический расход по выполненным подходам */
export function sessionKcal(s: Session, weightKg: number): number {
  let kcal = 0;
  for (const ex of s.exercises) {
    const e = EX_BY_ID[ex.exerciseId];
    if (!e) continue;
    for (const set of ex.sets) {
      if (!set.done) continue;
      kcal += (e.met * weightKg * setSeconds(e, set.reps)) / 3600 + (2.3 * weightKg * ex.restSec) / 3600;
    }
  }
  return Math.round(kcal);
}

/* ---------- сессия ---------- */

/** подходы упражнения из последней завершённой тренировки */
export function lastSets(history: Session[], exerciseId: string): SetLog[] | null {
  for (let i = history.length - 1; i >= 0; i--) {
    const ex = history[i].exercises.find((x) => x.exerciseId === exerciseId && x.sets.some((s) => s.done));
    if (ex) return ex.sets.filter((s) => s.done);
  }
  return null;
}

export function buildSessionExercise(it: PlanItem, history: Session[], level: Level): SessionExercise {
  const e = EX_BY_ID[it.exerciseId];
  const prev = lastSets(history, it.exerciseId);
  const start = e.kind === 'strength' ? e.startKg?.[level - 1] ?? 0 : 0;
  const sets: SetLog[] = Array.from({ length: it.sets }, (_, i) => {
    const p = prev?.[Math.min(i, prev.length - 1)];
    return {
      weight: e.kind === 'strength' ? p?.weight ?? start : 0,
      reps: e.kind === 'strength' || e.kind === 'bodyweight' ? p?.reps ?? it.reps : it.reps,
      done: false,
    };
  });
  return { exerciseId: it.exerciseId, restSec: it.restSec, sets };
}

export function createSession(t: WorkoutTemplate, date: string, history: Session[], level: Level, now: number): Session {
  return {
    id: `s_${now.toString(36)}`,
    workoutId: t.id, name: t.name, type: t.type, date, startedAt: now, durationSec: 0, kcal: 0, index: 0,
    exercises: t.items.filter((it) => EX_BY_ID[it.exerciseId]).map((it) => buildSessionExercise(it, history, level)),
  };
}

/** суммарный поднятый вес, кг */
export const tonnage = (s: Session) =>
  s.exercises.reduce((a, ex) => a + ex.sets.reduce((b, st) => b + (st.done ? st.weight * st.reps : 0), 0), 0);

export const doneSets = (s: Session) => s.exercises.reduce((a, ex) => a + ex.sets.filter((x) => x.done).length, 0);
export const totalSets = (s: Session) => s.exercises.reduce((a, ex) => a + ex.sets.length, 0);
