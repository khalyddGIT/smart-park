import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
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
  Video,
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
  X,
  Sparkles
} from 'lucide-react';

const isPersonalAccount = (user) => {
  if (!user) return false;
  const pos = (user.position || user.staffPosition || '').toLowerCase();
  if (pos.includes('operador') || pos.includes('seguridad') || pos.includes('supervisor')) return true;
  // Fallback: todo Staff con role local que no sea el admin semilla es personal
  const adminEmails = ['adminlocal@smartpark.com', 'superadmin@smartpark.com'];
  if (adminEmails.includes((user.email || '').toLowerCase())) return false;
  // Si el usuario fue creado via StaffModule, su session guardará staffPosition; si no hay dato, asumimos dueño
  return !!user.isStaffOperator;
};

const PERSONAL_SECTIONS = [
  {
    section: 'GARITA PERSONAL',
    items: [
      { id: 'dashboard', label: 'Mapa & Sedes', shortLabel: 'Mapa', icon: Building2 },
      { id: 'anpr', label: 'Garita - Entrada/Salida', shortLabel: 'Garita', icon: Camera },
      { id: 'reservations', label: 'Tickets & Reservas', shortLabel: 'Tickets', icon: CalendarCheck },
      { id: 'incidents', label: 'Incidencias', shortLabel: 'Incidencias', icon: AlertTriangle },
      { id: 'audit', label: 'Mi Auditoría', shortLabel: 'Auditoría', icon: ShieldCheck },
    ]
  }
];

const SECTIONS_BY_ROLE = {
  user: [
    {
      section: 'CONDUCTOR',
      items: [
        { id: 'dashboard', label: 'Búsqueda & Mapa', shortLabel: 'Mapa', icon: Search },
        { id: 'reservations', label: 'Mis Reservas', shortLabel: 'Reservas', icon: CalendarCheck },
        { id: 'vehicles', label: 'Mis Vehículos', shortLabel: 'Vehículos', icon: Car },
        { id: 'payments', label: 'Métodos de Pago', shortLabel: 'Pagos', icon: CreditCard },
        { id: 'incidents', label: 'Incidencias', shortLabel: 'Incidencias', icon: AlertTriangle },
        { id: 'history', label: 'Historial', shortLabel: 'Historial', icon: History },
        { id: 'reviews', label: 'Reseñas', shortLabel: 'Reseñas', icon: Star },
      ]
    }
  ],
  local: [
    {
      section: 'GARITA & SEDE',
      items: [
        { id: 'dashboard', label: 'Espacios & Plano', shortLabel: 'Espacios', icon: Building2 },
        { id: 'reservations', label: 'Reservas', shortLabel: 'Reservas', icon: CalendarCheck },
        { id: 'anpr', label: 'Control LPR', shortLabel: 'Garita', icon: Camera },
        { id: 'cameras', label: 'Monitoreo Cámara', shortLabel: 'Cámara', icon: Video },
        { id: 'incidents', label: 'Incidencias', shortLabel: 'Incidencias', icon: AlertTriangle },
        { id: 'staff', label: 'Personal', shortLabel: 'Personal', icon: Users },
        { id: 'reports', label: 'Reportes', shortLabel: 'Reportes', icon: BarChart3 },
        { id: 'audit', label: 'Auditoría Local', shortLabel: 'Auditoría', icon: ShieldCheck },
        { id: 'reviews', label: 'Reseñas', shortLabel: 'Reseñas', icon: Star },
      ]
    }
  ],
  platform: [
    {
      section: 'ADMINISTRACIÓN & FINANZAS',
      items: [
        { id: 'dashboard', label: 'Panel Global', shortLabel: 'Panel', icon: LayoutDashboard },
        { id: 'finances', label: 'Finanzas & Pagos', shortLabel: 'Finanzas', icon: CreditCard },
        { id: 'affiliates', label: 'Sedes & Afiliación', shortLabel: 'Sedes', icon: Building2 },
        { id: 'cameras', label: 'Monitoreo Cámara', shortLabel: 'Cámara', icon: Video },
        { id: 'settings', label: 'Ajustes Maestros', shortLabel: 'Ajustes', icon: Settings },
        { id: 'reservations', label: 'Padrón Reservas', shortLabel: 'Reservas', icon: CalendarCheck },
        { id: 'analytics', label: 'Analítica Global', shortLabel: 'Métricas', icon: BarChart3 },
        { id: 'incidents', label: 'Incidencias', shortLabel: 'Incidencias', icon: AlertTriangle },
        { id: 'users', label: 'Usuarios & RBAC', shortLabel: 'Usuarios', icon: Shield },
        { id: 'audit', label: 'Auditoría', shortLabel: 'Auditoría', icon: ShieldCheck },
        { id: 'resiliency', label: 'Estado del Sistema', shortLabel: 'Servidores', icon: Server },
      ]
    }
  ]
};

