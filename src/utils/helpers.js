// Funciones auxiliares

export const formatDate = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('es-ES', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

export const formatDateShort = (dateString) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('es-ES', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  });
};

export const getEstadoColor = (estado) => {
  const colores = {
    'Pendiente': { bg: 'bg-yellow-100', text: 'text-yellow-800', border: 'border-yellow-500' },
    'En Proceso': { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-500' },
    'Completada': { bg: 'bg-green-100', text: 'text-green-800', border: 'border-green-500' },
    'Rechazada': { bg: 'bg-red-100', text: 'text-red-800', border: 'border-red-500' }
  };
  return colores[estado] || { bg: 'bg-gray-100', text: 'text-gray-800', border: 'border-gray-500' };
};

export const getUserById = (users, id) => {
  return users.find(user => user.id === id);
};

export const getSolicitudById = (solicitudes, id) => {
  return solicitudes.find(solicitud => solicitud.id === id);
};
