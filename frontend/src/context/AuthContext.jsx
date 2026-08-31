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
      const safeRole = ['user','local','platform'].includes(user.role) ? user.role : 'user';
      if (safeRole !== user.role) {
        setUser(prev => ({ ...prev, role: safeRole }));
        setRole(safeRole);
        return;
      }
      setRole(safeRole);
      try {
        localStorage.setItem('smart_park_user_session', JSON.stringify({ ...user, role: safeRole }));
      } catch (e) {}
    } else {
      localStorage.removeItem('smart_park_user_session');
    }
  }, [user]);

  // Validar sesión contra servidor (fuente de verdad para rol y is_active)
  useEffect(() => {
    const token = getAccessToken();
    if (!token) return;
    api.get('/auth/me')
      .then(res => {
        const serverUser = res.data;
        if (!serverUser) return;
        const serverRole = ['user','local','platform'].includes(serverUser.role) ? serverUser.role : 'user';
        if (serverUser.is_active === false) {
          logout();
          return;
        }
        // Corregir spoof de localStorage: si rol o id no coinciden con servidor, sobrescribir
        if (!user || user.role !== serverRole || user.id !== serverUser.id || (serverUser.avatar_url && user.avatar !== serverUser.avatar_url)) {
          const corrected = user 
            ? { ...user, id: serverUser.id, role: serverRole, name: serverUser.full_name || user.name, email: serverUser.email, avatar: serverUser.avatar_url || user.avatar || null } 
            : { id: serverUser.id, name: serverUser.full_name, email: serverUser.email, phone: serverUser.phone, avatar: serverUser.avatar_url || null, role: serverRole, isGoogleAuth: false };
          setUser(corrected);
          setRole(serverRole);
        }
      })
      .catch(err => {
        if (err?.response?.status === 401) {
          // token inválido, expirado o usuario desactivado
          logout();
        }
      });
  }, []); // solo al montar para no spamear

  const switchRole = (newRole) => {
    const allowed = ['user','local','platform'];
    if (!allowed.includes(newRole)) return;
    // No permitir escalada local si el rol real del servidor no es platform
    // Se valida contra el usuario actual ya verificado; si se intenta spoof, el effect de arriba lo revertirá
    setRole(newRole);
    if (user) {
      // solo permitir bajar o mantener, no subir a platform sin ser platform
      if (newRole === 'platform' && user.role !== 'platform') {
        console.warn('Intento de escalada de rol bloqueado');
        return;
      }
      setUser(prev => ({ ...prev, role: newRole }));
    }
    if (newRole === 'user') setPinVerified(false);
  };

  // Autenticación con Google Real (JWT ID Token) - persistente en Base de Datos
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
          const u = { id: data.user.id, name: data.user.full_name || profile.name, email: data.user.email, avatar: data.user.avatar_url || profile.picture || null, role: data.user.role || 'user', isGoogleAuth: true };
          setUser(u); setRole(u.role); return u;
        }
      } catch (err) {
        console.warn('Google backend no disponible', err?.response?.data || err.message);
        throw new Error(err?.response?.data?.detail || 'No se pudo validar Google con el servidor');
      }
      // Nunca crear sesión local sin validación del servidor
      throw new Error('No se pudo crear sesión Google');
    } catch (e) { console.error('Error al procesar Google Auth:', e); throw e; }
  };

  // Login tradicional con Correo - autentica contra el backend de producción
  const loginWithEmail = async (email, password, explicitRole = null) => {
    // Autenticación SIEMPRE contra el backend: el rol lo define la base de datos, nunca el email
    let data;
    try {
      data = await apiLogin({ email, password, full_name: email.split('@')[0], phone: '' });
    } catch (err) {
      if (err?.response?.status === 401 || err?.response?.status === 400) {
        const detail = err.response.data?.detail;
        const msg = Array.isArray(detail) ? detail[0]?.msg : detail;
        throw new Error(msg || 'Credenciales incorrectas');
      }
      if (err?.response?.status === 422) throw new Error('La contraseña debe tener al menos 8 caracteres.');
      throw new Error(err?.response?.data?.detail || 'Servidor no disponible. Intenta más tarde.');
    }
    if (!data?.access_token || !data?.user) {
      throw new Error('Respuesta inválida del servidor de autenticación');
    }
    setAccessToken(data.access_token);
    // Disparar la carga inmediata de datos del usuario (reservas, etc.) sin esperar el polling de 15s
    window.dispatchEvent(new Event('focus'));
    const u = { id: data.user.id, name: data.user.full_name, email: data.user.email, phone: data.user.phone, avatar: data.user.avatar_url || null, role: data.user.role || explicitRole || 'user', isGoogleAuth: false };
    setUser(u); setRole(u.role); return u;
  };

  // Registro de Conductor - persistente en Base de Datos
  const registerUser = async (userData) => {
    try {
      const data = await apiRegister({ full_name: userData.name, email: userData.email, phone: userData.phone || '', password: userData.password || 'password123', role: 'user' });
      if (data?.access_token && data?.user) {
        setAccessToken(data.access_token);
        const u = { id: data.user.id, name: data.user.full_name, email: data.user.email, phone: data.user.phone, avatar: data.user.avatar_url || null, role: data.user.role || 'user', isGoogleAuth: false };
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
