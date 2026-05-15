import React, { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import Header from '../components/Header';
import BottomNavigation from '../components/BottomNavigation';
import { dietAPI } from '../services/api';
import { MEAL_TYPES, computeMealProgress, isMealRegistered } from '../constants/meals';
import styles from './DietPlan.module.css';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001';

const DietPlan = () => {
  const location = useLocation();
  const [meals, setMeals] = useState([]);
  const [progress, setProgress] = useState({ inGoalCount: 0, registeredCount: 0, percent: 0 });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [registerMealId, setRegisterMealId] = useState(null);
  const [registerMode, setRegisterMode] = useState('manual');
  const [manualNote, setManualNote] = useState('');
  const [photoPreview, setPhotoPreview] = useState('');
  const [photoData, setPhotoData] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const loadMeals = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const today = new Date().toISOString().split('T')[0];
      const response = await dietAPI.getMeals(today);
      const data = response.data;
      if (Array.isArray(data)) {
        setMeals(data);
        setProgress(computeMealProgress(data));
      } else {
        setMeals(data.meals || []);
        setProgress(data.progress || computeMealProgress(data.meals || []));
      }
    } catch (err) {
      setError('Erro ao carregar refeições');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMeals();
  }, [loadMeals, location.key]);

  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') loadMeals();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, [loadMeals]);

  const applyMealsResponse = (response) => {
    const data = response.data;
    if (Array.isArray(data)) {
      setMeals(data);
      setProgress(computeMealProgress(data));
    } else {
      setMeals(data.meals || []);
      setProgress(data.progress || computeMealProgress(data.meals || []));
    }
  };

  const handleToggleInGoal = async (meal, inGoal) => {
    try {
      const response = await dietAPI.updateMeal(meal.id, { inGoal });
      applyMealsResponse(response);
    } catch (err) {
      alert('Erro ao atualizar meta do dia');
    }
  };

  const openRegisterModal = (meal) => {
    setRegisterMealId(meal.id);
    setRegisterMode('manual');
    setManualNote('');
    setPhotoPreview('');
    setPhotoData('');
    setShowRegisterModal(true);
  };

  const closeRegisterModal = () => {
    setShowRegisterModal(false);
    setRegisterMealId(null);
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

  const handleRegister = async (e) => {
    e.preventDefault();
    if (!registerMealId) return;

    setSubmitting(true);
    try {
      const payload =
        registerMode === 'photo'
          ? { mode: 'photo', photoData }
          : { mode: 'manual', note: manualNote };

      const response = await dietAPI.registerMeal(registerMealId, payload);
      applyMealsResponse(response);
      closeRegisterModal();
    } catch (err) {
      alert(err.response?.data?.error || 'Erro ao registrar refeição');
    } finally {
      setSubmitting(false);
    }
  };

  const photoSrc = (url) => {
    if (!url) return '';
    if (url.startsWith('http') || url.startsWith('data:')) return url;
    return `${API_BASE}${url}`;
  };

  return (
    <div className={styles.container}>
      <Header />

      <main className={styles.main}>
        <div className={styles.content}>
          <section className={styles.header}>
            <h1>Plano Alimentar</h1>
            <p>Acompanhe suas refeições do dia</p>
          </section>

          <section className={styles.progress}>
            <div className={styles.progressLabel}>
              <span>
                {progress.registeredCount} de {progress.inGoalCount} refeições na meta
              </span>
              <span className={styles.percentage}>{progress.percent}%</span>
            </div>
            <div className={styles.progressBar}>
              <div className={styles.progressFill} style={{ width: `${progress.percent}%` }} />
            </div>
          </section>

          {error && <p className={styles.error}>{error}</p>}
          {loading && <p className={styles.loading}>Carregando...</p>}

          <section className={styles.meals}>
            {MEAL_TYPES.map((type) => {
              const meal = meals.find((m) => m.mealType === type.mealType);
              if (!meal) return null;

              return (
                <div key={type.mealType} className={styles.mealSection}>
                  <div className={styles.mealHeader}>
                    <h3>{type.label}</h3>
                    <div className={styles.mealActions}>
                      {isMealRegistered(meal) ? (
                        <span className={styles.registeredBadge}>✅ Registrado</span>
                      ) : meal.inGoal ? (
                        <>
                          <button
                            type="button"
                            onClick={() => openRegisterModal(meal)}
                            className={styles.registerBtn}
                          >
                            📷 Registrar refeição
                          </button>
                          <button
                            type="button"
                            onClick={() => handleToggleInGoal(meal, false)}
                            className={styles.removeGoalBtn}
                          >
                            ➖ Remover da meta
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleToggleInGoal(meal, true)}
                          className={styles.addGoalBtn}
                        >
                          ➕ Adicionar à meta do dia
                        </button>
                      )}
                    </div>
                  </div>

                  {isMealRegistered(meal) && (meal.photoUrl || meal.registrationNote) && (
                    <div className={styles.registrationDetail}>
                      {meal.photoUrl && (
                        <img
                          src={photoSrc(meal.photoUrl)}
                          alt={`Registro ${type.label}`}
                          className={styles.mealPhoto}
                        />
                      )}
                      {meal.registrationNote && (
                        <p className={styles.registrationNote}>{meal.registrationNote}</p>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </section>

          {showRegisterModal && (
            <div className={styles.modal}>
              <div className={styles.modalContent}>
                <h3>Registrar refeição</h3>
                <form onSubmit={handleRegister}>
                  <div className={styles.registerTabs}>
                    <button
                      type="button"
                      className={registerMode === 'manual' ? styles.tabActive : styles.tab}
                      onClick={() => setRegisterMode('manual')}
                    >
                      Manual
                    </button>
                    <button
                      type="button"
                      className={registerMode === 'photo' ? styles.tabActive : styles.tab}
                      onClick={() => setRegisterMode('photo')}
                    >
                      Foto
                    </button>
                  </div>

                  {registerMode === 'manual' ? (
                    <textarea
                      placeholder="Descreva o que você comeu..."
                      value={manualNote}
                      onChange={(e) => setManualNote(e.target.value)}
                      required
                      rows={4}
                    />
                  ) : (
                    <div className={styles.photoUpload}>
                      <input
                        type="file"
                        accept="image/*"
                        capture="environment"
                        onChange={handlePhotoSelect}
                      />
                      {photoPreview && (
                        <img src={photoPreview} alt="Prévia" className={styles.photoPreview} />
                      )}
                    </div>
                  )}

                  <div className={styles.modalActions}>
                    <button type="button" onClick={closeRegisterModal}>
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={submitting || (registerMode === 'photo' && !photoData)}
                    >
                      {submitting ? 'Salvando...' : 'Registrar'}
                    </button>
                  </div>
                </form>
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

export default DietPlan;
