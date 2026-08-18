import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(() => {
    try {
      const saved = localStorage.getItem('smart_park_user_session');
      if (saved) return JSON.parse(saved);
    } catch (e) {}
    // Sesión por defecto inicial (puede ser null si se prefiere login forzoso, o sesión activa)
    return {
      id: 1,
      name: 'Yoniver Ch',
      email: 'khalyddwtf@gmail.com',
      avatar: null,
      role: 'user',
      isGoogleAuth: true
    };
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

  // Autenticación con Google Real (JWT ID Token)
  const loginWithGoogle = async (credentialResponse) => {
    try {
      const idToken = credentialResponse.credential;
      
      // Decodificación client-side del token de Google para UI inmediata
      const base64Url = idToken.split('.')[1];
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(atob(base64).split('').map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join(''));
      const profile = JSON.parse(jsonPayload);

      const googleUser = {
        id: profile.sub || Date.now(),
        name: profile.name || profile.email.split('@')[0],
        email: profile.email,
        avatar: profile.picture || null,
        role: 'user',
        isGoogleAuth: true
      };

      // Sincronizar con backend FastAPI si está disponible
      try {
        await fetch('http://localhost:8000/api/v1/auth/google', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            token: idToken,
            email: profile.email,
            name: profile.name,
            picture: profile.picture
          })
        });
      } catch (err) {
        console.warn('Backend offline o sin verificación remota, usando sesión local');
      }

      setUser(googleUser);
      setRole('user');
      return googleUser;
    } catch (e) {
      console.error('Error al procesar Google Auth:', e);
      throw e;
    }
  };

  // Login tradicional con Correo
  const loginWithEmail = (email, password, selectedRole = 'user') => {
    const loggedUser = {
      id: Date.now(),
      name: email.split('@')[0],
      email: email,
      avatar: null,
      role: selectedRole,
      isGoogleAuth: false
    };
    setUser(loggedUser);
    setRole(selectedRole);
    return loggedUser;
  };

  // Registro de Conductor
  const registerUser = (userData) => {
    const newUser = {
      id: Date.now(),
      name: userData.name,
      email: userData.email,
      phone: userData.phone,
      plate: userData.plate,
      avatar: null,
      role: 'user',
      isGoogleAuth: false
    };
    setUser(newUser);
    setRole('user');
    return newUser;
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
