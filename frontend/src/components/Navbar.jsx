import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { ShieldCheck, Bell, Shield, KeyRound, Radio, Cpu, User } from 'lucide-react';
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
      <header className="glass-panel sticky top-0 z-40 px-4 md:px-6 py-2.5 flex items-center justify-between border-b border-slate-200 bg-white/90 backdrop-blur-md">
        {/* Brand Logo */}
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 rounded-xl bg-slate-900 text-emerald-400 flex items-center justify-center font-black shadow-md border border-slate-800">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-5 h-5">
              <path d="M9 17V7h4a3 3 0 0 1 0 6H9" />
              <circle cx="12" cy="12" r="10" />
            </svg>
          </div>
          <div>
            <span className="text-base md:text-lg font-black text-slate-900 tracking-tight">
              SMART-PARK
            </span>
          </div>
        </div>


        {/* Dynamic RBAC Selector & User Profile */}
        <div className="flex items-center space-x-2 md:space-x-4">
          <div className="flex items-center space-x-2 bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 shadow-sm">
            <Shield className="w-4 h-4 text-emerald-600" />
            <span className="text-xs text-slate-600 font-bold hidden sm:inline">Perfil RBAC:</span>
            <select
              value={role}
              onChange={handleRoleChange}
              className="bg-transparent text-xs text-emerald-800 font-black focus:outline-none cursor-pointer"
            >
              <option value="user" className="bg-white text-slate-800">Conductor (Usuario Final)</option>
              <option value="local" className="bg-white text-slate-800">Administrador de Establecimiento</option>
              <option value="platform" className="bg-white text-slate-800">Administrador Global de Plataforma</option>
            </select>
          </div>

          <button 
            aria-label="Notificaciones del Sistema" 
            className="relative p-2 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-slate-600 transition shadow-sm"
          >
            <Bell className="w-4 h-4 text-slate-600" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-emerald-500" />
          </button>

          <div className="flex items-center space-x-2.5 pl-3 border-l border-slate-200">
            <div className="w-8 h-8 rounded-xl bg-slate-900 text-emerald-400 flex items-center justify-center font-bold text-xs shadow-sm border border-slate-700">
              {user.name.charAt(0)}
            </div>
            <div className="text-left hidden lg:block">
              <p className="text-xs font-black text-slate-900 leading-none">{user.name}</p>
              <p className="text-[10px] text-slate-500 font-mono font-semibold capitalize mt-0.5">Rol: {role}</p>
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
