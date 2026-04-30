import { useEffect, useState } from 'react';
import Header from '../components/Header';
import BottomNavigation from '../components/BottomNavigation';
import { dailyStateAPI } from '../services/api';
import styles from './Workout.module.css';

const dateKey = new Date().toISOString().split('T')[0]; // 🔥 FALTAVA ISSO

const Workout = () => {
  const [workouts, setWorkouts] = useState([]);
  const [showModal, setShowModal] = useState(false);

  const [newWorkout, setNewWorkout] = useState({
    name: '',
    duration: '',
    intensity: 'moderado',
  });

  // -----------------------------
  // LOAD
  // -----------------------------
  useEffect(() => {
    load();
  }, []);

  async function load() {
    const res = await dailyStateAPI.get(dateKey);

    const state = res.data.state;

    // 🔥 EXECUÇÃO REAL (NÃO MEXE)
    const realWorkout = state.workout?.exercises || [];

    // 🆕 PLANO DO DIA (NOVA CAMADA)
    const plan = state.workoutPlan || [];

    // 👉 mantém execução, mas se não houver exercícios reais, usa plano
    setWorkouts(realWorkout.length ? realWorkout : plan);
  }

  // -----------------------------
  // TOGGLE WORKOUT
  // -----------------------------
  const toggleWorkout = async (id, done) => {
    await dailyStateAPI.applyAction({
      date: dateKey,
      action: 'TOGGLE_WORKOUT_ACTIVITY',
      payload: {
        activityId: id,
        done,
      },
    });

    const res = await dailyStateAPI.get(dateKey);
    const state = res.data.state;

      setWorkouts(
        state?.workout?.exercises?.length
          ? state.workout.exercises
          : state?.workout?.plan || []
      );
  };

  // -----------------------------
  // ADD WORKOUT
  // -----------------------------
  const handleSaveWorkout = async () => {
    if (!newWorkout.name || !newWorkout.duration) return;

    await dailyStateAPI.applyAction({
      date: dateKey,
      action: 'ADD_WORKOUT_ACTIVITY', // 🔥 AGORA É BACKEND
      payload: {
        name: newWorkout.name,
        duration: Number(newWorkout.duration),
        intensity: newWorkout.intensity,    
      },
    });

    const res = await dailyStateAPI.get(dateKey);
    setWorkouts(res.data.state.workout?.exercises || []);

    setNewWorkout({
      name: '',
      duration: '',
      intensity: 'moderado',
    });

    setShowModal(false);
  };

  // -----------------------------
  // UI HELPERS
  // -----------------------------
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

  // -----------------------------
  // RENDER
  // -----------------------------
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
                <p className={styles.value}>
                  {completedDuration}/{totalDuration} min
                </p>
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

          {/* ---------------- WORKOUT LIST ---------------- */}
          <section className={styles.workouts}>
            {workouts.map(workout => (
              <div
                key={workout.id}
                className={`${styles.workoutItem} ${
                  workout.completed ? styles.completed : ''
                }`}
              >
                <div className={styles.workoutHeader}>
                  <h3 className={styles.workoutName}>{workout.name}</h3>

                  <span
                    className={`${styles.intensity} ${getIntensityColor(
                      workout.intensity
                    )}`}
                  >
                    {workout.intensity}
                  </span>
                </div>

                <div className={styles.workoutFooter}>
                  <span className={styles.duration}>
                    {workout.duration} min
                  </span>

                  <input
                    type="checkbox"
                    checked={workout.completed}
                    onChange={(e) =>
                      toggleWorkout(workout.id, e.target.checked)
                    }
                    className={styles.checkbox}
                  />
                </div>
              </div>
            ))}
          </section>

          {/* ---------------- ACTIONS ---------------- */}
          <section className={styles.actions}>
            <button
              className={styles.button}
              onClick={() => setShowModal(true)}
            >
              + Adicionar Exercício
            </button>

            <button className={styles.buttonSecondary}>
              Finalizar Treino
            </button>
          </section>

          {/* ---------------- MODAL ---------------- */}
          {showModal && (
            <div className={styles.modalOverlay}>
              <div className={styles.modal}>
                <h2>Novo Exercício</h2>

                <input
                  type="text"
                  placeholder="Nome do exercício"
                  value={newWorkout.name}
                  onChange={(e) =>
                    setNewWorkout({
                      ...newWorkout,
                      name: e.target.value,
                    })
                  }
                  className={styles.input}
                />

                <input
                  type="number"
                  placeholder="Duração em minutos"
                  value={newWorkout.duration}
                  onChange={(e) =>
                    setNewWorkout({
                      ...newWorkout,
                      duration: e.target.value,
                    })
                  }
                  className={styles.input}
                />

                <select
                  value={newWorkout.intensity}
                  onChange={(e) =>
                    setNewWorkout({
                      ...newWorkout,
                      intensity: e.target.value,
                    })
                  }
                  className={styles.select}
                >
                  <option value="leve">Leve</option>
                  <option value="moderado">Moderado</option>
                  <option value="alto">Alto</option>
                </select>

                <div className={styles.modalActions}>
                  <button
                    className={styles.buttonSecondary}
                    onClick={() => setShowModal(false)}
                  >
                    Cancelar
                  </button>

                  <button
                    className={styles.button}
                    onClick={handleSaveWorkout}
                  >
                    Salvar
                  </button>
                </div>
              </div>
            </div>
          )}

          <div className={styles.spacer} />
        </div>
      </main>

      <BottomNavigation />
    </div>
  );
};

export default Workout;