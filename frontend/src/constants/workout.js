export function buildVisibleWorkouts(plan = [], executions = []) {
  return [
    ...plan,

    ...executions,
  ];
}