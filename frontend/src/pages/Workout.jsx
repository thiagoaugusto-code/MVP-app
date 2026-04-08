import Header from '../components/Header';
import BottomNavigation from '../components/BottomNavigation';
import styles from './Workout.module.css';

const Workout = () => {
  const workouts = [
    { id: 1, name: 'Corrida', duration: 30, intensity: 'moderado', completed: true },
    { id: 2, name: 'Musculação - Peito', duration: 45, intensity: 'alto', completed: false },
    { id: 3, name: 'Alongamento', duration: 15, intensity: 'leve', completed: false },
  ];

  const totalDuration = workouts.reduce((sum, w) => sum + w.duration, 0);
  const completedDuration = workouts
    .filter(w => w.completed)
    .reduce((sum, w) => sum + w.duration, 0);

  const getIntensityColor = (intensity) => {
    switch (intensity) {
      case 'leve':
        return styles.intensityLight;
      case 'moderado':
        return styles.intensityModerate;
      case 'alto':
        return styles.intensityHigh;
      default:
        return '';
    }
  };

  return (
    <div className={styles.container}>
      <Header />
      
      <main className={styles.main}>
        <div className={styles.content}>
          <section className={styles.header}>
            <h1>Treino do Dia</h1>
            <p>Acompanhe sua atividade física</p>
          </section>

          <section className={styles.summary}>
            <div className={styles.summaryCard}>
              <span className={styles.icon}>⏱️</span>
              <div>
                <p className={styles.label}>Tempo Gasto</p>
                <p className={styles.value}>{completedDuration}/{totalDuration} min</p>
              </div>
            </div>
            <div className={styles.summaryCard}>
              <span className={styles.icon}>🔥</span>
              <div>
                <p className={styles.label}>Exercícios</p>
                <p className={styles.value}>
                  {workouts.filter(w => w.completed).length}/{workouts.length}
                </p>
              </div>
            </div>
          </section>

          <section className={styles.workouts}>
            {workouts.map(workout => (
              <div key={workout.id} className={`${styles.workoutItem} ${workout.completed ? styles.completed : ''}`}>
                <div className={styles.workoutHeader}>
                  <h3 className={styles.workoutName}>{workout.name}</h3>
                  <span className={`${styles.intensity} ${getIntensityColor(workout.intensity)}`}>
                    {workout.intensity}
                  </span>
                </div>
                <div className={styles.workoutFooter}>
                  <span className={styles.duration}>{workout.duration} min</span>
                  <input type="checkbox" checked={workout.completed} readOnly className={styles.checkbox} />
                </div>
              </div>
            ))}
          </section>

          <section className={styles.actions}>
            <button className={styles.button}>+ Adicionar Exercício</button>
            <button className={styles.buttonSecondary}>Finalizar Treino</button>
          </section>

          <div className={styles.spacer} />
        </div>
      </main>

      <BottomNavigation />
    </div>
  );
};

export default Workout;