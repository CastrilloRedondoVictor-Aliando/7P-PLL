# Guía de Uso - 7P-PLL

## 🚀 Inicio Rápido

### 1. Instalación
```bash
npm install
npm run dev
```

La aplicación estará disponible en: http://localhost:5174

### 2. Acceso al Sistema

#### Como Usuario
1. Accede a http://localhost:5174
2. Usa las credenciales:
   - Email: `user@external.com`
   - Password: `user123`

#### Como Administrador
1. Accede a http://localhost:5174
2. Usa las credenciales:
   - Email: `admin@perezllorca.com`
   - Password: `admin123`

## 📖 Funcionalidades por Rol

### 👤 Portal de Usuario

#### Ver Solicitudes
- Al iniciar sesión verás todas tus solicitudes en el panel izquierdo
- Cada solicitud muestra: proyecto, estado, comentarios y fecha

#### Buscar y Filtrar
- **Búsqueda**: Escribe en el campo de búsqueda para filtrar por proyecto o comentarios
- **Filtro de estado**: Usa el selector para filtrar por estado específico

#### Ver Detalles
- Haz clic en cualquier solicitud para ver los detalles completos
- Verás: descripción, documentos adjuntos y conversación

#### Subir Documentos
1. Selecciona una solicitud
2. Haz clic en "Subir Documento"
3. Selecciona el archivo desde tu ordenador
4. El documento se agregará a la lista

#### Enviar Mensajes
1. Selecciona una solicitud
2. Escribe tu mensaje en el campo de texto
3. Presiona Enter o haz clic en el botón de enviar
4. Tu mensaje aparecerá en la conversación

### 👨‍💼 Dashboard Administrativo

#### Vista General
- Panel con métricas principales:
  - Total de solicitudes
  - Pendientes de revisión
  - Aceptadas
  - Rechazadas

#### Gestionar Solicitudes
- Tabla completa con todas las solicitudes
- Información visible: ID, usuario, proyecto, estado, fecha, documentos

#### Cambiar Estado
1. Localiza la solicitud en la tabla
2. Usa el selector en la columna "Acciones"
3. Elige el nuevo estado:
   - Pendiente de revisión
   - Aceptada
   - Rechazada
   - Requiere más información

#### Ver Detalles
1. Haz clic en cualquier fila de la tabla
2. Se abrirá un modal con:
   - Descripción completa
   - Documentos adjuntos
   - Historial de conversación

#### Buscar y Filtrar
- Campo de búsqueda: Busca por proyecto o comentarios
- Selector de estado: Filtra por estado específico

## 🎨 Código de Colores

| Estado | Color |
|--------|-------|
| Pendiente de revisión | 🟡 Amarillo |
| Aceptada | 🟢 Verde |
| Rechazada | 🔴 Rojo |
| Requiere más información | 🟠 Naranja |

## 🔧 Personalización

### Agregar Nuevos Usuarios
Edita `src/data/mockData.js` y agrega usuarios al array `MOCK_USERS`:

```javascript
{
  id: 5,
  email: 'nuevo@email.com',
  name: 'Nombre Usuario',
  rol: 'user', // o 'admin'
  estado: 'Activo',
  password: 'password123'
}
```

### Agregar Nuevas Solicitudes
Edita `src/data/mockData.js` y agrega solicitudes al array `MOCK_SOLICITUDES`:

```javascript
{
  id: 5,
  usuarioID: 1,
  adminID: 3,
  proyecto: 'Nombre del Proyecto',
  comentarios: 'Descripción de la solicitud...',
  estado: 'Pendiente de revisión',
  fechaCreacion: '2026-01-29T10:00:00',
  fechaActualizacion: '2026-01-29T10:00:00'
}
```

### Modificar Colores
El color principal se define en:
- `src/index.css`: Variable CSS `--primary`
- `tailwind.config.js`: Color extendido `primary`

## ⚠️ Limitaciones Actuales (MVP)

- **Datos en memoria**: Los cambios se pierden al recargar la página
- **Sin backend**: Todo funciona en el navegador
- **Archivos simulados**: La carga de archivos no persiste
- **Sin autenticación real**: Las contraseñas no están encriptadas

## 🔜 Próximos Pasos (Fase 2)

Para convertir esto en una aplicación de producción:

1. **Backend con Azure**
   - Azure Functions para API
   - Azure SQL Database o Cosmos DB
   - Azure Blob Storage para archivos

2. **Autenticación Real**
   - Azure AD B2C
   - JWT tokens
   - Roles y permisos granulares

3. **Funcionalidades Avanzadas**
   - Notificaciones push
   - Exportación de reportes
   - Dashboard con gráficos
   - Gestión completa de usuarios

## 🆘 Solución de Problemas

### El servidor no inicia
```bash
# Limpia node_modules y reinstala
rm -rf node_modules package-lock.json
npm install
npm run dev
```

### Los estilos no se aplican
Verifica que Tailwind CSS esté instalado:
```bash
npm install -D tailwindcss postcss autoprefixer
```

### Error de puerto en uso
Vite seleccionará automáticamente otro puerto (normalmente 5174 si 5173 está ocupado)

## 📞 Soporte

Para cualquier duda o problema, contacta con el equipo de desarrollo.

---

**7P-PLL** - Your Partner in Innovation © 2026
