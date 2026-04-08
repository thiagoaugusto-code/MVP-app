import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import Header from '../components/Header';
import BottomNavigation from '../components/BottomNavigation';

const StudentProgressPage = () => {
  const { studentId } = useParams();
  const navigate = useNavigate();
  const [student, setStudent] = useState(null);
  const [progressData, setProgressData] = useState([]);
  const [period, setPeriod] = useState('week');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchStudentProgress();
  }, [studentId, period]);

  const fetchStudentProgress = async () => {
    try {
      setLoading(true);
      const res = await api.get(`/collaborator/students/${studentId}/progress?period=${period}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      setStudent(res.data.student);
      setProgressData(res.data.progress || []);
    } catch (error) {
      console.error('Erro ao buscar progresso:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex flex-col min-h-screen bg-gray-50">
        <Header />
        <div className="flex items-center justify-center h-96">
          <p className="text-gray-600">Carregando dados...</p>
        </div>
        <BottomNavigation />
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <Header />
      
      <div className="px-4 py-6 pb-24 flex-1">
        {/* Voltar */}
        <button
          onClick={() => navigate(-1)}
          className="text-blue-600 font-semibold mb-4 flex items-center"
        >
          ← Voltar
        </button>

        {/* Informações do aluno */}
        {student && (
          <div className="bg-white rounded-lg p-4 mb-6 border border-gray-200">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-lg font-bold text-blue-600">
                  {student.name?.charAt(0)}
                </span>
              </div>
              <div>
                <h2 className="font-bold text-gray-900">{student.name}</h2>
                <p className="text-sm text-gray-600">{student.email}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-xs text-gray-600">Peso Atual</p>
                <p className="text-lg font-bold text-gray-900">
                  {student.currentWeight ? `${student.currentWeight}kg` : 'N/A'}
                </p>
              </div>
              <div>
                <p className="text-xs text-gray-600">Goal</p>
                <p className="text-lg font-bold text-gray-900">{student.goal || 'N/A'}</p>
              </div>
            </div>
          </div>
        )}

        {/* Período */}
        <div className="mb-4 flex gap-2">
          <button
            onClick={() => setPeriod('week')}
            className={`px-4 py-2 rounded text-sm font-semibold transition ${
              period === 'week'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Semana
          </button>
          <button
            onClick={() => setPeriod('month')}
            className={`px-4 py-2 rounded text-sm font-semibold transition ${
              period === 'month'
                ? 'bg-blue-600 text-white'
                : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }`}
          >
            Mês
          </button>
        </div>

        {/* Progresso */}
        <div className="space-y-3">
          <h3 className="font-bold text-gray-900 mt-4">Evolução</h3>
          {progressData.length === 0 ? (
            <div className="text-center py-8 text-gray-600">
              <p>Nenhum dado de progresso registrado</p>
            </div>
          ) : (
            progressData.map((item, idx) => (
              <div key={idx} className="bg-white rounded-lg p-4 border border-gray-200">
                <p className="text-sm text-gray-600">{new Date(item.date).toLocaleDateString('pt-BR')}</p>
                <p className="text-lg font-bold text-gray-900">{item.weight}kg</p>
                {item.change && (
                  <p className={`text-sm font-semibold ${item.change > 0 ? 'text-green-600' : 'text-red-600'}`}>
                    {item.change > 0 ? '+' : ''}{item.change.toFixed(1)}kg
                  </p>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      <BottomNavigation />
    </div>
  );
};

export default StudentProgressPage;
