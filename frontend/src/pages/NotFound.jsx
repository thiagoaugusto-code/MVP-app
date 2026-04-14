import { useContext } from 'react';
import { Link } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

export default function NotFound() {
  const { user, loading, getEffectiveRole } = useContext(AuthContext);

  if (loading) return null;

  const effectiveRole = user ? getEffectiveRole() : null;
  const home = effectiveRole === 'USER' ? '/' : '/collaborator';

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      <div className="bg-white p-6 rounded shadow-md w-full max-w-md">
        <h1 className="text-xl font-bold text-gray-900">Página não encontrada</h1>
        <p className="text-gray-600 mt-2">Esse caminho não existe ou foi movido.</p>
        <div className="mt-4 flex gap-2">
          <Link
            to={user ? home : '/login'}
            className="flex-1 bg-blue-600 text-white p-2 rounded font-semibold text-center hover:bg-blue-700 transition"
          >
            Ir para início
          </Link>
          <Link
            to="/"
            className="flex-1 bg-gray-200 text-gray-800 p-2 rounded font-semibold text-center hover:bg-gray-300 transition"
          >
            Home
          </Link>
        </div>
      </div>
    </div>
  );
}

