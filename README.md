# 7P-PLL – Portal de Gestión de Solicitudes (Frontend)

SPA (React + Vite + Tailwind) para gestionar solicitudes, documentación y mensajería entre usuarios y el equipo interno. Este frontend se integra con un backend Express (Azure SQL + Blob Storage + Azure SignalR) y autenticación multi-tenant con Microsoft Entra ID.

## 🧩 Arquitectura (resumen)

- **Frontend**: `mock/` (React, Vite, Tailwind, MSAL)
- **Backend**: `backend-mock/` (Express, Azure SQL, Azure Blob Storage, Azure SignalR)
- **Autenticación**: Microsoft Entra ID (multi-tenant) con MSAL en el SPA y validación de JWT en API
- **Tiempo real**: Chat por solicitud usando Azure SignalR + grupos por solicitud

## ✅ Funcionalidad incluida

### Portal de usuario
- Listado de “Mis solicitudes” con búsqueda y filtro por estado
- Detalle de solicitud (en responsive móvil se abre como popup)
- Carga/descarga/eliminación de documentos por categoría (`General`, `Vuelos`, `Hoteles`)
- Conversación (mensajes) asociada a la solicitud y marcado de mensajes como leídos

### Panel interno (Admin)
- Dashboard para visualizar y gestionar solicitudes
- Acceso a detalle/documentación/mensajes

## 👥 Roles

- `admin`: usuarios cuyo `tenantId` coincide con `PEREZ_LLORCA_TENANT_ID` (configurado en backend)
- `user`: resto de tenants

El rol se asigna automáticamente al sincronizar el usuario tras login (`POST /api/auth/sync-user`).

## 🛠️ Tecnologías

- React + Vite
- Tailwind CSS
- `@azure/msal-react` / `@azure/msal-browser`
- `@microsoft/signalr`

## 🔧 Variables de entorno (frontend)

Crear `mock/.env` (o `mock/.env.local`) con:

```env
# Base URL de la API
VITE_API_URL=http://localhost:3000/api

# Entra ID (App Registration)
VITE_AZURE_CLIENT_ID=...

# URL de producción (SWA). En desarrollo se usa http://localhost:5174
VITE_AZURE_REDIRECT_URI_PROD=https://polite-sky-09fcdc103.4.azurestaticapps.net
```

## ▶️ Ejecución local (front + back)

### 1) Backend

```bash
cd ../backend-mock
npm install

# Dev
npm run dev
```

Requiere configurar `backend-mock/.env` (ver `backend-mock/.env.example`).

### 2) Frontend

```bash
cd ../mock
npm install
npm run dev
```

Por defecto Vite arranca en `http://localhost:5174`.

## 📚 Documentación (del repo)

- API (endpoints y mapeo de campos): `../backend-mock/API_DOCUMENTATION.md`
- Entra ID / MSAL (config completa): `../ENTRAID_SETUP.md`
- Azure Blob Storage: `../BLOB_SETUP.md`
- Azure SignalR: `../SIGNALR_SETUP.md`
- Guía de uso funcional (pantallas): `./GUIA_USO.md`
- Funcionalidad implementada (checklist): `./FEATURES.md`

## 🗃️ Modelo de datos (referencia)

El esquema SQL de referencia está en `./schema.sql` (tablas `Usuarios`, `Solicitudes`, `Documentos`, `Mensajes`). En entorno Azure, la BD debe contener las columnas necesarias para Entra ID (p.ej. `entraIdOID`, `tenantId`).

## 💻 Comandos

```bash
npm run dev
npm run build
npm run preview
npm run lint
```

## 📝 Notas

- La autenticación principal es con Microsoft Entra ID (botón “Iniciar sesión con Microsoft”). El backend mantiene un login legacy por email/contraseña para usuarios antiguos, pero el flujo estándar es MSAL + `sync-user`.
- La mensajería se envía en tiempo real por SignalR; la API de mensajes se usa para carga histórica y marcado de leídos.
