import React, { useState, useEffect, Suspense, lazy } from 'react';
import { Toaster } from 'react-hot-toast';
import { useAuth } from './context/AuthContext';
import { useEstablishments, isMyEstablishment, getEstablishmentHierarchy } from './context/EstablishmentContext';
import api from './services/api';
import { Navbar } from './components/Navbar';
import { Sidebar } from './components/Sidebar';
import { PersonalGaritaModule } from './components/PersonalGaritaModule';
import { PaymentsModule } from './components/PaymentsModule';
import { VehiclesModule } from './components/VehiclesModule';
import { HistoryModule } from './components/HistoryModule';
import { ReviewsModule } from './components/ReviewsModule';
import { IncidentsModule } from './components/IncidentsModule';
import { VerifyReservationPage } from './components/VerifyReservationPage';
import { AyacuchoMap } from './components/AyacuchoMap';
import { CustomerInteractivePlanBooking } from './components/CustomerInteractivePlanBooking';
import { DigitalAccessPassModal } from './components/DigitalAccessPassModal';
import { CulqiPaymentModal } from './components/CulqiPaymentModal';
import { ReservationsModule } from './components/ReservationsModule';
import { LoginAuthScreen } from './components/LoginAuthScreen';
import { TermsAndConditionsModal } from './components/TermsAndConditionsModal';
import { UserProfileModule } from './components/UserProfileModule';
import { LandingPage } from './components/LandingPage';
import { AutoFitFloorPlan } from './components/AutoFitFloorPlan';

// Lazy-loaded heavy modules for code-splitting & lightning performance
const LocalEstablishmentManager = lazy(() => import('./components/LocalEstablishmentManager').then(m => ({ default: m.LocalEstablishmentManager })));
const ANPRMonitor = lazy(() => import('./components/ANPRMonitor').then(m => ({ default: m.ANPRMonitor })));
const PlatformFinancesModule = lazy(() => import('./components/PlatformFinancesModule').then(m => ({ default: m.PlatformFinancesModule })));
const PlatformSettingsModule = lazy(() => import('./components/PlatformSettingsModule').then(m => ({ default: m.PlatformSettingsModule })));
const PlatformGlobalDashboard = lazy(() => import('./components/PlatformGlobalDashboard').then(m => ({ default: m.PlatformGlobalDashboard })));
const UserRolesModule = lazy(() => import('./components/UserRolesModule').then(m => ({ default: m.UserRolesModule })));
const AnalyticsGlobalModule = lazy(() => import('./components/AnalyticsGlobalModule').then(m => ({ default: m.AnalyticsGlobalModule })));
const CameraMonitorModule = lazy(() => import('./components/CameraMonitorModule').then(m => ({ default: m.CameraMonitorModule })));
const ResiliencySimModule = lazy(() => import('./components/ResiliencySimModule').then(m => ({ default: m.ResiliencySimModule })));
const AuditLogsModule = lazy(() => import('./components/AuditLogsModule').then(m => ({ default: m.AuditLogsModule })));
const StaffModule = lazy(() => import('./components/StaffModule').then(m => ({ default: m.StaffModule })));
const AffiliatedParkingsModule = lazy(() => import('./components/AffiliatedParkingsModule').then(m => ({ default: m.AffiliatedParkingsModule })));

const FALLBACK_PARKING_IMAGE = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 800 500' width='800' height='500'%3E%3Cdefs%3E%3ClinearGradient id='g' x1='0%25' y1='0%25' x2='100%25' y2='100%25'%3E%3Cstop offset='0%25' stop-color='%230f172a'/%3E%3Cstop offset='100%25' stop-color='%231e293b'/%3E%3C/linearGradient%3E%3C/defs%3E%3Crect width='100%25' height='100%25' fill='url(%23g)'/%3E%3Ccircle cx='400' cy='210' r='85' fill='%2310b981' fill-opacity='0.15'/%3E%3Cpath d='M345 250 L455 250 L430 175 L370 175 Z' fill='%2310b981' fill-opacity='0.6'/%3E%3Crect x='330' y='250' width='140' height='40' rx='10' fill='%2310b981'/%3E%3Ccircle cx='365' cy='290' r='14' fill='%230f172a'/%3E%3Ccircle cx='435' cy='290' r='14' fill='%230f172a'/%3E%3Ctext x='400' y='370' font-family='system-ui, sans-serif' font-size='22' font-weight='bold' fill='%23f8fafc' text-anchor='middle'%3ESmart Park Huamanga%3C/text%3E%3Ctext x='400' y='402' font-family='system-ui, sans-serif' font-size='14' fill='%2394a3b8' text-anchor='middle'%3EEstacionamiento Seguro y Conectado%3C/text%3E%3C/svg%3E";

const LoadingModule = () => (
  <div className="flex items-center justify-center min-h-[350px] w-full py-12">
    <div className="flex flex-col items-center space-y-3">
      <div className="w-8 h-8 border-3 border-emerald-500 border-t-transparent rounded-full animate-spin" />
      <span className="text-xs font-semibold text-slate-500">Cargando módulo de Smart-Park...</span>
    </div>
  </div>
);
import { 
  Search, 
  MapPin, 
  QrCode, 
  Car, 
  ChevronRight, 
  Award, 
  AlertTriangle, 
  ShieldCheck,
  Building2,
  Sparkles,
  Filter,
  CheckCircle2,
  Accessibility,
  Umbrella,
  Crown,
  Bike,
  ArrowLeft,
  MessageSquare,
  Phone,
  Clock,
  ExternalLink,
  Moon
} from 'lucide-react';

import { Card, CardDescription } from './components/ui/card';
import { Button } from './components/ui/button';
import { Input } from './components/ui/input';
import { SkeletonParkingCard } from './components/ui/skeleton';
import {
  canonicalizeTab,
  clearRoleUrl,
  isValidTabForRole,
  parseRoleLocation,
  readInitialParkingId,
  syncRoleUrl,
} from './utils/roleRoutes';

// Wrapper: ruta pública /verify/* o /verify?code=... sin hooks, para no violar rules-of-hooks
export const App = () => {
  if (typeof window !== 'undefined' && (window.location.pathname.startsWith('/verify') || window.location.pathname === '/verify')) {
    return <VerifyReservationPage />;
  }
  return <AppMain />;
};

