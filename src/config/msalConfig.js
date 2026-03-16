const ciamHost = import.meta.env.VITE_AZURE_CIAM_HOST || 'pllltexternal.ciamlogin.com';
const tenantId = import.meta.env.VITE_AZURE_TENANT_ID || '';
const authority = import.meta.env.VITE_AZURE_AUTHORITY || (tenantId ? `https://${ciamHost}/${tenantId}` : `https://${ciamHost}`);
const apiScope = (import.meta.env.VITE_AZURE_API_SCOPE || '').trim();
export const hasApiScope = Boolean(apiScope);
const knownAuthoritiesFromEnv = (import.meta.env.VITE_AZURE_KNOWN_AUTHORITIES || '')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean);

const authorityHost = (() => {
  try {
    return new URL(authority).host;
  } catch {
    return '';
  }
})();

const isExternalIdAuthority = authorityHost.endsWith('ciamlogin.com');
const knownAuthorities = knownAuthoritiesFromEnv.length > 0
  ? knownAuthoritiesFromEnv
  : (isExternalIdAuthority ? [authorityHost || ciamHost] : [ciamHost]);

export const msalConfig = {
  auth: {
    clientId: import.meta.env.VITE_AZURE_CLIENT_ID,
    authority,
    ...(knownAuthorities ? { knownAuthorities } : {}),
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
  scopes: apiScope
    ? [apiScope, 'openid', 'profile', 'email', 'offline_access']
    : ['openid', 'profile', 'email', 'offline_access']
};
