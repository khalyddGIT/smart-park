import React, { createContext, useContext, useState, useEffect } from 'react';
import { setAccessToken, getAccessToken, register as apiRegister, login as apiLogin, googleAuth as apiGoogleAuth } from '../services/api';
import api from '../services/api';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('smart_park_user_session');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    return null;
  });

  const [role, setRole] = useState(user?.role || 'user');
  const [pinVerified, setPinVerified] = useState(false);

  useEffect(() => {
    if (user) {
      setRole(user.role || 'user');
      try {
        localStorage.setItem('smart_park_user_session', JSON.stringify(user));
      } catch (e) {}
    } else {
      localStorage.removeItem('smart_park_user_session');
    }
  }, [user]);

  const switchRole = (newRole) => {
    setRole(newRole);
    if (user) {
      setUser(prev => ({ ...prev, role: newRole }));
    }
    if (newRole === 'user') setPinVerified(false);
  };

  // Autenticación con Google Real (JWT ID Token) - persistente Supabase
  const loginWithGoogle = async (credentialResponse) => {
    try {
      const idToken = credentialResponse.credential;
      const base64Url = idToken.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''));
      const profile = JSON.parse(jsonPayload);
      // Intentar backend primero (persistente)
      try {
        const data = await apiGoogleAuth({ token: idToken, email: profile.email, name: profile.name, picture: profile.picture });
        if (data?.access_token && data?.user) {
          setAccessToken(data.access_token);
          const u = { id: data.user.id, name: data.user.full_name || profile.name, email: data.user.email, avatar: profile.picture || null, role: data.user.role || 'user', isGoogleAuth: true };
          setUser(u); setRole(u.role); return u;
        }
      } catch (err) { console.warn('Google backend no disponible, fallback local', err?.response?.data || err.message); }
      const googleUser = { id: profile.sub || Date.now(), name: profile.name || profile.email.split('@')[0], email: profile.email, avatar: profile.picture || null, role: 'user', isGoogleAuth: true };
      setUser(googleUser); setRole('user'); return googleUser;
    } catch (e) { console.error('Error al procesar Google Auth:', e); throw e; }
  };

  // Login tradicional con Correo - intenta backend Supabase, fallback local
  const loginWithEmail = async (email, password, explicitRole = null) => {
    // Autenticación SIEMPRE contra el backend: el rol lo define la base de datos, nunca el email
    let data;
    try {
      data = await apiLogin({ email, password, full_name: email.split('@')[0], phone: '' });
    } catch (err) {
      if (err?.response?.status === 401) throw new Error(err.response.data?.detail || 'Credenciales incorrectas');
      if (err?.response?.status === 422) throw new Error('La contraseña debe tener al menos 8 caracteres.');
      throw new Error('Servidor no disponible. Intenta más tarde.');
    }
    if (!data?.access_token || !data?.user) {
      throw new Error('Respuesta inválida del servidor de autenticación');
    }
    setAccessToken(data.access_token);
    // Disparar la carga inmediata de datos del usuario (reservas, etc.) sin esperar el polling de 15s
    window.dispatchEvent(new Event('focus'));
    const u = { id: data.user.id, name: data.user.full_name, email: data.user.email, avatar: null, role: data.user.role || explicitRole || 'user', isGoogleAuth: false };
    setUser(u); setRole(u.role); return u;
  };

  // Registro de Conductor - persistente Supabase
  const registerUser = async (userData) => {
    try {
      const data = await apiRegister({ full_name: userData.name, email: userData.email, phone: userData.phone || '', password: userData.password || 'password123', role: 'user' });
      if (data?.access_token && data?.user) {
        setAccessToken(data.access_token);
        const u = { id: data.user.id, name: data.user.full_name, email: data.user.email, phone: data.user.phone, avatar: null, role: data.user.role || 'user', isGoogleAuth: false };
        setUser(u); setRole('user'); return u;
      }
    } catch (err) {
      const s = err?.response?.status;
      if (s === 400) throw new Error(err.response.data?.detail || 'Correo ya registrado');
      // 422 (validación: contraseña corta, email inválido, etc.) debe mostrarse, no fingir sesión local
      if (s === 422) {
        const d = err.response.data?.detail;
        const first = Array.isArray(d) ? d[0]?.msg : d;
        throw new Error(first ? String(first).replace('Value error, ', '') : 'Datos de registro inválidos.');
      }
      console.warn('Register backend no disponible, fallback local', err.message);
    }
    const newUser = { id: Date.now(), name: userData.name, email: userData.email, phone: userData.phone, plate: userData.plate, avatar: null, role: 'user', isGoogleAuth: false };
    setUser(newUser); setRole('user'); return newUser;
  };

  // Registro de Administrador de Establecimiento / Cochera
  const registerEstablishmentAdmin = (adminData) => {
    const newAdmin = {
      id: Date.now(),
      name: adminData.ownerName || adminData.name,
      email: adminData.email,
      phone: adminData.phone,
      establishmentName: adminData.establishmentName,
      address: adminData.address,
      capacity: adminData.capacity,
      role: 'local',
      isGoogleAuth: false
    };
    setUser(newAdmin);
    setRole('local');
    setPinVerified(true);
    return newAdmin;
  };

  // Cerrar Sesión Definitivo
  const logout = () => {
    // Revocar el token en el servidor (blacklist Redis) antes de limpiar la sesión local.
    // Fire-and-forget: si falla o no hay token, el cierre local procede igual.
    const token = localStorage.getItem('smart_park_access_token');
    if (token) {
      api.post('/auth/logout', {}, { headers: { Authorization: `Bearer ${token}` } }).catch(() => {});
    }
    setUser(null);
    setRole('user');
    setPinVerified(false);
    localStorage.removeItem('smart_park_user_session');
    setAccessToken(null);
  };

  return (
    <AuthContext.Provider value={{ 
      role, 
      setRole: switchRole, 
      user, 
      setUser,
      pinVerified, 
      setPinVerified,
      loginWithGoogle,
      loginWithEmail,
      registerUser,
      registerEstablishmentAdmin,
      logout,
      isAuthenticated: !!user
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
