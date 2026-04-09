import React, { useState, useEffect } from 'react';
import Header from '../components/Header';
import BottomNavigation from '../components/BottomNavigation';
import { dietAPI, workoutsAPI, progressAPI } from '../services/api';
import styles from './Calendar.module.css';

const Calendar = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(null);
  const [dayData, setDayData] = useState({});
  const [loading, setLoading] = useState(false);
  const [modalData, setModalData] = useState(null);

  useEffect(() => {
    loadMonthData(currentDate);
  }, [currentDate]);

  const loadMonthData = async (date) => {
    setLoading(true);
    try {
      const start = new Date(date.getFullYear(), date.getMonth(), 1);
      const end = new Date(date.getFullYear(), date.getMonth() + 1, 0);

      // Carregar dados do mês
      const [mealsRes, workoutsRes, progressRes] = await Promise.all([
        dietAPI.getMeals(start.toISOString().split('T')[0]),
        workoutsAPI.getLogs(),
        progressAPI.getLogs()
      ]);

      const data = {};
      // Processar meals
      mealsRes.data.forEach(meal => {
        const dateKey = new Date(meal.date).toDateString();
        if (!data[dateKey]) data[dateKey] = { meals: [], workouts: [], progress: null, adherence: 0 };
        data[dateKey].meals.push(meal);
        if (meal.completed) data[dateKey].adherence += 25; // 25% por refeição
      });

      // Processar workouts
      workoutsRes.data.forEach(workout => {
        const dateKey = new Date(workout.date).toDateString();
        if (!data[dateKey]) data[dateKey] = { meals: [], workouts: [], progress: null, adherence: 0 };
        data[dateKey].workouts.push(workout);
        if (workout.completed) data[dateKey].adherence += 25;
      });

      // Processar progress (água, sono)
      progressRes.data.forEach(prog => {
        const dateKey = new Date(prog.date).toDateString();
        if (!data[dateKey]) data[dateKey] = { meals: [], workouts: [], progress: prog, adherence: 0 };
        data[dateKey].progress = prog;
        // Simular água e sono
        if (prog.notes && prog.notes.includes('água')) data[dateKey].adherence += 25;
        if (prog.notes && prog.notes.includes('sono')) data[dateKey].adherence += 25;
      });

      setDayData(data);
    } catch (err) {
      console.error('Erro ao carregar dados do mês');
    } finally {
      setLoading(false);
    }
  };

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const days = [];

    // Dias do mês anterior
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
    const dateKey = date.toDateString();
    const data = dayData[dateKey];
    if (!data) return 'red';
    if (data.adherence >= 100) return 'green';
    if (data.adherence > 0) return 'yellow';
    return 'red';
  };

  const handleDayClick = (date) => {
    const dateKey = date.toDateString();
    const data = dayData[dateKey] || { meals: [], workouts: [], progress: null, adherence: 0 };
    setSelectedDate(date);
    setModalData(data);
  };

  const navigateMonth = (direction) => {
    setCurrentDate(prev => {
      const newDate = new Date(prev);
      newDate.setMonth(newDate.getMonth() + direction);
      return newDate;
    });
  };

  const days = getDaysInMonth(currentDate);
  const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  return (
    <div className={styles.calendar}>
      <Header />
      
      <main className={styles.main}>
        <div className={styles.container}>
          <h1>Calendário de Aderência</h1>
          
          <div className={styles.calendarHeader}>
            <button onClick={() => navigateMonth(-1)}>&lt;</button>
            <h2>{currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}</h2>
            <button onClick={() => navigateMonth(1)}>&gt;</button>
          </div>

          <div className={styles.calendarGrid}>
            {weekDays.map(day => (
              <div key={day} className={styles.weekday}>{day}</div>
            ))}
            {days.map((day, index) => {
              const isCurrentMonth = day.getMonth() === currentDate.getMonth();
              const isToday = day.toDateString() === new Date().toDateString();
              const status = getDayStatus(day);
              
              return (
                <div
                  key={index}
                  className={`${styles.calendarDay} ${!isCurrentMonth ? styles.otherMonth : ''} ${isToday ? styles.today : ''} ${styles[status]}`}
                  onClick={() => handleDayClick(day)}
                >
                  {day.getDate()}
                </div>
              );
            })}
          </div>

          {modalData && selectedDate && (
            <div className={styles.modal}>
              <div className={styles.modalContent}>
                <h3>{selectedDate.toLocaleDateString('pt-BR')}</h3>
                <div className={styles.modalStats}>
                  <div className={styles.stat}>
                    <span>Kcal: {modalData.meals.reduce((sum, m) => sum + (m.totalCalories || 0), 0)}</span>
                  </div>
                  <div className={styles.stat}>
                    <span>Refeições: {modalData.meals.filter(m => m.completed).length}/{modalData.meals.length}</span>
                  </div>
                  <div className={styles.stat}>
                    <span>Treino: {modalData.workouts.length > 0 ? '✓' : '○'}</span>
                  </div>
                  <div className={styles.stat}>
                    <span>Água: {modalData.progress?.notes?.includes('água') ? '✓' : '○'}</span>
                  </div>
                  <div className={styles.stat}>
                    <span>Sono: {modalData.progress?.notes?.includes('sono') ? '✓' : '○'}</span>
                  </div>
                </div>
                <button onClick={() => setModalData(null)}>Fechar</button>
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