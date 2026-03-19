import { getClientEnv } from './runtimeEnv';

// URL base de la API
export const API_BASE_URL = getClientEnv('VITE_API_URL', 'https://7p-pll-api.azurewebsites.net/api');

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
