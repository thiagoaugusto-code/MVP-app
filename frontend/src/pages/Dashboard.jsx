import Header from '../components/Header';
import Sidebar from '../components/Sidebar';
import StreakCard from '../components/StreakCard';
import InsightCard from '../components/InsightCard';
import DailyChecklist from '../components/DailyChecklist';

const Dashboard = () => {
  const streak = 5; // Exemplo
  const insight = "Você está indo bem! Continue assim.";
  const checklistItems = [
    { id: 1, text: 'Beber 2L de água' },
    { id: 2, text: 'Fazer refeições' },
    { id: 3, text: 'Treino diário' },
  ];

  return (
    <div className="flex">
      <Sidebar />
      <div className="flex-1">
        <Header />
        <main className="p-6">
          <h2 className="text-2xl mb-6">Dashboard</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-white p-4 rounded shadow-md">
              <h3 className="text-lg font-semibold">Kcal do Dia</h3>
              <p className="text-2xl font-bold">1800</p>
            </div>
            <div className="bg-white p-4 rounded shadow-md">
              <h3 className="text-lg font-semibold">Refeições Concluídas</h3>
              <p className="text-2xl font-bold">3/5</p>
            </div>
            <div className="bg-white p-4 rounded shadow-md">
              <h3 className="text-lg font-semibold">Treino do Dia</h3>
              <p className="text-2xl font-bold">Concluído</p>
            </div>
            <StreakCard streak={streak} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <InsightCard insight={insight} />
            <DailyChecklist items={checklistItems} />
          </div>
        </main>
      </div>
    </div>
  );
};

export default Dashboard;