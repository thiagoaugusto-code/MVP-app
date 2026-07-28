const { PrismaClient } = require('@prisma/client');
const fs = require('fs');

const prisma = new PrismaClient();

async function exportUser() {
  const userId = 5;

  console.log(`Buscando usuário ${userId}...`);

  const data = await prisma.user.findUnique({
    where: {
      id: userId
    },
    include: {
      studentProfile: true,

      meals: {
        include: {
          foodItems: true
        }
      },

      mealLogs: true,

      workouts: {
        include: {
          activities: true
        }
      },

      workoutRoutines: true,

      dailyUserStates: true,

      progressLogs: true
    }
  });


  if (!data) {
    throw new Error(`Usuário ${userId} não encontrado`);
  }


  fs.writeFileSync(
    './backup/user-export.json',
    JSON.stringify(data, null, 2)
  );


  console.log('\n✅ Export concluído\n');

  console.log({
    id: data.id,
    user: data.email,
    meals: data.meals.length,
    mealLogs: data.mealLogs.length,
    workouts: data.workouts.length,
    routines: data.workoutRoutines.length,
    dailyStates: data.dailyUserStates.length,
    progress: data.progressLogs.length
  });


  await prisma.$disconnect();
}


exportUser()
  .catch(error => {
    console.error(error);
    prisma.$disconnect();
    process.exit(1);
  });