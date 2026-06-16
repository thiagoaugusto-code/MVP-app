const {
  scoreAndCalendarStatus,
  sleepQualityFactor,
} = require('../src/services/dailyStateService');

const SLEEP_WEIGHT = 5;

function sleepPoints(hours) {
  return Math.round(sleepQualityFactor(hours) * SLEEP_WEIGHT);
}

const baseInput = {
  mealProgress: { inGoalCount: 4, registeredCount: 0 },
  waterMl: 0,
  waterGoalMl: 2000,
  workoutCompleted: false,
  sleepHours: null,
};

describe('sleepQualityFactor', () => {
  test('0 horas retorna fator 0', () => {
    expect(sleepQualityFactor(0)).toBe(0);
    expect(sleepQualityFactor(null)).toBe(0);
  });

  test('0h a 4h: sono ruim, baixa pontuação', () => {
    expect(sleepQualityFactor(1)).toBe(0.15);
    expect(sleepQualityFactor(4)).toBe(0.15);
    expect(sleepPoints(4)).toBe(1);
  });

  test('5h a 6h: sono aceitável, pontuação intermediária', () => {
    expect(sleepQualityFactor(5)).toBe(0.55);
    expect(sleepQualityFactor(6.99)).toBe(0.55);
    expect(sleepPoints(6)).toBe(3);
  });

  test('7h a 8h30: faixa ideal, pontuação máxima', () => {
    expect(sleepQualityFactor(7)).toBe(1);
    expect(sleepQualityFactor(8.5)).toBe(1);
    expect(sleepPoints(8)).toBe(5);
  });

  test('8h30 a 10h: ainda bom, leve redução', () => {
    expect(sleepQualityFactor(8.51)).toBe(0.85);
    expect(sleepQualityFactor(10)).toBe(0.85);
    expect(sleepPoints(9)).toBe(4);
  });

  test('10h a 12h: excesso, redução significativa', () => {
    expect(sleepQualityFactor(10.01)).toBe(0.35);
    expect(sleepQualityFactor(12)).toBe(0.35);
    expect(sleepPoints(12)).toBe(2);
  });

  test('acima de 12h: fora do ideal, pontuação mínima', () => {
    expect(sleepQualityFactor(12.01)).toBe(0.1);
    expect(sleepQualityFactor(14)).toBe(0.1);
    expect(sleepPoints(14)).toBe(1);
  });

  test('12h não equivale a 8h em pontos de sono', () => {
    expect(sleepPoints(12)).toBeLessThan(sleepPoints(8));
    expect(sleepPoints(12)).toBe(2);
    expect(sleepPoints(8)).toBe(5);
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
    expect(short).toBe(1);
    expect(ideal).toBe(5);
    expect(short).toBeLessThan(ideal);
  });

  test('sono excessivo impacta menos que sono ideal', () => {
    const excess = scoreAndCalendarStatus({ ...baseInput, sleepHours: 11 }).progressScore;
    const ideal = scoreAndCalendarStatus({ ...baseInput, sleepHours: 8 }).progressScore;
    expect(excess).toBe(2);
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
