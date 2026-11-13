import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';
import { EX_BY_ID } from '../data/exercises';
import { FOOD_BY_ID } from '../data/foods';
import { today } from '../domain/dates';
import { emptyDay } from '../domain/nutrition';
import { buildSessionExercise, createSession, generatePlan, prescription, sessionKcal } from '../domain/plan';
import type {
  DayLog, Food, L, MealKey, MeasureEntry, PhotoMeta, Plan, PlanItem, Profile, Session, SetLog, Settings, WeightEntry,
  WorkoutTemplate,
} from '../domain/types';
import { LocalAdapter } from '../storage/adapter';

export const STORAGE_KEY = 'wf-data-v1';

export const DEFAULT_SETTINGS: Settings = {
  lang: 'ru', theme: 'auto', unit: 'kg', restSec: 60, sound: true, vibration: true,
  reminders: false, reminderTime: '18:00', hidePhotos: true, motivation: true,
};

interface Data {
  profile: Profile | null;
  settings: Settings;
  plan: Plan | null;
  history: Session[];
  /** незавершённая тренировка — переживает закрытие приложения */
  active: Session | null;
  favorites: string[];
  days: Record<string, DayLog>;
  customFoods: Food[];
  weights: WeightEntry[];
  measures: MeasureEntry[];
  photos: PhotoMeta[];
}

interface Actions {
  completeOnboarding(p: Profile): void;
  updateProfile(patch: Partial<Profile>, regenerate?: boolean): void;
  regeneratePlan(): void;
  setWeekDay(day: number, workoutId: string | null): void;
  moveWorkout(from: string, to: string): void;
  setOverride(date: string, workoutId: string | null | undefined): void;
  saveWorkout(w: { id?: string; name: string; items: PlanItem[] }): string;
  deleteWorkout(id: string): void;

  startWorkout(workoutId: string, date: string): boolean;
  patchSet(ex: number, set: number, patch: Partial<SetLog>): void;
  addSet(ex: number): void;
  removeSet(ex: number, set: number): void;
  replaceExercise(ex: number, newId: string): void;
  setIndex(i: number): void;
  tick(sec: number): void;
  finishWorkout(): Session | null;
  discardWorkout(): void;
  deleteSession(id: string): void;

  toggleFavorite(id: string): void;

  addFood(date: string, meal: MealKey, foodId: string, grams: number): void;
  updateFood(date: string, meal: MealKey, entryId: string, grams: number): void;
  removeFood(date: string, meal: MealKey, entryId: string): void;
  addWater(date: string, ml: number): void;
  addCustomFood(f: Omit<Food, 'id' | 'custom'>): string;

  addWeight(date: string, kg: number): void;
  removeWeight(date: string): void;
  addMeasure(date: string, values: MeasureEntry['values']): void;
  removeMeasure(date: string): void;
  addPhotoMeta(p: PhotoMeta): void;
  removePhotoMeta(id: string): void;

  setSettings(patch: Partial<Settings>): void;
  exportData(): string;
  importData(json: string): boolean;
  resetAll(): void;
}

export type Store = Data & Actions;

const initial: Data = {
  profile: null, settings: DEFAULT_SETTINGS, plan: null, history: [], active: null, favorites: [],
  days: {}, customFoods: [], weights: [], measures: [], photos: [],
};

const uid = () => Math.random().toString(36).slice(2, 10);
const byDate = <T extends { date: string }>(a: T, b: T) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0);

function withDay(days: Record<string, DayLog>, date: string, fn: (d: DayLog) => DayLog): Record<string, DayLog> {
  return { ...days, [date]: fn(days[date] ?? emptyDay()) };
}

