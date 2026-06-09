import { useMemo, useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getMealLabel,
  isMealRegistered,
  getActiveGoalMeals,
} from '../constants/meals';
import styles from './DailySummaryCard.module.css';

function getMealOrderByTime(now = new Date()) {
  const h = now.getHours();
  if (h < 10) return ['breakfast', 'snack', 'lunch', 'pre_workout', 'post_workout', 'dinner'];
  if (h < 14) return ['lunch', 'snack', 'pre_workout', 'post_workout', 'dinner', 'breakfast'];
  if (h < 18) return ['snack', 'pre_workout', 'post_workout', 'dinner', 'breakfast', 'lunch'];
  return ['dinner', 'post_workout', 'snack', 'breakfast', 'lunch', 'pre_workout'];
}

export default function DailySummaryCard({
  dailyState,
  weeklyActiveDays,
  onQuickWater,
  onQuickWorkoutToggle,
  onEditGoals,
  sleepHours,
  onSleepChange,
}) {

  const navigate = useNavigate();
  const [pulse, setPulse] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const waterButtonRef = useRef(null);
  
  const goals = dailyState?.goals || {};
  const calorieGoal = goals.caloriesGoal || 2000;
  const caloriesConsumed = dailyState?.caloriesConsumed || 0;

  const waterGoalMl = goals.waterGoalMl || 2000;
  const waterMl = dailyState?.waterMl || 0;

  // Estado local para agua - permite arrastar sem atualizar imediatamente o estado global
  const [waterMlLocal, setWaterMlLocal] = useState(waterMl);

  useEffect(() => {
    setWaterMlLocal(waterMl);
  }, [waterMl]);


  // Estado local para os minutos de sono, para permitir arrastar o slider sem atualizar imediatamente o estado global
  const [sleepMinutesLocal, setSleepMinutesLocal] = useState(
    Math.round((sleepHours || 0) * 60)
  );

  useEffect(() => {
    setSleepMinutesLocal(Math.round((sleepHours || 0) * 60));
  }, [sleepHours]);

  const sleepPercent = Math.min((sleepMinutesLocal / 720) * 100, 100);
  const sleepHoursLabel = `${Math.floor(sleepMinutesLocal / 60)}h ${sleepMinutesLocal % 60}m`;

  const handleSleepDrag = (value) => {
    setSleepMinutesLocal(value);
  };

  const commitSleepValue = (value) => {
    onSleepChange(value);
  };

 // Define a função para obter o gradiente de preenchimento com base nos minutos de sono
  const getSleepFillGradient = (minutes) => {
  if (minutes <= 420) {
    // até 7h → azul mais suave / pouco descanso
    return 'linear-gradient(90deg, #60a5fa 0%, #2563eb 100%)';
  }

  if (minutes <= 540) {
    // 7h a 9h → azul equilibrado / sono ideal
    return 'linear-gradient(90deg, #2563eb 0%, #1d4ed8 100%)';
  }

  // 9h a 12h → azul profundo / sono intenso
  return 'linear-gradient(90deg, #1e40af 0%, #1e3a8a 100%)';
};

const sleepFillStyle = {
  width: `${sleepPercent}%`,
  background: getSleepFillGradient(sleepMinutesLocal),
};



  // Cálculo do progresso das refeições
  const meals = getActiveGoalMeals(dailyState);
  const mealProgress = dailyState?.mealProgress || {
    inGoalCount: meals.length,
    registeredCount: meals.filter((m) => isMealRegistered(m)).length,
    percent: meals.length
      ? Math.round(
          (meals.filter((m) => isMealRegistered(m)).length / meals.length) * 100
        )
      : 0,
  };
  const activities = [
    ...(dailyState?.workout?.plan || []),
    ...(dailyState?.workout?.exercises || []),
  ];
  const progress = Math.min((waterMlLocal / waterGoalMl) * 100, 100);
  const progressDisplay = Math.min((waterMl / waterGoalMl) * 100, 100);

  const workoutGoal = activities.length || 1;
  const nextWorkout = activities.find((activity) => !activity.completed);

  const totalActivities = activities.length;
  const completedActivities = activities.filter((a) => a.completed).length;

  const workoutFill =
    totalActivities > 0 ? completedActivities / totalActivities : 0;

  const workoutState =
    workoutFill === 0
      ? 'empty'
      : workoutFill < 0.3
        ? 'low'
        : workoutFill < 0.7
          ? 'mid'
          : workoutFill < 1
            ? 'high'
            : 'done';

  useEffect(() => {
    if (workoutFill > 0) {
      setPulse(true);
      const t = setTimeout(() => setPulse(false), 400);
      return () => clearTimeout(t);
    }
  }, [workoutFill]);

  const hydrationPendingL = Math.max((waterGoalMl - waterMl) / 1000, 0);

  const nextMeal = useMemo(() => {
    if (meals.length === 0) return null;
    const order = getMealOrderByTime();
    const byType = new Map(meals.map((m) => [m.mealType, m]));
    for (const t of order) {
      const m = byType.get(t);
      if (m && !isMealRegistered(m)) return { type: t, status: 'pending' };
    }
    const pending = meals.find((m) => !isMealRegistered(m));
    if (pending) return { type: pending.mealType, status: 'pending' };
    return null;
  }, [meals]);

  const handleWaterClick = () => {
    onQuickWater(100);
  };

  // Calcular ml baseado na posição (mouse ou touch)
  const calculateWaterFromPosition = (clientX) => {
    if (!waterButtonRef.current) return waterMlLocal;
    
    const rect = waterButtonRef.current.getBoundingClientRect();
    const relativeX = clientX - rect.left;
    const ratio = Math.max(0, Math.min(1, relativeX / rect.width));
    const calculatedMl = Math.round(ratio * waterGoalMl);
    
    return Math.max(0, Math.min(calculatedMl, waterGoalMl));
  };

  // Handlers para Mouse
  const handleWaterMouseDown = (e) => {
    setIsDragging(true);
    const newMl = calculateWaterFromPosition(e.clientX);
    setWaterMlLocal(newMl);
  };

  const handleWaterMouseMove = (e) => {
    if (!isDragging) return;
    const newMl = calculateWaterFromPosition(e.clientX);
    setWaterMlLocal(newMl);
  };

  const handleWaterMouseUp = (e) => {
    if (!isDragging) return;
    setIsDragging(false);
    
    const finalMl = calculateWaterFromPosition(e.clientX);
    setWaterMlLocal(finalMl);
    
    // Calcular quanto adicionar (diferença entre final e atual)
    const difference = Math.max(0, finalMl - waterMl);
    if (difference > 0) {
      onQuickWater(difference);
    }
  };

  // Handlers para Touch
  const handleWaterTouchStart = (e) => {
    setIsDragging(true);
    const touch = e.touches[0];
    const newMl = calculateWaterFromPosition(touch.clientX);
    setWaterMlLocal(newMl);
  };

  const handleWaterTouchMove = (e) => {
    if (!isDragging) return;
    const touch = e.touches[0];
    const newMl = calculateWaterFromPosition(touch.clientX);
    setWaterMlLocal(newMl);
  };

  const handleWaterTouchEnd = (e) => {
    if (!isDragging) return;
    setIsDragging(false);
    
    const touch = e.changedTouches[0];
    const finalMl = calculateWaterFromPosition(touch.clientX);
    setWaterMlLocal(finalMl);
    
    // Calcular quanto adicionar (diferença entre final e atual)
    const difference = Math.max(0, finalMl - waterMl);
    if (difference > 0) {
      onQuickWater(difference);
    }
  };

  // Setup/cleanup para eventos globais de drag
  useEffect(() => {
    if (isDragging) {
      window.addEventListener('mousemove', handleWaterMouseMove);
      window.addEventListener('mouseup', handleWaterMouseUp);
      window.addEventListener('touchmove', handleWaterTouchMove);
      window.addEventListener('touchend', handleWaterTouchEnd);

      return () => {
        window.removeEventListener('mousemove', handleWaterMouseMove);
        window.removeEventListener('mouseup', handleWaterMouseUp);
        window.removeEventListener('touchmove', handleWaterTouchMove);
        window.removeEventListener('touchend', handleWaterTouchEnd);
      };
    }
  }, [isDragging, waterMl]);

  const cta = useMemo(() => {
    const h = new Date().getHours();
    const breakfastInGoal = meals.find((m) => m.mealType === 'breakfast');
    if (h < 11 && breakfastInGoal && !isMealRegistered(breakfastInGoal)) {
      return { label: 'Registrar Café da Manhã', action: () => navigate('/diet?meal=breakfast') };
    }
    if (hydrationPendingL > 0.05) {
      return { label: 'Beber 1 copo de água', action: onQuickWater };
    }
    if (completedActivities < totalActivities) {
      return { label: 'Continuar treino', action: () => navigate('/workout') };
    }
    if (nextMeal) {
      return { label: `Abrir ${getMealLabel(nextMeal.type)}`, action: () => navigate(`/diet?meal=${nextMeal.type}`) };
    }
    return { label: 'Ver calendário', action: () => navigate('/calendar') };
  }, [hydrationPendingL, navigate, nextMeal, onQuickWater, completedActivities, totalActivities, meals]);

  if (!dailyState) return null;

  return (
    <section className={styles.wrap} aria-label="Resumo do dia">
      <div className={styles.header}>
        <div>
          <h2 className={styles.title}>Seu dia de hoje</h2>
          {/* <p className={styles.subtitle}>Estado sincronizado com o servidor</p> */}
        </div>
        <button className={styles.calendarBtn} onClick={() => navigate('/calendar')} type="button">
          📅
        </button>
      </div>

      <div className={styles.habitRow}>
        <span className={styles.habitText}>Consistência semanal: {weeklyActiveDays}/7 dias ativos</span>
        <button type="button" className={styles.editGoalsBtn} onClick={onEditGoals}>
          Agua 💧
        </button>
      </div>

      <div className={styles.grid}>
        <div className={styles.kpi}>
          <div className={styles.kpiLabel}>Próxima refeição</div>
          <div className={styles.kpiValueSmall}>{nextMeal ? getMealLabel(nextMeal.type) : 'Tudo feito'}</div>
          <button
            type="button"
            className={styles.linkBtn}
            onClick={() => (nextMeal ? navigate(`/diet?meal=${nextMeal.type}`) : navigate('/diet'))}
          >
            Abrir plano alimentar →
          </button>
        </div>

        <div className={styles.kpi}>
          <div className={styles.kpiLabel}>Meta alimentar do dia</div>
          <div className={styles.kpiValueSmall}>
            {mealProgress.registeredCount}/{mealProgress.inGoalCount}
          </div>
          <div className={styles.kpiHint}>
            {mealProgress.percent}% · refeições na meta registradas
          </div>
        </div>

        <div
          className={`${styles.kpi} ${styles.clickable}`}
          onClick={() => navigate('/workout')}
          role="button"
        >
          <div className={styles.kpiLabel}>Próximo treino</div>
          <div className={styles.kpiValueSmall}>
            {nextWorkout ? nextWorkout.name : 'Registre + treinos'}
          </div>
          <div className={`${styles.kpiHint} ${styles.linkBtn}`}>Registrar treino →</div>
        </div>

        <div
          className={`${styles.kpi} ${styles.workoutKpi} ${styles[workoutState]} ${
            pulse ? styles.pulse : ''
          }`}
        >
          <div className={styles.kpiLabel}>Meta de treinos</div>
          <div className={styles.kpiValueSmall}>
            {workoutGoal === 0 ? 'Registre treinos' : `${Math.round(workoutFill * 100)}%`}
          </div>
          <div className={styles.kpiHint}>
            {workoutGoal === 0
              ? 'Defina sua rotina diária'
              : workoutFill === 1
                ? 'Treino concluído'
                : 'Em progresso'}
          </div>
        </div>
      </div>

      <button
        ref={waterButtonRef}
        type="button"
        className={`${styles.waterButton} ${waterMlLocal >= waterGoalMl ? styles.filled : ''} ${isDragging ? styles.dragging : ''}`}
        onClick={handleWaterClick}
        onMouseDown={handleWaterMouseDown}
        onTouchStart={handleWaterTouchStart}
      >
        <div className={styles.waterProgress} style={{ width: `${progress}%` }} />
        <span className={styles.waterPercentage}>{Math.round(progress)}%</span>
        <span className={styles.waterText}>
          {waterMlLocal >= waterGoalMl ? '✓ Meta de hidratação concluída' : 'Adicionar água'}
        </span>
        <span className={styles.waterMini}>
          {Math.floor(waterMlLocal / 1000)}.{Math.floor((waterMlLocal % 1000) / 100)}L / {waterGoalMl / 1000}L
        </span>
      </button>

      <div className={styles.sleepCard} style={{ position: 'relative' }}>
        <div className={styles.sleepBackgroundFill} style={sleepFillStyle} />

        <div
          className={styles.sleepOverlay}
          style={{ width: `${sleepPercent}%` }}
          aria-hidden="true"
        >
        </div>

        <span className={styles.sleepLabel}>Horas dormidas</span>

        <div className={styles.sleepTrackWrap}>
          <div className={styles.sleepTrack}>
            <div className={styles.sleepFill} style={{ width: `${sleepPercent}%`, background: getSleepFillGradient(sleepMinutesLocal) }} />
            <div className={styles.sleepThumb} style={{ left: `${sleepPercent}%` }} />
          </div>

          <input
            type="range"
            min="0"
            max="720"
            step="1"
            value={sleepMinutesLocal}
            onInput={(e) => handleSleepDrag(Number(e.target.value))}
            onPointerUp={(e) => commitSleepValue(Number(e.currentTarget.value))}
            className={styles.sleepRange}
            aria-label="Horas dormidas"
          />
        </div>
          <span className={styles.sleepValue}>{sleepHoursLabel}</span>
        </div>

    </section>
  );
}
