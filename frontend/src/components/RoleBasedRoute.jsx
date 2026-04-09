import { useContext } from 'react';
import { Navigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

const RoleBasedRoute = ({ children, role }) => {
  const { user, loading, getEffectiveRole } = useContext(AuthContext);

  if (loading) return <div>Loading...</div>;

  if (!user) return <Navigate to="/login" />;

  const effectiveRole = getEffectiveRole();

  if (role && effectiveRole !== role) {
    // Redirecionar para o dashboard correto baseado no role efetivo
    return <Navigate to={effectiveRole === 'USER' ? '/' : '/collaborator'} />;
  }

  return children;
};

export default RoleBasedRoute;
