import styles from './StatCard.module.css';

const StatCard = ({ icon, title, value, unit, trend, onClick }) => {
  return (
    <div className={styles.card} onClick={onClick}>
      <div className={styles.header}>
        <span className={styles.icon}>{icon}</span>
        <h3 className={styles.title}>{title}</h3>
      </div>
      <div className={styles.content}>
        <div className={styles.value}>
          {value}
          {unit && <span className={styles.unit}>{unit}</span>}
        </div>
        {trend && (
          <div className={`${styles.trend} ${trend.positive ? styles.positive : styles.negative}`}>
            {trend.positive ? '↑' : '↓'} {trend.value}
          </div>
        )}
      </div>
    </div>
  );
};

export default StatCard;