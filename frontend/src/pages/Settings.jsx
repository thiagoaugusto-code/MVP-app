import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Header from '../components/Header';
import styles from './Settings.module.css';

const Settings = () => {
  const navigate = useNavigate();

  const [darkMode, setDarkMode] = useState(() => {
  return localStorage.getItem('darkMode') === 'true';
});

const [notifications, setNotifications] = useState(() => {
  return localStorage.getItem('notifications') !== 'false';
});


useEffect(() => {
  localStorage.setItem('darkMode', darkMode);
}, [darkMode]);

useEffect(() => {
  localStorage.setItem('notifications', notifications);
}, [notifications]);

useEffect(() => {
  document.documentElement.classList.toggle('dark', darkMode);
}, [darkMode]);

  return (
  <div className="min-h-screen bg-gray-100 dark:bg-gray-900 transition-colors">
    <Header />

    <main className="max-w-xl mx-auto p-4">
      <button
        onClick={() => navigate(-1)}
        className="text-blue-500 mb-4"
      >
        ← Voltar
      </button>

      <h1 className="text-xl font-bold mb-4 text-gray-900 dark:text-white">
        Configurações
      </h1>

      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 mb-4 shadow">
        <h2 className="font-semibold mb-3 text-gray-800 dark:text-gray-200">
          Preferências
        </h2>

        <div className="flex justify-between items-center py-2 border-b border-gray-200 dark:border-gray-700">
          <span className="text-gray-700 dark:text-gray-300">
            🌙 Modo escuro
          </span>
          <input
            type="checkbox"
            checked={darkMode}
            onChange={(e) => setDarkMode(e.target.checked)}
          />
        </div>

        <div className="flex justify-between items-center py-2">
          <span className="text-gray-700 dark:text-gray-300">
            📱 Notificações
          </span>
          <input
            type="checkbox"
            checked={notifications}
            onChange={(e) => setNotifications(e.target.checked)}
          />
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl p-4 shadow">
        <h2 className="font-semibold mb-3 text-gray-800 dark:text-gray-200">
          Privacidade
        </h2>

        <div className="flex justify-between items-center py-2">
          <span className="text-gray-700 dark:text-gray-300">
            📊 Compartilhar dados
          </span>
          <input type="checkbox" />
        </div>
      </div>
    </main>
  </div>
);

};

export default Settings;