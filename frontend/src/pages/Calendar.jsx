import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import BottomNavigation from '../components/BottomNavigation';
import { dailyStateAPI } from '../services/api';
import { useToast } from '../components/toast/ToastProvider';
import styles from './Calendar.module.css';

function toDateKey(d) {
  const x = new Date(d);
  const y = x.getFullYear();
  const m = String(x.getMonth() + 1).padStart(2, '0');
  const day = String(x.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

const Calendar = () => {
  const navigate = useNavigate();
  const toast = useToast();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [dayData, setDayData] = useState({});
  const [loading, setLoading] = useState(false);
  const [selectedState, setSelectedState] = useState(null);

  useEffect(() => {
    loadMonthData(currentDate);
  }, [currentDate]);

  const loadMonthData = async (date) => {
    setLoading(true);
    try {
      const year = date.getFullYear();
      const month = date.getMonth() + 1;
      const res = await dailyStateAPI.getMonth(year, month);
      const map = {};
      (res.data.days || []).forEach((d) => {
        map[d.dateKey] = d;
      });
      setDayData(map);
    } catch (err) {
      console.error(err);
      toast.error('Erro ao carregar calendário');
    } finally {
      setLoading(false);
    }
  };

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const days = [];
    const startDate = new Date(firstDay);
    startDate.setDate(startDate.getDate() - firstDay.getDay());
    for (let i = 0; i < 42; i++) {
      const day = new Date(startDate);
      day.setDate(startDate.getDate() + i);
      days.push(day);
    }
    return days;
  };

  const getDayStatus = (date) => {
    const key = toDateKey(date);
    const d = dayData[key];
    if (!d) return 'red';
    if (d.calendarStatus === 'green') return 'green';
    if (d.calendarStatus === 'yellow') return 'yellow';
    return 'red';
  };

  const handleDayClick = async (date) => {
    const key = toDateKey(date);
    setSelectedDate(date);
    try {
      const res = await dailyStateAPI.get(key);
      setSelectedState(res.data.state);
    } catch (e) {
      toast.error('Erro ao carregar o dia');
      setSelectedState(null);
    }
  };

  const runActionForSelected = async (action, payload = {}) => {
    if (!selectedDate) return;
    const key = toDateKey(selectedDate);
    try {
      await dailyStateAPI.applyAction({ date: key, action, payload });
      const res = await dailyStateAPI.get(key);
      setSelectedState(res.data.state);
      await loadMonthData(currentDate);
    } catch (e) {
      toast.error(e.response?.data?.error || 'Ação não permitida');
    }
  };

  const navigateMonth = (direction) => {
    setCurrentDate((prev) => {
      const newDate = new Date(prev);
      newDate.setMonth(newDate.getMonth() + direction);
      return newDate;
    });
  };

  const days = getDaysInMonth(currentDate);
  const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  const breakfastDone = Boolean(
    selectedState?.meals?.find((m) => m.mealType === 'breakfast')?.completed
  );

  return (
    <div className={styles.calendar}>
      <Header />

      <main className={styles.main}>
        <div className={styles.container}>
          <h1>Calendário</h1>
          <p className={styles.lead}>Leitura do seu progresso (fonte única: estado diário)</p>

          <div className={styles.calendarHeader}>
            <button type="button" onClick={() => navigateMonth(-1)}>&lt;</button>
            <h2>{currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</h2>
            <button type="button" onClick={() => navigateMonth(1)}>&gt;</button>
          </div>

          {loading && <p className={styles.loading}>Carregando...</p>}

          <div className={styles.calendarGrid}>
            {weekDays.map((day) => (
              <div key={day} className={styles.weekday}>{day}</div>
            ))}
            {days.map((day, index) => {
              const isCurrentMonth = day.getMonth() === currentDate.getMonth();
              const isToday = toDateKey(day) === toDateKey(new Date());
              const status = getDayStatus(day);

              return (
                <div
                  key={index}
                  className={`${styles.calendarDay} ${!isCurrentMonth ? styles.otherMonth : ''} ${isToday ? styles.today : ''} ${styles[status]}`}
                  onClick={() => handleDayClick(day)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && handleDayClick(day)}
                >
                  {day.getDate()}
                </div>
              );
            })}
          </div>

          {selectedState && selectedDate && (
            <div className={styles.modal}>
              <div className={styles.modalContent}>
                <h3>{selectedDate.toLocaleDateString('pt-BR')}</h3>
                <p className={styles.modalMeta}>
                  Progresso: {selectedState.progressScore}% ·{' '}
                  {selectedState.calendarStatus === 'green' ? 'Dentro da meta' : selectedState.calendarStatus === 'yellow' ? 'Parcial' : 'Fora da meta'}
                </p>
                <div className={styles.modalStats}>
                  <div className={styles.stat}>
                    <span>Kcal: {selectedState.caloriesConsumed} / meta {selectedState.goals?.caloriesGoal}</span>
                  </div>
                  <div className={styles.stat}>
                    <span>
                      Refeições:{' '}
                      {selectedState.meals?.filter((m) => m.completed).length || 0}/
                      {selectedState.meals?.length || 0}
                    </span>
                  </div>
                  <div className={styles.stat}>
                    <span>Treino: {selectedState.workout?.completed ? '✓' : '○'}</span>
                  </div>
                  <div className={styles.stat}>
                    <span>
                      Água: {(selectedState.waterMl / 1000).toFixed(1)} L /{' '}
                      {(selectedState.goals?.waterGoalMl / 1000).toFixed(1)} L
                    </span>
                  </div>
                  <div className={styles.stat}>
                    <span>Sono: {selectedState.sleepHours ?? '—'} h</span>
                  </div>
                </div>

                <div className={styles.quickActions}>
                  <button
                    type="button"
                    className={styles.quickActionBtn}
                    onClick={() => runActionForSelected('ADD_WATER', { ml: 250 })}
                  >
                    + água
                  </button>
                  <button
                    type="button"
                    className={styles.quickActionBtn}
                    onClick={() =>
                      runActionForSelected('COMPLETE_WORKOUT', {
                        done: !selectedState.workout?.completed,
                      })
                    }
                  >
                    {selectedState.workout?.completed ? 'Desmarcar treino' : 'Marcar treino'}
                  </button>
                  <button
                    type="button"
                    className={styles.quickActionBtn}
                    onClick={() =>
                      runActionForSelected('COMPLETE_MEAL', {
                        mealType: 'breakfast',
                        done: !breakfastDone,
                      })
                    }
                  >
                    {breakfastDone ? 'Desmarcar café' : 'Marcar café'}
                  </button>
                  <button
                    type="button"
                    className={styles.quickActionBtn}
                    onClick={() => navigate('/diet?meal=breakfast')}
                  >
                    Abrir dieta
                  </button>
                </div>
                <button type="button" className={styles.closeBtn} onClick={() => { setSelectedState(null); setSelectedDate(null); }}>
                  Fechar
                </button>
              </div>
            </div>
          )}
        </div>
      </main>

      <BottomNavigation />
    </div>
  );
};

export default Calendar;
