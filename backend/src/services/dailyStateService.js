const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const DEFAULT_EXERCISES = [
  { id: 'ex-1', name: 'Aquecimento', durationMin: 5, completed: false, secondsDone: 0 },
  { id: 'ex-2', name: 'Treino principal', durationMin: 30, completed: false, secondsDone: 0 },
  { id: 'ex-3', name: 'Volta à calma', durationMin: 5, completed: false, secondsDone: 0 },
];

function toDateKey(d) {
  const x = new Date(d);
  const y = x.getFullYear();
  const m = String(x.getMonth() + 1).padStart(2, '0');
  const day = String(x.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function dayRangeFromDateKey(dateKey) {
  const [y, m, d] = dateKey.split('-').map(Number);
  const start = new Date(y, m - 1, d, 0, 0, 0, 0);
  const end = new Date(y, m - 1, d + 1, 0, 0, 0, 0);
  return { start, end };
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

async function upsertDailyCheck(userId, dateStart, type, data) {
  await prisma.dailyCheck.upsert({
    where: {
      userId_date_type: {
        userId,
        date: dateStart,
        type,
      },
    },
    update: data,
    create: {
      userId,
      date: dateStart,
      type,
      ...data,
    },
  });
}

function scoreAndCalendarStatus({
  mealsCompleted,
  mealsGoal,
  waterMl,
  waterGoalMl,
  workoutCompleted,
  sleepHours,
  caloriesConsumed,
  caloriesGoal,
}) {
  const mealPart = mealsGoal > 0 ? (mealsCompleted / mealsGoal) * 40 : 0;
  const waterPart = waterGoalMl > 0 ? clamp(waterMl / waterGoalMl, 0, 1) * 25 : 0;
  const workoutPart = workoutCompleted ? 20 : 0;
  const sleepPart = sleepHours != null && sleepHours > 0 ? 5 : 0;
  const calPart =
    caloriesGoal > 0 ? clamp(1 - Math.abs(caloriesConsumed - caloriesGoal) / caloriesGoal, 0, 1) * 10 : 0;
  const progressScore = Math.round(clamp(mealPart + waterPart + workoutPart + sleepPart + calPart, 0, 100));
  let calendarStatus = 'red';
  if (progressScore >= 75) calendarStatus = 'green';
  else if (progressScore >= 35) calendarStatus = 'yellow';
  return { progressScore, calendarStatus };
}

function buildChecklist({ mealsByType, workoutCompleted, waterMl, waterGoalMl, sleepHours }) {
  const mealTypes = ['breakfast', 'lunch', 'dinner'];
  const checklist = [];
  for (const mt of mealTypes) {
    const meal = mealsByType.get(mt);
    checklist.push({
      id: mt,
      kind: 'meal',
      mealType: mt,
      label:
        mt === 'breakfast' ? 'Café da Manhã' : mt === 'lunch' ? 'Almoço' : 'Jantar',
      done: Boolean(meal?.completed),
      mealId: meal?.id ?? null,
    });
  }
  checklist.push({
    id: 'workout',
    kind: 'workout',
    label: 'Treino concluído',
    done: workoutCompleted,
  });
  checklist.push({
    id: 'water',
    kind: 'water',
    label: 'Água',
    waterMl,
    waterGoalMl,
    litersProgress: waterGoalMl > 0 ? Math.min(waterMl / waterGoalMl, 1) : 0,
  });
  checklist.push({
    id: 'sleep',
    kind: 'sleep',
    label: 'Sono',
    hours: sleepHours ?? null,
  });
  return checklist;
}

async function loadMealsForDay(userId, dateKey) {
  const { start, end } = dayRangeFromDateKey(dateKey);
  return prisma.meal.findMany({
    where: { userId, date: { gte: start, lt: end } },
    include: { foodItems: true },
    orderBy: { mealType: 'asc' },
  });
}

async function loadWorkoutForDay(userId, dateKey) {
  const { start, end } = dayRangeFromDateKey(dateKey);
  const logs = await prisma.workoutLog.findMany({
    where: { userId, date: { gte: start, lt: end } },
    orderBy: { id: 'desc' },
    take: 1,
  });
  return logs[0] || null;
}

async function ensureWorkoutLog(userId, dateKey) {
  const existing = await loadWorkoutForDay(userId, dateKey);
  if (existing) return existing;
  const { start } = dayRangeFromDateKey(dateKey);
  return prisma.workoutLog.create({
    data: {
      userId,
      name: 'Treino do dia',
      duration: 0,
      exercises: JSON.stringify(DEFAULT_EXERCISES),
      completed: false,
      date: start,
    },
  });
}

async function rebuildDailyUserState(userId, dateKey) {
  const { start } = dayRangeFromDateKey(dateKey);
  const meals = await loadMealsForDay(userId, dateKey);
  const mealsByType = new Map(meals.map((m) => [m.mealType, m]));
  const caloriesConsumed = meals.reduce((s, m) => s + (m.totalCalories || 0), 0);

  const checks = await prisma.dailyCheck.findMany({
    where: {
      userId,
      date: {
        gte: start,
        lt: new Date(start.getFullYear(), start.getMonth(), start.getDate() + 1),
      },
    },
  });
  const checkMap = Object.fromEntries(checks.map((c) => [c.type, c]));

  let row = await prisma.dailyUserState.findUnique({
    where: { userId_dateKey: { userId, dateKey } },
  });

  if (!row) {
    const waterFromLegacy = checkMap.water?.value != null ? checkMap.water.value * 1000 : 0;
    row = await prisma.dailyUserState.create({
      data: {
        userId,
        dateKey,
        waterMl: waterFromLegacy,
        sleepHours: checkMap.sleep?.value != null ? Number(checkMap.sleep.value) : null,
        caloriesGoal: 2000,
        waterGoalMl: 2000,
        mealsGoal: 3,
      },
    });
  }

  row = await prisma.dailyUserState.findUnique({
    where: { userId_dateKey: { userId, dateKey } },
  });

  const workoutLog = await loadWorkoutForDay(userId, dateKey);
  let exercises = DEFAULT_EXERCISES;
  if (workoutLog?.exercises) {
    try {
      const parsed = JSON.parse(workoutLog.exercises);
      if (Array.isArray(parsed) && parsed.length) exercises = parsed;
    } catch {
      exercises = DEFAULT_EXERCISES;
    }
  }
  const workoutCompleted = Boolean(workoutLog?.completed);

  const mealsCompleted = ['breakfast', 'lunch', 'dinner'].filter((mt) => mealsByType.get(mt)?.completed).length;

  const { progressScore, calendarStatus } = scoreAndCalendarStatus({
    mealsCompleted,
    mealsGoal: row.mealsGoal,
    waterMl: row.waterMl,
    waterGoalMl: row.waterGoalMl,
    workoutCompleted,
    sleepHours: row.sleepHours,
    caloriesConsumed,
    caloriesGoal: row.caloriesGoal,
  });

  const checklist = buildChecklist({
    mealsByType,
    workoutCompleted,
    waterMl: row.waterMl,
    waterGoalMl: row.waterGoalMl,
    sleepHours: row.sleepHours,
  });

  const mealsSnapshot = meals.map((m) => ({
    id: m.id,
    mealType: m.mealType,
    completed: m.completed,
    totalCalories: m.totalCalories || 0,
    foodCount: m.foodItems?.length || 0,
  }));

  const updated = await prisma.dailyUserState.update({
    where: { userId_dateKey: { userId, dateKey } },
    data: {
      caloriesConsumed,
      progressScore,
      calendarStatus,
      workoutCompleted,
      workoutLogId: workoutLog?.id ?? null,
      exercises: JSON.stringify(exercises),
      mealsSnapshot: JSON.stringify(mealsSnapshot),
      checklist: JSON.stringify(checklist),
    },
  });

  return toPublicState(updated, meals, exercises, workoutLog);
}

function parseJsonArray(value, fallback = []) {
  if (!value) return fallback;
  if (Array.isArray(value)) return value;
  try {
    const p = JSON.parse(value);
    return Array.isArray(p) ? p : fallback;
  } catch {
    return fallback;
  }
}

function toPublicState(row, meals, exercises, workoutLog) {
  return {
    dateKey: row.dateKey,
    goals: {
      caloriesGoal: row.caloriesGoal,
      waterGoalMl: row.waterGoalMl,
      mealsGoal: row.mealsGoal,
    },
    caloriesConsumed: row.caloriesConsumed,
    waterMl: row.waterMl,
    sleepHours: row.sleepHours,
    progressScore: row.progressScore,
    calendarStatus: row.calendarStatus,
    workout: {
      completed: row.workoutCompleted,
      workoutLogId: row.workoutLogId,
      exercises: exercises || parseJsonArray(row.exercises, DEFAULT_EXERCISES),
    },
    meals,
    checklist: parseJsonArray(row.checklist, []),
  };
}

async function getDailyState(userId, dateKey) {
  await prisma.dailyUserState.upsert({
    where: { userId_dateKey: { userId, dateKey } },
    create: {
      userId,
      dateKey,
    },
    update: {},
  });
  return rebuildDailyUserState(userId, dateKey);
}

async function applyDailyAction(userId, dateKey, action, payload = {}) {
  const { start } = dayRangeFromDateKey(dateKey);
  await prisma.dailyUserState.upsert({
    where: { userId_dateKey: { userId, dateKey } },
    create: { userId, dateKey },
    update: {},
  });
  const row = await prisma.dailyUserState.findUnique({
    where: { userId_dateKey: { userId, dateKey } },
  });

  switch (action) {
    case 'ADD_WATER': {
      const ml = Number(payload.ml) > 0 ? Number(payload.ml) : 250;
      const next = clamp(row.waterMl + ml, 0, row.waterGoalMl * 3);
      await prisma.dailyUserState.update({
        where: { userId_dateKey: { userId, dateKey } },
        data: { waterMl: next },
      });
      await upsertDailyCheck(userId, start, 'water', {
        done: next >= row.waterGoalMl,
        value: Math.round((next / row.waterGoalMl) * 8),
      });
      break;
    }
    case 'SET_WATER_LITERS': {
      const liters = clamp(Number(payload.liters) || 0, 0, 20);
      const next = Math.round(liters * 1000);
      await prisma.dailyUserState.update({
        where: { userId_dateKey: { userId, dateKey } },
        data: { waterMl: next },
      });
      await upsertDailyCheck(userId, start, 'water', {
        done: next >= row.waterGoalMl,
        value: Math.round((next / Math.max(row.waterGoalMl, 1)) * 8),
      });
      break;
    }
    case 'UPDATE_SLEEP': {
      const hours = clamp(Number(payload.hours) || 0, 0, 12);
      await prisma.dailyUserState.update({
        where: { userId_dateKey: { userId, dateKey } },
        data: { sleepHours: hours },
      });
      await upsertDailyCheck(userId, start, 'sleep', { done: hours >= 6, value: Math.round(hours) });
      break;
    }
    case 'UPDATE_GOAL': {
      const caloriesGoal = payload.caloriesGoal != null ? clamp(Number(payload.caloriesGoal), 1200, 5000) : row.caloriesGoal;
      const waterGoalMl = payload.waterGoalMl != null ? clamp(Number(payload.waterGoalMl), 500, 6000) : row.waterGoalMl;
      const mealsGoal = payload.mealsGoal != null ? clamp(Number(payload.mealsGoal), 1, 6) : row.mealsGoal;
      await prisma.dailyUserState.update({
        where: { userId_dateKey: { userId, dateKey } },
        data: { caloriesGoal, waterGoalMl, mealsGoal },
      });
      break;
    }
    case 'ADD_MEAL': {
      const mealType = payload.mealType;
      if (!mealType) throw new Error('mealType obrigatório');
      await prisma.meal.create({
        data: {
          userId,
          mealType,
          date: start,
        },
      });
      break;
    }
    case 'COMPLETE_MEAL': {
      const { start: dayStart, end: dayEnd } = dayRangeFromDateKey(dateKey);
      const mealType = payload.mealType;
      const done = Boolean(payload.done);
      if (!mealType) throw new Error('mealType obrigatório');
      let meal = (
        await prisma.meal.findMany({
          where: { userId, mealType, date: { gte: dayStart, lt: dayEnd } },
        })
      )[0];
      if (!meal) {
        meal = await prisma.meal.create({
          data: { userId, mealType, date: dayStart, completed: done },
        });
      } else {
        meal = await prisma.meal.update({
          where: { id: meal.id },
          data: { completed: done },
        });
      }
      if (['breakfast', 'lunch', 'dinner'].includes(mealType)) {
        await upsertDailyCheck(userId, dayStart, mealType, { done });
      }
      break;
    }
    case 'COMPLETE_WORKOUT': {
      const done = Boolean(payload.done);
      const log = await ensureWorkoutLog(userId, dateKey);
      await prisma.workoutLog.update({
        where: { id: log.id },
        data: { completed: done },
      });
      await prisma.dailyUserState.update({
        where: { userId_dateKey: { userId, dateKey } },
        data: { workoutCompleted: done, workoutLogId: log.id },
      });
      await upsertDailyCheck(userId, start, 'workout', { done });
      break;
    }
    case 'TOGGLE_EXERCISE': {
      const exerciseId = payload.exerciseId;
      const done = Boolean(payload.done);
      if (!exerciseId) throw new Error('exerciseId obrigatório');
      const log = await ensureWorkoutLog(userId, dateKey);
      let list = DEFAULT_EXERCISES;
      try {
        const parsed = JSON.parse(log.exercises || '[]');
        if (Array.isArray(parsed) && parsed.length) list = parsed;
      } catch {
        list = DEFAULT_EXERCISES;
      }
      list = list.map((ex) => (ex.id === exerciseId ? { ...ex, completed: done } : ex));
      await prisma.workoutLog.update({
        where: { id: log.id },
        data: { exercises: JSON.stringify(list) },
      });
      break;
    }
    case 'FINALIZE_WORKOUT': {
      const log = await ensureWorkoutLog(userId, dateKey);
      let list = DEFAULT_EXERCISES;
      try {
        const parsed = JSON.parse(log.exercises || '[]');
        if (Array.isArray(parsed) && parsed.length) list = parsed;
      } catch {
        list = DEFAULT_EXERCISES;
      }
      list = list.map((ex) => ({ ...ex, completed: true }));
      const duration = list.reduce((s, ex) => s + (ex.durationMin || 0), 0);
      await prisma.workoutLog.update({
        where: { id: log.id },
        data: {
          exercises: JSON.stringify(list),
          completed: true,
          duration,
        },
      });
      await upsertDailyCheck(userId, start, 'workout', { done: true });
      break;
    }
    default:
      throw new Error(`Ação desconhecida: ${action}`);
  }

  return rebuildDailyUserState(userId, dateKey);
}

async function getMonthSummary(userId, year, monthIndex0) {
  const first = new Date(year, monthIndex0, 1);
  const last = new Date(year, monthIndex0 + 1, 0);
  const days = [];
  for (let d = new Date(first); d <= last; d.setDate(d.getDate() + 1)) {
    days.push(toDateKey(d));
  }
  const out = [];
  for (const dateKey of days) {
    const state = await getDailyState(userId, dateKey);
    out.push({ dateKey, calendarStatus: state.calendarStatus, progressScore: state.progressScore });
  }
  return out;
}

async function getRecentSummary(userId, days = 7) {
  const out = [];
  const today = new Date();
  for (let i = 0; i < days; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const dateKey = toDateKey(d);
    const state = await getDailyState(userId, dateKey);
    out.push({
      dateKey,
      calendarStatus: state.calendarStatus,
      progressScore: state.progressScore,
    });
  }
  return out;
}

module.exports = {
  toDateKey,
  dayRangeFromDateKey,
  rebuildDailyUserState,
  getDailyState,
  applyDailyAction,
  getMonthSummary,
  getRecentSummary,
};
