import { useNavigate } from 'react-router-dom';
import styles from './StudentCard.module.css';

const StudentCard = ({ student }) => {
  const navigate = useNavigate();

  const getAdherenceColor = (adherence) => {
    if (adherence >= 80) return 'text-green-600';
    if (adherence >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const getAdherenceBg = (adherence) => {
    if (adherence >= 80) return 'bg-green-50 border-green-200';
    if (adherence >= 60) return 'bg-yellow-50 border-yellow-200';
    return 'bg-red-50 border-red-200';
  };

  return (
    <div
      onClick={() => navigate(`/student/${student.id}`)}
      className={`${styles.card} ${getAdherenceBg(student.adherence)} cursor-pointer hover:shadow-md transition`}
    >
      <div className={styles.header}>
        <div className={styles.avatar}>
          {student.avatar ? (
            <img src={student.avatar} alt={student.name} />
          ) : (
            <span className={styles.initials}>{student.name?.charAt(0)}</span>
          )}
        </div>
        <div className={styles.info}>
          <h3 className={styles.name}>{student.name}</h3>
          <p className={styles.specialty}>{student.specialty}</p>
        </div>
        <span className={`${styles.adherence} ${getAdherenceColor(student.adherence)}`}>
          {Math.round(student.adherence)}%
        </span>
      </div>

      <div className={styles.metrics}>
        {student.currentWeight && (
          <div className={styles.metric}>
            <p className={styles.label}>Peso</p>
            <p className={styles.value}>{student.currentWeight}kg</p>
          </div>
        )}
        {student.weeklyProgress && (
          <div className={styles.metric}>
            <p className={styles.label}>Progresso</p>
            <p className={`${styles.value} ${student.weeklyProgress > 0 ? 'text-green-600' : 'text-red-600'}`}>
              {student.weeklyProgress > 0 ? '+' : ''}{student.weeklyProgress?.toFixed(1)}%
            </p>
          </div>
        )}
      </div>

      <div className={styles.footer}>
        <button
          onClick={(e) => {
            e.stopPropagation();
            navigate(`/student/${student.id}/progress`);
          }}
          className={styles.button}
        >
          Ver Progresso
        </button>
      </div>
    </div>
  );
};

export default StudentCard;
