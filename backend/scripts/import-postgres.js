const { PrismaClient } = require('@prisma/client');
const fs = require('fs');

const prisma = new PrismaClient();

async function importUser() {

  const data = JSON.parse(
    fs.readFileSync('./backup/user-export.json')
  );

  console.log("Importando usuário:", data.email);


  const user = await prisma.user.create({
    data:{
      id: data.id,
      name: data.name,
      email: data.email,
      password: data.password,
      avatar: data.avatar,
      role: data.role,
      streak: data.streak,
      hasSeenWorkoutSetupModal: data.hasSeenWorkoutSetupModal,
      createdAt: new Date(data.createdAt),
      updatedAt: new Date(data.updatedAt)
    }
  });


  console.log("User criado:", user.id);


  if(data.studentProfile){

    await prisma.studentProfile.create({
      data:{
        userId:user.id,
        goal:data.studentProfile.goal,
        currentWeight:data.studentProfile.currentWeight,
        targetWeight:data.studentProfile.targetWeight,
        height:data.studentProfile.height,
        joinedAt:new Date(data.studentProfile.joinedAt),
        updatedAt:new Date(data.studentProfile.updatedAt)
      }
    });

    console.log("StudentProfile criado");
  }



  for(const meal of data.meals){

    await prisma.meal.create({
      data:{
        id:meal.id,
        userId:user.id,
        date:new Date(meal.date),
        mealType:meal.mealType,
        displayName:meal.displayName,
        scheduledTime:meal.scheduledTime,
        isCustom:meal.isCustom,
        inGoal:meal.inGoal,
        registered:meal.registered,
        photoUrl:meal.photoUrl,
        registrationNote:meal.registrationNote,
        completed:meal.completed,
        totalCalories:meal.totalCalories
      }
    });


    if(meal.foodItems?.length){

      await prisma.foodItem.createMany({
        data:
          meal.foodItems.map(food=>({
            mealId:meal.id,
            name:food.name,
            quantity:food.quantity,
            unit:food.unit,
            calories:food.calories,
            protein:food.protein,
            carbs:food.carbs,
            fat:food.fat,
            notes:food.notes
          }))
      });

    }

  }

  console.log("Meals importadas:", data.meals.length);



  if(data.workoutRoutines?.length){

    await prisma.workoutRoutine.createMany({
      data:data.workoutRoutines.map(w=>({
        id:w.id,
        userId:user.id,
        weekday:w.weekday,
        name:w.name,
        type:w.type,
        enabled:w.enabled
      }))
    });

  }

  console.log(
    "Treinos importados:",
    data.workoutRoutines.length
  );



  if(data.dailyUserStates?.length){

    await prisma.dailyUserState.createMany({
      data:data.dailyUserStates.map(d=>({
        id:d.id,
        userId:user.id,
        date:new Date(d.date),
        waterMl:d.waterMl,
        waterGoalMl:d.waterGoalMl,
        sleepHours:d.sleepHours,
        caloriesGoal:d.caloriesGoal,
        mealsGoal:d.mealsGoal,
        workoutGoal:d.workoutGoal,
        sessions:d.sessions,
        caloriesConsumed:d.caloriesConsumed,
        progressScore:d.progressScore,
        calendarStatus:d.calendarStatus,
        workoutCompleted:d.workoutCompleted,
        hasWorkoutRoutine:d.hasWorkoutRoutine,
        exercises:d.exercises,
        workoutLogs:d.workoutLogs,
        completedWorkoutIds:d.completedWorkoutIds,
        mealsSnapshot:d.mealsSnapshot,
        checklist:d.checklist
      }))
    });

  }


  console.log(
    "DailyStates:",
    data.dailyUserStates.length
  );



  if(data.progressLogs?.length){

    await prisma.progressLog.createMany({
      data:data.progressLogs.map(p=>({
        userId:user.id,
        weight:p.weight,
        bodyFat:p.bodyFat,
        notes:p.notes,
        date:new Date(p.date)
      }))
    });

  }


  console.log(
    "Progress:",
    data.progressLogs.length
  );


  console.log("\n✅ IMPORTAÇÃO FINALIZADA");

  await prisma.$disconnect();

}


importUser()
.catch(e=>{
 console.error(e);
 prisma.$disconnect();
});