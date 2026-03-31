import { useState, useEffect, useCallback, useRef } from 'react';
import { useMsal } from '@azure/msal-react';
import { HubConnectionBuilder, LogLevel } from '@microsoft/signalr';
import Swal from 'sweetalert2';
import {AuthContext } from './AuthContextDefinition';
import { apiRequest, isAuthorizationError } from '../config/api';
import { loginRequest, hasApiScope } from '../config/msalConfig';

const mergeSolicitudMessages = (previousMessages, solicitudID, nextMessages) => {
  const solicitudKey = String(solicitudID);
  return [
    ...previousMessages.filter((message) => String(message?.solicitudID) !== solicitudKey),
    ...nextMessages
  ];
};

export const AuthProvider = ({ children }) => {
  const { instance, accounts } = useMsal();
  const isAuthDebugEnabled = import.meta.env.VITE_AUTH_DEBUG === 'true';
  const normalizeUser = useCallback((rawUser) => {
    if (!rawUser) return null;
    const resolvedName = rawUser.name || rawUser.nombre || rawUser.email || 'Usuario';
    const resolvedEmail = rawUser.email || '';
    return {
      ...rawUser,
      name: resolvedName,
      nombre: rawUser.nombre || resolvedName,
      email: resolvedEmail
    };
  }, []);
  const [user, setUser] = useState(() => {
    // Inicializar desde sessionStorage (más seguro que localStorage para tokens)
    const savedUser = sessionStorage.getItem('user');
    return savedUser ? normalizeUser(JSON.parse(savedUser)) : null;
  });
  const [solicitudes, setSolicitudes] = useState([]);
  const [documentos, setDocumentos] = useState([]);
  const [mensajes, setMensajes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isInitializing, setIsInitializing] = useState(true);
  const [isSignalRConnected, setIsSignalRConnected] = useState(false);
  const connectionRef = useRef(null);

  const logTokenClaims = useCallback((token, source) => {
    if (!isAuthDebugEnabled || !token) return;
    try {
      const decoded = JSON.parse(atob(token.split('.')[1]));
    } catch {
    }
  }, [isAuthDebugEnabled]);

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

  useEffect(() => {
    if (!user || isInitializing) return;
    if (accounts.length === 0) return;
    if (connectionRef.current) return;
    initializeSignalR();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, isInitializing, accounts.length]);

  // Función auxiliar para obtener el token de acceso
  const getAccessToken = useCallback(async () => {
    if (accounts.length === 0) {
      throw new Error('No hay cuenta autenticada');
    }

    try {
      const response = await instance.acquireTokenSilent({
        ...loginRequest,
        account: accounts[0]
      });
      const token = hasApiScope ? response.accessToken : response.idToken;
      if (!token) {
        throw new Error(`No se obtuvo ${hasApiScope ? 'access token' : 'id token'} en acquireTokenSilent`);
      }
      logTokenClaims(token, `MSAL silent (${hasApiScope ? 'access' : 'id'})`);
      return token;
    } catch (error) {
      // Si falla el token silencioso, intentar con popup
      try {
        const response = await instance.acquireTokenPopup(loginRequest);
        const token = hasApiScope ? response.accessToken : response.idToken;
        if (!token) {
          throw new Error(`No se obtuvo ${hasApiScope ? 'access token' : 'id token'} en acquireTokenPopup`);
        }
        logTokenClaims(token, `MSAL popup (${hasApiScope ? 'access' : 'id'})`);
        return token;
      } catch (popupError) {
        throw popupError;
      }
    }
  }, [accounts, instance, logTokenClaims]);

  // Manejar login exitoso de MSAL - sincronizar con backend
  const handleLoginSuccess = useCallback(async (accessToken = null) => {
    try {
      setLoading(true);
      
      // Si no se proporciona token, obtenerlo
      const token = accessToken || await getAccessToken();
      logTokenClaims(token, 'sync-user request');

      const account = accounts[0];
      const idTokenClaims = account?.idTokenClaims || {};
      const accountProfile = account
        ? {
            email:
              account.username ||
              idTokenClaims.email ||
              idTokenClaims.preferred_username ||
              idTokenClaims.upn ||
              idTokenClaims.unique_name ||
              idTokenClaims['signInNames.emailAddress'] ||
              (Array.isArray(idTokenClaims.emails) ? idTokenClaims.emails.find(Boolean) : '') ||
              '',
            name:
              account.name ||
              idTokenClaims.name ||
              `${idTokenClaims.given_name || ''} ${idTokenClaims.family_name || ''}`.trim() ||
              ''
          }
        : undefined;
      
      // Sincronizar usuario con backend
      const data = await apiRequest('/auth/sync-user', {
        method: 'POST',
        body: JSON.stringify({ token, profile: accountProfile })
      });
      const normalizedUser = normalizeUser(data.user);
      setUser(normalizedUser);
      
      return true;
    } catch (error) {
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
  }, [accounts, getAccessToken, normalizeUser]);

  // Inicializar conexión SignalR (usando @microsoft/signalr con Azure SignalR Service)
  const initializeSignalR = async () => {
    try {
      if (connectionRef.current) {
        await connectionRef.current.stop();
        connectionRef.current = null;
      }

      const token = await getAccessToken();
      
      // Obtener URL y token de SignalR desde el backend
      const negotiateResponse = await apiRequest('/signalr/negotiate', {
        method: 'POST',
        token
      });


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
        setMensajes(prev => {
          // Evitar duplicados
          const exists = prev.some(m => m.id === mensaje.id);
          if (exists) return prev;
          return [...prev, mensaje];
        });
      });

      // Event: Reconectando
      connection.onreconnecting(error => {
        setIsSignalRConnected(false);
      });

      // Event: Reconectado
      connection.onreconnected(connectionId => {
        setIsSignalRConnected(true);
      });

      // Event: Conexión cerrada
      connection.onclose(error => {
        setIsSignalRConnected(false);
      });

      // Iniciar conexión
      await connection.start();
      
      connectionRef.current = connection;
      setIsSignalRConnected(true);
    } catch (error) {
      setIsSignalRConnected(false);
    }
  };

  // Cleanup: Cerrar conexión SignalR al desmontar
  useEffect(() => {
    return () => {
      if (connectionRef.current) {
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
      if (isAuthorizationError(error)) {
        return;
      }

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

  const refreshSolicitudMensajes = async (solicitudID) => {
    try {
      const token = await getAccessToken();
      const mensajesData = await apiRequest(`/mensajes?solicitudID=${encodeURIComponent(solicitudID)}`, { token });
      setMensajes((prev) => mergeSolicitudMessages(prev, solicitudID, mensajesData));
      return mensajesData;
    } catch (error) {
      console.warn('[AuthContext/refreshSolicitudMensajes] No se pudieron recargar los mensajes de la solicitud', error);
      return [];
    }
  };

  const login = async () => {
    try {
      // Iniciar login con redirect de MSAL
      await instance.loginRedirect(loginRequest);
      // El callback se maneja en App.jsx
      return true;
    } catch (error) {
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
      // Forzar limpieza aunque falle MSAL
      setUser(null);
      sessionStorage.removeItem('user');
    }
  };

  const uploadDocument = async (solicitudID, file, categoria, options = {}) => {
    const { silent = false } = options;
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

      if (!silent) {
        Swal.fire({
          icon: 'success',
          title: '¡Documento subido!',
          text: `${file.name} se ha subido correctamente`,
          confirmButtonColor: '#1e40af',
          timer: 2000,
          showConfirmButton: false
        });
      }

      return data;
    } catch (error) {
      if (!silent) {
        Swal.fire({
          icon: error?.status === 409 ? 'warning' : 'error',
          title: error?.status === 409 ? 'Accion no permitida' : 'Error',
          text: error?.message || 'No se pudo subir el documento',
          confirmButtonColor: '#1e40af'
        });
      }
      return null;
    }
  };

  const getDocumentDownloadUrl = async (documentoId) => {
    const token = await getAccessToken();
    const data = await apiRequest(`/documentos/${documentoId}/download`, { token });
    return data.url;
  };

  const getDocumentPreviewUrl = async (documentoId) => {
    const token = await getAccessToken();
    const data = await apiRequest(`/documentos/${documentoId}/preview`, { token });
    return data.url;
  };

  const getDocumentPreviewContent = async (documentoId) => {
    const token = await getAccessToken();
    return apiRequest(`/documentos/${documentoId}/preview-content`, { token });
  };

  const deleteDocument = async (documentoId) => {
    if (user?.rol === 'view') {
      Swal.fire({
        icon: 'warning',
        title: 'Accion no permitida',
        text: 'El rol vista no puede eliminar documentos.',
        confirmButtonColor: '#1e40af'
      });
      return;
    }
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
    }
  };

  const sendMessage = async (solicitudID, contenido) => {
    if (user?.rol === 'view') {
      Swal.fire({
        icon: 'warning',
        title: 'Accion no permitida',
        text: 'El rol vista no puede enviar mensajes.',
        confirmButtonColor: '#1e40af'
      });
      return;
    }
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

      return data;
    } catch (error) {
      Swal.fire({
        icon: error?.status === 409 ? 'warning' : 'error',
        title: error?.status === 409 ? 'Accion no permitida' : 'Error',
        text: error?.message || 'No se pudo enviar el mensaje',
        confirmButtonColor: '#1e40af'
      });
      throw error;
    }
  };

  const updateSolicitudEstado = async (solicitudID, nuevoEstado, porcentaje, options = {}) => {
    const solicitudActual = solicitudes.find(s => s.id === solicitudID);
    
    if (!solicitudActual) {
      throw new Error('Solicitud no encontrada');
    }

    const optimisticSolicitud = {
      ...solicitudActual,
      estado: nuevoEstado,
      ...(porcentaje !== undefined ? { porcentaje } : {})
    };

    setSolicitudes(prev => 
      prev.map(sol => 
        sol.id === solicitudID ? optimisticSolicitud : sol
      )
    );

    try {
      const token = await getAccessToken();
      const payload = {
        estado: nuevoEstado,
        ...(porcentaje !== undefined ? { porcentaje } : {})
      };
      const data = await apiRequest(`/solicitudes/${solicitudID}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
        token
      });

      const solicitudActualizada = {
        ...data,
        comentarios: data.comentarios ?? solicitudActual.comentarios,
        usuarioNombre: data.usuarioNombre ?? solicitudActual.usuarioNombre,
        cargo: data.cargo ?? solicitudActual.cargo,
        departamento: data.departamento ?? solicitudActual.departamento
      };

      setSolicitudes(prev => 
        prev.map(sol => 
          sol.id === solicitudID ? solicitudActualizada : sol
        )
      );
      
      const estadoTexto = {
        'Aceptada': '¡Solicitud aceptada!',
        'En revisión': 'En revisión',
        'Rechazada': 'Solicitud rechazada',
        'Pendiente': 'Solicitud pendiente'
      };
      
      const estadoIcono = {
        'Aceptada': 'success',
        'Rechazada': 'error',
        'En revisión': 'info',
        'Pendiente': 'warning'
      };
      
      const nombreAviso = solicitudActualizada?.usuarioNombre || solicitudActual?.usuarioNombre || 'el usuario';

      if (!options.silent) {
        Swal.fire({
          icon: estadoIcono[nuevoEstado] || 'info',
          title: estadoTexto[nuevoEstado] || 'Estado actualizado',
          text: `El estado de la solicitud ha sido cambiado a: ${nuevoEstado}. Se avisará a ${nombreAviso} mediante un correo.`,
          confirmButtonColor: '#1e40af',
          timer: 3000,
          showConfirmButton: false
        });
      }
    } catch (error) {
      setSolicitudes(prev => 
        prev.map(sol => 
          sol.id === solicitudID ? solicitudActual : sol
        )
      );

      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'No se pudo actualizar el estado',
        confirmButtonColor: '#1e40af'
      });
    }
  };

  const deleteSolicitud = async (solicitudID) => {
    if (user?.rol !== 'admin') {
      Swal.fire({
        icon: 'warning',
        title: 'Accion no permitida',
        text: 'Solo los administradores pueden eliminar solicitudes.',
        confirmButtonColor: '#1e40af'
      });
      return false;
    }

    try {
      const token = await getAccessToken();
      await apiRequest(`/solicitudes/${solicitudID}`, {
        method: 'DELETE',
        token
      });

      setSolicitudes(prev => prev.filter(sol => sol.id !== solicitudID));
      setDocumentos(prev => prev.filter(doc => doc.solicitudID !== solicitudID));
      setMensajes(prev => prev.filter(msg => msg.solicitudID !== solicitudID));

      Swal.fire({
        icon: 'success',
        title: 'Solicitud eliminada',
        text: 'La solicitud se ha eliminado correctamente',
        confirmButtonColor: '#1e40af',
        timer: 2000,
        showConfirmButton: false
      });

      return true;
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'No se pudo eliminar la solicitud',
        confirmButtonColor: '#1e40af'
      });
      return false;
    }
  };

  const createSolicitud = async (usuarioID, proyecto, comentarios, extraFields = {}, userMeta = {}) => {
    try {
      const token = await getAccessToken();
      const normalizedExtras = {
        codigoEmpleado: extraFields.codigoEmpleado?.toString().trim() || undefined,
        posicion: extraFields.posicion?.trim() || undefined,
        politica: extraFields.politica?.trim() || undefined,
        trayecto: extraFields.trayecto?.trim() || undefined,
        destino: extraFields.destino?.trim() || undefined,
        fechaInicio: extraFields.fechaInicio || undefined,
        fechaFin: extraFields.fechaFin || undefined,
        empresa: extraFields.empresa?.trim() || undefined,
        horasCodigo: extraFields.horasCodigo?.trim() || undefined,
        porcentaje: extraFields.porcentaje ?? undefined
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
      
      if (!data.usuarioNombre && userMeta?.nombre) {
        data.usuarioNombre = userMeta.nombre;
      }
      if (!data.usuarioEmail && userMeta?.email) {
        data.usuarioEmail = userMeta.email;
      }
      
      setSolicitudes(prev => [...prev, data]);
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

      const isAdmin = user?.rol === 'admin' || user?.rol === 'view';
      setMensajes(prev => 
        prev.map(msg => {
          if (msg.solicitudID !== solicitudID) return msg;
          if (isAdmin && msg.rol === 'user') {
            return { ...msg, leidoPorAdmin: true, leido: true };
          }
          if (!isAdmin && msg.rol === 'admin') {
            return { ...msg, leidoPorUser: true, leido: true };
          }
          return msg;
        })
      );
    } catch (error) {
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
    }
  };

  const resolveUsersByEmails = async (emails) => {
    try {
      const normalized = (emails || [])
        .map(email => (email || '').toString().trim().toLowerCase())
        .filter(Boolean);
      if (normalized.length === 0) return [];
      const token = await getAccessToken();
      const data = await apiRequest('/auth/resolve-users', {
        method: 'POST',
        body: JSON.stringify({ emails: normalized }),
        token
      });
      return data?.users || [];
    } catch (error) {
      return [];
    }
  };

  const changeUserEmail = async (currentEmail, newEmail) => {
    const token = await getAccessToken();
    const data = await apiRequest('/auth/change-user-email', {
      method: 'POST',
      body: JSON.stringify({ currentEmail, newEmail }),
      token
    });

    const updatedSolicitudIds = new Set(
      (Array.isArray(data?.updatedSolicitudIds) ? data.updatedSolicitudIds : [])
        .map((id) => Number(id))
        .filter((id) => Number.isInteger(id))
    );
    const resolvedNewEmail = (data?.newEmail || newEmail || '').toString().trim().toLowerCase();

    if (updatedSolicitudIds.size > 0 && resolvedNewEmail) {
      setSolicitudes((prev) =>
        prev.map((solicitud) => {
          if (!updatedSolicitudIds.has(Number(solicitud.id))) {
            return solicitud;
          }

          const currentDisplay = (solicitud.usuarioNombre || '').toString().trim().toLowerCase();
          const currentIdentifier = (solicitud.usuarioID || '').toString().trim().toLowerCase();
          const currentEmailValue = (solicitud.usuarioEmail || '').toString().trim().toLowerCase();
          const shouldReplaceDisplay = currentDisplay === currentIdentifier || currentDisplay === currentEmailValue;

          return {
            ...solicitud,
            usuarioID: resolvedNewEmail,
            usuarioEmail: resolvedNewEmail,
            usuarioNombre: shouldReplaceDisplay ? resolvedNewEmail : solicitud.usuarioNombre
          };
        })
      );
    }

    return data;
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
          descripcion: solicitudActual.comentarios
        }),
        token
      });

      const solicitudActualizada = {
        ...data,
        usuarioNombre: data.usuarioNombre ?? solicitudActual.usuarioNombre,
        cargo: data.cargo ?? solicitudActual.cargo,
        departamento: data.departamento ?? solicitudActual.departamento
      };

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
          descripcion: nuevaDescripcion
        }),
        token
      });

      const solicitudActualizada = {
        ...data,
        usuarioNombre: data.usuarioNombre ?? solicitudActual.usuarioNombre,
        cargo: data.cargo ?? solicitudActual.cargo,
        departamento: data.departamento ?? solicitudActual.departamento
      };

      setSolicitudes(prev => 
        prev.map(sol => 
          sol.id === solicitudID ? solicitudActualizada : sol
        )
      );

       Swal.fire({
         icon: 'success',
         title: '¡Principales funciones actualizadas!',
         text: 'Las principales funciones de la solicitud se han actualizado correctamente',
        confirmButtonColor: '#1e40af',
        timer: 2000,
        showConfirmButton: false
      });
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'No se pudieron actualizar las principales funciones',
        confirmButtonColor: '#1e40af'
      });
    }
  };

  const updateSolicitudCompleta = async (solicitudID, updates = {}) => {
    const solicitudActual = solicitudes.find(s => s.id === solicitudID);

    if (!solicitudActual) {
      throw new Error('Solicitud no encontrada');
    }

    const normalizeNullableText = (value) => {
      if (value === undefined || value === null) return null;
      const trimmed = value.toString().trim();
      return trimmed === '' ? null : trimmed;
    };

    try {
      const token = await getAccessToken();
      const payload = {
        proyecto: updates.proyecto,
        descripcion: updates.descripcion,
        estado: updates.estado,
        codigoEmpleado: normalizeNullableText(updates.codigoEmpleado),
        posicion: normalizeNullableText(updates.posicion),
        politica: normalizeNullableText(updates.politica),
        trayecto: normalizeNullableText(updates.trayecto),
        destino: normalizeNullableText(updates.destino),
        fechaInicio: updates.fechaInicio || null,
        fechaFin: updates.fechaFin || null,
        empresa: normalizeNullableText(updates.empresa),
        horasCodigo: normalizeNullableText(updates.horasCodigo),
        porcentaje:
          updates.porcentaje === undefined || updates.porcentaje === null || updates.porcentaje === ''
            ? undefined
            : Number(updates.porcentaje)
      };

      const data = await apiRequest(`/solicitudes/${solicitudID}`, {
        method: 'PUT',
        body: JSON.stringify(payload),
        token
      });

      const solicitudActualizada = {
        ...data,
        usuarioNombre: data.usuarioNombre ?? solicitudActual.usuarioNombre,
        cargo: data.cargo ?? solicitudActual.cargo,
        departamento: data.departamento ?? solicitudActual.departamento
      };

      setSolicitudes(prev =>
        prev.map(sol =>
          sol.id === solicitudID ? solicitudActualizada : sol
        )
      );

      Swal.fire({
        icon: 'success',
        title: '¡Solicitud actualizada!',
        text: 'Los datos de la solicitud se han actualizado correctamente',
        confirmButtonColor: '#1e40af',
        timer: 2000,
        showConfirmButton: false
      });

      return solicitudActualizada;
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'No se pudo actualizar la solicitud',
        confirmButtonColor: '#1e40af'
      });
      return null;
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
    getAccessToken,
    login,
    logout,
    uploadDocument,
    getDocumentPreviewContent,
    getDocumentPreviewUrl,
    getDocumentDownloadUrl,
    deleteDocument,
    sendMessage,
    updateSolicitudEstado,
    deleteSolicitud,
    updateSolicitudTitulo,
    updateSolicitudDescripcion,
    updateSolicitudCompleta,
    createSolicitud,
    markMessagesAsRead,
    markDocsAsViewed,
    refreshSolicitudMensajes,
    loadData,
    resolveUsersByEmails,
    changeUserEmail,
    handleLoginSuccess,
    isInitializing
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
