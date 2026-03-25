import React, { useState } from 'react';
import { LogIn } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

const LoginPage = () => {
  const { login } = useAuth();
  const [loading, setLoading] = useState(false);
  const backgroundImage = '/images/PLL Bckgrnd 02.jpg';

  const handleMicrosoftLogin = async () => {
    setLoading(true);
    try {
      await login();
    } catch (error) {
      console.error('[LoginPage] Error al iniciar sesión', error);
      setLoading(false);
    }
  };

  return (
    <div
      className="relative min-h-screen overflow-hidden px-4"
      style={{
        backgroundImage: `url("${backgroundImage}")`,
        backgroundPosition: 'center top',
        backgroundRepeat: 'no-repeat',
        backgroundSize: 'cover'
      }}
    >
      <div className="absolute inset-0 bg-slate-950/45" />
      <div className="relative z-10 flex min-h-screen items-center justify-center py-8 sm:py-12">
      <div className="w-full max-w-md rounded-2xl border border-white/30 bg-white/90 p-6 shadow-2xl backdrop-blur-sm sm:p-8">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary rounded-full mb-4">
            <LogIn className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900">7P-PLL</h1>
          <p className="text-gray-600 mt-2">Portal de Gestión Documental</p>
        </div>

        <div className="space-y-6">
          <button
            onClick={handleMicrosoftLogin}
            disabled={loading}
            className="w-full bg-white border-2 border-gray-300 text-gray-700 py-3 px-4 rounded-lg font-semibold hover:bg-gray-50 hover:border-gray-400 transition-all shadow-sm disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-gray-700"></div>
                <span>Redirigiendo...</span>
              </>
            ) : (
              <>
                <svg className="w-5 h-5" viewBox="0 0 21 21" fill="none" xmlns="http://www.w3.org/2000/svg">
                  <rect x="1" y="1" width="9" height="9" fill="#F25022"/>
                  <rect x="1" y="11" width="9" height="9" fill="#00A4EF"/>
                  <rect x="11" y="1" width="9" height="9" fill="#7FBA00"/>
                  <rect x="11" y="11" width="9" height="9" fill="#FFB900"/>
                </svg>
                <span>Iniciar sesión con Microsoft</span>
              </>
            )}
          </button>

          <div className="text-center text-sm text-gray-600 mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
            <p className="font-medium text-blue-900 mb-2">
              Autenticación empresarial
            </p>
            <p className="text-xs text-gray-700">
              Puedes iniciar sesión con cualquier cuenta corporativa de Microsoft. 
              Los usuarios de <strong>Pérez-Llorca</strong> tendrán permisos de administrador automáticamente.
            </p>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
};

export default LoginPage;
