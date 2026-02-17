import { useEffect, useState } from 'react';
import { useMsal, useIsAuthenticated } from '@azure/msal-react';
import { useAuth } from './hooks/useAuth';
import LoginPage from './pages/LoginPage';
import UserPortal from './pages/UserPortal';
import AdminDashboard from './pages/AdminDashboard';
import './App.css';

function App() {
  const { user, isInitializing, handleLoginSuccess } = useAuth();
  const { instance } = useMsal();
  const isAuthenticated = useIsAuthenticated();
  const [isProcessingCallback, setIsProcessingCallback] = useState(true);

  // Manejar el callback de MSAL después de login redirect (solo una vez)
  useEffect(() => {
    const handleRedirect = async () => {
      try {
        const response = await instance.handleRedirectPromise();
        
        if (response && response.accessToken) {
          console.log('✅ Login exitoso, response:', response);
          // Hubo un login exitoso, sincronizar con backend usando el token del response
          const success = await handleLoginSuccess(response.accessToken);
          console.log('Resultado sincronización:', success);
          
          // No hacer logout automático, dejar que el usuario vea el error
        }
      } catch (error) {
        console.error('❌ Error manejando redirect:', error);
      } finally {
        setIsProcessingCallback(false);
      }
    };

    handleRedirect();
  }, []); // Sin dependencias - solo ejecutar una vez

  // Mostrar loading mientras se procesa el callback o se inicializa
  if (isProcessingCallback || isInitializing) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-primary mb-4"></div>
          <p className="text-gray-700 font-medium">Cargando...</p>
        </div>
      </div>
    );
  }

  // Si no hay usuario autenticado, mostrar login
  if (!user || !isAuthenticated) {
    return <LoginPage />;
  }

  // Si es admin, mostrar dashboard administrativo
  if (user.rol === 'admin') {
    return <AdminDashboard />;
  }

  // Si es usuario normal, mostrar portal de usuario
  return <UserPortal />;
}

export default App;
