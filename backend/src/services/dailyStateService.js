const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

/*const DEFAULT_EXERCISES = [
  { id: 'ex-1', name: 'Aquecimento', durationMin: 5, completed: false, secondsDone: 0 },
  { id: 'ex-2', name: 'Treino principal', durationMin: 30, completed: false, secondsDone: 0 },
  { id: 'ex-3', name: 'Volta à calma', durationMin: 5, completed: false, secondsDone: 0 },
];*/
// --------------------
// HELPERS (DATE ONLY)
// --------------------
function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfDay(date) {
  const d = new Date(date);
  d.setHours(23, 59, 59, 999);
  return d;
}

function clamp(n, min, max) {
  return Math.max(min, Math.min(max, n));
}

// --------------------
// CHECKLIST BUILDER
// --------------------
function buildChecklist({ meals, workoutCompleted, waterMl, waterGoalMl, sleepHours }) {
  const checklist = [];

  for (const meal of meals) {
    checklist.push({
      id: meal.id,
      kind: 'meal',
      mealType: meal.mealType,
      label: meal.mealType,
      done: Boolean(meal.completed),
      mealId: meal.id,
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

// --------------------
// SCORE SYSTEM
// --------------------
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

  const meals = []; // (placeholder se não tiver meal aqui)

  const workoutCompleted = Boolean(row.workoutCompleted);

  const checklist = buildChecklist({
    meals,
    workoutCompleted,
    waterMl,
    waterGoalMl: row.waterGoalMl,
    sleepHours: row.sleepHours,
  });

  const { progressScore, calendarStatus } = scoreAndCalendarStatus({
    mealsCompleted: 0,
    mealsGoal: row.mealsGoal,
    waterMl,
    waterGoalMl: row.waterGoalMl,
    workoutCompleted,
    sleepHours: row.sleepHours,
    caloriesConsumed: row.caloriesConsumed,
    caloriesGoal: row.caloriesGoal,
  });

  const exercises = row.exercises
    ? JSON.parse(row.exercises)
    : [];

  return {
    date,
    goals: {
      caloriesGoal: row.caloriesGoal,
      waterGoalMl: row.waterGoalMl,
      mealsGoal: row.mealsGoal,
      workoutGoal: row.workoutGoal,
    },
    waterMl,
    progressScore,
    calendarStatus,
    workout: {
      completed: workoutCompleted,
      exercises,
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
          mealsGoal: payload.mealsGoal,
          workoutGoal: payload.workoutGoal,
        },
      });

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

      const exercises =
        current?.exercises
          ? JSON.parse(current.exercises)
          : [];

      const updated = exercises.map(ex =>
        ex.id === payload.activityId
          ? { ...ex, completed: payload.done }
          : ex
      );

      await prisma.dailyUserState.update({
        where: {
          userId_date: { userId, date: day },
        },
        data: {
          exercises: JSON.stringify(updated),
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