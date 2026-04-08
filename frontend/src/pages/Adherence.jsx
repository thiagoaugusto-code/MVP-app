import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import Header from '../components/Header';
import BottomNavigation from '../components/BottomNavigation';
import AdherenceCard from '../components/AdherenceCard';

const AdherencePage = () => {
  const navigate = useNavigate();
  const [adherenceData, setAdherenceData] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchAdherence();
  }, []);

  const fetchAdherence = async () => {
    try {
      setLoading(true);
      const res = await api.get('/collaborator/adherence', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      setAdherenceData(res.data || []);
    } catch (error) {
      console.error('Erro ao buscar aderência:', error);
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
        <button
          onClick={() => navigate(-1)}
          className="text-blue-600 font-semibold mb-4 flex items-center"
        >
          ← Voltar
        </button>

        <h1 className="text-2xl font-bold text-gray-900 mb-6">Taxa de Aderência</h1>

        <div className="space-y-4">
          {adherenceData.length === 0 ? (
            <div className="text-center py-8 text-gray-600">
              <p>Nenhum dado de aderência</p>
            </div>
          ) : (
            adherenceData.map((student) => (
              <div key={student.id} className="bg-white rounded-lg p-4 border border-gray-200">
                <div className="flex justify-between items-start mb-2">
                  <div>
                    <h3 className="font-bold text-gray-900">{student.name}</h3>
                    <p className="text-sm text-gray-600">{student.specialty}</p>
                  </div>
                  <span className={`text-lg font-bold ${
                    student.adherence >= 80 ? 'text-green-600' : 
                    student.adherence >= 60 ? 'text-yellow-600' : 'text-red-600'
                  }`}>
                    {Math.round(student.adherence)}%
                  </span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                  <div
                    className={`h-full transition-all ${
                      student.adherence >= 80 ? 'bg-green-600' : 
                      student.adherence >= 60 ? 'bg-yellow-600' : 'bg-red-600'
                    }`}
                    style={{ width: `${student.adherence}%` }}
                  />
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <BottomNavigation />
    </div>
  );
};

export default AdherencePage;
