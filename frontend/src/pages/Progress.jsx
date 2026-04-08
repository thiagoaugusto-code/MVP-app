import Header from '../components/Header';
import Sidebar from '../components/Sidebar';

const Progress = () => {
  return (
    <div className="flex">
      <Sidebar />
      <div className="flex-1">
        <Header />
        <main className="p-6">
          <h2 className="text-2xl mb-6">Progresso</h2>
          <p>Conteúdo do progresso aqui.</p>
        </main>
      </div>
    </div>
  );
};

export default Progress;