export const useStore = create<Store>()(
  persist(
    (set, get) => ({
      ...initial,

      completeOnboarding(p) {
        const date = today();
        set({ profile: p, plan: generatePlan(p, date), weights: [{ date, kg: p.weightKg }] });
      },
      updateProfile(patch, regenerate) {
        const cur = get().profile;
        if (!cur) return;
        const profile = { ...cur, ...patch };
        set({ profile });
        if (regenerate) get().regeneratePlan();
      },
      regeneratePlan() {
        const { profile, plan } = get();
        if (!profile) return;
        const fresh = generatePlan(profile, plan?.startDate ?? today());
        // пользовательские тренировки сохраняем
        const custom = Object.fromEntries(Object.entries(plan?.workouts ?? {}).filter(([, w]) => w.custom));
        set({ plan: { ...fresh, workouts: { ...fresh.workouts, ...custom } } });
      },
      setWeekDay(day, workoutId) {
        const plan = get().plan;
        if (!plan) return;
        const week = [...plan.week];
        week[day] = workoutId;
        set({ plan: { ...plan, week } });
      },
      moveWorkout(from, to) {
        const plan = get().plan;
        if (!plan || from === to) return;
        const id = from in plan.overrides ? plan.overrides[from] : plan.week[(new Date(from + 'T12:00').getDay() + 6) % 7];
        if (!id) return;
        set({ plan: { ...plan, overrides: { ...plan.overrides, [from]: null, [to]: id } } });
      },
      setOverride(date, workoutId) {
        const plan = get().plan;
        if (!plan) return;
        const overrides = { ...plan.overrides };
        if (workoutId === undefined) delete overrides[date]; else overrides[date] = workoutId;
        set({ plan: { ...plan, overrides } });
      },
      saveWorkout(w) {
        const { plan, profile } = get();
        if (!plan) return '';
        const id = w.id ?? `c_${uid()}`;
        const prev = plan.workouts[id];
        const name: L = prev && !prev.custom ? prev.name : { ru: w.name, pl: w.name };
        const tpl: WorkoutTemplate = {
          id, type: prev?.type ?? 'custom', name: w.name && (!prev || prev.custom) ? { ru: w.name, pl: w.name } : name,
          items: w.items, custom: prev ? prev.custom : true,
        };
        void profile;
        set({ plan: { ...plan, workouts: { ...plan.workouts, [id]: tpl } } });
        return id;
      },
      deleteWorkout(id) {
        const plan = get().plan;
        if (!plan || !plan.workouts[id]?.custom) return;
        const workouts = { ...plan.workouts };
        delete workouts[id];
        const overrides = Object.fromEntries(Object.entries(plan.overrides).filter(([, v]) => v !== id));
        set({ plan: { ...plan, workouts, week: plan.week.map((x) => (x === id ? null : x)), overrides } });
      },

      startWorkout(workoutId, date) {
        const { plan, history, profile } = get();
        const tpl = plan?.workouts[workoutId];
        if (!tpl || !profile || !tpl.items.length) return false;
        set({ active: createSession(tpl, date, history, profile.level, Date.now()) });
        return true;
      },
      patchSet(ex, si, patch) {
        const a = get().active;
        if (!a) return;
        const exercises = a.exercises.map((e, i) => i !== ex ? e : { ...e, sets: e.sets.map((s, j) => (j === si ? { ...s, ...patch } : s)) });
        set({ active: { ...a, exercises } });
      },
      addSet(ex) {
        const a = get().active;
        if (!a) return;
        const exercises = a.exercises.map((e, i) => {
          if (i !== ex) return e;
          const last = e.sets[e.sets.length - 1];
          return { ...e, sets: [...e.sets, { weight: last?.weight ?? 0, reps: last?.reps ?? 10, done: false }] };
        });
        set({ active: { ...a, exercises } });
      },
      removeSet(ex, si) {
        const a = get().active;
        if (!a) return;
        const exercises = a.exercises.map((e, i) => (i !== ex || e.sets.length <= 1 ? e : { ...e, sets: e.sets.filter((_, j) => j !== si) }));
        set({ active: { ...a, exercises } });
      },
      replaceExercise(ex, newId) {
        const { active: a, history, profile } = get();
        const cur = a?.exercises[ex];
        if (!a || !cur || !profile || !EX_BY_ID[newId]) return;
        const p = prescription(EX_BY_ID[newId], profile.goal, profile.level);
        const fresh = buildSessionExercise({ exerciseId: newId, ...p, sets: cur.sets.length || p.sets }, history, profile.level);
        const exercises = a.exercises.map((e, i) => (i === ex ? { ...fresh, replacedFrom: cur.replacedFrom ?? cur.exerciseId } : e));
        set({ active: { ...a, exercises } });
      },
      setIndex(i) {
        const a = get().active;
        if (a) set({ active: { ...a, index: Math.max(0, Math.min(a.exercises.length - 1, i)) } });
      },
      tick(sec) {
        const a = get().active;
        if (a) set({ active: { ...a, durationSec: a.durationSec + sec } });
      },
      finishWorkout() {
        const { active: a, profile, history } = get();
        if (!a) return null;
        const done: Session = { ...a, finishedAt: Date.now(), kcal: sessionKcal(a, profile?.weightKg ?? 60) };
        // история только пополняется: прошлые тренировки не перезаписываются
        set({ history: [...history, done].sort(byDate), active: null });
        return done;
      },
      discardWorkout() { set({ active: null }); },
      deleteSession(id) { set({ history: get().history.filter((s) => s.id !== id) }); },

      toggleFavorite(id) {
        const f = get().favorites;
        set({ favorites: f.includes(id) ? f.filter((x) => x !== id) : [...f, id] });
      },

      addFood(date, meal, foodId, grams) {
        set({ days: withDay(get().days, date, (d) => ({ ...d, meals: { ...d.meals, [meal]: [...d.meals[meal], { id: uid(), foodId, grams }] } })) });
      },
      updateFood(date, meal, entryId, grams) {
        set({ days: withDay(get().days, date, (d) => ({ ...d, meals: { ...d.meals, [meal]: d.meals[meal].map((e) => (e.id === entryId ? { ...e, grams } : e)) } })) });
      },
      removeFood(date, meal, entryId) {
        set({ days: withDay(get().days, date, (d) => ({ ...d, meals: { ...d.meals, [meal]: d.meals[meal].filter((e) => e.id !== entryId) } })) });
      },
      addWater(date, ml) {
        set({ days: withDay(get().days, date, (d) => ({ ...d, waterMl: Math.max(0, d.waterMl + ml) })) });
      },
      addCustomFood(f) {
        const id = `cf_${uid()}`;
        set({ customFoods: [...get().customFoods, { ...f, id, custom: true }] });
        return id;
      },

      addWeight(date, kg) {
        const weights = [...get().weights.filter((w) => w.date !== date), { date, kg }].sort(byDate);
        const profile = get().profile;
        set({ weights, profile: profile ? { ...profile, weightKg: weights[weights.length - 1].kg } : profile });
      },
      removeWeight(date) {
        const weights = get().weights.filter((w) => w.date !== date);
        if (!weights.length) return;
        const profile = get().profile;
        set({ weights, profile: profile ? { ...profile, weightKg: weights[weights.length - 1].kg } : profile });
      },
      addMeasure(date, values) {
        const prev = get().measures.find((m) => m.date === date);
        const entry = { date, values: { ...prev?.values, ...values } };
        set({ measures: [...get().measures.filter((m) => m.date !== date), entry].sort(byDate) });
      },
      removeMeasure(date) { set({ measures: get().measures.filter((m) => m.date !== date) }); },
      addPhotoMeta(p) { set({ photos: [...get().photos, p].sort(byDate) }); },
      removePhotoMeta(id) { set({ photos: get().photos.filter((p) => p.id !== id) }); },

      setSettings(patch) { set({ settings: { ...get().settings, ...patch } }); },
      exportData() {
        const s = get();
        const data: Data = {
          profile: s.profile, settings: s.settings, plan: s.plan, history: s.history, active: s.active,
          favorites: s.favorites, days: s.days, customFoods: s.customFoods, weights: s.weights,
          measures: s.measures, photos: [],
        };
        return JSON.stringify({ app: 'womens-fitness', version: 1, exportedAt: new Date().toISOString(), data }, null, 2);
      },
      importData(json) {
        try {
          const parsed = JSON.parse(json);
          const d = parsed?.data as Partial<Data> | undefined;
          if (parsed?.app !== 'womens-fitness' || !d || typeof d !== 'object') return false;
          set({ ...initial, ...d, settings: { ...DEFAULT_SETTINGS, ...d.settings }, photos: get().photos });
          return true;
        } catch { return false; }
      },
      resetAll() { set({ ...initial, settings: { ...DEFAULT_SETTINGS, lang: get().settings.lang } }); },
    }),
    {
      name: STORAGE_KEY,
      version: 1,
      storage: createJSONStorage(() => LocalAdapter),
      partialize: (s) => {
        const { profile, settings, plan, history, active, favorites, days, customFoods, weights, measures, photos } = s;
        return { profile, settings, plan, history, active, favorites, days, customFoods, weights, measures, photos };
      },
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<Data>;
        return { ...current, ...p, settings: { ...DEFAULT_SETTINGS, ...p.settings } };
      },
    },
  ),
);

/** поиск продукта: встроенная база + свои */
export const useFoodFinder = () => {
  const custom = useStore((s) => s.customFoods);
  return (id: string): Food | undefined => FOOD_BY_ID[id] ?? custom.find((f) => f.id === id);
};
