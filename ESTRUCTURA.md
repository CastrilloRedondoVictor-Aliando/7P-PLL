# Estructura del Proyecto 7P-PLL

## 📁 Árbol de Directorios

```
7P-PLL/mock/
│
├── public/                     # Archivos públicos estáticos
│
├── src/
│   ├── components/            # Componentes reutilizables
│   │   ├── SolicitudCard.jsx      # Tarjeta de solicitud
│   │   └── SolicitudDetail.jsx    # Detalle de solicitud con chat y docs
│   │
│   ├── pages/                 # Páginas principales de la aplicación
│   │   ├── LoginPage.jsx          # Página de inicio de sesión
│   │   ├── UserPortal.jsx         # Portal para usuarios externos
│   │   └── AdminDashboard.jsx     # Dashboard administrativo PLL
│   │
│   ├── context/               # Context API para estado global
│   │   ├── AuthContextDefinition.jsx  # Definición del contexto
│   │   └── AuthContext.jsx            # Provider del contexto
│   │
│   ├── hooks/                 # Custom hooks
│   │   └── useAuth.js             # Hook para acceder al contexto de autenticación
│   │
│   ├── data/                  # Datos mockeados
│   │   └── mockData.js            # Usuarios, solicitudes, documentos, mensajes
│   │
│   ├── utils/                 # Funciones auxiliares
│   │   └── helpers.js             # Formateo de fechas, colores, etc.
│   │
│   ├── App.jsx                # Componente raíz de la aplicación
│   ├── App.css                # Estilos específicos del App
│   ├── main.jsx               # Punto de entrada de React
│   └── index.css              # Estilos globales + Tailwind
│
├── .gitignore                 # Archivos ignorados por Git
├── eslint.config.js           # Configuración de ESLint
├── package.json               # Dependencias y scripts
├── postcss.config.js          # Configuración de PostCSS
├── tailwind.config.js         # Configuración de Tailwind CSS
├── vite.config.js             # Configuración de Vite
├── index.html                 # HTML base
├── README.md                  # Documentación principal
└── GUIA_USO.md               # Guía de usuario
```

## 🔄 Flujo de Datos

```
main.jsx (Entry Point)
    ↓
AuthProvider (Context)
    ↓
App.jsx (Router Logic)
    ↓
    ├─→ LoginPage (No autenticado)
    ├─→ UserPortal (rol: user)
    └─→ AdminDashboard (rol: admin)
```

## 🎯 Componentes Principales

### LoginPage
- Formulario de autenticación
- Validación de credenciales
- Redirección según rol

### UserPortal
- Lista de solicitudes personales
- Búsqueda y filtrado
- Vista de detalle con:
  - Chat bidireccional
  - Carga de documentos
  - Seguimiento de estado

### AdminDashboard
- Panel de métricas (KPIs)
- Tabla de todas las solicitudes
- Gestión de estados
- Vista de detalle en modal

### SolicitudCard
- Componente reutilizable
- Muestra información resumida
- Indicadores visuales de estado

### SolicitudDetail
- Vista completa de solicitud
- Sistema de chat
- Gestión de documentos
- Timeline de estados

## 🔐 Sistema de Autenticación

```javascript
AuthContext proporciona:
- user: Usuario actual autenticado
- login(email, password): Función de inicio de sesión
- logout(): Función de cierre de sesión
- solicitudes: Array de todas las solicitudes
- documentos: Array de todos los documentos
- mensajes: Array de todos los mensajes
- uploadDocument(solicitudID, file): Subir documento
- sendMessage(solicitudID, contenido): Enviar mensaje
- updateSolicitudEstado(solicitudID, estado): Actualizar estado
```

## 🎨 Sistema de Estilos

### Tailwind CSS
- Clases utility-first
- Configuración personalizada en `tailwind.config.js`
- Color principal: `#005487`

### Clases Personalizadas
```css
.bg-primary      /* Fondo azul corporativo */
.text-primary    /* Texto azul corporativo */
.border-primary  /* Borde azul corporativo */
```

## 📊 Modelo de Datos

Ver archivo completo en `src/data/mockData.js`

### Relaciones
```
Usuarios (1) ──┬─→ (N) Solicitudes
               │
Solicitudes (1) ┬─→ (N) Documentos
                └─→ (N) Mensajes
```

## 🚀 Scripts Disponibles

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Inicia servidor de desarrollo |
| `npm run build` | Genera build de producción |
| `npm run preview` | Preview del build |
| `npm run lint` | Ejecuta linter |

## 💡 Buenas Prácticas Implementadas

✅ Separación de componentes por responsabilidad
✅ Context API para estado global
✅ Custom hooks para lógica reutilizable
✅ Funciones auxiliares en utils
✅ Datos mockeados separados
✅ Estilos consistentes con Tailwind
✅ Código limpio y mantenible
✅ Estructura escalable para futuro crecimiento

## 🔄 Ciclo de Vida de una Solicitud

1. **Creación**: Admin crea solicitud (en futuro)
2. **Notificación**: Usuario recibe la solicitud
3. **Interacción**: Usuario puede:
   - Ver detalles
   - Subir documentos
   - Enviar mensajes
4. **Gestión**: Admin puede:
   - Aprobar → Estado: "Aceptada"
   - Rechazar → Estado: "Rechazada"
   - Solicitar info → Estado: "Requiere más información"
5. **Seguimiento**: Ambos pueden ver el historial y estado actual

## 📝 Notas de Desarrollo

- **React 18**: Usando las últimas características
- **Vite**: Build ultrarrápido con HMR
- **Lucide React**: Iconos consistentes y modernos
- **localStorage**: Persistencia temporal de sesión
- **Responsive**: Diseño adaptativo para móviles y escritorio
