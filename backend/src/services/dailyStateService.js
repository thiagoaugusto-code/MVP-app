const { toZonedTime, fromZonedTime } = require('date-fns-tz');
const { PrismaClient } = require('@prisma/client');
const { getTodayWorkoutPlan } = require('./workoutRoutineService');
const { getMealLabel } = require('../constants/meals');
const {
  ensureDailyMeals,
  computeMealProgress,
  getActiveGoalMeals,
  setMealRegistered,
  isMealRegistered,
  startOfDay: mealStartOfDay,
  endOfDay: mealEndOfDay,
} = require('./mealService');

const prisma = new PrismaClient();

const BRAZIL_TZ = 'America/Sao_Paulo';

/*const DEFAULT_EXERCISES = [
  { id: 'ex-1', name: 'Aquecimento', durationMin: 5, completed: false, secondsDone: 0 },
  { id: 'ex-2', name: 'Treino principal', durationMin: 30, completed: false, secondsDone: 0 },
  { id: 'ex-3', name: 'Volta à calma', durationMin: 5, completed: false, secondsDone: 0 },
];*/
// --------------------
// HELPERS (DATE ONLY)
// --------------------
function startOfDay(date) {
  const zonedDate = toZonedTime(date, BRAZIL_TZ);

  zonedDate.setHours(0, 0, 0, 0);

  return fromZonedTime(zonedDate, BRAZIL_TZ);
}

function endOfDay(date) {
  const zonedDate = toZonedTime(date, BRAZIL_TZ);

  zonedDate.setHours(23, 59, 59, 999);

  return fromZonedTime(zonedDate, BRAZIL_TZ);
}


function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

function computeWaterProgress(waterMl, waterGoalMl) {
  if (!waterGoalMl || waterGoalMl <= 0) {
    return { ratio: 0, percent: 0 };
  }

  const ratio = clamp(waterMl / waterGoalMl, 0, 1);
  return {
    ratio,
    percent: Math.round(ratio * 100),
  };
}

