import React, { useState, useRef } from 'react';
import { motion, useScroll, useSpring, useTransform } from 'framer-motion';
import { 
  Search, 
  MapPin, 
  Car, 
  ShieldCheck, 
  QrCode, 
  Sparkles, 
  ChevronRight, 
  Building2, 
  ArrowRight, 
  Zap, 
  Clock, 
  Navigation, 
  Camera, 
  CreditCard, 
  Smartphone, 
  Phone, 
  LogIn,
  Filter,
  Check,
  Shield,
  Layers,
  ArrowUpRight,
  Maximize2
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
  const heroRef = useRef(null);

  // Barra de progreso de lectura fluida
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 120,
    damping: 30,
    restDelta: 0.001
  });

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
      q: '¿Cómo ingreso a la cochera una vez reservada mi plaza?',
      a: 'Al confirmar tu reserva se genera un Pase Digital QR con tu placa registrada. Al llegar a la garita en Ayacucho, la cámara ANPR reconoce tu placa y levanta la barrera automáticamente, o puedes mostrar tu código QR al operador.'
    },
    {
      q: '¿Cuáles son los métodos de pago aceptados?',
      a: 'Aceptamos pagos con Yape, Plin y tarjetas de crédito o débito a través de la pasarela segura Culqi, emitiendo tu comprobante electrónico de forma instantánea.'
    },
    {
      q: '¿Tengo tolerancia de tiempo si encuentro tráfico?',
      a: 'Sí. Todas las cocheras afiliadas de la red incluyen 15 minutos de cortesía y tolerancia garantizada para que tu llegada sea tranquila.'
    },
    {
      q: '¿Cómo afilio mi cochera si soy propietario en Huamanga?',
      a: 'Haz clic en "Afiliar Cochera", completa el formulario básico y nuestro equipo implementará el sistema digital en tu establecimiento en 24 horas.'
    }
  ];

  return (
    <div className="min-h-screen bg-[#030712] text-slate-100 font-sans selection:bg-emerald-500 selection:text-black antialiased overflow-x-hidden relative">
      
      {/* =========================================================================
          BARRA DE PROGRESO DE SCROLL SUPERIOR
          ========================================================================= */}
      <motion.div 
        className="fixed top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-500 z-[100] origin-left"
        style={{ scaleX }}
      />

      {/* =========================================================================
          1. FLUID ISLAND NAVBAR (Apple / Linear Tier)
          ========================================================================= */}
      <div className="fixed top-5 left-0 right-0 z-50 px-4 flex justify-center pointer-events-none">
        <header className="pointer-events-auto w-full max-w-5xl bg-slate-900/80 backdrop-blur-2xl border border-white/10 rounded-full px-4 sm:px-6 py-2.5 shadow-[0_20px_50px_rgba(0,0,0,0.6)] flex items-center justify-between transition-all">
          
          {/* Logo & Marca */}
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-full bg-white text-slate-950 flex items-center justify-center font-bold shadow-md shrink-0">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4">
                <path d="M9 17V7h4a3 3 0 0 1 0 6H9" />
                <circle cx="12" cy="12" r="10" />
              </svg>
            </div>
            <span className="text-sm font-black text-white tracking-tight font-tech">
              SMART-PARK
            </span>
          </div>

          {/* Enlaces de Navegación Suave */}
          <nav className="hidden md:flex items-center space-x-7 text-xs font-semibold text-slate-400">
            <a href="#mapa" className="hover:text-white transition-colors">Cocheras en Vivo</a>
            <a href="#experiencia" className="hover:text-white transition-colors">Experiencia</a>
            <a href="#infraestructura" className="hover:text-white transition-colors">Tecnología</a>
            <a href="#afiliacion" className="hover:text-white transition-colors">Para Propietarios</a>
          </nav>

          {/* Botones de Acción */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => onOpenAuth && onOpenAuth('affiliation')}
              className="hidden sm:inline-flex text-xs font-semibold text-slate-300 hover:text-white px-3 py-1.5 transition cursor-pointer"
            >
              Afiliar Cochera
            </button>

            <button
              onClick={() => onOpenAuth && onOpenAuth('login')}
              className="group rounded-full bg-white hover:bg-slate-100 text-slate-950 font-black text-xs px-4 py-2 flex items-center space-x-2 transition-all duration-200 active:scale-95 shadow-md cursor-pointer"
            >
              <span>Acceder</span>
              <div className="w-5 h-5 rounded-full bg-slate-950 text-white flex items-center justify-center transition-transform duration-200 group-hover:translate-x-0.5">
                <ArrowRight className="w-3 h-3" />
              </div>
            </button>
          </div>

        </header>
      </div>

      {/* =========================================================================
          2. CINEMATIC HERO SECTION (Clean, Expansive, High Impact)
          ========================================================================= */}
      <section ref={heroRef} className="relative pt-36 pb-20 sm:pt-44 sm:pb-32 px-4 sm:px-6 lg:px-8 overflow-hidden">
        
        {/* Iluminación Atmosférica Suave */}
        <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] sm:w-[900px] h-[400px] bg-gradient-to-tr from-emerald-500/15 via-teal-500/10 to-transparent rounded-full blur-[140px] pointer-events-none" />

        <div className="max-w-5xl mx-auto text-center relative z-10 space-y-8">
          
          {/* Subtítulo de Ciudad */}
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-xs font-mono font-bold tracking-[0.25em] text-emerald-400 uppercase"
          >
            Red de Estacionamientos Inteligentes • Ayacucho
          </motion.div>

          {/* Titular Monumental */}
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
            className="text-4xl sm:text-6xl lg:text-7xl font-black text-white tracking-tighter leading-[1.05] max-w-4xl mx-auto"
          >
            El fin de buscar estacionamiento a ciegas en Huamanga.
          </motion.h1>

          {/* Subtítulo Descriptivo */}
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="text-sm sm:text-base md:text-lg text-slate-400 max-w-2xl mx-auto font-normal leading-relaxed"
          >
            Consulta disponibilidad satelital en tiempo real, elige tu plaza exacta en el plano 2D de la cochera y accede en segundos con tu pase digital o lectura de placa.
          </motion.p>

          {/* Botón Principal de Exploración */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
            className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3.5"
          >
            <a
              href="#mapa"
              className="group w-full sm:w-auto px-7 py-3.5 rounded-full bg-emerald-400 hover:bg-emerald-300 text-slate-950 font-black text-xs sm:text-sm flex items-center justify-center space-x-3 transition-all duration-200 shadow-xl shadow-emerald-500/20 active:scale-98 cursor-pointer"
            >
              <span>Explorar Cocheras en Vivo</span>
              <div className="w-6 h-6 rounded-full bg-slate-950 text-emerald-400 flex items-center justify-center transition-transform duration-200 group-hover:translate-x-1">
                <ArrowRight className="w-3.5 h-3.5" />
              </div>
            </a>

            <button
              onClick={() => onOpenAuth && onOpenAuth('login')}
              className="w-full sm:w-auto px-6 py-3.5 rounded-full bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-white font-bold text-xs sm:text-sm border border-white/10 transition cursor-pointer"
            >
              Iniciar Sesión
            </button>
          </motion.div>

          {/* Métricas Limpias Sin Badges */}
          <motion.div 
            initial={{ opacity: 0, y: 25 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="pt-12 grid grid-cols-2 md:grid-cols-4 gap-6 max-w-3xl mx-auto text-center border-t border-white/5"
          >
            <div>
              <span className="text-2xl sm:text-3xl font-black text-white font-mono block">
                {establishments.length}+
              </span>
              <span className="text-xs text-slate-500 font-medium block mt-1">Cocheras Conectadas</span>
            </div>
            <div>
              <span className="text-2xl sm:text-3xl font-black text-emerald-400 font-mono block">
                {totalFreeSlots}
              </span>
              <span className="text-xs text-slate-500 font-medium block mt-1">Plazas Libres Ahora</span>
            </div>
            <div>
              <span className="text-2xl sm:text-3xl font-black text-white font-mono block">
                100%
              </span>
              <span className="text-xs text-slate-500 font-medium block mt-1">Sin Tickets de Papel</span>
            </div>
            <div>
              <span className="text-2xl sm:text-3xl font-black text-emerald-400 font-mono block">
                S/ 4.00
              </span>
              <span className="text-xs text-slate-500 font-medium block mt-1">Tarifa Promedio / Hora</span>
            </div>
          </motion.div>

        </div>
      </section>

      {/* =========================================================================
          3. HARDWARE MOCKUP SHOWCASE (Double-Bezel Architecture)
          ========================================================================= */}
      <section id="experiencia" className="py-20 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto space-y-12">
        
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <span className="text-xs font-mono font-bold tracking-[0.2em] text-emerald-400 uppercase">
            EXPERIENCIA DIGITAL NATIVA
          </span>
          <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
            Todo tu estacionamiento en un solo toque.
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
            Sin aplicaciones pesadas que descargar. Funciona directo desde el navegador de tu celular con máxima fluidez.
          </p>
        </div>

        {/* Double-Bezel Enclosure: Shell Exterior + Núcleo Interior */}
        <div className="p-2.5 sm:p-4 rounded-[2.5rem] bg-gradient-to-b from-white/10 via-white/5 to-white/0 border border-white/10 shadow-[0_30px_100px_rgba(0,0,0,0.8)]">
          <div className="rounded-[2rem] bg-slate-950 p-6 sm:p-10 border border-white/5 grid grid-cols-1 lg:grid-cols-3 gap-8 items-center">
            
            {/* Columna 1: Características Clave */}
            <div className="space-y-6">
              <div className="space-y-2">
                <h3 className="text-lg font-bold text-white tracking-tight">1. Plano Topográfico 2D</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Elige visualmente la plaza que prefieras: techada, cerca de la garita o con rampa accesible.
                </p>
              </div>

              <div className="space-y-2">
                <h3 className="text-lg font-bold text-white tracking-tight">2. Navegación GPS Waze & Maps</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Un toque en tu pase digital y tu teléfono traza la ruta de manejo exacta hacia la cochera.
                </p>
              </div>

              <div className="space-y-2">
                <h3 className="text-lg font-bold text-white tracking-tight">3. Lectura de Placa ANPR</h3>
                <p className="text-xs text-slate-400 leading-relaxed">
                  Cero colas en garita. El sistema reconoce la placa de tu auto y autoriza el ingreso en menos de un segundo.
                </p>
              </div>
            </div>

            {/* Columna 2 & 3: Maqueta de Pase Digital Realista */}
            <div className="lg:col-span-2 bg-gradient-to-b from-slate-900 to-slate-900/60 p-6 sm:p-8 rounded-3xl border border-white/10 shadow-2xl space-y-6">
              
              <div className="flex items-center justify-between border-b border-white/10 pb-4">
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 rounded-2xl bg-white text-slate-950 flex items-center justify-center font-bold">
                    <QrCode className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="font-extrabold text-sm text-white">Smart Park Plaza Mayor</h4>
                    <p className="text-xs text-slate-400">Jr. 28 de Julio 142 • Centro Histórico</p>
                  </div>
                </div>
                <div className="text-right font-mono">
                  <span className="text-xs text-emerald-400 font-bold block">PASE AUTORIZADO</span>
                  <span className="text-[10px] text-slate-500 block">Tolerancia 15 min</span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs font-mono">
                <div className="bg-slate-950 p-3.5 rounded-2xl border border-white/5 space-y-1">
                  <span className="text-[10px] text-slate-500 block uppercase">Plaza Asignada</span>
                  <strong className="text-base text-emerald-400 font-bold block">A-01 (Techada)</strong>
                </div>
                <div className="bg-slate-950 p-3.5 rounded-2xl border border-white/5 space-y-1">
                  <span className="text-[10px] text-slate-500 block uppercase">Vehículo</span>
                  <strong className="text-base text-white font-bold block">ABC-123</strong>
                </div>
                <div className="bg-slate-950 p-3.5 rounded-2xl border border-white/5 space-y-1">
                  <span className="text-[10px] text-slate-500 block uppercase">Token de Acceso</span>
                  <strong className="text-base text-slate-300 font-bold block truncate">SPK-8912</strong>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-white/5">
                <span>Estado: <strong className="text-white font-medium">Listo para escanear en garita</strong></span>
                <span>Plataforma: <strong className="text-emerald-400 font-medium">Smart-Park v2.4</strong></span>
              </div>

            </div>

          </div>
        </div>

      </section>

      {/* =========================================================================
          4. SECCIÓN DEL MAPA EN VIVO DE AYACUCHO
          ========================================================================= */}
      <section id="mapa" className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-8">
        
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="space-y-2">
            <span className="text-xs font-mono font-bold tracking-[0.2em] text-emerald-400 uppercase block">
              LOCALIZACIÓN EN TIEMPO REAL
            </span>
            <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
              Estacionamientos en Ayacucho
            </h2>
            <p className="text-xs sm:text-sm text-slate-400">
              Selecciona una cochera para ver tarifas por hora, disponibilidad de plazas y trazar ruta GPS.
            </p>
          </div>

          {/* Filtros Tipográficos Limpios */}
          <div className="flex items-center space-x-2 overflow-x-auto pb-1 text-xs scrollbar-none flex-nowrap shrink-0">
            <button
              onClick={() => setCategoryFilter('todos')}
              className={`px-4 py-2 rounded-full font-bold transition shrink-0 cursor-pointer ${
                categoryFilter === 'todos' 
                  ? 'bg-white text-slate-950 shadow-md' 
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-white/10'
              }`}
            >
              Todas ({establishments.length})
            </button>
            <button
              onClick={() => setCategoryFilter('centro')}
              className={`px-4 py-2 rounded-full font-bold transition shrink-0 cursor-pointer ${
                categoryFilter === 'centro' 
                  ? 'bg-emerald-400 text-slate-950 shadow-md' 
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-white/10'
              }`}
            >
              Centro Histórico
            </button>
            <button
              onClick={() => setCategoryFilter('techados')}
              className={`px-4 py-2 rounded-full font-bold transition shrink-0 cursor-pointer ${
                categoryFilter === 'techados' 
                  ? 'bg-emerald-400 text-slate-950 shadow-md' 
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-white/10'
              }`}
            >
              Techadas
            </button>
            <button
              onClick={() => setCategoryFilter('economicos')}
              className={`px-4 py-2 rounded-full font-bold transition shrink-0 cursor-pointer ${
                categoryFilter === 'economicos' 
                  ? 'bg-emerald-400 text-slate-950 shadow-md' 
                  : 'bg-slate-900 text-slate-400 hover:text-white border border-white/10'
              }`}
            >
              Económicas (≤ S/ 4.50)
            </button>
          </div>
        </div>

        {/* Mapa Leaflet */}
        <AyacuchoMap
          parkings={filteredParkings}
          onSelectParking={(p) => {
            if (onSelectParking) onSelectParking(p);
          }}
        />

        {/* Tarjetas de Cocheras con Estética Doble Bisel */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-4">
          {filteredParkings.map((p) => {
            const elements = p.elements || [];
            const freeSlots = elements.filter(e => e.type === 'slot' && e.status === 'free').length;
            const totalCount = elements.filter(e => e.type === 'slot').length || p.totalSlots || 0;

            return (
              <div 
                key={p.id} 
                className="p-2 rounded-[2rem] bg-slate-900/60 border border-white/10 shadow-xl hover:border-emerald-500/30 transition-all duration-300 flex flex-col justify-between"
              >
                <div className="rounded-[1.5rem] bg-slate-950 overflow-hidden">
                  
                  {/* Foto de Cochera */}
                  <div className="h-44 relative overflow-hidden">
                    <img 
                      src={p.image || 'https://images.unsplash.com/photo-1506521781263-d8422e82f27a?w=800'} 
                      alt={p.name} 
                      className="w-full h-full object-cover opacity-90 hover:opacity-100 transition duration-500 hover:scale-105" 
                    />
                    <div className="absolute top-3 right-3 bg-slate-950/90 backdrop-blur-md px-3 py-1 rounded-full text-xs font-mono font-bold text-emerald-400 border border-white/10">
                      S/ {Number(p.rate).toFixed(2)}/h
                    </div>
                    <div className="absolute bottom-3 left-3 bg-slate-950/90 backdrop-blur-md px-3 py-1 rounded-full text-xs font-mono font-bold text-white border border-white/10">
                      {freeSlots} Libres de {totalCount}
                    </div>
                  </div>

                  {/* Detalles */}
                  <div className="p-5 space-y-2.5">
                    <h3 className="font-extrabold text-white text-base leading-tight">{p.name}</h3>
                    <p className="text-xs text-slate-400 flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" /> 
                      <span className="truncate">{p.address} {p.reference ? `(${p.reference})` : ''}</span>
                    </p>
                  </div>

                </div>

                {/* Acciones */}
                <div className="p-3 pt-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${p.latitude || -13.1604},${p.longitude || -74.2259}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 py-2 px-3 bg-slate-900 hover:bg-slate-800 text-slate-200 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 transition border border-white/5"
                    >
                      <span>📍 Google Maps</span>
                    </a>
                    <a
                      href={`https://waze.com/ul?ll=${p.latitude || -13.1604},${p.longitude || -74.2259}&navigate=yes`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 py-2 px-3 bg-slate-900 hover:bg-slate-800 text-blue-400 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 border border-white/5"
                    >
                      <span>🚗 Waze</span>
                    </a>
                  </div>

                  <button
                    onClick={() => {
                      if (onSelectParking) onSelectParking(p);
                    }}
                    className="w-full py-3 rounded-xl bg-white hover:bg-slate-100 text-slate-950 font-black text-xs flex items-center justify-center space-x-2 transition cursor-pointer active:scale-98 shadow-md"
                  >
                    <span>Ver Plano & Reservar</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>

              </div>
            );
          })}
        </div>

      </section>

      {/* =========================================================================
          5. BENTO GRID DE ARQUITECTURA TECNOLÓGICA
          ========================================================================= */}
      <section id="infraestructura" className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-12">
        
        <div className="text-center max-w-2xl mx-auto space-y-3">
          <span className="text-xs font-mono font-bold tracking-[0.2em] text-emerald-400 uppercase">
            INFRAESTRUCTURA DE VANGUARDIA
          </span>
          <h2 className="text-3xl sm:text-5xl font-black text-white tracking-tight">
            Tecnología construida para la velocidad.
          </h2>
        </div>

        {/* Asymmetrical Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Card 1: Reconocimiento ANPR */}
          <div className="md:col-span-2 p-8 rounded-[2rem] bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 border border-white/10 shadow-2xl flex flex-col justify-between space-y-8">
            <div className="space-y-3 max-w-md">
              <div className="w-10 h-10 rounded-2xl bg-emerald-400/10 text-emerald-400 flex items-center justify-center border border-emerald-400/20">
                <Camera className="w-5 h-5" />
              </div>
              <h3 className="text-2xl font-black text-white tracking-tight">
                Visión Artificial y Detección ANPR
              </h3>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                Algoritmos optimizados para reconocer placas del parque automotor peruano a 60 cuadros por segundo, incluso en condiciones de baja iluminación nocturna.
              </p>
            </div>

            <div className="p-4 bg-slate-950 rounded-2xl border border-white/5 flex items-center justify-between font-mono text-xs text-slate-300">
              <span>Latencia de lectura en garita:</span>
              <strong className="text-emerald-400 font-bold">&lt; 180 milisegundos</strong>
            </div>
          </div>

          {/* Card 2: Pase QR Inteligente */}
          <div className="p-8 rounded-[2rem] bg-slate-900 border border-white/10 shadow-2xl flex flex-col justify-between space-y-8">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-2xl bg-teal-400/10 text-teal-400 flex items-center justify-center border border-teal-400/20">
                <QrCode className="w-5 h-5" />
              </div>
              <h3 className="text-xl font-black text-white tracking-tight">
                Pase QR con Tolerancia
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Pase digital de alta resolución con temporizador de cuenta regresiva y 15 minutos de cortesía en todas las sedes.
              </p>
            </div>

            <div className="p-3 bg-slate-950 rounded-xl border border-white/5 text-center font-mono text-xs text-slate-400">
              Operación 100% Sin Papel
            </div>
          </div>

          {/* Card 3: Pasarelas de Pago */}
          <div className="p-8 rounded-[2rem] bg-slate-900 border border-white/10 shadow-2xl flex flex-col justify-between space-y-8">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-2xl bg-blue-400/10 text-blue-400 flex items-center justify-center border border-blue-400/20">
                <CreditCard className="w-5 h-5" />
              </div>
              <h3 className="text-xl font-black text-white tracking-tight">
                Pagos con Yape, Plin y Tarjeta
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Liquidación inmediata mediante Culqi con emisión automática de tu boleta electrónica tributaria.
              </p>
            </div>

            <div className="flex items-center justify-around text-xs font-mono text-slate-400">
              <span>Yape</span>
              <span>•</span>
              <span>Plin</span>
              <span>•</span>
              <span>Visa/Mastercard</span>
            </div>
          </div>

          {/* Card 4: Seguridad y Trazabilidad */}
          <div className="md:col-span-2 p-8 rounded-[2rem] bg-slate-900 border border-white/10 shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="space-y-3 max-w-md">
              <div className="w-10 h-10 rounded-2xl bg-amber-400/10 text-amber-400 flex items-center justify-center border border-amber-400/20">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="text-2xl font-black text-white tracking-tight">
                Seguridad y Trazabilidad 24 Horas
              </h3>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                Registro horario de ingresos, bitácora fotográfica y soporte en tiempo real ante cualquier eventualidad.
              </p>
            </div>

            <div className="space-y-2 text-xs font-mono text-slate-300 w-full sm:w-auto">
              <div className="p-3 bg-slate-950 rounded-xl border border-white/5">
                ✔ Auditoría de accesos en tiempo real
              </div>
              <div className="p-3 bg-slate-950 rounded-xl border border-white/5">
                ✔ Registro fotográfico por vehículo
              </div>
            </div>
          </div>

        </div>

      </section>

      {/* =========================================================================
          6. SECCIÓN PARA DUEÑOS DE COCHERAS (B2B)
          ========================================================================= */}
      <section id="afiliacion" className="py-20 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="p-3 sm:p-4 rounded-[2.5rem] bg-gradient-to-b from-white/10 to-transparent border border-white/10 shadow-2xl">
          <div className="rounded-[2rem] bg-gradient-to-r from-slate-950 via-slate-900 to-slate-950 p-8 sm:p-14 border border-white/5 flex flex-col md:flex-row items-center justify-between gap-8">
            
            <div className="max-w-xl space-y-4">
              <span className="text-xs font-mono font-bold tracking-[0.2em] text-emerald-400 uppercase block">
                PARA PROPIETARIOS DE ESTACIONAMIENTOS
              </span>
              <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">
                Digitaliza tu cochera en Ayacucho.
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                Únete a la red Smart-Park. Instalamos el plano 2D interactivo, el sistema de garita ANPR y conectamos tu negocio a miles de conductores en Huamanga.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
              <button
                onClick={() => onOpenAuth && onOpenAuth('affiliation')}
                className="px-8 py-4 rounded-full bg-white hover:bg-slate-100 text-slate-950 font-black text-xs transition cursor-pointer shadow-lg active:scale-98"
              >
                Solicitar Afiliación
              </button>
              <a
                href="https://wa.me/51966000000?text=Hola,%20deseo%20afiliar%20mi%20cochera%20en%20Ayacucho"
                target="_blank"
                rel="noopener noreferrer"
                className="px-6 py-4 rounded-full bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs border border-white/10 transition text-center cursor-pointer"
              >
                Hablar por WhatsApp
              </a>
            </div>

          </div>
        </div>
      </section>

      {/* =========================================================================
          7. PREGUNTAS FRECUENTES (FAQ)
          ========================================================================= */}
      <section className="py-20 bg-slate-950/80 border-t border-white/5 px-4 sm:px-6 lg:px-8">
        <div className="max-w-3xl mx-auto space-y-10">
          
          <div className="text-center space-y-2">
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Preguntas Frecuentes
            </h2>
            <p className="text-xs sm:text-sm text-slate-400">
              Información esencial sobre el funcionamiento del sistema.
            </p>
          </div>

          <div className="space-y-3">
            {faqs.map((faq, idx) => (
              <div 
                key={idx}
                className="border border-white/10 rounded-2xl overflow-hidden bg-slate-900/60"
              >
                <button
                  onClick={() => setActiveFaq(activeFaq === idx ? null : idx)}
                  className="w-full p-5 text-left font-bold text-xs sm:text-sm text-white flex items-center justify-between hover:bg-slate-900 cursor-pointer"
                >
                  <span>{faq.q}</span>
                  <span className="text-slate-500 font-mono text-base">{activeFaq === idx ? '−' : '+'}</span>
                </button>
                {activeFaq === idx && (
                  <div className="p-5 bg-slate-950 border-t border-white/5 text-xs sm:text-sm text-slate-400 leading-relaxed">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* =========================================================================
          8. FOOTER LIMPIO & TÉRMINOS
          ========================================================================= */}
      <footer className="bg-[#030712] text-slate-500 py-12 px-4 sm:px-6 lg:px-8 border-t border-white/5 text-xs">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center space-x-3">
            <div className="w-7 h-7 rounded-full bg-white text-slate-950 flex items-center justify-center font-bold">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3.5 h-3.5">
                <path d="M9 17V7h4a3 3 0 0 1 0 6H9" />
                <circle cx="12" cy="12" r="10" />
              </svg>
            </div>
            <span className="font-extrabold text-white tracking-tight font-tech">SMART-PARK AYACUCHO</span>
            <span>• © 2026</span>
          </div>

          <div className="flex items-center space-x-6">
            <button
              onClick={onOpenTerms}
              className="hover:text-white transition cursor-pointer"
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
