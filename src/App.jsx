import React, { useEffect, useRef, useState } from 'react';
import { useMsal, useIsAuthenticated } from '@azure/msal-react';
import { useAuth } from './hooks/useAuth';
import { hasApiScope } from './config/msalConfig';
import LoginPage from './pages/LoginPage';
import UserPortal from './pages/UserPortal';
import AdminDashboard from './pages/AdminDashboard';
import './App.css';

function App() {
  const { user, isInitializing, handleLoginSuccess } = useAuth();
  const { instance } = useMsal();
  const isAuthenticated = useIsAuthenticated();
  const [isProcessingCallback, setIsProcessingCallback] = useState(true);
  const isAppLoading = isProcessingCallback || isInitializing;
  const [showLoadingScreen, setShowLoadingScreen] = useState(isAppLoading);
  const [isLoadingClosing, setIsLoadingClosing] = useState(false);
  const hasSyncedSessionRef = useRef(false);

  // Manejar el callback de MSAL después de login redirect (solo una vez)
  useEffect(() => {
    const handleRedirect = async () => {
      try {
        const response = await instance.handleRedirectPromise();
        const redirectToken = hasApiScope ? response?.accessToken : response?.idToken;
        const redirectAccount = response?.account || null;

        if (redirectAccount) {
          instance.setActiveAccount(redirectAccount);
        }

        if (response && redirectToken) {
          // Hubo un login exitoso, sincronizar con backend usando el token del response
          hasSyncedSessionRef.current = await handleLoginSuccess(redirectToken, redirectAccount);
        } else if (response) {
          hasSyncedSessionRef.current = await handleLoginSuccess(null, redirectAccount);
        }
      } catch (error) {
        hasSyncedSessionRef.current = false;
        console.error('[App] Error procesando callback de login', error);
      } finally {
        setIsProcessingCallback(false);
      }
    };

    handleRedirect();
  }, []); // Sin dependencias - solo ejecutar una vez

  useEffect(() => {
    if (!isAuthenticated) {
      hasSyncedSessionRef.current = false;
    }
  }, [isAuthenticated]);

  useEffect(() => {
    const syncIfNeeded = async () => {
      if (!isAuthenticated || isProcessingCallback) return;
      if (hasSyncedSessionRef.current) return;

      try {
        hasSyncedSessionRef.current = await handleLoginSuccess();
      } catch (error) {
        hasSyncedSessionRef.current = false;
        console.error('[App] Error sincronizando sesion', error);
      }
    };

    syncIfNeeded();
  }, [isAuthenticated, isProcessingCallback, handleLoginSuccess]);

  useEffect(() => {
    if (isAppLoading) {
      setShowLoadingScreen(true);
      setIsLoadingClosing(false);
      return;
    }

    if (!showLoadingScreen) return;

    setIsLoadingClosing(true);
    const timeoutId = setTimeout(() => {
      setShowLoadingScreen(false);
      setIsLoadingClosing(false);
    }, 180);

    return () => clearTimeout(timeoutId);
  }, [isAppLoading, showLoadingScreen]);

  // Mostrar loading mientras se procesa el callback o se inicializa
  if (showLoadingScreen) {
    return (
      <div
        className={`relative overflow-hidden min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50 ${
          isLoadingClosing ? 'animate-fade-out' : 'animate-fade-in'
        }`}
      >
        <div className="loading-blob loading-blob-1" aria-hidden="true"></div>
        <div className="loading-blob loading-blob-2" aria-hidden="true"></div>

        <div className={`loading-center relative z-10 text-center ${isLoadingClosing ? 'animate-pop-out' : 'animate-pop-in'}`}>
          <div className="loading-spinner-wrap">
            <div className="loading-orbit"></div>
            <div className="loading-orbit loading-orbit-2"></div>
            <div className="loading-orbit loading-orbit-3"></div>
            <div className="loading-core-dot" aria-hidden="true"></div>
          </div>
          <img
            src="/images/logopll_positivo.svg"
            alt="Perez-Llorca"
            className="loading-brand"
          />
          <p className="text-gray-800 text-2xl sm:text-3xl font-semibold mt-5">Cargando información...</p>
          <p className="text-gray-500 text-base mt-1">Estamos preparando tu panel</p>
          <div className="mt-4 flex items-center justify-center gap-2" aria-hidden="true">
            <span className="loading-dot"></span>
            <span className="loading-dot loading-dot-2"></span>
            <span className="loading-dot loading-dot-3"></span>
          </div>
        </div>
      </div>
    );
  }

  // Si no hay usuario autenticado, mostrar login
  if (!user || !isAuthenticated) {
    return <LoginPage />;
  }

  // Si es admin o view, mostrar dashboard administrativo
  if (user.rol === 'admin' || user.rol === 'view') {
    return <AdminDashboard />;
  }

  // Si es usuario normal, mostrar portal de usuario
  return <UserPortal />;
}

export default App;
