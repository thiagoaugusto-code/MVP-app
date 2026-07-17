const { PrismaClient } = require('@prisma/client');
const { toZonedTime, fromZonedTime } = require('date-fns-tz');

const prisma = new PrismaClient();
const BRAZIL_TZ = 'America/Sao_Paulo';

function startOfDay(date) {
  const zonedDate = toZonedTime(new Date(date), BRAZIL_TZ);
  zonedDate.setHours(0, 0, 0, 0);
  return fromZonedTime(zonedDate, BRAZIL_TZ);
}

function toDateKey(date) {
  const zoned = toZonedTime(new Date(date), BRAZIL_TZ);
  const y = zoned.getFullYear();
  const m = String(zoned.getMonth() + 1).padStart(2, '0');
  const d = String(zoned.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function parseJson(value, fallback) {
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}

function safeNumber(value) {
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

async function ensureStudentProfile(userId) {
  return prisma.studentProfile.upsert({
    where: { userId },
    create: { userId },
    update: {},
  });
}

async function listWeightLogs(userId) {
  return prisma.progressLog.findMany({
    where: { userId },
    orderBy: { date: 'asc' },
  });
}

async function syncCurrentWeight(userId) {
  const latest = await prisma.progressLog.findFirst({
    where: { userId, weight: { not: null } },
    orderBy: { date: 'desc' },
  });

  await ensureStudentProfile(userId);

  if (latest?.weight != null) {
    await prisma.studentProfile.update({
      where: { userId },
      data: { currentWeight: latest.weight },
    });
  }
}

async function createWeightLog(userId, { weight, notes, date } = {}) {
  const parsedWeight = safeNumber(weight);
  if (parsedWeight == null || parsedWeight <= 0) {
    throw new Error('Peso inválido');
  }

  const logDate = date ? startOfDay(date) : new Date();

  const log = await prisma.progressLog.create({
    data: {
      userId,
      weight: parsedWeight,
      notes: notes || null,
      date: logDate,
    },
  });

  await syncCurrentWeight(userId);
  return log;
}

async function updateWeightLog(userId, id, { weight, notes, date } = {}) {
  const existing = await prisma.progressLog.findFirst({
    where: { id: Number(id), userId },
  });

  if (!existing) {
    throw new Error('Registro de peso não encontrado');
  }

  const data = {};
  if (weight !== undefined) {
    const parsedWeight = safeNumber(weight);
    if (parsedWeight == null || parsedWeight <= 0) {
      throw new Error('Peso inválido');
    }
    data.weight = parsedWeight;
  }
  if (notes !== undefined) data.notes = notes || null;
  if (date !== undefined) data.date = startOfDay(date);

  const log = await prisma.progressLog.update({
    where: { id: existing.id },
    data,
  });

  await syncCurrentWeight(userId);
  return log;
}

async function setWeightGoal(userId, targetWeight) {
  const parsed = safeNumber(targetWeight);
  if (parsed == null || parsed <= 0) {
    throw new Error('Meta de peso inválida');
  }

  await ensureStudentProfile(userId);

  return prisma.studentProfile.update({
    where: { userId },
    data: { targetWeight: parsed },
  });
}

function getWeekStartKey(dateKey) {
  const [y, m, d] = dateKey.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  const day = date.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  date.setDate(date.getDate() + diff);
  const yy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yy}-${mm}-${dd}`;
}

function formatWeekLabel(weekStartKey) {
  const [y, m, d] = weekStartKey.split('-').map(Number);
  const start = new Date(y, m - 1, d);
  const end = new Date(start);
  end.setDate(end.getDate() + 6);
  const fmt = (dt) =>
    `${String(dt.getDate()).padStart(2, '0')}/${String(dt.getMonth() + 1).padStart(2, '0')}`;
  return `${fmt(start)} – ${fmt(end)}`;
}

function longestStreak(sortedKeys) {
  if (!sortedKeys.length) return 0;
  let best = 1;
  let current = 1;
  for (let i = 1; i < sortedKeys.length; i += 1) {
    const prev = new Date(sortedKeys[i - 1]);
    const curr = new Date(sortedKeys[i]);
    const diffDays = Math.round((curr - prev) / (1000 * 60 * 60 * 24));
    if (diffDays === 1) {
      current += 1;
      best = Math.max(best, current);
    } else {
      current = 1;
    }
  }
  return best;
}

function getZonedDateParts(date = new Date()) {
  const zoned = toZonedTime(new Date(date), BRAZIL_TZ);
  return {
    year: zoned.getFullYear(),
    month: zoned.getMonth(),
    day: zoned.getDate(),
  };
}

function monthKey(year, month) {
  return `${year}-${String(month + 1).padStart(2, '0')}`;
}

function getMonthBoundsInTz(year, month, endDayInclusive = null) {
  const zonedStart = toZonedTime(new Date(year, month, 1), BRAZIL_TZ);
  zonedStart.setHours(0, 0, 0, 0);
  const start = fromZonedTime(zonedStart, BRAZIL_TZ);

  const lastDay = endDayInclusive ?? new Date(year, month + 1, 0).getDate();
  const zonedEnd = toZonedTime(new Date(year, month, lastDay), BRAZIL_TZ);
  zonedEnd.setHours(23, 59, 59, 999);
  const end = fromZonedTime(zonedEnd, BRAZIL_TZ);

  return { start, end, daysInPeriod: lastDay };
}

function weeklyAverageFromPeriod(workouts, daysInPeriod) {
  if (!daysInPeriod || daysInPeriod <= 0) return 0;
  return Number((workouts / (daysInPeriod / 7)).toFixed(1));
}

/**
 * Monthly workout pace — reusable by Progress and future Insights.
 * Compares weekly average (workouts / week) for current MTD vs full previous month.
 */
function computeWorkoutPace(completedWorkoutDates, referenceDate = new Date()) {
  const { year, month, day } = getZonedDateParts(referenceDate);
  const prevMonth = month === 0 ? 11 : month - 1;
  const prevYear = month === 0 ? year - 1 : year;

  const currentBounds = getMonthBoundsInTz(year, month, day);
  const previousBounds = getMonthBoundsInTz(prevYear, prevMonth);

  const countInRange = (bounds) =>
    completedWorkoutDates.filter((d) => {
      const t = new Date(d).getTime();
      return t >= bounds.start.getTime() && t <= bounds.end.getTime();
    }).length;

  const currentWorkouts = countInRange(currentBounds);
  const previousWorkouts = countInRange(previousBounds);

  const currentWeeklyAverage = weeklyAverageFromPeriod(
    currentWorkouts,
    currentBounds.daysInPeriod
  );
  const previousWeeklyAverage = weeklyAverageFromPeriod(
    previousWorkouts,
    previousBounds.daysInPeriod
  );
  const delta = Number((currentWeeklyAverage - previousWeeklyAverage).toFixed(1));

  let direction = 'same';
  if (delta > 0) direction = 'up';
  else if (delta < 0) direction = 'down';

  return {
    metric: 'workoutsPerWeek',
    currentMonth: {
      key: monthKey(year, month),
      workouts: currentWorkouts,
      daysInPeriod: currentBounds.daysInPeriod,
      weeklyAverage: currentWeeklyAverage,
    },
    previousMonth: {
      key: monthKey(prevYear, prevMonth),
      workouts: previousWorkouts,
      daysInPeriod: previousBounds.daysInPeriod,
      weeklyAverage: previousWeeklyAverage,
    },
    delta,
    direction,
  };
}

function buildDayFacts(row) {
  const mealsSnapshot = parseJson(row.mealsSnapshot, []);
  const exercises = parseJson(row.exercises, []);
  const workoutLogs = parseJson(row.workoutLogs, []);
  const completedWorkoutIds = parseJson(row.completedWorkoutIds, []);

  const mealsRegistered = mealsSnapshot.filter((m) => m.registered).length;
  const mealsInGoal = mealsSnapshot.filter((m) => m.inGoal).length;
  const mealsInGoalRegistered = mealsSnapshot.filter(
    (m) => m.inGoal && m.registered
  ).length;

  const completedExercises =
    exercises.filter((ex) => ex.completed).length + completedWorkoutIds.length;

  const executionRecords = workoutLogs.reduce((sum, log) => {
    const records = Array.isArray(log.records) ? log.records.length : 0;
    return sum + records;
  }, 0);

  const waterMl = row.waterMl ?? 0;
  const waterGoalMl = row.waterGoalMl || 2000;
  const waterGoalMet = waterGoalMl > 0 && waterMl >= waterGoalMl;

  return {
    dateKey: toDateKey(row.date),
    waterMl,
    waterGoalMl,
    waterGoalMet,
    sleepHours: row.sleepHours != null ? Number(row.sleepHours) : null,
    workoutCompleted: Boolean(row.workoutCompleted),
    mealsRegistered,
    mealsInGoal,
    mealsInGoalRegistered,
    caloriesConsumed: row.caloriesConsumed ?? 0,
    completedExercises,
    executionRecords,
    exerciseCount: exercises.length + completedWorkoutIds.length,
  };
}

function emptyWeekBucket(weekStartKey) {
  return {
    weekStart: weekStartKey,
    label: formatWeekLabel(weekStartKey),
    daysWithData: 0,
    workouts: 0,
    mealsRegistered: 0,
    mealsInGoal: 0,
    mealsInGoalRegistered: 0,
    caloriesConsumed: 0,
    waterDaysMet: 0,
    waterTotalMl: 0,
    waterDaysTracked: 0,
    sleepTotal: 0,
    sleepDays: 0,
    exercisesCompleted: 0,
    executionRecords: 0,
  };
}

/**
 * Aggregates factual progress for the Organize page.
 * Returns facts only — no interpretations (Insights will consume this later).
 */
async function getProgressOverview(userId, { days = 90 } = {}) {
  const lookback = Math.min(Math.max(Number(days) || 90, 7), 180);
  const today = startOfDay(new Date());
  const rangeStart = new Date(today);
  rangeStart.setDate(rangeStart.getDate() - (lookback - 1));

  const weekAgo = new Date(today);
  weekAgo.setDate(weekAgo.getDate() - 6);

  const { year: zonedYear, month: zonedMonth } = getZonedDateParts(today);
  const prevMonthIndex = zonedMonth === 0 ? 11 : zonedMonth - 1;
  const prevYear = zonedMonth === 0 ? zonedYear - 1 : zonedYear;
  const paceRangeStart = getMonthBoundsInTz(prevYear, prevMonthIndex).start;

  const [profile, weightLogs, dailyRows, user, mealAgg, allMealRegistered, workoutDaysForPace] =
    await Promise.all([
      ensureStudentProfile(userId),
      listWeightLogs(userId),
      prisma.dailyUserState.findMany({
        where: {
          userId,
          date: { gte: rangeStart, lte: today },
        },
        orderBy: { date: 'asc' },
      }),
      prisma.user.findUnique({
        where: { id: userId },
        select: { createdAt: true, streak: true },
      }),
      prisma.meal.groupBy({
        by: ['registered', 'inGoal'],
        where: {
          userId,
          date: { gte: rangeStart, lte: today },
        },
        _count: { _all: true },
        _sum: { totalCalories: true },
      }),
      prisma.meal.findMany({
        where: {
          userId,
          registered: true,
          date: { gte: rangeStart, lte: today },
        },
        select: { date: true, inGoal: true, totalCalories: true },
        orderBy: { date: 'asc' },
      }),
      prisma.dailyUserState.findMany({
        where: {
          userId,
          date: { gte: paceRangeStart, lte: today },
          workoutCompleted: true,
        },
        select: { date: true },
      }),
    ]);

  const dayFacts = dailyRows.map(buildDayFacts);
  const dayByKey = new Map(dayFacts.map((d) => [d.dateKey, d]));

  // Prefer Meal table for meal totals when available
  const mealTotals = {
    registered: 0,
    inGoal: 0,
    inGoalRegistered: 0,
    calories: 0,
  };
  for (const group of mealAgg) {
    const count = group._count._all;
    const cals = group._sum.totalCalories || 0;
    if (group.inGoal) mealTotals.inGoal += count;
    if (group.registered) {
      mealTotals.registered += count;
      mealTotals.calories += cals;
    }
    if (group.inGoal && group.registered) mealTotals.inGoalRegistered += count;
  }

  // Meal streak from Meal registrations (days with ≥1 registered meal)
  const mealDayKeys = [
    ...new Set(allMealRegistered.map((m) => toDateKey(m.date))),
  ].sort();
  const mealStreak = longestStreak(mealDayKeys);

  // Water streak
  const waterMetKeys = dayFacts
    .filter((d) => d.waterGoalMet)
    .map((d) => d.dateKey)
    .sort();
  const waterStreak = longestStreak(waterMetKeys);

  // Current week (last 7 calendar days including today)
  const thisWeekKeys = [];
  for (let i = 6; i >= 0; i -= 1) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    thisWeekKeys.push(toDateKey(d));
  }

  const thisWeekDays = thisWeekKeys.map((key) => dayByKey.get(key)).filter(Boolean);
  const thisWeekMeals = allMealRegistered.filter((m) => {
    const key = toDateKey(m.date);
    return thisWeekKeys.includes(key);
  });

  const weightsWithValue = weightLogs.filter((l) => l.weight != null);
  const firstWeight = weightsWithValue[0] || null;
  const lastWeight = weightsWithValue[weightsWithValue.length - 1] || null;
  const currentWeight =
    lastWeight?.weight ?? profile.currentWeight ?? null;
  const initialWeight = firstWeight?.weight ?? null;
  const targetWeight = profile.targetWeight ?? null;
  const weightDelta =
    initialWeight != null && currentWeight != null
      ? Number((currentWeight - initialWeight).toFixed(1))
      : null;
  const distanceToGoal =
    currentWeight != null && targetWeight != null
      ? Number((targetWeight - currentWeight).toFixed(1))
      : null;

  const thisWeekWeightLogs = weightsWithValue.filter((l) => {
    const key = toDateKey(l.date);
    return thisWeekKeys.includes(key);
  });
  let weekWeightDelta = null;
  if (thisWeekWeightLogs.length >= 2) {
    const first = thisWeekWeightLogs[0].weight;
    const last = thisWeekWeightLogs[thisWeekWeightLogs.length - 1].weight;
    weekWeightDelta = Number((last - first).toFixed(1));
  } else if (thisWeekWeightLogs.length === 1 && weightsWithValue.length >= 2) {
    const before = [...weightsWithValue]
      .reverse()
      .find((l) => toDateKey(l.date) < thisWeekKeys[0]);
    if (before) {
      weekWeightDelta = Number(
        (thisWeekWeightLogs[0].weight - before.weight).toFixed(1)
      );
    }
  }

  const waterDaysTracked = dayFacts.filter((d) => d.waterMl > 0).length;
  const waterTotalMl = dayFacts.reduce((s, d) => s + d.waterMl, 0);
  const waterAvgDaily =
    waterDaysTracked > 0 ? Math.round(waterTotalMl / waterDaysTracked) : null;
  const waterDaysMet = dayFacts.filter((d) => d.waterGoalMet).length;

  const sleepDays = dayFacts.filter((d) => d.sleepHours != null && d.sleepHours > 0);
  const sleepAvg =
    sleepDays.length > 0
      ? Number(
          (
            sleepDays.reduce((s, d) => s + d.sleepHours, 0) / sleepDays.length
          ).toFixed(1)
        )
      : null;

  const workoutsCompleted = dayFacts.filter((d) => d.workoutCompleted).length;
  const exercisesCompleted = dayFacts.reduce(
    (s, d) => s + d.completedExercises,
    0
  );
  const executionRecords = dayFacts.reduce(
    (s, d) => s + d.executionRecords,
    0
  );

  // Weekly frequency: workouts in last 7 days
  const weekWorkouts = thisWeekDays.filter((d) => d.workoutCompleted).length;
  const weeksInRange = Math.max(1, Math.ceil(lookback / 7));
  const weeklyFrequency = Number(
    (workoutsCompleted / weeksInRange).toFixed(1)
  );

  const mealAdherencePercent =
    mealTotals.inGoal > 0
      ? Math.round((mealTotals.inGoalRegistered / mealTotals.inGoal) * 100)
      : mealTotals.registered > 0
        ? 100
        : 0;

  const workoutDaysWithActivity = dayFacts.filter(
    (d) => d.workoutCompleted || d.completedExercises > 0
  ).length;
  const workoutAdherencePercent =
    dayFacts.length > 0
      ? Math.round((workoutsCompleted / dayFacts.length) * 100)
      : 0;

  // Weekly timeline buckets (facts only)
  const weekMap = new Map();
  for (const day of dayFacts) {
    const weekStart = getWeekStartKey(day.dateKey);
    if (!weekMap.has(weekStart)) {
      weekMap.set(weekStart, emptyWeekBucket(weekStart));
    }
    const bucket = weekMap.get(weekStart);
    bucket.daysWithData += 1;
    if (day.workoutCompleted) bucket.workouts += 1;
    bucket.mealsRegistered += day.mealsRegistered;
    bucket.mealsInGoal += day.mealsInGoal;
    bucket.mealsInGoalRegistered += day.mealsInGoalRegistered;
    bucket.caloriesConsumed += day.caloriesConsumed;
    if (day.waterMl > 0) {
      bucket.waterDaysTracked += 1;
      bucket.waterTotalMl += day.waterMl;
    }
    if (day.waterGoalMet) bucket.waterDaysMet += 1;
    if (day.sleepHours != null && day.sleepHours > 0) {
      bucket.sleepTotal += day.sleepHours;
      bucket.sleepDays += 1;
    }
    bucket.exercisesCompleted += day.completedExercises;
    bucket.executionRecords += day.executionRecords;
  }

  // Prefer Meal table counts per week (source of truth for nutrition)
  const mealsByWeek = new Map();
  for (const meal of allMealRegistered) {
    const key = toDateKey(meal.date);
    const weekStart = getWeekStartKey(key);
    if (!mealsByWeek.has(weekStart)) {
      mealsByWeek.set(weekStart, { registered: 0, inGoalRegistered: 0 });
    }
    const bucket = mealsByWeek.get(weekStart);
    bucket.registered += 1;
    if (meal.inGoal) bucket.inGoalRegistered += 1;
    if (!weekMap.has(weekStart)) {
      weekMap.set(weekStart, emptyWeekBucket(weekStart));
    }
  }
  for (const [weekStart, mealCounts] of mealsByWeek) {
    const bucket = weekMap.get(weekStart);
    bucket.mealsRegistered = Math.max(bucket.mealsRegistered, mealCounts.registered);
    bucket.mealsInGoalRegistered = Math.max(
      bucket.mealsInGoalRegistered,
      mealCounts.inGoalRegistered
    );
  }

  const weightByWeek = new Map();
  for (const log of weightsWithValue) {
    const key = toDateKey(log.date);
    const weekStart = getWeekStartKey(key);
    if (!weightByWeek.has(weekStart)) weightByWeek.set(weekStart, []);
    weightByWeek.get(weekStart).push(log.weight);
  }

  const timeline = [...weekMap.entries()]
    .sort(([a], [b]) => (a < b ? -1 : 1))
    .map(([weekStart, bucket], index) => {
      const weights = weightByWeek.get(weekStart) || [];
      const weekWeight =
        weights.length > 0
          ? {
              start: weights[0],
              end: weights[weights.length - 1],
              delta: Number(
                (weights[weights.length - 1] - weights[0]).toFixed(1)
              ),
            }
          : null;

      return {
        week: index + 1,
        weekStart,
        label: bucket.label,
        weight: weekWeight,
        workouts: bucket.workouts,
        mealsRegistered: bucket.mealsRegistered,
        mealsInGoalRegistered: bucket.mealsInGoalRegistered,
        water: {
          daysMetGoal: bucket.waterDaysMet,
          avgMl:
            bucket.waterDaysTracked > 0
              ? Math.round(bucket.waterTotalMl / bucket.waterDaysTracked)
              : null,
        },
        sleep: {
          avgHours:
            bucket.sleepDays > 0
              ? Number((bucket.sleepTotal / bucket.sleepDays).toFixed(1))
              : null,
        },
        exercisesCompleted: bucket.exercisesCompleted,
        executionRecords: bucket.executionRecords,
      };
    });

  // Water weekly evolution (last up to 8 weeks)
  const waterWeekly = timeline.slice(-8).map((w) => ({
    week: w.week,
    weekStart: w.weekStart,
    label: w.label,
    avgMl: w.water.avgMl,
    daysMetGoal: w.water.daysMetGoal,
  }));

  const sleepWeekly = timeline.slice(-8).map((w) => ({
    week: w.week,
    weekStart: w.weekStart,
    label: w.label,
    avgHours: w.sleep.avgHours,
  }));

  const daysUsingSage = user?.createdAt
    ? Math.max(
        1,
        Math.ceil(
          (Date.now() - new Date(user.createdAt).getTime()) /
            (1000 * 60 * 60 * 24)
        )
      )
    : dayFacts.length;

  const totalRecords =
    mealTotals.registered +
    workoutsCompleted +
    weightsWithValue.length +
    dayFacts.filter((d) => d.waterMl > 0).length +
    sleepDays.length;

  const workoutPace = computeWorkoutPace(
    workoutDaysForPace.map((row) => row.date),
    today
  );

  return {
    weight: {
      current: currentWeight,
      initial: initialWeight,
      target: targetWeight,
      delta: weightDelta,
      distanceToGoal,
      history: weightsWithValue.map((l) => ({
        id: l.id,
        weight: l.weight,
        notes: l.notes,
        date: l.date,
        dateKey: toDateKey(l.date),
      })),
    },
    nutrition: {
      mealsRegistered: mealTotals.registered,
      mealsInGoal: mealTotals.inGoal,
      mealsInGoalRegistered: mealTotals.inGoalRegistered,
      adherencePercent: mealAdherencePercent,
      registrationStreak: mealStreak,
      totalRecords: mealTotals.registered,
      caloriesConsumed: mealTotals.calories,
    },
    workout: {
      workoutsCompleted,
      exercisesCompleted,
      executionRecords,
      weeklyFrequency,
      weekWorkouts,
      adherencePercent: workoutAdherencePercent,
      activeDays: workoutDaysWithActivity,
    },
    water: {
      avgDailyMl: waterAvgDaily,
      daysMetGoal: waterDaysMet,
      longestStreak: waterStreak,
      weekly: waterWeekly,
    },
    sleep: {
      avgHours: sleepAvg,
      daysTracked: sleepDays.length,
      weekly: sleepWeekly,
    },
    pace: {
      workout: workoutPace,
    },
    weekSummary: {
      workouts: weekWorkouts,
      mealsRegistered: thisWeekMeals.length,
      waterDaysMetGoal: thisWeekDays.filter((d) => d.waterGoalMet).length,
      weightDelta: weekWeightDelta,
    },
    timeline,
    overall: {
      daysUsingSage,
      totalRecords,
      workouts: workoutsCompleted,
      meals: mealTotals.registered,
      waterDaysTracked,
      weightLogs: weightsWithValue.length,
      streak: user?.streak ?? 0,
    },
    meta: {
      lookbackDays: lookback,
      daysWithState: dayFacts.length,
    },
  };
}

module.exports = {
  listWeightLogs,
  createWeightLog,
  updateWeightLog,
  setWeightGoal,
  getProgressOverview,
  syncCurrentWeight,
  computeWorkoutPace,
};
