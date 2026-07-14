import { useEffect, useState } from 'react';
import Header from '../components/Header';
import BottomNavigation from '../components/BottomNavigation';
import { dailyStateAPI } from '../services/api';
import WorkoutRoutineSetup from '../pages/WorkoutRoutineSetup';
import { buildVisibleWorkouts } from '../constants/workout';
import styles from './Workout.module.css';
import { getTodayDateKey } from '../utils/date';
import WorkoutContextModal from '../components/WorkoutContextModal';


const dateKey = getTodayDateKey();

const Workout = () => {
  const [plan, setPlan] = useState([]);
  const [executions, setExecutions] = useState([]);
  const visibleWorkouts = buildVisibleWorkouts(plan, executions);

  const [showModal, setShowModal] = useState(false);

  const [selectedWorkout, setSelectedWorkout] = useState(null);
  const [showContextModal, setShowContextModal] = useState(false);
  const [workoutContexts, setWorkoutContexts] = useState({});

  const [newWorkout, setNewWorkout] = useState({
    name: '',
    duration: '',
    intensity: 'moderado',
  });


  const [showRoutineModal, setShowRoutineModal] = useState(false);

  // -----------------------------
  // LOAD
  // -----------------------------
  useEffect(() => {
    load();
  }, []);

  async function load() {
    const res = await dailyStateAPI.get(dateKey);

    const state = res.data.state;


     console.log('STATE COMPLETO:', state);
    console.log('WORKOUT:', state.workout);
    console.log('PLAN:', state.workout?.plan);

    const dailyExecutions = state.workout?.exercises || [];
    const dailyPlan = state.workout?.plan || [];

    setExecutions(dailyExecutions);
    setPlan(dailyPlan);
  }

  function openWorkoutContext(workout) {
      console.log('Abrindo contexto para o treino:', workout);

      setSelectedWorkout(workout);
      setShowContextModal(true);
    };

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

      setExecutions(state.workout?.exercises || []);
      setPlan(state.workout?.plan || []);
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
        name: newWorkout.name.charAt(0).toUpperCase() + newWorkout.name.slice(1), // Começa com letra maiúscula
        duration: Number(newWorkout.duration),
        intensity: newWorkout.intensity,    
      },
    });

    const res = await dailyStateAPI.get(dateKey);

    setExecutions(res.data.state.workout?.exercises || []);
    setPlan(res.data.state.workout?.plan || []);


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
  const totalDuration = visibleWorkouts.reduce(
    (sum, w) => sum + (w.duration || 0),
    0
  );

  const completedDuration = visibleWorkouts
    .filter(w => w.completed)
    .reduce((sum, w) => sum + (w.duration || 0), 0);

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
            <h1>Rotina do Dia</h1>
            <p>Edite suas atividades</p>
          </section>

          <section className={styles.summary}>
            {/* <div className={styles.summaryCard}>
              <span className={styles.icon}>⏱️</span>
              <div>
                <p className={styles.label}>Tempo Gasto</p>
                <p className={styles.value}>
                  {completedDuration}/{totalDuration} min
                </p>
              </div>
            </div>// 🔥 FALTAVA ISSO */}

            <div className={styles.summaryCard}>
              <span className={styles.icon}>🔥</span>
              <div>
                <p className={styles.label}>Exercícios</p>
                <p className={styles.value}>
                  {visibleWorkouts.filter(w => w.completed).length}/{visibleWorkouts.length}
                </p>
              </div>
            </div>
          </section>

          {/* ---------------- WORKOUT LIST ---------------- */}
          <section className={styles.workouts}>
            {visibleWorkouts.map(workout => (
              <div
                key={workout.id}
                className={`${styles.workoutItem} ${
                  workout.completed ? styles.completed : ''
                }`}
              >
                <div className={styles.workoutInfo}>
                  <h3 className={styles.workoutName}>
                    {workout.name}
                  </h3>

                  {workout.specifications && (
                    <span className={styles.workoutDetails}>
                      {workout.specifications.join(' • ')}
                    </span>
                  )}
                  {workoutContexts[workout.id] && (
                    <div className={styles.contextDetails}>
                      {workoutContexts[workout.id].map((item, index) => (
                        <span key={index}>
                          • {item.label}: {item.value}
                        </span>
                      ))}
                    </div>
                  )}
                </div>


                <div className={styles.workoutActions}>

                  <button
                    className={styles.contextButton}
                    onClick={() => openWorkoutContext(workout)}
                  >
                    🏋️
                  </button>


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

            <button className={styles.buttonSecondary} 
            onClick={() => setShowRoutineModal(true)}>
              🏋️ Minha Rotina
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

          {showRoutineModal && (
            <WorkoutRoutineSetup 
              onClose={() => setShowRoutineModal(false)}
              onSave={() => {
                setShowRoutineModal(false);
                load ();
              }} 
            />
          )}

          {showContextModal && (
            <WorkoutContextModal
              workout={selectedWorkout}
              initialContext={
                workoutContexts[selectedWorkout.id] || []}
              onClose={() => {
                setSelectedWorkout(null);
                setShowContextModal(false);
              }}
              onSave={(data) => {
                console.log(
                  'Salvar contexto:',
                  data
                );


                setWorkoutContexts(prev => ({
                  ...prev,
                  [data.workoutId]: data.context
                }));

                setSelectedWorkout(null);
                setShowContextModal(false);
              }}
            />
          )}

          <div className={styles.spacer} />
        </div>
      </main>

      <BottomNavigation />
    </div>
  );
};

export default Workout;