import React, { useState } from 'react';
import { Card } from './ui/card';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Shield, UserCheck, KeyRound } from 'lucide-react';

export const UserRolesModule = () => {
  const [users, setUsers] = useState([
    { id: 1, name: 'Carlos Mendoza', email: 'carlos@smartpark.com', role: 'user', lastAccess: 'Hoy 14:20 (Credenciales)' },
    { id: 2, name: 'Operador San Isidro', email: 'garita.sanisidro@smartpark.com', role: 'local', lastAccess: 'Hoy 12:00 (PIN Virtual)' },
    { id: 3, name: 'Administrador General', email: 'admin@smartpark.com', role: 'platform', lastAccess: 'Hace 1 hora (PIN 1234)' },
  ]);

  const changeRole = (id, newRole) => {
    setUsers(users.map(u => u.id === id ? { ...u, role: newRole } : u));
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-black text-slate-900">Directorio Global de Usuarios & Asignación de Roles</h1>
        <p className="text-xs text-slate-500">Administra los permisos de acceso global y revisa la bitácora de accesos por PIN o contraseña.</p>
      </div>

      <div className="space-y-4">
        {users.map((u) => (
          <Card key={u.id} className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 border-slate-200 shadow-sm">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-black text-base shadow-inner">
                {u.name.charAt(0)}
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900 text-base">{u.name}</h3>
                <p className="text-xs text-slate-500 font-mono">{u.email} • Último ingreso: <span className="text-slate-700 font-bold">{u.lastAccess}</span></p>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              <span className="text-xs font-bold text-slate-600">Cambiar Rol:</span>
              <select
                value={u.role}
                onChange={(e) => changeRole(u.id, e.target.value)}
                className="bg-slate-100 border border-slate-300 rounded-xl px-3 py-1.5 text-xs font-bold text-emerald-800 focus:outline-none"
              >
                <option value="user">Usuario Conductor</option>
                <option value="local">Admin Local</option>
                <option value="platform">Admin Plataforma</option>
              </select>
            </div>
          </Card>
        ))}
      </div>
    </div>
  );
};
