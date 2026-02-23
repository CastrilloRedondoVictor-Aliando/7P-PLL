import { useState, useEffect, useCallback, useRef } from 'react';
import { useMsal } from '@azure/msal-react';
import { HubConnectionBuilder, LogLevel } from '@microsoft/signalr';
import Swal from 'sweetalert2';
import {AuthContext } from './AuthContextDefinition';
import { apiRequest } from '../config/api';
import { loginRequest } from '../config/msalConfig';

export const AuthProvider = ({ children }) => {
  const { instance, accounts } = useMsal();
  const [user, setUser] = useState(() => {
    // Inicializar desde sessionStorage (más seguro que localStorage para tokens)
    const savedUser = sessionStorage.getItem('user');
    return savedUser ? JSON.parse(savedUser) : null;
  });
  const [solicitudes, setSolicitudes] = useState([]);
  const [documentos, setDocumentos] = useState([]);
  const [mensajes, setMensajes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isSignalRConnected, setIsSignalRConnected] = useState(false);
  const connectionRef = useRef(null);

  // Sincronizar con sessionStorage cuando cambie el usuario
  useEffect(() => {
    if (user) {
      sessionStorage.setItem('user', JSON.stringify(user));
    } else {
      sessionStorage.removeItem('user');
    }
  }, [user]);

  // Marcar como inicializado después de un momento
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsInitializing(false);
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  // Cargar datos cuando el usuario inicie sesión
  useEffect(() => {
    if (user && !isInitializing) {
      loadData();
    } else if (!user && !isInitializing) {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, isInitializing]);

  // Función auxiliar para obtener el token de acceso
  const getAccessToken = async () => {
    if (accounts.length === 0) {
      throw new Error('No hay cuenta autenticada');
    }

    try {
      const response = await instance.acquireTokenSilent({
        ...loginRequest,
        account: accounts[0]
      });
      return response.accessToken;
    } catch (error) {
      console.error('Error obteniendo token silenciosamente:', error);
      // Si falla el token silencioso, intentar con popup
      try {
        const response = await instance.acquireTokenPopup(loginRequest);
        return response.accessToken;
      } catch (popupError) {
        console.error('Error obteniendo token con popup:', popupError);
        throw popupError;
      }
    }
  };

  // Manejar login exitoso de MSAL - sincronizar con backend
  const handleLoginSuccess = useCallback(async (accessToken = null) => {
    try {
      setLoading(true);
      
      // Si no se proporciona token, obtenerlo
      const token = accessToken || await getAccessToken();
      
      // Sincronizar usuario con backend
      const data = await apiRequest('/auth/sync-user', {
        method: 'POST',
        body: JSON.stringify({ token })
      });
      
      setUser(data.user);
      
      // Inicializar conexión SignalR después del login exitoso
      await initializeSignalR();
      
      return true;
    } catch (error) {
      console.error('Error sincronizando usuario:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error de autenticación',
        text: 'No se pudo sincronizar tu usuario. Por favor, intenta de nuevo.',
        confirmButtonColor: '#1e40af'
      });
      return false;
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Inicializar conexión SignalR (usando @microsoft/signalr con Azure SignalR Service)
  const initializeSignalR = async () => {
    try {
      if (connectionRef.current) {
        console.log('⚠️ Conexión SignalR ya existe, cerrando anterior...');
        await connectionRef.current.stop();
        connectionRef.current = null;
      }

      const token = await getAccessToken();
      
      // Obtener URL y token de SignalR desde el backend
      const negotiateResponse = await apiRequest('/signalr/negotiate', {
        method: 'POST',
        token
      });

      console.log('🔑 Token de SignalR obtenido, iniciando conexión...');

      // Crear conexión SignalR usando Microsoft SignalR client
      const connection = new HubConnectionBuilder()
        .withUrl(negotiateResponse.url, {
          accessTokenFactory: () => negotiateResponse.accessToken
        })
        .withAutomaticReconnect([0, 2000, 10000, 30000])
        .configureLogging(LogLevel.Information)
        .build();

      // Event: Recibir mensaje nuevo
      connection.on('ReceiveMessage', (mensaje) => {
        console.log('📩 Mensaje recibido en tiempo real:', mensaje);
        setMensajes(prev => {
          // Evitar duplicados
          const exists = prev.some(m => m.id === mensaje.id);
          if (exists) return prev;
          return [...prev, mensaje];
        });
      });

      // Event: Reconectando
      connection.onreconnecting(error => {
        console.warn('🔄 SignalR reconectando...', error);
        setIsSignalRConnected(false);
      });

      // Event: Reconectado
      connection.onreconnected(connectionId => {
        console.log('✅ SignalR reconectado:', connectionId);
        setIsSignalRConnected(true);
      });

      // Event: Conexión cerrada
      connection.onclose(error => {
        console.error('❌ SignalR desconectado:', error);
        setIsSignalRConnected(false);
      });

      // Iniciar conexión
      await connection.start();
      console.log('✅ Conexión SignalR establecida');
      
      connectionRef.current = connection;
      setIsSignalRConnected(true);
    } catch (error) {
      console.error('❌ Error inicializando SignalR:', error);
      setIsSignalRConnected(false);
    }
  };

  // Cleanup: Cerrar conexión SignalR al desmontar
  useEffect(() => {
    return () => {
      if (connectionRef.current) {
        console.log('🗑️ Cerrando conexión SignalR...');
        connectionRef.current.stop();
        connectionRef.current = null;
      }
    };
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Obtener token para las peticiones
      const token = await getAccessToken();
      
      // Cargar solicitudes
      const queryParams = user.rol === 'user' 
        ? `?usuarioID=${user.id}&rol=user` 
        : '';
      const solicitudesData = await apiRequest(`/solicitudes${queryParams}`, { token });
      setSolicitudes(solicitudesData);

      // Cargar documentos
      const documentosData = await apiRequest('/documentos', { token });
      setDocumentos(documentosData);

      // Cargar mensajes
      const mensajesData = await apiRequest('/mensajes', { token });
      setMensajes(mensajesData);
    } catch (error) {
      console.error('Error cargando datos:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'No se pudieron cargar los datos',
        confirmButtonColor: '#1e40af'
      });
    } finally {
      setLoading(false);
    }
  };

  const login = async () => {
    try {
      // Iniciar login con redirect de MSAL
      await instance.loginRedirect(loginRequest);
      // El callback se maneja en App.jsx
      return true;
    } catch (error) {
      console.error('Error en login:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'No se pudo iniciar sesión. Por favor, intenta de nuevo.',
        confirmButtonColor: '#1e40af'
      });
      return false;
    }
  };

  const logout = async () => {
    try {
      setUser(null);
      await instance.logoutRedirect();
    } catch (error) {
      console.error('Error en logout:', error);
      // Forzar limpieza aunque falle MSAL
      setUser(null);
      sessionStorage.removeItem('user');
    }
  };

  const uploadDocument = async (solicitudID, file, categoria) => {
    try {
      const token = await getAccessToken();

      const formData = new FormData();
      formData.append('solicitudID', solicitudID);
      formData.append('categoria', categoria);
      formData.append('file', file);

      const data = await apiRequest('/documentos', {
        method: 'POST',
        body: formData,
        token
      });

      
      setDocumentos(prevDocumentos => [...prevDocumentos, data]);
      
      Swal.fire({
        icon: 'success',
        title: '¡Documento subido!',
        text: `${file.name} se ha subido correctamente`,
        confirmButtonColor: '#1e40af',
        timer: 2000,
        showConfirmButton: false
      });
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'No se pudo subir el documento',
        confirmButtonColor: '#1e40af'
      });
      console.error('Error subiendo documento:', error);
    }
  };

  const getDocumentDownloadUrl = async (documentoId) => {
    const token = await getAccessToken();
    const data = await apiRequest(`/documentos/${documentoId}/download`, { token });
    return data.url;
  };

  const deleteDocument = async (documentoId) => {
    try {
      const token = await getAccessToken();
      await apiRequest(`/documentos/${documentoId}`, {
        method: 'DELETE',
        token
      });

      setDocumentos(prev => prev.filter(doc => doc.id !== documentoId));

      Swal.fire({
        icon: 'success',
        title: 'Documento eliminado',
        text: 'El documento se ha eliminado correctamente',
        confirmButtonColor: '#1e40af',
        timer: 2000,
        showConfirmButton: false
      });
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'No se pudo eliminar el documento',
        confirmButtonColor: '#1e40af'
      });
      console.error('Error eliminando documento:', error);
    }
  };

  const sendMessage = async (solicitudID, contenido) => {
    try {
      const token = await getAccessToken();
      
      const data = await apiRequest('/signalr/send-message', {
        method: 'POST',
        body: JSON.stringify({
          solicitudID,
          texto: contenido,
          rol: user.rol
        }),
        token
      });

      setMensajes(prev => {
        const exists = prev.some(m => m.id === data.id);
        if (exists) return prev;
        return [...prev, data];
      });

      console.log('✅ Mensaje enviado:', data);
      return data;
    } catch (error) {
      console.error('❌ Error enviando mensaje:', error);
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'No se pudo enviar el mensaje',
        confirmButtonColor: '#1e40af'
      });
      throw error;
    }
  };

  const updateSolicitudEstado = async (solicitudID, nuevoEstado) => {
    const solicitudActual = solicitudes.find(s => s.id === solicitudID);
    
    if (!solicitudActual) {
      throw new Error('Solicitud no encontrada');
    }

    try {
      const token = await getAccessToken();
      const data = await apiRequest(`/solicitudes/${solicitudID}`, {
        method: 'PUT',
        body: JSON.stringify({
          proyecto: solicitudActual.proyecto,
          descripcion: solicitudActual.comentarios,
          estado: nuevoEstado
        }),
        token
      });

      // Verificar si el backend devolvió información del usuario
      let solicitudActualizada = data;
      if (!data.usuarioNombre || !data.cargo) {
        try {
          const token = await getAccessToken();
          const usuarios = await apiRequest('/auth/users', { token });
          const usuario = usuarios.find(u => u.id === data.usuarioID);
          if (usuario) {
            solicitudActualizada = {
              ...data,
              usuarioNombre: usuario.nombre,
              cargo: usuario.cargo,
              departamento: usuario.departamento
            };
          }
        } catch (error) {
          console.error('Error al obtener información del usuario:', error);
          // Usar datos actuales si hay error
          solicitudActualizada = {
            ...data,
            usuarioNombre: solicitudActual.usuarioNombre,
            cargo: solicitudActual.cargo,
            departamento: solicitudActual.departamento
          };
        }
      }

      setSolicitudes(prev => 
        prev.map(sol => 
          sol.id === solicitudID ? solicitudActualizada : sol
        )
      );
      
      const estadoTexto = {
        'Aceptada': '¡Solicitud aceptada!',
        'En Proceso': 'Solicitud en proceso',
        'Rechazada': 'Solicitud rechazada',
        'Pendiente': 'Solicitud pendiente'
      };
      
      const estadoIcono = {
        'Aceptada': 'success',
        'Rechazada': 'error',
        'En Proceso': 'info',
        'Pendiente': 'warning'
      };
      
      Swal.fire({
        icon: estadoIcono[nuevoEstado] || 'info',
        title: estadoTexto[nuevoEstado] || 'Estado actualizado',
        text: `El estado de la solicitud ha sido cambiado a: ${nuevoEstado}`,
        confirmButtonColor: '#1e40af',
        timer: 3000,
        showConfirmButton: false
      });
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'No se pudo actualizar el estado',
        confirmButtonColor: '#1e40af'
      });
      console.error('Error actualizando estado:', error);
    }
  };

  const createSolicitud = async (usuarioID, proyecto, comentarios, extraFields = {}) => {
    try {
      const token = await getAccessToken();
      const normalizedExtras = {
        pais: extraFields.pais?.trim() || undefined,
        fechaInicio: extraFields.fechaInicio || undefined,
        fechaFin: extraFields.fechaFin || undefined,
        filial: extraFields.filial?.trim() || undefined,
        horasCodigo: extraFields.horasCodigo?.trim() || undefined
      };
      const optionalPayload = Object.fromEntries(
        Object.entries(normalizedExtras).filter(([, value]) => value !== undefined && value !== '')
      );
      const data = await apiRequest('/solicitudes', {
        method: 'POST',
        body: JSON.stringify({
          usuarioID,
          proyecto,
          descripcion: comentarios,
          ...optionalPayload
        }),
        token
      });
      
      // Enriquecer la solicitud con datos del usuario si no los incluye el backend
      if (!data.usuarioNombre || !data.cargo) {
        try {
          const token = await getAccessToken();
          const usuarios = await apiRequest('/auth/users', { token });
          const usuario = usuarios.find(u => u.id === usuarioID);
          if (usuario) {
            data.usuarioNombre = data.usuarioNombre || usuario.nombre;
            data.usuarioApellidos = data.usuarioApellidos || usuario.apellidos;
            data.cargo = data.cargo || usuario.cargo;
          }
        } catch (error) {
          console.error('Error obteniendo datos del usuario:', error);
        }
      }
      
      setSolicitudes([...solicitudes, data]);
      return data;
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'No se pudo crear la solicitud',
        confirmButtonColor: '#1e40af'
      });
      throw error;
    }
  };

  const markMessagesAsRead = async (solicitudID) => {
    try {
      const token = await getAccessToken();
      await apiRequest('/mensajes/mark-read', {
        method: 'POST',
        body: JSON.stringify({ solicitudID }),
        token
      });
      
      setMensajes(prev => 
        prev.map(msg => 
          msg.solicitudID === solicitudID && msg.usuarioID !== user.id
            ? { ...msg, leido: true }
            : msg
        )
      );
    } catch (error) {
      console.error('Error marcando mensajes como leídos:', error);
    }
  };

  const markDocsAsViewed = async (solicitudID) => {
    try {
      const token = await getAccessToken();
      await apiRequest('/documentos/mark-viewed', {
        method: 'POST',
        body: JSON.stringify({ solicitudID }),
        token
      });
      
      setDocumentos(prev =>
        prev.map(doc =>
          doc.solicitudID === solicitudID
            ? { ...doc, vistoPorAdmin: true }
            : doc
        )
      );
    } catch (error) {
      console.error('Error marcando documentos como vistos:', error);
    }
  };

  const getUsers = async () => {
    try {
      const token = await getAccessToken();
      const data = await apiRequest('/auth/users', { token });
      return data;
    } catch (error) {
      console.error('Error obteniendo usuarios:', error);
      return [];
    }
  };

  const updateSolicitudTitulo = async (solicitudID, nuevoTitulo) => {
    const solicitudActual = solicitudes.find(s => s.id === solicitudID);
    
    if (!solicitudActual) {
      throw new Error('Solicitud no encontrada');
    }

    try {
      const token = await getAccessToken();
      const data = await apiRequest(`/solicitudes/${solicitudID}`, {
        method: 'PUT',
        body: JSON.stringify({
          proyecto: nuevoTitulo,
          descripcion: solicitudActual.comentarios,
          estado: solicitudActual.estado
        }),
        token
      });

      // Enriquecer con datos de usuario si es necesario
      let solicitudActualizada = data;
      if (!data.usuarioNombre || !data.cargo) {
        try {
          const token = await getAccessToken();
          const usuarios = await apiRequest('/auth/users', { token });
          const usuario = usuarios.find(u => u.id === data.usuarioID);
          if (usuario) {
            solicitudActualizada = {
              ...data,
              usuarioNombre: usuario.nombre,
              cargo: usuario.cargo,
              departamento: usuario.departamento
            };
          }
        } catch (error) {
          console.error('Error al obtener información del usuario:', error);
          solicitudActualizada = {
            ...data,
            usuarioNombre: solicitudActual.usuarioNombre,
            cargo: solicitudActual.cargo,
            departamento: solicitudActual.departamento
          };
        }
      }

      setSolicitudes(prev => 
        prev.map(sol => 
          sol.id === solicitudID ? solicitudActualizada : sol
        )
      );

      Swal.fire({
        icon: 'success',
        title: '¡Título actualizado!',
        text: 'El título de la solicitud se ha actualizado correctamente',
        confirmButtonColor: '#1e40af',
        timer: 2000,
        showConfirmButton: false
      });
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'No se pudo actualizar el título',
        confirmButtonColor: '#1e40af'
      });
      console.error('Error actualizando título:', error);
    }
  };

  const updateSolicitudDescripcion = async (solicitudID, nuevaDescripcion) => {
    const solicitudActual = solicitudes.find(s => s.id === solicitudID);
    
    if (!solicitudActual) {
      throw new Error('Solicitud no encontrada');
    }

    try {
      const token = await getAccessToken();
      const data = await apiRequest(`/solicitudes/${solicitudID}`, {
        method: 'PUT',
        body: JSON.stringify({
          proyecto: solicitudActual.proyecto,
          descripcion: nuevaDescripcion,
          estado: solicitudActual.estado
        }),
        token
      });

      // Enriquecer con datos de usuario si es necesario
      let solicitudActualizada = data;
      if (!data.usuarioNombre || !data.cargo) {
        try {
          const token = await getAccessToken();
          const usuarios = await apiRequest('/auth/users', { token });
          const usuario = usuarios.find(u => u.id === data.usuarioID);
          if (usuario) {
            solicitudActualizada = {
              ...data,
              usuarioNombre: usuario.nombre,
              cargo: usuario.cargo,
              departamento: usuario.departamento
            };
          }
        } catch (error) {
          console.error('Error al obtener información del usuario:', error);
          solicitudActualizada = {
            ...data,
            usuarioNombre: solicitudActual.usuarioNombre,
            cargo: solicitudActual.cargo,
            departamento: solicitudActual.departamento
          };
        }
      }

      setSolicitudes(prev => 
        prev.map(sol => 
          sol.id === solicitudID ? solicitudActualizada : sol
        )
      );

      Swal.fire({
        icon: 'success',
        title: '¡Descripción actualizada!',
        text: 'La descripción de la solicitud se ha actualizado correctamente',
        confirmButtonColor: '#1e40af',
        timer: 2000,
        showConfirmButton: false
      });
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'No se pudo actualizar la descripción',
        confirmButtonColor: '#1e40af'
      });
      console.error('Error actualizando descripción:', error);
    }
  };

  const value = {
    user,
    solicitudes,
    documentos,
    mensajes,
    loading,
    isSignalRConnected,
    signalRConnection: connectionRef.current,
    login,
    logout,
    uploadDocument,
    getDocumentDownloadUrl,
    deleteDocument,
    sendMessage,
    updateSolicitudEstado,
    updateSolicitudTitulo,
    updateSolicitudDescripcion,
    createSolicitud,
    markMessagesAsRead,
    markDocsAsViewed,
    loadData,
    getUsers,
    handleLoginSuccess,
    isInitializing
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
