import { useState, useContext } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import { useToast } from '../components/toast/ToastProvider';

const Register = () => {
  const [step, setStep] = useState('role'); // role, form, specialty
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('USER');
  const [specialty, setSpecialty] = useState('instructor');
  const { register } = useContext(AuthContext);
  const navigate = useNavigate();
  const toast = useToast();

  const specialties = [
    { value: 'nutritionist', label: 'Nutricionista' },
    { value: 'personal', label: 'Personal Trainer' },
    { value: 'instructor', label: 'Instrutor' },
    { value: 'coach', label: 'Coach' },
  ];

  const handleRoleSelect = (selectedRole) => {
    setRole(selectedRole);
    if (selectedRole === 'USER') {
      setStep('form');
    } else {
      setStep('specialty');
    }
  };

  const handleSpecialtySelect = (selectedSpecialty) => {
    setSpecialty(selectedSpecialty);
    setStep('form');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const result = await register(name, email, password, role, specialty);
    if (result.success) {
      // Redirecionar baseado no role
      if (role === 'USER') {
        navigate('/');
      } else {
        navigate('/collaborator');
      }
    } else {
      toast.error(result.message);
    }
  };

  // Step 1: Escolher role
  if (step === 'role') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
        <div className="bg-white p-6 rounded shadow-md w-full max-w-md">
          <h2 className="text-2xl font-bold mb-6 text-center">Como você deseja usar?</h2>
          <div className="space-y-3">
            <button
              onClick={() => handleRoleSelect('USER')}
              className="w-full p-4 border-2 border-blue-600 rounded text-blue-600 font-semibold hover:bg-blue-50 transition"
            >
              📚 Sou Aluno
              <p className="text-xs font-normal text-gray-600 mt-1">Acompanhe seus ganhos, dieta e treinos</p>
            </button>
            <button
              onClick={() => handleRoleSelect('COLLABORATOR')}
              className="w-full p-4 border-2 border-green-600 rounded text-green-600 font-semibold hover:bg-green-50 transition"
            >
              👨‍🏫 Sou Colaborador
              <p className="text-xs font-normal text-gray-600 mt-1">Acompanhe seus alunos e evolução deles</p>
            </button>
          </div>
          <p className="mt-4 text-center text-sm">
            Já tem conta? <Link to="/login" className="text-blue-600 font-semibold">Faça login</Link>
          </p>
        </div>
      </div>
    );
  }

  // Step 2: Escolher especialidade (apenas para colaboradores)
  if (step === 'specialty') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
        <div className="bg-white p-6 rounded shadow-md w-full max-w-md">
          <button
            onClick={() => setStep('role')}
            className="text-blue-600 text-sm mb-4 flex items-center"
          >
            ← Voltar
          </button>
          <h2 className="text-2xl font-bold mb-6">Qual é sua especialidade?</h2>
          <div className="space-y-3">
            {specialties.map((spec) => (
              <button
                key={spec.value}
                onClick={() => handleSpecialtySelect(spec.value)}
                className="w-full p-4 border-2 border-gray-300 rounded hover:border-green-600 hover:bg-green-50 transition text-left"
              >
                {spec.label}
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Step 3: Formulário de cadastro
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      <form onSubmit={handleSubmit} className="bg-white p-6 rounded shadow-md w-full max-w-md">
        <button
          type="button"
          onClick={() => setStep('role')}
          className="text-blue-600 text-sm mb-4 flex items-center"
        >
          ← Voltar
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