import { Link, useLocation } from 'react-router-dom';
import { useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import styles from './BottomNavigation.module.css';

const BottomNavigation = () => {
  const location = useLocation();
  const { user, getEffectiveRole } = useContext(AuthContext);

  const isActive = (path) => location.pathname === path || location.pathname.startsWith(path + '/');

  const effectiveRole = getEffectiveRole();

  // Menu para alunos (USER)
  if (effectiveRole === 'USER') {
    return (
      <nav className={styles.bottomNav}>
        <Link 
          to="/" 
          className={`${styles.navItem} ${isActive('/') && location.pathname === '/' ? styles.active : ''}`}
          title="Dashboard"
        >
          <span className={styles.icon}>📊</span>
          <span className={styles.label}>Dashboard</span>
        </Link>
        <Link 
          to="/marketplace" 
          className={`${styles.navItem} ${isActive('/marketplace') ? styles.active : ''}`}
          title="Profissionais"
        >
          <span className={styles.icon}>🛒</span>
          <span className={styles.label}>Profissionais</span>
        </Link>
        <Link 
          to="/chat" 
          className={`${styles.navItem} ${isActive('/chat') ? styles.active : ''}`}
          title="Chat"
        >
          <span className={styles.icon}>💬</span>
          <span className={styles.label}>Chat</span>
        </Link>
        <Link 
          to="/calendar" 
          className={`${styles.navItem} ${isActive('/calendar') ? styles.active : ''}`}
          title="Calendário"
        >
          <span className={styles.icon}>📅</span>
          <span className={styles.label}>Calendário</span>
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
  }

  // Menu para colaboradores
  return (
    <nav className={styles.bottomNav}>
      <Link 
        to="/collaborator" 
        className={`${styles.navItem} ${location.pathname === '/collaborator' ? styles.active : ''}`}
        title="Dashboard"
      >
        <span className={styles.icon}>📊</span>
        <span className={styles.label}>Dashboard</span>
      </Link>
      <Link 
        to="/collaborator/adherence" 
        className={`${styles.navItem} ${isActive('/collaborator/adherence') ? styles.active : ''}`}
        title="Aderência"
      >
        <span className={styles.icon}>📊</span>
        <span className={styles.label}>Aderência</span>
      </Link>
      <Link 
        to="/collaborator/schedule" 
        className={`${styles.navItem} ${isActive('/collaborator/schedule') ? styles.active : ''}`}
        title="Agenda"
      >
        <span className={styles.icon}>📅</span>
        <span className={styles.label}>Agenda</span>
      </Link>
      <Link 
        to="/collaborator/profile" 
        className={`${styles.navItem} ${isActive('/collaborator/profile') ? styles.active : ''}`}
        title="Perfil"
      >
        <span className={styles.icon}>👤</span>
        <span className={styles.label}>Perfil</span>
      </Link>
    </nav>
  );
};

export default BottomNavigation;