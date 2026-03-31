# 7P-PLL Frontend

Aplicacion SPA desarrollada con React y Vite para la gestion de solicitudes, documentos y mensajeria entre usuarios finales y el equipo interno de Perez-Llorca. El frontend consume el backend `backend-mock/`, se autentica con Microsoft Entra ID y usa Azure SignalR para actualizaciones en tiempo real.

## Resumen

- Framework UI: React 19
- Tooling: Vite 7
- Estilos: Tailwind CSS
- Autenticacion: `@azure/msal-browser` y `@azure/msal-react`
- Tiempo real: `@microsoft/signalr`
- Runtime server de produccion: Express 5 sirviendo `dist/` y `env-config.js`

## Objetivo funcional

La SPA cubre dos experiencias de usuario sobre la misma base de codigo:

- Portal de usuario para gestionar solicitudes propias
- Dashboard administrativo para supervision y operacion interna

La experiencia final combina:

- autenticacion corporativa con Entra ID
- carga de documentos por categoria
- conversacion por solicitud con lectura en tiempo real
- seguimiento del estado de cada solicitud
- acceso a guia de uso y documentacion corporativa

## Arquitectura de alto nivel

1. El usuario inicia sesion con MSAL.
2. Tras el callback, la app sincroniza el usuario con `POST /api/auth/sync-user`.
3. `AuthContext` conserva usuario, solicitudes, documentos, mensajes y conexion SignalR.
4. La app renderiza `AdminDashboard` para roles `admin` y `view`, y `UserPortal` para `user`.
5. La comunicacion con la API se centraliza en `src/config/api.js`.
6. En produccion, `server.js` sirve `dist/` y expone `/env-config.js` para leer variables en runtime.

## Estructura del proyecto

```text
mock/
|-- public/                 # Assets publicos y runtime env config
|-- src/
|   |-- components/         # Componentes reutilizables y modales
|   |-- config/             # Config API, MSAL y runtime env
|   |-- context/            # AuthContext y estado global de la app
|   |-- hooks/              # Hooks personalizados
|   |-- pages/              # Login, portal usuario y dashboard admin
|   |-- utils/              # Helpers de formato y preview documental
|   |-- __tests__/          # Tests de interfaz y comportamiento
|-- server.js               # Servidor Express de produccion
|-- deploy.ps1              # Empaquetado y despliegue a App Service
|-- vite.config.js          # Configuracion Vite
|-- tailwind.config.js      # Configuracion Tailwind
```

## Pantallas principales

### LoginPage

- Entrada principal no autenticada
- Arranca el login redirect de MSAL
- Muestra la marca y el estado de carga inicial

### UserPortal

- Lista solo solicitudes del usuario autenticado
- Permite buscar por proyecto o comentario
- Filtros por estado y rango de fechas
- Abre el detalle de la solicitud en layout responsive
- Muestra alertas de mensajes no leidos
- Permite crear solicitudes, subir documentos y enviar mensajes cuando la solicitud no esta cerrada

### AdminDashboard

- Vista operativa global para roles `admin` y `view`
- Tabla y cards con busqueda, filtros, paginacion y estadisticas
- Apertura de detalle, descarga masiva y operacion sobre documentos
- Cambio de estado y edicion avanzada de solicitudes
- Importacion y resolucion de usuarios desde Graph
- Distincion operativa entre `admin` y `view`

## Componentes relevantes

- `SolicitudDetail`: detalle de solicitud, timeline de mensajes y gestion documental
- `CreateSolicitudModal`: alta de solicitudes desde administracion
- `CreateSolicitudModalUser`: alta simplificada desde el portal de usuario
- `EditSolicitudModal`: edicion administrativa
- `SolicitudCard`: representacion compacta para portal de usuario

## Roles soportados en la UI

