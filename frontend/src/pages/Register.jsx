import { useState, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { useToast } from '../components/toast/ToastProvider';

const Register = () => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const { register } = useContext(AuthContext);
  const navigate = useNavigate();
  const toast = useToast();


  const handleSubmit = async (e) => {
    e.preventDefault();
    const result = await register(name, email, password);
    if (result.success) {
     navigate('/');
    } else {
      toast.error(result.message);
    }
  };


  // Cadastro
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      <form onSubmit={handleSubmit} className="bg-white p-6 rounded shadow-md w-full max-w-md">
        <button
          type="button"
          onClick={() => navigate('/login')}
          className="text-blue-600 text-sm mb-4 flex items-center"
        >
          ← Login
        </button>
        <h2 className="text-2xl font-bold mb-4">Criar Conta</h2>
        <input
          type="text"
          placeholder="Nome"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full p-2 mb-4 border rounded"
          required
        />
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full p-2 mb-4 border rounded"
          required
        />
        <input
          type="password"
          placeholder="Senha"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full p-2 mb-6 border rounded"
          required
        />
        <button type="submit" className="w-full bg-blue-600 text-white p-2 rounded font-semibold hover:bg-blue-700">
          Cadastrar
        </button>
        <p className="mt-4 text-center text-sm">
          Já tem conta? <Link to="/login" className="text-blue-600 font-semibold">Faça login</Link>
        </p>
      </form>
    </div>
  );
};

export default Register;