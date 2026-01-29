import { useState } from 'react';
import { LogIn } from 'lucide-react';
import { MOCK_USERS } from '../data/mockData';

const LoginPage = ({ onLogin }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    
    const success = onLogin(email, password);
    if (!success) {
      setError('Email o contraseña incorrectos');
    }
  };

  const handleSelectUser = (user) => {
    setEmail(user.email);
    setPassword(user.password);
    setError('');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50">
      <div className="bg-white p-8 rounded-2xl shadow-2xl max-w-md w-full">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-primary rounded-full mb-4">
            <LogIn className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-3xl font-bold text-gray-900">7P-PLL</h1>
          <p className="text-gray-600 mt-2">Portal de Gestión de Solicitudes</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label htmlFor="email" className="block text-sm font-semibold text-gray-700 mb-2">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:border-primary transition-colors"
              placeholder="usuario@email.com"
              required
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-2">
              Contraseña
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:border-primary transition-colors"
              placeholder="••••••••"
              required
            />
          </div>

          {error && (
            <div className="bg-red-100 border border-red-200 text-red-800 px-4 py-3 rounded-lg text-sm">
              {error}
            </div>
          )}

          <button
            type="submit"
            className="w-full bg-primary text-white py-3 rounded-lg font-semibold hover:bg-blue-700 transition-colors shadow-md"
          >
            Iniciar Sesión
          </button>
        </form>

        <div className="mt-8 pt-6 border-t border-gray-200">
          <p className="text-xs font-semibold text-gray-700 text-center mb-3">
            Usuarios de prueba:
          </p>
          <div className="space-y-2">
            {MOCK_USERS.map(user => (
              <div 
                key={user.id} 
                className="bg-gray-50 rounded-lg p-3 border border-gray-200 flex items-center justify-between"
              >
                <div className="flex-1">
                  <p className="text-xs font-medium text-gray-900">
                    {user.email} <span className="text-gray-600">({user.name})</span>
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    Contraseña: <span className="font-mono bg-gray-200 px-2 py-0.5 rounded">{user.password}</span>
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => handleSelectUser(user)}
                  className="ml-3 px-3 py-1.5 bg-primary text-white text-xs font-semibold rounded hover:bg-blue-700 transition-colors whitespace-nowrap"
                >
                  Seleccionar
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginPage;
