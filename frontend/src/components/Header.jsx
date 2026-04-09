import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import styles from './Header.module.css';

const Header = () => {
  const { user, viewMode, switchViewMode } = useContext(AuthContext);

  return (
    <header className={styles.header}>
      <div className={styles.container}>
        <h1 className={styles.title}>MVP App</h1>
        <div className={styles.headerRight}>
          {user?.role === 'ADMIN' && (
            <div className={styles.viewModeSelector}>
              <span className={styles.modeLabel}>Modo:</span>
              <button
                className={`${styles.modeButton} ${viewMode === 'admin' ? styles.active : ''}`}
                onClick={() => switchViewMode('admin')}
              >
                👨‍💼 Admin
              </button>
              <button
                className={`${styles.modeButton} ${viewMode === 'student' ? styles.active : ''}`}
                onClick={() => switchViewMode('student')}
              >
                👨‍🎓 Aluno
              </button>
            </div>
          )}
          <span className={styles.badge}>Mobile First</span>
        </div>
      </div>
    </header>
  );
};

export default Header;