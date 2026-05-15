const MEAL_TYPES = [
  { mealType: 'breakfast', label: 'Café da manhã', defaultInGoal: true },
  { mealType: 'lunch', label: 'Almoço', defaultInGoal: true },
  { mealType: 'dinner', label: 'Jantar', defaultInGoal: true },
  { mealType: 'snack', label: 'Lanche', defaultInGoal: false },
  { mealType: 'pre_workout', label: 'Pré-treino', defaultInGoal: false },
  { mealType: 'post_workout', label: 'Pós-treino', defaultInGoal: false },
];

const MEAL_TYPE_ORDER = MEAL_TYPES.map((m) => m.mealType);

const DEFAULT_IN_GOAL = new Set(
  MEAL_TYPES.filter((m) => m.defaultInGoal).map((m) => m.mealType)
);

function getMealLabel(mealType) {
  return MEAL_TYPES.find((m) => m.mealType === mealType)?.label ?? mealType;
}

function defaultInGoalFor(mealType) {
  return DEFAULT_IN_GOAL.has(mealType);
}

function getInGoalMeals(meals) {
  return meals.filter((m) => m.inGoal);
}

module.exports = {
  MEAL_TYPES,
  MEAL_TYPE_ORDER,
  DEFAULT_IN_GOAL,
  getMealLabel,
  defaultInGoalFor,
  getInGoalMeals,
};
