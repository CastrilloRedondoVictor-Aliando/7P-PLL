import { useState, useEffect } from 'react';
import { XCircle, Plus, Search } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';

const CreateSolicitudModal = ({ isOpen, onClose, onCreate }) => {
  const { getUsers } = useAuth();
  const [formData, setFormData] = useState({
    usuarioID: '',
    proyecto: '',
    pais: '',
    fechaInicio: '',
    fechaFin: '',
    filial: '',
    horasCodigo: ''
  });
  const [searchUser, setSearchUser] = useState('');
  const [users, setUsers] = useState([]);
  const [isClosing, setIsClosing] = useState(false);

  useEffect(() => {
    const loadUsers = async () => {
      if (isOpen) {
        try {
          const userData = await getUsers();
          setUsers(userData.filter(u => u.rol === 'user'));
        } catch (error) {
          console.error('Error cargando usuarios:', error);
          setUsers([]);
        }
      }
    };
    
    loadUsers();
  }, [isOpen, getUsers]);

  useEffect(() => {
    if (isOpen) {
      setIsClosing(false);
    }
  }, [isOpen]);

  const requestClose = (event) => {
    event?.preventDefault();
    event?.stopPropagation();
    if (isClosing) return;
    setIsClosing(true);
    setTimeout(() => {
      onClose();
      setIsClosing(false);
    }, 180);
  };

  const filteredUsers = users.filter(user => 
    user.nombre.toLowerCase().includes(searchUser.toLowerCase()) ||
    user.email.toLowerCase().includes(searchUser.toLowerCase())
  );

  const handleSubmit = (e) => {
    e.preventDefault();
    if (formData.usuarioID && formData.proyecto) {
      onCreate(
        parseInt(formData.usuarioID),
        formData.proyecto,
        '',
        {
          pais: formData.pais,
          fechaInicio: formData.fechaInicio,
          fechaFin: formData.fechaFin,
          filial: formData.filial,
          horasCodigo: formData.horasCodigo
        }
      );
      setFormData({
        usuarioID: '',
        proyecto: '',
        pais: '',
        fechaInicio: '',
        fechaFin: '',
        filial: '',
        horasCodigo: ''
      });
      setSearchUser('');
      requestClose();
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  if (!isOpen && !isClosing) return null;

  return (
    <div
      className={`fixed inset-0 bg-black bg-opacity-50 z-50 flex items-start sm:items-center justify-center p-3 sm:p-4 ${
        isClosing ? 'animate-fade-out' : 'animate-fade-in'
      }`}
      onClick={requestClose}
    >
      <div
        className={`bg-white rounded-xl shadow-2xl max-w-2xl w-[95vw] sm:w-full max-h-[92vh] overflow-y-auto ${
          isClosing ? 'animate-pop-out' : 'animate-pop-in'
        }`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-primary text-white p-4 sm:p-6 flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-center">
          <div>
            <h3 className="text-2xl font-bold">Nueva Solicitud</h3>
            <p className="text-blue-200 text-sm">Crear solicitud para un usuario</p>
          </div>
          <button
            onClick={requestClose}
            className="text-white hover:bg-white hover:bg-opacity-20 p-2 rounded-lg transition-colors"
          >
            <XCircle className="w-6 h-6" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-6">
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
                    <p className="font-semibold text-gray-900">{user.nombre}</p>
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

          <div className="border-t pt-4">
            <h4 className="text-sm font-semibold text-gray-700 mb-3">Campos opcionales</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="pais" className="block text-sm font-semibold text-gray-700 mb-2">
                  Pais
                </label>
                <input
                  id="pais"
                  name="pais"
                  type="text"
                  value={formData.pais}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:border-primary"
                  placeholder="Ej: Espana"
                />
              </div>

              <div>
                <label htmlFor="filial" className="block text-sm font-semibold text-gray-700 mb-2">
                  Filial
                </label>
                <input
                  id="filial"
                  name="filial"
                  type="text"
                  value={formData.filial}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:border-primary"
                  placeholder="Ej: Madrid"
                />
              </div>

              <div>
                <label htmlFor="fechaInicio" className="block text-sm font-semibold text-gray-700 mb-2">
                  Fecha de inicio
                </label>
                <input
                  id="fechaInicio"
                  name="fechaInicio"
                  type="date"
                  value={formData.fechaInicio}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label htmlFor="fechaFin" className="block text-sm font-semibold text-gray-700 mb-2">
                  Fecha de fin
                </label>
                <input
                  id="fechaFin"
                  name="fechaFin"
                  type="date"
                  value={formData.fechaFin}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:border-primary"
                />
              </div>

              <div>
                <label htmlFor="horasCodigo" className="block text-sm font-semibold text-gray-700 mb-2">
                  Horas codigo
                </label>
                <input
                  id="horasCodigo"
                  name="horasCodigo"
                  type="text"
                  value={formData.horasCodigo}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-200 rounded-lg focus:outline-none focus:border-primary"
                  placeholder="Ej: 120h"
                />
              </div>
            </div>
          </div>

          <div className="flex flex-col sm:flex-row sm:justify-end gap-3 pt-4 border-t">
            <button
              type="button"
              onClick={requestClose}
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
