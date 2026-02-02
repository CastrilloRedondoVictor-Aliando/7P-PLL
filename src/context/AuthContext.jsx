import { useState, useEffect } from 'react';
import Swal from 'sweetalert2';
import { AuthContext } from './AuthContextDefinition';
import { apiRequest } from '../config/api';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    // Inicializar desde localStorage
    const savedUser = localStorage.getItem('user');
    return savedUser ? JSON.parse(savedUser) : null;
  });
  const [solicitudes, setSolicitudes] = useState([]);
  const [documentos, setDocumentos] = useState([]);
  const [mensajes, setMensajes] = useState([]);
  const [loading, setLoading] = useState(true);

  // Sincronizar con localStorage cuando cambie el usuario
  useEffect(() => {
    if (user) {
      localStorage.setItem('user', JSON.stringify(user));
    } else {
      localStorage.removeItem('user');
    }
  }, [user]);

  // Cargar datos cuando el usuario inicie sesión
  useEffect(() => {
    if (user) {
      loadData();
    } else {
      setLoading(false);
    }
  }, [user]);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Cargar solicitudes
      const queryParams = user.rol === 'user' 
        ? `?usuarioID=${user.id}&rol=user` 
        : '';
      const solicitudesData = await apiRequest(`/solicitudes${queryParams}`);
      setSolicitudes(solicitudesData);

      // Cargar documentos
      const documentosData = await apiRequest('/documentos');
      setDocumentos(documentosData);

      // Cargar mensajes
      const mensajesData = await apiRequest('/mensajes');
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

  const login = async (email, password) => {
    try {
      const data = await apiRequest('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      });
      
      setUser(data.user);
      return true;
    } catch (error) {
      console.error('Error en login:', error);
      return false;
    }
  };

  const logout = () => {
    setUser(null);
  };

  const uploadDocument = async (solicitudID, file) => {
    // Por ahora simulamos la subida
    const newDocument = {
      solicitudID,
      nombre: file.name,
      tipo: file.type,
      url: '#',
      vistoPorAdmin: false
    };

    try {
      const data = await apiRequest('/documentos', {
        method: 'POST',
        body: JSON.stringify(newDocument)
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

  const sendMessage = async (solicitudID, contenido) => {
    const newMessage = {
      solicitudID,
      usuarioID: user.id,
      texto: contenido,
      rol: user.rol
    };

    try {
      const data = await apiRequest('/mensajes', {
        method: 'POST',
        body: JSON.stringify(newMessage)
      });
      
      setMensajes([...mensajes, data]);
    } catch (error) {
      Swal.fire({
        icon: 'error',
        title: 'Error',
        text: 'No se pudo enviar el mensaje',
        confirmButtonColor: '#1e40af'
      });
      console.error('Error enviando mensaje:', error);
    }
  };

  const updateSolicitudEstado = async (solicitudID, nuevoEstado) => {
    const solicitudActual = solicitudes.find(s => s.id === solicitudID);
    
    if (!solicitudActual) {
      throw new Error('Solicitud no encontrada');
    }

    try {
      const data = await apiRequest(`/solicitudes/${solicitudID}`, {
        method: 'PUT',
        body: JSON.stringify({
          titulo: solicitudActual.titulo,
          descripcion: solicitudActual.descripcion,
          estado: nuevoEstado
        })
      });

      setSolicitudes(prev => 
        prev.map(sol => 
          sol.id === solicitudID ? data : sol
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

  const createSolicitud = async (usuarioID, proyecto, comentarios) => {
    try {
      const data = await apiRequest('/solicitudes', {
        method: 'POST',
        body: JSON.stringify({
          usuarioID,
          titulo: proyecto,
          descripcion: comentarios
        })
      });
      
      // Enriquecer la solicitud con datos del usuario si no los incluye el backend
      if (!data.usuarioNombre || !data.cargo) {
        try {
          const usuarios = await apiRequest('/auth/users');
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
      await apiRequest('/mensajes/mark-read', {
        method: 'POST',
        body: JSON.stringify({ solicitudID })
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
      await apiRequest('/documentos/mark-viewed', {
        method: 'POST',
        body: JSON.stringify({ solicitudID })
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
      const data = await apiRequest('/auth/users');
      return data;
    } catch (error) {
      console.error('Error obteniendo usuarios:', error);
      return [];
    }
  };

  const value = {
    user,
    solicitudes,
    documentos,
    mensajes,
    loading,
    login,
    logout,
    uploadDocument,
    sendMessage,
    updateSolicitudEstado,
    createSolicitud,
    markMessagesAsRead,
    markDocsAsViewed,
    loadData,
    getUsers
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
