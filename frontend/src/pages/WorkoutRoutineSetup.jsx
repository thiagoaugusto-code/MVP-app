import { useState } from 'react';
import api from '../services/api';
import styles from './WorkoutRoutineSetup.module.css';

const DAYS = [
  { label: 'SEG', value: 1 },
  { label: 'TER', value: 2 },
  { label: 'QUA', value: 3 },
  { label: 'QUI', value: 4 },
  { label: 'SEX', value: 5 },
  { label: 'SAB', value: 6 },
  { label: 'DOM', value: 0 },
];

const WORKOUTS = [
  { name: 'Musculação', type: 'strength' },
  { name: 'Corrida', type: 'cardio' },
  { name: 'Yoga', type: 'yoga' },
  { name: 'Pilates', type: 'pilates' },
  { name: 'Natação', type: 'swim' },
];

export default function WorkoutRoutineSetup({ onSave, onClose }) {
  const [sessions, setSessions] = useState(
    WORKOUTS.map(w => ({
      name: w.name,
      type: w.type,
      days: [],
    }))
  );

  function toggleDay(workoutName, day) {
    setSessions(prev =>
      prev.map(session => {
        if (session.name !== workoutName) return session;

        const exists = session.days.includes(day);

        return {
          ...session,
          days: exists
            ? session.days.filter(d => d !== day)
            : [...session.days, day],
        };
      })
    );
  }

  async function handleSave() {
    const payload = sessions
      .filter(s => s.days.length > 0)
      .flatMap(session =>
        session.days.map(day => ({
          weekday: day,
          name: session.name,
          type: session.type,
        }))
      );

    if (payload.length === 0) return;

    try {
      await api.post('/workout-routine/bulk', payload);

      onSave(sessions); // atualiza dashboard
      onClose(); // fecha modal
    } catch (err) {
      console.error(err);
      alert('Erro ao salvar rotina');
    }
  }

  return (
    <div className={styles.overlay}>
      <div className={styles.card}>

        {/* HEADER */}
        <div className={styles.header}>
          <h2>Monte sua rotina semanal</h2>
          <button className={styles.closeBtn} onClick={onClose}>✕</button>
        </div>

        {/* WORKOUTS */}
        <div className={styles.workouts}>
          {sessions.map(session => (
            <div
              key={session.name}
              className={`${styles.sessionBlock} ${
                session.days.length ? styles.activeBlock : ''
              }`}
            >
              <div className={styles.sessionTitle}>
                {session.name}
              </div>

              <div className={styles.days}>
                {DAYS.map(d => {
                  const active = session.days.includes(d.value);

                  return (
                    <button
                      key={d.value}
                      className={`${styles.day} ${
                        active ? styles.dayActive : ''
                      }`}
                      onClick={() => toggleDay(session.name, d.value)}
                    >
                      {d.label}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* ACTIONS */}
        <div className={styles.actions}>
          <button className={styles.cancelBtn} onClick={onClose}>
            Cancelar
          </button>

          <button className={styles.saveBtn} onClick={handleSave}>
            Salvar rotina
          </button>
        </div>
      </div>
    </div>
  );
}