export const Sidebar = ({ activeTab, setActiveTab, onOpenTerms }) => {
  const { role, user } = useAuth();
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [staffPositions, setStaffPositions] = useState({});

  useEffect(() => {
    if (role !== 'local' || !user?.email) return;
    const email = user.email.toLowerCase();
    // Si ya es admin semilla, no es personal
    if (['adminlocal@smartpark.com','superadmin@smartpark.com'].includes(email)) return;
    api.get('/staff').then(r=>{
      const list = Array.isArray(r.data)? r.data : [];
      const match = list.find(s=> (s.email||'').toLowerCase()===email);
      if (match) {
        const pos = (match.position||'').toLowerCase();
        const isOp = pos.includes('operador') || pos.includes('seguridad') || pos.includes('supervisor') || pos.includes('vigilante');
        setStaffPositions({email, isOp, position: match.position});
      }
    }).catch(()=>{});
  }, [role, user?.email]);

  const isPersonal = role === 'local' && (isPersonalAccount(user) || !!staffPositions.isOp);
  const currentSections = isPersonal ? PERSONAL_SECTIONS : (SECTIONS_BY_ROLE[role] || SECTIONS_BY_ROLE.user);
  const allItems = currentSections.flatMap(sec => sec.items);

  // Configuración de los 5 botones del Navbar Móvil Estilo Flotante Curvo
  const getMobileNavConfig = () => {
    if (role === 'local') {
      return {
        left1: allItems.find(i => i.id === 'dashboard') || allItems[0],
        left2: allItems.find(i => i.id === 'reservations') || allItems[1],
        center: allItems.find(i => i.id === 'anpr') || allItems[2],
        right1: allItems.find(i => i.id === 'incidents') || allItems[3],
      };
    }
    if (role === 'platform') {
      return {
        left1: allItems.find(i => i.id === 'dashboard') || allItems[0],
        left2: allItems.find(i => i.id === 'finances') || allItems[1],
        center: allItems.find(i => i.id === 'affiliates') || allItems[2],
        right1: allItems.find(i => i.id === 'reservations') || allItems[4],
      };
    }
    // Default: 'user'
    return {
      left1: allItems.find(i => i.id === 'dashboard') || allItems[0],
      left2: allItems.find(i => i.id === 'reservations') || allItems[1],
      center: allItems.find(i => i.id === 'vehicles') || allItems[2],
      right1: allItems.find(i => i.id === 'payments') || allItems[3],
    };
  };

  const navConfig = getMobileNavConfig();
  const isDrawerActive = ![navConfig.left1?.id, navConfig.left2?.id, navConfig.center?.id, navConfig.right1?.id].includes(activeTab);

  const handleSelectTab = (tabId) => {
    setActiveTab(tabId);
    setMobileDrawerOpen(false);
  };

  return (
    <>
      {/* Sidebar Desktop Ajustado y Compacto (185px de ancho exacto) */}
      <aside className="hidden md:flex w-[185px] min-w-[185px] max-w-[185px] bg-white dark:bg-[#0B0F19] border-r border-slate-200/90 dark:border-slate-800/80 flex-col justify-between h-[calc(100vh-61px)] sticky top-[61px] shadow-xs z-30 select-none shrink-0 transition-colors">
        <div className="p-2 space-y-3.5 overflow-y-auto">
          {currentSections.map((sec, idx) => (
            <div key={idx} className="space-y-1">
              <span className="text-[10px] font-extrabold uppercase text-slate-400 dark:text-slate-500 tracking-wider font-tech px-2 block">
                {sec.section}
              </span>
              <nav className="space-y-0.5">
                {sec.items.map((item) => {
                  const Icon = item.icon;
                  const isActive = activeTab === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleSelectTab(item.id)}
                      className={`w-full flex items-center space-x-2 px-2.5 py-2 rounded-xl text-xs font-semibold transition-all duration-150 cursor-pointer ${
                        isActive
                          ? 'bg-slate-900 dark:bg-emerald-500/15 text-white dark:text-emerald-300 shadow-xs border border-slate-800 dark:border-emerald-500/30 font-bold'
                          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800/60 hover:text-slate-900 dark:hover:text-slate-100'
                      }`}
                    >
                      <Icon className={`w-4 h-4 shrink-0 transition-colors ${isActive ? 'text-emerald-400' : 'text-slate-400 dark:text-slate-500'}`} />
                      <span className="tracking-tight truncate">{item.label}</span>
                    </button>
                  );
                })}
              </nav>
            </div>
          ))}
        </div>

        {/* Footer del Sidebar Desktop Profesional y Limpio */}
        <div className="p-2 border-t border-slate-100 dark:border-slate-800/80 bg-slate-50/70 dark:bg-[#0B0F19]">
          <div className="flex items-center space-x-2 px-2.5 py-1.5 rounded-xl text-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
            <span className="text-slate-500 dark:text-slate-400 text-xs font-medium">Rol:</span>
            <strong className="text-slate-800 dark:text-slate-200 font-bold capitalize text-xs truncate">
              {role === 'user' ? 'Conductor' : isPersonal ? 'Personal' : role === 'local' ? 'Admin Local' : 'Admin'}
            </strong>
          </div>
        </div>
      </aside>

      {/* =========================================================================
          NAVBAR MÓVIL FLOTANTE GLASSMORPHISM CON BOTÓN ACTIVO ELEVADO DINÁMICO
          ========================================================================= */}
      <nav 
        aria-label="Navegación Móvil Flotante Glassmorphism"
        className="md:hidden fixed bottom-3 left-3 right-3 max-w-sm sm:max-w-md mx-auto z-40 bg-white/90 dark:bg-[#0B0F19]/90 backdrop-blur-xl rounded-[28px] shadow-[0_12px_40px_rgba(0,0,0,0.14)] dark:shadow-[0_12px_40px_rgba(0,0,0,0.7)] border border-white/80 dark:border-slate-800/80 ring-1 ring-slate-900/5 dark:ring-white/5 px-2 sm:px-3 py-1 flex items-center justify-between select-none"
      >
        {/* 4 Botones Principales por Rol */}
        {[navConfig.left1, navConfig.left2, navConfig.center, navConfig.right1].filter(Boolean).map((item) => {
          const Icon = item.icon;
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => handleSelectTab(item.id)}
              className="flex-1 flex flex-col items-center justify-center transition-all duration-300 group cursor-pointer relative"
            >
              {isActive ? (
                <div className="flex flex-col items-center justify-center -mt-6 animate-in zoom-in-90 duration-200">
                  <div className="w-12 h-12 rounded-full bg-slate-950 dark:bg-emerald-600 text-emerald-400 dark:text-white border-[3.5px] border-white dark:border-[#0B0F19] shadow-xl shadow-slate-950/30 dark:shadow-emerald-950/50 ring-2 ring-emerald-500/20 flex items-center justify-center transition-transform duration-200 scale-105 active:scale-95">
                    <Icon className="w-5 h-5 stroke-[2.4]" />
                  </div>
                  <span className="text-[10px] font-black text-slate-900 dark:text-white tracking-tight mt-1">
                    {item.shortLabel || item.label}
                  </span>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-1 transition-all duration-200">
                  <div className="p-1 text-slate-400 dark:text-slate-500 group-hover:text-slate-700 dark:group-hover:text-slate-200 transition-colors">
                    <Icon className="w-5 h-5 stroke-[2.2]" />
                  </div>
                  <span className="text-[9px] font-semibold text-slate-400 dark:text-slate-500 tracking-tight group-hover:text-slate-700 dark:group-hover:text-slate-200 transition-colors">
                    {item.shortLabel || item.label}
                  </span>
                </div>
              )}
            </button>
          );
        })}

        {/* 5. Botón Derecho: Menú "+ Más" */}
        <button
          onClick={() => setMobileDrawerOpen(true)}
          className="flex-1 flex flex-col items-center justify-center transition-all duration-300 group cursor-pointer relative"
        >
          {mobileDrawerOpen || isDrawerActive ? (
            <div className="flex flex-col items-center justify-center -mt-6 animate-in zoom-in-90 duration-200">
              <div className="w-12 h-12 rounded-full bg-slate-950 dark:bg-emerald-600 text-emerald-400 dark:text-white border-[3.5px] border-white dark:border-[#0B0F19] shadow-xl shadow-slate-950/30 dark:shadow-emerald-950/50 ring-2 ring-emerald-500/20 flex items-center justify-center transition-transform duration-200 scale-105 active:scale-95">
                <Menu className="w-5 h-5 stroke-[2.4]" />
              </div>
              <span className="text-[10px] font-black text-slate-900 dark:text-white tracking-tight mt-1">
                Más
              </span>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center py-1 transition-all duration-200">
              <div className="p-1 text-slate-400 dark:text-slate-500 group-hover:text-slate-700 dark:group-hover:text-slate-200 transition-colors">
                <Menu className="w-5 h-5 stroke-[2.2]" />
              </div>
              <span className="text-[9px] font-semibold text-slate-400 dark:text-slate-500 tracking-tight group-hover:text-slate-700 dark:group-hover:text-slate-200 transition-colors">
                Más
              </span>
            </div>
          )}
        </button>
      </nav>

      {/* Drawer Móvil Desplegable (Slide-Up Sheet) */}
      {mobileDrawerOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex flex-col justify-end bg-black/60 backdrop-blur-xs animate-in fade-in">
          <div className="bg-white dark:bg-[#111827] rounded-t-3xl p-5 max-h-[80vh] overflow-y-auto space-y-4 shadow-2xl dark:shadow-black/70 border-t border-slate-200/80 dark:border-slate-800 animate-in slide-in-from-bottom">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100 dark:border-slate-800">
              <div className="flex items-center space-x-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <h3 className="font-black text-slate-900 dark:text-white text-sm">Menú Completo ({role.toUpperCase()})</h3>
              </div>
              <button 
                onClick={() => setMobileDrawerOpen(false)}
                className="p-1.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer"
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
                    className={`flex items-center space-x-3 p-3.5 rounded-2xl border text-left transition cursor-pointer ${
                      isActive 
                        ? 'bg-slate-900 dark:bg-emerald-950/80 text-white dark:text-emerald-300 border-slate-900 dark:border-emerald-800 shadow-md font-bold' 
                        : 'bg-slate-50 dark:bg-slate-900/60 text-slate-700 dark:text-slate-300 border-slate-200/80 dark:border-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-800'
                    }`}
                  >
                    <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-emerald-400' : 'text-slate-500 dark:text-slate-400'}`} />
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
