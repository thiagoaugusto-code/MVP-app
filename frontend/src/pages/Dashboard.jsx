import { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Header from '../components/Header';
import BottomNavigation from '../components/BottomNavigation';
import StatCard from '../components/StatCard';
import CheckItem from '../components/CheckItem';
import StreakCard from '../components/StreakCard';
import InsightCard from '../components/InsightCard';
import DailySummaryCard from '../components/DailySummaryCard';
import { usersAPI, dailyStateAPI } from '../services/api';
import {
  getMealLabel,
  isMealRegistered,
  getActiveGoalMeals,
  sortMealsByType,
} from '../constants/meals';
import { useToast } from '../components/toast/ToastProvider';
import styles from './Dashboard.module.css';
import WorkoutRoutineSetup from './WorkoutRoutineSetup';


function toDateKey(d = new Date()) {
  const x = new Date(d);
  const y = x.getFullYear();
  const m = String(x.getMonth() + 1).padStart(2, '0');
  const day = String(x.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const [dailyState, setDailyState] = useState(null);
  const [user, setUser] = useState(null);
  const [weeklyActiveDays, setWeeklyActiveDays] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showGoalsModal, setShowGoalsModal] = useState(false);
  const [goalForm, setGoalForm] = useState({
    caloriesGoal: 2000,
    waterGoalMl: 2000,
    workoutGoal: 1,
  });
  const [showSetup, setShowSetup] = useState(false);


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
  }, [loadData, location.key]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') loadData();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [loadData]);

  useEffect(() => {
    if (!dailyState) return;

    const hasRoutine =
      dailyState?.checklist?.some(
        item => item.kind === 'session' && item.sessions?.length > 0
      );

    if (!hasRoutine) {
      setShowSetup(true);
    }
  }, [dailyState]);

  const applyAction = async (action, payload = {}) => {
    try {
      const res = await dailyStateAPI.applyAction({
        date: dateKey,
        action,
        payload,
      });

      setDailyState(res.data.state);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCheckChange = async (key, value) => {
    if (key === 'water') {
      await applyAction('ADD_WATER', { ml: value });
      return;
    } 
    if (key === 'sleep') {
      await applyAction('UPDATE_SLEEP', { hours: value });
    }
  };
  const handleMealToggle = async (mealId, value) => {
    try {
      const res = await dailyStateAPI.applyAction({
        date: dateKey,
        action: 'COMPLETE_MEAL_BY_ID',
        payload: { mealId, done: value },
      });
      setDailyState(res.data.state);
    } catch (e) {
      toast.error(e.response?.data?.error || 'Erro ao atualizar refeição');
    }
  };



  const openGoals = () => {
    if (dailyState?.goals) {
      setGoalForm({
        caloriesGoal: dailyState.goals.caloriesGoal,
        waterGoalMl: dailyState.goals.waterGoalMl,
        workoutGoal: dailyState.goals.workoutGoal,
      });
    }
    setShowGoalsModal(true);
  };

  const saveGoals = async () => {
    await applyAction('UPDATE_GOAL', {
      caloriesGoal: Number(goalForm.caloriesGoal),
      waterGoalMl: Number(goalForm.waterGoalMl),
      workoutGoal: Number(goalForm.workoutGoal),
    });

    await loadData();

    setShowGoalsModal(false);
    toast.success('Metas atualizadas');
  };

  const meals = useMemo(
    () => sortMealsByType(getActiveGoalMeals(dailyState)),
    [dailyState]
  );
  const totalCalories = dailyState?.caloriesConsumed ?? 0;
  const streak = user?.streak || 0;

  const waterGoalMl = dailyState?.goals?.waterGoalMl || 2000;
  const waterLitersMax = Math.max(1, Math.ceil(waterGoalMl / 1000));
  const waterLitersValue = Math.min(waterLitersMax, Math.round((dailyState?.waterMl || 0) / 1000));

  const sleepHours = dailyState?.sleepHours ?? 0;

  const activities = [
      ...(dailyState?.workout?.plan || []),
      ...(dailyState?.workout?.exercises || []),
    ];

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
            onQuickWorkoutToggle={() => navigate('/workout')}
            onEditGoals={openGoals}
          />
          {/* 🆕 NOVO: PLANO DE TREINO DO DIA (ROUTINE LAYER) */}
          {dailyState?.workoutPlan && (
            <section className={styles.section}>
              <h2 className={`${styles.sectionTitle} text-gray-900 dark:text-white`}>
                Treino do dia
              </h2>

              {dailyState.workoutPlan.length === 0 ? (
                <div className={styles.emptyState}>
                  <p>Hoje não há treino programado</p>
                  <button onClick={() => navigate('/workout')}>
                    Configurar rotina
                  </button>
                </div>
              ) : (
                <div className={styles.workoutPlan}>
                  {dailyState.workoutPlan.map((w) => (
                    <div
                      key={w.id}
                      className={styles.workoutPlanItem}
                    >
                      <div>
                        <strong>{w.name}</strong>
                        <p>{w.type}</p>
                      </div>

                      <button onClick={() => navigate('/workout')}>
                        Iniciar
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </section>
          )}

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
                  label={getMealLabel(meal.mealType)}
                  checked={isMealRegistered(meal)}
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
                  onChange={(checked) =>
                    applyAction('TOGGLE_WORKOUT_ACTIVITY', {
                      activityId: activity.id,
                      done: checked,
                    })
                  }
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
            <p style={{ fontSize: '0.85rem', color: '#6b7280', margin: '0 0 0.5rem' }}>
              Refeições da meta são definidas no plano alimentar.
            </p>
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

      {showSetup && (
        <WorkoutRoutineSetup
          onClose={() => setShowSetup(false)}
          onSave={ async (sessions) => {
            await applyAction('SET_SESSIONS', { sessions });
            setShowSetup(false);
            loadData();
          }}
        />
      )}

      <BottomNavigation />
    </div>
  );
};

export default Dashboard;
