import { StrictMode } from 'react'
import './index.css'

const loadRuntimeConfig = async () => {
  if (globalThis.window === undefined) return;

  await new Promise((resolve) => {
    const script = document.createElement('script');
    script.src = `/env-config.js?ts=${Date.now()}`;
    script.async = false;
    script.onload = () => resolve();
    script.onerror = () => resolve();
    document.head.appendChild(script);
  });
};

const bootstrap = async () => {
  await loadRuntimeConfig();

  const [
    { createRoot },
    { PublicClientApplication },
    { MsalProvider },
    { default: App },
    authContextModule,
    msalConfigModule,
  ] = await Promise.all([
    import('react-dom/client'),
    import('@azure/msal-browser'),
    import('@azure/msal-react'),
    import('./App.jsx'),
    import('./context/AuthContext'),
    import('./config/msalConfig'),
  ]);

  const msalInstance = new PublicClientApplication(msalConfigModule.msalConfig);

  await msalInstance.initialize();

  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <MsalProvider instance={msalInstance}>
        <authContextModule.AuthProvider>
          <App />
        </authContextModule.AuthProvider>
      </MsalProvider>
    </StrictMode>,
  );
};

bootstrap();
