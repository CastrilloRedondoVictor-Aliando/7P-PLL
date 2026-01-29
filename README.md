# 7P-PLL - Portal de Gestión de Solicitudes

Aplicación web para la gestión de solicitudes y documentos entre usuarios externos y el equipo administrativo de Pérez-Llorca (PLL).

## 🚀 Características

### Portal de Usuario
- **Autenticación segura**: Sistema de login con email y contraseña
- **Gestión de solicitudes**: Ver, buscar y filtrar solicitudes personales
- **Carga de documentos**: Interfaz drag & drop para subir archivos
- **Sistema de chat**: Comunicación en tiempo real con el equipo PLL
- **Seguimiento de estados**: Monitoreo del progreso de cada solicitud

### Dashboard Administrativo
- **Vista consolidada**: Todas las solicitudes en un solo lugar
- **Gestión de estados**: Aprobar, rechazar o solicitar más información
- **Panel de métricas**: Estadísticas en tiempo real
- **Visualización de documentos**: Acceso a todos los archivos cargados
- **Sistema de comunicación**: Chat bidireccional con usuarios

## 🛠️ Tecnologías

- **React 18**: Framework de UI
- **Vite**: Build tool y dev server
- **Tailwind CSS**: Framework de estilos
- **Lucide React**: Iconos
- **Context API**: Gestión de estado global

## 📦 Instalación

```bash
# Instalar dependencias
npm install

# Iniciar servidor de desarrollo
npm run dev
```

## 🎨 Paleta de Colores

- **Color principal**: `#005487` (Azul corporativo PLL)
- **Color secundario**: Blanco
- **Estados**:
  - Pendiente: Amarillo
  - Aceptada: Verde
  - Rechazada: Rojo
  - Requiere más información: Naranja

## 👥 Usuarios de Prueba

### Usuarios Externos
- **Email**: `user@external.com`
- **Password**: `user123`

### Administradores PLL
- **Email**: `admin@perezllorca.com`
- **Password**: `admin123`

## 📊 Modelo de Datos

### Usuarios
```javascript
{
  id: Number,
  email: String,
  name: String,
  rol: 'user' | 'admin',
  estado: 'Activo' | 'Inactivo',
  password: String
}
```

### Solicitudes
```javascript
{
  id: Number,
  usuarioID: Number,
  adminID: Number,
  proyecto: String,
  comentarios: String,
  estado: String,
  fechaCreacion: String (ISO),
  fechaActualizacion: String (ISO)
}
```

### Documentos
```javascript
{
  id: Number,
  solicitudID: Number,
  nombreArchivo: String,
  urlBlob: String,
  tamaño: String,
  fechaCarga: String (ISO)
}
```

### Mensajes (Chat)
```javascript
{
  id: Number,
  solicitudID: Number,
  usuarioID: Number,
  contenido: String,
  fechaEnvio: String (ISO),
  leido: Boolean
}
```

## 📁 Estructura del Proyecto

```
src/
├── components/         # Componentes reutilizables
│   ├── SolicitudCard.jsx
│   └── SolicitudDetail.jsx
├── pages/             # Páginas principales
│   ├── LoginPage.jsx
│   ├── UserPortal.jsx
│   └── AdminDashboard.jsx
├── context/           # Context API
│   └── AuthContext.jsx
├── data/              # Datos mockeados
│   └── mockData.js
├── utils/             # Funciones auxiliares
│   └── helpers.js
├── App.jsx            # Componente principal
├── main.jsx           # Punto de entrada
└── index.css          # Estilos globales
```

## 🔐 Funcionalidades de Seguridad

- Autenticación basada en credenciales
- Separación de roles (Usuario/Admin)
- Persistencia de sesión en localStorage
- Logout seguro

## 🚦 Estados de Solicitudes

1. **Pendiente de revisión**: Solicitud recién creada
2. **Aceptada**: Aprobada por el equipo PLL
3. **Rechazada**: No cumple con los requisitos
4. **Requiere más información**: Se necesita información adicional

## 💻 Comandos Disponibles

```bash
# Desarrollo
npm run dev

# Build para producción
npm run build

# Preview del build
npm run preview

# Linting
npm run lint
```

## 🎯 Roadmap Fase 2

- [ ] Integración con Azure Blob Storage
- [ ] Base de datos real (Azure SQL / Cosmos DB)
- [ ] Autenticación con Azure AD
- [ ] Notificaciones en tiempo real
- [ ] Exportación de reportes
- [ ] Gestión de usuarios desde admin
- [ ] Historial de cambios de estado
- [ ] Búsqueda avanzada

## 📝 Notas

Esta es una **versión MVP (Producto Mínimo Viable)** con datos mockeados. No se conecta a servicios externos ni almacena datos de forma persistente más allá del navegador.

## 👨‍💻 Desarrollo

Para agregar nuevas características:

1. Los datos mockeados están en `src/data/mockData.js`
2. Las funciones de ayuda en `src/utils/helpers.js`
3. El estado global se maneja en `src/context/AuthContext.jsx`
4. Los estilos usan Tailwind CSS con la clase `primary` para el color corporativo

## 📄 Licencia

Proyecto privado - Pérez-Llorca © 2026
