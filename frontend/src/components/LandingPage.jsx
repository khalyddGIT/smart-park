import React, { useState } from 'react';
import { 
  Search, 
  MapPin, 
  Car, 
  ShieldCheck, 
  QrCode, 
  Sparkles, 
  ChevronRight, 
  Building2, 
  CheckCircle2, 
  ArrowRight, 
  Zap, 
  Clock, 
  Navigation, 
  Camera, 
  CreditCard, 
  Smartphone, 
  Award, 
  Phone, 
  HelpCircle,
  LogIn,
  Filter,
  Check,
  Star,
  Shield
} from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card } from './ui/card';
import { AyacuchoMap } from './AyacuchoMap';

export const LandingPage = ({ 
  establishments = [], 
  onOpenAuth, 
  onSelectParking, 
  onOpenTerms 
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('todos');
  const [activeFaq, setActiveFaq] = useState(null);

  // Filtrado de cocheras
  const filteredParkings = establishments.filter((p) => {
    const matchesSearch = 
      p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.address.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (p.reference && p.reference.toLowerCase().includes(searchQuery.toLowerCase())) ||
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

  const totalSlots = establishments.reduce((acc, curr) => {
    return acc + (curr.elements || []).filter(e => e.type === 'slot').length;
  }, 0);

  const totalFreeSlots = establishments.reduce((acc, curr) => {
    return acc + (curr.elements || []).filter(e => e.type === 'slot' && e.status === 'free').length;
  }, 0);

  const faqs = [
    {
      q: '¿Cómo funciona el ingreso a la cochera con Smart-Park?',
      a: 'Al realizar tu reserva se genera un Pase Digital con Código QR y tu placa queda registrada. Al llegar a la garita, la cámara inteligente ANPR detecta tu placa y abre la barrera automáticamente, o puedes mostrar tu código QR al operador.'
    },
    {
      q: '¿Puedo pagar con Yape, Plin o Tarjeta?',
      a: 'Sí. Aceptamos pagos seguros vía Culqi (tarjetas de crédito/débito Visa, Mastercard), además de transferencias directas por Yape y Plin con emisión automática de comprobante electrónico.'
    },
    {
      q: '¿Qué pasa si llego unos minutos después de mi hora?',
      a: 'El sistema incluye 15 minutos de tolerancia de cortesía en todas las cocheras de la red para que no tengas inconvenientes con el tráfico de la ciudad.'
    },
    {
      q: '¿Cómo afilio mi cochera si soy propietario en Ayacucho?',
      a: 'Solo debes hacer clic en el botón "Afiliar mi Cochera", completar los datos básicos de tu establecimiento y nuestro equipo técnico instalará el sistema de garita y planos en 24 horas.'
    }
  ];

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans selection:bg-emerald-500 selection:text-white antialiased overflow-x-hidden">
      
      {/* =========================================================================
          1. HEADER GLASSMORPHISM SUPERIOR
          ========================================================================= */}
      <header className="sticky top-0 z-50 px-4 sm:px-6 lg:px-10 py-3.5 bg-white/80 backdrop-blur-xl border-b border-slate-200/80 shadow-2xs select-none">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          
          {/* Logo y Badge de Ciudad */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-slate-950 text-emerald-400 flex items-center justify-center font-bold shadow-md border border-slate-800 shrink-0">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-5 h-5">
                <path d="M9 17V7h4a3 3 0 0 1 0 6H9" />
                <circle cx="12" cy="12" r="10" />
              </svg>
            </div>
            <div>
              <span className="text-base sm:text-lg font-black text-slate-900 tracking-tight font-tech block leading-tight">
                SMART-PARK
              </span>
              <span className="text-[10px] font-mono text-emerald-700 font-extrabold uppercase tracking-wider block">
                Ayacucho • Huamanga
              </span>
            </div>
          </div>

          {/* Menú Central Desktop */}
          <nav className="hidden md:flex items-center space-x-8 text-xs font-bold text-slate-600">
            <a href="#mapa" className="hover:text-emerald-700 transition">Mapa en Vivo</a>
            <a href="#como-funciona" className="hover:text-emerald-700 transition">Cómo Funciona</a>
            <a href="#tecnologia" className="hover:text-emerald-700 transition">Tecnología ANPR</a>
            <a href="#afiliacion" className="hover:text-emerald-700 transition">Para Cocheras</a>
          </nav>

          {/* Acciones de Autenticación */}
          <div className="flex items-center space-x-2.5">
            <button
              onClick={() => onOpenAuth && onOpenAuth('affiliation')}
              className="hidden sm:flex items-center space-x-1.5 px-3.5 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-xs font-bold transition shadow-2xs cursor-pointer"
            >
              <Building2 className="w-3.5 h-3.5 text-emerald-600" />
              <span>Afiliar Cochera</span>
            </button>
            <Button
              onClick={() => onOpenAuth && onOpenAuth('login')}
              className="bg-slate-950 hover:bg-slate-800 text-white font-bold text-xs px-4 py-2 rounded-xl shadow-md cursor-pointer flex items-center space-x-1.5"
            >
              <LogIn className="w-3.5 h-3.5 text-emerald-400" />
              <span>Iniciar Sesión</span>
            </Button>
          </div>

        </div>
      </header>

      {/* =========================================================================
          2. HERO SECTION DE ALTO IMPACTO
          ========================================================================= */}
      <section className="relative pt-12 pb-16 sm:pt-20 sm:pb-24 px-4 sm:px-6 lg:px-8 overflow-hidden bg-gradient-to-b from-white via-slate-50 to-emerald-50/30">
        
        {/* Luces de fondo ambientales */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[650px] h-[350px] bg-emerald-400/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute top-1/3 right-10 w-[350px] h-[250px] bg-teal-400/10 rounded-full blur-[100px] pointer-events-none" />

        <div className="max-w-5xl mx-auto text-center relative z-10 space-y-6">
          
          {/* Píldora de Telemetría en Vivo */}
          <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-white border border-emerald-200/80 shadow-xs text-xs font-bold text-emerald-900 animate-in fade-in zoom-in-95 duration-500">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
            <span className="font-mono">{totalFreeSlots} plazas libres en tiempo real</span>
            <span className="text-slate-300">•</span>
            <span className="text-slate-600 font-normal">Huamanga, Ayacucho</span>
          </div>

          {/* Titular Principal */}
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-slate-950 tracking-tight leading-[1.15] max-w-4xl mx-auto">
            Aparca sin dar vueltas en Ayacucho.{' '}
            <span className="bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
              Reserva tu plaza al instante.
            </span>
          </h1>

          {/* Subtítulo */}
          <p className="text-sm sm:text-base md:text-lg text-slate-600 max-w-2xl mx-auto font-normal leading-relaxed">
            Visualiza en vivo el plano topográfico de las mejores cocheras de la ciudad, elige tu plaza exacta y accede sin tickets físicos mediante lectura de placa ANPR y pase digital QR.
          </p>

          {/* Barra de Búsqueda Rápida en el Hero */}
          <div className="max-w-xl mx-auto pt-2">
            <div className="p-2 bg-white/95 backdrop-blur-md rounded-2xl shadow-xl border border-slate-200 flex flex-col sm:flex-row items-center gap-2">
              <div className="flex-1 flex items-center space-x-2.5 px-3 w-full">
                <Search className="w-4 h-4 text-slate-400 shrink-0" />
                <Input
                  type="text"
                  placeholder="Buscar por jirón, Plaza Mayor o cochera..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="border-none shadow-none focus-visible:ring-0 text-xs sm:text-sm h-10 px-0 placeholder:text-slate-400"
                />
              </div>
              <a
                href="#mapa"
                className="w-full sm:w-auto px-5 py-2.5 bg-slate-950 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-md transition flex items-center justify-center space-x-1.5 shrink-0"
              >
                <span>Ver Disponibilidad</span>
                <ChevronRight className="w-3.5 h-3.5 text-emerald-400" />
              </a>
            </div>
          </div>

          {/* Métricas de Confianza / Proof Points */}
          <div className="pt-8 grid grid-cols-2 sm:grid-cols-4 gap-4 max-w-3xl mx-auto text-left">
            <div className="bg-white/80 backdrop-blur-sm p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs">
              <span className="text-xl sm:text-2xl font-black text-slate-900 font-mono block">
                {establishments.length}+
              </span>
              <span className="text-[11px] text-slate-500 font-bold block">Cocheras en Huamanga</span>
            </div>
            <div className="bg-white/80 backdrop-blur-sm p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs">
              <span className="text-xl sm:text-2xl font-black text-emerald-600 font-mono block">
                100%
              </span>
              <span className="text-[11px] text-slate-500 font-bold block">Digital con Pase QR</span>
            </div>
            <div className="bg-white/80 backdrop-blur-sm p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs">
              <span className="text-xl sm:text-2xl font-black text-slate-900 font-mono block">
                &lt; 5s
              </span>
              <span className="text-[11px] text-slate-500 font-bold block">Ingreso con LPR / ANPR</span>
            </div>
            <div className="bg-white/80 backdrop-blur-sm p-3.5 rounded-2xl border border-slate-200/80 shadow-2xs">
              <span className="text-xl sm:text-2xl font-black text-emerald-600 font-mono block">
                S/ 4.00
              </span>
              <span className="text-[11px] text-slate-500 font-bold block">Tarifa Base por Hora</span>
            </div>
          </div>

        </div>
      </section>

      {/* =========================================================================
          3. MAPA EN VIVO & CATÁLOGO DE COCHERAS GEOLOCALIZADAS
          ========================================================================= */}
      <section id="mapa" className="py-12 sm:py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-6">
        
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold mb-2">
              <Navigation className="w-3.5 h-3.5 text-emerald-600" />
              <span>Exploración Satelital en Tiempo Real</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-950 tracking-tight">
              Cocheras Disponibles en Ayacucho
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              Selecciona una cochera en el mapa o en la lista para ver fotos, tarifas y plazas libres.
            </p>
          </div>

          {/* Filtros Rápidos */}
          <div className="flex items-center space-x-2 overflow-x-auto pb-1 text-xs scrollbar-none flex-nowrap shrink-0">
            <span className="text-slate-400 font-bold uppercase text-[10px] pr-1 flex items-center gap-1 shrink-0">
              <Filter className="w-3 h-3" /> Filtrar:
            </span>
            <button
              onClick={() => setCategoryFilter('todos')}
              className={`px-3 py-1.5 rounded-xl font-bold transition shrink-0 whitespace-nowrap cursor-pointer ${
                categoryFilter === 'todos' ? 'bg-slate-950 text-white shadow-xs' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              Todas ({establishments.length})
            </button>
            <button
              onClick={() => setCategoryFilter('centro')}
              className={`px-3 py-1.5 rounded-xl font-bold transition shrink-0 whitespace-nowrap cursor-pointer ${
                categoryFilter === 'centro' ? 'bg-emerald-600 text-white shadow-xs' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              Centro Histórico
            </button>
            <button
              onClick={() => setCategoryFilter('techados')}
              className={`px-3 py-1.5 rounded-xl font-bold transition shrink-0 whitespace-nowrap cursor-pointer ${
                categoryFilter === 'techados' ? 'bg-emerald-600 text-white shadow-xs' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              Techadas
            </button>
            <button
              onClick={() => setCategoryFilter('economicos')}
              className={`px-3 py-1.5 rounded-xl font-bold transition shrink-0 whitespace-nowrap cursor-pointer ${
                categoryFilter === 'economicos' ? 'bg-emerald-600 text-white shadow-xs' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-100'
              }`}
            >
              Económicas (≤ S/ 4.50)
            </button>
          </div>
        </div>

        {/* Mapa Interactivo con Leaflet y Marquee */}
        <AyacuchoMap
          parkings={filteredParkings}
          onSelectParking={(p) => {
            if (onSelectParking) onSelectParking(p);
          }}
        />

        {/* Grilla de Tarjetas de Cocheras con Navegación GPS */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-4">
          {filteredParkings.map((p) => {
            const elements = p.elements || [];
            const freeSlots = elements.filter(e => e.type === 'slot' && e.status === 'free').length;
            const totalCount = elements.filter(e => e.type === 'slot').length || p.totalSlots || 0;

            return (
              <Card key={p.id} className="overflow-hidden border-slate-200/90 shadow-sm hover:shadow-md transition duration-300 flex flex-col justify-between bg-white rounded-3xl group">
                <div>
                  <div className="h-44 relative overflow-hidden bg-slate-100">
                    <img 
                      src={p.image || 'https://images.unsplash.com/photo-1506521781263-d8422e82f27a?w=800'} 
                      alt={p.name} 
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-500" 
                    />
                    <div className="absolute top-3 right-3 bg-white/95 backdrop-blur-md px-3 py-1 rounded-xl text-xs font-black text-emerald-800 shadow-sm border border-slate-200 font-mono">
                      S/ {Number(p.rate).toFixed(2)}/h
                    </div>
                    <div className="absolute bottom-3 left-3 bg-slate-950/85 backdrop-blur-md text-emerald-400 px-3 py-1 rounded-xl text-xs font-bold font-mono border border-emerald-500/30">
                      {freeSlots} Libres de {totalCount}
                    </div>
                    <div className="absolute top-3 left-3 bg-slate-900/80 backdrop-blur-md text-slate-200 px-2.5 py-0.5 rounded-lg text-[10px] font-bold">
                      {p.level}
                    </div>
                  </div>

                  <div className="p-5 space-y-3">
                    <div>
                      <h3 className="font-extrabold text-slate-900 text-base leading-tight">{p.name}</h3>
                      <p className="text-xs text-slate-500 flex items-center gap-1 mt-1">
                        <MapPin className="w-3.5 h-3.5 text-emerald-600 flex-shrink-0" /> 
                        <span className="truncate">{p.address} {p.reference ? `(${p.reference})` : ''}</span>
                      </p>
                    </div>

                    {/* WhatsApp */}
                    {p.whatsapp && (
                      <div className="flex items-center space-x-2 text-xs pt-0.5">
                        <a
                          href={`https://wa.me/${p.whatsapp.replace(/\D/g, '')}?text=Hola,%20solicito%20informaci%C3%B3n%20sobre%20el%20estacionamiento%20${encodeURIComponent(p.name)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 px-2.5 py-1 rounded-lg border border-emerald-200"
                        >
                          <span>💬 WhatsApp</span>
                        </a>
                      </div>
                    )}
                  </div>
                </div>

                <div className="p-5 pt-0 space-y-2.5">
                  {/* Botones de Navegación GPS Rápida */}
                  <div className="flex items-center gap-2">
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${p.latitude || -13.1604},${p.longitude || -74.2259}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 py-1.5 px-2 bg-slate-100 hover:bg-slate-200 text-slate-800 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1.5 transition border border-slate-200"
                      title="Abrir ruta en Google Maps"
                    >
                      <span>📍 Maps</span>
                    </a>
                    <a
                      href={`https://waze.com/ul?ll=${p.latitude || -13.1604},${p.longitude || -74.2259}&navigate=yes`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 py-1.5 px-2 bg-blue-50 hover:bg-blue-100 text-blue-900 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1.5 border border-blue-200"
                      title="Abrir ruta en Waze"
                    >
                      <span>🚗 Waze</span>
                    </a>
                  </div>

                  <Button 
                    onClick={() => {
                      if (onSelectParking) onSelectParking(p);
                    }} 
                    className="w-full font-bold gap-2 text-xs bg-slate-950 hover:bg-slate-800 text-white shadow-sm cursor-pointer py-2.5 rounded-xl"
                  >
                    <span>Ver Plano & Reservar</span>
                    <ChevronRight className="w-4 h-4 text-emerald-400" />
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>

      </section>

      {/* =========================================================================
          4. CÓMO FUNCIONA (3 PASOS)
          ========================================================================= */}
      <section id="como-funciona" className="py-16 bg-white border-y border-slate-200/80 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto space-y-12">
          
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 font-mono block">
              EXPERIENCIA DIGITAL FLUIDA
            </span>
            <h2 className="text-2xl sm:text-4xl font-black text-slate-950 tracking-tight">
              ¿Cómo estacionar con Smart-Park?
            </h2>
            <p className="text-xs sm:text-sm text-slate-500">
              Olvídate de buscar cochera a ciegas. Tres pasos simples para asegurar tu plaza.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            
            {/* Paso 1 */}
            <div className="bg-slate-50 p-6 sm:p-8 rounded-3xl border border-slate-200/90 relative space-y-4 shadow-2xs">
              <div className="w-12 h-12 rounded-2xl bg-slate-950 text-emerald-400 font-black text-lg flex items-center justify-center shadow-md">
                1
              </div>
              <h3 className="text-lg font-black text-slate-900 tracking-tight">
                Ubica tu Cochera en el Mapa
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Revisa las plazas libres en vivo, distancias al centro de Huamanga, fotos reales y precios por hora antes de salir.
              </p>
            </div>

            {/* Paso 2 */}
            <div className="bg-slate-50 p-6 sm:p-8 rounded-3xl border border-slate-200/90 relative space-y-4 shadow-2xs">
              <div className="w-12 h-12 rounded-2xl bg-slate-950 text-emerald-400 font-black text-lg flex items-center justify-center shadow-md">
                2
              </div>
              <h3 className="text-lg font-black text-slate-900 tracking-tight">
                Elige tu Plaza en el Plano 2D
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Selecciona la posición exacta de tu vehículo (techada, estándar o PMR) en el plano interactivo de la cochera.
              </p>
            </div>

            {/* Paso 3 */}
            <div className="bg-slate-50 p-6 sm:p-8 rounded-3xl border border-slate-200/90 relative space-y-4 shadow-2xs">
              <div className="w-12 h-12 rounded-2xl bg-slate-950 text-emerald-400 font-black text-lg flex items-center justify-center shadow-md">
                3
              </div>
              <h3 className="text-lg font-black text-slate-900 tracking-tight">
                Acceso sin Papel ni Colas
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Llega a la garita. La cámara LPR leerá tu placa o podrás escanear tu Pase QR desde el celular para abrir la barrera.
              </p>
            </div>

          </div>

        </div>
      </section>

      {/* =========================================================================
          5. CUADRÍCULA BENTO DE TECNOLOGÍA
          ========================================================================= */}
      <section id="tecnologia" className="py-16 sm:py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-10">
        
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-700 font-mono block">
            TECNOLOGÍA DE VANGUARDIA
          </span>
          <h2 className="text-2xl sm:text-4xl font-black text-slate-950 tracking-tight">
            Infraestructura Inteligente para Huamanga
          </h2>
        </div>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Card 1: ANPR */}
          <div className="md:col-span-2 bg-gradient-to-br from-slate-950 to-slate-900 text-white p-8 rounded-3xl shadow-xl flex flex-col justify-between space-y-6 relative overflow-hidden">
            <div className="space-y-3 z-10 max-w-md">
              <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-mono font-bold">
                <Camera className="w-3.5 h-3.5" />
                <span>IA & Visión Computacional</span>
              </div>
              <h3 className="text-2xl font-black tracking-tight text-white">
                Reconocimiento Automático de Placas (ANPR)
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Nuestras garitas cuentan con algoritmos de OCR que procesan placas peruanas a 60 FPS. Cero esperas para ingresar o salir.
              </p>
            </div>

            <div className="p-4 bg-slate-900/90 rounded-2xl border border-slate-800 flex items-center justify-between font-mono text-xs z-10">
              <div className="flex items-center space-x-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span className="text-slate-400">Detección Garita:</span>
                <strong className="text-emerald-400 font-bold">ABC-123</strong>
              </div>
              <span className="text-emerald-400 font-bold bg-emerald-950/60 px-2 py-0.5 rounded-lg border border-emerald-500/40">
                AUTORIZADO
              </span>
            </div>
          </div>

          {/* Card 2: Pase QR */}
          <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between space-y-6">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
                <QrCode className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-black text-slate-900 tracking-tight">
                Pase QR con Temporizador
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Pase digital de alta resolución, scannable en pantallas con brillo bajo y con cuenta regresiva de tu tiempo reservado.
              </p>
            </div>
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center font-mono text-xs font-bold text-slate-700">
              SPK-8912-7B2F9A
            </div>
          </div>

          {/* Card 3: Pasarelas de Pago */}
          <div className="bg-white p-8 rounded-3xl border border-slate-200 shadow-sm flex flex-col justify-between space-y-6">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-800 flex items-center justify-center">
                <CreditCard className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-black text-slate-900 tracking-tight">
                Pagos con Culqi, Yape & Plin
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Paga de forma 100% segura con tus billeteras digitales favoritas y recibe tu comprobante electrónico de inmediato.
              </p>
            </div>
            <div className="flex items-center space-x-2 text-[11px] font-bold text-slate-600">
              <span className="px-2 py-1 bg-slate-100 rounded-lg">Yape</span>
              <span className="px-2 py-1 bg-slate-100 rounded-lg">Plin</span>
              <span className="px-2 py-1 bg-slate-100 rounded-lg">Tarjetas</span>
            </div>
          </div>

          {/* Card 4: Seguridad */}
          <div className="md:col-span-2 bg-white p-8 rounded-3xl border border-slate-200 shadow-sm flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="space-y-3 max-w-md">
              <div className="w-10 h-10 rounded-xl bg-amber-100 text-amber-800 flex items-center justify-center">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="text-xl font-black text-slate-900 tracking-tight">
                Seguridad & Monitoreo 24 Horas
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 leading-relaxed">
                Todas las cocheras de la red cuentan con registro fotográfico de entradas y salidas, trazabilidad por auditoría y soporte ante incidentes.
              </p>
            </div>
            <div className="flex flex-col gap-2 w-full sm:w-auto">
              <div className="flex items-center space-x-2 text-xs font-bold text-slate-700 bg-slate-50 px-4 py-2 rounded-xl border border-slate-200">
                <Check className="w-4 h-4 text-emerald-600" />
                <span>Auditoría de garita en tiempo real</span>
              </div>
              <div className="flex items-center space-x-2 text-xs font-bold text-slate-700 bg-slate-50 px-4 py-2 rounded-xl border border-slate-200">
                <Check className="w-4 h-4 text-emerald-600" />
                <span>Tolerancia de cortesía garantizada</span>
              </div>
            </div>
          </div>

        </div>

      </section>

      {/* =========================================================================
          6. SECCIÓN PARA DUEÑOS DE COCHERAS (B2B AFILIACIÓN)
          ========================================================================= */}
      <section id="afiliacion" className="py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-slate-950 text-white rounded-3xl p-8 sm:p-12 shadow-2xl relative overflow-hidden border border-slate-800">
          
          <div className="max-w-2xl space-y-4 relative z-10">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 font-mono block">
              PARA PROPIETARIOS DE ESTACIONAMIENTOS
            </span>
            <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
              ¿Tienes una cochera en Ayacucho? Digitaliza tu negocio hoy.
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Únete a la red Smart-Park. Te proporcionamos el plano digital 2D de tu cochera, la interfaz de garita, liquidación automática de pagos y miles de conductores que buscan dónde aparcar.
            </p>
            
            <div className="pt-2 flex flex-col sm:flex-row gap-3">
              <Button
                onClick={() => onOpenAuth && onOpenAuth('affiliation')}
                className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs h-11 px-6 rounded-xl shadow-lg cursor-pointer"
              >
                <Building2 className="w-4 h-4 mr-2" />
                <span>Solicitar Afiliación Gratuita</span>
              </Button>
              <a
                href="https://wa.me/51966000000?text=Hola,%20tengo%20una%20cochera%20en%20Ayacucho%20y%20deseo%20afiliarme%20a%20Smart-Park"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center px-6 h-11 rounded-xl bg-white/10 hover:bg-white/15 text-white font-bold text-xs border border-white/20 transition cursor-pointer"
              >
                <span>Hablar con un Asesor</span>
              </a>
            </div>
          </div>

        </div>
      </section>

      {/* =========================================================================
          7. PREGUNTAS FRECUENTES (FAQ)
          ========================================================================= */}
      <section className="py-16 bg-white border-t border-slate-200/80 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="text-center space-y-2">
            <h2 className="text-2xl sm:text-3xl font-black text-slate-950 tracking-tight">
              Preguntas Frecuentes
            </h2>
            <p className="text-xs sm:text-sm text-slate-500">
              Todo lo que necesitas saber antes de tu primera reserva.
            </p>
          </div>

          <div className="space-y-3">
            {faqs.map((faq, idx) => (
              <div 
                key={idx}
                className="border border-slate-200 rounded-2xl overflow-hidden transition"
              >
                <button
                  onClick={() => setActiveFaq(activeFaq === idx ? null : idx)}
                  className="w-full p-4.5 text-left font-bold text-xs sm:text-sm text-slate-900 flex items-center justify-between bg-slate-50/50 hover:bg-slate-50 cursor-pointer"
                >
                  <span>{faq.q}</span>
                  <span className="text-slate-400 font-mono text-base">{activeFaq === idx ? '−' : '+'}</span>
                </button>
                {activeFaq === idx && (
                  <div className="p-4.5 bg-white border-t border-slate-100 text-xs sm:text-sm text-slate-600 leading-relaxed animate-in fade-in">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* =========================================================================
          8. FOOTER CORPORATIVO
          ========================================================================= */}
      <footer className="bg-slate-950 text-white py-12 px-4 sm:px-6 lg:px-8 border-t border-slate-800">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 text-xs text-slate-400">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-xl bg-slate-900 text-emerald-400 flex items-center justify-center font-bold border border-slate-800">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4">
                <path d="M9 17V7h4a3 3 0 0 1 0 6H9" />
                <circle cx="12" cy="12" r="10" />
              </svg>
            </div>
            <div>
              <span className="font-extrabold text-white tracking-tight font-tech">SMART-PARK AYACUCHO</span>
              <p className="text-[10px] text-slate-500">© 2026 Smart-Park Inc. Todos los derechos reservados.</p>
            </div>
          </div>

          <div className="flex items-center space-x-6">
            <button
              onClick={onOpenTerms}
              className="hover:text-white transition underline cursor-pointer"
            >
              Términos Legales & Condiciones
            </button>
            <a
              href="https://wa.me/51966000000"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-emerald-400 transition"
            >
              Soporte WhatsApp
            </a>
          </div>
        </div>
      </footer>

    </div>
  );
};
