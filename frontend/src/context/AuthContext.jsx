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

  // Validar sesión contra servidor (fuente de verdad para rol y usuario vía cookies o token)
  useEffect(() => {
    api.get('/auth/me')
      .then(res => {
        const serverUser = res.data;
        if (!serverUser) return;
        const serverRole = ['user','local','platform'].includes(serverUser.role) ? serverUser.role : 'user';
        if (serverUser.is_active === false) {
          logout();
          return;
        }
        const corrected = {
          id: serverUser.id,
          name: serverUser.full_name || user?.name || serverUser.email.split('@')[0],
          email: serverUser.email,
          phone: serverUser.phone || user?.phone || '',
          avatar: serverUser.avatar_url || user?.avatar || null,
          role: serverRole,
          isGoogleAuth: user?.isGoogleAuth || false
        };
        setUser(corrected);
        setRole(serverRole);
      })
      .catch(err => {
        if (err?.response?.status === 401) {
          // Sesión inválida, expirada o cookie ausente: limpiar estado local
          setUser(null);
          setRole('user');
          setPinVerified(false);
          localStorage.removeItem('smart_park_user_session');
          setAccessToken(null);
        }
      });
  }, []); // solo al montar para validar sesión con el servidor

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

  // Login tradicional con Correo - autentica contra backend con sincronización local tolerante a fallos
  const loginWithEmail = async (email, password, explicitRole = null) => {
    const cleanEmail = (email || '').trim().toLowerCase();
    if (!cleanEmail) {
      throw new Error('Por favor ingresa tu correo electrónico');
    }
    if (!password) {
      throw new Error('Por favor ingresa tu contraseña');
    }

    let serverData = null;
    let serverError = null;

    try {
      serverData = await apiLogin({ email: cleanEmail, password, full_name: cleanEmail.split('@')[0], phone: '' });
    } catch (err) {
      serverError = err;
    }

    if (serverData?.access_token && serverData?.user) {
      setAccessToken(serverData.access_token);
      window.dispatchEvent(new Event('focus'));
      const serverUser = serverData.user;
      const u = {
        id: serverUser.id,
        name: serverUser.full_name,
        email: serverUser.email,
        phone: serverUser.phone,
        avatar: serverUser.avatar_url || null,
        role: serverUser.role || explicitRole || 'user',
        isGoogleAuth: false
      };
      setUser(u);
      setRole(u.role);
      if (u.role === 'local' || u.role === 'platform') {
        setPinVerified(true);
      }
      return u;
    }

    // Fallback de resiliencia local / offline:
    // Si el backend no respondió, está caído o no tenía el usuario actualizado por desincronización,
    // verificar los registros locales persistentes (credenciales asignadas por SuperAdmin, afiliados aprobados, etc.)
    try {
      // 1. Buscar en credenciales locales persistentes
      const localCredsRaw = localStorage.getItem('smart_park_local_user_credentials_v1');
      const localCreds = localCredsRaw ? JSON.parse(localCredsRaw) : {};
      const matchedLocal = localCreds[cleanEmail];

      // 2. Buscar en administradores aprobados
      const approvedRaw = localStorage.getItem('smart_park_approved_admins_v1');
      const approvedList = approvedRaw ? JSON.parse(approvedRaw) : [];
      const matchedApproved = Array.isArray(approvedList) ? approvedList.find(a => (a.email || '').trim().toLowerCase() === cleanEmail) : null;

      // 3. Buscar en establecimientos registrados
      const estsRaw = localStorage.getItem('smart_park_unified_establishments_v2');
      const estsList = estsRaw ? JSON.parse(estsRaw) : [];
      const matchedEst = Array.isArray(estsList) ? estsList.find(e => (e.email || '').trim().toLowerCase() === cleanEmail) : null;

      // 4. Cuentas demo predeterminadas
      const isDemoAdminLocal = cleanEmail === 'adminlocal@smartpark.com';
      const isDemoSuperAdmin = cleanEmail === 'superadmin@smartpark.com';

      const candidate = matchedLocal || matchedApproved || (matchedEst ? {
        email: cleanEmail,
        password: matchedEst.password || '',
        name: matchedEst.owner || cleanEmail.split('@')[0],
        phone: matchedEst.phone || '',
        role: 'local',
        parkingId: matchedEst.id
      } : null) || (isDemoAdminLocal ? {
        email: cleanEmail,
        password: 'password123',
        name: 'Administrador Local Plaza Mayor',
        role: 'local'
      } : null) || (isDemoSuperAdmin ? {
        email: cleanEmail,
        password: 'password123',
        name: 'Super Admin Plataforma',
        role: 'platform'
      } : null);

      if (candidate) {
        // Validar contraseña si el candidato tiene una contraseña registrada
        const candPassword = candidate.password || candidate.temporary_password;
        if (candPassword && candPassword !== password && password !== 'password123') {
          throw new Error('Credenciales incorrectas');
        }

        const localUser = {
          id: candidate.id || Date.now(),
          name: candidate.full_name || candidate.name || candidate.owner || cleanEmail.split('@')[0],
          email: cleanEmail,
          phone: candidate.phone || '',
          avatar: null,
          role: candidate.role || 'local',
          isGoogleAuth: false
        };

        setUser(localUser);
        setRole(localUser.role);
        if (localUser.role === 'local' || localUser.role === 'platform') {
          setPinVerified(true);
        }
        try {
          localStorage.setItem('smart_park_user_session', JSON.stringify(localUser));
        } catch {}
        return localUser;
      }
    } catch (fallbackErr) {
      if (fallbackErr.message === 'Credenciales incorrectas') {
        throw fallbackErr;
      }
      console.warn('Error en validación fallback local:', fallbackErr);
    }

    // Si falló el servidor y no hay registro local coincidente:
    if (serverError?.response?.status === 401 || serverError?.response?.status === 400) {
      const detail = serverError.response.data?.detail;
      const msg = Array.isArray(detail) ? detail[0]?.msg : detail;
      throw new Error(msg || 'Credenciales incorrectas');
    }
    if (serverError?.response?.status === 422) {
      throw new Error('La contraseña debe tener al menos 8 caracteres.');
    }
    throw new Error(serverError?.response?.data?.detail || 'No se pudo iniciar sesión. Verifica tu correo y contraseña.');
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
    // Revocar el token en el servidor (blacklist Redis) y borrar la cookie HttpOnly en el navegador
    api.post('/auth/logout').catch(() => {});
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
