import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { GoogleLogin } from '@react-oauth/google';
import { Bell, Shield, LogOut, Sparkles, User, CheckCircle2 } from 'lucide-react';
import { KeypadModal } from './KeypadModal';

export const Navbar = () => {
  const { role, setRole, user, pinVerified, loginWithGoogle, logout } = useAuth();
  const [showKeypad, setShowKeypad] = useState(false);
  const [pendingRole, setPendingRole] = useState(null);
  const [showAuthMenu, setShowAuthMenu] = useState(false);

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
      <header className="glass-panel sticky top-0 z-40 px-3 sm:px-4 md:px-6 py-2.5 flex items-center justify-between border-b border-slate-200/90 bg-white/95 backdrop-blur-md">
        {/* Brand Logo */}
        <div className="flex items-center space-x-2.5 sm:space-x-3">
          <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-slate-900 text-emerald-400 flex items-center justify-center font-bold shadow-sm border border-slate-800 flex-shrink-0">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4 sm:w-5 sm:h-5">
              <path d="M9 17V7h4a3 3 0 0 1 0 6H9" />
              <circle cx="12" cy="12" r="10" />
            </svg>
          </div>
          <div>
            <span className="text-sm sm:text-[15px] font-extrabold text-slate-900 tracking-tight font-tech">
              SMART-PARK
            </span>
          </div>
        </div>

        {/* Dynamic RBAC Selector & Google Auth Profile */}
        <div className="flex items-center space-x-1.5 sm:space-x-2 md:space-x-4">
          <div className="flex items-center space-x-1.5 sm:space-x-2 bg-slate-50 border border-slate-200/90 rounded-xl px-2 sm:px-3 py-1.5 shadow-sm max-w-[150px] sm:max-w-none">
            <Shield className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
            <span className="text-xs text-slate-500 font-semibold hidden md:inline">Perfil:</span>
            <select
              value={role}
              onChange={handleRoleChange}
              className="bg-transparent text-[11px] sm:text-xs text-slate-900 font-bold focus:outline-none cursor-pointer tracking-tight truncate w-full"
            >
              <option value="user" className="bg-white text-slate-800">🚗 Conductor</option>
              <option value="local" className="bg-white text-slate-800">🏢 Admin Cochera</option>
              <option value="platform" className="bg-white text-slate-800">🌐 Super Admin</option>
            </select>
          </div>

          <button 
            aria-label="Notificaciones del Sistema" 
            className="relative p-2 bg-slate-50 hover:bg-slate-100 border border-slate-200/90 rounded-xl text-slate-600 transition shadow-sm"
          >
            <Bell className="w-4 h-4 text-slate-600" />
            <span className="absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-emerald-500" />
          </button>

          {/* Menú de Usuario / Google Auth */}
          <div className="relative">
            <button
              onClick={() => setShowAuthMenu(!showAuthMenu)}
              className="flex items-center space-x-2 pl-2 sm:pl-3 border-l border-slate-200 focus:outline-none"
            >
              {user?.avatar ? (
                <img 
                  src={user.avatar} 
                  alt={user.name} 
                  referrerPolicy="no-referrer"
                  className="w-8 h-8 rounded-xl object-cover border border-slate-200 shadow-xs flex-shrink-0" 
                />
              ) : (
                <div className="w-8 h-8 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center border border-slate-200 shadow-xs flex-shrink-0">
                  <User className="w-4 h-4" />
                </div>
              )}
              
              <div className="text-left hidden lg:block">
                <p className="text-xs font-bold text-slate-900 leading-none tracking-tight">{user?.name || 'Usuario'}</p>
                <p className="text-[10px] text-slate-500 font-tech font-medium capitalize mt-0.5">{user?.email || `Rol: ${role}`}</p>
              </div>
            </button>

            {/* Dropdown flotante de autenticación */}
            {showAuthMenu && (
              <div className="absolute right-0 mt-2 w-72 max-w-[calc(100vw-24px)] bg-white rounded-2xl shadow-xl border border-slate-200 p-3.5 space-y-3 z-50 animate-fade-in">
                
                {/* Cabecera del Usuario */}
                <div className="border-b border-slate-100 pb-3">
                  <div className="flex items-center space-x-2.5">
                    {user?.avatar ? (
                      <img 
                        src={user.avatar} 
                        referrerPolicy="no-referrer"
                        className="w-10 h-10 rounded-xl object-cover border border-slate-200 shadow-xs flex-shrink-0" 
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center border border-slate-200 flex-shrink-0">
                        <User className="w-5 h-5" />
                      </div>
                    )}

                    <div className="overflow-hidden">
                      <p className="text-xs font-bold text-slate-900 truncate">{user?.name || 'Usuario'}</p>
                      <p className="text-[10px] text-slate-400 truncate">{user?.email || 'Sin correo'}</p>
                    </div>
                  </div>
                </div>

                {/* Si no está autenticado con Google, mostrar botón de login */}
                {user && !user.isGoogleAuth && (
                  <div className="space-y-2">
                    <span className="text-[10px] font-bold uppercase text-slate-400 font-tech block">Conectar con Google</span>
                    <div className="flex justify-center py-1">
                      <GoogleLogin
                        onSuccess={(res) => {
                          loginWithGoogle(res);
                          setShowAuthMenu(false);
                        }}
                        onError={() => console.warn('Google popup cerrado')}
                        size="medium"
                        shape="pill"
                        text="signin_with"
                      />
                    </div>
                  </div>
                )}

                {/* Cerrar Sesión */}
                <div className="border-t border-slate-100 pt-2">
                  <button
                    onClick={() => {
                      logout();
                      setShowAuthMenu(false);
                    }}
                    className="w-full py-2 px-2.5 text-left text-xs font-bold text-rose-600 hover:bg-rose-50 rounded-xl flex items-center space-x-2 transition"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Cerrar Sesión</span>
                  </button>
                </div>
              </div>
            )}
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
