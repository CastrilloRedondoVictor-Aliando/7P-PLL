const readEnvValue = (value) => {
  if (value === undefined || value === null) return '';
  return String(value).trim();
};

const getRuntimeConfig = () => {
  if (typeof window === 'undefined') return {};
  return window.__APP_CONFIG__ || {};
};

export const getClientEnv = (key, fallback = '') => {
  const runtimeValue = readEnvValue(getRuntimeConfig()[key]);
  if (runtimeValue) return runtimeValue;

  const buildValue = readEnvValue(import.meta.env[key]);
  if (buildValue) return buildValue;

  return fallback;
};
