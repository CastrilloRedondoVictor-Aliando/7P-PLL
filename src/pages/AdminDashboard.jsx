import { useState, useEffect } from 'react';
import { LogOut, Search, CheckCircle, XCircle, AlertCircle, BarChart3, Send, Plus, Bell, Edit2, Check, X, FileText, Download } from 'lucide-react';
import Swal from 'sweetalert2';
import { useAuth } from '../hooks/useAuth';
import { formatDate, getEstadoColor } from '../utils/helpers';
import CreateSolicitudModal from '../components/CreateSolicitudModal';

const AdminDashboard = () => {
  const { user, solicitudes, documentos, mensajes, loading, logout, updateSolicitudEstado, updateSolicitudTitulo, sendMessage, createSolicitud, markMessagesAsRead, markDocsAsViewed, getUsers } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterEstado, setFilterEstado] = useState('Todos');
  const [filterUsuario, setFilterUsuario] = useState('Todos');
  const [selectedSolicitud, setSelectedSolicitud] = useState(null);
  const [newMessage, setNewMessage] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [showMessagesDropdown, setShowMessagesDropdown] = useState(false);
  const [showDocsDropdown, setShowDocsDropdown] = useState(false);
  const [editingTitulo, setEditingTitulo] = useState(false);
  const [nuevoTitulo, setNuevoTitulo] = useState('');
  const [usuarios, setUsuarios] = useState([]);

  // Cargar usuarios al montar el componente
  useEffect(() => {
    const loadUsers = async () => {
      try {
        const data = await getUsers();
        setUsuarios(data);
      } catch (error) {
        console.error('Error cargando usuarios:', error);
      }
    };
    loadUsers();
  }, [getUsers]);

  // Contar mensajes no leídos de usuarios
  const unreadMessages = mensajes.filter(m => {
    return m.rol === 'user' && !m.leido && m.usuarioID !== user.id;
  }).length;

  // Obtener solicitudes con mensajes sin leer
  const solicitudesWithUnreadMessages = solicitudes.filter(s => {
    const hasUnreadMessages = mensajes.some(m => 
      m.solicitudID === s.id && 
      !m.leido && 
      m.usuarioID !== user.id &&
      m.rol === 'user'
    );
    return hasUnreadMessages;
  });

  // Obtener solicitudes con documentos no vistos
  const solicitudesWithNewDocs = solicitudes.filter(s => {
    const unseenDocs = documentos.filter(d => 
      d.solicitudID === s.id && !d.vistoPorAdmin
    );
    return unseenDocs.length > 0;
  });
  
  const newDocsCount = documentos.filter(d => !d.vistoPorAdmin).length;

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
    pendientes: solicitudes.filter(s => s.estado === 'Pendiente').length,
    enProceso: solicitudes.filter(s => s.estado === 'En Proceso').length,
    completadas: solicitudes.filter(s => s.estado === 'Aceptada').length,
    rechazadas: solicitudes.filter(s => s.estado === 'Rechazada').length,
  };

  const handleEstadoChange = (solicitudId, nuevoEstado) => {
    updateSolicitudEstado(solicitudId, nuevoEstado);
  };

  const getUserName = (userId) => {
    const usuario = usuarios.find(u => u.id === userId);
    if (usuario) return usuario.nombre;
    
    // Fallback: buscar en solicitudes
    const solicitud = solicitudes.find(s => s.usuarioID === userId);
    return solicitud?.usuarioNombre || 'Usuario desconocido';
  };

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

  const handleCreateSolicitud = async (usuarioID, proyecto, comentarios) => {
    const newSolicitud = await createSolicitud(usuarioID, proyecto, comentarios);
    Swal.fire({
      icon: 'success',
      title: '¡Solicitud creada!',
      text: `Solicitud creada exitosamente para ${newSolicitud?.usuarioNombre || 'el usuario'}`,
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

  const handleEditTitulo = () => {
    setNuevoTitulo(selectedSolicitud.proyecto);
    setEditingTitulo(true);
  };

  const handleSaveTitulo = async () => {
    if (nuevoTitulo.trim() && nuevoTitulo !== selectedSolicitud.proyecto) {
      await updateSolicitudTitulo(selectedSolicitud.id, nuevoTitulo.trim());
      setSelectedSolicitud(prev => ({ ...prev, proyecto: nuevoTitulo.trim() }));
    }
    setEditingTitulo(false);
  };

  const handleCancelEditTitulo = () => {
    setEditingTitulo(false);
    setNuevoTitulo('');
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-primary mx-auto mb-4"></div>
          <p className="text-gray-600 text-lg">Cargando datos...</p>
        </div>
      </div>
    );
  }

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
              
              {/* Badge de mensajes no leídos */}
              <div className="relative">
                <button 
                  onClick={() => {
                    setShowMessagesDropdown(!showMessagesDropdown);
                    setShowDocsDropdown(false);
                  }}
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
                
                {/* Dropdown de mensajes */}
                {showMessagesDropdown && (
                  <div className="absolute right-0 top-12 w-80 bg-white rounded-lg shadow-xl border border-gray-200 z-50 max-h-96 overflow-y-auto">
                    <div className="p-3 border-b border-gray-200 bg-gray-50">
                      <h3 className="font-semibold text-gray-900">Mensajes sin leer ({unreadMessages})</h3>
                    </div>
                    {solicitudesWithUnreadMessages.length === 0 ? (
                      <p className="text-gray-500 text-center py-6 text-sm">No hay mensajes nuevos</p>
                    ) : (
                      solicitudesWithUnreadMessages.map(sol => {
                        const unreadCount = mensajes.filter(m => {
                          return m.solicitudID === sol.id && 
                            !m.leido && 
                            m.rol === 'user';
                        }).length;
                        return (
                          <div
                            key={sol.id}
                            onClick={() => {
                              setSelectedSolicitud(sol);
                              setShowMessagesDropdown(false);
                            }}
                            className="p-3 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                          >
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <p className="font-medium text-gray-900 text-sm">{sol.proyecto}</p>
                                <p className="text-xs text-gray-600 mt-1">{sol.usuarioNombre}</p>
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
              
              {/* Badge de documentos nuevos */}
              <div className="relative">
                <button 
                  onClick={() => {
                    setShowDocsDropdown(!showDocsDropdown);
                    setShowMessagesDropdown(false);
                  }}
                  className="bg-white bg-opacity-20 hover:bg-opacity-30 p-2 rounded-lg transition-colors" 
                  title="Documentos nuevos (24h)"
                >
                  <AlertCircle className="w-5 h-5" />
                </button>
                {newDocsCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-orange-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                    {newDocsCount}
                  </span>
                )}
                
                {/* Dropdown de documentos */}
                {showDocsDropdown && (
                  <div className="absolute right-0 top-12 w-80 bg-white rounded-lg shadow-xl border border-gray-200 z-50 max-h-96 overflow-y-auto">
                    <div className="p-3 border-b border-gray-200 bg-gray-50">
                      <h3 className="font-semibold text-gray-900">Documentos recientes ({newDocsCount})</h3>
                    </div>
                    {solicitudesWithNewDocs.length === 0 ? (
                      <p className="text-gray-500 text-center py-6 text-sm">No hay documentos nuevos</p>
                    ) : (
                      solicitudesWithNewDocs.map(sol => {
                        const recentDocs = documentos.filter(d => 
                          d.solicitudID === sol.id && !d.vistoPorAdmin
                        );

                        return (
                          <div
                            key={sol.id}
                            onClick={() => {
                              setSelectedSolicitud(sol);
                              markDocsAsViewed(sol.id);
                              setShowDocsDropdown(false);
                            }}
                            className="p-3 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-b-0"
                          >
                            <div className="flex justify-between items-start">
                              <div className="flex-1">
                                <p className="font-medium text-gray-900 text-sm">{sol.proyecto}</p>
                                <p className="text-xs text-gray-600 mt-1">{sol.usuarioNombre}</p>
                                <p className="text-xs text-gray-500 mt-1">{recentDocs.length} documento{recentDocs.length !== 1 ? 's' : ''} nuevo{recentDocs.length !== 1 ? 's' : ''}</p>
                              </div>
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
                <p className="text-gray-600 text-sm">En Proceso</p>
                <p className="text-3xl font-bold text-blue-600">{stats.enProceso}</p>
              </div>
              <AlertCircle className="w-12 h-12 text-blue-600 opacity-20" />
            </div>
          </div>

          <div className="bg-white rounded-xl shadow-md p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-gray-600 text-sm">Aceptadas</p>
                <p className="text-3xl font-bold text-green-600">{stats.completadas}</p>
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
              {solicitudes
                .map(s => ({ id: s.usuarioID, nombre: s.usuarioNombre, email: s.usuarioEmail }))
                .filter((user, index, self) => 
                  index === self.findIndex(u => u.id === user.id)
                )
                .map(u => (
                  <option key={u.id} value={u.id}>
                    {u.nombre} ({u.email})
                  </option>
                ))}
            </select>

            <select
              value={filterEstado}
              onChange={(e) => setFilterEstado(e.target.value)}
              className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-primary"
            >
              <option value="Todos">Todos los estados</option>
              <option value="Pendiente">Pendiente</option>
              <option value="En Proceso">En Proceso</option>
              <option value="Aceptada">Aceptada</option>
              <option value="Rechazada">Rechazada</option>
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
                    Cargo
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
                    <td colSpan="8" className="px-6 py-8 text-center text-gray-500">
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
                        <td className="px-6 py-4 text-sm text-gray-600">
                          {solicitud.cargo || '-'}
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
                            <option value="Pendiente">Pendiente</option>
                            <option value="En Proceso">En Proceso</option>
                            <option value="Aceptada">Aceptada</option>
                            <option value="Rechazada">Rechazada</option>
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
                <div className="flex-1">
                  {editingTitulo ? (
                    <div className="flex items-center space-x-2">
                      <input
                        type="text"
                        value={nuevoTitulo}
                        onChange={(e) => setNuevoTitulo(e.target.value)}
                        className="flex-1 px-3 py-2 text-gray-900 rounded-lg focus:outline-none"
                        autoFocus
                        onKeyPress={(e) => e.key === 'Enter' && handleSaveTitulo()}
                      />
                      <button
                        onClick={handleSaveTitulo}
                        className="bg-white text-primary hover:bg-blue-50 p-2 rounded-lg transition-colors shadow-sm"
                        title="Guardar"
                      >
                        <Check className="w-5 h-5" />
                      </button>
                      <button
                        onClick={handleCancelEditTitulo}
                        className="bg-white bg-opacity-20 hover:bg-opacity-30 p-2 rounded-lg transition-colors"
                        title="Cancelar"
                      >
                        <X className="w-5 h-5" />
                      </button>
                    </div>
                  ) : (
                    <div className="flex items-center space-x-2">
                      <h3 className="text-2xl font-bold">{selectedSolicitud.proyecto}</h3>
                      <button
                        onClick={handleEditTitulo}
                        className="hover:bg-white hover:bg-opacity-20 p-2 rounded-lg transition-colors"
                        title="Editar título"
                      >
                        <Edit2 className="w-5 h-5" />
                      </button>
                    </div>
                  )}
                  <p className="text-blue-200 text-sm">Usuario: {getUserName(selectedSolicitud.usuarioID)}</p>
                </div>
                <button
                  onClick={() => {
                    setSelectedSolicitud(null);
                    setEditingTitulo(false);
                  }}
                  className="text-white hover:bg-white hover:bg-opacity-20 p-2 rounded-lg transition-colors"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>

              <div className="p-6 space-y-6">
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Principales funciones realizadas</h4>
                  <p className="text-gray-700 bg-gray-50 p-4 rounded-lg">{selectedSolicitud.comentarios}</p>
                </div>

                <div>
                  <h4 className="font-semibold text-gray-900 mb-3">Documentos ({solicitudDocumentos.length})</h4>
                  <div className="space-y-6">
                    {/* Principales funciones */}
                    <div>
                      <div className="flex items-center space-x-2 mb-2">
                        <FileText className="w-5 h-5 text-primary" />
                        <h5 className="text-sm font-semibold text-gray-900">Principales funciones</h5>
                      </div>
                      <div className="space-y-2">
                        {solicitudDocumentos.filter(doc => doc.categoria === 'General').length === 0 ? (
                          <p className="text-gray-500 text-xs py-2 pl-7">No hay documentos en esta categoría</p>
                        ) : (
                          solicitudDocumentos.filter(doc => doc.categoria === 'General').map(doc => (
                            <div key={doc.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                              <div className="flex items-center space-x-2 flex-1 min-w-0">
                                <FileText className="w-4 h-4 text-primary flex-shrink-0" />
                                <span className="text-sm font-normal italic text-gray-600 truncate">{doc.nombre}</span>
                              </div>
                              <a
                                href={doc.url}
                                className="flex-shrink-0 text-primary hover:text-blue-700 p-1 rounded transition-colors"
                                title="Descargar"
                              >
                                <Download className="w-4 h-4" />
                              </a>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    {/* Vuelos */}
                    <div>
                      <div className="flex items-center space-x-2 mb-2">
                        <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M12 5l7 7-7 7" />
                        </svg>
                        <h5 className="text-sm font-semibold text-gray-900">Vuelos</h5>
                      </div>
                      <div className="space-y-2">
                        {solicitudDocumentos.filter(doc => doc.categoria === 'Vuelos').length === 0 ? (
                          <p className="text-gray-500 text-xs py-2 pl-7">No hay documentos en esta categoría</p>
                        ) : (
                          solicitudDocumentos.filter(doc => doc.categoria === 'Vuelos').map(doc => (
                            <div key={doc.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                              <div className="flex items-center space-x-2 flex-1 min-w-0">
                                <FileText className="w-4 h-4 text-primary flex-shrink-0" />
                                <span className="text-sm font-normal italic text-gray-600 truncate">{doc.nombre}</span>
                              </div>
                              <a
                                href={doc.url}
                                className="flex-shrink-0 text-primary hover:text-blue-700 p-1 rounded transition-colors"
                                title="Descargar"
                              >
                                <Download className="w-4 h-4" />
                              </a>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    {/* Hoteles */}
                    <div>
                      <div className="flex items-center space-x-2 mb-2">
                        <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                        <h5 className="text-sm font-semibold text-gray-900">Hoteles</h5>
                      </div>
                      <div className="space-y-2">
                        {solicitudDocumentos.filter(doc => doc.categoria === 'Hoteles').length === 0 ? (
                          <p className="text-gray-500 text-xs py-2 pl-7">No hay documentos en esta categoría</p>
                        ) : (
                          solicitudDocumentos.filter(doc => doc.categoria === 'Hoteles').map(doc => (
                            <div key={doc.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                              <div className="flex items-center space-x-2 flex-1 min-w-0">
                                <FileText className="w-4 h-4 text-primary flex-shrink-0" />
                                <span className="text-sm font-normal italic text-gray-600 truncate">{doc.nombre}</span>
                              </div>
                              <a
                                href={doc.url}
                                className="flex-shrink-0 text-primary hover:text-blue-700 p-1 rounded transition-colors"
                                title="Descargar"
                              >
                                <Download className="w-4 h-4" />
                              </a>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
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
