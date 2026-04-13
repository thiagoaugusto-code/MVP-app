import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './DailySummaryCard.module.css';

const DEFAULT_CALORIE_GOAL = 2000;

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
  totalCalories,
  meals,
  dailyChecks,
  goals,
  weeklyActiveDays,
  onQuickWater,
  onQuickWorkoutToggle,
  onEditGoals,
}) {
  const navigate = useNavigate();

  const calorieGoal = goals?.calories || DEFAULT_CALORIE_GOAL;
  const hydrationTarget = goals?.water || 2;
  const mealGoal = goals?.meals || 3;
  const kcalRemaining = Math.max(calorieGoal - (totalCalories || 0), 0);
  const hydrationPending = Math.max(hydrationTarget - (dailyChecks?.water || 0), 0);
  const workoutPending = !dailyChecks?.workout;
  const mealsProgress = Math.min(meals.filter((m) => m.completed).length, mealGoal);

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

  const cta = useMemo(() => {
    const h = new Date().getHours();
    if (h < 11 && !dailyChecks?.breakfast) {
      return { label: 'Registrar Café da Manhã', action: () => navigate('/diet?meal=breakfast') };
    }
    if (hydrationPending > 0) {
      return { label: 'Beber 1 copo de água', action: onQuickWater };
    }
    if (workoutPending) {
      return { label: 'Registrar treino', action: () => navigate('/workout') };
    }
    if (nextMeal) {
      return { label: `Abrir ${mealLabel(nextMeal.type)}`, action: () => navigate(`/diet?meal=${nextMeal.type}`) };
    }
    return { label: 'Ver calendário', action: () => navigate('/calendar') };
  }, [dailyChecks?.breakfast, hydrationPending, navigate, nextMeal, onQuickWater, workoutPending]);

  return (
    <section className={styles.wrap} aria-label="Resumo do dia">
      <div className={styles.header}>
        <div>
          <h2 className={styles.title}>Resumo do Dia</h2>
          <p className={styles.subtitle}>1 toque para seguir com o que importa agora</p>
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
          <div className={styles.kpiLabel}>Kcal restantes</div>
          <div className={styles.kpiValue}>{kcalRemaining}</div>
          <div className={styles.kpiHint}>Meta: {calorieGoal} kcal</div>
        </div>

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
          <div className={styles.kpiValueSmall}>{mealsProgress}/{mealGoal}</div>
          <div className={styles.kpiHint}>Concluídas hoje</div>
        </div>

        <div className={styles.kpi}>
          <div className={styles.kpiLabel}>Hidratação pendente</div>
          <div className={styles.kpiValueSmall}>
            {hydrationPending > 0 ? `${hydrationPending}L` : 'OK'}
          </div>
          <button
            type="button"
            className={styles.secondaryBtn}
            onClick={onQuickWater}
            disabled={hydrationPending <= 0}
          >
            + água
          </button>
        </div>

        <div className={styles.kpi}>
          <div className={styles.kpiLabel}>Treino</div>
          <div className={styles.kpiValueSmall}>{workoutPending ? 'Pendente' : 'Concluído'}</div>
          <button
            type="button"
            className={styles.secondaryBtn}
            onClick={onQuickWorkoutToggle}
          >
            {workoutPending ? 'Marcar como feito' : 'Desmarcar'}
          </button>
        </div>
      </div>

      <button type="button" className={styles.primaryCta} onClick={cta.action}>
        {cta.label}
      </button>
    </section>
  );
}

