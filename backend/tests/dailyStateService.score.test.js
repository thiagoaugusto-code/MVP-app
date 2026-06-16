const {
  scoreAndCalendarStatus,
  sleepQualityFactor,
} = require('../src/services/dailyStateService');

const baseInput = {
  mealProgress: { inGoalCount: 4, registeredCount: 0 },
  waterMl: 0,
  waterGoalMl: 2000,
  workoutCompleted: false,
  sleepHours: null,
};

describe('sleepQualityFactor', () => {
  test('0 horas retorna 0%', () => {
    expect(sleepQualityFactor(0)).toBe(0);
    expect(sleepQualityFactor(null)).toBe(0);
  });

  test('abaixo de 1h retorna 0%', () => {
    expect(sleepQualityFactor(0.5)).toBe(0);
  });

  test('1h até 4h59 retorna 30%', () => {
    expect(sleepQualityFactor(1)).toBe(0.3);
    expect(sleepQualityFactor(4.99)).toBe(0.3);
  });

  test('5h até 6h59 retorna 60%', () => {
    expect(sleepQualityFactor(5)).toBe(0.6);
    expect(sleepQualityFactor(6.99)).toBe(0.6);
  });

  test('7h até 8h30 retorna 100%', () => {
    expect(sleepQualityFactor(7)).toBe(1);
    expect(sleepQualityFactor(8.5)).toBe(1);
  });

  test('8h31 até 10h retorna 80%', () => {
    expect(sleepQualityFactor(8.51)).toBe(0.8);
    expect(sleepQualityFactor(10)).toBe(0.8);
  });

  test('10h01 até 12h retorna 50%', () => {
    expect(sleepQualityFactor(10.01)).toBe(0.5);
    expect(sleepQualityFactor(12)).toBe(0.5);
  });

  test('acima de 12h retorna 20%', () => {
    expect(sleepQualityFactor(12.01)).toBe(0.2);
    expect(sleepQualityFactor(14)).toBe(0.2);
  });
});

describe('scoreAndCalendarStatus', () => {
  test('dia sem hábitos registrados retorna 0%', () => {
    const { progressScore } = scoreAndCalendarStatus(baseInput);
    expect(progressScore).toBe(0);
  });

  test('somente água completa retorna 28%', () => {
    const { progressScore } = scoreAndCalendarStatus({
      ...baseInput,
      waterMl: 2000,
    });
    expect(progressScore).toBe(28);
  });

  test('somente alimentação completa retorna 45%', () => {
    const { progressScore } = scoreAndCalendarStatus({
      ...baseInput,
      mealProgress: { inGoalCount: 4, registeredCount: 4 },
    });
    expect(progressScore).toBe(45);
  });

  test('somente treino retorna 22%', () => {
    const { progressScore } = scoreAndCalendarStatus({
      ...baseInput,
      workoutCompleted: true,
    });
    expect(progressScore).toBe(22);
  });

  test('somente sono ideal retorna 5%', () => {
    const { progressScore } = scoreAndCalendarStatus({
      ...baseInput,
      sleepHours: 8,
    });
    expect(progressScore).toBe(5);
  });

  test('sono curto impacta menos que sono ideal', () => {
    const short = scoreAndCalendarStatus({ ...baseInput, sleepHours: 4 }).progressScore;
    const ideal = scoreAndCalendarStatus({ ...baseInput, sleepHours: 8 }).progressScore;
    expect(short).toBe(2);
    expect(ideal).toBe(5);
    expect(short).toBeLessThan(ideal);
  });

  test('sono excessivo impacta menos que sono ideal', () => {
    const excess = scoreAndCalendarStatus({ ...baseInput, sleepHours: 11 }).progressScore;
    const ideal = scoreAndCalendarStatus({ ...baseInput, sleepHours: 8 }).progressScore;
    expect(excess).toBe(3);
    expect(ideal).toBe(5);
    expect(excess).toBeLessThan(ideal);
  });

  test('dia completo pode atingir 100%', () => {
    const { progressScore } = scoreAndCalendarStatus({
      mealProgress: { inGoalCount: 4, registeredCount: 4 },
      waterMl: 2000,
      waterGoalMl: 2000,
      workoutCompleted: true,
      sleepHours: 8,
    });
    expect(progressScore).toBe(100);
  });

  test('dia completo atinge 100% sem calorias registradas', () => {
    const { progressScore, calendarStatus } = scoreAndCalendarStatus({
      mealProgress: { inGoalCount: 3, registeredCount: 3 },
      waterMl: 2000,
      waterGoalMl: 2000,
      workoutCompleted: true,
      sleepHours: 7.5,
    });
    expect(progressScore).toBe(100);
    expect(calendarStatus).toBe('green');
  });

  test('calorias não influenciam o score', () => {
    const { progressScore } = scoreAndCalendarStatus({
      mealProgress: { inGoalCount: 3, registeredCount: 2 },
      waterMl: 1000,
      waterGoalMl: 2000,
      workoutCompleted: false,
      sleepHours: 8,
    });

    expect(progressScore).toBe(49);
  });

  test('não aplica piso ou teto artificial além de 0-100', () => {
    const { progressScore } = scoreAndCalendarStatus({
      ...baseInput,
      waterMl: 500,
    });
    expect(progressScore).toBe(7);
    expect(progressScore).toBeLessThan(28);
  });
});
