import { useState, useEffect, useContext } from 'react';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';
import Header from '../components/Header';
import BottomNavigation from '../components/BottomNavigation';
import StudentCard from '../components/StudentCard';
import AdherenceCard from '../components/AdherenceCard';
import AlertsCard from '../components/AlertsCard';
import styles from './Dashboard.module.css';

const CollaboratorDashboard = () => {
  const { user } = useContext(AuthContext);
  const [students, setStudents] = useState([]);
  const [stats, setStats] = useState(null);
  const [alerts, setAlerts] = useState([]);
  const [filter, setFilter] = useState('all');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchCollaboratorData();
  }, []);

  const fetchCollaboratorData = async () => {
    try {
      setLoading(true);
      // Buscar alunos do colaborador
      const studentsRes = await api.get('/collaborator/students', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      setStudents(studentsRes.data || []);

      // Buscar estatísticas
      const statsRes = await api.get('/collaborator/stats', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      setStats(statsRes.data || {});

      // Buscar alertas
      const alertsRes = await api.get('/collaborator/alerts', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      setAlerts(alertsRes.data || []);
    } catch (error) {
      console.error('Erro ao buscar dados:', error);
    } finally {
      setLoading(false);
    }
  };

  const getFilteredStudents = () => {
    if (filter === 'all') return students;
    return students.filter((s) => s.adherence >= 80);
  };

  if (loading) {
    return (
      <div className={styles.container}>
        <Header />
        <div className="flex items-center justify-center h-96">
          <p className="text-gray-600">Carregando dados...</p>
        </div>
        <BottomNavigation />
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <Header />
      
      <div className="px-4 py-6 pb-24">
        {/* Boas-vindas */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">
            Bem-vindo, {user?.name}!
          </h1>
          <p className="text-gray-600 mt-1">Acompanhe seus alunos hoje</p>
        </div>

        {/* Estatísticas rápidas */}
        {stats && (
          <div className="grid grid-cols-2 gap-4 mb-6">
            <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
              <p className="text-3xl font-bold text-blue-600">{stats.totalStudents || 0}</p>
              <p className="text-sm text-gray-600">Total de Alunos</p>
            </div>
            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <p className="text-3xl font-bold text-green-600">
                {stats.avgAdherence ? `${Math.round(stats.avgAdherence)}%` : '0%'}
              </p>
              <p className="text-sm text-gray-600">Aderência Média</p>
            </div>
          </div>
        )}

        {/* Alertas */}
        {alerts.length > 0 && (
          <AlertsCard alerts={alerts} />
        )}

        {/* Filtros */}
        <div className="mb-4 flex gap-2">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded text-sm font-semibold transition ${
              filter === 'all'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Todos
          </button>
          <button
            onClick={() => setFilter('aderentes')}
            className={`px-4 py-2 rounded text-sm font-semibold transition ${
              filter === 'aderentes'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Aderentes
          </button>
        </div>

        {/* Lista de alunos */}
        <div className="space-y-3">
          <h2 className="text-lg font-bold text-gray-900 mt-6 mb-3">Seus Alunos</h2>
          {getFilteredStudents().length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-600">Nenhum aluno ainda</p>
              <p className="text-sm text-gray-500 mt-2">Comece adicionando seus alunos</p>
            </div>
          ) : (
            getFilteredStudents().map((student) => (
              <StudentCard key={student.id} student={student} />
            ))
          )}
        </div>
      </div>

      <BottomNavigation />
    </div>
  );
};

export default CollaboratorDashboard;
