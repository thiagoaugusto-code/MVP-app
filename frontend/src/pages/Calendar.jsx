import React, { useState, useEffect, useMemo } from 'react';
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

function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function getMonthDaysData(dayData, currentDate) {
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth() + 1;

  return Object.entries(dayData)
    .filter(([key]) => {
      const [y, m] = key.split('-').map(Number);
      return y === year && m === month;
    })
    .map(([, d]) => d);
}

function getDayDisplay(date, dayData, today) {
  const key = toDateKey(date);
  const data = dayData[key];
  const isFuture = startOfDay(date) > startOfDay(today);

  if (isFuture) {
    return { status: 'empty', scoreLabel: '--%', isFuture: true };
  }

  if (!data) {
    return { status: 'empty', scoreLabel: '--%', isFuture: false };
  }

  const status = data.calendarStatus === 'green' || data.calendarStatus === 'yellow'
    ? data.calendarStatus
    : 'red';

  return {
    status,
    scoreLabel: `${data.progressScore}%`,
    isFuture: false,
  };
}

function buildMonthSummary(monthDays) {
  if (monthDays.length === 0) {
    return { average: null, completedCount: 0, bestDay: null };
  }

  const total = monthDays.reduce((sum, d) => sum + d.progressScore, 0);
  const average = Math.round(total / monthDays.length);
  const completedCount = monthDays.filter((d) => d.progressScore > 0).length;
  const best = monthDays.reduce(
    (max, d) => (!max || d.progressScore > max.progressScore ? d : max),
    null
  );

  return {
    average,
    completedCount,
    bestDay: best
      ? { score: best.progressScore, date: new Date(best.date) }
      : null,
  };
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

  const monthSummary = useMemo(() => {
    const monthDays = getMonthDaysData(dayData, currentDate);
    return buildMonthSummary(monthDays);
  }, [dayData, currentDate]);

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

          <section className={styles.summary} aria-label="Resumo do mês">
            <div className={styles.summaryCard}>
              <span className={styles.summaryLabel}>Média do mês</span>
              <span className={styles.summaryValue}>
                {monthSummary.average !== null ? `${monthSummary.average}%` : '—'}
              </span>
            </div>
            <div className={styles.summaryCard}>
              <span className={styles.summaryLabel}>Dias concluídos</span>
              <span className={styles.summaryValue}>{monthSummary.completedCount}</span>
            </div>
            <div className={styles.summaryCard}>
              <span className={styles.summaryLabel}>Melhor dia</span>
              <span className={styles.summaryValue}>
                {monthSummary.bestDay
                  ? `${monthSummary.bestDay.score}%`
                  : '—'}
              </span>
              {monthSummary.bestDay && (
                <span className={styles.summaryMeta}>
                  {monthSummary.bestDay.date.toLocaleDateString('pt-BR', {
                    day: 'numeric',
                    month: 'short',
                  })}
                </span>
              )}
            </div>
          </section>

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
              const display = isCurrentMonth
                ? getDayDisplay(day, dayData, today)
                : { status: 'empty', scoreLabel: '', isFuture: false };

              return (
                <div
                  key={index}
                  className={[
                    styles.calendarDay,
                    !isCurrentMonth && styles.otherMonth,
                    isToday && styles.today,
                    display.isFuture && styles.futureDay,
                  ].filter(Boolean).join(' ')}
                >
                  {isCurrentMonth && (
                    <span
                      className={[
                        styles.statusBar,
                        display.status !== 'empty' && styles[`status_${display.status}`],
                        display.status === 'empty' && styles.status_empty,
                      ].filter(Boolean).join(' ')}
                      aria-hidden="true"
                    />
                  )}
                  <div className={styles.dayContent}>
                    <span className={styles.dayNumber}>{day.getDate()}</span>
                    {isCurrentMonth && (
                      <span className={styles.dayScore}>{display.scoreLabel}</span>
                    )}
                  </div>
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
