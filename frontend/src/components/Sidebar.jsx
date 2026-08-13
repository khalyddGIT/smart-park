import React from 'react';
import { useAuth } from '../context/AuthContext';
import { 
  LayoutDashboard, 
  Search, 
  Car, 
  CalendarCheck, 
  CreditCard, 
  History, 
  Star, 
  Settings, 
  Building2, 
  Grid, 
  Camera, 
  Eye, 
  Users, 
  BarChart3, 
  Shield, 
  HelpCircle,
  Radio
} from 'lucide-react';

export const Sidebar = ({ activeTab, setActiveTab }) => {
  const { role } = useAuth();

  // Menús según el rol seleccionado
  const menuItemsByUser = {
    user: [
      { id: 'dashboard', label: 'Buscar', icon: Search },
      { id: 'reservations', label: 'Reservas', icon: CalendarCheck },
      { id: 'vehicles', label: 'Vehículos', icon: Car },
      { id: 'payments', label: 'Pagos', icon: CreditCard },
      { id: 'history', label: 'Historial', icon: History },
      { id: 'reviews', label: 'Reseñas', icon: Star },
    ],
    local: [
      { id: 'dashboard', label: 'Inicio', icon: LayoutDashboard },
      { id: 'editor', label: 'Plano 2D', icon: Grid },
      { id: 'anpr', label: 'ANPR', icon: Camera },
      { id: 'garita', label: 'Garita', icon: Eye },
      { id: 'staff', label: 'Staff', icon: Users },
      { id: 'reports', label: 'Reportes', icon: BarChart3 },
      { id: 'resiliency', label: 'Simulador Fallos C4', icon: Radio },
    ],
    platform: [
      { id: 'dashboard', label: 'Dashboard Consolidado', icon: LayoutDashboard },
      { id: 'affiliates', label: 'Estacionamientos Afiliados', icon: Building2 },
      { id: 'users', label: 'Usuarios & Roles', icon: Shield },
      { id: 'analytics', label: 'Analytics Globales', icon: BarChart3 },
      { id: 'resiliency', label: 'Simulador Fallos C4', icon: Radio },
    ]
  };

  const currentMenuItems = menuItemsByUser[role] || menuItemsByUser.user;

  return (
    <>
      {/* 🖥️ NAVEGACIÓN DESKTOP: Sidebar Lateral Izquierdo (oculto en pantallas pequeñas `hidden md:flex`) */}
      <aside className="hidden md:flex w-64 bg-white border-r border-slate-200/80 flex-col justify-between h-[calc(100vh-61px)] sticky top-[61px] shadow-sm z-30 select-none">
        <div className="p-4 space-y-6">
          <div>
            <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider px-3 mb-2 block">
              Navegación — {role === 'user' ? 'Conductor' : role === 'local' ? 'Admin Local' : 'Plataforma'}
            </span>
            <nav className="space-y-1">
              {currentMenuItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setActiveTab(item.id)}
                    className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-2xl text-xs font-extrabold transition-all duration-200 ${
                      isActive
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/80 shadow-sm'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${isActive ? 'text-emerald-600' : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>
        </div>

        <div className="p-4 border-t border-slate-100 space-y-1">
          <button className="w-full flex items-center space-x-3 px-3.5 py-2 rounded-2xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition">
            <Settings className="w-4 h-4 text-slate-400" />
            <span>Configuración</span>
          </button>
          <button className="w-full flex items-center space-x-3 px-3.5 py-2 rounded-2xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition">
            <HelpCircle className="w-4 h-4 text-slate-400" />
            <span>Ayuda</span>
          </button>
        </div>
      </aside>

      {/* 📱 NAVEGACIÓN MÓVIL: Bottom Navigation Bar Fijo (solo visible en pantallas móviles `md:hidden`) */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-50 bg-white/95 backdrop-blur-lg border-t border-slate-200 px-2 py-2 flex items-center justify-around shadow-lg">
        {currentMenuItems.slice(0, 5).map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex flex-col items-center justify-center py-1 px-2.5 rounded-xl transition-all ${
                isActive ? 'text-emerald-600 font-black' : 'text-slate-400 hover:text-slate-600 font-medium'
              }`}
            >
              <div className={`p-1 rounded-xl ${isActive ? 'bg-emerald-50' : ''}`}>
                <Icon className={`w-5 h-5 ${isActive ? 'text-emerald-600' : 'text-slate-400'}`} />
              </div>
              <span className="text-[10px] tracking-tight mt-0.5">{item.label}</span>
            </button>
          );
        })}
      </div>
    </>
  );
};
