import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import BottomNavigation from '../components/BottomNavigation';
import StatCard from '../components/StatCard';
import CheckItem from '../components/CheckItem';
import StreakCard from '../components/StreakCard';
import InsightCard from '../components/InsightCard';
import DailySummaryCard from '../components/DailySummaryCard';
import { dietAPI, usersAPI, dailyChecksAPI } from '../services/api';
import { useToast } from '../components/toast/ToastProvider';
import styles from './Dashboard.module.css';

const DEFAULT_GOALS = {
  calories: 2000,
  water: 2,
  meals: 3,
};

const Dashboard = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const [dailyChecks, setDailyChecks] = useState({
    breakfast: false,
    lunch: false,
    dinner: false,
    workout: false,
    water: 0,
    sleep: 0,
  });
  const [meals, setMeals] = useState([]);
  const [user, setUser] = useState(null);
  const [weeklyActiveDays, setWeeklyActiveDays] = useState(0);
  const [dailyGoals, setDailyGoals] = useState(DEFAULT_GOALS);
  const [showGoalsModal, setShowGoalsModal] = useState(false);
  const [goalForm, setGoalForm] = useState(DEFAULT_GOALS);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [mealsRes, userRes, checksRes] = await Promise.all([
        dietAPI.getMeals(new Date().toISOString().split('T')[0]),
        usersAPI.getProfile(),
        dailyChecksAPI.getChecks()
      ]);
      setMeals(mealsRes.data);
      setUser(userRes.data);
      loadGoals(userRes.data?.id);
      
      // Mapear checks
      const checks = checksRes.data;
      setDailyChecks({
        breakfast: checks.breakfast?.done || false,
        lunch: checks.lunch?.done || false,
        dinner: checks.dinner?.done || false,
        workout: checks.workout?.done || false,
        water: checks.water?.value || 0,
        sleep: checks.sleep?.value || 0,
      });

      await loadWeeklyActivity();
    } catch (err) {
      console.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const loadGoals = (userId) => {
    if (!userId) return;
    const key = `dailyGoals:${userId}`;
    const raw = localStorage.getItem(key);
    if (!raw) return;
    try {
      const parsed = JSON.parse(raw);
      const normalized = {
        calories: Number(parsed.calories) || DEFAULT_GOALS.calories,
        water: Number(parsed.water) || DEFAULT_GOALS.water,
        meals: Number(parsed.meals) || DEFAULT_GOALS.meals,
      };
      setDailyGoals(normalized);
      setGoalForm(normalized);
    } catch {
      setDailyGoals(DEFAULT_GOALS);
      setGoalForm(DEFAULT_GOALS);
    }
  };

  const loadWeeklyActivity = async () => {
    const today = new Date();
    const dates = Array.from({ length: 7 }).map((_, idx) => {
      const d = new Date(today);
      d.setDate(today.getDate() - idx);
      return d.toISOString().split('T')[0];
    });

    const checksByDay = await Promise.all(dates.map((date) => dailyChecksAPI.getChecks(date)));
    const activeCount = checksByDay.reduce((acc, res) => {
      const c = res.data || {};
      const hasMeal = Boolean(c.breakfast?.done || c.lunch?.done || c.dinner?.done);
      const hasWorkout = Boolean(c.workout?.done);
      const hasWater = (c.water?.value || 0) > 0;
      return acc + (hasMeal || hasWorkout || hasWater ? 1 : 0);
    }, 0);
    setWeeklyActiveDays(activeCount);
  };

  const saveGoals = () => {
    if (!user?.id) return;
    const next = {
      calories: Math.min(Math.max(Number(goalForm.calories) || 0, 1200), 4500),
      water: Math.min(Math.max(Number(goalForm.water) || 0, 1), 6),
      meals: Math.min(Math.max(Number(goalForm.meals) || 0, 2), 6),
    };
    localStorage.setItem(`dailyGoals:${user.id}`, JSON.stringify(next));
    setDailyGoals(next);
    setShowGoalsModal(false);
    toast.success('Metas diárias atualizadas');
  };

  const handleCheckChange = async (key, value) => {
    try {
      setDailyChecks(prev => ({ ...prev, [key]: value }));
      
      if (key === 'breakfast' || key === 'lunch' || key === 'dinner') {
        await dailyChecksAPI.updateCheck(key, { done: value });
      } else if (key === 'workout') {
        await dailyChecksAPI.updateCheck('workout', { done: value });
      } else if (key === 'water' || key === 'sleep') {
        await dailyChecksAPI.updateCheck(key, { value });
      }
      
      // Recarregar dados para atualizar streak e stats
      loadData();
    } catch (err) {
      console.error('Erro ao salvar check');
    }
  };

  const totalCalories = meals.reduce((sum, meal) => sum + (meal.totalCalories || 0), 0);
  const completedMeals = meals.filter(m => m.completed).length;
  const mealPercentage = meals.length > 0 ? Math.round((completedMeals / meals.length) * 100) : 0;
  const streak = user?.streak || 0;

  if (loading) {
    return <div>Carregando...</div>;
  }

  return (
    <div className={styles.dashboard}>
      <Header />
      
      <main className={styles.main}>
        <div className={styles.container}>
          {/* Greeting */}
          <section className={styles.greeting}>
            <h1>Bem-vindo de volta! 👋</h1>
            <p>Hoje é um ótimo dia para se cuidar</p>
          </section>

          <DailySummaryCard
            totalCalories={totalCalories}
            meals={meals}
            dailyChecks={dailyChecks}
            goals={dailyGoals}
            weeklyActiveDays={weeklyActiveDays}
            onQuickWater={() => handleCheckChange('water', Math.min((dailyChecks.water || 0) + 1, dailyGoals.water))}
            onQuickWorkoutToggle={() => handleCheckChange('workout', !dailyChecks.workout)}
            onEditGoals={() => setShowGoalsModal(true)}
          />

          {/* Stats Grid */}
          <section className={styles.statsGrid}>
            <StatCard
              icon="🔥"
              title="Kcal"
              value={totalCalories}
              unit="kcal"
              trend={{ positive: true, value: '+150 vs ontem' }}
            />
            <StatCard
              icon="🍽️"
              title="Refeições"
              value={`${mealPercentage}%`}
              trend={{ positive: mealPercentage === 100, value: `${completedMeals} de ${meals.length}` }}
            />
            <StatCard
              icon="💪"
              title="Treino"
              value={dailyChecks.workout ? '✓' : '○'}
              trend={dailyChecks.workout ? { positive: true, value: '45 min' } : null}
            />
            <StreakCard streak={streak} />
          </section>

          {/* Daily Checklist */}
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Checklist Diário</h2>
            <div className={styles.checklist}>
              <CheckItem
                id="breakfast"
                type="meal"
                label="Café da Manhã"
                checked={dailyChecks.breakfast}
                onChange={(checked) => handleCheckChange('breakfast', checked)}
                onLabelClick={() => navigate('/diet?meal=breakfast')}
              />
              <CheckItem
                id="lunch"
                type="meal"
                label="Almoço"
                checked={dailyChecks.lunch}
                onChange={(checked) => handleCheckChange('lunch', checked)}
                onLabelClick={() => navigate('/diet?meal=lunch')}
              />
              <CheckItem
                id="dinner"
                type="meal"
                label="Jantar"
                checked={dailyChecks.dinner}
                onChange={(checked) => handleCheckChange('dinner', checked)}
                onLabelClick={() => navigate('/diet?meal=dinner')}
              />
              <CheckItem
                id="workout"
                type="workout"
                label="Treino concluído"
                checked={dailyChecks.workout}
                onChange={(checked) => handleCheckChange('workout', checked)}
                onLabelClick={() => navigate('/workout')}
              />
              <CheckItem
                id="water"
                type="water"
                label="Água"
                value={dailyChecks.water}
                maxValue={dailyGoals.water}
                onChange={(val) => handleCheckChange('water', val)}
              />
              <CheckItem
                id="sleep"
                type="sleep"
                label="Sono"
                value={dailyChecks.sleep}
                maxValue={8}
                onChange={(val) => handleCheckChange('sleep', val)}
              />
            </div>
          </section>

          {/* Insights */}
          <section className={styles.section}>
            <InsightCard />
          </section>

          {/* Quick Links */}
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Ações Rápidas</h2>
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

          {/* Spacer for bottom nav */}
          <div className={styles.spacer} />
        </div>
      </main>

      {showGoalsModal && (
        <div className={styles.goalsOverlay}>
          <div className={styles.goalsModal}>
            <h3>Personalizar metas diárias</h3>
            <p>Defina metas realistas para manter constância.</p>
            <label>
              Meta de calorias
              <input
                type="number"
                min="1200"
                max="4500"
                value={goalForm.calories}
                onChange={(e) => setGoalForm((prev) => ({ ...prev, calories: e.target.value }))}
              />
            </label>
            <label>
              Meta de água (L)
              <input
                type="number"
                min="1"
                max="6"
                value={goalForm.water}
                onChange={(e) => setGoalForm((prev) => ({ ...prev, water: e.target.value }))}
              />
            </label>
            <label>
              Meta de refeições concluídas
              <input
                type="number"
                min="2"
                max="6"
                value={goalForm.meals}
                onChange={(e) => setGoalForm((prev) => ({ ...prev, meals: e.target.value }))}
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