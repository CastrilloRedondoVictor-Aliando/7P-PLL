import { useState, useEffect } from 'react';
import { AuthContext } from './AuthContextDefinition';
import { MOCK_USERS, MOCK_SOLICITUDES, MOCK_DOCUMENTOS, MOCK_MENSAJES } from '../data/mockData';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    // Inicializar desde localStorage
    const savedUser = localStorage.getItem('user');
    return savedUser ? JSON.parse(savedUser) : null;
  });
  const [solicitudes, setSolicitudes] = useState(MOCK_SOLICITUDES);
  const [documentos, setDocumentos] = useState(MOCK_DOCUMENTOS);
  const [mensajes, setMensajes] = useState(MOCK_MENSAJES);

  // Sincronizar con localStorage cuando cambie el usuario
  useEffect(() => {
    if (user) {
      localStorage.setItem('user', JSON.stringify(user));
    } else {
      localStorage.removeItem('user');
    }
  }, [user]);

  const login = (email, password) => {
    const foundUser = MOCK_USERS.find(
      u => u.email === email && u.password === password
    );
    
    if (foundUser) {
      const { password: _password, ...userWithoutPassword } = foundUser;
      setUser(userWithoutPassword);
      return true;
    }
    return false;
  };

  const logout = () => {
    setUser(null);
  };

  const uploadDocument = (solicitudID, file) => {
    const newDocument = {
      id: documentos.length + 1,
      solicitudID,
      nombreArchivo: file.name,
      urlBlob: '#',
      tamaño: `${(file.size / (1024 * 1024)).toFixed(2)} MB`,
      fechaCarga: new Date().toISOString()
    };
    setDocumentos([...documentos, newDocument]);
  };

  const sendMessage = (solicitudID, contenido) => {
    const newMessage = {
      id: mensajes.length + 1,
      solicitudID,
      usuarioID: user.id,
      contenido,
      fechaEnvio: new Date().toISOString(),
      leido: false
    };
    setMensajes([...mensajes, newMessage]);
  };

  const updateSolicitudEstado = (solicitudID, nuevoEstado) => {
    setSolicitudes(prev => 
      prev.map(sol => 
        sol.id === solicitudID 
          ? { ...sol, estado: nuevoEstado, fechaActualizacion: new Date().toISOString() }
          : sol
      )
    );
  };

  const value = {
    user,
    solicitudes,
    documentos,
    mensajes,
    login,
    logout,
    uploadDocument,
    sendMessage,
    updateSolicitudEstado
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};
