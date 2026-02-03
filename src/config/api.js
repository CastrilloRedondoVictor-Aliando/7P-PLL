// URL base de la API
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://7p-pll-api.azurewebsites.net/api';

// Helper para hacer requests
export const apiRequest = async (endpoint, options = {}) => {
  const url = `${API_BASE_URL}${endpoint}`;
  
  // Si el body es FormData, no establecemos Content-Type (el navegador lo hace automáticamente)
  const isFormData = options.body instanceof FormData;
  
  const config = {
    credentials: 'include', // Importante para CORS con credenciales
    headers: isFormData ? {
      ...options.headers,
    } : {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    ...options,
  };

  try {
    const response = await fetch(url, config);
    
    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Error en la petición' }));
      throw new Error(error.error || `Error ${response.status}: ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    console.error('API Error:', error);
    throw error;
  }
};
