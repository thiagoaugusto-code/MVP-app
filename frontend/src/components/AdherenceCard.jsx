import styles from './AdherenceCard.module.css';

const AdherenceCard = ({ adherence }) => {
  const getColor = (value) => {
    if (value >= 80) return 'green';
    if (value >= 60) return 'yellow';
    return 'red';
  };

  const color = getColor(adherence);

  return (
    <div className={`${styles.card} ${styles[`card_${color}`]}`}>
      <div className={styles.header}>
        <h3 className={styles.title}>Taxa de Aderência</h3>
        <span className={`${styles.percentage} ${styles[color]}`}>
          {Math.round(adherence)}%
        </span>
      </div>
      <div className={styles.bar}>
        <div
          className={`${styles.fill} ${styles[color]}`}
          style={{ width: `${adherence}%` }}
        />
      </div>
      <p className={styles.label}>
        {adherence >= 80 ? 'Excelente aderência!' : 
         adherence >= 60 ? 'Boa aderência' : 
         'Aderência baixa - precisam de ajustes'}
      </p>
    </div>
  );
};

export default AdherenceCard;
