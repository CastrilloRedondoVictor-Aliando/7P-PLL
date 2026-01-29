import { useState } from 'react';
import { XCircle, Plus, Search } from 'lucide-react';
import { MOCK_USERS } from '../data/mockData';

const CreateSolicitudModal = ({ isOpen, onClose, onCreate }) => {
  const [formData, setFormData] = useState({
    usuarioID: '',
    proyecto: '',
    comentarios: ''
  });
  const [searchUser, setSearchUser] = useState('');

  const externalUsers = MOCK_USERS.filter(u => u.rol === 'user');
  
  const filteredUsers = externalUsers.filter(user => 
    user.name.toLowerCase().includes(searchUser.toLowerCase()) ||
    user.email.toLowerCase().includes(searchUser.toLowerCase())
  );

  const handleSubmit = (e) => {
    e.preventDefault();
    if (formData.usuarioID && formData.proyecto && formData.comentarios) {
      onCreate(
        parseInt(formData.usuarioID),
        formData.proyecto,
        formData.comentarios
      );
      setFormData({ usuarioID: '', proyecto: '', comentarios: '' });
      setSearchUser('');
      onClose();
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="bg-primary text-white p-6 flex justify-between items-center">
          <div>
            <h3 className="text-2xl font-bold">Nueva Solicitud</h3>
            <p className="text-blue-200 text-sm">Crear solicitud para un usuario</p>
          </div>
          <button
            onClick={onClose}
            className="text-white hover:bg-white hover:bg-opacity-20 p-2 rounded-lg transition-colors"
          >
            <XCircle className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div>
            <label htmlFor="usuarioSearch" className="block text-sm font-semibold text-gray-700 mb-2">
              Usuario Destinatario *
            </label>
            <div className="relative mb-2">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                id="usuarioSearch"
                type="text"
                placeholder="Buscar por nombre o email..."
                value={searchUser}
                onChange={(e) => setSearchUser(e.target.value)}
                className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:border-primary"
              />
            </div>
            <div className="border border-gray-200 rounded-lg max-h-48 overflow-y-auto">
              {filteredUsers.length === 0 ? (
                <p className="text-gray-500 text-center py-4 text-sm">No se encontraron usuarios</p>
              ) : (
                filteredUsers.map(user => (
                  <div
                    key={user.id}
                    onClick={() => setFormData(prev => ({ ...prev, usuarioID: user.id.toString() }))}
                    className={`p-3 cursor-pointer hover:bg-blue-50 transition-colors ${
                      formData.usuarioID === user.id.toString() ? 'bg-blue-100 border-l-4 border-primary' : ''
                    }`}
                  >
                    <p className="font-semibold text-gray-900">{user.name}</p>
                    <p className="text-sm text-gray-600">{user.email}</p>
                  </div>
                ))
              )}
            </div>
            {!formData.usuarioID && (
              <p className="text-xs text-red-500 mt-1">Selecciona un usuario de la lista</p>
            )}
          </div>

          <div>
            <label htmlFor="proyecto" className="block text-sm font-semibold text-gray-700 mb-2">
              Nombre del Proyecto *
            </label>
            <input
              id="proyecto"
              name="proyecto"
              type="text"
              value={formData.proyecto}
              onChange={handleChange}
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:border-primary"
              placeholder="Ej: Proyecto Omega"
              required
            />
          </div>

          <div>
            <label htmlFor="comentarios" className="block text-sm font-semibold text-gray-700 mb-2">
              Descripción / Comentarios *
            </label>
            <textarea
              id="comentarios"
              name="comentarios"
              value={formData.comentarios}
              onChange={handleChange}
              rows="5"
              className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:border-primary resize-none"
              placeholder="Describe los detalles de la solicitud..."
              required
            ></textarea>
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center space-x-2"
            >
              <Plus className="w-5 h-5" />
              <span>Crear Solicitud</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default CreateSolicitudModal;
