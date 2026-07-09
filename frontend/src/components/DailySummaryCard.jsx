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

  // Estado local para a hidratação, usado como fonte única para a UI durante o arraste
  const [waterMlLocal, setWaterMlLocal] = useState(waterMl);

  useEffect(() => {
    if (!isDragging) {
      setWaterMlLocal(waterMl);
    }
  }, [waterMl, isDragging]);


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

  const sleepMoonPhase = useMemo(() => {
    if (sleepMinutesLocal <= 120) {
      return { icon: '🌑', message: 'Sono insuficiente' };
    }
    if (sleepMinutesLocal <= 240) {
      return { icon: '🌒', message: 'Descanso parcial' };
    }
    if (sleepMinutesLocal <= 360) {
      return { icon: '🌓', message: 'Sono aceitável' };
    }
    if (sleepMinutesLocal <= 540) {
      return { icon: '🌕', message: 'Faixa ideal' };
    }
    if (sleepMinutesLocal <= 600) {
      return { icon: '🌖', message: 'Descanso elevado' };
    }
    if (sleepMinutesLocal <= 660) {
      return { icon: '🌗', message: 'Sono prolongado' };
    }
    return { icon: '🌘', message: 'Um pouco demais' };
  }, [sleepMinutesLocal]);



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
  const waterProgress = waterGoalMl > 0
    ? Math.round(Math.min(100, (waterMlLocal / waterGoalMl) * 100))
    : 0;

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
      if (m && !isMealRegistered(m)) 
        return { 
          type: t,
          displayName: m.displayName || getMealLabel(t), 
          status: 'pending' };
    }

    const pending = meals.find((m) => !isMealRegistered(m));
    if (pending) 
      return { 
        type: pending.mealType, 
        displayName: pending.displayName || getMealLabel(pending.mealType),
        status: 'pending' };

    return null;
  }, [meals]);

  /*const handleWaterClick = () => {
    onQuickWater(100);
  };*/

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
    e.preventDefault();
    setIsDragging(true);
    const newMl = calculateWaterFromPosition(e.clientX);
    setWaterMlLocal(newMl);
  };

  const handleWaterMouseMove = (e) => {
    if (!isDragging) return;
    e.preventDefault();
    const newMl = calculateWaterFromPosition(e.clientX);
    setWaterMlLocal(newMl);
  };

  const handleWaterMouseUp = (e) => {
    if (!isDragging) return;
    e.preventDefault();
    setIsDragging(false);
    
    const finalMl = calculateWaterFromPosition(e.clientX);
    setWaterMlLocal(finalMl);
    
    // Persistir o valor final, inclusive quando o usuário reduz a barra
    const difference = finalMl - waterMl;
    if (difference !== 0) {
      onQuickWater(difference);
    }
  };

  // Handlers para Touch
  const handleWaterTouchStart = (e) => {
    e.preventDefault();
    setIsDragging(true);
    const touch = e.touches[0];
    const newMl = calculateWaterFromPosition(touch.clientX);
    setWaterMlLocal(newMl);
  };

  const handleWaterTouchMove = (e) => {
    if (!isDragging) return;
    e.preventDefault();
    const touch = e.touches[0];
    const newMl = calculateWaterFromPosition(touch.clientX);
    setWaterMlLocal(newMl);
  };

  const handleWaterTouchEnd = (e) => {
    if (!isDragging) return;
    e.preventDefault();
    setIsDragging(false);
    
    const touch = e.changedTouches[0];
    const finalMl = calculateWaterFromPosition(touch.clientX);
    setWaterMlLocal(finalMl);
    
    // Persistir o valor final, inclusive quando o usuário reduz a barra
    const difference = finalMl - waterMl;
    if (difference !== 0) {
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

  const progressScore = dailyState.progressScore ?? 0;
  const calendarStatus = dailyState.calendarStatus || 'red';

  return (
    <section className={styles.wrap} aria-label="Resumo do dia">
      <div className={styles.header}>
        <div className={styles.headerMain}>
          <h2 className={styles.title}>Seu dia de hoje</h2>
          <div className={styles.dayScore} aria-label={`Score do dia: ${progressScore}%`}>
            <div className={styles.dayScoreRow}>
              <span className={styles.dayScoreLabel}>Score do dia</span>
              <span className={styles.dayScoreValue}>{progressScore}%</span>
            </div>
            <div className={styles.dayScoreTrack}>
              <div
                className={`${styles.dayScoreFill} ${styles[`status_${calendarStatus}`]}`}
                style={{ width: `${progressScore}%` }}
              />
            </div>
          </div>
        </div>
      </div>

      
        <div className={styles.habitRow}>
          <span className={styles.habitText}>Consistência semanal: {weeklyActiveDays}/7 dias ativos</span>
          <button type="button" className={styles.editGoalsBtn} onClick={onEditGoals}>
            Agua <div className='animate-pulse'>💧</div>
          </button>
        </div>

        {/* Card Alimentação */}
        <div className={styles.domainCard}>
          <div className={styles.domainHeader}>
            <span>🥗 Alimentação</span>
            <span>{mealProgress.registeredCount}/{mealProgress.inGoalCount}</span>
          </div>

          <div className={styles.domainMain}>
            <span>Próxima refeição: {nextMeal ? (nextMeal.displayName || getMealLabel(nextMeal.type)) : 'Tudo feito'}</span>
          </div>

          <div className={styles.bar}>
            <div style={{ width: `${mealProgress.percent}%` }} />
          </div>

          <button onClick={() => navigate('/diet')}>
            Ver plano →
          </button>
        </div>
        
        {/* Card Treino */}
        <div className={styles.domainCard}>
          <div className={styles.domainHeader}>
            <span>🏋️ Treino</span>
            <span>{completedActivities}/{activities.length}</span>
          </div>

          <div className={styles.domainMain}>
            <span>
              Próximo: {nextWorkout ? nextWorkout.name : 'Rotina livre'}
            </span>
          </div>

          <div className={styles.bar}>
            <div style={{ width: `${workoutFill * 100}%` }} />
          </div>

          <button onClick={() => navigate('/workout')}>
            Ver rotina →
          </button>
        </div>
      

      <button
        ref={waterButtonRef}
        type="button"
        className={`${styles.waterButton} ${waterMlLocal >= waterGoalMl ? styles.filled : ''} ${isDragging ? styles.dragging : ''}`}
        /*</section>onClick={handleWaterClick}*/
        onMouseDown={handleWaterMouseDown}
        onTouchStart={handleWaterTouchStart}
      >
        <div className={styles.waterProgress} style={{ width: `${waterProgress}%` }} />
        <span className={styles.waterPercentage}>{waterProgress}%</span>
        <span className={styles.waterText}>
          {waterMlLocal >= waterGoalMl ? '✓ Meta de hidratação concluída' : 'Adicionar água'}
        </span>
        <span className={styles.waterMini}>
          {Math.floor(waterMlLocal / 1000)}.{Math.floor((waterMlLocal % 1000) / 100)}L / {waterGoalMl / 1000}L
        </span>
      </button>

      <div className={styles.sleepCard}>
        <div className={styles.moonWrap}>
          <div className={styles.moon} aria-hidden="true">{sleepMoonPhase.icon}</div>
          <div className={styles.moonMeta}>
            <span className={styles.sleepTitle}>Sono</span>
            <span className={styles.sleepPhase}>{sleepMoonPhase.label}</span>
          </div>
        </div>

        <div className={styles.sleepTrackWrap}>
          <div className={styles.sleepTrack}>
            <div className={styles.sleepFill} style={{ width: `${sleepPercent}%` }} />
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

        <div className={styles.sleepMeta}>
          <span className={styles.sleepValue}>{sleepHoursLabel}</span>
          <span className={styles.sleepMessage}>{sleepMoonPhase.message}</span>
        </div>
      </div>

    </section>
  );
}
