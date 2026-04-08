import { Link, useLocation } from 'react-router-dom';
import styles from './BottomNavigation.module.css';

const BottomNavigation = () => {
  const location = useLocation();

  const isActive = (path) => location.pathname === path;

  return (
    <nav className={styles.bottomNav}>
      <Link 
        to="/" 
        className={`${styles.navItem} ${isActive('/') ? styles.active : ''}`}
        title="Dashboard"
      >
        <span className={styles.icon}>📊</span>
        <span className={styles.label}>Dashboard</span>
      </Link>
      <Link 
        to="/diet" 
        className={`${styles.navItem} ${isActive('/diet') ? styles.active : ''}`}
        title="Alimentação"
      >
        <span className={styles.icon}>🍽️</span>
        <span className={styles.label}>Dieta</span>
      </Link>
      <Link 
        to="/workout" 
        className={`${styles.navItem} ${isActive('/workout') ? styles.active : ''}`}
        title="Treino"
      >
        <span className={styles.icon}>💪</span>
        <span className={styles.label}>Treino</span>
      </Link>
      <Link 
        to="/progress" 
        className={`${styles.navItem} ${isActive('/progress') ? styles.active : ''}`}
        title="Progresso"
      >
        <span className={styles.icon}>📈</span>
        <span className={styles.label}>Progresso</span>
      </Link>
      <Link 
        to="/profile" 
        className={`${styles.navItem} ${isActive('/profile') ? styles.active : ''}`}
        title="Perfil"
      >
        <span className={styles.icon}>👤</span>
        <span className={styles.label}>Perfil</span>
      </Link>
    </nav>
  );
};

export default BottomNavigation;