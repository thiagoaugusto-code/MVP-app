import { useCallback, useEffect, useRef, useState } from 'react';
import Header from '../components/Header';
import BottomNavigation from '../components/BottomNavigation';
import { progressAPI } from '../services/api';
import { useToast } from '../components/toast/ToastProvider';
import styles from './Progress.module.css';

const TIMELINE_MAX_WEEKS = 9;

function formatKg(value) {
  if (value == null || Number.isNaN(Number(value))) return '—';
  return `${Number(value).toFixed(1)} kg`;
}

function formatDelta(value) {
  if (value == null || Number.isNaN(Number(value))) return '—';
  const n = Number(value);
  const sign = n > 0 ? '+' : '';
  return `${sign}${n.toFixed(1)} kg`;
}

function formatDate(date) {
  if (!date) return '';
  return new Date(date).toLocaleDateString('pt-BR', {
    day: '2-digit',
    month: '2-digit',
  });
}

function maxBarValue(values, fallback = 1) {
  const nums = values.filter((v) => v != null && v > 0);
  return nums.length ? Math.max(...nums) : fallback;
}

function formatPaceValue(value) {
  if (value == null || Number.isNaN(Number(value))) return '—';
  return Number(value).toFixed(1);
}

function formatWorkoutPaceComparison(pace) {
  if (!pace) return null;
  const { delta, direction } = pace;
  if (direction === 'same' || delta === 0) {
    return { text: '→ Mesmo ritmo do mês passado', color: '#64748b' };
  }
  const absDelta = Math.abs(Number(delta));
  const treinoLabel = absDelta === 1 ? 'treino' : 'treinos';
  if (direction === 'up') {
    return {
      text: `↑ +${absDelta} ${treinoLabel} vs. mês passado`,
      color: '#059669',
    };
  }
  return {
    text: `↓ -${absDelta} ${treinoLabel} vs. mês passado`,
    color: '#ea580c',
  };
}

function SwipeCarousel({ items, renderItem, getKey, ariaLabel, slideClassName, trackClassName }) {
  const trackRef = useRef(null);
  const [active, setActive] = useState(0);

  const syncActive = useCallback(() => {
    const el = trackRef.current;
    if (!el || !items.length) return;
    const page = el.clientWidth || 1;
    const index = Math.round(el.scrollLeft / page);
    setActive(Math.max(0, Math.min(items.length - 1, index)));
  }, [items.length]);

  useEffect(() => {
    const el = trackRef.current;
    if (!el) return undefined;
    syncActive();
    el.addEventListener('scroll', syncActive, { passive: true });
    window.addEventListener('resize', syncActive);
    return () => {
      el.removeEventListener('scroll', syncActive);
      window.removeEventListener('resize', syncActive);
    };
  }, [syncActive, items]);

  if (!items.length) return null;

  return (
    <div className={styles.carousel} aria-label={ariaLabel}>
      <div
        ref={trackRef}
        className={`${styles.carouselTrack} ${trackClassName || ''}`}
      >
        {items.map((item, index) => (
          <div
            key={getKey(item, index)}
            className={slideClassName || styles.carouselSlide}
          >
            {renderItem(item, index)}
          </div>
        ))}
      </div>
      {items.length > 1 && items.length <= 9 && (
        <div className={styles.carouselDots} role="tablist" aria-label="Navegação">
          {items.map((item, index) => (
            <button
              key={`dot-${getKey(item, index)}`}
              type="button"
              role="tab"
              aria-selected={index === active}
              className={`${styles.carouselDot} ${index === active ? styles.carouselDotActive : ''}`}
              onClick={() => {
                const el = trackRef.current;
                if (!el) return;
                el.scrollTo({
                  left: index * el.clientWidth,
                  behavior: 'smooth',
                });
              }}
            />
          ))}
        </div>
      )}
      {items.length > 1 && (
        <p className={styles.carouselHint}>
          {active + 1} / {items.length} · deslize para navegar
        </p>
      )}
    </div>
  );
}

