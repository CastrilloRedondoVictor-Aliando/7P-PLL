// URL base de la API
export const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://7p-pll-api.azurewebsites.net/api';

// Helper para hacer requests
export const apiRequest = async (endpoint, options = {}) => {
  const url = `${API_BASE_URL}${endpoint}`;
  
  // Extraer token de options si existe
  const { token, ...fetchOptions } = options;
  
  const config = {
    credentials: 'include', // Importante para CORS con credenciales
    headers: {
      'Content-Type': 'application/json',
      ...(token && { 'Authorization': `Bearer ${token}` }), // Agregar token si existe
      ...fetchOptions.headers,
    },
    ...fetchOptions,
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