// --------------------
// CHECKLIST BUILDER
// --------------------
function buildChecklist({ meals, workoutCompleted, waterMl, waterGoalMl, sleepHours, sessions }) {
  const checklist = [];

  for (const meal of meals) {
    checklist.push({
      id: meal.id,
      kind: 'meal',
      mealType: meal.mealType,
      label: getMealLabel(meal.mealType),
      done: isMealRegistered(meal),
      mealId: meal.id,
      inGoal: true,
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
    litersProgress: waterGoalMl > 0 ? computeWaterProgress(waterMl, waterGoalMl).ratio : 0,
  });

  checklist.push({
    id: 'sleep',
    kind: 'sleep',
    label: 'Sono',
    hours: sleepHours ?? null,
  });

  checklist.push({
  id: 'session',
  kind: 'session',
  label: 'Sessões do dia',
  sessions: sessions ? JSON.parse(sessions) : [],
});


  return checklist;
}

// --------------------
// SCORE SYSTEM
// --------------------
const SCORE_WEIGHTS = {
  MEALS: 35,
  WATER: 30,
  WORKOUT: 25,
  SLEEP: 10,
};

const SLEEP_SCORE_WEIGHT = SCORE_WEIGHTS.SLEEP;

/** Fatores de qualidade (0–1) aplicados ao peso de sono. Fácil de ajustar por faixa. */
const SLEEP_QUALITY_FACTORS = {
  BAD: 0.15,         // 0h–4h: sono ruim
  ACCEPTABLE: 0.55,  // 5h–6h: aceitável
  IDEAL: 1,          // 7h–8h30: faixa ideal
  GOOD: 0.85,        // 8h30–10h: ainda bom
  EXCESS: 0.35,      // 10h–12h: excesso
  MINIMUM: 0.1,      // >12h: fora do ideal
};

function sleepQualityFactor(hours) {
  if (hours == null || hours <= 0) return 0;

  const h = Number(hours);
  if (Number.isNaN(h) || h <= 0) return 0;

  if (h <= 4) return SLEEP_QUALITY_FACTORS.BAD;
  if (h < 7) return SLEEP_QUALITY_FACTORS.ACCEPTABLE;
  if (h <= 8.5) return SLEEP_QUALITY_FACTORS.IDEAL;
  if (h <= 10) return SLEEP_QUALITY_FACTORS.GOOD;
  if (h <= 12) return SLEEP_QUALITY_FACTORS.EXCESS;
  return SLEEP_QUALITY_FACTORS.MINIMUM;
}

function scoreAndCalendarStatus({
  mealProgress,
  waterMl,
  waterGoalMl,
  workoutProgress,
  sleepHours,
}) {
  const inGoalCount = mealProgress?.inGoalCount ?? 0;
  const registeredCount = mealProgress?.registeredCount ?? 0;
  const mealPart =
    inGoalCount > 0
      ? (registeredCount / inGoalCount) * SCORE_WEIGHTS.MEALS
      : 0;
  const waterPart = computeWaterProgress(waterMl, waterGoalMl).ratio * SCORE_WEIGHTS.WATER;
  const workoutPart = clamp(workoutProgress, 0, 1) * SCORE_WEIGHTS.WORKOUT;
  const sleepPart = sleepQualityFactor(sleepHours) * SLEEP_SCORE_WEIGHT;

  const progressScore = Math.round(
    clamp(mealPart + waterPart + workoutPart + sleepPart, 0, 100)
  );

  let calendarStatus = 'red';
  if (progressScore >= 75) calendarStatus = 'green';
  else if (progressScore >= 35) calendarStatus = 'yellow';

  return { progressScore, calendarStatus };
}

// --------------------
// MAIN CORE
// --------------------
async function rebuildDailyUserState(userId, date) {
  const dayStart = startOfDay(date);
  const dayEnd = endOfDay(date);

  let row = await prisma.dailyUserState.findFirst({
    where: {
      userId,
      date: dayStart,
    },
  });

  if (!row) {
    row = await prisma.dailyUserState.create({
      data: {
        userId,
        date: dayStart,
        waterMl: 0,
        sleepHours: null,
        exercises: JSON.stringify([]),
      },
    });
  }

  const { meals: allMeals } = await ensureDailyMeals(userId, date);

  row = await prisma.dailyUserState.findFirst({
    where: {
      userId,
      date: dayStart,
    },
  });

  const waterMl = row.waterMl ?? 0;
  const waterGoalMl = row.waterGoalMl || 2000;
  const waterProgress = computeWaterProgress(waterMl, waterGoalMl);

  // TODAS refeições do dia
  const meals = allMeals;

  // SOMENTE refeições da meta
  const activeMeals = allMeals.filter(meal => meal.inGoal);

  const mealProgress = computeMealProgress(allMeals);

  const caloriesConsumed = allMeals
    .filter((m) => m.inGoal && m.registered)
    .reduce((sum, m) => sum + (m.totalCalories || 0), 0);

  
  const workoutCompleted = Boolean(row.workoutCompleted);

  const checklist = buildChecklist({
    meals: activeMeals,
    workoutCompleted,
    waterMl,
    waterGoalMl,
    sleepHours: row.sleepHours,
    sessions: row.sessions,
  });

  const exercises = row.exercises
    ? JSON.parse(row.exercises).map(ex => ({
        ...ex,
        context: ex.context || [],
        notes: ex.notes || '',
      }))
    : [];

  const completedWorkoutIds =
    row.completedWorkoutIds
      ? JSON.parse(row.completedWorkoutIds)
      : [];

   let routines = [];

      try {
        routines = await getTodayWorkoutPlan(userId, date);
      } catch (e) {
        console.warn('Workout routine ainda não ativa:', e.message);
        routines = [];
      }

      const mappedRoutines = routines.map(routine => ({
        ...routine,
        id: `routine-${routine.id}`,
        completed: completedWorkoutIds.includes(`routine-${routine.id}`),
      }));


      const completedManualExercises =
        exercises.filter(ex => ex.completed).length;

      const completedRoutineExercises =
        completedWorkoutIds.length;

      const totalExercisesToday =
        exercises.length + mappedRoutines.length;

      const totalCompletedExercises =
        completedManualExercises + completedRoutineExercises;

      const workoutProgress =
        totalExercisesToday > 0
          ? totalCompletedExercises / totalExercisesToday
          : 0;

  const { progressScore, calendarStatus } = scoreAndCalendarStatus({
    mealProgress,
    waterMl,
    waterGoalMl,
    workoutProgress,
    sleepHours: row.sleepHours,
  });

  await prisma.dailyUserState.update({
    where: { id: row.id },
    data: {
      progressScore,
      calendarStatus,
      caloriesConsumed,
      mealsSnapshot: JSON.stringify(
        meals.map((m) => ({
          id: m.id,
          mealType: m.mealType,
          inGoal: m.inGoal,
          registered: m.registered,
        }))
      ),
      checklist: JSON.stringify(checklist),
    },
  });

  return {
    date,
    goals: {
      caloriesGoal: row.caloriesGoal,
      waterGoalMl: row.waterGoalMl,
      workoutGoal: row.workoutGoal,
      hasWorkoutRoutine: row.hasWorkoutRoutine, 
    },
    meals,
    mealProgress,
    caloriesConsumed,
    sleepHours: row.sleepHours,
    waterMl,
    waterProgress: waterProgress.percent,
    progressScore,
    calendarStatus,
    workout: {
      completed: workoutProgress >= 1,
      progress: workoutProgress,
      totalExercisesToday,
      totalCompletedExercises,
      exercises,
      plan: mappedRoutines,
    },
    checklist,
  };
}


// --------------------
// GET STATE
// --------------------
async function getDailyState(userId, date) {
  const day = startOfDay(date);

  console.log("USER ID:", userId);

  const userExists = await prisma.user.findUnique({
    where: { id: userId },
    select: { id: true },
  });

  if (!userExists) {
    throw new Error("Usuário não existe no banco");
  }

  await prisma.dailyUserState.upsert({
    where: {
      userId_date: {
        userId,
        date: day,
      },
    },
    create: {
      userId,
      date: day,
    },
    update: {},
  });

  return rebuildDailyUserState(userId, day);
}

async function getRecentSummary(userId, days = 7) {
  const today = new Date();

  const startDate = new Date();
  startDate.setDate(today.getDate() - days);

  const data = await prisma.dailyUserState.findMany({
    where: {
      userId,
      date: {
        gte: startDate,
        lte: today,
      },
    },
    orderBy: {
      date: 'desc',
    },
  });

  return data;
}

// --------------------
// ACTIONS
// --------------------
async function applyDailyAction(userId, date, action, payload = {}) {
  const day = startOfDay(date);

  await prisma.dailyUserState.upsert({
    where: {
      userId_date: {
        userId,
        date: day,
      },
    },
    create: {
      userId,
      date: day,
    },
    update: {},
  });

  switch (action) {
    case 'ADD_WATER': {
      const ml = payload.ml || 100;

      const current = await prisma.dailyUserState.findUnique({
        where: {
          userId_date: { userId, date: day },
        },
      });

      const goal = current.waterGoalMl || 2000;

      const newValue = Math.min(current.waterMl + ml, goal);

      await prisma.dailyUserState.update({
        where: {
          userId_date: { userId, date: day },
        },
        data: {
          waterMl: newValue,
        },
      });

      break;
    }
    case 'UPDATE_GOAL': {
      await prisma.dailyUserState.update({
        where: {
          userId_date: { userId, date: day },
        },
        data: {
          caloriesGoal: payload.caloriesGoal,
          waterGoalMl: payload.waterGoalMl,
          workoutGoal: payload.workoutGoal,
        },
      });

      break;
    }

    case 'COMPLETE_MEAL_BY_ID': {
      const meal = await prisma.meal.findUnique({
        where: { id: parseInt(payload.mealId, 10) },
      });
      if (!meal || meal.userId !== userId) {
        throw new Error('Refeição não encontrada');
      }
      if (!meal.inGoal) {
        throw new Error('Refeição fora da meta diária');
      }
      await setMealRegistered(meal, Boolean(payload.done));
      break;
    }

    case 'COMPLETE_MEAL': {
      const { meals: dayMeals } = await ensureDailyMeals(userId, day);
      const meal = dayMeals.find((m) => m.mealType === payload.mealType);
      if (!meal) {
        throw new Error('Refeição não encontrada');
      }
      if (!meal.inGoal) {
        throw new Error('Refeição fora da meta diária');
      }
      await setMealRegistered(meal, Boolean(payload.done));
      break;
    }

    case 'UPDATE_SLEEP': {
      await prisma.dailyUserState.update({
        where: {
          userId_date: { userId, date: day },
        },
        data: {
          sleepHours: clamp(payload.hours || 0, 0, 12),
        },
      });
      break;
    }

    case 'ADD_WORKOUT_ACTIVITY': {
      const current = await prisma.dailyUserState.findUnique({
        where: {
          userId_date: { userId, date: day },
        },
      });

      const exercises =
        current?.exercises
          ? JSON.parse(current.exercises)
          : [];

      const newExercise = {
        id: Date.now().toString(),
        name: payload.name,
        duration: Number(payload.duration),
        intensity: payload.intensity,
        completed: false,
        secondsDone: 0,

        context: [],
        notes: '',
      };

      await prisma.dailyUserState.update({
        where: {
          userId_date: { userId, date: day },
        },
        data: {
          exercises: JSON.stringify([...exercises, newExercise]),
        },
      });

      break;
    }


    case 'COMPLETE_WORKOUT': {
      await prisma.dailyUserState.update({
        where: {
          userId_date: { userId, date: day },
        },
        data: {
          workoutCompleted: Boolean(payload.done),
        },
      });
      break;
    }
    case 'TOGGLE_WORKOUT_ACTIVITY': {
      const current = await prisma.dailyUserState.findUnique({
        where: {
          userId_date: { userId, date: day },
        },
      });

      // --------------------
      // ROTINAS AUTOMÁTICAS
      // --------------------
      if (payload.activityId.startsWith('routine-')) {

        const completedWorkoutIds =
          current?.completedWorkoutIds
            ? JSON.parse(current.completedWorkoutIds)
            : [];

        let updatedCompletedIds = [...completedWorkoutIds];

        if (payload.done) {
          if (!updatedCompletedIds.includes(payload.activityId)) {
            updatedCompletedIds.push(payload.activityId);
          }
        } else {
          updatedCompletedIds =
            updatedCompletedIds.filter(id => id !== payload.activityId);
        }

        const routines = await getTodayWorkoutPlan(userId, day);

        const totalRoutines = routines.length;

        const allRoutinesCompleted =
          totalRoutines > 0 &&
          updatedCompletedIds.length >= totalRoutines;

        await prisma.dailyUserState.update({
          where: {
            userId_date: { userId, date: day },
          },
          data: {
            completedWorkoutIds: JSON.stringify(updatedCompletedIds),
            workoutCompleted: allRoutinesCompleted,
          },
        });

        break;
      }

      // --------------------
      // EXERCÍCIOS MANUAIS
      // --------------------
      const exercises =
        current?.exercises
          ? JSON.parse(current.exercises)
          : [];

      const updated = exercises.map(ex =>
        ex.id === payload.activityId
          ? { ...ex, completed: payload.done }
          : ex
      );

      const allCompleted =
        updated.length > 0 &&
        updated.every(ex => ex.completed);

      await prisma.dailyUserState.update({
        where: {
          userId_date: { userId, date: day },
        },
        data: {
          exercises: JSON.stringify(updated),
          workoutCompleted: allCompleted,
        },
      });

      break;
    }

    case 'UPDATE_WORKOUT_CONTEXT': {

      const current = await prisma.dailyUserState.findUnique({
        where: {
          userId_date: {
            userId,
            date: day,
          },
        },
      });


      const exercises =
        current?.exercises
          ? JSON.parse(current.exercises)
          : [];

      const workoutLogs = 
        current?.workoutLogs
          ? JSON.parse(current.workoutLogs)
          : [];
      
      // Verifica se o ID do treino começa com "routine-"
      const isRoutine = 
        String(payload.workoutId).startsWith('routine-');


      const updatedExercises = isRoutineWorkout
        ? exercises
        : exercises.map(ex => {

            if (ex.id !== payload.workoutId) {
              return ex;
            }

            return {
              ...ex,
              context: payload.context || [],
              notes: payload.notes || '',
            };

          });

      const updatedWorkoutLogs = isRoutineWorkout
        ? workoutLogs.map(log => {

            if (log.workoutId !== payload.workoutId) {
              return log;
            }

            return {
              ...log,
              context: payload.context || [],
              notes: payload.notes || '',
            };

          })
        : workoutLogs;


      await prisma.dailyUserState.update({
        where: {
          userId_date: {
            userId,
            date: day,
          },
        },

        data: {
          exercises: JSON.stringify(updatedExercises),
        },
      });


      break;
    }

    case 'SET_SESSIONS': {
      await prisma.dailyUserState.update({
        where: {
          userId_date: { userId, date: day },
        },
        data: {
          sessions: JSON.stringify(payload.sessions || []),

          // 🔥 NOVO CAMPO
          hasWorkoutRoutine: true,
        },
      });

      break;
    }

    default:
      throw new Error(`Ação desconhecida: ${action}`);
  }

  return rebuildDailyUserState(userId, day);
}

// --------------------
// EXPORTS
// --------------------
module.exports = {
  getDailyState,
  applyDailyAction,
  rebuildDailyUserState,
  getRecentSummary,
  getMonthSummary: async (userId, year, month) => {
    const monthStart = new Date(year, month, 1);
    const monthEnd = new Date(year, month + 1, 0);

    const rows = await prisma.dailyUserState.findMany({
      where: {
        userId,
        date: {
          gte: monthStart,
          lte: monthEnd,
        },
      },
    });

    if (rows.length === 0) {
      return [];
    }

    const days = await Promise.all(
      rows.map(async (row) => {
        const state = await rebuildDailyUserState(userId, row.date);
        return {
          ...row,
          progressScore: state.progressScore,
          calendarStatus: state.calendarStatus,
          caloriesConsumed: state.caloriesConsumed,
        };
      })
    );

    return days;
  },
  scoreAndCalendarStatus,
  sleepQualityFactor,
  computeWaterProgress,
};