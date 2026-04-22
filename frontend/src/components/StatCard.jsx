import styles from './StatCard.module.css';

const StatCard = ({ icon, title, value, unit, trend, onClick }) => {
  return (
    <div className={`${styles.card} bg-white dark:bg-gray-800 text-gray-900 dark:text-white`} onClick={onClick}>
      <div className={styles.header}>
        <span className={`${styles.icon} text-gray-700 dark:text-gray-300`}>
          {icon}
        </span>
        <h3 className={`${styles.title} text-gray-700 dark:text-gray-300`}>{title}</h3>
      </div>
      <div className={styles.content}>
        <div className={`${styles.value} text-gray-900 dark:text-white`}>
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