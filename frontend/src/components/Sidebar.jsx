import React, { useState } from 'react';
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
  Camera, 
  Users, 
  BarChart3, 
  Shield, 
  Radio,
  Server,
  Award,
  AlertTriangle,
  ShieldCheck,
  ChevronRight,
  Menu,
  X
} from 'lucide-react';

export const Sidebar = ({ activeTab, setActiveTab }) => {
  const { role } = useAuth();
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);

  const menuSections = {
    user: [
      {
        section: 'MÓDULOS DEL CONDUCTOR',
        items: [
          { id: 'dashboard', label: 'Búsqueda & Mapa', shortLabel: 'Mapa', icon: Search },
          { id: 'reservations', label: 'Mis Reservas & QR', shortLabel: 'Reservas', icon: CalendarCheck },
          { id: 'loyalty', label: 'Smart Club & Puntos', shortLabel: 'Club', icon: Award },
          { id: 'vehicles', label: 'Mis Vehículos (Placas)', shortLabel: 'Vehículos', icon: Car },
          { id: 'payments', label: 'Métodos de Pago', shortLabel: 'Pagos', icon: CreditCard },
          { id: 'incidents', label: 'Reportar Incidencia', shortLabel: 'Incidencias', icon: AlertTriangle },
          { id: 'history', label: 'Historial de Estancias', shortLabel: 'Historial', icon: History },
          { id: 'reviews', label: 'Reseñas & Opiniones', shortLabel: 'Reseñas', icon: Star },
        ]
      }
    ],
    local: [
      {
        section: 'OPERACIONES & GARITA',
        items: [
          { id: 'dashboard', label: 'Sedes & Espacios', shortLabel: 'Espacios', icon: Building2 },
          { id: 'reservations', label: 'Gestión de Reservas', shortLabel: 'Reservas', icon: CalendarCheck },
          { id: 'anpr', label: 'Control Garita LPR', shortLabel: 'Garita', icon: Camera },
          { id: 'incidents', label: 'Gestión de Incidencias', shortLabel: 'Incidencias', icon: AlertTriangle },
          { id: 'staff', label: 'Personal & Turnos', shortLabel: 'Personal', icon: Users },
          { id: 'reports', label: 'Analítica de Ocupación', shortLabel: 'Reportes', icon: BarChart3 },
          { id: 'audit', label: 'Bitácora de Accesos', shortLabel: 'Accesos', icon: ShieldCheck },
          { id: 'reviews', label: 'Moderación de Reseñas', shortLabel: 'Reseñas', icon: Star },
          { id: 'resiliency', label: 'Diagnóstico del Servidor', shortLabel: 'Servidor', icon: Radio },
        ]
      }
    ],
    platform: [
      {
        section: 'ADMINISTRACIÓN GLOBAL',
        items: [
          { id: 'dashboard', label: 'Panel Consolidado', shortLabel: 'Panel', icon: LayoutDashboard },
          { id: 'affiliates', label: 'Sedes Registradas', shortLabel: 'Sedes', icon: Building2 },
          { id: 'reservations', label: 'Padrón Global Reservas', shortLabel: 'Reservas', icon: CalendarCheck },
          { id: 'analytics', label: 'Business Intelligence', shortLabel: 'Métricas', icon: BarChart3 },
          { id: 'incidents', label: 'Control Incidencias', shortLabel: 'Incidencias', icon: AlertTriangle },
          { id: 'audit', label: 'Auditoría & Seguridad', shortLabel: 'Auditoría', icon: ShieldCheck },
          { id: 'users', label: 'Padrón de Usuarios', shortLabel: 'Usuarios', icon: Shield },
          { id: 'staff', label: 'Directorio Personal', shortLabel: 'Personal', icon: Users },
          { id: 'reviews', label: 'Supervisión Calidad', shortLabel: 'Calidad', icon: Star },
          { id: 'resiliency', label: 'Diagnóstico Servicios', shortLabel: 'Servicios', icon: Server },
        ]
      }
    ]
  };

  const currentSections = menuSections[role] || menuSections.user;
  const allItems = currentSections.flatMap(s => s.items);

  const handleSelectTab = (tabId) => {
    setActiveTab(tabId);
    setMobileDrawerOpen(false);
  };

  return (
    <>
      {/* Sidebar Desktop */}
      <aside className="hidden md:flex w-64 lg:w-72 bg-white border-r border-slate-200/90 flex-col justify-between h-[calc(100vh-61px)] sticky top-[61px] shadow-sm z-30 select-none flex-shrink-0">
        <div className="p-4 space-y-6 overflow-y-auto">
          {currentSections.map((sec, idx) => (
            <div key={idx} className="space-y-1.5">
              <span className="text-[11px] font-bold uppercase text-slate-400 tracking-wider font-tech px-3 block">
                {sec.section}
              </span>
              <nav className="space-y-1">
                {sec.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleSelectTab(item.id)}
                      className={`w-full flex items-center space-x-3 px-3.5 py-2.5 rounded-xl text-[13px] font-semibold transition-all duration-150 ${
                        isActive
                          ? 'bg-slate-900 text-white shadow-sm border border-slate-800'
                          : 'text-slate-600 hover:bg-slate-100/90 hover:text-slate-900'
                      }`}
                    >
                      <Icon className={`w-4 h-4 shrink-0 transition-colors ${isActive ? 'text-emerald-400' : 'text-slate-400'}`} />
                      <span className="tracking-tight truncate">{item.label}</span>
                    </button>
                  );
                })}
              </nav>
            </div>
          ))}
        </div>

        <div className="p-4 border-t border-slate-100 space-y-1 bg-slate-50/50">
          <div className="flex items-center justify-between px-3.5 py-2 rounded-xl text-xs text-slate-500 font-medium">
            <span>Rol: <strong className="text-slate-800 font-bold capitalize">{role}</strong></span>
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          </div>
        </div>
      </aside>

      {/* Mobile Bottom Navigation Bar */}
      <nav 
        aria-label="Navegación Móvil"
        className="md:hidden fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur-md border-t border-slate-200 z-40 px-3 py-1.5 flex justify-around items-center shadow-lg"
      >
        {allItems.slice(0, 4).map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => handleSelectTab(item.id)}
              className={`flex-1 flex flex-col items-center justify-center py-1 px-1 rounded-xl transition duration-150 ${
                isActive 
                  ? 'text-emerald-600 font-black' 
                  : 'text-slate-500 hover:text-slate-800 font-medium'
              }`}
            >
              <div className={`p-1 rounded-lg transition ${isActive ? 'bg-emerald-50 text-emerald-600' : 'text-slate-400'}`}>
                <Icon className="w-5 h-5" />
              </div>
              <span className="text-[11px] leading-tight mt-0.5 tracking-tight font-sans">
                {item.shortLabel || item.label}
              </span>
            </button>
          );
        })}

        {/* Botón "+ Más" */}
        <button
          onClick={() => setMobileDrawerOpen(true)}
          className={`flex-1 flex flex-col items-center justify-center py-1 px-1 rounded-xl transition duration-150 ${
            mobileDrawerOpen || allItems.slice(4).some(i => i.id === activeTab)
              ? 'text-emerald-600 font-black'
              : 'text-slate-500 hover:text-slate-800 font-medium'
          }`}
        >
          <div className="p-1 rounded-lg text-slate-400">
            <Menu className="w-5 h-5" />
          </div>
          <span className="text-[11px] leading-tight mt-0.5 tracking-tight font-sans">
            Más
          </span>
        </button>
      </nav>

      {/* Drawer Móvil Desplegable (Slide-Up Sheet) */}
      {mobileDrawerOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex flex-col justify-end animate-fade-in">
          {/* Backdrop */}
          <div 
            onClick={() => setMobileDrawerOpen(false)}
            className="absolute inset-0 bg-slate-950/60 backdrop-blur-xs transition-opacity" 
          />

          {/* Panel */}
          <div className="relative bg-white rounded-t-3xl p-5 shadow-2xl max-h-[80vh] overflow-y-auto space-y-4 border-t border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-xl bg-slate-900 text-emerald-400 flex items-center justify-center">
                  <ShieldCheck className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-slate-900 tracking-tight">Módulos del Sistema</h3>
                  <p className="text-[11px] text-slate-500 font-medium">Perfil: <span className="capitalize font-bold text-emerald-600">{role}</span></p>
                </div>
              </div>
              <button 
                onClick={() => setMobileDrawerOpen(false)}
                className="w-8 h-8 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center hover:bg-slate-200"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              {allItems.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => handleSelectTab(item.id)}
                    className={`flex items-center space-x-3 p-3.5 rounded-2xl border text-left transition ${
                      isActive 
                        ? 'bg-slate-900 text-white border-slate-900 shadow-md font-bold' 
                        : 'bg-slate-50 text-slate-700 border-slate-200/80 hover:bg-slate-100'
                    }`}
                  >
                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-emerald-400' : 'text-slate-500'}`} />
                    <span className="text-xs font-semibold tracking-tight truncate">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </>
  );
};
