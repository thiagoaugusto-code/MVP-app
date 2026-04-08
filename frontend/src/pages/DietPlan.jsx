import Header from '../components/Header';
import BottomNavigation from '../components/BottomNavigation';
import styles from './DietPlan.module.css';

const DietPlan = () => {
  const meals = [
    { id: 1, name: 'Café da manhã', time: '07:00', calories: 350, completed: true },
    { id: 2, name: 'Lanche da manhã', time: '10:00', calories: 150, completed: true },
    { id: 3, name: 'Almoço', time: '12:30', calories: 800, completed: false },
    { id: 4, name: 'Lanche da tarde', time: '15:30', calories: 200, completed: false },
    { id: 5, name: 'Jantar', time: '19:00', calories: 600, completed: false },
  ];

  const totalCalories = meals.reduce((sum, meal) => sum + meal.calories, 0);
  const completedCalories = meals
    .filter(meal => meal.completed)
    .reduce((sum, meal) => sum + meal.calories, 0);

  return (
    <div className={styles.container}>
      <Header />
      
      <main className={styles.main}>
        <div className={styles.content}>
          <section className={styles.header}>
            <h1>Plano Alimentar</h1>
            <p>Acompanhe suas refeições do dia</p>
          </section>

          <section className={styles.progress}>
            <div className={styles.progressLabel}>
              <span>{completedCalories} / {totalCalories} kcal</span>
              <span className={styles.percentage}>
                {Math.round((completedCalories / totalCalories) * 100)}%
              </span>
            </div>
            <div className={styles.progressBar}>
              <div
                className={styles.progressFill}
                style={{ width: `${(completedCalories / totalCalories) * 100}%` }}
              />
            </div>
          </section>

          <section className={styles.meals}>
            {meals.map(meal => (
              <div key={meal.id} className={`${styles.mealItem} ${meal.completed ? styles.completed : ''}`}>
                <div className={styles.mealInfo}>
                  <div className={styles.mealTime}>{meal.time}</div>
                  <div>
                    <h3 className={styles.mealName}>{meal.name}</h3>
                    <p className={styles.mealCalories}>{meal.calories} kcal</p>
                  </div>
                </div>
                <input type="checkbox" checked={meal.completed} readOnly className={styles.checkbox} />
              </div>
            ))}
          </section>

          <section className={styles.actions}>
            <button className={styles.button}>+ Adicionar Refeição</button>
          </section>

          <div className={styles.spacer} />
        </div>
      </main>

      <BottomNavigation />
    </div>
  );
};

export default DietPlan;