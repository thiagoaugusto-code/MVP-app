import styles from './CheckItem.module.css';
import { Camera } from 'lucide-react';

const CheckItem = ({
  id,
  type,
  label,
  checked,
  value,
  maxValue,
  onChange,
  onCameraClick,
  isMealRegistered,
  onRegisterClick,
}) => {

  const isWater = type === 'water';
  const isSleep = type === 'sleep';
  const isMeal = type === 'meal';

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
            style={{
              width: `${Math.min((value / maxValue) * 100, 100)}%`
            }}
          />
        </div>
      </div>
    );
  }

  return (
    <div className={styles.item}>

      <div className={styles.content}>
        <input
          type="checkbox"
          id={`check-${id}`}
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          className={styles.checkbox}
        />

        <label
          htmlFor={`check-${id}`}
          className={styles.label}
        >
          {label}
        </label>
      </div>


      <div className={styles.right}>

        {isMeal && (
          <button
            type="button"
            onClick={onCameraClick}
            className={`${styles.cameraButton} ${
              isMealRegistered ? styles.cameraDone : ''
            }`}
          >
            {isMealRegistered ? '✓' : <Camera size={25} />}
          </button>
        )}


        {type === 'workout' && (
          <button
            type="button"
            onClick={onRegisterClick}
            className={styles.cameraButton}
          >
            📝
          </button>
        )}

      </div>

    </div>
  );
};

export default CheckItem;