import React from 'react'
import ReactDOM from 'react-dom/client'
import { App } from './App.jsx'
import { AuthProvider } from './context/AuthContext.jsx'
import { EstablishmentProvider } from './context/EstablishmentContext.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <EstablishmentProvider>
        <App />
      </EstablishmentProvider>
    </AuthProvider>
  </React.StrictMode>,
)
