import React, { useState, useMemo, useRef, useEffect } from 'react';
import { motion, useScroll, useSpring, useTransform, useMotionValue, AnimatePresence } from 'framer-motion';
import { 
  Search, 
  MapPin, 
  Car, 
  ShieldCheck, 
  QrCode, 
  ChevronRight, 
  Building2, 
  ArrowRight, 
  Navigation, 
  Camera, 
  CreditCard, 
  Smartphone, 
  LogIn,
  Filter,
  Check,
  Layers,
  Clock,
  Zap,
  Globe,
  Sparkles,
  CheckCircle2
} from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { AyacuchoMap } from './AyacuchoMap';

// Curva elástica ultra fluida acelerada por hardware (GPU)
const FLUID_EASE = [0.16, 1, 0.3, 1];

// Componente de Sección con Animaciones 100% Fluidas y Optimizadas para Móviles y Escritorio
const CinematicScrollSection = ({ children, className = '', id = '' }) => {
  const sectionRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start end', 'end start']
  });

  const opacity = useTransform(scrollYProgress, [0, 0.2, 0.8, 1], [0.4, 1, 1, 0.4]);
  const scale = useTransform(scrollYProgress, [0, 0.25, 0.75, 1], [0.97, 1, 1, 0.98]);
  const y = useTransform(scrollYProgress, [0, 0.25, 0.75, 1], [30, 0, 0, -25]);

  const smoothScale = useSpring(scale, { stiffness: 180, damping: 28, mass: 0.8 });
  const smoothY = useSpring(y, { stiffness: 180, damping: 28, mass: 0.8 });

  return (
    <motion.section
      ref={sectionRef}
      id={id}
      style={{
        opacity,
        scale: smoothScale,
        y: smoothY
      }}
      className={`transform-gpu will-change-transform ${className}`}
    >
      {children}
    </motion.section>
  );
};

