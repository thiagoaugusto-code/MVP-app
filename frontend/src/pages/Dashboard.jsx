import { useState, useEffect } from 'react';
import Header from '../components/Header';
import BottomNavigation from '../components/BottomNavigation';
import StatCard from '../components/StatCard';
import CheckItem from '../components/CheckItem';
import StreakCard from '../components/StreakCard';
import InsightCard from '../components/InsightCard';
import { dietAPI, usersAPI } from '../services/api';
import styles from './Dashboard.module.css';

const Dashboard = () => {
  const [dailyChecks, setDailyChecks] = useState({
    meal: false,
    workout: false,
    water: 0,
    sleep: 0,
  });
  const [meals, setMeals] = useState([]);
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [mealsRes, userRes] = await Promise.all([
        dietAPI.getMeals(new Date().toISOString().split('T')[0]),
        usersAPI.getProfile()
      ]);
      setMeals(mealsRes.data);
      setUser(userRes.data);
    } catch (err) {
      console.error('Erro ao carregar dados');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckChange = (key, value) => {
    setDailyChecks(prev => ({ ...prev, [key]: value }));
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
                id="meal"
                type="meal"
                label="Refeições do dia"
                checked={mealPercentage === 100}
                onChange={(checked) => handleCheckChange('meal', checked)}
              />
              <CheckItem
                id="workout"
                type="workout"
                label="Treino concluído"
                checked={dailyChecks.workout}
                onChange={(checked) => handleCheckChange('workout', checked)}
              />
              <CheckItem
                id="water"
                type="water"
                label="Água"
                value={dailyChecks.water}
                maxValue={2}
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

          {/* Insight */}
          <section className={styles.section}>
            <InsightCard insight={insight} />
          </section>

          {/* Quick Links */}
          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Ações Rápidas</h2>
            <div className={styles.quickLinks}>
              <button className={styles.quickLink}>
                <span>🥗</span>
                <span>Adicionar Refeição</span>
              </button>
              <button className={styles.quickLink}>
                <span>🏃</span>
                <span>Registrar Treino</span>
              </button>
              <button className={styles.quickLink}>
                <span>📸</span>
                <span>Tirar Foto</span>
              </button>
            </div>
          </section>

          {/* Spacer for bottom nav */}
          <div className={styles.spacer} />
        </div>
      </main>

      <BottomNavigation />
    </div>
  );
};

export default Dashboard;