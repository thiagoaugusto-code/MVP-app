import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './DailySummaryCard.module.css';

function mealLabel(mealType) {
  switch (mealType) {
    case 'breakfast':
      return 'Café da Manhã';
    case 'lunch':
      return 'Almoço';
    case 'dinner':
      return 'Jantar';
    case 'snack':
      return 'Lanches';
    case 'pre_workout':
      return 'Pré Treino';
    case 'post_workout':
      return 'Pós Treino';
    default:
      return 'Refeição';
  }
}

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
  const goals = dailyState?.goals || {};
  const calorieGoal = goals.caloriesGoal || 2000;
  const waterGoalMl = goals.waterGoalMl || 2000;
  const mealGoal = goals.mealsGoal || 3;
  const caloriesConsumed = dailyState?.caloriesConsumed || 0;
  const waterMl = dailyState?.waterMl || 0;
  const meals = dailyState?.meals || [];
  const activities = dailyState?.workout?.activities || [];
  const progress = Math.min((waterMl / waterGoalMl) * 100, 100);
  const isDone = waterMl >= waterGoalMl;

  const totalActivities = activities.length;

  const completedActivities = activities.filter(a => a.completed).length;

  const workoutPercentage = totalActivities
    ? Math.round((completedActivities / totalActivities) * 100)
    : 0;

  const kcalRemaining = Math.max(calorieGoal - caloriesConsumed, 0);
  const hydrationPendingL = Math.max((waterGoalMl - waterMl) / 1000, 0);
  const mealsProgress = Math.min(
    ['breakfast', 'lunch', 'dinner'].filter((mt) => meals.find((m) => m.mealType === mt)?.completed).length,
    mealGoal
  );

  const breakfastDone = Boolean(meals.find((m) => m.mealType === 'breakfast')?.completed);

  const nextMeal = useMemo(() => {
    const order = getMealOrderByTime();
    const byType = new Map(meals.map((m) => [m.mealType, m]));
    for (const t of order) {
      const m = byType.get(t);
      if (!m) return { type: t, status: 'missing' };
      if (!m.completed) return { type: t, status: 'pending' };
    }
    const pending = meals.find((m) => !m.completed);
    if (pending) return { type: pending.mealType, status: 'pending' };
    return null;
  }, [meals]);

  const handleWaterClick = () => {
  onQuickWater(100); // ou 50
};

  const cta = useMemo(() => {
    const h = new Date().getHours();
    if (h < 11 && !breakfastDone) {
      return { label: 'Registrar Café da Manhã', action: () => navigate('/diet?meal=breakfast') };
    }
    if (hydrationPendingL > 0.05) {
      return { label: 'Beber 1 copo de água', action: onQuickWater };
    }
    if (completedActivities < totalActivities) {
      return { label: 'Continuar treino', action: () => navigate('/workout') };
    }
    if (nextMeal) {
      return { label: `Abrir ${mealLabel(nextMeal.type)}`, action: () => navigate(`/diet?meal=${nextMeal.type}`) };
    }
    return { label: 'Ver calendário', action: () => navigate('/calendar') };
  }, [breakfastDone, hydrationPendingL, navigate, nextMeal, onQuickWater, completedActivities, totalActivities]);

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
          <div className={styles.kpiValueSmall}>{nextMeal ? mealLabel(nextMeal.type) : 'Tudo feito'}</div>
          <button
            type="button"
            className={styles.linkBtn}
            onClick={() => (nextMeal ? navigate(`/diet?meal=${nextMeal.type}`) : navigate('/diet'))}
          >
            Abrir plano alimentar →
          </button>
        </div>

        <div className={styles.kpi}>
          <div className={styles.kpiLabel}>Meta de refeições</div>
          <div className={styles.kpiValueSmall}>
            {mealsProgress}/{mealGoal}
          </div>
          <div className={styles.kpiHint}>Principais refeições concluídas</div>
        </div>

      
         <div
          className={`${styles.kpi} ${styles.clickable}`}
          onClick={() => navigate('/workout')}
          role='button'
        >
          <div className={styles.kpiLabel}>Treino</div>

          <div className={styles.kpiValueSmall}>
            {totalActivities === 0
              ? '-'
              : `${completedActivities}/${totalActivities}`}
          </div>

          <div className={`${styles.kpiHint} ${styles.linkBtn}`}>
            {totalActivities === 0
              ? 'Abrir treino →'
              : workoutPercentage === 100
                ? 'Treino concluído ✔'
                : `${completedActivities} de ${totalActivities} feitos`}
          </div>
        </div>
        <div className={styles.kpi}>
          <div className={styles.kpiLabel}>Metas de treino</div>

          <div className={styles.kpiValueSmall}>
            {totalActivities === 0
              ? '-'
              : `${completedActivities}/${totalActivities}`}
          </div>

          <div className={styles.kpiHint}>
            Principais treinos concluídos
          </div>
        </div>
      </div>

      <button
        type="button"
        className={`${styles.waterButton} ${waterMl >= waterGoalMl ? styles.filled : ''}`}
        onClick={handleWaterClick}
      >
        <div
          className={styles.waterProgress}
          style={{ width: `${progress}%` }}
        />

        <span className={styles.waterText}>
          {waterMl >= waterGoalMl
            ? "Meta concluída 💧"
            : "Adicionar 100ml"}
        </span>

        {/* 👇 NOVO */}
        <span className={styles.waterMini}>
          {Math.floor(waterMl / 1000)}.{Math.floor((waterMl % 1000) / 100)}L / {(waterGoalMl / 1000)}L
        </span>
      </button>
    </section>
  );
}