// Tarjeta con Inercia Interactiva Suave y Detección de Dispositivo Táctil
const DynamicTiltCard = ({ children, className = '' }) => {
  const cardRef = useRef(null);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  useEffect(() => {
    setIsTouchDevice('ontouchstart' in window || navigator.maxTouchPoints > 0);
  }, []);

  const rotateX = useSpring(useTransform(mouseY, [-0.5, 0.5], [5, -5]), { stiffness: 280, damping: 26 });
  const rotateY = useSpring(useTransform(mouseX, [-0.5, 0.5], [-5, 5]), { stiffness: 280, damping: 26 });

  const handleMouseMove = (e) => {
    if (isTouchDevice || !cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const xFromCenter = (e.clientX - rect.left) / rect.width - 0.5;
    const yFromCenter = (e.clientY - rect.top) / rect.height - 0.5;
    mouseX.set(xFromCenter);
    mouseY.set(yFromCenter);
  };

  const handleMouseLeave = () => {
    mouseX.set(0);
    mouseY.set(0);
  };

  return (
    <motion.div
      ref={cardRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={!isTouchDevice ? { rotateX, rotateY, transformStyle: 'preserve-3d', perspective: 1000 } : {}}
      className={`transform-gpu will-change-transform ${className}`}
    >
      {children}
    </motion.div>
  );
};

export const LandingPage = ({ 
  establishments = [], 
  onOpenAuth, 
  onSelectParking, 
  onOpenTerms 
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('todos');
  const [activeFaq, setActiveFaq] = useState(null);

  // Referencias para Parallax
  const heroRef = useRef(null);
  const mockupSectionRef = useRef(null);

  // Barra elástica de progreso de lectura superior
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 200,
    damping: 30,
    restDelta: 0.001
  });

  // Parallax del Hero
  const { scrollYProgress: heroScrollProgress } = useScroll({
    target: heroRef,
    offset: ['start start', 'end start']
  });

  const heroHeadlineY = useTransform(heroScrollProgress, [0, 1], [0, -40]);
  const heroOpacity = useTransform(heroScrollProgress, [0, 0.85], [1, 0.25]);
  const heroScale = useTransform(heroScrollProgress, [0, 1], [1, 0.97]);

  const smoothHeroHeadlineY = useSpring(heroHeadlineY, { stiffness: 180, damping: 26, mass: 0.7 });
  const smoothHeroScale = useSpring(heroScale, { stiffness: 180, damping: 26, mass: 0.7 });

  // Transformación 3D del Mockup Faux-OS
  const { scrollYProgress: mockupScrollProgress } = useScroll({
    target: mockupSectionRef,
    offset: ['start end', 'center center']
  });

  const mockupRotateX = useTransform(mockupScrollProgress, [0, 1], [12, 0]);
  const mockupScale = useTransform(mockupScrollProgress, [0, 1], [0.93, 1]);
  const mockupOpacity = useTransform(mockupScrollProgress, [0, 0.45], [0.5, 1]);
  const smoothMockupRotateX = useSpring(mockupRotateX, { stiffness: 140, damping: 22 });
  const smoothMockupScale = useSpring(mockupScale, { stiffness: 140, damping: 22 });

  // Filtrado de cocheras
  const filteredParkings = useMemo(() => {
    return establishments.filter((p) => {
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
  }, [establishments, searchQuery, categoryFilter]);

  const totalFreeSlots = useMemo(() => {
    return establishments.reduce((acc, curr) => {
      return acc + (curr.elements || []).filter(e => e.type === 'slot' && e.status === 'free').length;
    }, 0);
  }, [establishments]);

  const faqs = [
    {
      q: '¿Cómo se realiza el ingreso a la cochera con la reserva?',
      a: 'Al confirmar la reserva en la plataforma se emite un Pase Digital con código de identificación vehicular. Al llegar a la garita en Huamanga, la cámara ANPR reconoce la placa registrada y habilita el acceso de forma inmediata.'
    },
    {
      q: '¿Cuáles son los canales de pago habilitados?',
      a: 'La plataforma procesa pagos digitales a través de Yape, Plin y tarjetas de crédito o débito mediante pasarela bancaria segura, emitiendo el comprobante de pago de inmediato.'
    },
    {
      q: '¿Existe tolerancia de tiempo ante eventualidades de tráfico?',
      a: 'Todos los estacionamientos afiliados disponen de un margen de 15 minutos de cortesía y tolerancia garantizada para asegurar una llegada sin contratiempos.'
    },
    {
      q: '¿Cuál es el procedimiento para afiliar un estacionamiento en Huamanga?',
      a: 'Seleccione la opción "Afiliar Cochera", ingrese los datos de ubicación y capacidad del inmueble, y el equipo técnico configurará el plano digital y el acceso en un plazo de 24 horas.'
    }
  ];

  return (
    <div className="w-full min-h-screen bg-slate-950 text-slate-100 font-sans antialiased selection:bg-emerald-500 selection:text-white relative overflow-x-hidden">
      {/* Indicador elástico superior de scroll */}
      <motion.div 
        className="fixed top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-emerald-500 via-teal-400 to-indigo-500 z-[100] origin-left"
        style={{ scaleX }}
      />

      {/* Fondos dinámicos de neón sutil */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-emerald-500/10 blur-[140px] pointer-events-none rounded-full" />
      <div className="absolute top-96 right-0 w-[500px] h-[400px] bg-indigo-500/10 blur-[130px] pointer-events-none rounded-full" />

      {/* =========================================================================
          HERO SECTION CON RESPONSIVE DESIGN FLUIDO Y ESTÉTICA DARK-TECH
          ========================================================================= */}
      <section ref={heroRef} className="pt-12 sm:pt-20 pb-16 sm:pb-24 px-4 sm:px-6 lg:px-12 max-w-6xl mx-auto space-y-10 sm:space-y-12 text-center relative z-10">
        
        <motion.div 
          style={{ 
            y: smoothHeroHeadlineY, 
            opacity: heroOpacity,
            scale: smoothHeroScale
          }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: FLUID_EASE }}
          className="space-y-6 flex flex-col items-center transform-gpu will-change-transform"
        >
          
          {/* Badge de Tecnología */}
          <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900/90 border border-emerald-500/30 text-emerald-400 text-xs font-mono font-bold shadow-lg shadow-emerald-950/20 backdrop-blur-md">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span>SISTEMA DE ESTACIONAMIENTO INTELIGENTE EN AYACUCHO</span>
          </div>

          {/* Titular Principal Centrado */}
          <h1 className="text-3xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold text-white tracking-tight max-w-4xl mx-auto leading-[1.08] font-sans">
            Encuentre e ingrese a su cochera en <span className="text-gradient-emerald">Ayacucho</span> sin esperas.
          </h1>

          {/* Subtítulo Centrado */}
          <p className="text-sm sm:text-base md:text-lg text-slate-300 max-w-2xl mx-auto font-medium leading-relaxed text-center px-2">
            Consulte la disponibilidad en tiempo real, seleccione su plaza en el plano 2D interactivo y acceda mediante reconocimiento automático de placa (ANPR).
          </p>

          {/* Barra de búsqueda interactiva rápida */}
          <div className="w-full max-w-xl mx-auto pt-2">
            <div className="relative flex items-center bg-slate-900/90 rounded-2xl border border-slate-800 shadow-2xl p-1.5 backdrop-blur-md focus-within:border-emerald-500/60 transition">
              <Search className="w-5 h-5 text-slate-400 ml-3 shrink-0" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por zona, calle o nombre de cochera (ej. Plaza Mayor)..."
                className="w-full bg-transparent px-3 py-2.5 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none font-medium"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="px-2 text-xs font-mono text-slate-400 hover:text-white"
                >
                  Limpiar
                </button>
              )}
            </div>
          </div>

          {/* Botones Centrados */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3.5 w-full max-w-md sm:max-w-none">
            <motion.a
              whileHover={{ scale: 1.03, y: -2 }}
              whileTap={{ scale: 0.97 }}
              href="#mapa"
              className="w-full sm:w-auto px-7 py-3.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs sm:text-sm rounded-xl transition-all duration-200 flex items-center justify-center space-x-2 cursor-pointer shadow-lg shadow-emerald-500/25"
            >
              <span>Explorar Cocheras en Vivo</span>
              <ArrowRight className="w-4 h-4" />
            </motion.a>

            <motion.button
              whileHover={{ scale: 1.03, y: -2 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => onOpenAuth && onOpenAuth('affiliation')}
              className="w-full sm:w-auto px-6 py-3.5 bg-slate-900/80 hover:bg-slate-800 text-slate-200 text-xs sm:text-sm font-semibold rounded-xl border border-slate-700/80 shadow-md transition-colors duration-200 cursor-pointer backdrop-blur-md"
            >
              Afiliar Cochera en Huamanga
            </motion.button>
          </div>

        </motion.div>

        {/* Métricas de Precisión en Vivo */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2, ease: FLUID_EASE }}
          className="grid grid-cols-2 md:grid-cols-4 gap-3.5 sm:gap-6 pt-6 sm:pt-8 border-t border-slate-800/80 text-center"
        >
          <div className="space-y-1 bg-slate-900/60 backdrop-blur-md p-4 sm:p-5 rounded-2xl border border-slate-800 shadow-md">
            <span className="font-mono text-2xl sm:text-3xl md:text-4xl font-extrabold text-emerald-400 block">
              {establishments.length}
            </span>
            <span className="text-[11px] sm:text-xs text-slate-400 font-semibold block">Cocheras conectadas</span>
          </div>

          <div className="space-y-1 bg-slate-900/60 backdrop-blur-md p-4 sm:p-5 rounded-2xl border border-slate-800 shadow-md">
            <span className="font-mono text-2xl sm:text-3xl md:text-4xl font-extrabold text-teal-300 block">
              {totalFreeSlots}
            </span>
            <span className="text-[11px] sm:text-xs text-slate-400 font-semibold block">Plazas libres ahora</span>
          </div>

          <div className="space-y-1 bg-slate-900/60 backdrop-blur-md p-4 sm:p-5 rounded-2xl border border-slate-800 shadow-md">
            <span className="font-mono text-2xl sm:text-3xl md:text-4xl font-extrabold text-indigo-400 block">
              &lt; 0.2s
            </span>
            <span className="text-[11px] sm:text-xs text-slate-400 font-semibold block">Lectura LPR a 60 FPS</span>
          </div>

          <div className="space-y-1 bg-slate-900/60 backdrop-blur-md p-4 sm:p-5 rounded-2xl border border-slate-800 shadow-md">
            <span className="font-mono text-2xl sm:text-3xl md:text-4xl font-extrabold text-emerald-400 block">
              S/ 4.00
            </span>
            <span className="text-[11px] sm:text-xs text-slate-400 font-semibold block">Tarifa promedio / hora</span>
          </div>
        </motion.div>

      </section>

      {/* =========================================================================
          MOCKUP DE VENTANA FAUX-OS
          ========================================================================= */}
      <CinematicScrollSection id="sistema" className="py-16 sm:py-24 px-4 sm:px-6 lg:px-12 max-w-6xl mx-auto space-y-8 sm:space-y-10">
        
        {/* Encabezado Centrado */}
        <div className="max-w-2xl mx-auto text-center space-y-2 px-2">
          <span className="text-xs font-mono text-emerald-400 uppercase tracking-wider block font-bold">
            ARQUITECTURA DE ACCESO DIGITAL
          </span>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white tracking-tight">
            Interacción fluida sin aplicaciones pesadas
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 max-w-lg mx-auto font-medium">
            La plataforma opera mediante web progresiva en vivo, compatible con cualquier smartphone.
          </p>
        </div>

        {/* Contenedor Faux-OS Window Chrome */}
        <div ref={mockupSectionRef} style={{ perspective: 1200 }}>
          <motion.div 
            style={{ 
              rotateX: smoothMockupRotateX,
              scale: smoothMockupScale,
              opacity: mockupOpacity,
              transformStyle: 'preserve-3d'
            }}
            className="rounded-3xl border border-slate-800 bg-slate-900/90 backdrop-blur-xl shadow-2xl overflow-hidden transition-shadow duration-300 transform-gpu will-change-transform"
          >
            
            {/* Barra superior de ventana */}
            <div className="px-4 py-3 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="w-3 h-3 rounded-full bg-rose-500/80" />
                <span className="w-3 h-3 rounded-full bg-amber-500/80" />
                <span className="w-3 h-3 rounded-full bg-emerald-500/80" />
              </div>
              <span className="font-mono text-xs text-emerald-400 font-bold truncate max-w-[220px] sm:max-w-none">
                smart-park.pe/pase/SPK-AYC891
              </span>
              <div className="w-10" />
            </div>

            {/* Cuerpo del Mockup */}
            <div className="p-5 sm:p-8 lg:p-10 grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 items-center bg-slate-900/80">
              
              <div className="space-y-5 md:col-span-1 md:border-r border-slate-800 md:pr-6">
                <div className="space-y-1.5">
                  <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-mono text-[10px] font-bold">
                    PASO 1
                  </div>
                  <h3 className="text-sm font-extrabold text-white">Selección en Plano 2D</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Identificación del espacio disponible exacto: techado, estándar o adaptado.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-teal-500/10 text-teal-300 font-mono text-[10px] font-bold">
                    PASO 2
                  </div>
                  <h3 className="text-sm font-extrabold text-white">Navegación GPS Directa</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Ruteo directo hacia la garita mediante Google Maps o Waze en un clic.
                  </p>
                </div>

                <div className="space-y-1.5">
                  <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-indigo-500/10 text-indigo-400 font-mono text-[10px] font-bold">
                    PASO 3
                  </div>
                  <h3 className="text-sm font-extrabold text-white">Ingreso LPR Instantáneo</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    Apertura de la barrera vehicular tras el reconocimiento de la placa.
                  </p>
                </div>
              </div>

              {/* Ficha de Pase Digital */}
              <div className="md:col-span-2 bg-slate-950 p-5 sm:p-6 rounded-2xl border border-slate-800 shadow-xl space-y-4">
                
                <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                  <div>
                    <h4 className="font-extrabold text-sm text-white">Smart Park Plaza Mayor</h4>
                    <p className="text-xs text-slate-400 font-mono">Jr. 28 de Julio 142 • Huamanga</p>
                  </div>
                  <span className="font-mono text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-full border border-emerald-500/30">
                    AUTORIZADO
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2.5 sm:gap-3 font-mono text-xs">
                  <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-slate-400 block uppercase font-bold">Plaza</span>
                    <strong className="text-sm text-white block mt-0.5 font-bold">A-01</strong>
                  </div>
                  <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-slate-400 block uppercase font-bold">Vehículo</span>
                    <strong className="text-sm text-white block mt-0.5 font-bold">ABC-123</strong>
                  </div>
                  <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
                    <span className="text-[10px] text-slate-400 block uppercase font-bold">Cortesía</span>
                    <strong className="text-sm text-emerald-400 block mt-0.5 font-bold">15 min</strong>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-800 font-mono gap-1">
                  <span>Token: SPK-AYC891-7B2F9A</span>
                  <span className="text-emerald-400 font-bold flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    LPR 60 FPS Activo
                  </span>
                </div>

              </div>

            </div>

          </motion.div>
        </div>

      </CinematicScrollSection>

      {/* =========================================================================
          DIRECTORIO Y MAPA EN VIVO
          ========================================================================= */}
      <CinematicScrollSection id="mapa" className="py-16 sm:py-24 px-4 sm:px-6 lg:px-12 max-w-6xl mx-auto space-y-6 sm:space-y-8">
        
        {/* Encabezado y Filtros Centrados */}
        <div className="max-w-3xl mx-auto text-center space-y-4">
          <div className="space-y-2 px-2">
            <span className="text-xs font-mono text-emerald-400 uppercase tracking-wider block font-bold">
              COBERTURA URBANA EN AYACUCHO
            </span>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white tracking-tight">
              Estacionamientos Afiliados
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto font-medium">
              Tarifas transparentes por hora, capacidad de plazas y geolocalización en tiempo real.
            </p>
          </div>

          {/* Filtros de Cocheras */}
          <div className="flex items-center justify-center space-x-2 overflow-x-auto pb-1 text-xs flex-wrap gap-y-2 px-2">
            <button
              onClick={() => setCategoryFilter('todos')}
              className={`px-4 py-2 rounded-xl font-bold transition-all duration-200 cursor-pointer border text-xs ${
                categoryFilter === 'todos'
                  ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-md shadow-emerald-500/20'
                  : 'bg-slate-900/80 text-slate-300 hover:text-white border-slate-800'
              }`}
            >
              Todos ({establishments.length})
            </button>
            <button
              onClick={() => setCategoryFilter('centro')}
              className={`px-4 py-2 rounded-xl font-bold transition-all duration-200 cursor-pointer border text-xs ${
                categoryFilter === 'centro'
                  ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-md shadow-emerald-500/20'
                  : 'bg-slate-900/80 text-slate-300 hover:text-white border-slate-800'
              }`}
            >
              Centro Histórico
            </button>
            <button
              onClick={() => setCategoryFilter('techados')}
              className={`px-4 py-2 rounded-xl font-bold transition-all duration-200 cursor-pointer border text-xs ${
                categoryFilter === 'techados'
                  ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-md shadow-emerald-500/20'
                  : 'bg-slate-900/80 text-slate-300 hover:text-white border-slate-800'
              }`}
            >
              Techados
            </button>
            <button
              onClick={() => setCategoryFilter('economicos')}
              className={`px-4 py-2 rounded-xl font-bold transition-all duration-200 cursor-pointer border text-xs ${
                categoryFilter === 'economicos'
                  ? 'bg-emerald-500 text-slate-950 border-emerald-400 shadow-md shadow-emerald-500/20'
                  : 'bg-slate-900/80 text-slate-300 hover:text-white border-slate-800'
              }`}
            >
              Económicos (≤ S/ 4.50)
            </button>
          </div>
        </div>

        {/* Mapa Leaflet */}
        <div className="relative isolate z-0 rounded-2xl border border-slate-800 overflow-hidden shadow-2xl bg-slate-900 transition-shadow duration-300 min-h-[380px]">
          <AyacuchoMap
            parkings={filteredParkings}
            onSelectParking={(p) => {
              if (onSelectParking) onSelectParking(p);
            }}
          />
        </div>

        {/* Grilla de Cocheras */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 sm:gap-6 pt-2 sm:pt-4">
          {filteredParkings.map((p, idx) => {
            const elements = p.elements || [];
            const freeSlots = elements.filter(e => e.type === 'slot' && e.status === 'free').length;
            const totalCount = elements.filter(e => e.type === 'slot').length || p.totalSlots || 0;

            return (
              <motion.div 
                key={p.id}
                initial={{ opacity: 0, y: 25 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: '-20px' }}
                transition={{ duration: 0.5, delay: (idx % 3) * 0.06, ease: FLUID_EASE }}
              >
                <DynamicTiltCard className="h-full bg-slate-900/90 backdrop-blur-md rounded-2xl border border-slate-800 p-5 flex flex-col justify-between shadow-xl hover:border-emerald-500/50 transition-all duration-300 group">
                  <div className="space-y-3.5">
                    <div className="h-36 rounded-xl overflow-hidden relative bg-slate-950">
                      <img 
                        src={p.image || 'https://images.unsplash.com/photo-1506521781263-d8422e82f27a?w=800'} 
                        alt={p.name} 
                        className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" 
                      />
                      <div className="absolute top-2.5 right-2.5 bg-slate-950/90 px-3 py-1 rounded-lg text-xs font-mono font-extrabold text-emerald-400 border border-slate-800 shadow-md backdrop-blur-md">
                        S/ {Number(p.rate).toFixed(2)}/h
                      </div>
                      <div className="absolute bottom-2.5 left-2.5 bg-slate-950/90 px-2.5 py-1 rounded-md text-[11px] font-bold text-white flex items-center gap-1.5 border border-slate-800 backdrop-blur-md">
                        <span className={`w-2 h-2 rounded-full ${freeSlots > 0 ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'}`} />
                        <span>{freeSlots > 0 ? `${freeSlots} plazas libres` : 'Cochera Llena'}</span>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <h3 className="font-extrabold text-base text-white group-hover:text-emerald-400 transition-colors">{p.name}</h3>
                      <p className="text-xs text-slate-400 flex items-center gap-1 truncate">
                        <MapPin className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span>{p.address} {p.reference ? `(${p.reference})` : ''}</span>
                      </p>
                    </div>

                    <div className="flex items-center justify-between text-xs font-mono text-slate-400 pt-2 border-t border-slate-800">
                      <span>Capacidad total:</span>
                      <strong className="text-slate-200 font-bold">{totalCount} plazas</strong>
                    </div>
                  </div>

                  <div className="pt-4 space-y-2.5">
                    <div className="flex items-center gap-2">
                      <a
                        href={`https://www.google.com/maps/dir/?api=1&destination=${p.latitude || -13.1604},${p.longitude || -74.2259}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 py-2 px-3 bg-slate-950 hover:bg-slate-800 text-slate-300 rounded-xl text-xs font-bold text-center border border-slate-800 transition-colors"
                      >
                        Google Maps
                      </a>
                      <a
                        href={`https://waze.com/ul?ll=${p.latitude || -13.1604},${p.longitude || -74.2259}&navigate=yes`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 py-2 px-3 bg-slate-950 hover:bg-slate-800 text-slate-300 rounded-xl text-xs font-bold text-center border border-slate-800 transition-colors"
                      >
                        Waze
                      </a>
                    </div>

                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => {
                        if (onSelectParking) onSelectParking(p);
                      }}
                      className="w-full py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-extrabold text-xs rounded-xl transition-colors duration-200 flex items-center justify-center space-x-1.5 cursor-pointer shadow-md shadow-emerald-500/20"
                    >
                      <span>Ver Plano & Reservar</span>
                      <ChevronRight className="w-4 h-4" />
                    </motion.button>
                  </div>
                </DynamicTiltCard>
              </motion.div>
            );
          })}
        </div>

      </CinematicScrollSection>

      {/* =========================================================================
          BENTO GRID DE ESPECIFICACIONES TÉCNICAS
          ========================================================================= */}
      <CinematicScrollSection id="infraestructura" className="py-16 sm:py-24 px-4 sm:px-6 lg:px-12 max-w-6xl mx-auto space-y-8 sm:space-y-10">
        
        {/* Encabezado Centrado */}
        <div className="max-w-2xl mx-auto text-center space-y-2 px-2">
          <span className="text-xs font-mono text-emerald-400 uppercase tracking-wider block font-bold">
            ESPECIFICACIÓN TÉCNICA
          </span>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white tracking-tight">
            Módulos del Sistema Operativo
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto font-medium">
            Infraestructura optimizada para operaciones vehiculares de alto flujo.
          </p>
        </div>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6">
          
          <motion.div 
            initial={{ opacity: 0, y: 25 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-20px' }}
            transition={{ duration: 0.5, ease: FLUID_EASE }}
            className="md:col-span-2 bg-slate-900/90 backdrop-blur-md p-6 sm:p-8 rounded-2xl border border-slate-800 space-y-5 flex flex-col justify-between shadow-xl"
          >
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center font-bold">
                <Camera className="w-5 h-5" />
              </div>
              <h3 className="text-lg sm:text-xl font-extrabold text-white">
                Reconocimiento Automático de Placas (ANPR)
              </h3>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                Algoritmos de visión artificial procesando placas vehiculares peruanas a 60 FPS con tolerancia a variaciones lumínicas y polvo.
              </p>
            </div>
            <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 font-mono text-xs text-emerald-400 flex justify-between items-center">
              <span>Tiempo medio de lectura:</span>
              <strong className="text-white font-extrabold">&lt; 180 ms</strong>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 25 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-20px' }}
            transition={{ duration: 0.5, delay: 0.08, ease: FLUID_EASE }}
            className="bg-slate-900/90 backdrop-blur-md p-6 sm:p-8 rounded-2xl border border-slate-800 space-y-5 flex flex-col justify-between shadow-xl"
          >
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-teal-500/10 border border-teal-500/30 text-teal-300 flex items-center justify-center font-bold">
                <QrCode className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-extrabold text-white">
                Pase Digital Criptográfico
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Tokens únicos con código QR de acceso y respaldo en almacenamiento del smartphone.
              </p>
            </div>
            <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 font-mono text-xs text-teal-300 text-center font-bold">
              Protocolo Cero Papel
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 25 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-20px' }}
            transition={{ duration: 0.5, delay: 0.12, ease: FLUID_EASE }}
            className="bg-slate-900/90 backdrop-blur-md p-6 sm:p-8 rounded-2xl border border-slate-800 space-y-5 flex flex-col justify-between shadow-xl"
          >
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 flex items-center justify-center font-bold">
                <CreditCard className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-extrabold text-white">
                Pasarela de Pagos
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Integración directa con Yape, Plin y tarjetas bancarias con comprobante digital inmediato.
              </p>
            </div>
            <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 font-mono text-xs text-indigo-300 text-center font-bold">
              Yape • Plin • Culqi
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 25 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-20px' }}
            transition={{ duration: 0.5, delay: 0.16, ease: FLUID_EASE }}
            className="md:col-span-2 bg-slate-900/90 backdrop-blur-md p-6 sm:p-8 rounded-2xl border border-slate-800 space-y-5 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-xl"
          >
            <div className="space-y-2 max-w-md text-center sm:text-left">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 flex items-center justify-center font-bold mx-auto sm:mx-0">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-extrabold text-white">
                Trazabilidad de Garita
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Registro inmutable de accesos con foto del evento y cálculo automático de permanencia.
              </p>
            </div>
            <div className="space-y-2 text-xs font-mono text-slate-300 w-full sm:w-auto font-semibold">
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-center sm:text-left">
                Bitácora de eventos en tiempo real
              </div>
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-center sm:text-left">
                Verificación previa por cámara
              </div>
            </div>
          </motion.div>

        </div>

      </CinematicScrollSection>

      {/* =========================================================================
          SECCIÓN PROPIETARIOS
          ========================================================================= */}
      <CinematicScrollSection id="afiliacion" className="py-16 sm:py-24 px-4 sm:px-6 lg:px-12 max-w-5xl mx-auto">
        <motion.div 
          initial={{ opacity: 0, y: 25 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-20px' }}
          transition={{ duration: 0.6, ease: FLUID_EASE }}
          className="bg-gradient-to-br from-slate-900 via-slate-900 to-emerald-950 text-white rounded-3xl p-6 sm:p-10 md:p-14 space-y-6 flex flex-col items-center text-center border border-emerald-500/30 shadow-2xl"
        >
          
          <div className="max-w-2xl space-y-3 px-2">
            <span className="text-xs font-mono text-emerald-400 uppercase tracking-wider block font-bold">
              RED DE COCHERAS EN HUAMANGA
            </span>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold tracking-tight text-white">
              Digitalice la operación de su cochera
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed max-w-xl mx-auto font-medium">
              Implementamos el plano 2D interactivo, el lector de placas en garita y conectamos su cochera con miles de conductores en Ayacucho.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3.5 w-full sm:w-auto pt-2">
            <motion.button
              whileHover={{ scale: 1.03, y: -2 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => onOpenAuth && onOpenAuth('affiliation')}
              className="w-full sm:w-auto px-7 py-3.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs sm:text-sm font-extrabold rounded-xl transition-all duration-200 cursor-pointer shadow-lg shadow-emerald-500/25"
            >
              Solicitar Afiliación
            </motion.button>
            <motion.a
              whileHover={{ scale: 1.03, y: -2 }}
              whileTap={{ scale: 0.97 }}
              href="https://wa.me/51966000000?text=Hola,%20deseo%20afiliar%20mi%20cochera%20en%20Ayacucho"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto px-7 py-3.5 bg-slate-900 hover:bg-slate-800 text-white text-xs sm:text-sm font-semibold rounded-xl border border-slate-700 transition-colors duration-200 text-center"
            >
              Contacto Directo por WhatsApp
            </motion.a>
          </div>

        </motion.div>
      </CinematicScrollSection>

      {/* =========================================================================
          PREGUNTAS FRECUENTES (FAQ)
          ========================================================================= */}
      <CinematicScrollSection className="py-16 sm:py-24 px-4 sm:px-6 lg:px-12 max-w-4xl mx-auto space-y-8 sm:space-y-10">
        
        {/* Encabezado Centrado */}
        <div className="max-w-2xl mx-auto text-center space-y-2 px-2">
          <span className="text-xs font-mono text-emerald-400 uppercase tracking-wider block font-bold">
            SOPORTE Y CONSULTAS
          </span>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-white tracking-tight">
            Preguntas Frecuentes
          </h2>
          <p className="text-xs sm:text-sm text-slate-400 font-medium">
            Respuestas a las dudas principales sobre el funcionamiento de Smart Park.
          </p>
        </div>

        <div className="divide-y divide-slate-800 border-y border-slate-800 bg-slate-900/60 backdrop-blur-md rounded-2xl p-4 sm:p-6 shadow-md">
          {faqs.map((faq, idx) => (
            <motion.div 
              key={idx} 
              initial={{ opacity: 0, y: 15 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-15px' }}
              transition={{ duration: 0.4, delay: idx * 0.04, ease: FLUID_EASE }}
              className="py-4 first:pt-0 last:pb-0"
            >
              <button
                onClick={() => setActiveFaq(activeFaq === idx ? null : idx)}
                className="w-full text-left font-bold text-xs sm:text-sm text-slate-200 flex items-center justify-between hover:text-emerald-400 transition-colors duration-200 cursor-pointer gap-2"
              >
                <span>{faq.q}</span>
                <span className="font-mono text-base text-emerald-400 shrink-0">
                  {activeFaq === idx ? '−' : '+'}
                </span>
              </button>
              <AnimatePresence>
                {activeFaq === idx && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.25, ease: FLUID_EASE }}
                    className="overflow-hidden"
                  >
                    <div className="pt-3 text-xs sm:text-sm text-slate-400 leading-relaxed font-normal">
                      {faq.a}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          ))}
        </div>

      </CinematicScrollSection>

      {/* =========================================================================
          FOOTER DOCUMENTAL TRASLÚCIDO
          ========================================================================= */}
      <footer className="bg-slate-950 border-t border-slate-800 py-8 sm:py-12 px-4 sm:px-6 lg:px-12 text-xs text-slate-400">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 sm:gap-6 text-center sm:text-left">
          <div className="flex items-center space-x-3">
            <div className="w-6 h-6 rounded-md bg-slate-900 text-emerald-400 border border-slate-800 flex items-center justify-center font-bold text-[10px] shadow-xs">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3.5 h-3.5">
                <path d="M9 17V7h4a3 3 0 0 1 0 6H9" />
                <circle cx="12" cy="12" r="10" />
              </svg>
            </div>
            <span className="font-extrabold text-white font-mono">SMART-PARK AYACUCHO</span>
            <span>• © 2026</span>
          </div>

          <div className="flex items-center space-x-6">
            <button
              onClick={onOpenTerms}
              className="hover:text-emerald-400 transition-colors duration-200 underline cursor-pointer font-medium"
            >
              Términos de Servicio
            </button>
            <a
              href="https://wa.me/51966000000"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-emerald-400 transition-colors duration-200 font-medium"
            >
              Soporte WhatsApp
            </a>
          </div>
        </div>
      </footer>

    </div>
  );
};
