import Header from '../components/Header';
import BottomNavigation from '../components/BottomNavigation';
import styles from './Progress.module.css';

const Progress = () => {
  const weeks = [
    { week: 1, adherence: 95, weight: 75.5, date: '08/04' },
    { week: 2, adherence: 88, weight: 75.2, date: '15/04' },
    { week: 3, adherence: 92, weight: 74.8, date: '22/04' },
    { week: 4, adherence: 85, weight: 74.5, date: '29/04' },
  ];

  const currentWeight = 74.5;
  const goalWeight = 72.0;
  const weightLost = 75.5 - currentWeight;

  return (
    <div className={styles.container}>
      <Header />
      
      <main className={styles.main}>
        <div className={styles.content}>
          <section className={styles.header}>
            <h1>Meu Progresso</h1>
            <p>Acompanhe sua evolução</p>
          </section>

          <section className={styles.highlights}>
            <div className={styles.highlightCard}>
              <span className={styles.label}>Peso Atual</span>
              <span className={styles.value}>{currentWeight} kg</span>
              <span className={styles.subtitle}>Meta: {goalWeight} kg</span>
            </div>
            <div className={styles.highlightCard}>
              <span className={styles.label}>Peso Perdido</span>
              <span className={styles.value} style={{ color: '#10b981' }}>
                -{weightLost.toFixed(1)} kg
              </span>
              <span className={styles.subtitle}>Ótimo progresso!</span>
            </div>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Aderência Semanal</h2>
            <div className={styles.chart}>
              {weeks.map((w) => (
                <div key={w.week} className={styles.chartBar}>
                  <div className={styles.bar}>
                    <div
                      className={styles.barFill}
                      style={{ height: `${w.adherence}%` }}
                    />
                  </div>
                  <span className={styles.label}>{w.date}</span>
                  <span className={styles.percentage}>{w.adherence}%</span>
                </div>
              ))}
            </div>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Histórico de Pesos</h2>
            <div className={styles.timeline}>
              {weeks.map((w, idx) => (
                <div key={w.week} className={styles.timelineItem}>
                  <div className={styles.timelineMarker} />
                  <div className={styles.timelineContent}>
                    <p className={styles.timelineDate}>Semana {w.week} - {w.date}</p>
                    <p className={styles.timelineWeight}>
                      {w.weight} kg
                      {idx > 0 && (
                        <span className={weeks[idx - 1].weight > w.weight ? styles.positive : styles.negative}>
                          {weeks[idx - 1].weight > w.weight ? '↓' : '↑'} {Math.abs((weeks[idx - 1].weight - w.weight).toFixed(1))} kg
                        </span>
                      )}
                    </p>
                  </div>
                </div>
              ))}
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