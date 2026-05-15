-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Meal" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "userId" INTEGER NOT NULL,
    "date" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "mealType" TEXT NOT NULL,
    "inGoal" BOOLEAN NOT NULL DEFAULT true,
    "registered" BOOLEAN NOT NULL DEFAULT false,
    "photoUrl" TEXT,
    "registrationNote" TEXT,
    "completed" BOOLEAN NOT NULL DEFAULT false,
    "totalCalories" INTEGER NOT NULL DEFAULT 0,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL,
    CONSTRAINT "Meal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User" ("id") ON DELETE CASCADE ON UPDATE CASCADE
);
INSERT INTO "new_Meal" ("completed", "createdAt", "date", "id", "mealType", "totalCalories", "updatedAt", "userId") SELECT "completed", "createdAt", "date", "id", "mealType", "totalCalories", "updatedAt", "userId" FROM "Meal";
DROP TABLE "Meal";
ALTER TABLE "new_Meal" RENAME TO "Meal";
CREATE UNIQUE INDEX "Meal_userId_date_mealType_key" ON "Meal"("userId", "date", "mealType");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
