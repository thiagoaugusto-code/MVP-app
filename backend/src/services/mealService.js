const fs = require('fs');
const path = require('path');
const { PrismaClient } = require('@prisma/client');
const { toZonedTime, fromZonedTime } = require('date-fns-tz');
const {
  MEAL_TYPES,
  MEAL_TYPE_ORDER,
  defaultInGoalFor,
} = require('../constants/meals');

const prisma = new PrismaClient();
const BRAZIL_TZ = 'America/Sao_Paulo';
const UPLOAD_DIR = path.join(__dirname, '../../uploads/meals');

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

function isMealRegistered(meal) {
  return Boolean(meal?.registered);
}

function mealCanonicalScore(meal, dayStart) {
  let score = 0;
  if (meal.registered) score += 1000;
  if (startOfDay(meal.date).getTime() === dayStart.getTime()) score += 100;
  score += meal.id;
  return score;
}

function pickCanonicalMeal(candidates, dayStart) {
  return [...candidates].sort((a, b) => {
    const byUpdated = new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    if (byUpdated !== 0) return byUpdated;
    return mealCanonicalScore(b, dayStart) - mealCanonicalScore(a, dayStart);
  })[0];
}

/** Refeições atualmente na meta diária — única lista para checklist e progresso. */
function getActiveGoalMeals(meals) {
  return sortMeals(meals.filter((m) => m.inGoal));
}

function sortMeals(meals) {
  return [...meals].sort(
    (a, b) => MEAL_TYPE_ORDER.indexOf(a.mealType) - MEAL_TYPE_ORDER.indexOf(b.mealType)
  );
}

function computeMealProgress(meals) {
  const inGoalMeals = meals.filter((m) => m.inGoal);
  const registeredCount = inGoalMeals.filter((m) => isMealRegistered(m)).length;
  const inGoalCount = inGoalMeals.length;
  const percent =
    inGoalCount > 0 ? Math.round((registeredCount / inGoalCount) * 100) : 0;

  return { inGoalCount, registeredCount, percent };
}

async function dedupeDailyMeals(userId, dayStart, dayEnd) {
  const existing = await prisma.meal.findMany({
    where: {
      userId,
      date: { gte: dayStart, lte: dayEnd },
    },
    include: { foodItems: true },
  });

  const groups = new Map();
  for (const meal of existing) {
    if (!groups.has(meal.mealType)) groups.set(meal.mealType, []);
    groups.get(meal.mealType).push(meal);
  }

  for (const list of groups.values()) {
    if (list.length <= 1) {
      const meal = list[0];
      if (startOfDay(meal.date).getTime() !== dayStart.getTime()) {
        await prisma.meal.update({
          where: { id: meal.id },
          data: { date: dayStart },
        });
      }
      continue;
    }

    const canonical = pickCanonicalMeal(list, dayStart);
    const duplicateIds = list.filter((m) => m.id !== canonical.id).map((m) => m.id);
    const mergedRegistered = list.some((m) => m.registered);
    const withPhoto = list.find((m) => m.photoUrl);
    const withNote = list.find((m) => m.registrationNote);

    if (duplicateIds.length > 0) {
      await prisma.foodItem.updateMany({
        where: { mealId: { in: duplicateIds } },
        data: { mealId: canonical.id },
      });
      await prisma.meal.deleteMany({ where: { id: { in: duplicateIds } } });
    }

    await prisma.meal.update({
      where: { id: canonical.id },
      data: {
        date: dayStart,
        registered: mergedRegistered,
        completed: mergedRegistered,
        inGoal: canonical.inGoal,
        photoUrl: withPhoto?.photoUrl ?? canonical.photoUrl,
        registrationNote: withNote?.registrationNote ?? canonical.registrationNote,
        totalCalories: Math.max(...list.map((m) => m.totalCalories || 0)),
      },
    });
  }
}

async function setMealRegistered(meal, registered, extras = {}) {
  const dayStart = startOfDay(meal.date);
  const data = {
    registered,
    completed: registered,
    date: dayStart,
  };

  if (!registered) {
    data.photoUrl = null;
    data.registrationNote = null;
  } else if (extras.photoUrl !== undefined) {
    data.photoUrl = extras.photoUrl;
    data.registrationNote = extras.registrationNote ?? null;
  } else if (extras.registrationNote !== undefined) {
    data.registrationNote = extras.registrationNote;
  }

  return prisma.meal.update({
    where: { id: meal.id },
    data,
    include: { foodItems: true },
  });
}

async function ensureDailyMeals(userId, date = new Date()) {
  const dayStart = startOfDay(date);
  const dayEnd = endOfDay(date);

  await dedupeDailyMeals(userId, dayStart, dayEnd);

  const existing = await prisma.meal.findMany({
    where: {
      userId,
      date: { gte: dayStart, lte: dayEnd },
    },
    include: { foodItems: true },
  });

  const byType = new Map();
  for (const meal of existing) {
    const prev = byType.get(meal.mealType);
    if (!prev || pickCanonicalMeal([meal, prev], dayStart).id === meal.id) {
      byType.set(meal.mealType, meal);
    }
  }

  const created = [];

  for (const { mealType } of MEAL_TYPES) {
    if (byType.has(mealType)) continue;

    const meal = await prisma.meal.create({
      data: {
        userId,
        mealType,
        date: dayStart,
        inGoal: defaultInGoalFor(mealType),
        registered: false,
        completed: false,
      },
      include: { foodItems: true },
    });
    byType.set(mealType, meal);
    created.push(meal);
  }

  const allMeals = sortMeals([...byType.values()]);
  return { meals: allMeals, progress: computeMealProgress(allMeals), created };
}

function saveMealPhoto(userId, mealId, photoData) {
  if (!photoData || typeof photoData !== 'string') {
    throw new Error('Foto inválida');
  }

  const match = photoData.match(/^data:(image\/\w+);base64,(.+)$/);
  if (!match) {
    throw new Error('Formato de foto inválido');
  }

  const [, mime, base64] = match;
  const ext = mime === 'image/png' ? 'png' : mime === 'image/webp' ? 'webp' : 'jpg';
  const buffer = Buffer.from(base64, 'base64');

  if (buffer.length > 5 * 1024 * 1024) {
    throw new Error('Foto muito grande (máx. 5MB)');
  }

  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
  const filename = `meal-${userId}-${mealId}-${Date.now()}.${ext}`;
  const filepath = path.join(UPLOAD_DIR, filename);
  fs.writeFileSync(filepath, buffer);

  return `/uploads/meals/${filename}`;
}

async function registerMeal(meal, { mode, photoData, note }) {
  if (mode === 'photo') {
    const photoUrl = saveMealPhoto(meal.userId, meal.id, photoData);
    return setMealRegistered(meal, true, { photoUrl, registrationNote: null });
  }

  if (mode === 'manual') {
    const trimmed = (note || '').trim();
    if (!trimmed) {
      throw new Error('Descreva a refeição para registro manual');
    }
    return setMealRegistered(meal, true, { registrationNote: trimmed });
  }

  throw new Error('Modo de registro inválido');
}

module.exports = {
  startOfDay,
  endOfDay,
  sortMeals,
  computeMealProgress,
  getActiveGoalMeals,
  ensureDailyMeals,
  registerMeal,
  setMealRegistered,
  isMealRegistered,
  pickCanonicalMeal,
  MEAL_TYPES,
};
