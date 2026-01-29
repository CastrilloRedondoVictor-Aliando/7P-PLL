// Datos mockeados para la aplicación 7P-PLL

export const MOCK_USERS = [
  { 
    id: 1, 
    email: 'user@external.com', 
    name: 'María García', 
    rol: 'user', 
    estado: 'Activo',
    password: 'user123' 
  },
  { 
    id: 2, 
    email: 'user2@external.com', 
    name: 'Juan Pérez', 
    rol: 'user', 
    estado: 'Activo',
    password: 'user123'
  },
  { 
    id: 3, 
    email: 'admin@perezllorca.com', 
    name: 'Admin PLL', 
    rol: 'admin', 
    estado: 'Activo',
    password: 'admin123'
  },
  { 
    id: 4, 
    email: 'admin2@perezllorca.com', 
    name: 'Carlos Martínez', 
    rol: 'admin', 
    estado: 'Activo',
    password: 'admin123'
  }
];

export const MOCK_SOLICITUDES = [
  {
    id: 1,
    usuarioID: 1,
    adminID: 3,
    proyecto: 'Proyecto Alpha',
    comentarios: 'Necesito revisar los contratos del proyecto Alpha para poder avanzar con la siguiente fase.',
    estado: 'Pendiente de revisión',
    fechaCreacion: '2026-01-15T14:30:00',
    fechaActualizacion: '2026-01-20T10:30:00'
  },
  {
    id: 2,
    usuarioID: 1,
    adminID: 3,
    proyecto: 'Proyecto Beta',
    comentarios: 'Solicitud urgente para documentación fiscal del Q4 2025.',
    estado: 'Aceptada',
    fechaCreacion: '2026-01-22T09:00:00',
    fechaActualizacion: '2026-01-22T09:15:00'
  },
  {
    id: 3,
    usuarioID: 2,
    adminID: 4,
    proyecto: 'Proyecto Gamma',
    comentarios: 'Requiero información sobre compliance y regulaciones.',
    estado: 'Requiere más información',
    fechaCreacion: '2026-01-18T16:00:00',
    fechaActualizacion: '2026-01-18T16:30:00'
  },
  {
    id: 4,
    usuarioID: 2,
    adminID: 3,
    proyecto: 'Proyecto Delta',
    comentarios: 'Documentación legal para nueva expansión internacional.',
    estado: 'Rechazada',
    fechaCreacion: '2026-01-10T11:00:00',
    fechaActualizacion: '2026-01-12T14:45:00'
  }
];

export const MOCK_DOCUMENTOS = [
  {
    id: 1,
    solicitudID: 1,
    nombreArchivo: 'contrato_alpha_v1.pdf',
    urlBlob: '#',
    tamaño: '2.5 MB',
    fechaCarga: '2026-01-22T09:15:00'
  },
  {
    id: 2,
    solicitudID: 2,
    nombreArchivo: 'informe_fiscal_q4.xlsx',
    urlBlob: '#',
    tamaño: '1.8 MB',
    fechaCarga: '2026-01-22T10:30:00'
  }
];

export const MOCK_MENSAJES = [
  {
    id: 1,
    solicitudID: 1,
    usuarioID: 3,
    contenido: 'Hemos recibido tu solicitud. La estamos revisando.',
    fechaEnvio: '2026-01-15T15:00:00',
    leido: true
  },
  {
    id: 2,
    solicitudID: 1,
    usuarioID: 1,
    contenido: '¿Cuándo tendrán una respuesta aproximadamente?',
    fechaEnvio: '2026-01-16T10:30:00',
    leido: true
  },
  {
    id: 3,
    solicitudID: 2,
    usuarioID: 3,
    contenido: 'Solicitud aceptada. Procederemos con la documentación.',
    fechaEnvio: '2026-01-22T09:15:00',
    leido: false
  }
];
