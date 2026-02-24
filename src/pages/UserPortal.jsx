import { useState, useEffect, useRef } from 'react';
import { LogOut, Search, Bell, X } from 'lucide-react';
import Swal from 'sweetalert2';
import { useAuth } from '../hooks/useAuth';
import SolicitudCard from '../components/SolicitudCard';
import SolicitudDetail from '../components/SolicitudDetail';

const UserPortal = () => {
  const { user, solicitudes, documentos, mensajes, logout, uploadDocument, sendMessage, createSolicitud, markMessagesAsRead, updateSolicitudDescripcion, signalRConnection } = useAuth();
  const [selectedSolicitud, setSelectedSolicitud] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterEstado, setFilterEstado] = useState('Todos');
  const [showNotificationsDropdown, setShowNotificationsDropdown] = useState(false);
  const [isNotificationsDropdownClosing, setIsNotificationsDropdownClosing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isDetailClosing, setIsDetailClosing] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const notificationsButtonRef = useRef(null);
  const notificationsDropdownRef = useRef(null);
  const itemsPerPage = 10;

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

  const totalPages = Math.max(1, Math.ceil(filteredSolicitudes.length / itemsPerPage));
  const pagedSolicitudes = filteredSolicitudes.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

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

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 1023px)');
    const handleChange = (event) => setIsMobile(event.matches);
    setIsMobile(mediaQuery.matches);
    if (mediaQuery.addEventListener) {
      mediaQuery.addEventListener('change', handleChange);
      return () => mediaQuery.removeEventListener('change', handleChange);
    }
    mediaQuery.addListener(handleChange);
    return () => mediaQuery.removeListener(handleChange);
  }, []);

  useEffect(() => {
    if (!isMobile) return;
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = isDetailOpen ? 'hidden' : previousOverflow;
    return () => {
      document.body.style.overflow = previousOverflow;
    };
  }, [isDetailOpen, isMobile]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterEstado, userSolicitudes.length]);

  useEffect(() => {
    if (!showNotificationsDropdown) return;

    const handleOutsideClick = (event) => {
      const target = event.target;
      const isInside = notificationsDropdownRef.current?.contains(target) ||
        notificationsButtonRef.current?.contains(target);
      if (!isInside) {
        closeNotificationsDropdown();
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [showNotificationsDropdown]);

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

  const handleUploadDocument = (file, categoria) => {
    if (selectedSolicitud) {
      uploadDocument(selectedSolicitud.id, file, categoria);
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

  const handleSelectSolicitud = (solicitud) => {
    setSelectedSolicitud(solicitud);
    if (isMobile) {
      setIsDetailClosing(false);
      setIsDetailOpen(true);
    }
  };

  const handleCloseDetail = () => {
    if (isDetailClosing) return;
    setIsDetailClosing(true);
    setTimeout(() => {
      setIsDetailOpen(false);
      setIsDetailClosing(false);
    }, 180);
  };


  const openNotificationsDropdown = () => {
    setShowNotificationsDropdown(true);
    setIsNotificationsDropdownClosing(false);
  };

  const closeNotificationsDropdown = () => {
    if (!showNotificationsDropdown || isNotificationsDropdownClosing) return;
    setIsNotificationsDropdownClosing(true);
    setTimeout(() => {
      setShowNotificationsDropdown(false);
      setIsNotificationsDropdownClosing(false);
    }, 160);
  };

  const toggleNotificationsDropdown = () => {
    if (showNotificationsDropdown && !isNotificationsDropdownClosing) {
      closeNotificationsDropdown();
    } else {
      openNotificationsDropdown();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <header className="bg-primary text-white shadow-lg">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-center">
            <div>
              <h1 className="text-2xl font-bold">7P-PLL</h1>
              <p className="text-blue-200 text-sm">Portal de Usuario</p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end sm:space-x-4">
              <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                {/* Badge de mensajes no leídos (solo escritorio) */}
                <div className="relative hidden xl:block">
                  <button 
                    ref={notificationsButtonRef}
                    onClick={toggleNotificationsDropdown}
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
                    <div
                      ref={notificationsDropdownRef}
                      className={`absolute right-0 top-12 w-80 bg-white rounded-lg shadow-xl border border-gray-200 z-50 max-h-96 overflow-y-auto ${
                        isNotificationsDropdownClosing ? 'animate-fade-out' : 'animate-fade-in'
                      }`}
                    >
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
              </div>

              <div className="flex items-center justify-between gap-3 sm:justify-start w-full sm:w-auto">
                <div className="text-left sm:text-right min-w-0">
                  <p className="font-semibold">{user.name}</p>
                  <p className="text-blue-200 text-sm break-all sm:break-normal max-w-[70vw] sm:max-w-none">
                    {user.email}
                  </p>
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
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Panel de Solicitudes */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-xl shadow-lg p-4 sm:p-6">
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
                <option value="Documentación pendiente">Documentación pendiente</option>
                <option value="Aceptada">Aceptada</option>
                <option value="Rechazada">Rechazada</option>
              </select>

              {/* Lista de Solicitudes */}
              <div className="space-y-3 animate-fade-in-up" key={`user-page-${currentPage}`}>
                {filteredSolicitudes.length === 0 ? (
                  <p className="text-gray-500 text-center py-8">No hay solicitudes</p>
                ) : (
                  pagedSolicitudes.map(solicitud => (
                    <SolicitudCard
                      key={solicitud.id}
                      solicitud={solicitud}
                      isSelected={selectedSolicitud?.id === solicitud.id}
                      onClick={() => handleSelectSolicitud(solicitud)}
                    />
                  ))
                )}
              </div>

              {filteredSolicitudes.length > itemsPerPage && (
                <div className="mt-4 flex items-center justify-between text-sm">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                    disabled={currentPage === 1}
                    className="px-4 py-2 rounded-lg border border-gray-200 bg-white text-gray-700 font-medium shadow-sm transition-colors hover:border-primary hover:text-primary hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-100"
                  >
                    Anterior
                  </button>
                  <span className="text-gray-600">
                    Pagina {currentPage} de {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                    disabled={currentPage === totalPages}
                    className="px-4 py-2 rounded-lg border border-gray-200 bg-white text-gray-700 font-medium shadow-sm transition-colors hover:border-primary hover:text-primary hover:bg-blue-50 disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-gray-100"
                  >
                    Siguiente
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Panel de Detalle (escritorio) */}
          <div className="lg:col-span-2 hidden lg:block">
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
                signalRConnection={signalRConnection}
              />
            ) : (
              <div className="bg-white rounded-xl shadow-lg p-8 sm:p-12 text-center">
                <div className="text-gray-400">
                  <Search className="w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-4 opacity-50" />
                  <p className="text-lg">Selecciona una solicitud para ver los detalles</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Detalle como popup (responsive móvil) */}
      {isMobile && isDetailOpen && selectedSolicitud && (
        <div
          className={`fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black p-3 sm:p-6 lg:hidden ${
            isDetailClosing ? 'bg-opacity-0' : 'bg-opacity-40'
          } transition-opacity duration-150`}
          onClick={handleCloseDetail}
        >
          <div
            className={`w-full max-w-3xl bg-white rounded-2xl shadow-2xl overflow-hidden ${
              isDetailClosing ? 'animate-pop-out' : 'animate-pop-in'
            }`}
            onClick={(event) => event.stopPropagation()}
          >
            <div className="max-h-[85vh] overflow-y-auto">
              <SolicitudDetail
                solicitud={selectedSolicitud}
                documentos={solicitudDocumentos}
                mensajes={solicitudMensajes}
                onUploadDocument={handleUploadDocument}
                onSendMessage={handleSendMessage}
                onUpdateDescripcion={handleUpdateDescripcion}
                currentUserId={user.id}
                isUserView={true}
                signalRConnection={signalRConnection}
                showCloseButton={true}
                onClose={handleCloseDetail}
              />
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default UserPortal;
