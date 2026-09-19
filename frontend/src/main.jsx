import React from 'react'
import ReactDOM from 'react-dom/client'
import { GoogleOAuthProvider } from '@react-oauth/google'
import { App } from './App.jsx'
import { ErrorBoundary } from './components/ErrorBoundary.jsx'
import { AuthProvider } from './context/AuthContext.jsx'
import { EstablishmentProvider } from './context/EstablishmentContext.jsx'
import { NotificationProvider } from './context/NotificationContext.jsx'
import { ThemeProvider } from './context/ThemeContext.jsx'
import './index.css'

// Leer Google Client ID desde variables de entorno de Vite o fallback
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '1058284729184-demo.apps.googleusercontent.com'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
        <ThemeProvider>
          <AuthProvider>
            <EstablishmentProvider>
              <NotificationProvider>
                <App />
              </NotificationProvider>
            </EstablishmentProvider>
          </AuthProvider>
        </ThemeProvider>
      </GoogleOAuthProvider>
    </ErrorBoundary>
  </React.StrictMode>,
)

// Registro automático del Service Worker para PWA (Pilar 2)
if (typeof window !== 'undefined' && 'serviceWorker' in navigator && (window.location.protocol === 'https:' || window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then((reg) => {
        try { reg.update(); } catch (e) {}
        console.log('[PWA] Service Worker activo con alcance:', reg.scope);
      })
      .catch((err) => {
        console.warn('[PWA] Fallo al registrar Service Worker:', err);
      });
  });
}
