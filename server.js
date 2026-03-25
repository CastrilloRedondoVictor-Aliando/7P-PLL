import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const port = globalThis.process?.env.PORT || 3000;
const distPath = path.join(__dirname, 'dist');

const clientEnvKeys = [
  'VITE_API_URL',
  'VITE_AZURE_CLIENT_ID',
  'VITE_AZURE_TENANT_ID',
  'VITE_AZURE_AUTHORITY',
  'VITE_AZURE_KNOWN_AUTHORITIES',
  'VITE_AZURE_CIAM_HOST',
  'VITE_AZURE_API_SCOPE',
  'VITE_AZURE_REDIRECT_URI_PROD',
  'VITE_AUTH_DEBUG'
];

app.get('/env-config.js', (_req, res) => {
  const runtimeConfig = {};

  clientEnvKeys.forEach((key) => {
    const value = globalThis.process?.env[key];
    if (typeof value === 'string' && value.length > 0) {
      runtimeConfig[key] = value;
    }
  });

  res.type('application/javascript');
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.send(`window.__APP_CONFIG__ = ${JSON.stringify(runtimeConfig)};`);
});

app.use(express.static(distPath, { index: false }));

app.use((_req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

app.listen(port, () => {
  console.info(`[frontend] Listening on port ${port}`);
});

