import { useState, useEffect } from 'react';
import { LogOut, Search, Plus, Bell } from 'lucide-react';
import Swal from 'sweetalert2';
import { useAuth } from '../hooks/useAuth';
import SolicitudCard from '../components/SolicitudCard';
import SolicitudDetail from '../components/SolicitudDetail';
import CreateSolicitudModalUser from '../components/CreateSolicitudModalUser';

const UserPortal = () => {
  const { user, solicitudes, documentos, mensajes, logout, uploadDocument, sendMessage, createSolicitud, markMessagesAsRead, updateSolicitudDescripcion } = useAuth();
  const [selectedSolicitud, setSelectedSolicitud] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterEstado, setFilterEstado] = useState('Todos');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [showNotificationsDropdown, setShowNotificationsDropdown] = useState(false);

  // Filtrar solicitudes del usuario actual
  const userSolicitudes = solicitudes.filter(s => s.usuarioID === user.id);

  // Contar mensajes no leídos
  const unreadMessages = mensajes.filter(m => {
    const solicitud = solicitudes.find(s => s.id === m.solicitudID);
    return solicitud?.usuarioID === user.id && !m.leido && m.usuarioID !== user.id;
  }).length;

  // Solicitudes con mensajes sin leer
  const solicitudesWithUnreadMessages = userSolicitudes.filter(sol => {
    const hasUnread = mensajes.some(m => 
      m.solicitudID === sol.id && !m.leido && m.usuarioID !== user.id
    );
    return hasUnread;
  });

  // Aplicar búsqueda y filtros
  const filteredSolicitudes = userSolicitudes.filter(s => {
    const matchesSearch = s.proyecto.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         s.comentarios.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesFilter = filterEstado === 'Todos' || s.estado === filterEstado;
    return matchesSearch && matchesFilter;
  }).sort((a, b) => new Date(b.fechaCreacion) - new Date(a.fechaCreacion));

  // Documentos y mensajes de la solicitud seleccionada
  const solicitudDocumentos = selectedSolicitud 
    ? documentos.filter(d => d.solicitudID === selectedSolicitud.id)
    : [];
    
  const solicitudMensajes = selectedSolicitud
    ? mensajes.filter(m => m.solicitudID === selectedSolicitud.id)
    : [];

  useEffect(() => {
    if (selectedSolicitud) {
      markMessagesAsRead(selectedSolicitud.id);
    }
  }, [selectedSolicitud, markMessagesAsRead]);

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

  const handleUploadDocument = (file) => {
    if (selectedSolicitud) {
      uploadDocument(selectedSolicitud.id, file);
    }
  };

  const handleSendMessage = (contenido) => {
    if (selectedSolicitud && contenido.trim()) {
      sendMessage(selectedSolicitud.id, contenido);
    }
  };

  const handleUpdateDescripcion = async (solicitudId, nuevaDescripcion) => {
    await updateSolicitudDescripcion(solicitudId, nuevaDescripcion);
    // Actualizar la solicitud seleccionada con la nueva descripción
    setSelectedSolicitud(prev => ({
      ...prev,
      comentarios: nuevaDescripcion
    }));
  };

  const handleCreateSolicitud = (proyecto, comentarios) => {
    createSolicitud(user.id, proyecto, comentarios);
    Swal.fire({
      icon: 'success',
      title: '¡Solicitud creada!',
      text: 'Tu solicitud ha sido enviada correctamente. Recibirás una respuesta pronto.',
      confirmButtonColor: '#1e40af',
      timer: 3000,
      showConfirmButton: false
    });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <header className="bg-primary text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-2xl font-bold">7P-PLL</h1>
              <p className="text-blue-200 text-sm">Portal de Usuario</p>
            </div>
            <div className="flex items-center space-x-4">
              <button
                onClick={() => setIsCreateModalOpen(true)}
                className="bg-white text-primary px-4 py-2 rounded-lg hover:bg-blue-50 transition-colors flex items-center space-x-2 font-semibold shadow-md"
              >
                <Plus className="w-5 h-5" />
                <span>Nueva Solicitud</span>
              </button>
              
              {/* Badge de notificaciones */}
              <div className="relative">
                <button 
                  onClick={() => setShowNotificationsDropdown(!showNotificationsDropdown)}
                  className="bg-white bg-opacity-20 hover:bg-opacity-30 p-2 rounded-lg transition-colors"
                  title="Mensajes sin leer"
                >
                  <Bell className="w-5 h-5" />
                </button>
                {unreadMessages > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                    {unreadMessages}
                  </span>
                )}
                
                {/* Dropdown de notificaciones */}
                {showNotificationsDropdown && (
                  <div className="absolute right-0 top-12 w-80 bg-white rounded-lg shadow-xl border border-gray-200 z-50 max-h-96 overflow-y-auto">
                    <div className="p-3 border-b border-gray-200 bg-gray-50">
                      <h3 className="font-semibold text-gray-900">Mensajes sin leer ({unreadMessages})</h3>
                    </div>
                    {solicitudesWithUnreadMessages.length === 0 ? (
                      <p className="text-gray-500 text-center py-6 text-sm">No hay mensajes nuevos</p>
                    ) : (
                      solicitudesWithUnreadMessages.map(sol => {
                        const unreadCount = mensajes.filter(m => 
                          m.solicitudID === sol.id && !m.leido && m.usuarioID !== user.id
                        ).length;
                        return (
                          <div
                            key={sol.id}
                            onClick={() => {
                              setSelectedSolicitud(sol);
                              setShowNotificationsDropdown(false);
                            }}
                            className="p-3 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                          >
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <p className="font-medium text-gray-900 text-sm">{sol.proyecto}</p>
                                <p className="text-xs text-gray-600 mt-1">Estado: {sol.estado}</p>
                              </div>
                              <span className="bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center ml-2">
                                {unreadCount}
                              </span>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                )}
              </div>
              
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
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Panel de Solicitudes */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-lg p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Mis Solicitudes</h2>
              
              {/* Búsqueda */}
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar solicitudes..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-primary"
                />
              </div>

              {/* Filtro de Estado */}
              <select
                value={filterEstado}
                onChange={(e) => setFilterEstado(e.target.value)}
                className="w-full mb-4 px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-primary"
              >
                <option value="Todos">Todos los estados</option>
                <option value="Pendiente">Pendiente</option>
                <option value="En Proceso">En Proceso</option>
                <option value="Aceptada">Aceptada</option>
                <option value="Rechazada">Rechazada</option>
              </select>

              {/* Lista de Solicitudes */}
              <div className="space-y-3 max-h-[600px] overflow-y-auto">
                {filteredSolicitudes.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No hay solicitudes</p>
                ) : (
                  filteredSolicitudes.map(solicitud => (
                    <SolicitudCard
                      key={solicitud.id}
                      solicitud={solicitud}
                      isSelected={selectedSolicitud?.id === solicitud.id}
                      onClick={() => setSelectedSolicitud(solicitud)}
                    />
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Panel de Detalle */}
          <div className="lg:col-span-2">
            {selectedSolicitud ? (
              <SolicitudDetail
                solicitud={selectedSolicitud}
                documentos={solicitudDocumentos}
                mensajes={solicitudMensajes}
                onUploadDocument={handleUploadDocument}
                onSendMessage={handleSendMessage}
                onUpdateDescripcion={handleUpdateDescripcion}
                currentUserId={user.id}
                isUserView={true}
              />
            ) : (
              <div className="bg-white rounded-xl shadow-lg p-12 text-center">
                <div className="text-gray-400">
                  <Search className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p className="text-lg">Selecciona una solicitud para ver los detalles</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Modal de creación */}
      <CreateSolicitudModalUser
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onCreate={handleCreateSolicitud}
      />
    </div>
  );
};

export default UserPortal;
