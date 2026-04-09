import { createContext, useState, useEffect, useContext } from 'react';
import api from '../services/api';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [token, setToken] = useState(null);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('admin'); // 'admin' or 'student'

  useEffect(() => {
    const storedToken = localStorage.getItem('token');
    const userData = localStorage.getItem('user');
    if (storedToken && userData) {
      setToken(storedToken);
      setUser(JSON.parse(userData));
    }
    setLoading(false);
  }, []);

  const login = async (email, password) => {
    try {
      const response = await api.post('/auth/login', { email, password });
      const { token: authToken, user: userData } = response.data;
      localStorage.setItem('token', authToken);
      localStorage.setItem('user', JSON.stringify(userData));
      setToken(authToken);
      setUser(userData);
      return { success: true };
    } catch (error) {
      return { success: false, message: error.response?.data?.message || 'Erro no login' };
    }
  };

  const register = async (name, email, password, role = 'USER', specialty = 'instructor') => {
    try {
      const response = await api.post('/auth/register', { name, email, password, role, specialty });
      const { token: authToken, user: userData } = response.data;
      localStorage.setItem('token', authToken);
      localStorage.setItem('user', JSON.stringify(userData));
      setToken(authToken);
      setUser(userData);
      return { success: true };
    } catch (error) {
      return { success: false, message: error.response?.data?.message || 'Erro no cadastro' };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
    setViewMode('admin'); // Reset to admin mode on logout
  };

  const switchViewMode = (mode) => {
    if (user?.role === 'ADMIN') {
      setViewMode(mode);
    }
  };

  const getEffectiveRole = () => {
    if (user?.role === 'ADMIN') {
      return viewMode === 'student' ? 'USER' : user.role;
    }
    return user?.role;
  };

  return (
    <AuthContext.Provider value={{ 
      user, 
      token, 
      login, 
      register, 
      logout, 
      loading,
      viewMode,
      switchViewMode,
      getEffectiveRole
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);