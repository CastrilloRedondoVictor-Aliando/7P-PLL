-- Crear tabla de Usuarios
CREATE TABLE Usuarios (
    id INT PRIMARY KEY IDENTITY(1,1),
    nombre NVARCHAR(100) NOT NULL,
    email NVARCHAR(100) NOT NULL UNIQUE,
    password NVARCHAR(255) NOT NULL,
    rol NVARCHAR(20) NOT NULL CHECK (rol IN ('admin', 'user')),
    cargo NVARCHAR(100),
    createdAt DATETIME2 DEFAULT GETDATE()
);

-- Crear tabla de Solicitudes
CREATE TABLE Solicitudes (
    id INT PRIMARY KEY IDENTITY(1,1),
    numero NVARCHAR(50) NOT NULL UNIQUE,
    titulo NVARCHAR(200) NOT NULL,
    descripcion NVARCHAR(MAX),
    estado NVARCHAR(20) NOT NULL CHECK (estado IN ('Pendiente', 'En Proceso', 'Completado', 'Rechazado')),
    usuarioID INT NOT NULL,
    createdAt DATETIME2 DEFAULT GETDATE(),
    updatedAt DATETIME2 DEFAULT GETDATE(),
    FOREIGN KEY (usuarioID) REFERENCES Usuarios(id) ON DELETE CASCADE
);

-- Crear tabla de Documentos
CREATE TABLE Documentos (
    id INT PRIMARY KEY IDENTITY(1,1),
    solicitudID INT NOT NULL,
    nombre NVARCHAR(200) NOT NULL,
    tipo NVARCHAR(50) NOT NULL,
    url NVARCHAR(500) NOT NULL,
    vistoPorAdmin BIT DEFAULT 0,
    createdAt DATETIME2 DEFAULT GETDATE(),
    FOREIGN KEY (solicitudID) REFERENCES Solicitudes(id) ON DELETE CASCADE
);

-- Crear tabla de Mensajes
CREATE TABLE Mensajes (
    id INT PRIMARY KEY IDENTITY(1,1),
    solicitudID INT NOT NULL,
    usuarioID INT NOT NULL,
    texto NVARCHAR(MAX) NOT NULL,
    rol NVARCHAR(20) NOT NULL CHECK (rol IN ('admin', 'user')),
    leido BIT DEFAULT 0,
    createdAt DATETIME2 DEFAULT GETDATE(),
    FOREIGN KEY (solicitudID) REFERENCES Solicitudes(id) ON DELETE CASCADE,
    FOREIGN KEY (usuarioID) REFERENCES Usuarios(id)
);

-- Crear índices para mejorar el rendimiento
CREATE INDEX idx_solicitudes_usuario ON Solicitudes(usuarioID);
CREATE INDEX idx_solicitudes_estado ON Solicitudes(estado);
CREATE INDEX idx_documentos_solicitud ON Documentos(solicitudID);
CREATE INDEX idx_mensajes_solicitud ON Mensajes(solicitudID);
CREATE INDEX idx_mensajes_leido ON Mensajes(leido);

-- Insertar usuarios de prueba (sin datos de solicitudes)
INSERT INTO Usuarios (nombre, email, password, rol, cargo) VALUES
('Admin User', 'admin@7p-pll.com', '$2a$10$XQqr5R9j9J8Z9Z9Z9Z9Z9e', 'admin', 'Engineering Manager'),
('Victor Castrillo', 'victor@7p-pll.com', '$2a$10$XQqr5R9j9J8Z9Z9Z9Z9Z9e', 'user', 'Ingeniero Junior'),
('Maria Rodriguez', 'maria@7p-pll.com', '$2a$10$XQqr5R9j9J8Z9Z9Z9Z9Z9e', 'user', 'Project Engineer'),
('Carlos Gomez', 'carlos@7p-pll.com', '$2a$10$XQqr5R9j9J8Z9Z9Z9Z9Z9e', 'user', 'Lead Engineer');
