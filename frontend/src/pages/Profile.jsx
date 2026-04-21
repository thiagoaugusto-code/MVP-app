import { useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import BottomNavigation from '../components/BottomNavigation';
import { AuthContext } from '../context/AuthContext';
import styles from './Profile.module.css';

const Profile = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className={styles.container}>
      {/* <Header /> */}
      
      <main className={styles.main}>
        <button className={styles.backButton} onClick={() => navigate(-1)}>
          ← Voltar
        </button>
        <div className={styles.content}>
          <section className={styles.profileHeader}>
            <div className={styles.avatar}>
              {user?.name?.charAt(0).toUpperCase() || 'U'}
            </div>
            <h1 className={styles.name}>{user?.name}</h1>
            <p className={styles.email}>{user?.email}</p>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Configurações</h2>
            <div className={styles.settingsList}>
              <div className={styles.settingItem}>
                <span>📱 Notificações</span>
                <input type="checkbox" defaultChecked className={styles.toggle} />
              </div>
              <div className={styles.settingItem}>
                <span>🌙 Modo escuro</span>
                <input type="checkbox" className={styles.toggle} />
              </div>
              <div className={styles.settingItem}>
                <span>📊 Compartilhar dados</span>
                <input type="checkbox" className={styles.toggle} />
              </div>
            </div>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Metas</h2>
            <div className={styles.goals}>
              <div className={styles.goalItem}>
                <span>Peso</span>
                <span className={styles.goalValue}>72 kg</span>
              </div>
              <div className={styles.goalItem}>
                <span>Kcal diária</span>
                <span className={styles.goalValue}>2000 kcal</span>
              </div>
              <div className={styles.goalItem}>
                <span>Água diária</span>
                <span className={styles.goalValue}>2 L</span>
              </div>
            </div>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Sobre</h2>
            <div className={styles.about}>
              <p>Versão 1.0.0</p>
              <p>MVP App - Controle de Cardápio, Treino e Aderência</p>
            </div>
          </section>

          <section className={styles.actions}>
            <button className={styles.logoutButton} onClick={handleLogout}>
              Sair da Conta
            </button>
          </section>

          <div className={styles.spacer} />
        </div>
      </main>

      {/**<BottomNavigation />*/}
    </div>
  );
};

export default Profile;