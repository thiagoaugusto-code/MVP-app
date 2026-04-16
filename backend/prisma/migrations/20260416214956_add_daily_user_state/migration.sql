-- AlterTable
ALTER TABLE "Notification" ADD COLUMN "metadata" TEXT;
ALTER TABLE "Notification" ADD COLUMN "priority" TEXT DEFAULT 'normal';

-- CreateTable
CREATE TABLE "DailyUserState" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "dateKey" TEXT NOT NULL,
    "waterMl" INTEGER NOT NULL DEFAULT 0,
    "waterGoalMl" INTEGER NOT NULL DEFAULT 2000,
    "sleepHours" REAL,
    "caloriesGoal" INTEGER NOT NULL DEFAULT 2000,
    "mealsGoal" INTEGER NOT NULL DEFAULT 3,
    "caloriesConsumed" INTEGER NOT NULL DEFAULT 0,
    "progressScore" INTEGER NOT NULL DEFAULT 0,
    "calendarStatus" TEXT NOT NULL DEFAULT 'red',
    "workoutCompleted" BOOLEAN NOT NULL DEFAULT false,
    "workoutLogId" INTEGER,
    "exercises" TEXT,
    "mealsSnapshot" TEXT,
    "checklist" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "DailyUserState_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "PushSubscription" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "endpoint" TEXT NOT NULL,
    "subscription" TEXT NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "PushSubscription_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "DailyUserState_userId_dateKey_key" ON "DailyUserState"("userId", "dateKey");

-- CreateIndex
CREATE UNIQUE INDEX "PushSubscription_endpoint_key" ON "PushSubscription"("endpoint");
