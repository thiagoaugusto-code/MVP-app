import { useContext, useState, useRef, useEffect } from 'react';
import { AuthContext } from '../context/AuthContext';
import styles from './Header.module.css';
import { useNavigate } from 'react-router-dom';


const Header = () => {
  const { user, viewMode, switchViewMode, logout } = useContext(AuthContext);
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();
  const menuRef = useRef();

  // Function to format the display name
    const displayName = user?.name
  ? (() => {
      const capitalize = (text) =>
        text.charAt(0).toUpperCase() + text.slice(1).toLowerCase();

      const parts = user.name.trim().split(' ');

      const firstName = capitalize(parts[0]);

      if (parts.length === 1) {
        return firstName;
      }

      const secondInitial = capitalize(parts[1])[0];

      return `${firstName} ${secondInitial}.`;
    })()
  : 'Usuário';


  const currentDate = (() => {
    const now = new Date();

    const weekday = new Intl.DateTimeFormat('pt-BR', {
      weekday: 'long',
    }).format(now);

    const dayMonth = new Intl.DateTimeFormat('pt-BR', {
      day: 'numeric',
      month: 'long',
    }).format(now);

    const shortWeekday =
      weekday.replace('-feira', '');

    return `${
      shortWeekday.charAt(0).toUpperCase() +
      shortWeekday.slice(1)
    }, ${dayMonth}`;
  })();

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
    <header className={styles.header}>
      <div className={styles.container}>

        <div className={styles.greetingWrapper}>
          <h1 className={styles.greeting}>
              Olá, {displayName}         
          </h1>
          <p className={styles.currentDate}>{currentDate}</p> 
        </div>

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
                <p className={styles.menuItem}>Olá, {displayName}</p>

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