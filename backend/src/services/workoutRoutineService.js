const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

/**
 * Busca rotina do dia
 */
async function getTodayWorkoutPlan(userId, date) {
  const day = new Date(date).getDay();

  console.log('day:', day);

  const routines = await prisma.workoutRoutine.findMany({
    where: {
      userId,
      weekday: day,
      enabled: true,
    },
  });

  console.log('routines:', routines);

  return routines;
}

/**
 * Criar rotina semanal
 */
async function createRoutine(userId, data) {
  return prisma.workoutRoutine.create({
    data: {
      userId,
      weekday: data.weekday,
      name: data.name,
      type: data.type,
      enabled: true,
    },
  });
}

/**
 * Listar rotina do usuário
 */
async function getUserRoutine(userId) {
  return prisma.workoutRoutine.findMany({
    where: { userId, enabled: true },
    orderBy: { weekday: 'asc' },
  });
}

module.exports = {
  getTodayWorkoutPlan,
  createRoutine,
  getUserRoutine,
};