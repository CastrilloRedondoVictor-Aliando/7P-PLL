-- Crear tabla de Solicitudes
CREATE TABLE Solicitudes (
    id INT PRIMARY KEY IDENTITY(1,1),
    proyecto NVARCHAR(200) NOT NULL,
    descripcion NVARCHAR(MAX),
    estado NVARCHAR(30) NOT NULL CHECK (estado IN ('Pendiente', 'En revisión', 'Aceptada', 'Rechazada')),
    usuarioOID NVARCHAR(50) NOT NULL,
    trayecto NVARCHAR(300) NULL,
    destino NVARCHAR(100) NULL,
    fechaInicio DATE NULL,
    fechaFin DATE NULL,
    empresa NVARCHAR(150) NULL,
    horasCodigo NVARCHAR(100) NULL,
    porcentaje DECIMAL(5,2) NULL,
    createdAt DATETIME2 DEFAULT GETDATE(),
    updatedAt DATETIME2 DEFAULT GETDATE()
);

-- Crear tabla de usuarios autorizados (acceso a la app)
CREATE TABLE UsuariosAutorizados (
    id INT PRIMARY KEY IDENTITY(1,1),
    email NVARCHAR(320) NOT NULL UNIQUE,
    createdAt DATETIME2 DEFAULT GETDATE()
);

-- Crear tabla de Documentos
CREATE TABLE Documentos (
    id INT PRIMARY KEY IDENTITY(1,1),
    solicitudID INT NOT NULL,
    nombre NVARCHAR(200) NOT NULL,
    tipo NVARCHAR(255) NOT NULL,
    url NVARCHAR(500) NOT NULL, -- Guarda el nombre del blob para generar descargas firmadas
    categoria NVARCHAR(50) NOT NULL,
    vistoPorAdmin BIT DEFAULT 0,
    createdAt DATETIME2 DEFAULT GETDATE(),
    FOREIGN KEY (solicitudID) REFERENCES Solicitudes(id) ON DELETE CASCADE
);

-- Crear tabla de Mensajes
CREATE TABLE Mensajes (
    id INT PRIMARY KEY IDENTITY(1,1),
    solicitudID INT NOT NULL,
    usuarioOID NVARCHAR(50) NOT NULL,
    texto NVARCHAR(MAX) NOT NULL,
    rol NVARCHAR(20) NOT NULL CHECK (rol IN ('admin', 'user', 'view')),
    leidoPorAdmin BIT DEFAULT 0,
    leidoPorUser BIT DEFAULT 0,
    createdAt DATETIME2 DEFAULT GETDATE(),
    FOREIGN KEY (solicitudID) REFERENCES Solicitudes(id) ON DELETE CASCADE
);

-- Crear índices para mejorar el rendimiento
CREATE INDEX idx_solicitudes_usuario ON Solicitudes(usuarioOID);
CREATE INDEX idx_solicitudes_estado ON Solicitudes(estado);
CREATE INDEX idx_documentos_solicitud ON Documentos(solicitudID);
CREATE INDEX idx_mensajes_solicitud ON Mensajes(solicitudID);
CREATE INDEX idx_mensajes_leido_admin ON Mensajes(leidoPorAdmin);
CREATE INDEX idx_mensajes_leido_user ON Mensajes(leidoPorUser);
CREATE INDEX idx_usuarios_autorizados_email ON UsuariosAutorizados(email);
