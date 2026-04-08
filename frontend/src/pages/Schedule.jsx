import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import Header from '../components/Header';
import BottomNavigation from '../components/BottomNavigation';

const SchedulePage = () => {
  const navigate = useNavigate();
  const [schedule, setSchedule] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSchedule();
  }, []);

  const fetchSchedule = async () => {
    try {
      setLoading(true);
      const res = await api.get('/collaborator/schedule', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      setSchedule(res.data || []);
    } catch (error) {
      console.error('Erro ao buscar agenda:', error);
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

        <h1 className="text-2xl font-bold text-gray-900 mb-6">Agenda</h1>

        <div className="space-y-3">
          {schedule.length === 0 ? (
            <div className="text-center py-8 text-gray-600">
              <p>Nenhum agendamento</p>
            </div>
          ) : (
            schedule.map((event) => (
              <div key={event.id} className="bg-white rounded-lg p-4 border border-l-4 border-l-blue-600">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-bold text-gray-900">{event.studentName}</h3>
                    <p className="text-sm text-gray-600 mt-1">
                      🕐 {new Date(event.date).toLocaleTimeString('pt-BR', { 
                        hour: '2-digit', 
                        minute: '2-digit' 
                      })}
                    </p>
                    <p className="text-sm text-gray-600">{event.type}</p>
                  </div>
                  <span className={`text-xs font-semibold px-2 py-1 rounded ${
                    event.status === 'confirmed' ? 'bg-green-100 text-green-700' :
                    event.status === 'pending' ? 'bg-yellow-100 text-yellow-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {event.status}
                  </span>
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

export default SchedulePage;
