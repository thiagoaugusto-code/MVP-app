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
    litersProgress: waterGoalMl > 0 ? Math.min(waterMl / waterGoalMl, 1) : 0,
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
function scoreAndCalendarStatus({
  mealProgress,
  waterMl,
  waterGoalMl,
  workoutCompleted,
  sleepHours,
  caloriesConsumed,
  caloriesGoal,
}) {
  const inGoalCount = mealProgress?.inGoalCount ?? 0;
  const registeredCount = mealProgress?.registeredCount ?? 0;
  const mealPart =
    inGoalCount > 0 ? (registeredCount / inGoalCount) * 40 : 0;
  const waterPart = waterGoalMl > 0 ? clamp(waterMl / waterGoalMl, 0, 1) * 25 : 0;
  const workoutPart = workoutCompleted ? 20 : 0;
  const sleepPart = sleepHours ? 5 : 0;

  const calPart =
    caloriesGoal > 0
      ? clamp(1 - Math.abs(caloriesConsumed - caloriesGoal) / caloriesGoal, 0, 1) * 10
      : 0;

  const progressScore = Math.round(
    clamp(mealPart + waterPart + workoutPart + sleepPart + calPart, 0, 100)
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
  const waterMl = row.waterMl ?? 0;

  const { meals: allMeals } = await ensureDailyMeals(userId, date);
  const meals = getActiveGoalMeals(allMeals);
  const mealProgress = computeMealProgress(allMeals);
  const caloriesConsumed = allMeals
    .filter((m) => m.inGoal && m.registered)
    .reduce((sum, m) => sum + (m.totalCalories || 0), 0);

  const workoutCompleted = Boolean(row.workoutCompleted);

  const checklist = buildChecklist({
    meals,
    workoutCompleted,
    waterMl,
    waterGoalMl: row.waterGoalMl,
    sleepHours: row.sleepHours,
    sessions: row.sessions,
  });

  const { progressScore, calendarStatus } = scoreAndCalendarStatus({
    mealProgress,
    waterMl,
    waterGoalMl: row.waterGoalMl,
    workoutCompleted,
    sleepHours: row.sleepHours,
    caloriesConsumed,
    caloriesGoal: row.caloriesGoal,
  });

  const exercises = row.exercises
    ? JSON.parse(row.exercises)
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
    },
    meals,
    mealProgress,
    caloriesConsumed,
    sleepHours: row.sleepHours,
    waterMl,
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
  });

  console.log("USER EXISTS:", userExists);

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

    case 'SET_SESSIONS': {
      await prisma.dailyUserState.update({
        where: {
          userId_date: { userId, date: day },
        },
        data: {
          sessions: JSON.stringify(payload.sessions || []),
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

    const data = await prisma.dailyUserState.findMany({
      where: {
        userId,
        date: {
          gte: monthStart,
          lte: monthEnd,
        },
      },
    });

    return data;
  }

};