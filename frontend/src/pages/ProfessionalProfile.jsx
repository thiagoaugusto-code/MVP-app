import { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';
import Header from '../components/Header';
import BottomNavigation from '../components/BottomNavigation';

const ProfessionalProfilePage = () => {
  const { user, logout } = useContext(AuthContext);
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [editing, setEditing] = useState(false);
  const [formData, setFormData] = useState({
    bio: '',
    phone: '',
    codeOrCRM: '',
    experience: 0,
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const res = await api.get('/collaborator/profile', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      setProfile(res.data);
      setFormData({
        bio: res.data.bio || '',
        phone: res.data.phone || '',
        codeOrCRM: res.data.codeOrCRM || '',
        experience: res.data.experience || 0,
      });
    } catch (error) {
      console.error('Erro ao buscar perfil:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      await api.put('/collaborator/profile', formData, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      setProfile({ ...profile, ...formData });
      setEditing(false);
    } catch (error) {
      console.error('Erro ao atualizar perfil:', error);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
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

        <h1 className="text-2xl font-bold text-gray-900 mb-6">Perfil Profissional</h1>

        {/* Avatar e dados básicos */}
        <div className="bg-white rounded-lg p-6 border border-gray-200 mb-6">
          <div className="flex items-center gap-4 mb-6">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
              <span className="text-3xl font-bold text-blue-600">
                {user?.name?.charAt(0)}
              </span>
            </div>
            <div>
              <h2 className="text-xl font-bold text-gray-900">{user?.name}</h2>
              <p className="text-gray-600">{profile?.specialty}</p>
              <p className="text-sm text-gray-500">{user?.email}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-xs text-gray-600">Alunos</p>
              <p className="text-2xl font-bold text-gray-900">{profile?.studentsCount || 0}</p>
            </div>
            <div>
              <p className="text-xs text-gray-600">Experience</p>
              <p className="text-2xl font-bold text-gray-900">{formData.experience} anos</p>
            </div>
          </div>
        </div>

        {/* Formulário editar */}
        {!editing ? (
          <div className="space-y-3">
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <p className="text-xs text-gray-600">Bio</p>
              <p className="text-gray-900 mt-1">{formData.bio || 'Nenhuma bio adicionada'}</p>
            </div>
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <p className="text-xs text-gray-600">Telefone</p>
              <p className="text-gray-900 mt-1">{formData.phone || 'Não informado'}</p>
            </div>
            <div className="bg-white rounded-lg p-4 border border-gray-200">
              <p className="text-xs text-gray-600">Código/CRM</p>
              <p className="text-gray-900 mt-1">{formData.codeOrCRM || 'Não informado'}</p>
            </div>
            <button
              onClick={() => setEditing(true)}
              className="w-full bg-blue-600 text-white p-3 rounded font-semibold hover:bg-blue-700 transition mt-4"
            >
              Editar Perfil
            </button>
          </div>
        ) : (
          <div className="space-y-3 bg-white rounded-lg p-4 border border-gray-200">
            <div>
              <label className="text-xs text-gray-600">Bio</label>
              <textarea
                value={formData.bio}
                onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
                className="w-full mt-1 p-2 border rounded text-sm"
                rows="3"
                placeholder="Descreva sua experiência..."
              />
            </div>
            <div>
              <label className="text-xs text-gray-600">Telefone</label>
              <input
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full mt-1 p-2 border rounded text-sm"
                placeholder="(11) 99999-9999"
              />
            </div>
            <div>
              <label className="text-xs text-gray-600">Código/CRM</label>
              <input
                type="text"
                value={formData.codeOrCRM}
                onChange={(e) => setFormData({ ...formData, codeOrCRM: e.target.value })}
                className="w-full mt-1 p-2 border rounded text-sm"
                placeholder="CREF, CRN, etc"
              />
            </div>
            <div>
              <label className="text-xs text-gray-600">Anos de Experiência</label>
              <input
                type="number"
                value={formData.experience}
                onChange={(e) => setFormData({ ...formData, experience: parseInt(e.target.value) })}
                className="w-full mt-1 p-2 border rounded text-sm"
                min="0"
              />
            </div>
            <div className="flex gap-2 pt-4">
              <button
                onClick={handleSave}
                className="flex-1 bg-green-600 text-white p-2 rounded font-semibold hover:bg-green-700 transition"
              >
                Salvar
              </button>
              <button
                onClick={() => setEditing(false)}
                className="flex-1 bg-gray-300 text-gray-700 p-2 rounded font-semibold hover:bg-gray-400 transition"
              >
                Cancelar
              </button>
            </div>
          </div>
        )}

        {/* Logout */}
        <button
          onClick={handleLogout}
          className="w-full bg-red-600 text-white p-3 rounded font-semibold hover:bg-red-700 transition mt-6"
        >
          Logout
        </button>
      </div>

      <BottomNavigation />
    </div>
  );
};

export default ProfessionalProfilePage;
