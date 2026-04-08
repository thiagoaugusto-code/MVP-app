import styles from './AlertsCard.module.css';

const AlertsCard = ({ alerts }) => {
  const getSeverityColor = (severity) => {
    switch (severity) {
      case 'high':
        return 'red';
      case 'medium':
        return 'yellow';
      case 'low':
        return 'blue';
      default:
        return 'gray';
    }
  };

  return (
    <div className={styles.container}>
      <h3 className={styles.title}>⚠️ Alertas</h3>
      <div className={styles.alerts}>
        {alerts.map((alert, idx) => (
          <div
            key={idx}
            className={`${styles.alert} ${styles[`alert_${getSeverityColor(alert.severity)}`]}`}
          >
            <div className={styles.icon}>
              {alert.severity === 'high' ? '🔴' : 
               alert.severity === 'medium' ? '🟡' : '🔵'}
            </div>
            <div className={styles.content}>
              <p className={styles.student}>{alert.studentName}</p>
              <p className={styles.message}>{alert.message}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default AlertsCard;
