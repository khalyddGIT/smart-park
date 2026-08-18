import React, { createContext, useContext, useState } from 'react';

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [role, setRole] = useState('user'); // 'user', 'local', 'platform'
  const [user, setUser] = useState({
    id: 1,
    name: 'Carlos Mendoza',
    email: 'carlos@smartpark.com',
    role: 'user'
  });

  const [pinVerified, setPinVerified] = useState(false);

  const switchRole = (newRole) => {
    setRole(newRole);
    setUser(prev => ({ ...prev, role: newRole }));
    if (newRole === 'user') setPinVerified(false);
  };

  return (
    <AuthContext.Provider value={{ role, setRole: switchRole, user, pinVerified, setPinVerified }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
