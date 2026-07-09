import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import Header from '../components/Header';
import BottomNavigation from '../components/BottomNavigation';
import StatCard from '../components/StatCard';
import CheckItem from '../components/CheckItem';
import StreakCard from '../components/StreakCard';
import InsightCard from '../components/InsightCard';
import DailySummaryCard from '../components/DailySummaryCard';
import { useToast } from '../components/toast/ToastProvider';
import MealRegisterModal from '../components/MealRegisterModal';

import { usersAPI, dailyStateAPI, dietAPI } from '../services/api';
import {
  getMealLabel,
  isMealRegistered,
  getActiveGoalMeals,
  sortMealsByType,
} from '../constants/meals';
import styles from './Dashboard.module.css';
import WorkoutRoutineSetup from './WorkoutRoutineSetup';
import { getAdjacentCategoryIndex } from './dashboardChecklistUtils';


function getMoodIcon(progressScore = 0) {
  if (progressScore >= 80) return '✨';
  if (progressScore >= 50) return '⚡';
  return '🌱';
}


function toDateKey(d = new Date()) {
  const x = new Date(d);
  const y = x.getFullYear();
  const m = String(x.getMonth() + 1).padStart(2, '0');
  const day = String(x.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

const Dashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const toast = useToast();
  const [dailyState, setDailyState] = useState(null);
  const [user, setUser] = useState(null);
  const [weeklyActiveDays, setWeeklyActiveDays] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showGoalsModal, setShowGoalsModal] = useState(false);
  const [goalForm, setGoalForm] = useState({
    caloriesGoal: 2000,
    waterGoalMl: 2000,
    workoutGoal: 1,
  });
  const [showSetup, setShowSetup] = useState(false);
  const [hasInitializedRoutine, setHasInitializedRoutine] = useState(() => 
    localStorage.getItem('hasInitializedRoutine') === 'true'
  );
  const [activeChecklistCategoryIndex, setActiveChecklistCategoryIndex] = useState(0);
  const [isDraggingChecklist, setIsDraggingChecklist] = useState(false);
  const [dragOffsetX, setDragOffsetX] = useState(0);
  const touchStartX = useRef(null);
  const progressScore = dailyState?.progressScore ?? 0;

// NOVO: ESTADOS PARA REGISTRO DE REFEIÇÃO
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [registerMealId, setRegisterMealId] = useState(null);

  const [registerMode, setRegisterMode] = useState('manual');
  const [manualNote, setManualNote] = useState('');
  const [photoPreview, setPhotoPreview] = useState('');
  const [photoData, setPhotoData] = useState('');
  const [submitting, setSubmitting] = useState(false);


  const dateKey = toDateKey();

  const loadData = useCallback(async () => {
    try {
      const [stateRes, userRes, recentRes] = await Promise.all([
        dailyStateAPI.get(dateKey),
        usersAPI.getProfile(),
        dailyStateAPI.getRecent(7),
      ]);
      setDailyState(stateRes.data.state);
      setUser(userRes.data);
      const active = (recentRes.data.days || []).filter((d) => d.progressScore > 0).length;
      setWeeklyActiveDays(active);
    } catch (err) {
      console.error(err);
      toast.error('Erro ao carregar seu dia');
    } finally {
      setLoading(false);
    }
  }, [dateKey, toast]);

  useEffect(() => {
    loadData();
  }, [loadData, location.key]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') loadData();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [loadData]);

  useEffect(() => {
    const handleMealStateChanged = () => {
      loadData();
    };

    window.addEventListener(
      'meal-state-changed',
      handleMealStateChanged
    );

    return () => {
      window.removeEventListener(
        'meal-state-changed',
        handleMealStateChanged
      );
    };
  }, [loadData]);



  useEffect(() => {
    if (!dailyState) return;

    if (hasInitializedRoutine) return;

    if (!dailyState.hasWorkoutRoutine) {
      setShowSetup(true);
    }
  }, [dailyState, hasInitializedRoutine]);


  const applyAction = async (action, payload = {}) => {
    try {
      const res = await dailyStateAPI.applyAction({
        date: dateKey,
        action,
        payload,
      });

      setDailyState(res.data.state);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCheckChange = async (key, value) => {
    if (key === 'water') {
      await applyAction('ADD_WATER', { ml: value });
      return;
    } 
    if (key === 'sleep') {
      await applyAction('UPDATE_SLEEP', { hours: value });
    }
  };
  const handleMealToggle = async (mealId, value) => {
    try {
      const res = await dailyStateAPI.applyAction({
        date: dateKey,
        action: 'COMPLETE_MEAL_BY_ID',
        payload: { mealId, done: value },
      });
      setDailyState(res.data.state);
    } catch (e) {
      toast.error(e.response?.data?.error || 'Erro ao atualizar refeição');
    }
  };


  const openRegisterModal = (mealId) => {
    setRegisterMealId(mealId);

    setRegisterMode('manual');
    setManualNote('');
    setPhotoPreview('');
    setPhotoData('');

    setShowRegisterModal(true);
  };

  const closeRegisterModal = () => {
    setShowRegisterModal(false);

    setRegisterMealId(null);

    setRegisterMode('manual');
    setManualNote('');
    setPhotoPreview('');
    setPhotoData('');
  };

  const handlePhotoSelect = (e) => {
    const file = e.target.files?.[0];

    if (!file) return;

    const reader = new FileReader();

    reader.onload = () => {
      const result = reader.result;

      setPhotoData(result);
      setPhotoPreview(result);

      setRegisterMode('photo');
    };

    reader.readAsDataURL(file);
  };

  const handleRegisterMeal = async (e) => {
    e.preventDefault();

    if (!registerMealId) return;

    setSubmitting(true);

    try {
      const payload =
        registerMode === 'photo'
          ? {
              mode: 'photo',
              photoData,
            }
          : {
              mode: 'manual',
              note: manualNote,
            };

      await dietAPI.registerMeal(registerMealId, payload);

      window.dispatchEvent(
        new CustomEvent('meal-state-changed')
      );

      await loadData();

      closeRegisterModal();

      toast.success('Refeição registrada');
    } catch (err) {
      toast.error(
        err.response?.data?.error ||
        'Erro ao registrar refeição'
      );
    } finally {
      setSubmitting(false);
    }
  };



  const openGoals = () => {
    if (dailyState?.goals) {
      setGoalForm({
        caloriesGoal: dailyState.goals.caloriesGoal,
        waterGoalMl: dailyState.goals.waterGoalMl,
        workoutGoal: dailyState.goals.workoutGoal,
      });
    }
    setShowGoalsModal(true);
  };

  const saveGoals = async () => {
    await applyAction('UPDATE_GOAL', {
      caloriesGoal: Number(goalForm.caloriesGoal),
      waterGoalMl: Number(goalForm.waterGoalMl),
      workoutGoal: Number(goalForm.workoutGoal),
    });

    await loadData();

    setShowGoalsModal(false);
    toast.success('Metas atualizadas');
  };

  const meals = useMemo(
    () => sortMealsByType(getActiveGoalMeals(dailyState)),
    [dailyState]
  );
  const totalCalories = dailyState?.caloriesConsumed ?? 0;
  const streak = user?.streak || 0;

  const waterGoalMl = dailyState?.goals?.waterGoalMl || 2000;
  const waterLitersMax = Math.max(1, Math.ceil(waterGoalMl / 1000));
  const waterLitersValue = Math.min(waterLitersMax, Math.round((dailyState?.waterMl || 0) / 1000));

  const sleepHours = dailyState?.sleepHours ?? 0;

  const activities = [
      ...(dailyState?.workout?.plan || []),
      ...(dailyState?.workout?.exercises || []),
    ];

  const totalActivities = activities.length;
  const completedActivities = activities.filter(a => a.completed).length;
  const workoutPercentage = totalActivities
    ? Math.round((completedActivities / totalActivities) * 100)
    : 0;

  const checklistCategories = [
    { key: 'alimentacao', label: 'Alimentação' },
    { key: 'treino', label: 'Treino' },
    { key: 'cotidiano', label: 'Cotidiano' },
  ];

  const activeChecklistCategory =
    checklistCategories[activeChecklistCategoryIndex] || checklistCategories[0];

  const navigateChecklistCategory = useCallback((direction) => {
    setActiveChecklistCategoryIndex((prev) =>
      getAdjacentCategoryIndex(prev, direction, checklistCategories.length)
    );
  }, [checklistCategories.length]);

  const handleTouchStart = (event) => {
    touchStartX.current = event.touches[0]?.clientX ?? null;
    setIsDraggingChecklist(true);
    setDragOffsetX(0);
  };

  const handleTouchMove = (event) => {
    if (touchStartX.current === null) return;

    const currentX = event.touches[0]?.clientX ?? null;
    if (currentX === null) return;

    setDragOffsetX(currentX - touchStartX.current);
  };

  const handleTouchEnd = (event) => {
    if (touchStartX.current === null) return;

    const touchEndX = event.changedTouches[0]?.clientX ?? null;

    if (touchEndX === null) {
      setIsDraggingChecklist(false);
      setDragOffsetX(0);
      return;
    }

    const delta = touchEndX - touchStartX.current;

    if (delta > 70) {
      navigateChecklistCategory(-1);
    } else if (delta < -70) {
      navigateChecklistCategory(1);
    }

    touchStartX.current = null;
    setIsDraggingChecklist(false);
    setDragOffsetX(0);
  };

  if (loading || !dailyState) {
    return <div className="text-gray-900 dark:text-white">Carregando...</div>;
  }

  
  
  return (

    <div className={`${styles.dashboard} bg-gray-100 dark:bg-gray-900`}>
      <Header />

      <main className={styles.main}>
        <div className={styles.container}>
          <section className={styles.greeting}>
            <div className="text-2xl animate-pulse">
              {getMoodIcon(progressScore)}
            </div>

             {/*} 🆕 MENSAGEM DE BOAS-VINDAS PERSONALIZADA */}
            <h1 className="text-gray-600 dark:text-gray-300">Bom dia! {/*mudar conforme hora para tarde/noite*/}
              <p className="text-gray-100 dark:text-gray-150">Pequenas escolhas diarias constroem grandes mudanças.</p>
            </h1> 

            {/* 🆕 BOTÃO DE ACESSO RÁPIDO AO CALENDÁRIO */}
            <button className={styles.calendarBtn} onClick={() => navigate('/calendar')} type="button">
              📅
            </button>
          </section>

          <DailySummaryCard
            dailyState={dailyState}
            weeklyActiveDays={weeklyActiveDays}
            sleepHours={sleepHours}
            onSleepChange={(minutes) => applyAction('UPDATE_SLEEP', { hours: minutes / 60 })}
            onQuickWater={(amount) => applyAction('ADD_WATER', { ml: amount })}
            onQuickWorkoutToggle={() => navigate('/workout')}
            onEditGoals={openGoals}
          />
          
          
          {/* 📊 STATS GRID 
          <section className={styles.statsGrid}>
            <StatCard
              icon="🔥"
              title="Kcal"
              value={totalCalories}
              unit="kcal"
              trend={{
                positive: totalCalories <= (dailyState.goals?.caloriesGoal || 2000),
                value: `Meta ${dailyState.goals?.caloriesGoal || 2000}`,
              }}
            />
            <StreakCard streak={streak} />
          </section>*/}

          <section className={styles.section}>
            <div className={styles.checklistHeader}>
              <div className={styles.checklistNav}>
                {activeChecklistCategoryIndex > 0 && (
                  <button
                    type="button"
                    className={styles.navArrow}
                    aria-label="Categoria anterior"
                    onClick={() => navigateChecklistCategory(-1)}
                  >
                    ‹
                  </button>
                )}

                <div className={styles.categoryTabs} role="tablist" aria-label="Categorias do checklist">
                  {checklistCategories.map((category, index) => (
                    <button
                      key={category.key}
                      type="button"
                      role="tab"
                      aria-selected={index === activeChecklistCategoryIndex}
                      className={`${styles.categoryTab} ${index === activeChecklistCategoryIndex ? styles.categoryTabActive : ''}`}
                      onClick={() => setActiveChecklistCategoryIndex(index)}
                    >
                      {category.label}
                    </button>
                  ))}
                </div>

                {activeChecklistCategoryIndex < checklistCategories.length - 1 && (
                  <button
                    type="button"
                    className={styles.navArrow}
                    aria-label="Próxima categoria"
                    onClick={() => navigateChecklistCategory(1)}
                  >
                    ›
                  </button>
                )}
              </div>
            </div>

            <div
              className={styles.checklistSurface}
              onTouchStart={handleTouchStart}
              onTouchMove={handleTouchMove}
              onTouchEnd={handleTouchEnd}
              style={{
                transform: isDraggingChecklist ? `translateX(${dragOffsetX}px)` : undefined,
                opacity: isDraggingChecklist ? 0.94 : undefined,
              }}
            >
              {activeChecklistCategory.key === 'alimentacao' && (
                <div className={styles.checklist}>
                  {meals.map((meal) => (
                    <CheckItem
                      key={meal.id}
                      id={meal.id}
                      type="meal"
                      label={meal.displayName || getMealLabel(meal.mealType)}
                      checked={isMealRegistered(meal)}
                      onChange={(checked) => handleMealToggle(meal.id, checked)}
                      onLabelClick={() => navigate(`/diet?meal=${meal.mealType}`)}
                      onCameraClick={() => openRegisterModal(meal.id)}
                    />
                  ))}
                </div>
              )}

              {activeChecklistCategory.key === 'treino' && (
                <div className={styles.checklist}>
                  {activities.map((activity) => (
                    <CheckItem
                      key={activity.id}
                      id={activity.id}
                      type="workout"
                      label={activity.name}
                      checked={Boolean(activity.completed)}
                      onChange={(checked) =>
                        applyAction('TOGGLE_WORKOUT_ACTIVITY', {
                          activityId: activity.id,
                          done: checked,
                        })
                      }
                      onLabelClick={() => navigate('/workout')}
                    />
                  ))}
                </div>
              )}

              {activeChecklistCategory.key === 'cotidiano' && (
                <div className={styles.emptyCategory}>
                  <p>Nenhum hábito adicionado ainda.</p>
                  <span>Adicione atividades pelo calendário para vê-las aqui.</span>
                </div>
              )}
            </div>
          </section>

          <section className={styles.section}>
            <InsightCard />
          </section>

          <div className={styles.spacer} />
        </div>
      </main>

      {showGoalsModal && (
        <div className={styles.goalsOverlay}>
          <div className={styles.goalsModal}>
            <h3>Personalizar metas diárias</h3>
            <p>Suas metas ajudam o Sage a interpretar seu dia e mostrar sua evolução em tempo real.</p>
            {/*<label>
              Meta de calorias
              <input
                type="number"
                min="1200"
                max="4500"
                value={goalForm.caloriesGoal}
                onChange={(e) => setGoalForm((prev) => ({ ...prev, caloriesGoal: e.target.value }))}
              />
            </label>*/}

            <label>
              Meta de água (ml)
              <input
                type="number"
                min="500"
                max="6000"
                step="100"
                value={goalForm.waterGoalMl}
                onChange={(e) => setGoalForm((prev) => ({ ...prev, waterGoalMl: e.target.value }))}
              />
            </label>
            <p style={{ fontSize: '0.85rem', color: '#6b7280', margin: '0 0 0.5rem' }}>
              Refeições da meta são definidas no plano alimentar.
            </p>
            <div className={styles.goalsActions}>
              <button type="button" onClick={() => setShowGoalsModal(false)}>
                Cancelar
              </button>
              <button type="button" className={styles.primaryBtn} onClick={saveGoals}>
                Salvar metas
              </button>
            </div>
          </div>
        </div>
      )}

      {showSetup && (
        <WorkoutRoutineSetup
          onClose={() => setShowSetup(false)}
          onSave={ async (sessions) => {
            await applyAction('SET_SESSIONS', { sessions });

            localStorage.setItem('hasInitializedRoutine', 'true');
            sethasInitializedRoutine(true);
            setShowSetup(false);

            await loadData();
          }}
        />
      )}
      <MealRegisterModal
        open={showRegisterModal}
        onClose={closeRegisterModal}
        onSubmit={handleRegisterMeal}
        registerMode={registerMode}
        setRegisterMode={setRegisterMode}
        manualNote={manualNote}
        setManualNote={setManualNote}
        photoPreview={photoPreview}
        photoData={photoData}
        onPhotoSelect={handlePhotoSelect}    
        submitting={submitting}
      />

      <BottomNavigation />
    </div>
  );
};

export default Dashboard;
