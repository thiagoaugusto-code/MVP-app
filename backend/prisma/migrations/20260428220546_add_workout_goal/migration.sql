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
    "workoutGoal" INTEGER NOT NULL DEFAULT 3,
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
INSERT INTO "new_DailyUserState" ("calendarStatus", "caloriesConsumed", "caloriesGoal", "checklist", "createdAt", "date", "exercises", "id", "mealsGoal", "mealsSnapshot", "progressScore", "sleepHours", "updatedAt", "userId", "waterGoalMl", "waterMl", "workoutCompleted") SELECT "calendarStatus", "caloriesConsumed", "caloriesGoal", "checklist", "createdAt", "date", "exercises", "id", "mealsGoal", "mealsSnapshot", "progressScore", "sleepHours", "updatedAt", "userId", "waterGoalMl", "waterMl", "workoutCompleted" FROM "DailyUserState";
DROP TABLE "DailyUserState";
ALTER TABLE "new_DailyUserState" RENAME TO "DailyUserState";
CREATE INDEX "DailyUserState_userId_date_idx" ON "DailyUserState"("userId", "date");
CREATE UNIQUE INDEX "DailyUserState_userId_date_key" ON "DailyUserState"("userId", "date");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
