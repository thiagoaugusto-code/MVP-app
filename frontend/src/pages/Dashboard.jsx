import { useState } from 'react';
import Header from '../components/Header';
import BottomNavigation from '../components/BottomNavigation';
import StatCard from '../components/StatCard';
import CheckItem from '../components/CheckItem';
import StreakCard from '../components/StreakCard';
import InsightCard from '../components/InsightCard';
import styles from './Dashboard.module.css';

const Dashboard = () => {
  const [dailyChecks, setDailyChecks] = useState({
    meal: false,
    workout: false,
    water: 0,
    sleep: 0,
  });

  const handleCheckChange = (key, value) => {
    setDailyChecks(prev => ({ ...prev, [key]: value }));
  };

  const streak = 5;
  const insight = "Você está indo bem! Continue assim.";
  const todayCalories = 1800;
  const mealPercentage = 75;
  const workoutComplete = true;

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
              value={todayCalories}
              unit="kcal"
              trend={{ positive: true, value: '+150 vs ontem' }}
            />
            <StatCard
              icon="🍽️"
              title="Refeições"
              value={`${mealPercentage}%`}
              trend={{ positive: mealPercentage === 100, value: '3 de 4' }}
            />
            <StatCard
              icon="💪"
              title="Treino"
              value={workoutComplete ? '✓' : '○'}
              trend={workoutComplete ? { positive: true, value: '45 min' } : null}
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
                checked={dailyChecks.meal}
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