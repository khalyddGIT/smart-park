import React, { createContext, useContext, useState, useEffect } from 'react';
import { setAccessToken, getAccessToken, register as apiRegister, login as apiLogin, googleAuth as apiGoogleAuth } from '../services/api';

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
    // Intentar backend primero para persistencia real
    try {
      const data = await apiLogin({ email, password, full_name: email.split('@')[0], phone: '' });
      if (data?.access_token && data?.user) {
        setAccessToken(data.access_token);
        const u = { id: data.user.id, name: data.user.full_name, email: data.user.email, avatar: null, role: data.user.role || explicitRole || 'user', isGoogleAuth: false };
        setUser(u); setRole(u.role); if (u.role === 'local') setPinVerified(true); return u;
      }
    } catch (err) {
      // Si backend responde 401, propagar error real
      if (err?.response?.status === 401) throw new Error(err.response.data?.detail || 'Credenciales incorrectas');
      console.warn('Login backend no disponible, fallback local', err.message);
    }
    let userRole = explicitRole;
    let userName = email.split('@')[0].replace('.', ' ');
    const lower = email.toLowerCase().trim();
    if (!userRole) {
      try {
        const approvedAdmins = JSON.parse(localStorage.getItem('smart_park_approved_admins_v1') || '[]');
        const matched = approvedAdmins.find(a => a.email.toLowerCase() === lower);
        if (matched) { userRole = 'local'; userName = matched.name || userName; }
      } catch (e) {}
      if (!userRole) {
        if (lower.includes('admin@') || lower.includes('superadmin')) userRole = 'platform';
        else if (lower.includes('operador') || lower.includes('cochera') || lower.includes('local')) userRole = 'local';
        else userRole = 'user';
      }
    }
    const loggedUser = { id: Date.now(), name: userName, email, avatar: null, role: userRole, isGoogleAuth: false };
    setUser(loggedUser); setRole(userRole); if (userRole === 'local') setPinVerified(true); return loggedUser;
  };

  // Registro de Conductor - persistente Supabase
  const registerUser = async (userData) => {
    try {
      const data = await apiRegister({ full_name: userData.name, email: userData.email, phone: userData.phone || '', password: userData.password || userData.plate || 'password123', role: 'user' });
      if (data?.access_token && data?.user) {
        setAccessToken(data.access_token);
        const u = { id: data.user.id, name: data.user.full_name, email: data.user.email, phone: data.user.phone, avatar: null, role: data.user.role || 'user', isGoogleAuth: false };
        setUser(u); setRole('user'); return u;
      }
    } catch (err) {
      if (err?.response?.status === 400) throw new Error(err.response.data?.detail || 'Correo ya registrado');
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
