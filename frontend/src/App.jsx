import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import DietPlan from './pages/DietPlan';
import Workout from './pages/Workout';
import Progress from './pages/Progress';
import Profile from './pages/Profile';
import Marketplace from './pages/Marketplace';
import Calendar from './pages/Calendar';
import CollaboratorDashboard from './pages/CollaboratorDashboard';
import StudentProgress from './pages/StudentProgress';
import Adherence from './pages/Adherence';
import Schedule from './pages/Schedule';
import ProfessionalProfile from './pages/ProfessionalProfile';
import ChatPage from './pages/ChatPage';
import ProtectedRoute from './components/ProtectedRoute';
import RoleBasedRoute from './components/RoleBasedRoute';
import './App.css';

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <Routes>
            {/* Públicas */}
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />

            {/* Rotas de Aluno (USER) */}
            <Route path="/" element={<RoleBasedRoute role="USER"><Dashboard /></RoleBasedRoute>} />
            <Route path="/marketplace" element={<RoleBasedRoute role="USER"><Marketplace /></RoleBasedRoute>} />
            <Route path="/calendar" element={<RoleBasedRoute role="USER"><Calendar /></RoleBasedRoute>} />
            <Route path="/chat" element={<RoleBasedRoute role="USER"><ChatPage /></RoleBasedRoute>} />
            <Route path="/diet" element={<RoleBasedRoute role="USER"><DietPlan /></RoleBasedRoute>} />
            <Route path="/workout" element={<RoleBasedRoute role="USER"><Workout /></RoleBasedRoute>} />
            <Route path="/progress" element={<RoleBasedRoute role="USER"><Progress /></RoleBasedRoute>} />
            <Route path="/profile" element={<RoleBasedRoute role="USER"><Profile /></RoleBasedRoute>} />

            {/* Rotas de Colaborador (COLLABORATOR e outros) */}
            <Route 
              path="/collaborator" 
              element={
                <ProtectedRoute>
                  <CollaboratorDashboard />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/student/:studentId" 
              element={
                <ProtectedRoute>
                  <StudentProgress />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/student/:studentId/progress" 
              element={
                <ProtectedRoute>
                  <StudentProgress />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/collaborator/adherence" 
              element={
                <ProtectedRoute>
                  <Adherence />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/collaborator/schedule" 
              element={
                <ProtectedRoute>
                  <Schedule />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/collaborator/profile" 
              element={
                <ProtectedRoute>
                  <ProfessionalProfile />
                </ProtectedRoute>
              } 
            />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;