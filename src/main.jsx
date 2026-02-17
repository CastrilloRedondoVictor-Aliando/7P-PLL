import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { PublicClientApplication } from '@azure/msal-browser'
import { MsalProvider } from '@azure/msal-react'
import './index.css'
import App from './App.jsx'
import { AuthProvider } from './context/AuthContext'
import { msalConfig } from './config/msalConfig'

// Inicializar MSAL
const msalInstance = new PublicClientApplication(msalConfig);

// Inicializar MSAL antes de renderizar
msalInstance.initialize().then(() => {
  createRoot(document.getElementById('root')).render(
    <StrictMode>
      <MsalProvider instance={msalInstance}>
        <AuthProvider>
          <App />
        </AuthProvider>
      </MsalProvider>
    </StrictMode>,
  );
});
