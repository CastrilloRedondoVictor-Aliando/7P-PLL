import { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { LogOut, Search, CheckCircle, XCircle, AlertCircle, Clock, Layers, Send, Plus, Bell, Edit2, Check, X, FileText, Download, ChevronDown, Trash2, MapPin, Building2, Calendar } from 'lucide-react';
import Swal from 'sweetalert2';
import { useAuth } from '../hooks/useAuth';
import { apiRequest } from '../config/api';
import { formatDate, getEstadoColor } from '../utils/helpers';
import CreateSolicitudModal from '../components/CreateSolicitudModal';

const AdminDashboard = () => {
  const { user, solicitudes, documentos, mensajes, loading, logout, updateSolicitudEstado, updateSolicitudTitulo, sendMessage, createSolicitud, markMessagesAsRead, markDocsAsViewed, getUsers, getDocumentDownloadUrl, deleteDocument, getAccessToken } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterEstado, setFilterEstado] = useState('Todos');
  const [filterUsuario, setFilterUsuario] = useState('Todos');
  const [filterFecha, setFilterFecha] = useState('');
  const [selectedSolicitud, setSelectedSolicitud] = useState(null);
  const [newMessage, setNewMessage] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [showMessagesDropdown, setShowMessagesDropdown] = useState(false);
  const [showDocsDropdown, setShowDocsDropdown] = useState(false);
  const [editingTitulo, setEditingTitulo] = useState(false);
  const [nuevoTitulo, setNuevoTitulo] = useState('');
  const [usuarios, setUsuarios] = useState([]);
  const messagesContainerRef = useRef(null);
  const [isClosingDetail, setIsClosingDetail] = useState(false);
  const [isSendBouncing, setIsSendBouncing] = useState(false);
  const [isMessagesDropdownClosing, setIsMessagesDropdownClosing] = useState(false);
  const [isDocsDropdownClosing, setIsDocsDropdownClosing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [openEstadoId, setOpenEstadoId] = useState(null);
  const messagesButtonRef = useRef(null);
  const messagesDropdownRef = useRef(null);
  const docsButtonRef = useRef(null);
  const docsDropdownRef = useRef(null);
  const joinedGroupsRef = useRef(new Set());
  const itemsPerPage = 10;

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
    const targetDate = filterFecha ? new Date(filterFecha) : null;
    if (targetDate) {
      targetDate.setHours(0, 0, 0, 0);
    }
    const startDate = s.fechaInicio ? new Date(s.fechaInicio) : null;
    const endDate = s.fechaFin ? new Date(s.fechaFin) : null;
    if (startDate) startDate.setHours(0, 0, 0, 0);
    if (endDate) endDate.setHours(0, 0, 0, 0);
    const matchesDate = !targetDate || (startDate && endDate && startDate <= targetDate && endDate >= targetDate);

    return matchesSearch && matchesFilter && matchesUser && matchesDate;
  }).sort((a, b) => new Date(b.fechaCreacion) - new Date(a.fechaCreacion));

  const totalPages = Math.max(1, Math.ceil(filteredSolicitudes.length / itemsPerPage));
  const showPagination = filteredSolicitudes.length > itemsPerPage;
  const pagedSolicitudes = filteredSolicitudes.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Estadísticas
  const stats = {
    total: solicitudes.length,
    pendientes: solicitudes.filter(s => s.estado === 'Pendiente').length,
    enProceso: solicitudes.filter(s => s.estado === 'Documentación pendiente').length,
    completadas: solicitudes.filter(s => s.estado === 'Aceptada').length,
    rechazadas: solicitudes.filter(s => s.estado === 'Rechazada').length,
  };

  const estadoFiltroStyles = {
    Todos: { hover: 'hover:bg-blue-50', selected: 'bg-blue-50 ring-1 ring-blue-100' },
    Pendiente: { hover: 'hover:bg-yellow-50', selected: 'bg-yellow-50 ring-1 ring-yellow-100' },
    'Documentación pendiente': { hover: 'hover:bg-blue-50', selected: 'bg-blue-50 ring-1 ring-blue-100' },
    Aceptada: { hover: 'hover:bg-green-50', selected: 'bg-green-50 ring-1 ring-green-100' },
    Rechazada: { hover: 'hover:bg-red-50', selected: 'bg-red-50 ring-1 ring-red-100' }
  };

  const usuariosParaFiltro = (usuarios && usuarios.length > 0)
    ? usuarios.filter(u => u.rol === 'user')
    : solicitudes.map(s => ({
        id: s.usuarioID,
        nombre: s.usuarioNombre,
        email: s.usuarioEmail
      }));

  const handleEstadoChange = (solicitudId, nuevoEstado) => {
    updateSolicitudEstado(solicitudId, nuevoEstado);
  };

  const estadosDisponibles = ['Pendiente', 'Documentación pendiente', 'Aceptada', 'Rechazada'];

  const renderEstadoSelector = (solicitud) => {
    const estadoColors = getEstadoColor(solicitud.estado);
    const isOpen = openEstadoId === solicitud.id;
    const estadoItemStyles = {
      Pendiente: 'hover:bg-yellow-50',
      'Documentación pendiente': 'hover:bg-blue-50',
      Aceptada: 'hover:bg-green-50',
      Rechazada: 'hover:bg-red-50'
    };
    const estadoSelectedStyles = {
      Pendiente: 'bg-yellow-50 text-yellow-700',
      'Documentación pendiente': 'bg-blue-50 text-blue-700',
      Aceptada: 'bg-green-50 text-green-700',
      Rechazada: 'bg-red-50 text-red-700'
    };

    return (
      <div className="relative inline-flex" onClick={(e) => e.stopPropagation()}>
        <button
          type="button"
          data-estado-trigger="true"
          onClick={() => setOpenEstadoId(prev => (prev === solicitud.id ? null : solicitud.id))}
          className={`px-3 py-1 text-xs font-semibold rounded-full whitespace-nowrap inline-flex items-center gap-1 ${estadoColors.bg} ${estadoColors.text} hover:opacity-90 transition-opacity ring-1 ring-transparent hover:ring-primary/30`}
          aria-haspopup="menu"
          aria-expanded={isOpen}
        >
          <span>{solicitud.estado}</span>
          <ChevronDown className="w-3.5 h-3.5 opacity-70" />
        </button>
        {isOpen && (
          <div
            data-estado-menu="true"
            className="absolute right-0 top-full mt-2 w-40 bg-white border border-gray-200 rounded-lg shadow-lg z-50 animate-pop-in"
          >
            {estadosDisponibles.map(estado => (
              <button
                key={estado}
                type="button"
                onClick={() => {
                  handleEstadoChange(solicitud.id, estado);
                  setOpenEstadoId(null);
                }}
                className={`w-full text-left px-3 py-2 text-sm ${estadoItemStyles[estado] || 'hover:bg-gray-50'} ${estado === solicitud.estado ? `font-semibold ${estadoSelectedStyles[estado] || 'bg-gray-50 text-gray-700'}` : 'text-gray-700'}`}
              >
                {estado}
              </button>
            ))}
          </div>
        )}
      </div>
    );
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

  useLayoutEffect(() => {
    if (!messagesContainerRef.current) return;
    const container = messagesContainerRef.current;
    const rafId = requestAnimationFrame(() => {
      container.scrollTop = container.scrollHeight;
    });
    return () => cancelAnimationFrame(rafId);
  }, [solicitudMensajes.length, selectedSolicitud?.id]);

  useEffect(() => {
    if (selectedSolicitud) {
      markMessagesAsRead(selectedSolicitud.id);
    }
  }, [selectedSolicitud, markMessagesAsRead]);

  useEffect(() => {
    const joinAllGroups = async () => {
      if (!solicitudes.length) return;
      try {
        const token = await getAccessToken();
        const joinPromises = solicitudes.map(async (sol) => {
          if (joinedGroupsRef.current.has(sol.id)) return;
          await apiRequest('/signalr/join-group', {
            method: 'POST',
            body: JSON.stringify({ solicitudID: sol.id }),
            token
          });
          joinedGroupsRef.current.add(sol.id);
          console.log(`📥 Admin unido al grupo de solicitud ${sol.id}`);
        });
        await Promise.all(joinPromises);
      } catch (error) {
        console.error('Error uniéndose a grupos de SignalR (admin):', error);
      }
    };

    joinAllGroups();

    return () => {
      const leaveAllGroups = async () => {
        if (joinedGroupsRef.current.size === 0) return;
        try {
          const token = await getAccessToken();
          const leavePromises = Array.from(joinedGroupsRef.current).map(async (solicitudID) => {
            await apiRequest('/signalr/leave-group', {
              method: 'POST',
              body: JSON.stringify({ solicitudID }),
              token
            });
            console.log(`📤 Admin salió del grupo de solicitud ${solicitudID}`);
          });
          await Promise.all(leavePromises);
          joinedGroupsRef.current.clear();
        } catch (error) {
          console.error('Error saliendo de grupos de SignalR (admin):', error);
        }
      };
      leaveAllGroups();
    };
  }, [solicitudes, getAccessToken]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterEstado, filterUsuario, filterFecha, solicitudes.length]);

  useEffect(() => {
    if (!showMessagesDropdown && !showDocsDropdown) return;

    const handleOutsideClick = (event) => {
      const target = event.target;
      const isMessagesClick = messagesDropdownRef.current?.contains(target) ||
        messagesButtonRef.current?.contains(target);
      const isDocsClick = docsDropdownRef.current?.contains(target) ||
        docsButtonRef.current?.contains(target);

      if (showMessagesDropdown && !isMessagesClick) {
        closeMessagesDropdown();
      }

      if (showDocsDropdown && !isDocsClick) {
        closeDocsDropdown();
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, [showMessagesDropdown, showDocsDropdown]);

  useEffect(() => {
    if (!openEstadoId) return;

    const handleEstadoOutsideClick = (event) => {
      const target = event.target;
      if (!(target instanceof Element)) return;
      if (target.closest('[data-estado-trigger="true"]') || target.closest('[data-estado-menu="true"]')) {
        return;
      }
      setOpenEstadoId(null);
    };

    document.addEventListener('mousedown', handleEstadoOutsideClick);
    return () => document.removeEventListener('mousedown', handleEstadoOutsideClick);
  }, [openEstadoId]);

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

  const handleCreateSolicitud = async (usuarioID, proyecto, comentarios, extraFields) => {
    const newSolicitud = await createSolicitud(usuarioID, proyecto, comentarios, extraFields);
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
      setIsSendBouncing(true);
      setTimeout(() => setIsSendBouncing(false), 220);
    }
  };

  const openMessagesDropdown = () => {
    setShowMessagesDropdown(true);
    setIsMessagesDropdownClosing(false);
    setShowDocsDropdown(false);
    setIsDocsDropdownClosing(false);
  };

  const closeMessagesDropdown = () => {
    if (!showMessagesDropdown || isMessagesDropdownClosing) return;
    setIsMessagesDropdownClosing(true);
    setTimeout(() => {
      setShowMessagesDropdown(false);
      setIsMessagesDropdownClosing(false);
    }, 160);
  };

  const toggleMessagesDropdown = () => {
    if (showMessagesDropdown && !isMessagesDropdownClosing) {
      closeMessagesDropdown();
    } else {
      openMessagesDropdown();
    }
  };

  const openDocsDropdown = () => {
    setShowDocsDropdown(true);
    setIsDocsDropdownClosing(false);
    setShowMessagesDropdown(false);
    setIsMessagesDropdownClosing(false);
  };

  const closeDocsDropdown = () => {
    if (!showDocsDropdown || isDocsDropdownClosing) return;
    setIsDocsDropdownClosing(true);
    setTimeout(() => {
      setShowDocsDropdown(false);
      setIsDocsDropdownClosing(false);
    }, 160);
  };

  const toggleDocsDropdown = () => {
    if (showDocsDropdown && !isDocsDropdownClosing) {
      closeDocsDropdown();
    } else {
      openDocsDropdown();
    }
  };

  const closeDetailPanel = () => {
    if (isClosingDetail) return;
    setIsClosingDetail(true);
    setTimeout(() => {
      setSelectedSolicitud(null);
      setEditingTitulo(false);
      setIsClosingDetail(false);
    }, 180);
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

  const handleDownloadDocument = async (doc) => {
    try {
      const url = await getDocumentDownloadUrl(doc.id);
      window.open(url, '_blank', 'noopener');
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'No se pudo descargar el documento',
        confirmButtonColor: '#1e40af'
      });
      console.error('Error descargando documento:', error);
    }
  };

  const handleDeleteDocument = async (doc) => {
    const result = await Swal.fire({
      title: '¿Eliminar documento?',
      text: `Se eliminara ${doc.nombre} de forma permanente`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#6b7280',
      confirmButtonText: 'Eliminar',
      cancelButtonText: 'Cancelar'
    });

    if (result.isConfirmed) {
      await deleteDocument(doc.id);
    }
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
          <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-center">
            <div>
              <h1 className="text-2xl font-bold">7P-PLL</h1>
              <p className="text-blue-200 text-sm">Dashboard Administrativo</p>
            </div>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end sm:space-x-4">
              <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                <button
                  onClick={() => setIsCreateModalOpen(true)}
                  className="bg-white text-primary px-4 py-2 rounded-lg hover:bg-blue-50 transition-colors flex items-center space-x-2 font-semibold shadow-md w-full sm:w-auto justify-center"
                >
                  <Plus className="w-5 h-5" />
                  <span>Nueva Solicitud</span>
                </button>
                
                {/* Badge de mensajes no leídos (solo escritorio) */}
                <div className="relative hidden xl:block">
                  <button 
                    ref={messagesButtonRef}
                    onClick={toggleMessagesDropdown}
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
                    <div
                      ref={messagesDropdownRef}
                      className={`absolute right-0 top-12 w-80 bg-white rounded-lg shadow-xl border border-gray-200 z-50 max-h-96 overflow-y-auto ${
                        isMessagesDropdownClosing ? 'animate-fade-out' : 'animate-fade-in'
                      }`}
                    >
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
                
                {/* Badge de documentos nuevos (solo escritorio) */}
                <div className="relative hidden xl:block">
                  <button 
                    ref={docsButtonRef}
                    onClick={toggleDocsDropdown}
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
                    <div
                      ref={docsDropdownRef}
                      className={`absolute right-0 top-12 w-80 bg-white rounded-lg shadow-xl border border-gray-200 z-50 max-h-96 overflow-y-auto ${
                        isDocsDropdownClosing ? 'animate-fade-out' : 'animate-fade-in'
                      }`}
                    >
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
        {/* Estadísticas */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-2 md:grid-cols-3 xl:grid-cols-5 sm:gap-6 mb-6 sm:mb-8">
          <button
            type="button"
            onClick={() => {
              setFilterEstado('Todos');
              setCurrentPage(1);
            }}
            className={`relative overflow-hidden rounded-xl shadow-md p-4 sm:p-6 text-left transition-colors hover:shadow-lg ${estadoFiltroStyles.Todos.hover} ${filterEstado === 'Todos' ? estadoFiltroStyles.Todos.selected : 'bg-white'}`}
            aria-label="Mostrar todas las solicitudes"
          >
            <div className="relative z-10">
              <p className="text-gray-600 text-xs sm:text-sm">Todas las peticiones</p>
              <p className="text-2xl sm:text-3xl font-bold text-primary">{stats.total}</p>
            </div>
            <Layers className="absolute -right-5 -bottom-5 w-20 h-20 sm:w-24 sm:h-24 text-primary opacity-15" />
          </button>

          <button
            type="button"
            onClick={() => {
              setFilterEstado('Pendiente');
              setCurrentPage(1);
            }}
            className={`relative overflow-hidden rounded-xl shadow-md p-4 sm:p-6 text-left transition-colors hover:shadow-lg ${estadoFiltroStyles.Pendiente.hover} ${filterEstado === 'Pendiente' ? estadoFiltroStyles.Pendiente.selected : 'bg-white'}`}
            aria-label="Filtrar solicitudes pendientes"
          >
            <div className="relative z-10">
              <p className="text-gray-600 text-xs sm:text-sm">Solicitudes Pendientes</p>
              <p className="text-2xl sm:text-3xl font-bold text-yellow-600">{stats.pendientes}</p>
            </div>
            <AlertCircle className="absolute -right-5 -bottom-5 w-20 h-20 sm:w-24 sm:h-24 text-yellow-600 opacity-15" />
          </button>

          <button
            type="button"
            onClick={() => {
              setFilterEstado('Documentación pendiente');
              setCurrentPage(1);
            }}
            className={`relative overflow-hidden rounded-xl shadow-md p-4 sm:p-6 text-left transition-colors hover:shadow-lg ${estadoFiltroStyles['Documentación pendiente'].hover} ${filterEstado === 'Documentación pendiente' ? estadoFiltroStyles['Documentación pendiente'].selected : 'bg-white'}`}
            aria-label="Filtrar solicitudes con documentación pendiente"
          >
            <div className="relative z-10">
              <p className="text-gray-600 text-xs sm:text-sm">Documentación pendiente</p>
              <p className="text-2xl sm:text-3xl font-bold text-blue-600">{stats.enProceso}</p>
            </div>
            <Clock className="absolute -right-5 -bottom-5 w-20 h-20 sm:w-24 sm:h-24 text-blue-600 opacity-15" />
          </button>

          <button
            type="button"
            onClick={() => {
              setFilterEstado('Aceptada');
              setCurrentPage(1);
            }}
            className={`relative overflow-hidden rounded-xl shadow-md p-4 sm:p-6 text-left transition-colors hover:shadow-lg ${estadoFiltroStyles.Aceptada.hover} ${filterEstado === 'Aceptada' ? estadoFiltroStyles.Aceptada.selected : 'bg-white'}`}
            aria-label="Filtrar solicitudes aceptadas"
          >
            <div className="relative z-10">
              <p className="text-gray-600 text-xs sm:text-sm">Solicitudes Aceptadas</p>
              <p className="text-2xl sm:text-3xl font-bold text-green-600">{stats.completadas}</p>
            </div>
            <CheckCircle className="absolute -right-5 -bottom-5 w-20 h-20 sm:w-24 sm:h-24 text-green-600 opacity-15" />
          </button>

          <button
            type="button"
            onClick={() => {
              setFilterEstado('Rechazada');
              setCurrentPage(1);
            }}
            className={`relative overflow-hidden rounded-xl shadow-md p-4 sm:p-6 text-left transition-colors hover:shadow-lg ${estadoFiltroStyles.Rechazada.hover} ${filterEstado === 'Rechazada' ? estadoFiltroStyles.Rechazada.selected : 'bg-white'}`}
            aria-label="Filtrar solicitudes rechazadas"
          >
            <div className="relative z-10">
              <p className="text-gray-600 text-xs sm:text-sm">Solicitudes Rechazadas</p>
              <p className="text-2xl sm:text-3xl font-bold text-red-600">{stats.rechazadas}</p>
            </div>
            <XCircle className="absolute -right-5 -bottom-5 w-20 h-20 sm:w-24 sm:h-24 text-red-600 opacity-15" />
          </button>
        </div>

        {/* Filtros */}
        <div className="bg-white rounded-xl shadow-md p-4 sm:p-6 mb-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <select
              value={filterUsuario}
              onChange={(e) => setFilterUsuario(e.target.value)}
              className="px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-primary"
            >
              <option value="Todos">Todos los usuarios</option>
              {usuariosParaFiltro
                .filter(user => user && user.id != null)
                .filter((user, index, self) =>
                  index === self.findIndex(u => u.id === user.id)
                )
                .map(u => (
                  <option key={u.id} value={u.id}>
                    {u.nombre}{u.email ? ` (${u.email})` : ''}
                  </option>
                ))}
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

            <div>
              <input
                type="date"
                value={filterFecha}
                onChange={(e) => setFilterFecha(e.target.value)}
                className="w-full px-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-primary"
              />
            </div>
          </div>
        </div>

        {/* Tabla de Solicitudes */}
        <div className="bg-white rounded-xl shadow-md hidden xl:block">
          <div className="overflow-x-auto xl:overflow-visible">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 lg:px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Usuario
                  </th>
                  <th className="px-4 lg:px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Proyecto
                  </th>
                  <th className="px-4 lg:px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider hidden lg:table-cell">
                    Documentos
                  </th>
                  <th className="px-4 lg:px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider hidden md:table-cell">
                    Fechas
                  </th>
                  <th className="px-4 lg:px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Estado
                  </th>
                </tr>
              </thead>
              <tbody
                className="divide-y divide-gray-200 animate-fade-in-up"
                key={`table-page-${currentPage}-${filterEstado}-${filterUsuario}-${filterFecha}-${searchTerm}`}
              >
                {filteredSolicitudes.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="px-4 sm:px-6 py-8 text-center text-gray-500">
                      No hay solicitudes
                    </td>
                  </tr>
                ) : (
                  pagedSolicitudes.map(solicitud => {
                    const numDocs = documentos.filter(d => d.solicitudID === solicitud.id).length;
                    
                    return (
                      <tr 
                        key={solicitud.id} 
                        className="hover:bg-gray-50 transition-colors cursor-pointer"
                        onClick={() => setSelectedSolicitud(solicitud)}
                      >
                        <td className="px-4 lg:px-6 py-4 text-sm text-gray-900">
                          <div className="font-medium text-gray-900">
                            {getUserName(solicitud.usuarioID)}
                          </div>
                          <div className="text-xs text-gray-500">
                            {solicitud.cargo || '-'}
                          </div>
                        </td>
                        <td className="px-4 lg:px-6 py-4">
                          <div className="text-sm font-medium text-gray-900">{solicitud.proyecto}</div>
                          <div className="text-sm text-gray-500 truncate max-w-xs">
                            {solicitud.comentarios?.trim() ? solicitud.comentarios : 'Sin descripcion'}
                          </div>
                        </td>
                        <td className="px-4 lg:px-6 py-4 text-sm text-gray-600 hidden lg:table-cell whitespace-nowrap">
                          {numDocs} documento{numDocs !== 1 ? 's' : ''}
                        </td>
                        <td className="px-4 lg:px-6 py-4 text-sm text-gray-600 whitespace-nowrap hidden md:table-cell">
                          <div>Inicio: {solicitud.fechaInicio ? formatDate(solicitud.fechaInicio) : 'Sin fecha'}</div>
                          <div>Fin: {solicitud.fechaFin ? formatDate(solicitud.fechaFin) : 'Sin fecha'}</div>
                        </td>
                        <td className="px-4 lg:px-6 py-4">
                          {renderEstadoSelector(solicitud)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Cards de Solicitudes (movil) */}
        <div
          className="xl:hidden space-y-4 animate-fade-in-up"
          key={`cards-page-${currentPage}-${filterEstado}-${filterUsuario}-${filterFecha}-${searchTerm}`}
        >
          {filteredSolicitudes.length === 0 ? (
            <div className="bg-white rounded-xl shadow-md p-6 text-center text-gray-500">
              No hay solicitudes
            </div>
          ) : (
            pagedSolicitudes.map(solicitud => {
              const numDocs = documentos.filter(d => d.solicitudID === solicitud.id).length;

              return (
                <div
                  key={solicitud.id}
                  className="bg-white rounded-xl shadow-md p-4 border border-gray-100"
                  onClick={() => setSelectedSolicitud(solicitud)}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-[11px] uppercase tracking-wider text-gray-400">Usuario</p>
                      <p className="text-sm font-semibold text-gray-900 truncate">{getUserName(solicitud.usuarioID)}</p>
                      <p className="text-xs text-gray-500 mt-0.5">{solicitud.cargo || '-'}</p>
                    </div>
                    {renderEstadoSelector(solicitud)}
                  </div>

                  <div className="mt-3">
                    <p className="text-[11px] uppercase tracking-wider text-gray-400">Proyecto</p>
                    <p className="text-sm font-semibold text-gray-900">
                      {solicitud.proyecto}
                    </p>
                    <p className="text-xs text-gray-600 mt-1 line-clamp-2">
                      {solicitud.comentarios?.trim() ? solicitud.comentarios : 'Sin descripcion'}
                    </p>
                  </div>

                  <div className="mt-3 grid grid-cols-1 gap-2 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] uppercase tracking-wider text-gray-400">Documentos</span>
                      <span className="font-semibold text-gray-800">{numDocs}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] uppercase tracking-wider text-gray-400">Fecha de inicio</span>
                      <span className="font-semibold text-gray-800">{solicitud.fechaInicio ? formatDate(solicitud.fechaInicio) : 'Sin fecha'}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] uppercase tracking-wider text-gray-400">Fecha de fin</span>
                      <span className="font-semibold text-gray-800">{solicitud.fechaFin ? formatDate(solicitud.fechaFin) : 'Sin fecha'}</span>
                    </div>
                  </div>

                </div>
              );
            })
          )}
        </div>

        <div
          className={`xl:hidden flex items-center justify-between text-sm overflow-hidden origin-top transition-all duration-300 ${
            showPagination
              ? 'mt-4 max-h-20 opacity-100 scale-100 animate-pop-in'
              : 'mt-0 max-h-0 opacity-0 scale-95 pointer-events-none animate-pop-out'
          }`}
          aria-hidden={!showPagination}
        >
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

        <div
          className={`hidden xl:flex items-center justify-between text-sm overflow-hidden origin-top transition-all duration-300 ${
            showPagination
              ? 'mt-4 max-h-20 opacity-100 scale-100 animate-pop-in'
              : 'mt-0 max-h-0 opacity-0 scale-95 pointer-events-none animate-pop-out'
          }`}
          aria-hidden={!showPagination}
        >
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
        </div>

        {/* Panel de detalle */}
        {selectedSolicitud && (
          <div
            className={`fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-3 sm:p-4 ${
              isClosingDetail ? 'animate-fade-out' : 'animate-fade-in'
            }`}
            onClick={closeDetailPanel}
          >
            <div
              className={`bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto ${
                isClosingDetail ? 'animate-pop-out' : 'animate-pop-in'
              }`}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="bg-primary text-white p-6 relative">
                <div className="flex flex-col gap-3 sm:flex-row sm:justify-between sm:items-start">
                  <div>
                  {editingTitulo ? (
                    <div className="flex items-center space-x-2 pr-12">
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
                    <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:space-x-2">
                      <h3 className="text-xl sm:text-2xl font-bold">{selectedSolicitud.proyecto}</h3>
                      <button
                        onClick={handleEditTitulo}
                        className="hover:bg-white hover:bg-opacity-20 p-2 rounded-lg transition-colors self-start sm:self-auto"
                        title="Editar título"
                      >
                        <Edit2 className="w-5 h-5" />
                      </button>
                    </div>
                  )}
                  <p className="text-blue-200 text-sm">Usuario: {getUserName(selectedSolicitud.usuarioID)}</p>
                  <div className="flex flex-col gap-2 text-blue-100 text-sm mt-2">
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="flex items-center">
                        <Calendar className="w-4 h-4 mr-1" />
                        Inicio: {selectedSolicitud.fechaInicio ? formatDate(selectedSolicitud.fechaInicio) : 'Sin fecha'}
                      </span>
                      <span className="flex items-center">
                        <Calendar className="w-4 h-4 mr-1" />
                        Fin: {selectedSolicitud.fechaFin ? formatDate(selectedSolicitud.fechaFin) : 'Sin fecha'}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="flex items-center">
                        <MapPin className="w-4 h-4 mr-1" />
                        Pais: {selectedSolicitud.pais?.trim() ? selectedSolicitud.pais : 'Sin dato'}
                      </span>
                      <span className="flex items-center">
                        <Building2 className="w-4 h-4 mr-1" />
                        Filial: {selectedSolicitud.filial?.trim() ? selectedSolicitud.filial : 'Sin dato'}
                      </span>
                      <span className="flex items-center">
                        <Clock className="w-4 h-4 mr-1" />
                        Codigo de horas: {selectedSolicitud.horasCodigo?.trim() ? selectedSolicitud.horasCodigo : 'Sin dato'}
                      </span>
                    </div>
                  </div>
                  </div>
                </div>
                <button
                  onClick={closeDetailPanel}
                  className="absolute top-4 right-4 text-white hover:bg-white hover:bg-opacity-20 p-2 rounded-lg transition-colors"
                >
                  <XCircle className="w-6 h-6" />
                </button>
              </div>

              <div className="p-4 sm:p-6 space-y-6">
                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Principales funciones realizadas</h4>
                  <p className="text-gray-700 bg-gray-50 p-4 rounded-lg">
                    {selectedSolicitud.comentarios?.trim() ? selectedSolicitud.comentarios : 'Sin descripcion'}
                  </p>
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
                                <span className="text-sm font-normal text-gray-600 truncate">{doc.nombre}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleDownloadDocument(doc)}
                                  className="flex-shrink-0 text-primary hover:text-blue-700 p-1 rounded transition-colors"
                                  title="Descargar"
                                >
                                  <Download className="w-4 h-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteDocument(doc)}
                                  className="flex-shrink-0 text-red-600 hover:text-red-700 p-1 rounded transition-colors"
                                  title="Eliminar"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
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
                                <span className="text-sm font-normal text-gray-600 truncate">{doc.nombre}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleDownloadDocument(doc)}
                                  className="flex-shrink-0 text-primary hover:text-blue-700 p-1 rounded transition-colors"
                                  title="Descargar"
                                >
                                  <Download className="w-4 h-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteDocument(doc)}
                                  className="flex-shrink-0 text-red-600 hover:text-red-700 p-1 rounded transition-colors"
                                  title="Eliminar"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
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
                                <span className="text-sm font-normal text-gray-600 truncate">{doc.nombre}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleDownloadDocument(doc)}
                                  className="flex-shrink-0 text-primary hover:text-blue-700 p-1 rounded transition-colors"
                                  title="Descargar"
                                >
                                  <Download className="w-4 h-4" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteDocument(doc)}
                                  className="flex-shrink-0 text-red-600 hover:text-red-700 p-1 rounded transition-colors"
                                  title="Eliminar"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold text-gray-900 mb-2">Conversación ({solicitudMensajes.length})</h4>
                  <div
                    ref={messagesContainerRef}
                    className="bg-gray-50 rounded-lg p-4 mb-3 max-h-64 overflow-y-auto space-y-3 smooth-scroll"
                  >
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
                              className={`max-w-[70%] rounded-lg p-3 animate-fade-in-up ${
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
                  <div className="flex flex-col sm:flex-row gap-2">
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
                      className={`bg-primary text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed ${
                        isSendBouncing ? 'animate-bounce-once' : ''
                      }`}
                    >
                      <Send className="w-5 h-5" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}


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
