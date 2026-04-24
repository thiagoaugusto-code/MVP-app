/*
  Warnings:

  - You are about to drop the `WorkoutLog` table. If the table is not empty, all the data it contains will be lost.
  - You are about to drop the column `dateKey` on the `DailyUserState` table. All the data in the column will be lost.
  - You are about to drop the column `workoutLogId` on the `DailyUserState` table. All the data in the column will be lost.
  - Added the required column `date` to the `DailyUserState` table without a default value. This is not possible if the table is not empty.

*/
-- DropTable
PRAGMA foreign_keys=off;
DROP TABLE "WorkoutLog";
PRAGMA foreign_keys=on;

-- CreateTable
CREATE TABLE "Workout" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Workout_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "WorkoutActivity" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "workoutId" INTEGER NOT NULL,
    "name" TEXT NOT NULL,
    "sets" INTEGER,
    "reps" INTEGER,
    "duration" INTEGER,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "WorkoutActivity_workoutId_fkey" FOREIGN KEY ("workoutId") REFERENCES "Workout" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_DailyUserState" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "date" DATETIME NOT NULL,
    "waterMl" INTEGER NOT NULL DEFAULT 0,
    "waterGoalMl" INTEGER NOT NULL DEFAULT 2000,
    "sleepHours" REAL,
    "caloriesGoal" INTEGER NOT NULL DEFAULT 2000,
    "mealsGoal" INTEGER NOT NULL DEFAULT 3,
    "caloriesConsumed" INTEGER NOT NULL DEFAULT 0,
    "progressScore" INTEGER NOT NULL DEFAULT 0,
    "calendarStatus" TEXT NOT NULL DEFAULT 'red',
    "workoutCompleted" BOOLEAN NOT NULL DEFAULT false,
    "exercises" TEXT,
    "mealsSnapshot" TEXT,
    "checklist" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "DailyUserState_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_DailyUserState" ("calendarStatus", "caloriesConsumed", "caloriesGoal", "checklist", "createdAt", "exercises", "id", "mealsGoal", "mealsSnapshot", "progressScore", "sleepHours", "updatedAt", "userId", "waterGoalMl", "waterMl", "workoutCompleted") SELECT "calendarStatus", "caloriesConsumed", "caloriesGoal", "checklist", "createdAt", "exercises", "id", "mealsGoal", "mealsSnapshot", "progressScore", "sleepHours", "updatedAt", "userId", "waterGoalMl", "waterMl", "workoutCompleted" FROM "DailyUserState";
DROP TABLE "DailyUserState";
ALTER TABLE "new_DailyUserState" RENAME TO "DailyUserState";
CREATE INDEX "DailyUserState_userId_date_idx" ON "DailyUserState"("userId", "date");
CREATE UNIQUE INDEX "DailyUserState_userId_date_key" ON "DailyUserState"("userId", "date");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;

-- CreateIndex
CREATE INDEX "Workout_userId_date_idx" ON "Workout"("userId", "date");