const Progress = () => {
  const toast = useToast();
  const [overview, setOverview] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [weightInput, setWeightInput] = useState('');
  const [goalInput, setGoalInput] = useState('');
  const [showWeightForm, setShowWeightForm] = useState(false);
  const [showGoalForm, setShowGoalForm] = useState(false);

  const loadOverview = useCallback(async () => {
    try {
      setLoading(true);
      const res = await progressAPI.getOverview(90);
      const data = res.data.overview;
      setOverview(data);
      if (data?.weight?.target != null) {
        setGoalInput(String(data.weight.target));
      }
    } catch (error) {
      console.error('Erro ao carregar progresso:', error);
      toast.error(error.response?.data?.error || 'Não foi possível carregar o progresso');
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    loadOverview();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleRegisterWeight = async (e) => {
    e.preventDefault();
    const weight = Number(weightInput);
    if (!weight || weight <= 0) {
      toast.error('Informe um peso válido');
      return;
    }
    try {
      setSaving(true);
      await progressAPI.createLog({ weight });
      setWeightInput('');
      setShowWeightForm(false);
      toast.success('Peso registrado');
      await loadOverview();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Erro ao registrar peso');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveGoal = async (e) => {
    e.preventDefault();
    const targetWeight = Number(goalInput);
    if (!targetWeight || targetWeight <= 0) {
      toast.error('Informe uma meta válida');
      return;
    }
    try {
      setSaving(true);
      await progressAPI.setWeightGoal(targetWeight);
      setShowGoalForm(false);
      toast.success('Meta de peso definida');
      await loadOverview();
    } catch (error) {
      toast.error(error.response?.data?.error || 'Erro ao definir meta');
    } finally {
      setSaving(false);
    }
  };

  if (loading && !overview) {
    return (
      <div className={styles.container}>
        <Header />
        <main className={styles.main}>
          <p className={styles.loading}>Carregando sua caminhada...</p>
        </main>
        <BottomNavigation />
      </div>
    );
  }

  const weight = overview?.weight || {};
  const nutrition = overview?.nutrition || {};
  const workout = overview?.workout || {};
  const workoutPace = overview?.pace?.workout || null;
  const workoutPaceComparison = formatWorkoutPaceComparison(workoutPace);
  const water = overview?.water || {};
  const sleep = overview?.sleep || {};
  const weekSummary = overview?.weekSummary || {};
  const overall = overview?.overall || {};
  const history = weight.history || [];
  const weightHistoryCards = [...history].reverse();

  const timelineWeeks = (overview?.timeline || [])
    .slice(-TIMELINE_MAX_WEEKS)
    .map((week, index, arr) => ({
      ...week,
      displayWeek: index + 1,
      isLatest: index === arr.length - 1,
    }))
    .reverse();

  const chartWeights = history.slice(-8);
  const maxWeight = maxBarValue(
    chartWeights.map((h) => h.weight),
    weight.current || 100
  );
  const minWeight = chartWeights.length
    ? Math.min(...chartWeights.map((h) => h.weight))
    : 0;
  const weightSpan = Math.max(maxWeight - minWeight, 1);

  return (
    <div className={styles.container}>
      <Header />

      <main className={styles.main}>
        <div className={styles.content}>
          <section className={styles.header}>
            <h1>Meu Progresso</h1>
            <p>O que está acontecendo na sua caminhada</p>
          </section>

          {/* —— Peso —— */}
          <section className={`${styles.section} ${styles.category}`}>
            <div className={styles.sectionHead}>
              <h2 className={styles.sectionTitle}>Peso</h2>
              <div className={styles.sectionActions}>
                <button
                  type="button"
                  className={styles.ghostBtn}
                  onClick={() => {
                    setShowGoalForm((v) => !v);
                    setShowWeightForm(false);
                  }}
                >
                  Meta
                </button>
                <button
                  type="button"
                  className={styles.primaryBtn}
                  onClick={() => {
                    setShowWeightForm((v) => !v);
                    setShowGoalForm(false);
                  }}
                >
                  Registrar
                </button>
              </div>
            </div>

            <div className={styles.categoryBody}>
              <div className={styles.highlights}>
                <div className={styles.highlightCard}>
                  <span className={styles.label}>Peso atual</span>
                  <span className={styles.value}>{formatKg(weight.current)}</span>
                  <span className={styles.subtitle}>
                    Meta: {formatKg(weight.target)}
                  </span>
                </div>
                <div className={styles.highlightCard}>
                  <span className={styles.label}>Desde o início</span>
                  <span
                    className={styles.value}
                    style={{
                      color:
                        weight.delta == null
                          ? undefined
                          : weight.delta <= 0
                            ? '#059669'
                            : '#3b82f6',
                    }}
                  >
                    {formatDelta(weight.delta)}
                  </span>
                  <span className={styles.subtitle}>
                    Inicial: {formatKg(weight.initial)}
                  </span>
                </div>
              </div>

              <div className={styles.factRow}>
                <div className={styles.factChip}>
                  <span className={styles.factLabel}>Até a meta</span>
                  <span className={styles.factValue}>
                    {weight.distanceToGoal == null
                      ? '—'
                      : formatDelta(weight.distanceToGoal)}
                  </span>
                </div>
                <div className={styles.factChip}>
                  <span className={styles.factLabel}>Registros</span>
                  <span className={styles.factValue}>{history.length}</span>
                </div>
              </div>

              {showWeightForm && (
                <form className={styles.inlineForm} onSubmit={handleRegisterWeight}>
                  <input
                    type="number"
                    step="0.1"
                    min="1"
                    placeholder="Peso (kg)"
                    value={weightInput}
                    onChange={(e) => setWeightInput(e.target.value)}
                    className={styles.input}
                    disabled={saving}
                  />
                  <button type="submit" className={styles.primaryBtn} disabled={saving}>
                    Salvar
                  </button>
                </form>
              )}

              {showGoalForm && (
                <form className={styles.inlineForm} onSubmit={handleSaveGoal}>
                  <input
                    type="number"
                    step="0.1"
                    min="1"
                    placeholder="Meta (kg)"
                    value={goalInput}
                    onChange={(e) => setGoalInput(e.target.value)}
                    className={styles.input}
                    disabled={saving}
                  />
                  <button type="submit" className={styles.primaryBtn} disabled={saving}>
                    Definir meta
                  </button>
                </form>
              )}

              <h3 className={styles.subTitle}>Evolução</h3>
              {chartWeights.length > 0 ? (
                <div className={styles.chart}>
                  {chartWeights.map((h) => {
                    const heightPct = ((h.weight - minWeight) / weightSpan) * 70 + 20;
                    return (
                      <div key={h.id} className={styles.chartBar}>
                        <span className={styles.barValue}>{Number(h.weight).toFixed(1)}</span>
                        <div className={styles.bar}>
                          <div
                            className={styles.barFill}
                            style={{ height: `${heightPct}%` }}
                          />
                        </div>
                        <span className={styles.chartLabel}>{formatDate(h.date)}</span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className={styles.empty}>Nenhum peso registrado ainda.</p>
              )}

              {weightHistoryCards.length > 0 && (
                <>
                  <h3 className={styles.subTitle}>Histórico</h3>
                  <SwipeCarousel
                    ariaLabel="Histórico de pesos"
                    items={weightHistoryCards}
                    getKey={(entry) => entry.id}
                    slideClassName={styles.carouselSlideFull}
                    trackClassName={styles.carouselTrackFull}
                    renderItem={(entry, index) => (
                      <div
                        className={`${styles.weightCard} ${
                          index === 0 ? styles.weightCardLatest : ''
                        }`}
                      >
                        <div className={styles.weightCardInfo}>
                          <p className={styles.weightDate}>{formatDate(entry.date)}</p>
                          {index === 0 && (
                            <span className={styles.latestBadge}>Mais recente</span>
                          )}
                        </div>
                        <p className={styles.weightValue}>{formatKg(entry.weight)}</p>
                      </div>
                    )}
                  />
                </>
              )}
            </div>
          </section>

          {/* —— Resumo da semana —— */}
          <section className={`${styles.section} ${styles.category}`}>
            <h2 className={styles.sectionTitle}>Esta semana</h2>
            <div className={styles.categoryBody}>
              <div className={styles.weekCard}>
                <ul className={styles.weekList}>
                  <li>
                    <span className={styles.check}>✔</span>
                    {weekSummary.workouts ?? 0}{' '}
                    {(weekSummary.workouts ?? 0) === 1 ? 'treino' : 'treinos'}
                  </li>
                  <li>
                    <span className={styles.check}>✔</span>
                    {weekSummary.mealsRegistered ?? 0}{' '}
                    {(weekSummary.mealsRegistered ?? 0) === 1
                      ? 'refeição registrada'
                      : 'refeições registradas'}
                  </li>
                  <li>
                    <span className={styles.check}>✔</span>
                    Água na meta em {weekSummary.waterDaysMetGoal ?? 0}{' '}
                    {(weekSummary.waterDaysMetGoal ?? 0) === 1 ? 'dia' : 'dias'}
                  </li>
                  <li>
                    <span className={styles.check}>✔</span>
                    Peso {formatDelta(weekSummary.weightDelta)}
                  </li>
                </ul>
              </div>
            </div>
          </section>

          {/* —— Alimentação —— */}
          <section className={`${styles.section} ${styles.category}`}>
            <h2 className={styles.sectionTitle}>Alimentação</h2>
            <div className={styles.categoryBody}>
              <div className={styles.statsGrid}>
                <div className={styles.statCard}>
                  <span className={styles.label}>Total de refeições registradas</span>
                  <span className={styles.statValue}>{nutrition.mealsRegistered ?? 0}</span>
                </div>
                <div className={styles.statCard}>
                  <span className={styles.label}>Dentro da meta</span>
                  <span className={styles.statValue}>
                    {nutrition.mealsInGoalRegistered ?? 0}
                    <span className={styles.statSuffix}>
                      /{nutrition.mealsInGoal ?? 0}
                    </span>
                  </span>
                </div>
              </div>
              {(nutrition.caloriesConsumed ?? 0) > 0 && (
                <p className={styles.mutedNote}>
                  Calorias registradas no período: {nutrition.caloriesConsumed} kcal
                </p>
              )}
            </div>
          </section>

          {/* —— Treino —— */}
          <section className={`${styles.section} ${styles.category}`}>
            <h2 className={styles.sectionTitle}>Treino</h2>
            <div className={styles.categoryBody}>
              <div className={styles.statsGrid}>
                <div className={styles.statCard}>
                  <span className={styles.label}>Total de treinos realizados</span>
                  <span className={styles.statValue}>{workout.workoutsCompleted ?? 0}</span>
                </div>
                <div className={styles.statCard}>
                  <span className={styles.label}>Exercícios registrados</span>
                  <span className={styles.statValue}>{workout.exercisesCompleted ?? 0}</span>
                </div>
                <div className={styles.statCard}>
                  <span className={styles.label}>Ritmo atual</span>
                  <span className={styles.statValue}>
                    {formatPaceValue(workoutPace?.currentMonth?.weeklyAverage)}
                    {workoutPace?.currentMonth?.weeklyAverage != null && (
                      <span className={styles.statSuffix}> treinos/sem</span>
                    )}
                  </span>
                  {workoutPaceComparison && (
                    <span
                      className={styles.statSubtitle}
                      style={{ color: workoutPaceComparison.color }}
                    >
                      {workoutPaceComparison.text}
                    </span>
                  )}
                </div>
                <div className={styles.statCard}>
                  <span className={styles.label}>Esta semana</span>
                  <span className={styles.statValue}>
                    {workout.weekWorkouts ?? 0}
                    <span className={styles.statSuffix}> treinos</span>
                  </span>
                </div>
              </div>
            </div>
          </section>

          {/* —— Água —— */}
          <section className={`${styles.section} ${styles.category}`}>
            <h2 className={styles.sectionTitle}>Água</h2>
            <div className={styles.categoryBody}>
              <div className={styles.statsGrid}>
                <div className={styles.statCard}>
                  <span className={styles.label}>Média diária</span>
                  <span className={styles.statValue}>
                    {water.avgDailyMl != null ? `${water.avgDailyMl}` : '—'}
                    {water.avgDailyMl != null && (
                      <span className={styles.statSuffix}> ml</span>
                    )}
                  </span>
                </div>
                <div className={styles.statCard}>
                  <span className={styles.label}>Dias na meta</span>
                  <span className={styles.statValue}>{water.daysMetGoal ?? 0}</span>
                </div>
              </div>
            </div>
          </section>

          {/* —— Sono —— */}
          <section className={`${styles.section} ${styles.category}`}>
            <h2 className={styles.sectionTitle}>Sono</h2>
            <div className={styles.categoryBody}>
              <div className={styles.statsGrid}>
                <div className={styles.statCard}>
                  <span className={styles.label}>Média de horas</span>
                  <span className={styles.statValue}>
                    {sleep.avgHours != null ? sleep.avgHours : '—'}
                    {sleep.avgHours != null && (
                      <span className={styles.statSuffix}> h</span>
                    )}
                  </span>
                </div>
                <div className={styles.statCard}>
                  <span className={styles.label}>Dias registrados</span>
                  <span className={styles.statValue}>{sleep.daysTracked ?? 0}</span>
                </div>
              </div>
            </div>
          </section>

          {/* —— Linha do tempo —— */}
          <section className={`${styles.section} ${styles.category}`}>
            <h2 className={styles.sectionTitle}>Linha do tempo</h2>
            <div className={styles.categoryBody}>
              {timelineWeeks.length === 0 ? (
                <p className={styles.empty}>Ainda não há semanas com registros.</p>
              ) : (
                <SwipeCarousel
                  ariaLabel="Evolução semanal"
                  items={timelineWeeks}
                  getKey={(week) => week.weekStart}
                  renderItem={(week) => (
                    <div
                      className={`${styles.timelineCard} ${
                        week.isLatest ? styles.timelineCardLatest : ''
                      }`}
                    >
                      <p className={styles.timelineDate}>
                        Semana {week.displayWeek}
                        {week.isLatest ? ' · atual' : ''}
                      </p>
                      <p className={styles.timelineRange}>{week.label}</p>
                      <ul className={styles.timelineFacts}>
                        <li>
                          Peso:{' '}
                          {week.weight
                            ? `${formatKg(week.weight.end)}${
                                week.weight.delta !== 0
                                  ? ` (${formatDelta(week.weight.delta)})`
                                  : ''
                              }`
                            : '—'}
                        </li>
                        <li>Treinos: {week.workouts}</li>
                        <li>Alimentação: {week.mealsRegistered} registros</li>
                        <li>
                          Água: {week.water.daysMetGoal} dias na meta
                          {week.water.avgMl != null
                            ? ` · média ${week.water.avgMl} ml`
                            : ''}
                        </li>
                        {week.sleep.avgHours != null && (
                          <li>Sono: média {week.sleep.avgHours} h</li>
                        )}
                      </ul>
                    </div>
                  )}
                />
              )}
            </div>
          </section>

          {/* —— Evolução geral —— */}
          <section className={`${styles.section} ${styles.category}`}>
            <h2 className={styles.sectionTitle}>Evolução geral</h2>
            <div className={styles.categoryBody}>
              <div className={styles.overallCard}>
                <div className={styles.overallGrid}>
                  <div>
                    <span className={styles.label}>Dias usando o Sage</span>
                    <span className={styles.overallValue}>{overall.daysUsingSage ?? 0}</span>
                  </div>
                  <div>
                    <span className={styles.label}>Total de registros</span>
                    <span className={styles.overallValue}>{overall.totalRecords ?? 0}</span>
                  </div>
                  <div>
                    <span className={styles.label}>Treinos</span>
                    <span className={styles.overallValue}>{overall.workouts ?? 0}</span>
                  </div>
                  <div>
                    <span className={styles.label}>Refeições</span>
                    <span className={styles.overallValue}>{overall.meals ?? 0}</span>
                  </div>
                  <div>
                    <span className={styles.label}>Dias com água</span>
                    <span className={styles.overallValue}>{overall.waterDaysTracked ?? 0}</span>
                  </div>
                  <div>
                    <span className={styles.label}>Registros de peso</span>
                    <span className={styles.overallValue}>{overall.weightLogs ?? 0}</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <div className={styles.spacer} />
        </div>
      </main>

      <BottomNavigation />
    </div>
  );
};

export default Progress;
