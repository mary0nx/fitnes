import { describe, expect, it } from 'vitest';
import { EXERCISES, EX_BY_ID } from '../data/exercises';
import { FOODS } from '../data/foods';
import { ANIMS } from '../three/anims';
import { pluralIndex, translate } from '../i18n';
import { ru } from '../i18n/ru';
import { pl } from '../i18n/pl';
import { addDays, monthGrid, startOfWeek, weekday } from './dates';
import { bmr, minHealthyKg, targets, weeksToGoal } from './nutrition';
import { createSession, estimateMinutes, generatePlan, isAvailable, lastSets, workoutForDate } from './plan';
import { goalProgress, streak } from './stats';
import type { Goal, Level, Place, Profile, Session } from './types';

const base: Profile = {
  name: 'Тест', goal: 'lose', age: 25, heightCm: 168, weightKg: 58, targetKg: 54, level: 1, place: 'gym',
  days: [1, 2, 3, 5], limitations: [], createdAt: '2026-01-01',
};

describe('каталог упражнений', () => {
  it('у каждого упражнения есть своя анимация, тексты на двух языках и валидные альтернативы', () => {
    expect(EXERCISES.length).toBeGreaterThanOrEqual(33);
    const anims = new Set<string>();
    for (const e of EXERCISES) {
      expect(ANIMS[e.anim], e.id).toBeTruthy();
      expect(anims.has(e.anim), `анимация ${e.anim} не повторяется`).toBe(false);
      anims.add(e.anim);
      expect(e.name.ru && e.name.pl).toBeTruthy();
      expect(e.technique.length).toBeGreaterThanOrEqual(3);
      expect(e.mistakes.length).toBeGreaterThanOrEqual(3);
      for (const l of [...e.technique, ...e.mistakes]) expect(l.ru && l.pl).toBeTruthy();
      expect(e.primary.length).toBeGreaterThan(0);
      expect(e.alternatives.length).toBeGreaterThan(0);
      for (const a of e.alternatives) expect(EX_BY_ID[a], `${e.id} → ${a}`).toBeTruthy();
      if (e.kind === 'strength') expect(e.startKg, e.id).toBeTruthy();
    }
  });
  it('анимации дают конечные значения поз на всём цикле', () => {
    for (const [id, a] of Object.entries(ANIMS)) {
      for (let i = 0; i <= 8; i++) {
        const pose = a.pose(i / 8) as Record<string, number[]>;
        for (const k in pose) for (const v of pose[k]) expect(Number.isFinite(v), `${id}.${k}`).toBe(true);
      }
    }
  });
});

describe('генерация плана', () => {
  const goals: Goal[] = ['lose', 'tone', 'gain', 'maintain'];
  const places: Place[] = ['home', 'gym', 'outdoor'];
  it('для любых анкет даёт непустые тренировки только из доступных упражнений', () => {
    for (const goal of goals) for (const place of places) for (const level of [1, 2, 3] as Level[]) for (const n of [2, 3, 4, 5, 6]) {
      const p: Profile = { ...base, goal, place, level, days: [0, 1, 2, 3, 4, 5, 6].slice(0, n), limitations: ['knees', 'back'] };
      const plan = generatePlan(p, '2026-01-05');
      expect(plan.week.filter((x) => x && x !== 'recovery').length).toBe(n === 6 ? 5 : n);
      for (const w of Object.values(plan.workouts)) {
        expect(w.items.length, `${goal}/${place}/${level}/${n}/${w.id}`).toBeGreaterThanOrEqual(3);
        for (const it of w.items) {
          const e = EX_BY_ID[it.exerciseId];
          expect(e.places.includes(place), `${w.id}:${e.id} недоступно: ${place}`).toBe(true);
          expect(e.avoid?.some((l) => p.limitations.includes(l)) ?? false, `${e.id} при ограничениях`).toBe(false);
          expect(it.sets).toBeGreaterThan(0);
          expect(it.reps).toBeGreaterThan(0);
        }
        expect(estimateMinutes(w.items)).toBeGreaterThan(5);
      }
    }
  });
  it('учитывает расписание и разовые переносы', () => {
    const plan = generatePlan(base, '2026-01-05');
    expect(workoutForDate(plan, '2026-01-06')?.id).toBe('legs'); // вторник
    expect(workoutForDate(plan, '2026-01-05')).toBeNull(); // понедельник
    plan.overrides['2026-01-05'] = 'legs';
    plan.overrides['2026-01-06'] = null;
    expect(workoutForDate(plan, '2026-01-05')?.id).toBe('legs');
    expect(workoutForDate(plan, '2026-01-06')).toBeNull();
  });
  it('новичку не даёт продвинутые упражнения', () => {
    expect(EXERCISES.filter((e) => e.level === 3).every((e) => !isAvailable(e, base))).toBe(true);
  });
});

