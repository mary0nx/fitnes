/** Доменные типы приложения. Всё, что хранится, описано здесь. */

export type Lang = 'ru' | 'pl';
/** Локализованная строка */
export type L = Record<Lang, string>;

export type Goal = 'lose' | 'tone' | 'gain' | 'maintain';
export type Level = 1 | 2 | 3;
export type Place = 'home' | 'gym' | 'outdoor';
export type Limitation = 'knees' | 'back' | 'shoulders';
export type WeightUnit = 'kg' | 'lb';
export type Theme = 'light' | 'dark' | 'auto';

export type Category = 'legs' | 'abs' | 'arms' | 'back' | 'chest' | 'cardio';
export type Muscle =
  | 'glutes' | 'quads' | 'hamstrings' | 'calves' | 'adductors' | 'abs' | 'obliques' | 'lowerBack'
  | 'lats' | 'traps' | 'chest' | 'shoulders' | 'biceps' | 'triceps' | 'forearms' | 'heart';
export type Equipment = 'none' | 'mat' | 'dumbbells' | 'barbell' | 'bench' | 'machine' | 'cable' | 'cardio';
/** strength — вес и повторы; bodyweight — только повторы; time — удержание/растяжка (сек); cardio — минуты */
export type ExerciseKind = 'strength' | 'bodyweight' | 'time' | 'cardio';

export interface Exercise {
  id: string;
  name: L;
  category: Category;
  primary: Muscle[];
  secondary: Muscle[];
  equipment: Equipment[];
  places: Place[];
  level: Level;
  kind: ExerciseKind;
  /** инструкция / техника выполнения */
  technique: L[];
  mistakes: L[];
  alternatives: string[];
  /** id 3D-анимации (src/three/anims.ts) */
  anim: string;
  /** MET для оценки расхода калорий */
  met: number;
  /** при каких ограничениях упражнение исключается из плана */
  avoid?: Limitation[];
  /** стартовый вес по уровням, кг */
  startKg?: [number, number, number];
}

export interface Profile {
  name: string;
  goal: Goal;
  age: number;
  heightCm: number;
  weightKg: number;
  targetKg: number;
  level: Level;
  place: Place;
  /** дни недели с тренировками: 0 — понедельник … 6 — воскресенье */
  days: number[];
  limitations: Limitation[];
  createdAt: string;
  avatar?: string;
}

export interface PlanItem {
  exerciseId: string;
  sets: number;
  /** повторы, либо секунды (time), либо минуты (cardio) */
  reps: number;
  restSec: number;
}

export type WorkoutType = 'legs' | 'upper' | 'full' | 'cardio' | 'glutes' | 'recovery' | 'custom';

export interface WorkoutTemplate {
  id: string;
  type: WorkoutType;
  name: L;
  items: PlanItem[];
  custom?: boolean;
}

export interface Plan {
  startDate: string;
  weeks: number;
  workouts: Record<string, WorkoutTemplate>;
  /** расписание по дням недели: 0..6 → id тренировки или null (отдых) */
  week: (string | null)[];
  /** разовые изменения: дата → id тренировки или null (перенос/отмена) */
  overrides: Record<string, string | null>;
}

export interface SetLog {
  weight: number;
  /** повторы / секунды / минуты — по типу упражнения */
  reps: number;
  done: boolean;
}

export interface SessionExercise {
  exerciseId: string;
  /** если упражнение заменили — исходное */
  replacedFrom?: string;
  restSec: number;
  sets: SetLog[];
}

export interface Session {
  id: string;
  workoutId: string;
  name: L;
  type: WorkoutType;
  date: string;
  startedAt: number;
  finishedAt?: number;
  /** чистое время тренировки, сек */
  durationSec: number;
  kcal: number;
  exercises: SessionExercise[];
  /** текущее упражнение (для восстановления незавершённой тренировки) */
  index: number;
}

export interface Food {
  id: string;
  name: L;
  /** на 100 г */
  kcal: number;
  p: number;
  f: number;
  c: number;
  /** стандартная порция, г */
  portion: number;
  custom?: boolean;
}

export type MealKey = 'breakfast' | 'lunch' | 'dinner' | 'snack';
export interface FoodEntry { id: string; foodId: string; grams: number }
export interface DayLog {
  meals: Record<MealKey, FoodEntry[]>;
  waterMl: number;
}

export interface WeightEntry { date: string; kg: number }
export type MeasureKey = 'waist' | 'hips' | 'chest' | 'arms' | 'legs';
export interface MeasureEntry { date: string; values: Partial<Record<MeasureKey, number>> }
export interface PhotoMeta { id: string; date: string; note?: string }

export interface Settings {
  lang: Lang;
  theme: Theme;
  unit: WeightUnit;
  restSec: number;
  sound: boolean;
  vibration: boolean;
  reminders: boolean;
  reminderTime: string;
  /** скрывать фото-дневник размытием до нажатия */
  hidePhotos: boolean;
  motivation: boolean;
}