| Rol | Vista | Capacidades |
| --- | --- | --- |
| `admin` | `AdminDashboard` | Gestion completa, cambio de estado, creacion para terceros, borrado de solicitudes, mensajes y documentos |
| `view` | `AdminDashboard` | Consulta operativa con restricciones de mutacion |
| `user` | `UserPortal` | Gestion exclusiva de solicitudes propias |

La asignacion del rol no se resuelve en el frontend. La UI consume el rol ya calculado por el backend tras `sync-user`.

## Flujo de autenticacion

La autenticacion se implementa en dos capas:

1. MSAL obtiene `idToken` o `accessToken` en funcion de si existe scope API configurado.
2. `App.jsx` procesa el redirect con `instance.handleRedirectPromise()`.
3. `AuthContext` llama a `handleLoginSuccess()` y sincroniza la sesion con el backend.
4. El backend devuelve el usuario normalizado con su rol.
5. La SPA usa ese rol para decidir la vista y las capacidades disponibles.

Detalles importantes:

- `cacheLocation` esta configurado en `sessionStorage`
- la redireccion local esta fijada en `http://localhost:5174`
- en produccion se usa `VITE_AZURE_REDIRECT_URI_PROD`
- cuando el backend devuelve `401` o `403`, la capa API muestra una alerta reutilizable con SweetAlert

## Estado global y SignalR

`src/context/AuthContext.jsx` centraliza:

- usuario autenticado
- solicitudes cargadas desde la API
- documentos asociados
- mensajes historicos y en tiempo real
- metodos de negocio consumidos por las pantallas
- conexion actual a SignalR

Funciones relevantes del contexto:

- `loadData()` para carga inicial
- `createSolicitud()`
- `updateSolicitudEstado()` y `updateSolicitudCompleta()`
- `uploadDocument()` y `deleteDocument()`
- `sendMessage()`
- `markMessagesAsRead()` y `markDocsAsViewed()`
- `refreshSolicitudMensajes()` para recarga puntual del detalle admin

La UI se une y sale de grupos SignalR por solicitud mediante los endpoints `/signalr/join-group` y `/signalr/leave-group`.

## Integracion con la API

La URL base se obtiene desde `src/config/api.js`.

Fallback por defecto:

```text
https://7p-pll-api.azurewebsites.net/api
```

Principales recursos consumidos:

- `/auth/sync-user`
- `/solicitudes`
- `/documentos`
- `/mensajes`
- `/signalr/negotiate`
- `/signalr/send-message`
- `/signalr/join-group`
- `/signalr/leave-group`

Referencia completa del backend:

- `../backend-mock/API_DOCUMENTATION.md`

## Variables de entorno del frontend

La app soporta configuracion tanto en build time como en runtime. En produccion, el mecanismo recomendado es runtime via `env-config.js`.

| Variable | Obligatoria | Descripcion |
| --- | --- | --- |
| `VITE_API_URL` | Si | Base URL de la API, incluyendo `/api`. |
| `VITE_AZURE_CLIENT_ID` | Si | Client ID del registro de aplicacion SPA. |
| `VITE_AZURE_TENANT_ID` | Recomendable | Tenant base para authority por defecto. |
| `VITE_AZURE_AUTHORITY` | Recomendable | Authority explicita de Entra ID o CIAM. |
| `VITE_AZURE_KNOWN_AUTHORITIES` | No | Lista separada por comas si se usa CIAM. |
| `VITE_AZURE_CIAM_HOST` | No | Host CIAM si la organizacion lo necesita. |
| `VITE_AZURE_API_SCOPE` | No | Scope expuesto por la API. Si no existe, la app usa `idToken`. |
| `VITE_AZURE_REDIRECT_URI_PROD` | Si en produccion | Redirect URI del frontend desplegado. |
| `VITE_AUTH_DEBUG` | No | Activa logs de diagnostico en autenticacion. |

### Ejemplo para desarrollo local

