export const msalConfig = {
  auth: {
    clientId: import.meta.env.VITE_AZURE_CLIENT_ID,
    authority: 'https://login.microsoftonline.com/common',
    redirectUri: import.meta.env.PROD 
      ? import.meta.env.VITE_AZURE_REDIRECT_URI_PROD
      : 'http://localhost:5174',
    postLogoutRedirectUri: import.meta.env.PROD
      ? import.meta.env.VITE_AZURE_REDIRECT_URI_PROD
      : 'http://localhost:5174',
  },
  cache: {
    cacheLocation: 'sessionStorage',
    storeAuthStateInCookie: false,
  },
  system: {
    allowNativeBroker: false,
  }
};

export const loginRequest = {
  scopes: ['openid', 'profile', 'email', `api://${import.meta.env.VITE_AZURE_CLIENT_ID}/User.Read`]
};
