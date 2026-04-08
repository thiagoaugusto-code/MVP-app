import { Link } from 'react-router-dom';

const Sidebar = () => {
  return (
    <aside className="w-64 bg-gray-800 text-white h-screen p-4">
      <nav>
        <ul>
          <li className="mb-4">
            <Link to="/" className="block py-2 px-4 rounded hover:bg-gray-700">Dashboard</Link>
          </li>
          <li className="mb-4">
            <Link to="/diet" className="block py-2 px-4 rounded hover:bg-gray-700">Plano Alimentar</Link>
          </li>
          <li className="mb-4">
            <Link to="/workout" className="block py-2 px-4 rounded hover:bg-gray-700">Treino</Link>
          </li>
          <li className="mb-4">
            <Link to="/progress" className="block py-2 px-4 rounded hover:bg-gray-700">Progresso</Link>
          </li>
        </ul>
      </nav>
    </aside>
  );
};

export default Sidebar;