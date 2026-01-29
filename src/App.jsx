import { useAuth } from './hooks/useAuth';
import LoginPage from './pages/LoginPage';
import UserPortal from './pages/UserPortal';
import AdminDashboard from './pages/AdminDashboard';
import './App.css';

function App() {
  const { user, login } = useAuth();

  // Si no hay usuario, mostrar login
  if (!user) {
    return <LoginPage onLogin={login} />;
  }

  // Si es admin, mostrar dashboard administrativo
  if (user.rol === 'admin') {
    return <AdminDashboard />;
  }

  // Si es usuario normal, mostrar portal de usuario
  return <UserPortal />;
}

export default App;
