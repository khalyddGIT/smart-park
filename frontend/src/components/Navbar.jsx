import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, Bell, Shield, Menu, KeyRound } from 'lucide-react';
import { KeypadModal } from './KeypadModal';

export const Navbar = () => {
  const { role, setRole, user, pinVerified } = useAuth();
  const [showKeypad, setShowKeypad] = useState(false);
  const [pendingRole, setPendingRole] = useState(null);

  const handleRoleChange = (e) => {
    const selected = e.target.value;
    if (selected === 'local' || selected === 'platform') {
      if (!pinVerified) {
        setPendingRole(selected);
        setShowKeypad(true);
        return;
      }
    }
    setRole(selected);
  };

  const handlePinSuccess = () => {
    if (pendingRole) {
      setRole(pendingRole);
      setPendingRole(null);
    }
  };

  return (
    <>
      {/* Header Superior para Desktop y Móvil */}
      <header className="glass-panel sticky top-0 z-40 px-4 md:px-6 py-3 flex items-center justify-between border-b border-slate-200">
        <div className="flex items-center space-x-3">
          <div className="w-9 h-9 md:w-10 md:h-10 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white font-extrabold text-lg md:text-xl shadow-md shadow-emerald-500/20">
            P
          </div>
          <div>
            <span className="text-lg md:text-xl font-extrabold text-slate-900 tracking-tight">
              SMART PARK
            </span>
            <span className="block text-[9px] md:text-[10px] text-emerald-600 font-mono tracking-wider uppercase font-semibold">Plataforma Inteligente</span>
          </div>
        </div>

        {/* Conmutador de Roles Dinámico */}
        <div className="flex items-center space-x-2 md:space-x-4">
          <div className="flex items-center space-x-1.5 md:space-x-2 bg-slate-100 border border-slate-200 rounded-xl px-2.5 md:px-3 py-1.5 shadow-sm">
            <Shield className="w-3.5 h-3.5 md:w-4 md:h-4 text-emerald-600" />
            <span className="text-[11px] md:text-xs text-slate-600 font-medium hidden sm:inline">Perfil:</span>
            <select
              value={role}
              onChange={handleRoleChange}
              className="bg-transparent text-[11px] md:text-xs text-emerald-700 font-bold focus:outline-none cursor-pointer"
            >
              <option value="user" className="bg-white text-slate-800">Conductor</option>
              <option value="local" className="bg-white text-slate-800">Admin Local</option>
              <option value="platform" className="bg-white text-slate-800">Admin Plataforma</option>
            </select>
          </div>

          <button className="relative p-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-slate-600 transition shadow-sm">
            <Bell className="w-4 h-4 md:w-5 md:h-5" />
            <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-emerald-500" />
          </button>

          <div className="flex items-center space-x-2 pl-2 border-l border-slate-200">
            <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center font-bold text-xs shadow-sm">
              {user.name.charAt(0)}
            </div>
            <div className="text-left hidden lg:block">
              <p className="text-xs font-bold text-slate-800 leading-none">{user.name}</p>
              <p className="text-[10px] text-slate-500 capitalize font-medium">{role}</p>
            </div>
          </div>
        </div>
      </header>

      <KeypadModal
        isOpen={showKeypad}
        onClose={() => setShowKeypad(false)}
        onSuccess={handlePinSuccess}
      />
    </>
  );
};
