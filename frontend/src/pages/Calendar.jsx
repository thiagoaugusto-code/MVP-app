import React, { useState, useEffect } from 'react';
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

function isSameDay(a, b) {
  return toDateKey(a) === toDateKey(b);
}

const Calendar = () => {
  const toast = useToast();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [dayData, setDayData] = useState({});
  const [loading, setLoading] = useState(false);

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
        map[toDateKey(d.date)] = d;
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

  const navigateMonth = (direction) => {
    setCurrentDate((prev) => {
      const newDate = new Date(prev);
      newDate.setMonth(newDate.getMonth() + direction);
      return newDate;
    });
  };

  const days = getDaysInMonth(currentDate);
  const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  const today = new Date();

  return (
    <div className={styles.calendar}>
      <Header />

      <main className={styles.main}>
        <div className={styles.container}>
          <header className={styles.pageHeader}>
            <h1>Calendário</h1>
            <p className={styles.lead}>Visualize sua evolução ao longo do tempo.</p>
          </header>

          <div className={styles.calendarHeader}>
            <button type="button" className={styles.navBtn} onClick={() => navigateMonth(-1)} aria-label="Mês anterior">
              ‹
            </button>
            <h2 className={styles.monthLabel}>
              {currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}
            </h2>
            <button type="button" className={styles.navBtn} onClick={() => navigateMonth(1)} aria-label="Próximo mês">
              ›
            </button>
          </div>

          {loading && <p className={styles.loading}>Carregando...</p>}

          <div className={styles.calendarGrid}>
            {weekDays.map((day) => (
              <div key={day} className={styles.weekday}>{day}</div>
            ))}
            {days.map((day, index) => {
              const isCurrentMonth = day.getMonth() === currentDate.getMonth();
              const isToday = isSameDay(day, today);

              return (
                <div
                  key={index}
                  className={[
                    styles.calendarDay,
                    !isCurrentMonth && styles.otherMonth,
                    isToday && styles.today,
                  ].filter(Boolean).join(' ')}
                >
                  <span className={styles.dayNumber}>{day.getDate()}</span>
                </div>
              );
            })}
          </div>
        </div>
      </main>

      <BottomNavigation />
    </div>
  );
};

export default Calendar;
