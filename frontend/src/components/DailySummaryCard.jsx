import { useMemo, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getMealLabel,
  isMealRegistered,
  getActiveGoalMeals,
} from '../constants/meals';
import styles from './DailySummaryCard.module.css';

function getMealOrderByTime(now = new Date()) {
  const h = now.getHours();
  if (h < 10) return ['breakfast', 'snack', 'lunch', 'pre_workout', 'post_workout', 'dinner'];
  if (h < 14) return ['lunch', 'snack', 'pre_workout', 'post_workout', 'dinner', 'breakfast'];
  if (h < 18) return ['snack', 'pre_workout', 'post_workout', 'dinner', 'breakfast', 'lunch'];
  return ['dinner', 'post_workout', 'snack', 'breakfast', 'lunch', 'pre_workout'];
}

export default function DailySummaryCard({
  dailyState,
  weeklyActiveDays,
  onQuickWater,
  onQuickWorkoutToggle,
  onEditGoals,
}) {
  const navigate = useNavigate();
  const [pulse, setPulse] = useState(false);
  const goals = dailyState?.goals || {};
  const calorieGoal = goals.caloriesGoal || 2000;
  const waterGoalMl = goals.waterGoalMl || 2000;
  const caloriesConsumed = dailyState?.caloriesConsumed || 0;
  const waterMl = dailyState?.waterMl || 0;
  const meals = getActiveGoalMeals(dailyState);
  const mealProgress = dailyState?.mealProgress || {
    inGoalCount: meals.length,
    registeredCount: meals.filter((m) => isMealRegistered(m)).length,
    percent: meals.length
      ? Math.round(
          (meals.filter((m) => isMealRegistered(m)).length / meals.length) * 100
        )
      : 0,
  };
  const activities = [
    ...(dailyState?.workout?.plan || []),
    ...(dailyState?.workout?.exercises || []),
  ];
  const progress = Math.min((waterMl / waterGoalMl) * 100, 100);

  const workoutGoal = activities.length || 1;

  const nextWorkout = activities.find((activity) => !activity.completed);

  const totalActivities = activities.length;
  const completedActivities = activities.filter((a) => a.completed).length;

  const workoutFill =
    totalActivities > 0 ? completedActivities / totalActivities : 0;

  const workoutState =
    workoutFill === 0
      ? 'empty'
      : workoutFill < 0.3
        ? 'low'
        : workoutFill < 0.7
          ? 'mid'
          : workoutFill < 1
            ? 'high'
            : 'done';

  useEffect(() => {
    if (workoutFill > 0) {
      setPulse(true);
      const t = setTimeout(() => setPulse(false), 400);
      return () => clearTimeout(t);
    }
  }, [workoutFill]);

  const hydrationPendingL = Math.max((waterGoalMl - waterMl) / 1000, 0);

  const nextMeal = useMemo(() => {
    if (meals.length === 0) return null;
    const order = getMealOrderByTime();
    const byType = new Map(meals.map((m) => [m.mealType, m]));
    for (const t of order) {
      const m = byType.get(t);
      if (m && !isMealRegistered(m)) return { type: t, status: 'pending' };
    }
    const pending = meals.find((m) => !isMealRegistered(m));
    if (pending) return { type: pending.mealType, status: 'pending' };
    return null;
  }, [meals]);

  const handleWaterClick = () => {
    onQuickWater(100);
  };

  const cta = useMemo(() => {
    const h = new Date().getHours();
    const breakfastInGoal = meals.find((m) => m.mealType === 'breakfast');
    if (h < 11 && breakfastInGoal && !isMealRegistered(breakfastInGoal)) {
      return { label: 'Registrar Café da Manhã', action: () => navigate('/diet?meal=breakfast') };
    }
    if (hydrationPendingL > 0.05) {
      return { label: 'Beber 1 copo de água', action: onQuickWater };
    }
    if (completedActivities < totalActivities) {
      return { label: 'Continuar treino', action: () => navigate('/workout') };
    }
    if (nextMeal) {
      return { label: `Abrir ${getMealLabel(nextMeal.type)}`, action: () => navigate(`/diet?meal=${nextMeal.type}`) };
    }
    return { label: 'Ver calendário', action: () => navigate('/calendar') };
  }, [hydrationPendingL, navigate, nextMeal, onQuickWater, completedActivities, totalActivities, meals]);

  if (!dailyState) return null;

  return (
    <section className={styles.wrap} aria-label="Resumo do dia">
      <div className={styles.header}>
        <div>
          <h2 className={styles.title}>Resumo do Dia</h2>
          <p className={styles.subtitle}>Estado sincronizado com o servidor</p>
        </div>
        <button className={styles.calendarBtn} onClick={() => navigate('/calendar')} type="button">
          📅
        </button>
      </div>

      <div className={styles.habitRow}>
        <span className={styles.habitText}>Consistência semanal: {weeklyActiveDays}/7 dias ativos</span>
        <button type="button" className={styles.editGoalsBtn} onClick={onEditGoals}>
          Ajustar metas
        </button>
      </div>

      <div className={styles.grid}>
        <div className={styles.kpi}>
          <div className={styles.kpiLabel}>Próxima refeição</div>
          <div className={styles.kpiValueSmall}>{nextMeal ? getMealLabel(nextMeal.type) : 'Tudo feito'}</div>
          <button
            type="button"
            className={styles.linkBtn}
            onClick={() => (nextMeal ? navigate(`/diet?meal=${nextMeal.type}`) : navigate('/diet'))}
          >
            Abrir plano alimentar →
          </button>
        </div>

        <div className={styles.kpi}>
          <div className={styles.kpiLabel}>Meta alimentar do dia</div>
          <div className={styles.kpiValueSmall}>
            {mealProgress.registeredCount}/{mealProgress.inGoalCount}
          </div>
          <div className={styles.kpiHint}>
            {mealProgress.percent}% · refeições na meta registradas
          </div>
        </div>

        <div
          className={`${styles.kpi} ${styles.clickable}`}
          onClick={() => navigate('/workout')}
          role="button"
        >
          <div className={styles.kpiLabel}>Próximo treino</div>
          <div className={styles.kpiValueSmall}>
            {nextWorkout ? nextWorkout.name : 'Registre + treinos'}
          </div>
          <div className={`${styles.kpiHint} ${styles.linkBtn}`}>Registrar treino →</div>
        </div>

        <div
          className={`${styles.kpi} ${styles.workoutKpi} ${styles[workoutState]} ${
            pulse ? styles.pulse : ''
          }`}
        >
          <div className={styles.kpiLabel}>Meta de treinos</div>
          <div className={styles.kpiValueSmall}>
            {workoutGoal === 0 ? 'Registre treinos' : `${Math.round(workoutFill * 100)}%`}
          </div>
          <div className={styles.kpiHint}>
            {workoutGoal === 0
              ? 'Defina sua rotina diária'
              : workoutFill === 1
                ? 'Treino concluído'
                : 'Em progresso'}
          </div>
        </div>
      </div>

      <button
        type="button"
        className={`${styles.waterButton} ${waterMl >= waterGoalMl ? styles.filled : ''}`}
        onClick={handleWaterClick}
      >
        <div className={styles.waterProgress} style={{ width: `${progress}%` }} />
        <span className={styles.waterText}>
          {waterMl >= waterGoalMl ? 'Meta concluída 💧' : 'Adicionar 100ml'}
        </span>
        <span className={styles.waterMini}>
          {Math.floor(waterMl / 1000)}.{Math.floor((waterMl % 1000) / 100)}L / {waterGoalMl / 1000}L
        </span>
      </button>
    </section>
  );
}
