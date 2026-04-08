import { useContext } from 'react';
import { Navigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const RoleBasedRoute = ({ children, role }) => {
  const { user, loading } = useContext(AuthContext);

  if (loading) return <div>Loading...</div>;

  if (!user) return <Navigate to="/login" />;

  if (role && user.role !== role) {
    // Redirecionar para o dashboard correto baseado no role
    return <Navigate to={user.role === 'USER' ? '/' : '/collaborator'} />;
  }

  return children;
};

export default RoleBasedRoute;
