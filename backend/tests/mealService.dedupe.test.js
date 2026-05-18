const { mergeMealAttributes } = require('../src/services/mealService');

describe('mealService.mergeMealAttributes', () => {
  test('merges inGoal using logical OR across duplicates', () => {
    const list = [
      { id: 1, inGoal: false, registered: false, totalCalories: 100 },
      { id: 2, inGoal: true, registered: false, totalCalories: 200 },
      { id: 3, inGoal: false, registered: true, totalCalories: 150 },
    ];

    const merged = mergeMealAttributes(list);

    expect(merged.mergedInGoal).toBe(true);
    expect(merged.mergedRegistered).toBe(true);
    expect(merged.totalCalories).toBe(200);
    expect(merged.photoUrl).toBeUndefined();
    expect(merged.registrationNote).toBeUndefined();
  });

  test('handles empty list safely', () => {
    const merged = mergeMealAttributes([]);
    expect(merged.mergedInGoal).toBe(false);
    expect(merged.mergedRegistered).toBe(false);
    expect(merged.totalCalories).toBe(-Infinity);
  });
});
