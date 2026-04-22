import { useContext, useState, useRef, useEffect } from 'react';
import { AuthContext } from '../context/AuthContext';
import styles from './Header.module.css';
import { useNavigate } from 'react-router-dom';


const Header = () => {
  const { user, viewMode, switchViewMode, logout } = useContext(AuthContext);
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const menuRef = useRef();

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);


  return (
    <header className="bg-gradient-to-r from-blue-500 to-blue-700 
                   dark:from-gray-900 dark:to-gray-800 
                   text-white transition-colors">
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
          <div className={styles.avatarContainer} ref={menuRef}>
            <div className={styles.avatar}
              onClick={() => setOpen(!open)}
            >
              {user?.name?.[0] || 'U'}
          </div>
            {open && (
              <div className={styles.menu}>
                <p className={styles.menuItem}>Olá, {user?.name || 'Usuário'}</p>

              <hr className={styles.divider} />

                <button onClick={() => {navigate('/profile');
                    setOpen(false); }}> 👤 Perfil
                </button>

                <button onClick={() => navigate('/settings')}> ⚙️ Configurações</button>

                <button > 🌙 Tema</button>

                <button className={styles.logout} onClick={() => {
                  logout();
                  navigate('/login');
                }}>
                  🚪 Sair
                </button>
              </div>
            )}
          </div>
           
        </div>
      </div>
    </header>
  );
};

export default Header;