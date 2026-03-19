import React from 'react';
import { ShieldAlert } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

const AccessDeniedPage = () => {
  const { logout } = useAuth();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center p-6">
      <div className="max-w-lg w-full bg-white rounded-xl shadow-md border border-gray-200 p-8 text-center">
        <div className="mx-auto w-14 h-14 rounded-full bg-red-100 text-red-600 flex items-center justify-center mb-4">
          <ShieldAlert className="w-7 h-7" />
        </div>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">No tienes permisos</h1>
        <p className="text-gray-600 mb-6">
          Tu correo no está autorizado para acceder a esta aplicación.
          Contacta con un administrador para solicitar acceso.
        </p>
        <button
          onClick={logout}
          className="bg-primary text-white px-5 py-2 rounded-lg hover:opacity-90 transition-opacity"
        >
          Cerrar sesión
        </button>
      </div>
    </div>
  );
};

export default AccessDeniedPage;
