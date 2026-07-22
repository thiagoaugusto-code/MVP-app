import { useContext, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import BottomNavigation from '../components/BottomNavigation';
import { AuthContext } from '../context/AuthContext';
import { progressAPI } from '../services/api';
import styles from './Profile.module.css';

const Profile = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();

  const [currentWeight, setCurrentWeight] = useState(null);


  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  useEffect(() => {
  const loadCurrentWeight = async () => {
    try {
      const response = await progressAPI.getOverview(90);
      setCurrentWeight(response.data.overview.weight.current);
    } catch (error) {
      console.error('Erro ao carregar peso:', error);
    }
  };

  loadCurrentWeight();
}, []);

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
            <h2 className={styles.sectionTitle}>Metas</h2>
            <div className={styles.goals}>
              <div className={styles.goalItem}>
                <span>Peso</span>
                <span className={styles.goalValue}>{currentWeight !== null ? `${currentWeight} kg` : 'Não registrado'}</span>
              </div>
              <div className={styles.goalItem}>
                <span>Altura</span>
                <span className={styles.goalValue}>-</span>
              </div>
              <div className={styles.goalItem}>
                <span>Media IMC</span>
                <span className={styles.goalValue}>CALCULAR IMC</span>
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