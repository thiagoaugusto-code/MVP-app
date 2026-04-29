import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import BottomNavigation from '../components/BottomNavigation';
import StatCard from '../components/StatCard';
import CheckItem from '../components/CheckItem';
import StreakCard from '../components/StreakCard';
import InsightCard from '../components/InsightCard';
import DailySummaryCard from '../components/DailySummaryCard';
import { usersAPI, dailyStateAPI } from '../services/api';
import { useToast } from '../components/toast/ToastProvider';
import styles from './Dashboard.module.css';
import { useWorkoutStore } from '../stores/workoutStore';

function toDateKey(d = new Date()) {
  const x = new Date(d);
  const y = x.getFullYear();
  const m = String(x.getMonth() + 1).padStart(2, '0');
  const day = String(x.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const [dailyState, setDailyState] = useState(null);
  const [user, setUser] = useState(null);
  const [weeklyActiveDays, setWeeklyActiveDays] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showGoalsModal, setShowGoalsModal] = useState(false);
  const [goalForm, setGoalForm] = useState({
    caloriesGoal: 2000,
    waterGoalMl: 2000,
    mealsGoal: 3,
    workoutGoal: 1,
  });
  const formatMealType = (type) => {
  const map = {
    breakfast: 'Café da Manhã',
    lunch: 'Almoço',
    dinner: 'Jantar',
    snack: 'Lanche',
    pre_workout: 'Pré-treino',
    post_workout: 'Pós-treino',
  };
  return map[type] || type;
};

  const dateKey = toDateKey();

  const loadData = useCallback(async () => {
    try {
      const [stateRes, userRes, recentRes] = await Promise.all([
        dailyStateAPI.get(dateKey),
        usersAPI.getProfile(),
        dailyStateAPI.getRecent(7),
      ]);
      setDailyState(stateRes.data.state);
      setUser(userRes.data);
      const active = (recentRes.data.days || []).filter((d) => d.progressScore > 0).length;
      setWeeklyActiveDays(active);
    } catch (err) {
      console.error(err);
      toast.error('Erro ao carregar seu dia');
    } finally {
      setLoading(false);
    }
  }, [dateKey, toast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const applyAction = async (action, payload = {}) => {
    try {
      const res = await dailyStateAPI.applyAction({ date: dateKey, action, payload });
      setDailyState(res.data.state);
    } catch (e) {
      toast.error(e.response?.data?.error || 'Não foi possível salvar');
    }
  };

  const handleCheckChange = async (key, value) => {
    if (key === 'water') {
      await applyAction('SET_WATER_LITERS', { liters: value });
      return;
    }
    if (key === 'sleep') {
      await applyAction('UPDATE_SLEEP', { hours: value });
    }
  };
  const handleMealToggle = async (mealId, value) => {
    try {
      await dailyStateAPI.applyAction({
        date: dateKey,
        action: 'COMPLETE_MEAL_BY_ID',
        payload: { mealId, done: value },
      });

      loadData();
    } catch (e) {
      toast.error('Erro ao atualizar refeição');
    }
  };



  const openGoals = () => {
    if (dailyState?.goals) {
      setGoalForm({
        caloriesGoal: dailyState.goals.caloriesGoal,
        waterGoalMl: dailyState.goals.waterGoalMl,
        mealsGoal: dailyState.goals.mealsGoal,
        workoutGoal: dailyState.goals.workoutGoal,
      });
    }
    setShowGoalsModal(true);
  };

  const saveGoals = async () => {
    await applyAction('UPDATE_GOAL', {
      caloriesGoal: Number(goalForm.caloriesGoal),
      waterGoalMl: Number(goalForm.waterGoalMl),
      mealsGoal: Number(goalForm.mealsGoal),
      workoutGoal: Number(goalForm.workoutGoal),
    });

    await loadData();

    setShowGoalsModal(false);
    toast.success('Metas atualizadas');
  };

  const meals = dailyState?.meals || [];
  const totalCalories = dailyState?.caloriesConsumed ?? 0;
  const completedMeals = meals.filter((m) => m.completed).length;
  const mealPercentage = meals.length > 0 ? Math.round((completedMeals / meals.length) * 100) : 0;
  const streak = user?.streak || 0;

  const waterGoalMl = dailyState?.goals?.waterGoalMl || 2000;
  const waterLitersMax = Math.max(1, Math.ceil(waterGoalMl / 1000));
  const waterLitersValue = Math.min(waterLitersMax, Math.round((dailyState?.waterMl || 0) / 1000));

  const sleepHours = dailyState?.sleepHours ?? 0;

  const { workouts, toggleWorkout } = useWorkoutStore();
  const activities = workouts;
  const totalActivities = activities.length;
  const completedActivities = activities.filter(a => a.completed).length;
  const workoutPercentage = totalActivities
    ? Math.round((completedActivities / totalActivities) * 100)
    : 0;

  if (loading || !dailyState) {
    return <div className="text-gray-900 dark:text-white">Carregando...</div>;
  }

  
  
  return (
    <div className={`${styles.dashboard} bg-gray-100 dark:bg-gray-900`}>
      <Header />

      <main className={styles.main}>
        <div className={styles.container}>
          <section className={styles.greeting}>
            <h1 className="text-gray-900 dark:text-white">Bem-vindo de volta! 👋</h1>
            <p className="text-gray-600 dark:text-gray-300">Hoje é um ótimo dia para se cuidar</p>
          </section>

          <DailySummaryCard
            dailyState={dailyState}
            weeklyActiveDays={weeklyActiveDays}
            onQuickWater={(amount = 100) => applyAction('ADD_WATER', { ml: amount })}
            onQuickWorkoutToggle={() =>
              applyAction('COMPLETE_WORKOUT', { done: !dailyState.workout?.completed })
            }
            onEditGoals={openGoals}
          />

          <section className={styles.statsGrid}>
            <StatCard
              icon="🔥"
              title="Kcal"
              value={totalCalories}
              unit="kcal"
              trend={{
                positive: totalCalories <= (dailyState.goals?.caloriesGoal || 2000),
                value: `Meta ${dailyState.goals?.caloriesGoal || 2000}`,
              }}
            />
            <StreakCard streak={streak} />
          </section>

          <section className={styles.section}>
            <h2 className={`${styles.sectionTitle} text-gray-900 dark:text-white`}>Checklist Diário</h2>
            <div className={styles.checklist}>
              {meals.map((meal) => (
                <CheckItem
                  key={meal.id}
                  id={meal.id}
                  type="meal"
                  label={formatMealType(meal.mealType)}
                  checked={Boolean(meal.completed)}
                  onChange={(checked) => handleMealToggle(meal.id, checked)}
                  onLabelClick={() => navigate(`/diet?meal=${meal.mealType}`)}
                />
              ))}
              {activities.map((activity) => (
                <CheckItem
                  key={activity.id}
                  id={activity.id}
                  type="workout"
                  label={activity.name}
                  checked={Boolean(activity.completed)}
                  onChange={() => toggleWorkout(activity.id)}
                  onLabelClick={() => navigate('/workout')}
                />
              ))}
              
              <CheckItem
                id="sleep"
                type="sleep"
                label="Sono"
                value={sleepHours}
                maxValue={8}
                onChange={(val) => handleCheckChange('sleep', val)}
              />
            </div>
          </section>

          <section className={styles.section}>
            <InsightCard />
          </section>

          <section className={styles.section}>
            <h2 className={`${styles.sectionTitle} text-gray-900 dark:text-white`}>Checklist</h2>
            <div className={styles.quickLinks}>
              <button className={styles.quickLink} onClick={() => navigate('/diet?meal=breakfast')} type="button">
                <span>🥗</span>
                <span>Adicionar Refeição</span>
              </button>
              <button className={styles.quickLink} onClick={() => navigate('/workout')} type="button">
                <span>🏃</span>
                <span>Registrar Treino</span>
              </button>
              <button className={styles.quickLink} onClick={() => navigate('/progress')} type="button">
                <span>📸</span>
                <span>Registrar Progresso</span>
              </button>
            </div>
          </section>

          <div className={styles.spacer} />
        </div>
      </main>

      {showGoalsModal && (
        <div className={styles.goalsOverlay}>
          <div className={styles.goalsModal}>
            <h3>Personalizar metas diárias</h3>
            <p>As metas ficam salvas no servidor e alimentam o seu resumo diário.</p>
            <label>
              Meta de calorias
              <input
                type="number"
                min="1200"
                max="4500"
                value={goalForm.caloriesGoal}
                onChange={(e) => setGoalForm((prev) => ({ ...prev, caloriesGoal: e.target.value }))}
              />
            </label>
            <label>
              Meta de água (ml)
              <input
                type="number"
                min="500"
                max="6000"
                step="100"
                value={goalForm.waterGoalMl}
                onChange={(e) => setGoalForm((prev) => ({ ...prev, waterGoalMl: e.target.value }))}
              />
            </label>
            <label>
              Meta de refeições principais 
              <input
                type="number"
                min="1"
                max="6"
                value={goalForm.mealsGoal}
                onChange={(e) => setGoalForm((prev) => ({ ...prev, mealsGoal: e.target.value }))}
              />
            </label>
            <label>
              Meta de treinos principais
              <input
                type="number"
                min="0"
                max="6"
                value={goalForm.workoutGoal}
                onChange={(e) => setGoalForm((prev) => ({ ...prev, workoutGoal: e.target.value }))}
              />
            </label>
            <div className={styles.goalsActions}>
              <button type="button" onClick={() => setShowGoalsModal(false)}>
                Cancelar
              </button>
              <button type="button" className={styles.primaryBtn} onClick={saveGoals}>
                Salvar metas
              </button>
            </div>
          </div>
        </div>
      )}

      <BottomNavigation />
    </div>
  );
};

export default Dashboard;
