import React from 'react'
import ReactDOM from 'react-dom/client'
import { GoogleOAuthProvider } from '@react-oauth/google'
import { App } from './App.jsx'
import { AuthProvider } from './context/AuthContext.jsx'
import { EstablishmentProvider } from './context/EstablishmentContext.jsx'
import './index.css'

// Leer Google Client ID desde variables de entorno de Vite o fallback
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '1058284729184-demo.apps.googleusercontent.com'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <AuthProvider>
        <EstablishmentProvider>
          <App />
        </EstablishmentProvider>
      </AuthProvider>
    </GoogleOAuthProvider>
  </React.StrictMode>,
)
