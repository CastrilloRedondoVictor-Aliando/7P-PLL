import { getClientEnv } from './runtimeEnv';
import Swal from 'sweetalert2';

// URL base de la API
export const API_BASE_URL = getClientEnv('VITE_API_URL', 'https://7p-pll-api.azurewebsites.net/api');

let activeSessionExpiredAlert = null;
let activeAuthorizationAlert = null;

const isSessionExpiredError = (_status, payload = {}) => {
  const message = [payload?.error, payload?.message, payload?.details, payload?.code]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();

  return /token.*(expir|caduc|venc)|expired.*token|security token/i.test(message);
};

export const isAuthorizationError = (errorOrStatus) => {
  const status = typeof errorOrStatus === 'number' ? errorOrStatus : errorOrStatus?.status;
  return status === 401 || status === 403;
};

const showSessionExpiredAlert = () => {
  if (activeSessionExpiredAlert) {
    return activeSessionExpiredAlert;
  }

  activeSessionExpiredAlert = Swal.fire({
    icon: 'warning',
    title: 'Token de seguridad expirado',
    text: 'Debes cerrar sesión y volver a entrar porque el token de seguridad ha expirado.',
    confirmButtonColor: '#1e40af',
    confirmButtonText: 'Entendido'
  }).finally(() => {
    activeSessionExpiredAlert = null;
  });

  return activeSessionExpiredAlert;
};

const showAuthorizationAlert = () => {
  if (activeAuthorizationAlert) {
    return activeAuthorizationAlert;
  }

  activeAuthorizationAlert = Swal.fire({
    icon: 'warning',
    title: 'No autorizado',
    text: 'No estas autorizado para realizar esta accion. Prueba a cerrar sesion y volver a entrar.',
    confirmButtonColor: '#1e40af',
    confirmButtonText: 'Entendido'
  }).finally(() => {
    activeAuthorizationAlert = null;
  });

  return activeAuthorizationAlert;
};

// Helper para hacer requests
export const apiRequest = async (endpoint, options = {}) => {
  const url = `${API_BASE_URL}${endpoint}`;
  
  // Extraer token de options si existe
  const { token, ...fetchOptions } = options;
  
  const isFormData = typeof FormData !== 'undefined' && fetchOptions.body instanceof FormData;
  const baseHeaders = {
    ...(token && { 'Authorization': `Bearer ${token}` }),
    ...fetchOptions.headers
  };

  const config = {
    credentials: 'include', // Importante para CORS con credenciales
    headers: isFormData
      ? baseHeaders
      : {
          'Content-Type': 'application/json',
          ...baseHeaders
        },
    ...fetchOptions
  };

  try {
    const response = await fetch(url, config);
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Error en la petición' }));
      if (isAuthorizationError(response.status)) {
        void (isSessionExpiredError(response.status, error)
          ? showSessionExpiredAlert()
          : showAuthorizationAlert());
      }
      const requestError = new Error(error.error || `Error ${response.status}: ${response.statusText}`);
      requestError.status = response.status;
      requestError.code = error.code;
      requestError.payload = error;
      throw requestError;
    }
    
    return await response.json();
  } catch (error) {
    throw error;
  }
};
