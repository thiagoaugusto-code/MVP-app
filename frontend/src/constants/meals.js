export const MEAL_TYPES = [
  { mealType: 'breakfast', label: 'Café da manhã' },
  { mealType: 'lunch', label: 'Almoço' },
  { mealType: 'dinner', label: 'Jantar' },
  { mealType: 'snack', label: 'Lanche' },
  { mealType: 'pre_workout', label: 'Pré-treino' },
  { mealType: 'post_workout', label: 'Pós-treino' },
];

export function getMealLabel(mealType) {
  return MEAL_TYPES.find((m) => m.mealType === mealType)?.label ?? mealType;
}

/** Único indicador de registro — mesma regra do backend (Meal.registered). */
export function isMealRegistered(meal) {
  return Boolean(meal?.registered);
}

/** Meta diária ativa — mesma lista usada no checklist (dailyState.meals). */
export function getActiveGoalMeals(dailyState) {
  if (!dailyState) return [];
  if (Array.isArray(dailyState.meals) && dailyState.meals.length > 0) {
    return dailyState.meals.filter((m) => m.inGoal !== false);
  }
  return (dailyState.checklist || [])
    .filter((item) => item.kind === 'meal')
    .map((item) => ({
      id: item.mealId ?? item.id,
      mealType: item.mealType,
      registered: Boolean(item.done),
      inGoal: true,
    }));
}

export function sortMealsByType(meals) {
  const order = MEAL_TYPES.map((t) => t.mealType);
  return [...meals].sort(
    (a, b) => order.indexOf(a.mealType) - order.indexOf(b.mealType)
  );
}

export function computeMealProgress(meals) {
  const inGoalMeals = meals.filter((m) => m.inGoal);
  const registeredCount = inGoalMeals.filter((m) => isMealRegistered(m)).length;
  const inGoalCount = inGoalMeals.length;
  const percent =
    inGoalCount > 0 ? Math.round((registeredCount / inGoalCount) * 100) : 0;

  return { inGoalCount, registeredCount, percent };
}
