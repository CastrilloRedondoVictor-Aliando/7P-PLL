import React, { useState, useEffect, useLayoutEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { LogOut, Search, CheckCircle, XCircle, AlertCircle, Clock, Layers, Send, Plus, Bell, Edit2, FileText, Download, FileSearch, ChevronDown, Trash2, MapPin, Building2, Calendar, Percent, FileDown, Upload, Menu, Plane, X } from 'lucide-react';
import * as XLSX from 'xlsx-js-style';
import JSZip from 'jszip';
import Swal from 'sweetalert2';
import { useAuth } from '../hooks/useAuth';
import { API_BASE_URL, apiRequest, isAuthorizationError } from '../config/api';
import { formatDate, getEstadoColor } from '../utils/helpers';
import CreateSolicitudModal from '../components/CreateSolicitudModal';
import EditSolicitudModal from '../components/EditSolicitudModal';
import { openDocumentPreview } from '../utils/documentPreview';

const AdminDashboard = () => {
  const { user, solicitudes, documentos, mensajes, loading, logout, updateSolicitudEstado, updateSolicitudCompleta, sendMessage, createSolicitud, markMessagesAsRead, markDocsAsViewed, resolveUsersByEmails, getDocumentPreviewUrl, getDocumentPreviewContent, getDocumentDownloadUrl, deleteDocument, deleteSolicitud, getAccessToken, isSignalRConnected } = useAuth();
  const isViewRole = user?.rol === 'view';
  const [searchTerm, setSearchTerm] = useState('');
  const [filterEstado, setFilterEstado] = useState('Todos');
  const [filterFecha, setFilterFecha] = useState('');
  const [selectedSolicitud, setSelectedSolicitud] = useState(null);
  const [newMessage, setNewMessage] = useState('');
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [showMessagesDropdown, setShowMessagesDropdown] = useState(false);
  const [showDocsDropdown, setShowDocsDropdown] = useState(false);
  const messagesContainerRef = useRef(null);
  const [isClosingDetail, setIsClosingDetail] = useState(false);
  const [isSendBouncing, setIsSendBouncing] = useState(false);
  const [isMessagesDropdownClosing, setIsMessagesDropdownClosing] = useState(false);
  const [isDocsDropdownClosing, setIsDocsDropdownClosing] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [openEstadoId, setOpenEstadoId] = useState(null);
  const [estadoMenuPosition, setEstadoMenuPosition] = useState(null);
  const [isImporting, setIsImporting] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [showLoadingScreen, setShowLoadingScreen] = useState(loading);
  const [isLoadingClosing, setIsLoadingClosing] = useState(false);
  const [isDownloadingSolicitud, setIsDownloadingSolicitud] = useState(false);
  const [availableUsers, setAvailableUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(false);
  const messagesButtonRef = useRef(null);
  const mobileMessagesButtonRef = useRef(null);
  const messagesDropdownRef = useRef(null);
  const mobileMessagesDropdownRef = useRef(null);
  const docsButtonRef = useRef(null);
  const mobileDocsButtonRef = useRef(null);
  const docsDropdownRef = useRef(null);
  const mobileDocsDropdownRef = useRef(null);
  const estadoTriggerRefs = useRef(new Map());
  const joinedGroupsRef = useRef(new Set());
  const importInputRef = useRef(null);
  const itemsPerPage = 10;
  const normalizeIdentifier = (value) => (typeof value === 'string' ? value.trim().toLowerCase() : '');
  const currentUserIdentifiers = new Set(
    [user?.id, user?.oid, user?.entraIdOID, user?.email]
      .map(normalizeIdentifier)
      .filter(Boolean)
  );
  const isCurrentUserMessage = (mensaje) => {
    if (!mensaje) return false;
    if (mensaje.rol === 'admin' || mensaje.rol === 'view') return true;
    return currentUserIdentifiers.has(normalizeIdentifier(mensaje?.usuarioID));
  };


  // Contar mensajes no leídos de usuarios
  const unreadMessages = mensajes.filter(m => {
    return m.rol === 'user' && !m.leidoPorAdmin && m.usuarioID !== user.id;
  }).length;

  // Obtener solicitudes con mensajes sin leer
  const solicitudesWithUnreadMessages = solicitudes.filter(s => {
    const hasUnreadMessages = mensajes.some(m => 
      m.solicitudID === s.id && 
      !m.leidoPorAdmin && 
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

  const getSolicitudSortDate = (solicitud) => {
    const latestDocumentDate = documentos
      .filter((doc) => doc.solicitudID === solicitud.id)
      .map((doc) => doc.createdAt || doc.fechaCarga)
      .filter(Boolean)
      .reduce((latest, current) => {
        if (!latest) return current;
        return new Date(current) > new Date(latest) ? current : latest;
      }, null);

    return latestDocumentDate || solicitud.fechaUltimoDocumento || solicitud.fechaCreacion;
  };

  const getSolicitudSortTimestamp = (solicitud) => {
    const sortDate = getSolicitudSortDate(solicitud);
    const sortTimestamp = sortDate ? new Date(sortDate).getTime() : 0;
    if (!Number.isNaN(sortTimestamp)) {
      return sortTimestamp;
    }

    const creationTimestamp = solicitud?.fechaCreacion ? new Date(solicitud.fechaCreacion).getTime() : 0;
    return Number.isNaN(creationTimestamp) ? 0 : creationTimestamp;
  };
  
  const newDocsCount = documentos.filter(d => !d.vistoPorAdmin).length;

  // Filtrar solicitudes
  const filteredSolicitudes = solicitudes.filter(s => {
    const searchValue = searchTerm.toLowerCase();
    const matchesSearch = !searchValue ||
      s.usuarioNombre?.toLowerCase().includes(searchValue) ||
      s.destino?.toLowerCase().includes(searchValue);
    const matchesFilter = filterEstado === 'Todos' || s.estado === filterEstado;
    const targetDate = filterFecha ? new Date(filterFecha) : null;
    if (targetDate) {
      targetDate.setHours(0, 0, 0, 0);
    }
    const startDate = s.fechaInicio ? new Date(s.fechaInicio) : null;
    const endDate = s.fechaFin ? new Date(s.fechaFin) : null;
    if (startDate) startDate.setHours(0, 0, 0, 0);
    if (endDate) endDate.setHours(0, 0, 0, 0);
    const matchesDate = !targetDate || (startDate && endDate && startDate <= targetDate && endDate >= targetDate);

    return matchesSearch && matchesFilter && matchesDate;
  }).sort((a, b) => {
    const timestampDifference = getSolicitudSortTimestamp(b) - getSolicitudSortTimestamp(a);
    if (timestampDifference !== 0) {
      return timestampDifference;
    }

    const creationDifference = new Date(b.fechaCreacion).getTime() - new Date(a.fechaCreacion).getTime();
    return Number.isNaN(creationDifference) ? 0 : creationDifference;
  });

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
    enProceso: solicitudes.filter(s => s.estado === 'En revisión').length,
    completadas: solicitudes.filter(s => s.estado === 'Aceptada').length,
    rechazadas: solicitudes.filter(s => s.estado === 'Rechazada').length,
  };

  const getProyectoDisplayName = (proyecto) => {
    const normalized = proyecto?.toString().trim();
    return normalized ? normalized : 'Proyecto sin nombre';
  };

  const estadoFiltroStyles = {
    Todos: { hover: 'hover:bg-blue-50', selected: 'bg-blue-50 ring-1 ring-blue-100' },
    Pendiente: { hover: 'hover:bg-yellow-50', selected: 'bg-yellow-50 ring-1 ring-yellow-100' },
    'En revisión': { hover: 'hover:bg-blue-50', selected: 'bg-blue-50 ring-1 ring-blue-100' },
    Aceptada: { hover: 'hover:bg-green-50', selected: 'bg-green-50 ring-1 ring-green-100' },
    Rechazada: { hover: 'hover:bg-red-50', selected: 'bg-red-50 ring-1 ring-red-100' }
  };

  const handleEstadoChange = async (solicitud, nuevoEstado) => {
    if (solicitud.estado === nuevoEstado) return;

    if (nuevoEstado !== 'Aceptada') {
      updateSolicitudEstado(solicitud.id, nuevoEstado);
      return;
    }

    const { value: porcentajeValue, isConfirmed } = await Swal.fire({
      title: 'Porcentaje de avance',
      input: 'number',
      inputLabel: 'Indica un porcentaje (0-100)',
      inputValue: solicitud.porcentaje ?? '',
      inputAttributes: {
        min: 0,
        max: 100,
        step: 1
      },
      showCancelButton: true,
      confirmButtonText: 'Guardar',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#1e40af',
      inputValidator: (value) => {
        if (value === '' || value === null || value === undefined) {
          return 'Introduce un porcentaje';
        }
        const parsed = Number(value);
        if (Number.isNaN(parsed)) {
          return 'El porcentaje debe ser numerico';
        }
        if (parsed < 0 || parsed > 100) {
          return 'El porcentaje debe estar entre 0 y 100';
        }
        return undefined;
      }
    });

    if (!isConfirmed) return;
    const porcentaje = Number(porcentajeValue);
    updateSolicitudEstado(solicitud.id, nuevoEstado, porcentaje);
  };

  const estadosDisponibles = ['Pendiente', 'En revisión', 'Aceptada', 'Rechazada'];

  const closeEstadoMenu = () => {
    setOpenEstadoId(null);
    setEstadoMenuPosition(null);
  };

  const openEstadoMenu = (selectorId, menuAlignment = 'right') => {
    const triggerElement = estadoTriggerRefs.current.get(selectorId);
    if (!triggerElement) return;

    const rect = triggerElement.getBoundingClientRect();
    const menuWidth = 160;
    const menuHeight = estadosDisponibles.length * 40;
    const viewportWidth = window.innerWidth;
    const viewportHeight = window.innerHeight;
    const preferredLeft = menuAlignment === 'left' ? rect.left : rect.right - menuWidth;
    const left = Math.min(Math.max(12, preferredLeft), Math.max(12, viewportWidth - menuWidth - 12));
    const spaceBelow = viewportHeight - rect.bottom;
    const spaceAbove = rect.top;
    const shouldOpenUpwards = spaceBelow < menuHeight + 12 && spaceAbove > spaceBelow;

    setOpenEstadoId(selectorId);
    setEstadoMenuPosition({
      left,
      top: shouldOpenUpwards ? Math.max(12, rect.top - menuHeight - 8) : rect.bottom + 8,
      width: menuWidth,
      openUpwards: shouldOpenUpwards
    });
  };

  const renderEstadoSelector = (solicitud, options = {}) => {
    const { menuAlignment = 'right', context = 'list' } = options;
    const selectorId = `${context}-${solicitud.id}`;
    const estadoColors = getEstadoColor(solicitud.estado);
    const isOpen = openEstadoId === selectorId;
    const estadoItemStyles = {
      Pendiente: 'hover:bg-yellow-50',
      'En revisión': 'hover:bg-blue-50',
      Aceptada: 'hover:bg-green-50',
      Rechazada: 'hover:bg-red-50'
    };
    const estadoSelectedStyles = {
      Pendiente: 'bg-yellow-50 text-yellow-700',
      'En revisión': 'bg-blue-50 text-blue-700',
      Aceptada: 'bg-green-50 text-green-700',
      Rechazada: 'bg-red-50 text-red-700'
    };

    if (isViewRole) {
      return (
        <span className={`px-3 py-1 text-xs font-semibold rounded-full whitespace-nowrap inline-flex items-center ${estadoColors.bg} ${estadoColors.text}`}>
          {solicitud.estado}
        </span>
      );
    }

    return (
      <div className="relative inline-flex" onClick={(e) => e.stopPropagation()}>
        <button
          ref={(element) => {
            if (element) {
              estadoTriggerRefs.current.set(selectorId, element);
              return;
            }
            estadoTriggerRefs.current.delete(selectorId);
          }}
          type="button"
          data-estado-trigger="true"
          onClick={() => {
            if (isOpen) {
              closeEstadoMenu();
              return;
            }
            openEstadoMenu(selectorId, menuAlignment);
          }}
          className={`px-3 py-1 text-xs font-semibold rounded-full whitespace-nowrap inline-flex items-center gap-1 ${estadoColors.bg} ${estadoColors.text} hover:opacity-90 transition-opacity ring-1 ring-transparent hover:ring-primary/30`}
          aria-haspopup="menu"
          aria-expanded={isOpen}
        >
          <span>{solicitud.estado}</span>
          <ChevronDown className="w-3.5 h-3.5 opacity-70" />
        </button>
        {isOpen && estadoMenuPosition && createPortal(
          <div
            data-estado-menu="true"
            className="fixed bg-white border border-gray-200 rounded-lg shadow-lg z-[80] animate-pop-in"
            style={{
              top: `${estadoMenuPosition.top}px`,
              left: `${estadoMenuPosition.left}px`,
              width: `${estadoMenuPosition.width}px`,
              transformOrigin: estadoMenuPosition.openUpwards ? 'bottom right' : 'top right'
            }}
          >
            {estadosDisponibles.map(estado => (
              <button
                key={estado}
                type="button"
                onClick={() => {
                  handleEstadoChange(solicitud, estado);
                  closeEstadoMenu();
                }}
                className={`w-full text-left px-3 py-2 text-sm ${estadoItemStyles[estado] || 'hover:bg-gray-50'} ${estado === solicitud.estado ? `font-semibold ${estadoSelectedStyles[estado] || 'bg-gray-50 text-gray-700'}` : 'text-gray-700'}`}
              >
                {estado}
              </button>
            ))}
          </div>,
          document.body
        )}
      </div>
    );
  };

  const getUserName = (userId) => {
    const solicitud = solicitudes.find(s => s.usuarioID === userId);
    if (solicitud?.usuarioNombre) return solicitud.usuarioNombre;
    if (solicitud?.usuarioEmail) return solicitud.usuarioEmail;
    const mensaje = mensajes.find(m => m.usuarioID === userId && m.usuarioNombre);
    return mensaje?.usuarioNombre || 'Usuario desconocido';
  };

  const getMessageSenderName = (mensaje) => {
    if (mensaje?.rol === 'admin') {
      return 'Pérez-Llorca';
    }

    return getUserName(mensaje?.usuarioID);
  };

  const solicitudDocumentos = selectedSolicitud
    ? documentos.filter(d => d.solicitudID === selectedSolicitud.id)
    : [];

  const solicitudMensajes = selectedSolicitud
    ? mensajes.filter(m => m.solicitudID === selectedSolicitud.id)
    : [];
  const isSelectedSolicitudClosed = selectedSolicitud?.estado === 'Aceptada' || selectedSolicitud?.estado === 'Rechazada';

  const getDocumentUploadDateLabel = (doc) => {
    const uploadDate = doc.createdAt || doc.fechaCarga;
    return uploadDate ? `Subido: ${formatDate(uploadDate)}` : 'Fecha no disponible';
  };

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
    if (!selectedSolicitud) return;

    const updatedSelectedSolicitud = solicitudes.find(solicitud => solicitud.id === selectedSolicitud.id);

    if (!updatedSelectedSolicitud) {
      setSelectedSolicitud(null);
      return;
    }

    if (updatedSelectedSolicitud !== selectedSolicitud) {
      setSelectedSolicitud(updatedSelectedSolicitud);
    }
  }, [selectedSolicitud, solicitudes]);

  useEffect(() => {
    if (!isSignalRConnected) {
      joinedGroupsRef.current.clear();
    }
  }, [isSignalRConnected]);

  useEffect(() => {
    let isCancelled = false;

    const syncSelectedGroup = async () => {
      if (!isSignalRConnected) {
        return;
      }

      const selectedSolicitudId = selectedSolicitud?.id;
      const joinedSolicitudId = Array.from(joinedGroupsRef.current)[0] ?? null;

      if (selectedSolicitudId === joinedSolicitudId) {
        return;
      }

      try {
        const token = await getAccessToken();

        if (joinedSolicitudId !== null) {
          await apiRequest('/signalr/leave-group', {
            method: 'POST',
            body: JSON.stringify({ solicitudID: joinedSolicitudId }),
            token
          });
          joinedGroupsRef.current.delete(joinedSolicitudId);
        }

        if (isCancelled || selectedSolicitudId === null || selectedSolicitudId === undefined) {
          return;
        }

        await apiRequest('/signalr/join-group', {
          method: 'POST',
          body: JSON.stringify({ solicitudID: selectedSolicitudId }),
          token
        });
        joinedGroupsRef.current.add(selectedSolicitudId);
      } catch (error) {
      }
    };

    syncSelectedGroup();

    return () => {
      isCancelled = true;
    };
  }, [selectedSolicitud?.id, getAccessToken, isSignalRConnected]);

  useEffect(() => {
    return () => {
      const leaveJoinedGroup = async () => {
        const joinedSolicitudId = Array.from(joinedGroupsRef.current)[0];
        if (joinedSolicitudId === undefined) return;

        try {
          const token = await getAccessToken();
          await apiRequest('/signalr/leave-group', {
            method: 'POST',
            body: JSON.stringify({ solicitudID: joinedSolicitudId }),
            token
          });
          joinedGroupsRef.current.clear();
        } catch (error) {
        }
      };

      leaveJoinedGroup();
    };
  }, [getAccessToken]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterEstado, filterFecha, solicitudes.length]);

  useEffect(() => {
    if (!showMessagesDropdown && !showDocsDropdown) return;

    const handleOutsideClick = (event) => {
      const target = event.target;
      const isMessagesClick = messagesDropdownRef.current?.contains(target) ||
        mobileMessagesDropdownRef.current?.contains(target) ||
        messagesButtonRef.current?.contains(target) ||
        mobileMessagesButtonRef.current?.contains(target);
      const isDocsClick = docsDropdownRef.current?.contains(target) ||
        mobileDocsDropdownRef.current?.contains(target) ||
        docsButtonRef.current?.contains(target) ||
        mobileDocsButtonRef.current?.contains(target);

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
      closeEstadoMenu();
    };

    const handleViewportChange = () => {
      closeEstadoMenu();
    };

    document.addEventListener('mousedown', handleEstadoOutsideClick);
    window.addEventListener('resize', handleViewportChange);
    window.addEventListener('scroll', handleViewportChange, true);
    return () => {
      document.removeEventListener('mousedown', handleEstadoOutsideClick);
      window.removeEventListener('resize', handleViewportChange);
      window.removeEventListener('scroll', handleViewportChange, true);
    };
  }, [openEstadoId]);

  useEffect(() => {
    if (loading) {
      setShowLoadingScreen(true);
      setIsLoadingClosing(false);
      return;
    }

    if (!showLoadingScreen) return;

    setIsLoadingClosing(true);
    const timeoutId = setTimeout(() => {
      setShowLoadingScreen(false);
      setIsLoadingClosing(false);
    }, 180);

    return () => clearTimeout(timeoutId);
  }, [loading, showLoadingScreen]);

  useEffect(() => {
    if (!isCreateModalOpen || isViewRole) {
      return undefined;
    }

    let ignore = false;

    const loadAvailableUsers = async () => {
      try {
        setLoadingUsers(true);
        const token = await getAccessToken();
        const data = await apiRequest('/auth/users', { token });
        if (!ignore) {
          setAvailableUsers(Array.isArray(data?.users) ? data.users : []);
        }
      } catch (error) {
        if (!ignore) {
          setAvailableUsers([]);
        }
      } finally {
        if (!ignore) {
          setLoadingUsers(false);
        }
      }
    };

    loadAvailableUsers();

    return () => {
      ignore = true;
    };
  }, [getAccessToken, isCreateModalOpen, isViewRole]);

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

  const handleCreateSolicitud = async (emails, proyecto, comentarios, extraFields) => {
    const normalizedEmails = Array.from(
      new Set(
        (Array.isArray(emails) ? emails : [emails])
          .map(email => (email || '').toString().trim().toLowerCase())
          .filter(Boolean)
      )
    );

    if (normalizedEmails.length === 0) {
      Swal.fire({
        icon: 'warning',
        title: 'Emails requeridos',
        text: 'Introduce al menos un email valido para crear la solicitud',
        confirmButtonColor: '#1e40af'
      });
      return;
    }

    const usersByEmail = new Map(
      availableUsers
        .filter((availableUser) => availableUser?.email && availableUser?.oid)
        .map((availableUser) => [availableUser.email.toLowerCase(), availableUser])
    );

    const created = [];
    const failed = [];
    const missing = normalizedEmails.filter(email => !usersByEmail.has(email));

    for (const email of normalizedEmails) {
      const userInfo = usersByEmail.get(email);
      if (!userInfo?.oid) {
        failed.push(email);
        continue;
      }
      try {
        const result = await createSolicitud(
          userInfo.oid,
          proyecto,
          comentarios,
          extraFields,
          { nombre: userInfo.nombre, email: userInfo.email }
        );
        if (result) {
          created.push(result);
        } else {
          failed.push(email);
        }
      } catch (error) {
        failed.push(email);
      }
    }

    const createdCount = created.length;
    const failedCount = failed.length;
    const missingCount = missing.length;
    const title = createdCount === 1 ? '¡Solicitud creada!' : '¡Solicitudes creadas!';
    const baseText = createdCount === 1
      ? `Solicitud creada exitosamente para ${created[0]?.usuarioNombre || created[0]?.usuarioEmail || 'el usuario'}`
      : `Se crearon ${createdCount} solicitudes correctamente`;
    const extraInfo = missingCount > 0
      ? ` ${missingCount} usuarios ya no estan disponibles en la tabla de usuarios.`
      : '';
    const text = failedCount > 0
      ? `${baseText}. ${failedCount} no se pudieron crear.${extraInfo}`
      : `${baseText}.${extraInfo}`;

    Swal.fire({
      icon: failedCount > 0 || missingCount > 0 ? 'warning' : 'success',
      title,
      text,
      confirmButtonColor: '#1e40af',
      timer: 3500,
      showConfirmButton: false
    });
  };

  const handleSendMessage = () => {
    if (isViewRole) return;
    if (isSelectedSolicitudClosed) return;
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
      setIsEditModalOpen(false);
      setIsClosingDetail(false);
    }, 180);
  };

  const handleOpenEditSolicitud = () => {
    if (!selectedSolicitud || isViewRole) return;
    setIsEditModalOpen(true);
  };

  const handleSaveEditedSolicitud = async (data) => {
    if (!selectedSolicitud) return;
    const payload = {
      proyecto: data.proyecto,
      descripcion: data.comentarios,
      estado: data.estado || selectedSolicitud.estado,
      codigoEmpleado: data.codigoEmpleado,
      posicion: data.posicion,
      politica: data.politica,
      trayecto: data.trayecto,
      destino: data.destino,
      fechaInicio: data.fechaInicio,
      fechaFin: data.fechaFin,
      empresa: data.empresa,
      horasCodigo: data.horasCodigo,
      porcentaje: data.porcentaje
    };

    const updated = await updateSolicitudCompleta(selectedSolicitud.id, payload);
    if (updated) {
      setSelectedSolicitud(prev => ({
        ...prev,
        ...updated
      }));
      setIsEditModalOpen(false);
      return updated;
    }
    return null;
  };

  const handleDownloadDocument = async (doc) => {
    try {
      await openDocumentPreview({
        doc,
        getDocumentPreviewUrl,
        getDocumentPreviewContent,
        getDocumentDownloadUrl,
        Swal
      });
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'No se pudo previsualizar el documento',
        confirmButtonColor: '#1e40af'
      });
    }
  };

  const sanitizePathSegment = (value, fallback = 'sin-valor') => {
    const text = value?.toString().trim() || fallback;
    return text
      .replace(/[\\/:*?"<>|]/g, '_')
      .replace(/\s+/g, ' ')
      .trim();
  };

  const getSolicitudInfoText = (solicitud) => {
    const infoRows = [
      ['Proyecto', getProyectoDisplayName(solicitud.proyecto)],
      ['Usuario', getUserName(solicitud.usuarioID)],
      ['Estado', solicitud.estado || ''],
      ['Porcentaje', solicitud.porcentaje ?? 0],
      ['Codigo empleado', solicitud.codigoEmpleado || ''],
      ['Posicion', solicitud.posicion || ''],
      ['Politica', solicitud.politica || ''],
      ['Trayecto', solicitud.trayecto || ''],
      ['Destino', solicitud.destino || ''],
      ['Empresa', solicitud.empresa || solicitud.filial || ''],
      ['Fecha inicio', solicitud.fechaInicio ? formatDate(solicitud.fechaInicio) : ''],
      ['Fecha fin', solicitud.fechaFin ? formatDate(solicitud.fechaFin) : ''],
      ['Codigo de horas', solicitud.horasCodigo || ''],
      ['Principales funciones', solicitud.comentarios || ''],
      ['Fecha creacion', solicitud.fechaCreacion ? formatDate(solicitud.fechaCreacion) : ''],
      ['Fecha actualizacion', solicitud.fechaActualizacion ? formatDate(solicitud.fechaActualizacion) : '']
    ];

    return infoRows.map(([label, value]) => `${label}: ${value ?? ''}`).join('\n');
  };

  const toZipToken = (value, fallback = 'SinDato') => {
    const normalized = value
      ?.toString()
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .replace(/[^a-zA-Z0-9\s]/g, ' ')
      .trim();

    if (!normalized) return fallback;

    const words = normalized.split(/\s+/).filter(Boolean);
    const token = words
      .map((word) => `${word.charAt(0).toUpperCase()}${word.slice(1).toLowerCase()}`)
      .join('');

    return token || fallback;
  };

  const getSolicitudZipName = (solicitud) => {
    const userName = toZipToken(getUserName(solicitud.usuarioID), 'UsuarioDesconocido');
    const destino = toZipToken(solicitud.destino, 'SinDestino');

    const fechaInicio = solicitud.fechaInicio ? new Date(solicitud.fechaInicio) : null;
    const hasValidDate = fechaInicio && !Number.isNaN(fechaInicio.getTime());
    const months = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
    const month = hasValidDate ? months[fechaInicio.getMonth()] : 'sin-mes';
    const year = hasValidDate ? fechaInicio.getFullYear() : 'SinAno';

    return sanitizePathSegment(`${userName}-${destino}-${month}-${year}`);
  };

  const handleDownloadSolicitudPackage = async () => {
    if (!selectedSolicitud || isDownloadingSolicitud) return;

    setIsDownloadingSolicitud(true);
    try {
      const token = await getAccessToken();
      const zip = new JSZip();
      const zipRootName = getSolicitudZipName(selectedSolicitud);
      const rootFolder = zip.folder(zipRootName);

      rootFolder.file('InformacionSolicitud.txt', getSolicitudInfoText(selectedSolicitud));

      const docsByCategory = solicitudDocumentos.reduce((acc, doc) => {
        const category = doc.categoria?.trim() || 'Sin categoria';
        if (!acc[category]) acc[category] = [];
        acc[category].push(doc);
        return acc;
      }, {});

      const usedFileNamesByFolder = new Map();

      for (const [category, docs] of Object.entries(docsByCategory)) {
        const normalizedCategory = category === 'General' ? 'Principales funciones' : category;
        const folderName = sanitizePathSegment(normalizedCategory, 'Sin categoria');
        const categoryFolder = rootFolder.folder(folderName);

        for (const doc of docs) {
          const response = await fetch(`${API_BASE_URL}/documentos/${doc.id}/file`, {
            headers: {
              Authorization: `Bearer ${token}`
            },
            credentials: 'include'
          });
          if (!response.ok) {
            throw new Error(`No se pudo descargar el archivo ${doc.nombre}`);
          }

          const fileBlob = await response.blob();
          const fileBuffer = await fileBlob.arrayBuffer();

          const originalName = sanitizePathSegment(doc.nombre || `documento_${doc.id}`);
          const folderKey = folderName;
          if (!usedFileNamesByFolder.has(folderKey)) {
            usedFileNamesByFolder.set(folderKey, new Set());
          }

          const usedNames = usedFileNamesByFolder.get(folderKey);
          let finalName = originalName;
          let duplicateIndex = 1;
          while (usedNames.has(finalName)) {
            const dotIndex = originalName.lastIndexOf('.');
            if (dotIndex > 0) {
              const baseName = originalName.slice(0, dotIndex);
              const extension = originalName.slice(dotIndex);
              finalName = `${baseName} (${duplicateIndex})${extension}`;
            } else {
              finalName = `${originalName} (${duplicateIndex})`;
            }
            duplicateIndex += 1;
          }

          usedNames.add(finalName);
          categoryFolder.file(finalName, fileBuffer);
        }
      }

      const zipBlob = await zip.generateAsync({ type: 'blob' });
      const zipUrl = URL.createObjectURL(zipBlob);
      const link = document.createElement('a');
      link.href = zipUrl;
      link.download = `${zipRootName}.zip`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(zipUrl);
    } catch (error) {
      if (isAuthorizationError(error)) {
        return;
      }

      Swal.fire({
        icon: 'error',
        title: 'Error al descargar',
        text: 'No se pudo generar la descarga completa de la solicitud.',
        confirmButtonColor: '#1e40af'
      });
    } finally {
      setIsDownloadingSolicitud(false);
    }
  };

  const handleExportSolicitudes = () => {
    if (!filteredSolicitudes.length) {
      Swal.fire({
        icon: 'info',
        title: 'Sin datos',
        text: 'No hay solicitudes filtradas para exportar',
        confirmButtonColor: '#1e40af'
      });
      return;
    }

    const rows = filteredSolicitudes.map((sol) => ({
      Proyecto: sol.proyecto || '',
      Usuario: sol.usuarioNombre || '',
      Email: sol.usuarioEmail || '',
      Estado: sol.estado || '',
      Porcentaje: sol.porcentaje !== null && sol.porcentaje !== undefined ? sol.porcentaje : 0,
      'Codigo empleado': sol.codigoEmpleado || '',
      Posicion: sol.posicion || '',
      Politica: sol.politica || '',
      Trayecto: sol.trayecto || '',
      Destino: sol.destino || '',
      Empresa: sol.empresa || sol.filial || '',
      'Fecha inicio': sol.fechaInicio ? formatDate(sol.fechaInicio) : '',
      'Fecha fin': sol.fechaFin ? formatDate(sol.fechaFin) : '',
      'Codigo de horas': sol.horasCodigo || '',
      'Principales funciones': sol.comentarios || '',
      'Fecha creacion': sol.fechaCreacion ? formatDate(sol.fechaCreacion) : '',
      'Fecha actualizacion': sol.fechaActualizacion ? formatDate(sol.fechaActualizacion) : ''
    }));

    const headers = Object.keys(rows[0] || {});
    const columnWidths = headers.map((header) => {
      const maxRowLength = rows.reduce((max, row) => {
        const value = row[header];
        const length = value === null || value === undefined ? 0 : value.toString().length;
        return Math.max(max, length);
      }, header.length);

      return { wch: Math.min(Math.max(maxRowLength + 2, 10), 40) };
    });

    const worksheet = XLSX.utils.json_to_sheet(rows);
    const range = XLSX.utils.decode_range(worksheet['!ref']);
    worksheet['!cols'] = columnWidths;

    const headerStyle = {
      font: { bold: true, color: { rgb: 'FFFFFF' } },
      fill: { patternType: 'solid', fgColor: { rgb: '1E40AF' } },
      alignment: { vertical: 'center', horizontal: 'center' },
      border: {
        top: { style: 'thin', color: { rgb: 'CBD5E1' } },
        bottom: { style: 'thin', color: { rgb: 'CBD5E1' } },
        left: { style: 'thin', color: { rgb: 'CBD5E1' } },
        right: { style: 'thin', color: { rgb: 'CBD5E1' } }
      }
    };

    const cellBorder = {
      top: { style: 'thin', color: { rgb: 'E2E8F0' } },
      bottom: { style: 'thin', color: { rgb: 'E2E8F0' } },
      left: { style: 'thin', color: { rgb: 'E2E8F0' } },
      right: { style: 'thin', color: { rgb: 'E2E8F0' } }
    };

    for (let row = range.s.r; row <= range.e.r; row += 1) {
      for (let col = range.s.c; col <= range.e.c; col += 1) {
        const cellRef = XLSX.utils.encode_cell({ r: row, c: col });
        const cell = worksheet[cellRef];
        if (!cell) continue;

        if (row === 0) {
          cell.s = headerStyle;
        } else {
          cell.s = { border: cellBorder };
        }
      }
    }
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Solicitudes');

    const fileDate = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(workbook, `solicitudes_${fileDate}.xlsx`);
  };

  const parseExcelDate = (value) => {
    if (!value) return undefined;
    if (typeof value === 'number') {
      const parsed = XLSX.SSF.parse_date_code(value);
      if (!parsed) return undefined;
      const date = new Date(Date.UTC(parsed.y, parsed.m - 1, parsed.d));
      return Number.isNaN(date.getTime()) ? undefined : date.toISOString().slice(0, 10);
    }

    const raw = value.toString().trim().toLowerCase();
    const match = raw.match(/^(\d{1,2})\s+de\s+([a-záéíóúñ]+)\s+de\s+(\d{4})$/i);
    if (match) {
      const day = Number(match[1]);
      const monthName = match[2]
        .normalize('NFD')
        .replace(/\p{Diacritic}/gu, '');
      const year = Number(match[3]);
      const months = {
        enero: 0,
        febrero: 1,
        marzo: 2,
        abril: 3,
        mayo: 4,
        junio: 5,
        julio: 6,
        agosto: 7,
        septiembre: 8,
        setiembre: 8,
        octubre: 9,
        noviembre: 10,
        diciembre: 11
      };
      const monthIndex = months[monthName];
      if (monthIndex !== undefined) {
        const date = new Date(Date.UTC(year, monthIndex, day));
        return Number.isNaN(date.getTime()) ? undefined : date.toISOString().slice(0, 10);
      }
    }

    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? undefined : date.toISOString().slice(0, 10);
  };

  const parsePercentage = (value) => {
    if (value === undefined || value === null || value === '') return undefined;
    const raw = typeof value === 'string' ? value.replace('%', '').trim() : value;
    const parsed = Number(raw);
    return Number.isNaN(parsed) ? undefined : parsed;
  };

  const parseEstadoImport = (value) => {
    const normalized = (value || '')
      .toString()
      .trim()
      .toLowerCase()
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '');

    if (!normalized) return 'Pendiente';
    if (normalized === 'pendiente') return 'Pendiente';
    if (normalized === 'aceptada') return 'Aceptada';
    if (normalized === 'rechazada') return 'Rechazada';
    if (normalized === 'en revision') return 'En revisión';
    return 'Pendiente';
  };

  const normalizeStringToken = (value) =>
    value
      ?.toString()
      .normalize('NFD')
      .replace(/\p{Diacritic}/gu, '')
      .trim()
      .toLowerCase() || '';

  const normalizeHeaderName = (value) =>
    normalizeStringToken(value)
      .replace(/\./g, '')
      .replace(/\s+/g, ' ');

  const getRowValueByHeaders = (row, headerAliases) => {
    const aliases = new Set(headerAliases.map(alias => normalizeHeaderName(alias)));
    const key = Object.keys(row || {}).find(currentKey => aliases.has(normalizeHeaderName(currentKey)));
    return key ? row[key] : '';
  };

  const getDestinoFromTrayecto = (trayectoCompleto) => {
    if (!trayectoCompleto) return undefined;
    const normalizedTrayecto = trayectoCompleto.toString().trim();
    if (!normalizedTrayecto) return undefined;

    const legs = normalizedTrayecto
      .split('/')
      .map(segment => segment.trim())
      .filter(Boolean)
      .map((segment) => {
        const match = segment.match(/^(.+?)\s*[-�?"]\s*(.+)$/);
        if (!match) return null;
        return {
          from: match[1].trim(),
          to: match[2].trim()
        };
      })
      .filter(Boolean);

    if (!legs.length) {
      return normalizedTrayecto;
    }

    const points = [];
    legs.forEach((leg, index) => {
      if (index === 0) {
        points.push(leg.from, leg.to);
        return;
      }

      const lastPoint = points[points.length - 1];
      if (normalizeStringToken(lastPoint) === normalizeStringToken(leg.from)) {
        points.push(leg.to);
      } else {
        points.push(leg.from, leg.to);
      }
    });

    const cleanPoints = points.filter(point => point?.trim());
    if (!cleanPoints.length) return undefined;
    if (cleanPoints.length === 1) return cleanPoints[0];

    const origin = cleanPoints[0];
    const finalPoint = cleanPoints[cleanPoints.length - 1];
    const isRoundTrip = normalizeStringToken(origin) === normalizeStringToken(finalPoint) && cleanPoints.length > 2;

    if (!isRoundTrip) {
      return legs[0]?.to || cleanPoints[1] || finalPoint;
    }

    if (cleanPoints.length % 2 === 1) {
      return cleanPoints[Math.floor(cleanPoints.length / 2)];
    }

    const leftCenter = cleanPoints[(cleanPoints.length / 2) - 1];
    const rightCenter = cleanPoints[cleanPoints.length / 2];

    if (normalizeStringToken(leftCenter) === normalizeStringToken(rightCenter)) {
      return leftCenter;
    }

    return `${leftCenter} / ${rightCenter}`;
  };

  const handleImportExcel = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      setIsImporting(true);
      const buffer = await file.arrayBuffer();
      const workbook = XLSX.read(buffer, { type: 'array' });
      const worksheet = workbook.Sheets[workbook.SheetNames[0]];
      if (!worksheet) {
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: 'No se encontro una hoja en el Excel',
          confirmButtonColor: '#1e40af'
        });
        return;
      }

      const rows = XLSX.utils.sheet_to_json(worksheet, { defval: '' });
      if (!rows.length) {
        Swal.fire({
          icon: 'info',
          title: 'Sin datos',
          text: 'El Excel no contiene filas para importar',
          confirmButtonColor: '#1e40af'
        });
        return;
      }

      const rowHeaders = Object.keys(rows[0] || {}).map(normalizeHeaderName);
      const requiredHeaderGroups = [
        ['Correo electrónico', 'correo electronico', 'Email']
      ];
      const missingHeaders = requiredHeaderGroups
        .map(group => group.some(option => rowHeaders.includes(normalizeHeaderName(option))) ? null : group[0])
        .filter(Boolean);
      if (missingHeaders.length > 0) {
        Swal.fire({
          icon: 'error',
          title: 'Formato incorrecto',
          text: `Faltan columnas requeridas: ${missingHeaders.join(', ')}`,
          confirmButtonColor: '#1e40af'
        });
        return;
      }

      const emailsToResolve = Array.from(new Set(
        rows
          .map((row) => getRowValueByHeaders(row, ['Correo electrónico', 'correo electronico', 'Email']))
          .map((value) => (value || '').toString().trim().toLowerCase())
          .filter(Boolean)
      ));

      const resolvedUsers = emailsToResolve.length > 0
        ? await resolveUsersByEmails(emailsToResolve)
        : [];
      const usersByEmail = new Map(
        resolvedUsers
          .filter((resolvedUser) => resolvedUser?.email)
          .map((resolvedUser) => [resolvedUser.email.toLowerCase(), resolvedUser])
      );

      let createdCount = 0;
      let failedCount = 0;

      for (let i = 0; i < rows.length; i += 1) {
        const row = rows[i];
        const rowNumber = i + 2;
        const emailCell = getRowValueByHeaders(row, ['Correo electrónico', 'correo electronico', 'Email']);
        const email = emailCell ? emailCell.toString().trim().toLowerCase() : '';
        const user = usersByEmail.get(email);

        if (!email) {
          failedCount += 1;
          continue;
        }

        const usuarioOID = user?.oid || email;
        const userMeta = {
          nombre: user?.nombre || email,
          email: user?.email || email
        };

        if (!user?.oid) {
        }

        const proyecto = '';

        const comentariosCell = getRowValueByHeaders(row, ['Principales funciones']);
        const comentarios = comentariosCell
          ? comentariosCell.toString()
          : '';

        const porcentaje = parsePercentage(getRowValueByHeaders(row, ['Porcentaje']));
        const trayectoCompleto = getRowValueByHeaders(row, ['trayecto completo texto']);
        const destino = getDestinoFromTrayecto(trayectoCompleto)
          || getRowValueByHeaders(row, ['Destino', 'Pais'])?.toString();

        const extraFields = {
          codigoEmpleado: getRowValueByHeaders(row, ['codigo empleado', 'Codigo empleado', 'Código empleado'])?.toString() || undefined,
          posicion: getRowValueByHeaders(row, ['Posicion', 'Posición'])?.toString() || undefined,
          politica: getRowValueByHeaders(row, ['Politica', 'Política'])?.toString() || undefined,
          trayecto: trayectoCompleto ? trayectoCompleto.toString() : undefined,
          destino: destino ? destino.toString() : undefined,
          fechaInicio: parseExcelDate(getRowValueByHeaders(row, ['fecha salida', 'Fecha inicio'])),
          fechaFin: parseExcelDate(getRowValueByHeaders(row, ['fecha fin del viaje', 'Fecha fin'])),
          empresa: getRowValueByHeaders(row, ['Unidad organizativa', 'Empresa'])?.toString() || undefined,
          horasCodigo: getRowValueByHeaders(row, ['Codigo de horas'])?.toString() || undefined,
          porcentaje
        };

        try {
          const created = await createSolicitud(usuarioOID, proyecto, comentarios, extraFields, userMeta);
          if (!created) {
            failedCount += 1;
            continue;
          }

          const estadoImportado = parseEstadoImport(getRowValueByHeaders(row, ['Estado']));
          if (estadoImportado !== 'Pendiente') {
            await updateSolicitudEstado(created.id, estadoImportado, porcentaje, { silent: true });
          }

          createdCount += 1;
        } catch (error) {
          failedCount += 1;
        }
      }

      const title = failedCount > 0 ? 'Importacion no completada' : 'Importacion completada';
      const text = failedCount > 0
        ? `Se importaron ${createdCount} solicitudes. ${failedCount} fallaron.`
        : `Se importaron ${createdCount} solicitudes correctamente.`;

      Swal.fire({
        icon: failedCount > 0 ? 'warning' : 'success',
        title,
        text,
        confirmButtonColor: '#1e40af'
      });
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'No se pudo importar el Excel',
        confirmButtonColor: '#1e40af'
      });
    } finally {
      setIsImporting(false);
      if (event.target) {
        event.target.value = '';
      }
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

  const handleDeleteSolicitud = async () => {
    if (!selectedSolicitud) return;

    const result = await Swal.fire({
      title: '¿Eliminar viaje?'
      ,text: 'Se eliminara la solicitud, sus documentos y mensajes de forma permanente'
      ,icon: 'warning'
      ,showCancelButton: true
      ,confirmButtonColor: '#dc2626'
      ,cancelButtonColor: '#6b7280'
      ,confirmButtonText: 'Eliminar'
      ,cancelButtonText: 'Cancelar'
    });

    if (result.isConfirmed) {
      const deleted = await deleteSolicitud(selectedSolicitud.id);
      if (deleted) {
        closeDetailPanel();
      }
    }
  };

  if (showLoadingScreen) {
    return (
      <div
        className={`relative overflow-hidden min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 flex items-center justify-center ${
          isLoadingClosing ? 'animate-fade-out' : 'animate-fade-in'
        }`}
      >
        <div className="loading-blob loading-blob-1" aria-hidden="true"></div>
        <div className="loading-blob loading-blob-2" aria-hidden="true"></div>

        <div className={`loading-center relative z-10 text-center ${isLoadingClosing ? 'animate-pop-out' : 'animate-pop-in'}`}>
          <div className="loading-spinner-wrap">
            <div className="loading-orbit"></div>
            <div className="loading-orbit loading-orbit-2"></div>
            <div className="loading-orbit loading-orbit-3"></div>
            <div className="loading-core-dot" aria-hidden="true"></div>
          </div>
          <img
            src="/images/logopll_positivo.svg"
            alt="Perez-Llorca"
            className="loading-brand"
          />
          <p className="text-gray-800 text-2xl sm:text-3xl font-semibold mt-5">Cargando información...</p>
          <p className="text-gray-500 text-base mt-1">Estamos recuperando los datos del dashboard</p>
          <div className="mt-4 flex items-center justify-center gap-2" aria-hidden="true">
            <span className="loading-dot"></span>
            <span className="loading-dot loading-dot-2"></span>
            <span className="loading-dot loading-dot-3"></span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
      {/* Header */}
      <header className="bg-primary text-white shadow-lg fixed top-0 inset-x-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
          <div className="relative flex items-center justify-between">
            <div className="flex items-center h-7 sm:h-8 lg:h-9">
              <img
                src="/images/perez-llorca-homelogo.png"
                alt="Perez-Llorca"
                className="h-full w-auto max-w-[140px] sm:max-w-[170px] lg:max-w-[190px] object-contain"
              />
            </div>
            <div className="flex items-center gap-2 xl:hidden">
              <button
                type="button"
                ref={mobileMessagesButtonRef}
                onClick={toggleMessagesDropdown}
                className="relative bg-white bg-opacity-20 hover:bg-opacity-30 p-2 rounded-lg transition-colors"
                title="Mensajes sin leer"
                aria-label="Mensajes sin leer"
              >
                <Bell className="w-5 h-5" />
                {unreadMessages > 0 && (
                  <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                    {unreadMessages}
                  </span>
                )}
              </button>
              <button
                type="button"
                ref={mobileDocsButtonRef}
                onClick={toggleDocsDropdown}
                className="relative bg-white bg-opacity-20 hover:bg-opacity-30 p-2 rounded-lg transition-colors"
                title="Documentos nuevos (24h)"
                aria-label="Documentos nuevos"
              >
                <AlertCircle className="w-5 h-5" />
                {newDocsCount > 0 && (
                  <span className="absolute -top-1 -right-1 bg-orange-500 text-white text-xs font-bold rounded-full w-5 h-5 flex items-center justify-center">
                    {newDocsCount}
                  </span>
                )}
              </button>
              <button
                type="button"
                className="bg-white bg-opacity-20 hover:bg-opacity-30 p-2 rounded-lg transition-colors"
                onClick={() => setIsMobileMenuOpen(prev => !prev)}
                aria-label={isMobileMenuOpen ? 'Cerrar menu' : 'Abrir menu'}
                aria-expanded={isMobileMenuOpen}
              >
                {isMobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>

            {showMessagesDropdown && (
              <div
                ref={mobileMessagesDropdownRef}
                className={`xl:hidden absolute right-0 top-12 w-80 max-w-[calc(100vw-2rem)] bg-white rounded-lg shadow-xl border border-gray-200 z-50 max-h-96 overflow-y-auto ${
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
                        !m.leidoPorAdmin &&
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
                            <p className="font-medium text-gray-900 text-sm">{getProyectoDisplayName(sol.proyecto)}</p>
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

            {showDocsDropdown && (
              <div
                ref={mobileDocsDropdownRef}
                className={`xl:hidden absolute right-0 top-12 w-80 max-w-[calc(100vw-2rem)] bg-white rounded-lg shadow-xl border border-gray-200 z-50 max-h-96 overflow-y-auto ${
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
                            <p className="font-medium text-gray-900 text-sm">{getProyectoDisplayName(sol.proyecto)}</p>
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
          <div
            className={`flex flex-col gap-3 transition-all duration-300 ease-in-out overflow-hidden xl:flex-row xl:items-center xl:justify-end xl:space-x-4 xl:overflow-visible xl:transition-none xl:max-h-none xl:opacity-100 xl:translate-y-0 xl:pointer-events-auto ${
              isMobileMenuOpen
                ? 'max-h-96 opacity-100 translate-y-0'
                : 'max-h-0 opacity-0 -translate-y-1 pointer-events-none'
            }`}
          >
            <div className="flex flex-wrap xl:flex-nowrap items-center gap-2 xl:gap-3 w-full xl:w-auto">
              {!isViewRole && (
                <button
                  onClick={() => setIsCreateModalOpen(true)}
                  className="bg-white bg-opacity-20 text-white px-4 py-2 rounded-lg hover:bg-opacity-30 transition-colors flex items-center space-x-2 font-semibold shadow-md w-full sm:w-auto justify-center whitespace-nowrap"
                >
                  <Plus className="w-5 h-5" />
                  <span>Nueva Solicitud</span>
                </button>
              )}

              <button
                onClick={handleExportSolicitudes}
                className="bg-white bg-opacity-20 text-white px-4 py-2 rounded-lg hover:bg-opacity-30 transition-colors flex items-center space-x-2 font-semibold shadow-md w-full sm:w-auto justify-center whitespace-nowrap"
              >
                <FileDown className="w-5 h-5" />
                <span>Exportar Excel</span>
              </button>

              {!isViewRole && (
                <>
                  <button
                    onClick={() => importInputRef.current?.click()}
                    disabled={isImporting}
                    className="bg-white bg-opacity-20 text-white px-4 py-2 rounded-lg hover:bg-opacity-30 transition-colors flex items-center space-x-2 font-semibold shadow-md w-full sm:w-auto justify-center disabled:opacity-60 disabled:cursor-not-allowed whitespace-nowrap"
                  >
                    <Upload className="w-5 h-5" />
                    <span>{isImporting ? 'Importando...' : 'Importar Excel'}</span>
                  </button>
                  <input
                    ref={importInputRef}
                    type="file"
                    accept=".xlsx,.xls"
                    className="hidden"
                    onChange={handleImportExcel}
                  />
                </>
              )}

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
                            !m.leidoPorAdmin && 
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
                                <p className="font-medium text-gray-900 text-sm">{getProyectoDisplayName(sol.proyecto)}</p>
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
                                <p className="font-medium text-gray-900 text-sm">{getProyectoDisplayName(sol.proyecto)}</p>
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

            <div className="flex items-center justify-between gap-3 sm:justify-start w-full xl:w-auto">
              <div className="text-left sm:text-right min-w-0">
                <p className="font-semibold break-all sm:break-normal max-w-[70vw] sm:max-w-none">
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
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-24 pb-6 sm:pt-28 sm:pb-8 lg:pt-24">
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
              setFilterEstado('En revisión');
              setCurrentPage(1);
            }}
            className={`relative overflow-hidden rounded-xl shadow-md p-4 sm:p-6 text-left transition-colors hover:shadow-lg ${estadoFiltroStyles['En revisión'].hover} ${filterEstado === 'En revisión' ? estadoFiltroStyles['En revisión'].selected : 'bg-white'}`}
            aria-label="Filtrar Solicitudes En Revisión"
          >
            <div className="relative z-10">
              <p className="text-gray-600 text-xs sm:text-sm">Solicitudes En Revisión</p>
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por empleado o destino..."
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
            <table className="w-full table-fixed">
              <colgroup>
                <col className="w-[20%]" />
                <col className="w-[21%]" />
                <col className="w-[18%]" />
                <col className="w-[18%]" />
                <col className="w-[11%]" />
                <col className="w-[12%]" />
              </colgroup>
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-4 lg:px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Usuario
                  </th>
                  <th className="px-4 lg:px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Proyecto
                  </th>
                  <th className="px-4 lg:px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider hidden md:table-cell">
                    Destino
                  </th>
                  <th className="px-4 lg:px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider hidden md:table-cell">
                    Fechas
                  </th>
                  <th className="px-4 lg:px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider hidden lg:table-cell">
                    Documentos
                  </th>
                  <th className="px-4 lg:px-6 py-3 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">
                    Estado
                  </th>
                </tr>
              </thead>
              <tbody
                className="divide-y divide-gray-200 animate-fade-in-up"
                key={`table-page-${currentPage}-${filterEstado}-${filterFecha}-${searchTerm}`}
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
                        <td className="px-4 lg:px-6 py-4 text-sm text-gray-900 align-top">
                          <div className="font-medium text-gray-900">
                            {getUserName(solicitud.usuarioID)}
                          </div>
                        </td>
                        <td className="px-4 lg:px-6 py-4 align-top">
                          <div className="text-sm font-medium text-gray-900 truncate max-w-[12rem]">
                            {getProyectoDisplayName(solicitud.proyecto)}
                          </div>
                          <div className="text-sm text-gray-500 truncate max-w-[12rem]">
                            {solicitud.comentarios?.trim() ? solicitud.comentarios : 'Sin descripcion'}
                          </div>
                        </td>
                        <td className="px-4 lg:px-6 py-4 text-sm text-gray-600 hidden md:table-cell whitespace-nowrap align-top">
                          {solicitud.destino?.trim() ? solicitud.destino : 'Sin destino'}
                        </td>
                        <td className="px-4 lg:px-6 py-4 text-sm text-gray-600 whitespace-nowrap hidden md:table-cell align-top">
                          <div>Inicio: {solicitud.fechaInicio ? formatDate(solicitud.fechaInicio) : 'Sin fecha'}</div>
                          <div>Fin: {solicitud.fechaFin ? formatDate(solicitud.fechaFin) : 'Sin fecha'}</div>
                        </td>
                        <td className="px-4 lg:px-6 py-4 text-sm text-gray-600 hidden lg:table-cell whitespace-nowrap align-top">
                          {numDocs} documento{numDocs !== 1 ? 's' : ''}
                        </td>
                        <td className="px-4 lg:px-6 py-4 align-top whitespace-nowrap">
                          {renderEstadoSelector(solicitud, { context: 'table' })}
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
          key={`cards-page-${currentPage}-${filterEstado}-${filterFecha}-${searchTerm}`}
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
                      {solicitud.cargo?.trim() && (
                        <p className="text-xs text-gray-500 mt-0.5">{solicitud.cargo}</p>
                      )}
                    </div>
                    {renderEstadoSelector(solicitud, { context: 'card' })}
                  </div>

                  <div className="mt-3">
                    <p className="text-[11px] uppercase tracking-wider text-gray-400">Proyecto</p>
                    <p className="text-sm font-semibold text-gray-900">
                      {getProyectoDisplayName(solicitud.proyecto)}
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
                      <span className="text-[11px] uppercase tracking-wider text-gray-400">Destino</span>
                      <span className="font-semibold text-gray-800">{solicitud.destino?.trim() ? solicitud.destino : 'Sin destino'}</span>
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
                  <div className="flex flex-col gap-3">
                    <div className="min-w-0">
                      <h3 className="text-xl sm:text-2xl font-bold">{getProyectoDisplayName(selectedSolicitud.proyecto)}</h3>
                    </div>
                    <div className="mt-2 flex items-center gap-2 sm:mt-1 sm:pb-3 text-blue-100">
                      <span className="text-sm font-medium">Estado:</span>
                      {renderEstadoSelector(selectedSolicitud, { menuAlignment: 'left', context: 'detail' })}
                    </div>
                  </div>
                  {!isViewRole && (
                    <div className="sm:hidden mt-3 mb-4 grid grid-cols-2 gap-2 w-full">
                      <button
                        type="button"
                        onClick={handleOpenEditSolicitud}
                        className="bg-white bg-opacity-20 text-white px-3 py-2.5 rounded-lg hover:bg-opacity-30 transition-colors text-sm font-semibold inline-flex items-start justify-center gap-2 w-full shadow-md min-h-[56px] min-w-0"
                        title="Editar solicitud"
                      >
                        <Edit2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        <span className="leading-tight text-center break-words">Editar<br />información</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleDownloadSolicitudPackage}
                        disabled={isDownloadingSolicitud}
                        className="bg-white bg-opacity-20 text-white px-3 py-2.5 rounded-lg hover:bg-opacity-30 transition-colors disabled:opacity-60 disabled:cursor-not-allowed text-sm font-semibold inline-flex items-start justify-center gap-2 w-full shadow-md min-h-[56px] min-w-0"
                        title="Descargar solicitud completa"
                      >
                        {isDownloadingSolicitud ? (
                          <>
                            <span className="inline-block w-3.5 h-3.5 mt-0.5 border-2 border-white border-t-transparent rounded-full animate-spin flex-shrink-0" aria-hidden="true"></span>
                            <span className="leading-tight text-center break-words">Descargando...</span>
                          </>
                        ) : (
                          <>
                            <Download className="w-4 h-4 mt-0.5 flex-shrink-0" />
                            <span className="leading-tight text-center break-words">Descargar<br />información</span>
                          </>
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={handleDeleteSolicitud}
                        className="col-span-2 bg-red-600 bg-opacity-90 text-white px-3 py-2.5 rounded-lg hover:bg-red-700 transition-colors text-sm font-semibold inline-flex items-start justify-center gap-2 w-full shadow-md min-h-[56px] min-w-0"
                        title="Eliminar viaje"
                      >
                        <Trash2 className="w-4 h-4 mt-0.5 flex-shrink-0" />
                        <span className="leading-tight text-center break-words">Eliminar<br />viaje</span>
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
                        Destino: {selectedSolicitud.destino?.trim() ? selectedSolicitud.destino : 'Sin destino'}
                      </span>
                      <span className="flex items-center">
                        <Building2 className="w-4 h-4 mr-1" />
                        Empresa: {selectedSolicitud.empresa?.trim() ? selectedSolicitud.empresa : selectedSolicitud.filial?.trim() ? selectedSolicitud.filial : 'Sin dato'}
                      </span>
                      <span className="flex items-center">
                        <Percent className="w-4 h-4 mr-1" />
                        Porcentaje: {selectedSolicitud.porcentaje !== null && selectedSolicitud.porcentaje !== undefined && selectedSolicitud.porcentaje !== '' ? `${selectedSolicitud.porcentaje}%` : '0%'}
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="flex items-start">
                        <Plane className="w-4 h-4 mr-1 mt-0.5 flex-shrink-0" />
                        <span>
                          Trayecto: {selectedSolicitud.trayecto?.trim() ? selectedSolicitud.trayecto : 'Sin dato'}
                        </span>
                      </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-3">
                      <span className="flex items-center">
                        <Clock className="w-4 h-4 mr-1" />
                        Codigo de horas: {selectedSolicitud.horasCodigo?.trim() ? selectedSolicitud.horasCodigo : 'Sin dato'}
                      </span>
                    </div>
                    {(selectedSolicitud.codigoEmpleado?.toString().trim() || selectedSolicitud.posicion?.toString().trim() || selectedSolicitud.politica?.toString().trim()) && (
                      <div className="flex flex-wrap items-center gap-3">
                        {selectedSolicitud.codigoEmpleado?.toString().trim() && (
                          <span>Codigo empleado: {selectedSolicitud.codigoEmpleado}</span>
                        )}
                        {selectedSolicitud.posicion?.toString().trim() && (
                          <span>Posicion: {selectedSolicitud.posicion}</span>
                        )}
                        {selectedSolicitud.politica?.toString().trim() && (
                          <span>Politica: {selectedSolicitud.politica}</span>
                        )}
                      </div>
                    )}
                  </div>
                  </div>
                </div>
                <button
                  onClick={closeDetailPanel}
                  aria-label="Cerrar detalle"
                  className="absolute top-4 right-4 text-white hover:bg-white hover:bg-opacity-20 p-2 rounded-lg transition-colors"
                >
                  <XCircle className="w-6 h-6" />
                </button>
                {!isViewRole && (
                  <div className="hidden sm:flex absolute top-4 right-16 items-center gap-2">
                    <button
                      type="button"
                      onClick={handleOpenEditSolicitud}
                      className="bg-white bg-opacity-20 text-white px-3 py-2 rounded-lg hover:bg-opacity-30 transition-colors text-sm font-semibold inline-flex items-center gap-2 shadow-md"
                      title="Editar solicitud"
                    >
                      <Edit2 className="w-4 h-4" />
                      Editar información
                    </button>
                    <button
                      type="button"
                      onClick={handleDownloadSolicitudPackage}
                      disabled={isDownloadingSolicitud}
                      className="bg-white bg-opacity-20 text-white px-3 py-2 rounded-lg hover:bg-opacity-30 transition-colors disabled:opacity-60 disabled:cursor-not-allowed text-sm font-semibold inline-flex items-center gap-2 shadow-md"
                      title="Descargar solicitud completa"
                    >
                      {isDownloadingSolicitud ? (
                        <>
                          <span className="inline-block w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" aria-hidden="true"></span>
                          Descargando...
                        </>
                      ) : (
                        <>
                          <Download className="w-4 h-4" />
                          Descargar información
                        </>
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={handleDeleteSolicitud}
                      className="bg-red-600 bg-opacity-90 text-white px-3 py-2 rounded-lg hover:bg-red-700 transition-colors text-sm font-semibold inline-flex items-center gap-2 shadow-md"
                      title="Eliminar viaje"
                    >
                      <Trash2 className="w-4 h-4" />
                      Eliminar viaje
                    </button>
                  </div>
                )}
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
                                <div className="min-w-0">
                                  <span className="block text-sm font-normal text-gray-600 truncate">{doc.nombre}</span>
                                  <span className="block text-xs text-gray-500">{getDocumentUploadDateLabel(doc)}</span>
                                </div>
                              </div>
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleDownloadDocument(doc)}
                                  className="flex-shrink-0 text-primary hover:text-blue-700 p-1 rounded transition-colors"
                                  title="Previsualizar"
                                >
                                  <FileSearch className="w-4 h-4" />
                                </button>
                                {!isViewRole && (
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteDocument(doc)}
                                    className="flex-shrink-0 text-red-600 hover:text-red-700 p-1 rounded transition-colors"
                                    title="Eliminar"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                )}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    {/* Vuelos y visados */}
                    <div>
                      <div className="flex items-center space-x-2 mb-2">
                        <svg className="w-5 h-5 text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 12h14M12 5l7 7-7 7" />
                        </svg>
                        <h5 className="text-sm font-semibold text-gray-900">Vuelos y visados</h5>
                      </div>
                      <div className="space-y-2">
                        {solicitudDocumentos.filter(doc => doc.categoria === 'Vuelos y visados' || doc.categoria === 'Vuelos').length === 0 ? (
                          <p className="text-gray-500 text-xs py-2 pl-7">No hay documentos en esta categoría</p>
                        ) : (
                          solicitudDocumentos.filter(doc => doc.categoria === 'Vuelos y visados' || doc.categoria === 'Vuelos').map(doc => (
                            <div key={doc.id} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                              <div className="flex items-center space-x-2 flex-1 min-w-0">
                                <div className="min-w-0">
                                  <span className="block text-sm font-normal text-gray-600 truncate">{doc.nombre}</span>
                                  <span className="block text-xs text-gray-500">{getDocumentUploadDateLabel(doc)}</span>
                                </div>
                              </div>
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleDownloadDocument(doc)}
                                  className="flex-shrink-0 text-primary hover:text-blue-700 p-1 rounded transition-colors"
                                  title="Previsualizar"
                                >
                                  <FileSearch className="w-4 h-4" />
                                </button>
                                {!isViewRole && (
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteDocument(doc)}
                                    className="flex-shrink-0 text-red-600 hover:text-red-700 p-1 rounded transition-colors"
                                    title="Eliminar"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                )}
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
                                <div className="min-w-0">
                                  <span className="block text-sm font-normal text-gray-600 truncate">{doc.nombre}</span>
                                  <span className="block text-xs text-gray-500">{getDocumentUploadDateLabel(doc)}</span>
                                </div>
                              </div>
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleDownloadDocument(doc)}
                                  className="flex-shrink-0 text-primary hover:text-blue-700 p-1 rounded transition-colors"
                                  title="Previsualizar"
                                >
                                  <FileSearch className="w-4 h-4" />
                                </button>
                                {!isViewRole && (
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteDocument(doc)}
                                    className="flex-shrink-0 text-red-600 hover:text-red-700 p-1 rounded transition-colors"
                                    title="Eliminar"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                )}
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
                        const isCurrentUser = isCurrentUserMessage(mensaje);
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
                                {getMessageSenderName(mensaje)}
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
                      placeholder={isViewRole ? 'Debes ser administrador para poder enviar mensajes' : isSelectedSolicitudClosed ? 'La solicitud está cerrada y no admite nuevos mensajes' : 'Escribe un mensaje...'}
                      disabled={isViewRole || isSelectedSolicitudClosed}
                      className="flex-1 px-4 py-2 text-xs sm:text-base border border-gray-200 rounded-lg focus:outline-none focus:border-primary disabled:bg-gray-100 disabled:text-gray-500"
                    />
                    <button
                      onClick={handleSendMessage}
                      disabled={!newMessage.trim() || isViewRole || isSelectedSolicitudClosed}
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
        availableUsers={availableUsers}
        loadingUsers={loadingUsers}
      />

      <EditSolicitudModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        onSubmit={handleSaveEditedSolicitud}
        initialData={selectedSolicitud}
      />
    </div>
  );
};

export default AdminDashboard;
