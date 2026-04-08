import styles from './CheckItem.module.css';

const CheckItem = ({ id, type, label, checked, value, maxValue, onChange }) => {
  const isWater = type === 'water';
  const isSleep = type === 'sleep';

  if (isWater || isSleep) {
    return (
      <div className={styles.itemNumeric}>
        <div className={styles.header}>
          <label className={styles.label}>{label}</label>
          <div className={styles.value}>
            {value}/{maxValue} {isWater ? 'L' : 'h'}
          </div>
        </div>
        <div className={styles.progressBar}>
          <div
            className={styles.progress}
            style={{ width: `${Math.min((value / maxValue) * 100, 100)}%` }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className={styles.item}>
      <input
        type="checkbox"
        id={`check-${id}`}
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className={styles.checkbox}
      />
      <label htmlFor={`check-${id}`} className={styles.label}>
        {label}
      </label>
      <span className={`${styles.indicator} ${checked ? styles.checked : ''}`}>
        ✓
      </span>
    </div>
  );
};

export default CheckItem;