describe('сессия и история', () => {
  it('подставляет прошлый рабочий вес и не трогает историю', () => {
    const plan = generatePlan(base, '2026-01-05');
    const s1 = createSession(plan.workouts.legs, '2026-01-06', [], 1, 1);
    const squat = s1.exercises.find((x) => EX_BY_ID[x.exerciseId].kind === 'strength')!;
    expect(squat.sets[0].weight).toBe(EX_BY_ID[squat.exerciseId].startKg![0]);
    const done: Session = { ...s1, exercises: s1.exercises.map((x) => (x === squat ? { ...x, sets: x.sets.map((st) => ({ ...st, weight: 32.5, reps: 9, done: true })) } : x)) };
    const snapshot = JSON.stringify(done);
    const s2 = createSession(plan.workouts.legs, '2026-01-13', [done], 1, 2);
    const again = s2.exercises.find((x) => x.exerciseId === squat.exerciseId)!;
    expect(again.sets[0]).toEqual({ weight: 32.5, reps: 9, done: false });
    expect(lastSets([done], squat.exerciseId)?.length).toBe(squat.sets.length);
    expect(JSON.stringify(done)).toBe(snapshot);
  });
  it('серия считает выполненные подряд и рвётся на пропуске', () => {
    const plan = generatePlan(base, '2026-01-05');
    const mk = (date: string): Session => ({ ...createSession(plan.workouts.legs, date, [], 1, 1), id: date });
    expect(streak(plan, [mk('2026-01-06'), mk('2026-01-07'), mk('2026-01-08')], '2026-01-09')).toBe(3);
    expect(streak(plan, [mk('2026-01-06'), mk('2026-01-08')], '2026-01-09')).toBe(1); // 07.01 пропущена
  });
});

describe('питание и безопасность', () => {
  it('не опускает калории ниже базового обмена и 1200 ккал', () => {
    for (const weightKg of [42, 50, 58, 70, 95]) for (const age of [16, 25, 45, 65]) {
      const p = { ...base, weightKg, age };
      const t = targets(p);
      expect(t.kcal).toBeGreaterThanOrEqual(1200);
      expect(t.kcal).toBeGreaterThanOrEqual(Math.floor(bmr(p) / 10) * 10);
      expect(t.p * 4 + t.f * 9 + t.c * 4).toBeGreaterThan(t.kcal * 0.9);
    }
  });
  it('до 18 лет и при низком ИМТ дефицит не назначается', () => {
    const adult = targets({ ...base, goal: 'maintain' }).kcal;
    expect(targets({ ...base, age: 16, goal: 'maintain' }).kcal).toBe(targets({ ...base, age: 16 }).kcal);
    expect(targets({ ...base, age: 16 }).note).toBe('minor');
    expect(targets({ ...base, weightKg: 50 }).note).toBe('floor');
    expect(targets(base).kcal).toBeLessThan(adult);
  });
  it('здоровая граница веса и безопасный темп', () => {
    expect(minHealthyKg(168)).toBeCloseTo(52.3, 1);
    expect(weeksToGoal({ weightKg: 58, targetKg: 54, goal: 'lose' })).toBeGreaterThanOrEqual(8);
    expect(weeksToGoal({ weightKg: 58, targetKg: 58, goal: 'maintain' })).toBeNull();
    expect(goalProgress(60, 58, 56)).toBeCloseTo(0.5);
    expect(goalProgress(60, 61, 56)).toBe(0);
  });
  it('база продуктов корректна', () => {
    expect(FOODS.length).toBeGreaterThan(50);
    for (const f of FOODS) {
      expect(f.name.ru && f.name.pl).toBeTruthy();
      const calc = f.p * 4 + f.f * 9 + f.c * 4;
      expect(Math.abs(calc - f.kcal) / Math.max(40, f.kcal), f.id).toBeLessThan(0.3);
    }
  });
});

describe('даты и локализация', () => {
  it('неделя начинается с понедельника', () => {
    expect(weekday('2026-11-09')).toBe(0);
    expect(startOfWeek('2026-11-13')).toBe('2026-11-09');
    expect(addDays('2026-12-31', 1)).toBe('2027-01-01');
    const grid = monthGrid('2026-11-13');
    expect(grid.length % 7).toBe(0);
    expect(weekday(grid[0])).toBe(0);
  });
  it('словари совпадают по ключам и формам числа', () => {
    expect(Object.keys(pl).sort()).toEqual(Object.keys(ru).sort());
    for (const k of Object.keys(ru) as (keyof typeof ru)[]) {
      expect(pl[k].length, k).toBeGreaterThan(0);
      expect(pl[k].split('|').length, k).toBe(ru[k].split('|').length);
      expect((pl[k].match(/\{\w+\}/g) ?? []).sort().filter((v, i, a) => a.indexOf(v) === i), k).toEqual((ru[k].match(/\{\w+\}/g) ?? []).sort().filter((v, i, a) => a.indexOf(v) === i));
    }
  });
  it('склонения', () => {
    expect([1, 2, 5, 11, 21, 22, 25].map((n) => pluralIndex('ru', n))).toEqual([0, 1, 2, 2, 0, 1, 2]);
    expect([1, 2, 5, 12, 22, 25].map((n) => pluralIndex('pl', n))).toEqual([0, 1, 2, 2, 1, 2]);
    expect(translate('ru', 'common.exercises', { n: 6 })).toBe('6 упражнений');
    expect(translate('pl', 'common.exercises', { n: 3 })).toBe('3 ćwiczenia');
  });
});