const AppMain = () => {
  const { role, user } = useAuth();
  const { establishments, occupySlot, createReservation, bookingError, reservations, refreshMyReservations } = useEstablishments();
  const [activeTab, setActiveTab] = useState(() => {
    const parsed = parseRoleLocation(
      typeof window !== 'undefined' ? window.location.pathname : '/',
      typeof window !== 'undefined' ? window.location.search : ''
    );
    return parsed.matched ? canonicalizeTab(parsed.tab) : 'dashboard';
  });
  const [bookingFeedback, setBookingFeedback] = useState(null);
  const [isPersonalStaff, setIsPersonalStaff] = useState(false);
  const [personalParkingId, setPersonalParkingId] = useState(null);
  const [selectedParkingId, setSelectedParkingId] = useState(() => readInitialParkingId());
  const skipNextUrlPushRef = React.useRef(false);
  const didHydrateUrlRef = React.useRef(false);
  useEffect(() => {
    if (role !== 'local' || !user?.email) { setIsPersonalStaff(false); setPersonalParkingId(null); return; }
    if (['adminlocal@smartpark.com','superadmin@smartpark.com'].includes(user.email.toLowerCase())) { setIsPersonalStaff(false); setPersonalParkingId(null); return; }
    api.get('/staff').then(r=>{
      const list = Array.isArray(r.data)? r.data : [];
      const match = list.find(s=> (s.email||'').toLowerCase()===user.email.toLowerCase());
      if (match) {
        const pos=(match.position||'').toLowerCase();
        if (pos.includes('operador') || pos.includes('seguridad') || pos.includes('supervisor') || pos.includes('vigilante')) {
          setIsPersonalStaff(true);
          if(match.parking_id) setPersonalParkingId(String(match.parking_id));
        }
      }
    }).catch(()=>{});
  }, [role, user?.email]);

  // Si el rol autenticado no admite la vista actual, volver a dashboard
  useEffect(() => {
    if (!user || !role) return;
    if (!isValidTabForRole(role, activeTab)) {
      skipNextUrlPushRef.current = true;
      setActiveTab('dashboard');
    }
  }, [role, user]);

  // Tras restaurar sesión (/auth/me o localStorage), reaplicar deep-link una sola vez
  useEffect(() => {
    if (!user || !role) {
      didHydrateUrlRef.current = false;
      return;
    }
    if (didHydrateUrlRef.current) return;
    didHydrateUrlRef.current = true;
    const parsed = parseRoleLocation(window.location.pathname, window.location.search);
    if (!parsed.matched) return;
    if (isValidTabForRole(role, parsed.tab)) {
      const tab = canonicalizeTab(parsed.tab);
      if (tab !== activeTab) {
        skipNextUrlPushRef.current = true;
        setActiveTab(tab);
      }
    }
    if (parsed.parkingId && parsed.parkingId !== selectedParkingId) {
      skipNextUrlPushRef.current = true;
      setSelectedParkingId(parsed.parkingId);
    }
  }, [user, role]);

  // Listener para navegación reactiva entre módulos
  useEffect(() => {
    const handleNav = (e) => {
      if (e?.detail) setActiveTab(canonicalizeTab(e.detail));
    };
    window.addEventListener('smart_park_navigate_tab', handleNav);
    return () => window.removeEventListener('smart_park_navigate_tab', handleNav);
  }, []);

  // Filtros de Búsqueda para Conductor
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('todos'); // 'todos' | 'centro' | 'techados' | 'economicos'
  const [selectedCompanyKey, setSelectedCompanyKey] = useState(null); // empresa elegida: null = nivel empresas, set = nivel sucursales
  const [isLoadingSedes, setIsLoadingSedes] = useState(false);

  // Efecto sutil de carga skeleton al cambiar filtros
  const handleFilterChange = (newCat) => {
    setIsLoadingSedes(true);
    setCategoryFilter(newCat);
    setTimeout(() => setIsLoadingSedes(false), 300);
  };

  const handleSearchChange = (val) => {
    setIsLoadingSedes(true);
    setSearchQuery(val);
    setTimeout(() => setIsLoadingSedes(false), 250);
  };

  useEffect(()=>{ if(personalParkingId) setSelectedParkingId(personalParkingId); },[personalParkingId]);
  const [showQRModal, setShowQRModal] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [paymentTarget, setPaymentTarget] = useState(null);
  
  // Reserva activa persistente real del conductor (status SCHEDULED o ACTIVE)
  const realActiveReservation = React.useMemo(() => {
    if (!reservations || !reservations.length) return null;
    return reservations.find(r => {
      const st = (r.status || '').toUpperCase();
      return st === 'SCHEDULED' || st === 'ACTIVE';
    }) || null;
  }, [reservations]);

  const [activeReservation, setActiveReservation] = useState(null);

  // Sincronizar automáticamente la reserva activa con el estado del servidor
  useEffect(() => {
    if (realActiveReservation) {
      setActiveReservation(realActiveReservation);
    }
  }, [realActiveReservation]);

  // Obtener el establecimiento actualmente seleccionado en tiempo real desde el context
  const selectedParking = establishments.find(e => String(e.id) === String(selectedParkingId)) || null;

  // Reserva de Plaza por Conductor - soporta hold (pago en garita) vs prepago con pasarela de pago
  const handleCustomerBooking = async (bookingData) => {
    if (!selectedParking) return;
    try {
      const newRes = await createReservation({
        parkingId: bookingData.parkingId || selectedParking.id,
        slotId: bookingData.slotId,
        parkingName: bookingData.parkingName || selectedParking.name,
        slotCode: bookingData.slotCode,
        plate: bookingData.plate,
        customerName: user?.name || user?.full_name || user?.email?.split('@')[0] || 'Conductor Registrado',
        customerPhone: user?.phone || '+51 966 000 000',
        totalCost: bookingData.totalCost,
        hours: bookingData.hours,
        rate: selectedParking.rate,
        startTime: bookingData.startTime,
        expiresAt: bookingData.expiresAt,
        toleranceMinutes: bookingData.toleranceMinutes || bookingData.arrivalWindow || bookingData.etaMinutes || 15,
        vehicleType: bookingData.vehicleType || 'auto',
        payNow: !!bookingData.payNow,
        billingUnit: bookingData.billingUnit || 'hour',
        estimatedMinutes: bookingData.estimatedMinutes,
        estimatedHours: bookingData.estimatedHours,
        bookingModel: bookingData.bookingModel || (bookingData.payNow ? 'prepaid_discount' : 'postpaid'),
        paymentMethod: bookingData.paymentMethod || (bookingData.payNow ? 'tarjeta' : 'efectivo')
      });
      if (!newRes || newRes.error) {
        const msg = newRes?.error || bookingError || 'No se pudo crear la reserva. Verifica que el cajón esté libre y tu sesión activa.';
        setBookingFeedback(msg);
        setTimeout(() => setBookingFeedback(null), 6000);
        return;
      }

      const enriched = {
        ...newRes,
        etaMinutes: bookingData.etaMinutes ?? newRes.toleranceMinutes ?? 15,
        arrivalWindow: bookingData.arrivalWindow ?? newRes.toleranceMinutes ?? 15,
        toleranceMinutes: bookingData.toleranceMinutes ?? newRes.toleranceMinutes ?? 15,
        payNow: !!bookingData.payNow,
        vehicleType: bookingData.vehicleType || 'auto',
        paymentMethod: bookingData.paymentMethod || (bookingData.payNow ? 'Prepago asegurado' : 'Pago en garita al salir')
      };

      // Si es "Pagar ahora", desplegar la Pasarela de Pagos (PayPal, Tarjeta Culqi, Yape, Plin)
      if (bookingData.payNow) {
        setPaymentTarget({
          reservationId: newRes.id || newRes.code,
          amount: Number(bookingData.totalCost) || Number((selectedParking.rate * bookingData.hours).toFixed(2)),
          concept: `Reserva ${newRes.code || 'Smart Park'} — Cajón ${newRes.slotCode || bookingData.slotCode} en ${newRes.parkingName || selectedParking.name}`,
          parkingName: newRes.parkingName || selectedParking.name,
          slotCode: newRes.slotCode || bookingData.slotCode || 'A-01',
          customerEmail: user?.email || 'conductor@smartpark.com',
          requirePrepay: !!selectedParking.require_reservation_prepay,
          enrichedData: enriched
        });
      } else {
        // Reservar y pagar en garita al llegar (Hold)
        setActiveReservation(enriched);
        setShowQRModal(true);
        setSelectedParkingId(null);
      }
    } catch (err) {
      const msg = err?.response?.data?.detail || err?.message || bookingError || 'No se pudo crear la reserva. Verifica que el cajón esté libre y tu sesión activa.';
      setBookingFeedback(msg);
      setTimeout(() => setBookingFeedback(null), 4000);
    }
  };

  // Filtrado de establecimientos para la vista Conductor
  const filteredParkings = establishments.filter(p => {
    const matchesSearch =
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.owner && p.owner.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (p.level && p.level.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (p.city && p.city.toLowerCase().includes(searchQuery.toLowerCase()));

    if (!matchesSearch) return false;

    if (categoryFilter === 'centro') {
      return p.address.toLowerCase().includes('centro') || p.name.toLowerCase().includes('plaza mayor');
    }
    if (categoryFilter === 'techados') {
      const hasShaded = (p.elements || []).some(e => e.type === 'slot' && e.shaded);
      return hasShaded || (p.level && (p.level.toLowerCase().includes('techado') || p.level.toLowerCase().includes('sótano')));
    }
    if (categoryFilter === 'economicos') {
      return Number(p.rate) <= 4.50;
    }
    return true;
  });

  // Agrupación por empresa / establecimiento para el conductor: Nivel 1 empresas/locales, Nivel 2 sucursales.
  // Usamos getEstablishmentHierarchy para derivar limpiamente el nombre de la empresa y sucursal.
  const companyGroups = React.useMemo(() => {
    const groups = new Map();
    for (const p of filteredParkings) {
      const hierarchy = getEstablishmentHierarchy(p);
      const companyName = hierarchy.companyName;
      const key = `empresa-${companyName.toLowerCase()}`;
      if (!groups.has(key)) {
        groups.set(key, { 
          key, 
          name: companyName, 
          branches: [], 
          totalSlots: 0, 
          freeSlots: 0, 
          minRate: Infinity, 
          image: p.image || null 
        });
      }
      const g = groups.get(key);
      g.branches.push({
        ...p,
        branchDisplayName: hierarchy.branchName || p.name
      });
      const elements = p.elements || [];
      const total = elements.filter(e => e.type === 'slot').length || p.totalSlots || 0;
      const free = elements.filter(e => e.type === 'slot' && e.status === 'free').length;
      g.totalSlots += total;
      g.freeSlots += free;
      g.minRate = Math.min(g.minRate, Number(p.rate) || 5.0);
      if (!g.image && p.image) g.image = p.image;
    }
    return [...groups.values()];
  }, [filteredParkings]);

  // Empresa activa (si el filtro la eliminó, se vuelve solo al nivel empresas)
  const activeCompany = companyGroups.find(g => g.key === selectedCompanyKey) || null;

  // Cálculos consolidados para el Administrador de Plataforma
  const totalNetworkSlots = establishments.reduce((acc, curr) => {
    return acc + (curr.elements || []).filter(e => e.type === 'slot').length;
  }, 0);

  const totalFreeSlots = establishments.reduce((acc, curr) => {
    return acc + (curr.elements || []).filter(e => e.type === 'slot' && e.status === 'free').length;
  }, 0);

  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authModalMode, setAuthModalMode] = useState('login');
  const [pendingParkingForBooking, setPendingParkingForBooking] = useState(null);

  // Manejar selección de cochera con login bajo demanda
  const handleSelectParking = (parking) => {
    if (!user) {
      setPendingParkingForBooking(parking.id);
      setAuthModalMode('login');
      setShowAuthModal(true);
      return;
    }
    setSelectedParkingId(parking.id);
  };

  // Redirección inmediata a Landing Page y reseteo completo de estados al cerrar sesión
  useEffect(() => {
    if (!user) {
      setSelectedParkingId(null);
      setSelectedCompanyKey(null);
      skipNextUrlPushRef.current = true;
      setActiveTab('dashboard');
      setShowAuthModal(false);
      setPendingParkingForBooking(null);
      clearRoleUrl('replace');
    }
  }, [user]);

  // Cerrar modal de autenticación inmediatamente al autenticarse y reanudar selección si aplica
  useEffect(() => {
    if (user) {
      setShowAuthModal(false);
      if (pendingParkingForBooking) {
        setSelectedParkingId(pendingParkingForBooking);
        setPendingParkingForBooking(null);
      }
    }
  }, [user, pendingParkingForBooking]);

  // Persistir vista activa + parking en pathname real (producción / refresh)
  useEffect(() => {
    if (!user || !role) return;
    const mode = skipNextUrlPushRef.current ? 'replace' : 'push';
    skipNextUrlPushRef.current = false;
    syncRoleUrl(role, activeTab, selectedParkingId, mode);
  }, [activeTab, selectedParkingId, user, role]);

  // --- Botón atrás: cierra overlays, luego restaura tab/parking desde la URL ---
  const lastBackPressRef = React.useRef(0);
  useEffect(() => {
    const onPopState = () => {
      if (showQRModal) {
        setShowQRModal(false);
        skipNextUrlPushRef.current = true;
        if (user && role) syncRoleUrl(role, activeTab, selectedParkingId, 'push');
        return;
      }
      if (showTermsModal) {
        setShowTermsModal(false);
        skipNextUrlPushRef.current = true;
        if (user && role) syncRoleUrl(role, activeTab, selectedParkingId, 'push');
        return;
      }
      if (showAuthModal) {
        setShowAuthModal(false);
        skipNextUrlPushRef.current = true;
        if (user && role) syncRoleUrl(role, activeTab, selectedParkingId, 'push');
        return;
      }

      const parsed = parseRoleLocation(window.location.pathname, window.location.search);
      if (parsed.matched) {
        const nextTab = isValidTabForRole(role, parsed.tab) ? canonicalizeTab(parsed.tab) : 'dashboard';
        skipNextUrlPushRef.current = true;
        if (nextTab !== activeTab) setActiveTab(nextTab);
        setSelectedParkingId(parsed.parkingId || null);
        return;
      }

      if (activeTab !== 'dashboard' || selectedParkingId) {
        skipNextUrlPushRef.current = true;
        setSelectedParkingId(null);
        setActiveTab('dashboard');
        if (user && role) syncRoleUrl(role, 'dashboard', null, 'replace');
        return;
      }

      const now = Date.now();
      if (now - lastBackPressRef.current < 2000) return;
      lastBackPressRef.current = now;
      if (user && role) syncRoleUrl(role, 'dashboard', null, 'push');
      try {
        const el = document.createElement('div');
        el.textContent = 'Pulsa atrás de nuevo para salir';
        el.style.cssText = 'position:fixed;bottom:80px;left:50%;transform:translateX(-50%);background:#0f172a;color:#fff;padding:8px 14px;border-radius:999px;font-size:12px;font-weight:700;z-index:99999;box-shadow:0 8px 24px rgba(0,0,0,0.3)';
        document.body.appendChild(el);
        setTimeout(() => el.remove(), 1800);
      } catch { /* ignore */ }
    };
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, [activeTab, selectedParkingId, showQRModal, showTermsModal, showAuthModal, user, role]);

  const handleTabNavigation = (tab) => {
    if (!user && tab !== 'dashboard') {
      setAuthModalMode('login');
      setShowAuthModal(true);
      return;
    }
    setActiveTab(canonicalizeTab(tab));
  };

  // Si el usuario no ha iniciado sesión, mostrar SIEMPRE la Landing Page de inicio
  if (!user) {
    return (
      <div className="w-full bg-[#FBFBFA] dark:bg-[#070B14] text-[#191919] dark:text-slate-100 font-sans antialiased selection:bg-emerald-500 selection:text-white transition-colors">
        <Toaster position="top-right" toastOptions={{ duration: 3500, style: { borderRadius: '14px', background: '#0f172a', color: '#fff', fontSize: '13px' } }} />
        
        <LandingPage
          establishments={establishments}
          onOpenAuth={(mode) => {
            setAuthModalMode(mode || 'login');
            setShowAuthModal(true);
          }}
          onSelectParking={handleSelectParking}
          onOpenTerms={() => setShowTermsModal(true)}
        />

        {/* Modal de Autenticación Rápida Bajo Demanda */}
        {showAuthModal && (
          <LoginAuthScreen
            isModal={true}
            onClose={() => setShowAuthModal(false)}
            defaultAuthMode={authModalMode}
          />
        )}

        {/* Modal de Términos y Condiciones */}
        <TermsAndConditionsModal
          isOpen={showTermsModal}
          onClose={() => setShowTermsModal(false)}
        />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50/60 dark:bg-[#070B14] text-slate-800 dark:text-slate-100 flex flex-col font-sans selection:bg-emerald-500 selection:text-white transition-colors">
      <Toaster position="top-right" toastOptions={{ duration: 3500, style: { borderRadius: '14px', background: '#0f172a', color: '#fff', fontSize: '13px' } }} />
      <Navbar 
        onNavigateProfile={() => {
          if (!user) {
            setAuthModalMode('login');
            setShowAuthModal(true);
          } else {
            setActiveTab(prev => prev === 'profile' ? 'dashboard' : 'profile');
          }
        }} 
        onNavigateTab={handleTabNavigation}
        onOpenAuthModal={(mode) => {
          setAuthModalMode(mode || 'login');
          setShowAuthModal(true);
        }}
      />

      <div className="flex flex-1">
        {/* BARRA LATERAL (SIDEBAR) */}
        <Sidebar 
          activeTab={activeTab} 
          setActiveTab={handleTabNavigation} 
          onOpenTerms={() => setShowTermsModal(true)} 
        />

        {/* CONTENIDO PRINCIPAL */}
        <main className="flex-1 p-3 sm:p-4 md:p-6 overflow-y-auto pb-28 md:pb-6 w-full max-w-full overflow-x-hidden min-w-0">
          <Suspense fallback={<LoadingModule />}>
          
          {/* VISTA ROL CONDUCTOR (BUSCAR Y RESERVAR PLAZAS) */}
          {(role === 'user' || !user) && (
            <div className="space-y-6">
              {activeTab === 'dashboard' && (
                <>
                  {/* Banner de Búsqueda Inteligente */}
                  <Card className="p-4 sm:p-5 border-slate-200 bg-white shadow-2xs relative overflow-hidden rounded-2xl">
                    <div className="mb-3">
                      <h1 className="text-lg font-bold text-slate-900 tracking-tight">
                        Estacionamientos Inteligentes en Ayacucho
                      </h1>
                      <p className="text-xs text-slate-500 font-medium mt-0.5">
                        Explora en vivo, consulta tarifas y reserva tu plaza en segundos
                      </p>
                    </div>
                    
                    {/* Barra de Búsqueda y Filtros de Categoría */}
                    <div className="space-y-3 relative z-10 pt-1">
                      <div className="flex flex-col sm:flex-row gap-2.5">
                        <div className="flex-1 relative">
                          <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                          <Input
                            type="text"
                            placeholder="Buscar empresa, cochera, jirón o avenida..."
                            value={searchQuery}
                            onChange={(e) => handleSearchChange(e.target.value)}
                            className="pl-10 h-10 border-slate-200 bg-white shadow-xs text-xs"
                          />
                        </div>
                        {searchQuery && (
                          <Button 
                            variant="outline" 
                            size="sm" 
                            onClick={() => handleSearchChange('')}
                            className="text-xs font-bold text-slate-600 h-10 cursor-pointer"
                          >
                            Limpiar
                          </Button>
                        )}
                      </div>

                      {/* Filtros Rápidos */}
                      <div className="flex items-center space-x-2 overflow-x-auto pb-1 text-xs scrollbar-none flex-nowrap shrink-0">
                        <span className="text-slate-400 font-bold uppercase text-[10px] pr-1 flex items-center gap-1 shrink-0">
                          <Filter className="w-3 h-3" /> Filtro:
                        </span>
                        <button
                          onClick={() => handleFilterChange('todos')}
                          className={`px-3 py-1 rounded-xl font-bold transition shrink-0 whitespace-nowrap cursor-pointer ${
                            categoryFilter === 'todos' ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          Todas ({establishments.length})
                        </button>
                        <button
                          onClick={() => handleFilterChange('centro')}
                          className={`px-3 py-1 rounded-xl font-bold transition shrink-0 whitespace-nowrap cursor-pointer ${
                            categoryFilter === 'centro' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          Centro Histórico
                        </button>
                        <button
                          onClick={() => handleFilterChange('techados')}
                          className={`px-3 py-1 rounded-xl font-bold transition shrink-0 whitespace-nowrap cursor-pointer ${
                            categoryFilter === 'techados' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          Techadas
                        </button>
                        <button
                          onClick={() => handleFilterChange('economicos')}
                          className={`px-3 py-1 rounded-xl font-bold transition shrink-0 whitespace-nowrap cursor-pointer ${
                            categoryFilter === 'economicos' ? 'bg-emerald-600 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                          }`}
                        >
                          Económicas (≤ S/ 4.50)
                        </button>
                      </div>
                    </div>
                  </Card>

                  {/* Banner de Reserva Activa / Pase Digital del Conductor */}
                  {realActiveReservation && (
                    <div className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white p-4 rounded-2xl shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3 animate-in fade-in">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-white/20 backdrop-blur-sm flex items-center justify-center shrink-0">
                          <QrCode className="w-5 h-5 text-white" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-bold uppercase tracking-wider bg-white/20 px-2 py-0.5 rounded-md">
                              {realActiveReservation.status === 'SCHEDULED' ? 'Llegando al Estacionamiento' : 'Estadía en Curso'}
                            </span>
                            <span className="text-xs text-emerald-100 font-mono font-bold">
                              {realActiveReservation.code}
                            </span>
                          </div>
                          <p className="text-sm font-semibold mt-0.5">
                            {realActiveReservation.parking} · Plaza {realActiveReservation.slot} ({realActiveReservation.plate})
                          </p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setActiveReservation(realActiveReservation);
                          setShowQRModal(true);
                        }}
                        className="w-full sm:w-auto px-4 py-2 bg-white text-emerald-800 hover:bg-emerald-50 text-xs font-bold rounded-xl transition shadow cursor-pointer flex items-center justify-center gap-2 shrink-0"
                      >
                        <QrCode className="w-4 h-4" />
                        <span>Ver Pase Digital & QR</span>
                      </button>
                    </div>
                  )}

                  {/* MAPA INTERACTIVO DE AYACUCHO */}
                  <AyacuchoMap
                    parkings={activeCompany ? activeCompany.branches : filteredParkings}
                    onSelectParking={(parking) => setSelectedParkingId(parking.id)} 
                    selectedParkingId={selectedParkingId} 
                  />

                  {/* VISTA DEL PLANO O LISTADO DE TARJETAS DE SEDES */}
                  {selectedParking ? (
                    /* Vista del Plano Topográfico Interactivo para el Conductor */
                    <div className="space-y-4 animate-in fade-in">
                      {bookingFeedback && (
                        <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-2xl text-xs font-bold flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-rose-500 shrink-0" />
                          <span>{bookingFeedback}</span>
                        </div>
                      )}
                      {/* Ficha Completa del Establecimiento Seleccionado */}
                      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden animate-in fade-in">
                        {/* Barra superior de navegación y estados */}
                        <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 bg-slate-50 border-b border-slate-200">
                          <div className="flex items-center gap-2">
                            <button 
                              type="button"
                              onClick={() => setSelectedParkingId(null)}
                              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-200 text-slate-700 hover:text-slate-900 text-xs font-bold transition border border-slate-200 shadow-2xs cursor-pointer"
                            >
                              <ArrowLeft className="w-4 h-4" />
                              <span>Cambiar de Sede</span>
                            </button>
                            {selectedParking.level && (
                              <span className="px-2.5 py-1 rounded-lg text-[10px] font-bold bg-slate-200 text-slate-700">
                                {selectedParking.level}
                              </span>
                            )}
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[10px] font-bold bg-emerald-100 text-emerald-800">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              Operativo
                            </span>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600 bg-white border border-slate-200 px-2.5 py-1 rounded-lg shadow-2xs">
                              <Clock className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Tolerancia de espera: <strong className="text-slate-900">{selectedParking.tolerance || selectedParking.tolerance_minutes || 15} min</strong></span>
                            </span>
                          </div>
                        </div>

                        {/* Cuerpo principal con fotografía, datos y contacto */}
                        <div className="p-4 sm:p-5 flex flex-col md:flex-row gap-4 sm:gap-6 items-start">
                          {/* Fotografía de la Sede */}
                          <div className="w-full md:w-56 h-40 md:h-36 shrink-0 rounded-xl overflow-hidden bg-slate-100 border border-slate-200 relative group shadow-2xs">
                            <img 
                              src={selectedParking.image || FALLBACK_PARKING_IMAGE} 
                              alt={selectedParking.name} 
                              referrerPolicy="no-referrer"
                              crossOrigin="anonymous"
                              className="w-full h-full object-cover group-hover:scale-105 transition duration-500" 
                              loading="lazy"
                              onError={(e) => {
                                e.currentTarget.onerror = null;
                                e.currentTarget.src = FALLBACK_PARKING_IMAGE;
                              }}
                            />
                            <div className="absolute bottom-2 left-2 bg-slate-950/85 backdrop-blur-xs text-white text-[11px] font-mono px-2.5 py-0.5 rounded-md font-bold border border-white/20">
                              S/ {Number(selectedParking.rate || selectedParking.hourly_rate || 5.0).toFixed(2)}/h
                            </div>
                          </div>

                          {/* Columna de Información */}
                          <div className="flex-1 min-w-0 space-y-2.5">
                            <div>
                              <div className="flex flex-wrap items-baseline gap-2">
                                <h2 className="text-lg font-black text-slate-900 leading-tight">
                                  {selectedParking.name}
                                </h2>
                                {(selectedParking.owner || selectedParking.ruc) && (
                                  <span className="text-xs text-slate-500 font-medium">
                                    • {selectedParking.owner || 'Empresa'} {selectedParking.ruc ? `(RUC: ${selectedParking.ruc})` : ''}
                                  </span>
                                )}
                              </div>
                              <p className="text-xs text-slate-600 font-medium flex items-center gap-1.5 mt-1">
                                <MapPin className="w-4 h-4 text-emerald-600 shrink-0" />
                                <span>{selectedParking.address || 'Ayacucho - Huamanga'}</span>
                                {selectedParking.reference && (
                                  <span className="text-slate-400 font-normal">({selectedParking.reference})</span>
                                )}
                              </p>
                              {selectedParking.schedule && (
                                <p className="text-xs text-slate-600 font-medium flex items-center gap-1.5 mt-1">
                                  <Clock className="w-4 h-4 text-indigo-600 shrink-0" />
                                  <span>Horario de atención: <strong className="text-slate-800">{selectedParking.schedule}</strong></span>
                                </p>
                              )}
                            </div>

                            {selectedParking.description && (
                              <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-2.5 rounded-xl border border-slate-200/80">
                                {selectedParking.description}
                              </p>
                            )}

                            {/* Tarifas configuradas por el administrador de local */}
                            <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                              <span className="text-[10px] uppercase tracking-wider font-bold text-slate-400 mr-1">Tarifas:</span>
                              <span className="text-[11px] font-mono font-semibold bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-lg border border-slate-200">
                                Auto: S/ {(selectedParking.rate_auto ?? selectedParking.rate ?? 5).toFixed(2)}/h
                              </span>
                              <span className="text-[11px] font-mono font-semibold bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-lg border border-slate-200">
                                SUV/Camioneta: S/ {(selectedParking.rate_suv ?? 7).toFixed(2)}/h
                              </span>
                              <span className="text-[11px] font-mono font-semibold bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-lg border border-slate-200">
                                Moto: S/ {(selectedParking.rate_moto ?? 2.5).toFixed(2)}/h
                              </span>
                              <span className="text-[11px] font-mono font-semibold bg-slate-100 text-slate-700 px-2.5 py-0.5 rounded-lg border border-slate-200">
                                Mototaxi: S/ {(selectedParking.rate_mototaxi ?? 3.5).toFixed(2)}/h
                              </span>
                              {selectedParking.night_shift_enabled && (
                                <span className="text-[11px] font-mono font-semibold bg-indigo-50 text-indigo-700 px-2.5 py-0.5 rounded-lg border border-indigo-200 flex items-center gap-1">
                                  <Moon className="w-3.5 h-3.5 text-indigo-500" />
                                  Noche ({selectedParking.night_shift_start || '20:00'}-{selectedParking.night_shift_end || '06:00'}): +S/ {Number(selectedParking.night_shift_surcharge || 0).toFixed(2)}
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Botones de acción directa / Contacto */}
                          <div className="flex md:flex-col items-center md:items-stretch gap-2 shrink-0 w-full md:w-auto pt-2 md:pt-0">
                            {selectedParking.whatsapp && (
                              <a
                                href={`https://wa.me/${selectedParking.whatsapp.replace(/\D/g, '').startsWith('51') ? selectedParking.whatsapp.replace(/\D/g, '') : '51' + selectedParking.whatsapp.replace(/\D/g, '')}?text=Hola,%20solicito%20informaci%C3%B3n%20sobre%20el%20estacionamiento%20${encodeURIComponent(selectedParking.name)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="flex-1 md:flex-none inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-2xs transition cursor-pointer"
                              >
                                <MessageSquare className="w-4 h-4" />
                                <span>WhatsApp Local</span>
                              </a>
                            )}
                            {selectedParking.phone && (
                              <a
                                href={`tel:${selectedParking.phone.replace(/\D/g, '')}`}
                                className="flex-1 md:flex-none inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 shadow-2xs transition cursor-pointer"
                              >
                                <Phone className="w-4 h-4 text-slate-500" />
                                <span>{selectedParking.phone}</span>
                              </a>
                            )}
                            <a
                              href={selectedParking.mapsUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(`${selectedParking.name} ${selectedParking.address || 'Ayacucho'}`)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex-1 md:flex-none inline-flex items-center justify-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 border border-blue-200 shadow-2xs transition cursor-pointer"
                            >
                              <ExternalLink className="w-4 h-4 text-blue-600" />
                              <span>Cómo Llegar</span>
                            </a>
                          </div>
                        </div>
                      </div>

                      <CustomerInteractivePlanBooking 
                        parking={selectedParking} 
                        planElements={selectedParking.elements || []}
                        onReserveSlot={handleCustomerBooking}
                        onNavigateToVehicles={() => setActiveTab('vehicles')}
                      />
                    </div>
                  ) : !activeCompany ? (
                    /* Nivel 1: Empresas de estacionamiento */
                    <div className="space-y-3">
                      <h2 className="text-lg font-black text-slate-900 flex items-center gap-2">
                        <Building2 className="w-5 h-5 text-emerald-600" />
                        <span>Establecimientos de Estacionamiento ({companyGroups.length})</span>
                      </h2>

                      {isLoadingSedes ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in">
                          {[...Array(6)].map((_, i) => (
                            <SkeletonParkingCard key={i} />
                          ))}
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                          {companyGroups.map((g) => (
                            <Card 
                              key={g.key} 
                              onClick={() => g.branches.length === 1 ? handleSelectParking(g.branches[0]) : setSelectedCompanyKey(g.key)}
                              className="overflow-hidden border-slate-200 shadow-sm hover:shadow-md transition flex flex-col justify-between cursor-pointer group"
                            >
                              <div>
                                <div className="h-44 relative overflow-hidden bg-slate-100">
                                  <img
                                    src={g.image || FALLBACK_PARKING_IMAGE}
                                    alt={g.name}
                                    referrerPolicy="no-referrer"
                                    crossOrigin="anonymous"
                                    className="w-full h-full object-cover group-hover:scale-105 transition duration-500"
                                    loading="lazy"
                                    onError={(e) => {
                                      e.currentTarget.onerror = null;
                                      e.currentTarget.src = FALLBACK_PARKING_IMAGE;
                                    }}
                                  />
                                  <div className="absolute top-3 right-3 bg-white/95 backdrop-blur-md px-3 py-1 rounded-xl text-xs font-black text-emerald-800 shadow-sm border border-slate-200">
                                    {g.branches.length === 1 ? `S/ ${Number(g.branches[0].rate).toFixed(2)}/h` : `Desde S/ ${Number(g.minRate).toFixed(2)}/h`}
                                  </div>
                                  <div className="absolute bottom-3 left-3 bg-slate-950/85 backdrop-blur-md text-emerald-400 px-3 py-1 rounded-xl text-xs font-bold font-mono border border-emerald-500/30">
                                    {g.freeSlots} Libres de {g.totalSlots}
                                  </div>
                                  {g.branches.length > 1 ? (
                                    <div className="absolute top-3 left-3 bg-slate-900/80 backdrop-blur-md text-slate-200 px-2.5 py-0.5 rounded-lg text-[10px] font-bold">
                                      {g.branches.length} sucursales
                                    </div>
                                  ) : (
                                    <div className="absolute top-3 left-3 bg-emerald-900/80 backdrop-blur-md text-emerald-200 px-2.5 py-0.5 rounded-lg text-[10px] font-bold">
                                      Local Principal
                                    </div>
                                  )}
                                </div>

                                <div className="p-5 space-y-3">
                                  <div>
                                    <h3 className="font-extrabold text-slate-900 text-base leading-tight group-hover:text-emerald-700 transition-colors">{g.name}</h3>
                                    <p className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                                      <Building2 className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" />
                                      <span className="truncate">{g.branches.length === 1 ? (g.branches[0].address || 'Ayacucho - Huamanga') : `${g.branches.length} sucursales disponibles`}</span>
                                    </p>
                                  </div>
                                </div>
                              </div>

                              <div className="p-5 pt-0 space-y-2.5">
                                <Button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    g.branches.length === 1 ? handleSelectParking(g.branches[0]) : setSelectedCompanyKey(g.key);
                                  }}
                                  className="w-full font-bold gap-2 text-xs bg-slate-900 hover:bg-slate-800 text-white shadow-sm cursor-pointer py-2.5 rounded-xl"
                                >
                                  <span>{g.branches.length === 1 ? 'Ver Plano & Reservar' : `Ver Sucursales (${g.branches.length})`}</span>
                                  <ChevronRight className="w-4 h-4 text-emerald-400" />
                                </Button>
                              </div>
                            </Card>
                          ))}
                        </div>
                      )}
                    </div>
                  ) : (
                    /* Nivel 2: Sucursales de la empresa seleccionada */
                    <div className="space-y-3">
                      <div className="flex items-center gap-2.5">
                        <button
                          type="button"
                          onClick={() => setSelectedCompanyKey(null)}
                          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 hover:text-slate-900 text-xs font-bold transition cursor-pointer shrink-0"
                        >
                          <ArrowLeft className="w-4 h-4" />
                          <span>Volver a Locales</span>
                        </button>
                        <h2 className="text-lg font-black text-slate-900 flex items-center gap-2 min-w-0">
                          <Building2 className="w-5 h-5 text-emerald-600 shrink-0" />
                          <span className="truncate">{activeCompany.name} ({activeCompany.branches.length} {activeCompany.branches.length === 1 ? 'sucursal' : 'sucursales'})</span>
                        </h2>
                      </div>

                      {isLoadingSedes ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-fade-in">
                          {[...Array(6)].map((_, i) => (
                            <SkeletonParkingCard key={i} />
                          ))}
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                          {activeCompany.branches.map((p) => {
                            const elements = p.elements || [];
                            const totalSlots = elements.filter(e => e.type === 'slot').length || p.totalSlots || 0;
                            const freeSlots = elements.filter(e => e.type === 'slot' && e.status === 'free').length;
                            const shadedSlots = elements.filter(e => e.type === 'slot' && e.shaded).length;

                            return (
                              <Card key={p.id} className="overflow-hidden border-slate-200 shadow-sm hover:shadow-md transition flex flex-col justify-between">
                                <div>
                                  <div className="h-44 relative overflow-hidden bg-slate-100">
                                    <img 
                                      src={p.image || FALLBACK_PARKING_IMAGE} 
                                      alt={p.name} 
                                      referrerPolicy="no-referrer"
                                      crossOrigin="anonymous"
                                      className="w-full h-full object-cover group-hover:scale-105 transition duration-500" 
                                      loading="lazy"
                                      onError={(e) => {
                                        e.currentTarget.onerror = null;
                                        e.currentTarget.src = FALLBACK_PARKING_IMAGE;
                                      }}
                                    />
                                    <div className="absolute top-3 right-3 bg-white/95 backdrop-blur-md px-3 py-1 rounded-xl text-xs font-black text-emerald-800 shadow-sm border border-slate-200">
                                      S/ {Number(p.rate).toFixed(2)}/h
                                    </div>
                                    <div className="absolute bottom-3 left-3 bg-slate-950/85 backdrop-blur-md text-emerald-400 px-3 py-1 rounded-xl text-xs font-bold font-mono border border-emerald-500/30">
                                      {freeSlots} Libres de {totalSlots}
                                    </div>
                                    <div className="absolute top-3 left-3 bg-slate-900/80 backdrop-blur-md text-slate-200 px-2.5 py-0.5 rounded-lg text-[10px] font-bold">
                                      {p.level}
                                    </div>
                                  </div>

                                    <div className="p-5 space-y-3">
                                      <div>
                                        <div className="flex items-center justify-between gap-1.5">
                                          <h3 className="font-extrabold text-slate-900 text-base leading-tight truncate">{p.branchDisplayName || p.name}</h3>
                                          <span className="shrink-0 text-[10px] font-bold text-slate-600 bg-slate-100 border border-slate-200 px-1.5 py-0.5 rounded">
                                            Tol: {p.tolerance || 15}m
                                          </span>
                                        </div>
                                        <p className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                                          <MapPin className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" /> 
                                          <span className="truncate">{p.address} {p.reference ? `(${p.reference})` : ''}</span>
                                        </p>
                                        {p.schedule && (
                                          <p className="text-[11px] text-slate-500 flex items-center gap-1 mt-1">
                                            <Clock className="w-3.5 h-3.5 text-indigo-500 flex-shrink-0" />
                                            <span className="truncate">{p.schedule}</span>
                                          </p>
                                        )}
                                      </div>

                                      {/* Contacto, WhatsApp & Mapa */}
                                      <div className="flex items-center flex-wrap gap-2 text-xs pt-0.5">
                                        {p.whatsapp && (
                                          <a
                                            href={`https://wa.me/${p.whatsapp.replace(/\D/g, '').startsWith('51') ? p.whatsapp.replace(/\D/g, '') : '51' + p.whatsapp.replace(/\D/g, '')}?text=Hola,%20solicito%20informaci%C3%B3n%20sobre%20el%20estacionamiento%20${encodeURIComponent(p.name)}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            onClick={(e) => e.stopPropagation()}
                                            className="inline-flex items-center gap-1.5 text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded-lg border border-emerald-200"
                                          >
                                            <MessageSquare className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                                            <span>WhatsApp</span>
                                          </a>
                                        )}
                                        {p.phone && (
                                          <span className="text-[11px] text-slate-500 font-mono inline-flex items-center gap-1">
                                            <Phone className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                            <span>{p.phone}</span>
                                          </span>
                                        )}
                                        {p.mapsUrl && (
                                          <a
                                            href={p.mapsUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            onClick={(e) => e.stopPropagation()}
                                            className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-700 bg-blue-50 hover:bg-blue-100 px-2 py-1 rounded-lg border border-blue-200"
                                          >
                                            <ExternalLink className="w-3 h-3 text-blue-600 shrink-0" />
                                            <span>Mapa</span>
                                          </a>
                                        )}
                                      </div>
                                    </div>
                                </div>

                                <div className="p-5 pt-0 space-y-2.5">


                                  <Button 
                                    onClick={() => handleSelectParking(p)} 
                                    className="w-full font-bold gap-2 text-xs bg-slate-900 hover:bg-slate-800 text-white shadow-sm cursor-pointer py-2.5 rounded-xl"
                                  >
                                    <span>Ver Plano & Reservar</span>
                                    <ChevronRight className="w-4 h-4 text-emerald-400" />
                                  </Button>
                                </div>
                              </Card>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}

              {activeTab === 'reservations' && (
                <ReservationsModule 
                  onNavigateToBooking={() => {
                    setSelectedParkingId(null);
                    setActiveTab('dashboard');
                  }} 
                />
              )}

              {activeTab === 'profile' && <UserProfileModule onBack={() => setActiveTab('dashboard')} />}
              {activeTab === 'vehicles' && <VehiclesModule />}
              {activeTab === 'payments' && <PaymentsModule />}
              {activeTab === 'incidents' && <IncidentsModule />}
              {activeTab === 'history' && <HistoryModule />}
              {activeTab === 'reviews' && <ReviewsModule />}
            </div>
          )}

          {/* VISTA ROL ADMIN LOCAL */}
          {role === 'local' && (
            <div className="space-y-6">
              {(activeTab === 'dashboard' || activeTab === 'editor') && !isPersonalStaff && (
                <LocalEstablishmentManager />
              )}
              {isPersonalStaff && (activeTab === 'dashboard' || activeTab === 'editor') && (
                <div className="space-y-4">
                  <div className="bg-white p-4 rounded-2xl border border-slate-200 flex items-center justify-between">
                    <div>
                      <h2 className="text-sm font-black text-slate-900 flex items-center gap-2"><Building2 className="w-4 h-4 text-emerald-600"/> Mapa de Sedes — Solo lectura</h2>
                      <p className="text-xs text-slate-500">Vista del personal: consulta ubicación, tarifa y ocupación en vivo. Edición solo Admin Local.</p>
                    </div>
                    <span className="text-xs font-semibold text-slate-600 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-lg">Personal</span>
                  </div>
                  {/* Solo mapa del parking del establecimiento para el trabajador */}
                  {(() => {
                    const localEsts = establishments.filter(e => isMyEstablishment(e, user, role));
                    const est = localEsts.find(e => String(e.id) === String(selectedParkingId)) || localEsts[0] || establishments[0];
                    if (!est) return <div className="p-6 text-center text-xs text-slate-500">Sin sede asignada</div>;
                    const free = (est.elements || []).filter(e => e.type === 'slot' && e.status === 'free').length;
                    const total = (est.elements || []).filter(e => e.type === 'slot').length || 0;
                    const occupied = total - free;
                    return (
                      <div className="space-y-3">
                        <div className="bg-white p-3 rounded-2xl border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="flex items-center gap-2">
                            {isPersonalStaff ? (
                              <span className="bg-emerald-50 border border-emerald-200 rounded-xl px-3 py-2 text-xs font-bold text-emerald-800">Sede asignada: {est.name} — S/ {Number(est.rate).toFixed(2)}/h</span>
                            ) : (
                              <select value={est.id} onChange={e => setSelectedParkingId(e.target.value)} className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-bold text-slate-900 outline-none">
                                {localEsts.map(p => <option key={p.id} value={p.id}>{p.name} — S/ {Number(p.rate).toFixed(2)}/h</option>)}
                              </select>
                            )}
                            <span className="text-xs font-mono font-bold text-emerald-700">{free} libres / {occupied} ocupados</span>
                          </div>
                          <span className="text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2.5 py-1 rounded-lg">{isPersonalStaff ? 'Asignada' : 'Solo Lectura'}</span>
                        </div>
                        <AutoFitFloorPlan elements={est.elements} name={est.name} />
                        <p className="text-[11px] text-center text-slate-500">Para registrar entradas/salidas usa <b>Garita → Walk-in</b> (toca un cajón libre en el mapa de arriba) o <b>Scanner</b>.</p>
                      </div>
                    );
                  })()}
                </div>
              )}
              {activeTab === 'reservations' && <ReservationsModule />}
              {activeTab === 'profile' && <UserProfileModule />}
              {(activeTab === 'anpr' || activeTab === 'garita') && (isPersonalStaff ? <PersonalGaritaModule /> : <ANPRMonitor />)}
              {activeTab === 'cameras' && (isPersonalStaff ? <CameraMonitorModule readOnly /> : <CameraMonitorModule />)}
              {activeTab === 'incidents' && <IncidentsModule />}
              {activeTab === 'staff' && !isPersonalStaff && <StaffModule />}
              {activeTab === 'staff' && isPersonalStaff && <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 text-center text-xs text-slate-500">Solo el Admin Local gestiona el personal.</div>}
              {activeTab === 'audit' && <AuditLogsModule />}
              {activeTab === 'reviews' && <ReviewsModule />}
              {activeTab === 'resiliency' && !isPersonalStaff && <ResiliencySimModule />}
              {activeTab === 'reports' && !isPersonalStaff && <AnalyticsGlobalModule />}
            </div>
          )}

          {/* VISTA ROL ADMIN PLATAFORMA */}
          {role === 'platform' && (
            <div className="max-w-7xl mx-auto space-y-6">
              {activeTab === 'dashboard' && (
                <PlatformGlobalDashboard onNavigateTab={(tab) => setActiveTab(tab)} />
              )}

              {activeTab === 'cameras' && <CameraMonitorModule />}
              {activeTab === 'profile' && <UserProfileModule />}
              {activeTab === 'finances' && <PlatformFinancesModule />}
              {activeTab === 'settings' && <PlatformSettingsModule />}
              {activeTab === 'affiliates' && <AffiliatedParkingsModule />}
              {activeTab === 'reservations' && <ReservationsModule />}
              {activeTab === 'analytics' && <AnalyticsGlobalModule />}
              {activeTab === 'incidents' && <IncidentsModule />}
              {activeTab === 'audit' && <AuditLogsModule />}
              {activeTab === 'users' && <UserRolesModule />}
              {activeTab === 'resiliency' && <ResiliencySimModule />}
            </div>
          )}

          </Suspense>
        </main>
      </div>

      {/* Modal de Pase Digital QR */}
      <DigitalAccessPassModal
        isOpen={showQRModal}
        onClose={() => setShowQRModal(false)}
        reservation={activeReservation || realActiveReservation}
        onReservationUpdated={() => {
          if (refreshMyReservations) refreshMyReservations();
        }}
      />

      {/* Modal de Pasarela de Pagos (PayPal, Culqi, Yape, Plin, PagoEfectivo) */}
      <CulqiPaymentModal
        isOpen={!!paymentTarget}
        onClose={() => {
          if (paymentTarget) {
            if (paymentTarget.requirePrepay) {
              setBookingFeedback('Esta cochera requiere pago anticipado para validar la reserva. El pago no fue procesado.');
              setTimeout(() => setBookingFeedback(null), 5000);
              setPaymentTarget(null);
              return;
            }
            const holdEnriched = {
              ...paymentTarget.enrichedData,
              payNow: false,
              paymentMethod: 'Pago en garita al salir'
            };
            setActiveReservation(holdEnriched);
            setShowQRModal(true);
            setSelectedParkingId(null);
            setPaymentTarget(null);
          }
        }}
        amount={Number(paymentTarget?.amount || 10.00)}
        concept={paymentTarget?.concept || 'Reserva Smart Park'}
        parkingName={paymentTarget?.parkingName || 'Smart Park'}
        slotCode={paymentTarget?.slotCode || 'A-01'}
        customerEmail={paymentTarget?.customerEmail || user?.email || 'conductor@smartpark.com'}
        reservationId={paymentTarget?.reservationId}
        onPaymentSuccess={(receipt) => {
          if (paymentTarget) {
            const paidEnriched = {
              ...paymentTarget.enrichedData,
              status: 'confirmed',
              payNow: true,
              paymentMethod: receipt?.paymentMethod || 'Culqi / PayPal (Pagado)'
            };
            setActiveReservation(paidEnriched);
            setShowQRModal(true);
            setSelectedParkingId(null);
            setPaymentTarget(null);
          }
        }}
      />

      {/* Modal de Términos y Condiciones */}
      <TermsAndConditionsModal
        isOpen={showTermsModal}
        onClose={() => setShowTermsModal(false)}
      />

      {/* Modal de Autenticación Rápida Bajo Demanda */}
      {showAuthModal && (
        <LoginAuthScreen
          isModal={true}
          onClose={() => setShowAuthModal(false)}
          defaultAuthMode={authModalMode}
        />
      )}
    </div>
  );
};