```env
VITE_API_URL=http://localhost:3000/api
VITE_AZURE_CLIENT_ID=00000000-0000-0000-0000-000000000000
VITE_AZURE_TENANT_ID=11111111-1111-1111-1111-111111111111
VITE_AZURE_AUTHORITY=https://login.microsoftonline.com/organizations
VITE_AZURE_API_SCOPE=api://00000000-0000-0000-0000-000000000000/access_as_user
VITE_AZURE_REDIRECT_URI_PROD=https://app-front-7p-pro-01.azurewebsites.net
VITE_AUTH_DEBUG=false
```

## Servidor de produccion

`server.js` cumple dos funciones:

- servir `dist/` como SPA
- exponer `/env-config.js` con variables `VITE_*` leidas desde `process.env`

Esto permite cambiar configuracion en Azure App Service sin reconstruir la aplicacion.

Claves de despliegue:

- Express 5 sirve assets compilados desde `dist/`
- la ruta catch-all usa `app.use((_req, res) => res.sendFile(...))`, compatible con Express 5
- el ZIP de despliegue debe contener `dist/`, `server.js`, `package.json`, `web.config` y `node_modules` de runtime

## Requisitos

- Node.js 22.x
- npm 10 o superior
- Backend disponible local o remotamente
- App registration de Entra ID configurada

## Ejecucion local

### 1. Backend

```bash
cd ../backend-mock
npm install
npm run dev
```

### 2. Frontend

```bash
cd ../mock
npm install
npm run dev
```

Por defecto Vite arranca en:

```text
http://localhost:5174
```

## Scripts disponibles

```bash
npm run dev            # Desarrollo con Vite
npm run build          # Build de produccion en dist/
npm run start          # Arranque del servidor Express de produccion
npm run preview        # Preview local de Vite
npm run lint           # Lint del proyecto
npm test               # Tests con Vitest
npm run test:coverage  # Tests con cobertura
```

## Pruebas

- Framework: Vitest
- Entorno: `jsdom`
- Setup: `src/test/setup.js`

Cobertura actual del alcance funcional:

- `AdminDashboard`
- `UserPortal`
- `SolicitudDetail`
- flujos del contexto de autenticacion

## Despliegue a Azure App Service

`deploy.ps1` construye y empaqueta el frontend para App Service Windows.

El script:

- genera `dist/` salvo que se use `-SkipBuild`
- compone un paquete limpio con `dist/`, `server.js`, `package.json`, `web.config` y dependencias runtime
- valida que el ZIP no contenga el source de Vite en la raiz
- exige `node_modules/express/package.json` porque App Service no instalara dependencias con `WEBSITE_RUN_FROM_PACKAGE=1`

Ejemplo:

```powershell
.\deploy.ps1
```

Recomendaciones de despliegue:

- definir `VITE_API_URL` con URL HTTPS completa del backend para evitar mixed content
- no desplegar un ZIP generado desde la raiz del repo
- verificar que el artefacto desplegado contiene `dist/index.html` y no `src/main.jsx`

## Documentacion relacionada

- `../backend-mock/README.md`
- `../backend-mock/API_DOCUMENTATION.md`
- `../ENTRAID_SETUP.md`
- `../BLOB_SETUP.md`
- `../SIGNALR_SETUP.md`
- `./GUIA_USO.md`
- `./FEATURES.md`

## Incidencias frecuentes

| Problema | Causa habitual | Accion recomendada |
| --- | --- | --- |
| La app arranca pero no autentica | `VITE_AZURE_CLIENT_ID`, authority o redirect mal configurados | Revisar `msalConfig` y las app settings |
| El frontend llama a la API equivocada | `VITE_API_URL` apunta a localhost o HTTP | Ajustar la variable en `.env` o App Service |
| App Service sirve el codigo fuente | ZIP generado desde la raiz del repo | Regenerar paquete con `deploy.ps1` |
| Error 500 por `Cannot find package 'express'` | El ZIP no incluye `node_modules` runtime | Rehacer el paquete deployment-ready |
| El chat no actualiza en tiempo real | Negotiation o SignalR incompletos | Verificar backend, token y conexion SignalR |
