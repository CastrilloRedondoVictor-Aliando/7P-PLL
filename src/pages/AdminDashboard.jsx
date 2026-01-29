import { useState } from 'react';
import { LogOut, Search, CheckCircle, XCircle, AlertCircle, BarChart3, Send, Plus } from 'lucide-react';
import Swal from 'sweetalert2';
import { useAuth } from '../hooks/useAuth';
import { formatDate, getEstadoColor } from '../utils/helpers';
import { MOCK_USERS } from '../data/mockData';
import CreateSolicitudModal from '../components/CreateSolicitudModal';

const AdminDashboard = () => {
  const { user, solicitudes, documentos, mensajes, logout, updateSolicitudEstado, sendMessage, createSolicitud } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterEstado, setFilterEstado] = useState('Todos');
  const [filterUsuario, setFilterUsuario] = useState('Todos');
  const [selectedSolicitud, setSelectedSolicitud] = useState(null);
  const [newMessage, setNewMessage] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Filtrar solicitudes
  const filteredSolicitudes = solicitudes.filter(s => {
    const matchesSearch = s.proyecto.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         s.comentarios.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterEstado === 'Todos' || s.estado === filterEstado;
    const matchesUser = filterUsuario === 'Todos' || s.usuarioID === parseInt(filterUsuario);
    return matchesSearch && matchesFilter && matchesUser;
  }).sort((a, b) => new Date(b.fechaCreacion) - new Date(a.fechaCreacion));

  // Estadísticas
  const stats = {
    total: solicitudes.length,
    pendientes: solicitudes.filter(s => s.estado === 'Pendiente de revisión').length,
    aceptadas: solicitudes.filter(s => s.estado === 'Aceptada').length,
    rechazadas: solicitudes.filter(s => s.estado === 'Rechazada').length,
  };

  const handleEstadoChange = (solicitudId, nuevoEstado) => {
    updateSolicitudEstado(solicitudId, nuevoEstado);
  };

  const getUserName = (userId) => {
    const foundUser = MOCK_USERS.find(u => u.id === userId);
    return foundUser ? foundUser.name : 'Usuario desconocido';
  };

  const solicitudDocumentos = selectedSolicitud
    ? documentos.filter(d => d.solicitudID === selectedSolicitud.id)
    : [];

  const solicitudMensajes = selectedSolicitud
    ? mensajes.filter(m => m.solicitudID === selectedSolicitud.id)
    : [];

  const handleLogout = async () => {
    const result = await Swal.fire({
      title: '¿Cerrar sesión?',
      text: '¿Estás seguro de que quieres cerrar sesión?',
      icon: 'question',
      showCancelButton: true,
      confirmButtonColor: '#1e40af',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Sí, cerrar sesión',
      cancelButtonText: 'Cancelar'
    });
    
    if (result.isConfirmed) {
      logout();
    }
  };

  const handleCreateSolicitud = (usuarioID, proyecto, comentarios) => {
    createSolicitud(usuarioID, proyecto, comentarios);
    const usuario = MOCK_USERS.find(u => u.id === usuarioID);
    Swal.fire({
      icon: 'success',
      title: '¡Solicitud creada!',
      text: `Solicitud creada exitosamente para ${usuario?.name || 'el usuario'}`,
      confirmButtonColor: '#1e40af',
      timer: 3000,
      showConfirmButton: false
    });
  };

  const handleSendMessage = () => {
    if (selectedSolicitud && newMessage.trim()) {
      sendMessage(selectedSolicitud.id, newMessage);
      setNewMessage('');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <header className="bg-primary text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold">7P-PLL</h1>
              <p className="text-blue-200 text-sm">Dashboard Administrativo</p>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="bg-white text-primary px-4 py-2 rounded-lg hover:bg-blue-50 transition-colors flex items-center space-x-2 font-semibold shadow-md"
              >
                <Plus className="w-5 h-5" />
                <span>Nueva Solicitud</span>
              </button>
              <div className="text-right">
                <p className="font-semibold">{user.name}</p>
                <p className="text-blue-200 text-sm">{user.email}</p>
              </div>
              <button
                onClick={handleLogout}
                className="bg-white bg-opacity-20 hover:bg-opacity-30 p-2 rounded-lg transition-colors"
                title="Cerrar sesión"
              >
                <LogOut className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Estadísticas */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Total Solicitudes</p>
                <p className="text-3xl font-bold text-gray-900">{stats.total}</p>
              </div>
              <BarChart3 className="w-12 h-12 text-primary opacity-20" />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Pendientes</p>
                <p className="text-3xl font-bold text-yellow-600">{stats.pendientes}</p>
              </div>
              <AlertCircle className="w-12 h-12 text-yellow-600 opacity-20" />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Aceptadas</p>
                <p className="text-3xl font-bold text-green-600">{stats.aceptadas}</p>
              </div>
              <CheckCircle className="w-12 h-12 text-green-600 opacity-20" />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Rechazadas</p>
                <p className="text-3xl font-bold text-red-600">{stats.rechazadas}</p>
              </div>
              <XCircle className="w-12 h-12 text-red-600 opacity-20" />
            </div>
          </div>
        </div>

        {/* Filtros */}
        <div className="bg-white rounded-xl shadow-md p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <select
              value={filterUsuario}
              onChange={(e) => setFilterUsuario(e.target.value)}
              className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-primary"
            >
              <option value="Todos">Todos los usuarios</option>
              {MOCK_USERS.filter(u => u.rol === 'user').map(u => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.email})
                </option>
              ))}
            </select>

            <select
              value={filterEstado}
              onChange={(e) => setFilterEstado(e.target.value)}
              className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-primary"
            >
              <option value="Todos">Todos los estados</option>
              <option value="Pendiente de revisión">Pendiente de revisión</option>
              <option value="Aceptada">Aceptada</option>
              <option value="Rechazada">Rechazada</option>
              <option value="Requiere más información">Requiere más información</option>
            </select>

            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar solicitudes..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-primary"
              />
            </div>
          </div>
        </div>

        {/* Tabla de Solicitudes */}
        <div className="bg-white rounded-xl shadow-md overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    ID
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Usuario
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Proyecto
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Estado
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Fecha
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Documentos
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {filteredSolicitudes.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="px-6 py-8 text-center text-gray-500">
                      No hay solicitudes
                    </td>
                  </tr>
                ) : (
                  filteredSolicitudes.map(solicitud => {
                    const estadoColors = getEstadoColor(solicitud.estado);
                    const numDocs = documentos.filter(d => d.solicitudID === solicitud.id).length;
                    
                    return (
                      <tr 
                        key={solicitud.id} 
                        className="hover:bg-gray-50 transition-colors cursor-pointer"
                        onClick={() => setSelectedSolicitud(solicitud)}
                      >
                        <td className="px-6 py-4 text-sm font-medium text-gray-900">
                          #{solicitud.id}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-900">
                          {getUserName(solicitud.usuarioID)}
                        </td>
                        <td className="px-6 py-4">
                          <div className="text-sm font-medium text-gray-900">{solicitud.proyecto}</div>
                          <div className="text-sm text-gray-500 truncate max-w-xs">
                            {solicitud.comentarios}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`px-3 py-1 text-xs font-semibold rounded-full ${estadoColors.bg} ${estadoColors.text}`}>
                            {solicitud.estado}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {formatDate(solicitud.fechaCreacion)}
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {numDocs} documento{numDocs !== 1 ? 's' : ''}
                        </td>
                        <td className="px-6 py-4">
                          <select
                            value={solicitud.estado}
                            onChange={(e) => {
                              e.stopPropagation();
                              handleEstadoChange(solicitud.id, e.target.value);
                            }}
                            className="text-sm px-2 py-1 border border-gray-200 rounded focus:outline-none focus:border-primary"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <option value="Pendiente de revisión">Pendiente</option>
                            <option value="Aceptada">Aceptar</option>
                            <option value="Rechazada">Rechazar</option>
                            <option value="Requiere más información">Más info</option>
                          </select>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Panel de detalle */}
        {selectedSolicitud && (
          <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="bg-primary text-white p-6 flex justify-between items-center">
                <div>
                  <h3 className="text-2xl font-bold">{selectedSolicitud.proyecto}</h3>
                  <p className="text-blue-200 text-sm">Usuario: {getUserName(selectedSolicitud.usuarioID)}</p>
                </div>
                <button
                  onClick={() => setSelectedSolicitud(null)}
                  className="text-white hover:bg-white hover:bg-opacity-20 p-2 rounded-lg transition-colors"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>

              <div className="p-6 space-y-6">
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Descripción</h4>
                  <p className="text-gray-700 bg-gray-50 p-4 rounded-lg">{selectedSolicitud.comentarios}</p>
                </div>

                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Documentos ({solicitudDocumentos.length})</h4>
                  <div className="space-y-2">
                    {solicitudDocumentos.length === 0 ? (
                      <p className="text-gray-500 text-center py-4 bg-gray-50 rounded-lg">No hay documentos</p>
                    ) : (
                      solicitudDocumentos.map(doc => (
                        <div key={doc.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                          <span className="text-sm text-gray-900">{doc.nombreArchivo}</span>
                          <span className="text-xs text-gray-500">{doc.tamaño}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Conversación ({solicitudMensajes.length})</h4>
                  <div className="bg-gray-50 rounded-lg p-4 mb-3 max-h-64 overflow-y-auto space-y-3">
                    {solicitudMensajes.length === 0 ? (
                      <p className="text-gray-500 text-center py-4">No hay mensajes</p>
                    ) : (
                      solicitudMensajes.map(mensaje => {
                        const isCurrentUser = mensaje.usuarioID === user.id;
                        return (
                          <div
                            key={mensaje.id}
                            className={`flex ${isCurrentUser ? 'justify-end' : 'justify-start'}`}
                          >
                            <div
                              className={`max-w-[70%] rounded-lg p-3 ${
                                isCurrentUser
                                  ? 'bg-primary text-white'
                                  : 'bg-white border border-gray-200'
                              }`}
                            >
                              <p className={`text-xs font-semibold mb-1 ${
                                isCurrentUser ? 'text-blue-200' : 'text-gray-600'
                              }`}>
                                {getUserName(mensaje.usuarioID)}
                              </p>
                              <p className="text-sm">{mensaje.contenido}</p>
                              <p className={`text-xs mt-1 ${
                                isCurrentUser ? 'text-blue-200' : 'text-gray-500'
                              }`}>
                                {formatDate(mensaje.fechaEnvio)}
                              </p>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                  
                  {/* Input para enviar mensajes */}
                  <div className="flex space-x-2">
                    <input
                      type="text"
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                      placeholder="Escribe un mensaje..."
                      className="flex-1 px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-primary"
                    />
                    <button
                      onClick={handleSendMessage}
                      disabled={!newMessage.trim()}
                      className="bg-primary text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                    >
                      <Send className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modal de crear solicitud */}
      <CreateSolicitudModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreate={handleCreateSolicitud}
      />
    </div>
  );
};

export default AdminDashboard;
