import { getClientEnv } from './runtimeEnv';

const tenantId = getClientEnv('VITE_AZURE_TENANT_ID', '');
const defaultAuthority = tenantId
  ? `https://login.microsoftonline.com/${tenantId}`
  : 'https://login.microsoftonline.com/organizations';
const authority = getClientEnv('VITE_AZURE_AUTHORITY', defaultAuthority);
const apiScope = getClientEnv('VITE_AZURE_API_SCOPE', '').trim();
export const hasApiScope = Boolean(apiScope);
const knownAuthoritiesFromEnv = getClientEnv('VITE_AZURE_KNOWN_AUTHORITIES', '')
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
let knownAuthorities = knownAuthoritiesFromEnv;
if (knownAuthorities.length === 0 && isExternalIdAuthority) {
  knownAuthorities = [authorityHost];
}

export const msalConfig = {
  auth: {
    clientId: getClientEnv('VITE_AZURE_CLIENT_ID', ''),
    authority,
    ...(knownAuthorities.length > 0 ? { knownAuthorities } : {}),
    redirectUri: import.meta.env.PROD 
      ? getClientEnv('VITE_AZURE_REDIRECT_URI_PROD', '')
      : 'http://localhost:5174',
    postLogoutRedirectUri: import.meta.env.PROD
      ? getClientEnv('VITE_AZURE_REDIRECT_URI_PROD', '')
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
