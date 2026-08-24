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
  Layers,
  Clock,
  Zap,
  Globe,
  Menu,
  X
} from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { AyacuchoMap } from './AyacuchoMap';
import { BrandLogo } from './BrandLogo';

// Curva elástica ultra fluida acelerada por hardware (GPU)
const FLUID_EASE = [0.16, 1, 0.3, 1];

// Componente de Sección con física cinemática — entrada por stagger + parallax sutil
const CinematicScrollSection = ({ children, className = '', id = '' }) => {
  const sectionRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start end', 'end start']
  });

  const opacity = useTransform(scrollYProgress, [0, 0.15, 0.85, 1], [0, 1, 1, 0.85]);
  const scale = useTransform(scrollYProgress, [0, 0.2, 0.8, 1], [0.96, 1, 1, 0.97]);
  const y = useTransform(scrollYProgress, [0, 0.2, 0.8, 1], [24, 0, 0, -20]);

  const smoothScale = useSpring(scale, { stiffness: 220, damping: 30, mass: 0.6 });
  const smoothY = useSpring(y, { stiffness: 220, damping: 30, mass: 0.6 });
  const smoothOpacity = useSpring(opacity, { stiffness: 200, damping: 30 });

  return (
    <motion.section
      ref={sectionRef}
      id={id}
      style={{
        opacity: smoothOpacity,
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

  const rotateX = useSpring(useTransform(mouseY, [-0.5, 0.5], [6, -6]), { stiffness: 280, damping: 26 });
  const rotateY = useSpring(useTransform(mouseX, [-0.5, 0.5], [-6, 6]), { stiffness: 280, damping: 26 });

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

// Carga diferida del mapa Leaflet: solo monta cuando entra al viewport (mejora LCP móvil)
const LazyMapSection = ({ parkings, onSelectParking }) => {
  const containerRef = useRef(null);
  const [shouldLoad, setShouldLoad] = useState(false);

  useEffect(() => {
    if (!containerRef.current || shouldLoad) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShouldLoad(true);
          observer.disconnect();
        }
      },
      { rootMargin: '200px' }
    );
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [shouldLoad]);

  return (
    <div ref={containerRef} className="relative isolate z-0 rounded-3xl overflow-hidden shadow-2xl bg-white transition-shadow duration-300 min-h-[420px]">
      {shouldLoad ? (
        <AyacuchoMap parkings={parkings} onSelectParking={onSelectParking} />
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[#EAF4F2]">
          <div className="w-9 h-9 rounded-full border-[3px] border-[#004D49]/20 border-t-[#004D49] animate-spin" />
          <p className="text-xs font-bold text-[#004D49]/70">Cargando mapa en vivo…</p>
        </div>
      )}
    </div>
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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

  // Parallax del Hero con Física Liviana y Alto Rendimiento
  const { scrollYProgress: heroScrollProgress } = useScroll({
    target: heroRef,
    offset: ['start start', 'end start']
  });

  const heroHeadlineY = useTransform(heroScrollProgress, [0, 1], [0, -40]);
  const heroOpacity = useTransform(heroScrollProgress, [0, 0.85], [1, 0.25]);
  const heroScale = useTransform(heroScrollProgress, [0, 1], [1, 0.97]);

  const smoothHeroHeadlineY = useSpring(heroHeadlineY, { stiffness: 180, damping: 26, mass: 0.7 });
  const smoothHeroScale = useSpring(heroScale, { stiffness: 180, damping: 26, mass: 0.7 });

  // Transformación 3D Suave del Mockup Faux-OS
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
      a: 'Al confirmar tu reserva recibes un Pase Digital. Al llegar a la cochera en Huamanga, el sistema automático reconoce tu placa registrada y abre el portón de inmediato.'
    },
    {
      q: '¿Cuáles son los canales de pago habilitados?',
      a: 'Puedes pagar de forma fácil con Yape, Plin y tarjetas de débito o crédito con total seguridad.'
    },
    {
      q: '¿Existe tolerancia de tiempo ante eventualidades de tráfico?',
      a: 'Todas las cocheras cuentan con 15 minutos de cortesía para asegurar tu llegada sin problemas.'
    },
    {
      q: '¿Cuál es el procedimiento para afiliar mi cochera en Huamanga?',
      a: 'Haz clic en "Afiliar Cochera", completa los datos de tu local y nuestro equipo configurará tu mapa digital en menos de 24 horas.'
    }
  ];

  return (
    <div 
      style={{
        background: 'linear-gradient(180deg, #F4F9F8 0%, #FBFDFC 45%, #EEF6F5 100%)'
      }}
      className="w-full min-h-screen text-[#111111] font-sans antialiased selection:bg-[#00827C] selection:text-white relative overflow-x-hidden"
    >
      {/* Indicador elástico superior de scroll */}
      <motion.div 
        className="fixed top-0 left-0 right-0 h-[3px] bg-[#004D49] z-[100] origin-left"
        style={{ scaleX }}
      />

      {/* =========================================================================
          1. HEADER FLOTANTE ULTRA-PREMIUM (GLASSMORPHISM RESPONSIVE)
          ========================================================================= */}
      <header className="sticky top-0 z-50 px-3 sm:px-6 lg:px-10 pt-2 sm:pt-3 pb-2 transition-all duration-300">
        <div className="max-w-6xl mx-auto bg-[#002624]/90 backdrop-blur-xl border border-[#005e58]/50 px-4 sm:px-6 py-3 rounded-2xl sm:rounded-3xl shadow-[0_12px_40px_rgba(0,38,36,0.35)] flex items-center justify-between text-white relative">
          
          {/* Logo y Denominación */}
          <BrandLogo className="h-8 sm:h-9 w-auto" dark={true} />

          {/* Navegación Tipográfica en Escritorio */}
          <nav className="hidden md:flex items-center space-x-1 lg:space-x-2 text-xs font-semibold">
            <a href="#mapa" className="px-3.5 py-1.5 rounded-xl text-emerald-100/90 hover:text-white hover:bg-white/10 transition-all duration-200">
              Directorio de Cocheras
            </a>
            <a href="#sistema" className="px-3.5 py-1.5 rounded-xl text-emerald-100/90 hover:text-white hover:bg-white/10 transition-all duration-200">
              Funcionamiento
            </a>
            <a href="#afiliacion" className="px-3.5 py-1.5 rounded-xl text-emerald-100/90 hover:text-white hover:bg-white/10 transition-all duration-200">
              Propietarios
            </a>
          </nav>

          {/* Acciones en Escritorio / Hamburguesa en Móvil */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            <button
              onClick={() => onOpenAuth && onOpenAuth('affiliation')}
              className="hidden sm:inline-flex text-xs font-bold text-emerald-200 hover:text-white bg-white/5 hover:bg-white/15 px-3.5 py-2 rounded-xl border border-emerald-500/30 transition-all duration-200 cursor-pointer"
            >
              Afiliar Cochera
            </button>

            <motion.button
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => onOpenAuth && onOpenAuth('login')}
              className="bg-gradient-to-r from-emerald-400 to-teal-400 hover:from-emerald-300 hover:to-teal-300 text-slate-950 text-xs font-black px-4 sm:px-5 py-2.5 rounded-xl transition-all duration-200 cursor-pointer flex items-center space-x-2 shadow-[0_0_20px_rgba(52,211,153,0.35)]"
            >
              <LogIn className="w-4 h-4 shrink-0 text-slate-950 stroke-[2.5]" />
              <span>Acceder</span>
            </motion.button>

            {/* Botón menú móvil */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-emerald-200 hover:text-white hover:bg-white/10 rounded-xl transition cursor-pointer"
              aria-label="Abrir menú de navegación"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>

        </div>

        {/* Desplegable de menú móvil */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.97 }}
              transition={{ duration: 0.2, ease: FLUID_EASE }}
              className="md:hidden mt-2 max-w-6xl mx-auto bg-[#002624]/95 backdrop-blur-xl border border-[#005e58]/50 p-4 rounded-2xl shadow-2xl space-y-2 text-xs font-bold text-emerald-100"
            >
              <a 
                href="#mapa" 
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3.5 py-2.5 rounded-xl hover:bg-white/10 hover:text-white transition"
              >
                Directorio de Cocheras
              </a>
              <a 
                href="#sistema" 
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3.5 py-2.5 rounded-xl hover:bg-white/10 hover:text-white transition"
              >
                Funcionamiento
              </a>
              <a 
                href="#afiliacion" 
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3.5 py-2.5 rounded-xl hover:bg-white/10 hover:text-white transition"
              >
                Propietarios
              </a>
              <div className="pt-2 border-t border-emerald-500/20 flex flex-col gap-2">
                <button
                  onClick={() => { setMobileMenuOpen(false); onOpenAuth && onOpenAuth('affiliation'); }}
                  className="w-full py-2.5 bg-white/10 text-emerald-200 hover:text-white rounded-xl text-center font-bold"
                >
                  Afiliar Cochera
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* =========================================================================
          2. HERO SECTION CON RESPONSIVE DESIGN FLUIDO
          ========================================================================= */}
      <section ref={heroRef} className="pt-16 sm:pt-24 pb-20 sm:pb-28 px-4 sm:px-6 lg:px-12 max-w-5xl mx-auto space-y-10 sm:space-y-12 text-center">
        
        <motion.div 
          style={{ 
            y: smoothHeroHeadlineY, 
            opacity: heroOpacity,
            scale: smoothHeroScale
          }}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: FLUID_EASE }}
          className="space-y-5 sm:space-y-6 flex flex-col items-center transform-gpu will-change-transform"
        >
          
          {/* Titular Principal Centrado con Escala Adaptativa — Editorial Premium */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2, ease: FLUID_EASE }}
            className="text-4xl sm:text-6xl md:text-7xl lg:text-[84px] font-serif text-[#002B29] tracking-[-0.015em] max-w-4xl mx-auto leading-[1.04] sm:leading-[0.98] font-normal"
          >
            Ecosistema Inteligente de Estacionamientos en <span className="italic text-[#004D49] tracking-normal font-normal">Ayacucho.</span>
          </motion.h1>

          {/* Subtítulo Centrado */}
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.35, ease: FLUID_EASE }}
            className="text-sm sm:text-[15px] md:text-lg text-[#003835]/80 max-w-2xl mx-auto font-medium leading-relaxed text-center px-2 tracking-[-0.01em]"
          >
            Conectamos a conductores en Ayacucho con estacionamientos disponibles en tiempo real, facilitando la reserva de tu sitio e ingreso directo.
          </motion.p>

          {/* LAS 2 OPCIONES PRINCIPALES DEL SISTEMA */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5, ease: FLUID_EASE }}
            className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-3xl mx-auto pt-4 text-left"
          >
            
            {/* OPCIÓN 1: CONDUCTORES / USUARIOS */}
            <motion.div
              whileHover={{ y: -4, scale: 1.01 }}
              transition={{ duration: 0.2 }}
              className="bg-white/90 backdrop-blur-md p-6 rounded-3xl border border-emerald-500/30 shadow-xl shadow-emerald-950/5 space-y-4 flex flex-col justify-between group hover:border-emerald-600/60 transition"
            >
              <div className="space-y-3">
                <div className="w-11 h-11 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 flex items-center justify-center font-bold shadow-xs">
                  <Car className="w-6 h-6 text-emerald-700" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-slate-900 tracking-tight group-hover:text-emerald-800 transition">
                    Buscar & Reservar Plazas
                  </h3>
                  <p className="text-xs text-slate-600 leading-relaxed mt-1">
                    Encuentra cocheras en Huamanga, elige tu sitio preferido en el mapa y accede directo reconociendo tu placa sin tickets.
                  </p>
                </div>
              </div>

              <motion.a
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                href="#mapa"
                className="w-full py-3 bg-[#004D49] hover:bg-[#003835] text-white text-xs font-bold rounded-xl transition flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-[#004D49]/20"
              >
                <span>Consultar Cocheras en Vivo</span>
                <ArrowRight className="w-4 h-4 text-emerald-400" />
              </motion.a>
            </motion.div>

            {/* OPCIÓN 2: PROPIETARIOS DE COCHERAS */}
            <motion.div
              whileHover={{ y: -4, scale: 1.01 }}
              transition={{ duration: 0.2 }}
              className="bg-slate-900 text-white p-6 rounded-3xl border border-slate-800 shadow-xl shadow-slate-950/20 space-y-4 flex flex-col justify-between group hover:border-emerald-500/50 transition"
            >
              <div className="space-y-3">
                <div className="w-11 h-11 rounded-2xl bg-emerald-400/20 border border-emerald-400/30 text-emerald-400 flex items-center justify-center font-bold shadow-xs">
                  <Building2 className="w-6 h-6 text-emerald-400" />
                </div>
                <div>
                  <h3 className="text-lg font-black text-white tracking-tight group-hover:text-emerald-300 transition">
                    Afiliar mi Estacionamiento
                  </h3>
                  <p className="text-xs text-slate-300 leading-relaxed mt-1">
                    Registra tu cochera, organiza tus espacios en el mapa digital, recibe reservas online y automatiza el cobro sin costo inicial.
                  </p>
                </div>
              </div>

              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => onOpenAuth && onOpenAuth('affiliation')}
                className="w-full py-3 bg-gradient-to-r from-emerald-400 to-teal-400 text-slate-950 text-xs font-black rounded-xl transition flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-emerald-400/20"
              >
                <Building2 className="w-4 h-4 text-slate-950" />
                <span>Solicitar Afiliación de Cochera</span>
              </motion.button>
            </motion.div>

          </motion.div>
        </motion.div>

      </section>

      {/* =========================================================================
          2.5 BANDA DE MÉTRICAS EN VIVO (PRUEBA SOCIAL)
          ========================================================================= */}
      <CinematicScrollSection className="py-8 sm:py-10 px-4 sm:px-6 lg:px-12">
        <div className="max-w-5xl mx-auto bg-white/80 backdrop-blur-md border border-[#004D49]/10 rounded-3xl shadow-sm grid grid-cols-2 md:grid-cols-4 divide-x divide-y md:divide-y-0 divide-[#004D49]/10 overflow-hidden">
          {[
            { value: `${Math.max(establishments.length, 0)}`, suffix: '', label: 'Cocheras conectadas en vivo' },
            { value: `${totalFreeSlots}`, suffix: '', label: 'Plazas libres ahora mismo' },
            { value: '98', suffix: '%', label: 'Ingresos con pase automático' },
            { value: '15', suffix: ' min', label: 'Tolerancia garantizada' }
          ].map((m, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 14 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.45, delay: i * 0.07, ease: FLUID_EASE }}
              className="p-5 sm:p-6 text-center"
            >
              <div className="text-2xl sm:text-4xl font-display font-bold text-[#002B29] tracking-tight">
                {m.value}<span className="text-[#004D49]">{m.suffix}</span>
              </div>
              <div className="mt-1 text-[10px] sm:text-xs text-[#004D49]/70 font-semibold uppercase tracking-wide">
                {m.label}
              </div>
            </motion.div>
          ))}
        </div>
      </CinematicScrollSection>

      {/* =========================================================================
          3. DIRECTORIO Y MAPA EN VIVO
          ========================================================================= */}
      <CinematicScrollSection id="mapa" className="py-16 sm:py-24 px-4 sm:px-6 lg:px-12 max-w-6xl mx-auto space-y-6 sm:space-y-8">
        
        {/* Encabezado Centrado */}
        <div className="max-w-3xl mx-auto text-center space-y-2 px-2">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-serif text-[#002B29] tracking-tight font-normal leading-[1.1]">
            Estacionamientos Conectados en <span className="italic text-[#004D49]">Huamanga</span>
          </h2>
          <p className="text-xs sm:text-sm text-[#004D49] max-w-md mx-auto font-medium">
            Consulta disponibilidad en vivo, precios por hora y navega directamente a la cochera.
          </p>
        </div>

        {/* Buscador + Filtros + Contador en Vivo */}
        <div className="max-w-3xl mx-auto space-y-3 px-2">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#004D49]/60 pointer-events-none" />
            <Input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por nombre, dirección o referencia…"
              className="w-full h-12 pl-11 pr-10 rounded-2xl bg-white border border-[#004D49]/15 text-sm font-medium text-[#002B29] placeholder:text-[#004D49]/40 shadow-sm focus-visible:ring-2 focus-visible:ring-emerald-500/40 focus-visible:border-emerald-500/50 transition"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                aria-label="Limpiar búsqueda"
                className="absolute right-3 top-1/2 -translate-y-1/2 w-7 h-7 rounded-lg flex items-center justify-center text-[#004D49]/50 hover:text-[#002B29] hover:bg-[#004D49]/5 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2">
            {[
              { id: 'todos', label: 'Todas' },
              { id: 'centro', label: 'Centro Histórico' },
              { id: 'techados', label: 'Techados' },
              { id: 'economicos', label: 'Económicas' }
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() => setCategoryFilter(cat.id)}
                className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all duration-200 cursor-pointer ${
                  categoryFilter === cat.id
                    ? 'bg-[#004D49] text-white border-[#004D49] shadow-md shadow-[#004D49]/20'
                    : 'bg-white/80 text-[#004D49] border-[#004D49]/15 hover:border-emerald-500/50 hover:bg-white'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          <div className="flex items-center justify-center gap-2 pt-1">
            <span className="relative flex w-2.5 h-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
              <span className="relative inline-flex rounded-full w-2.5 h-2.5 bg-emerald-500" />
            </span>
            <p className="text-xs font-semibold text-[#004D49]">
              {filteredParkings.length} {filteredParkings.length === 1 ? 'cochera coincide' : 'cocheras coinciden'} ·{' '}
              <strong className="font-black text-[#002B29]">{totalFreeSlots} plazas libres</strong> en la red
            </p>
          </div>
        </div>

        {/* Mapa Leaflet Interactivo (lazy-load al entrar en viewport) */}
        <LazyMapSection
          parkings={filteredParkings}
          onSelectParking={(p) => {
            if (onSelectParking) onSelectParking(p);
          }}
        />

      </CinematicScrollSection>

      {/* =========================================================================
          4. CÓMO FUNCIONA — EXPERIENCIA ÁGIL DESPUÉS DEL MAPA
          ========================================================================= */}
      <CinematicScrollSection id="sistema" className="py-16 sm:py-24 px-4 sm:px-6 lg:px-12 max-w-6xl mx-auto space-y-8 sm:space-y-10">
        
        {/* Encabezado Centrado */}
        <div className="max-w-2xl mx-auto text-center space-y-2 px-2">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-serif text-[#002B29] tracking-tight font-normal leading-[1.1]">
            Estaciona rápido y <span className="italic text-[#004D49]">sin complicaciones</span>
          </h2>
          <p className="text-xs sm:text-sm text-[#004D49] max-w-lg mx-auto font-medium">
            Sin descargar aplicaciones pesadas. Todo funciona directo y seguro desde tu celular.
          </p>
        </div>

        {/* Contenedor Faux-OS Window Chrome de Alta Definición */}
        <div ref={mockupSectionRef} style={{ perspective: 1200 }}>
          <motion.div 
            style={{ 
              rotateX: smoothMockupRotateX,
              scale: smoothMockupScale,
              opacity: mockupOpacity,
              transformStyle: 'preserve-3d'
            }}
            className="rounded-3xl border border-white/80 bg-white/95 backdrop-blur-xl shadow-[0_24px_60px_-15px_rgba(0,77,73,0.22)] overflow-hidden transition-all duration-300 transform-gpu will-change-transform"
          >
            
            {/* Barra Superior estilo Navegador Móvil Premium */}
            <div className="px-4 sm:px-6 py-3 bg-[#F0F7F6] border-b border-[#D4E8E7] flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <span className="w-4 h-4 shrink-0 rounded-full bg-[#004D49]/30" />
                <span className="w-4 h-4 shrink-0 rounded-full bg-[#004D49]/20" />
                <span className="w-4 h-4 shrink-0 rounded-full bg-[#004D49]/10" />
              </div>
              <span className="font-mono text-xs text-[#004D49] font-bold">
                smart-park.pe/pase/SPK-8912
              </span>
              <div className="w-12 sm:w-16" />
            </div>

            {/* Cuerpo de la Experiencia */}
            <div className="p-6 sm:p-10 lg:p-12 grid grid-cols-1 md:grid-cols-3 gap-8 items-center bg-white/95">
              
              {/* Pasos a la Izquierda */}
              <div className="space-y-5 md:col-span-1 md:border-r border-slate-200/80 md:pr-8">
                
                {/* Paso 1 */}
                <div className="p-4 rounded-2xl bg-emerald-50/40 border border-emerald-100 hover:border-emerald-300 transition space-y-1.5 group">
                  <div className="flex items-center space-x-2">
                    <span className="w-6 h-6 rounded-lg bg-[#004D49] text-white font-mono text-xs font-black flex items-center justify-center shadow-xs">
                      1
                    </span>
                    <h3 className="text-sm font-extrabold text-[#002B29] group-hover:text-[#004D49] transition">
                      Elige tu sitio preferido
                    </h3>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed pl-8">
                    Visualiza en pantalla el espacio asignado: techado, estándar o de fácil acceso.
                  </p>
                </div>

                {/* Paso 2 */}
                <div className="p-4 rounded-2xl bg-emerald-50/40 border border-emerald-100 hover:border-emerald-300 transition space-y-1.5 group">
                  <div className="flex items-center space-x-2">
                    <span className="w-6 h-6 rounded-lg bg-[#004D49] text-white font-mono text-xs font-black flex items-center justify-center shadow-xs">
                      2
                    </span>
                    <h3 className="text-sm font-extrabold text-[#002B29] group-hover:text-[#004D49] transition">
                      Navegación directa
                    </h3>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed pl-8">
                    Abre la ruta en tu celular con Google Maps o Waze y llega directo al portón.
                  </p>
                </div>

                {/* Paso 3 */}
                <div className="p-4 rounded-2xl bg-emerald-50/40 border border-emerald-100 hover:border-emerald-300 transition space-y-1.5 group">
                  <div className="flex items-center space-x-2">
                    <span className="w-6 h-6 rounded-lg bg-[#004D49] text-white font-mono text-xs font-black flex items-center justify-center shadow-xs">
                      3
                    </span>
                    <h3 className="text-sm font-extrabold text-[#002B29] group-hover:text-[#004D49] transition">
                      Ingreso directo sin ticket
                    </h3>
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed pl-8">
                    El sistema reconoce la placa de tu auto al llegar y levanta el portón automáticamente.
                  </p>
                </div>

              </div>

              {/* Ficha Interactiva de Pase Digital en Vivo a la Derecha */}
              <div className="md:col-span-2 bg-slate-900 text-white p-6 sm:p-8 rounded-3xl border border-slate-800 shadow-2xl space-y-5">
                
                <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                  <div className="space-y-1">
                    <h4 className="font-extrabold text-sm sm:text-base text-white">Smart Park Plaza Mayor</h4>
                    <p className="text-xs text-emerald-400 font-mono">Jr. 28 de Julio 142 &bull; Huamanga, Ayacucho</p>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 font-sans">
                  <div className="p-3.5 bg-slate-800/80 rounded-2xl border border-slate-700/80">
                    <span className="text-[10px] text-slate-400 block font-mono font-bold uppercase">Espacio</span>
                    <strong className="text-sm sm:text-base text-white block mt-0.5 font-mono font-black">A-01</strong>
                  </div>
                  <div className="p-3.5 bg-slate-800/80 rounded-2xl border border-slate-700/80">
                    <span className="text-[10px] text-slate-400 block font-mono font-bold uppercase">Tu Placa</span>
                    <strong className="text-sm sm:text-base text-emerald-400 block mt-0.5 font-mono font-black">ABC-123</strong>
                  </div>
                  <div className="p-3.5 bg-slate-800/80 rounded-2xl border border-slate-700/80">
                    <span className="text-[10px] text-slate-400 block font-mono font-bold uppercase">Tolerancia</span>
                    <strong className="text-sm sm:text-base text-emerald-300 block mt-0.5 font-mono font-black">15 min</strong>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-400 pt-3 border-t border-slate-800/80 font-mono">
                  <span>Acceso Automático Registrado</span>
                  <span className="text-emerald-400 font-bold">Ingreso Sin Esperas</span>
                </div>

              </div>

            </div>

          </motion.div>
        </div>

      </CinematicScrollSection>

      {/* =========================================================================
          6. SECCIÓN PROPIETARIOS
          ========================================================================= */}
      <CinematicScrollSection id="afiliacion" className="py-16 sm:py-24 px-4 sm:px-6 lg:px-12 max-w-5xl mx-auto">
        <motion.div 
          initial={{ opacity: 0, y: 25 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-20px' }}
          transition={{ duration: 0.6, ease: FLUID_EASE }}
          className="bg-[#002B29] text-white rounded-xl p-6 sm:p-10 md:p-14 space-y-6 flex flex-col items-center text-center border border-[#004D49] shadow-[0_24px_60px_-10px_rgba(0,43,41,0.5)]"
        >
          
          <div className="max-w-2xl space-y-3 px-2">
            <h2 className="text-3xl sm:text-4xl md:text-5xl font-serif tracking-tight text-white font-normal leading-[1.1]">
              Digitalice la operación de <span className="italic text-[#A7F3D0]">su cochera</span>
            </h2>
            <p className="text-xs sm:text-sm text-[#D1FAE5] leading-relaxed max-w-xl mx-auto">
              Creamos un mapa digital interactivo de tu local, automatizamos la entrada de vehículos y conectamos tu estacionamiento con conductores de la ciudad.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 w-full sm:w-auto pt-2">
            <motion.button
              whileHover={{ scale: 1.03, y: -2 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => onOpenAuth && onOpenAuth('affiliation')}
              className="w-full sm:w-auto px-6 py-3 bg-white hover:bg-[#EAEAEA] text-[#002B29] text-xs font-bold rounded transition-all duration-200 cursor-pointer shadow-[0_4px_12px_rgba(255,255,255,0.2)]"
            >
              Solicitar Afiliación
            </motion.button>
            <motion.a
              whileHover={{ scale: 1.03, y: -2 }}
              whileTap={{ scale: 0.97 }}
              href="https://wa.me/51966000000?text=Hola,%20deseo%20afiliar%20mi%20cochera%20en%20Ayacucho"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto px-6 py-3 bg-[#004D49] hover:bg-[#003835] text-white text-xs font-medium rounded border border-[#00605B] transition-colors duration-200 text-center"
            >
              Contacto Directo
            </motion.a>
          </div>

        </motion.div>
      </CinematicScrollSection>

      {/* =========================================================================
          7. PREGUNTAS FRECUENTES (FAQ)
          ========================================================================= */}
      <CinematicScrollSection className="py-16 sm:py-24 px-4 sm:px-6 lg:px-12 max-w-4xl mx-auto space-y-8 sm:space-y-10">
        
        {/* Encabezado Centrado */}
        <div className="max-w-2xl mx-auto text-center space-y-2 px-2">
          <h2 className="text-3xl sm:text-4xl md:text-5xl font-serif text-[#002B29] tracking-tight font-normal leading-[1.1]">
            Preguntas <span className="italic text-[#004D49]">Frecuentes</span>
          </h2>
          <p className="text-xs sm:text-sm text-[#004D49] font-medium">
            Respuestas a las dudas principales sobre el funcionamiento del sistema.
          </p>
        </div>

        <div className="divide-y divide-[#004D49]/20 border-y border-[#004D49]/20 bg-white/70 backdrop-blur-md rounded-xl p-4 sm:p-6 shadow-sm">
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
                className="w-full text-left font-semibold text-xs sm:text-sm text-[#002B29] flex items-center justify-between hover:text-[#004D49] transition-colors duration-200 cursor-pointer gap-2"
              >
                <span>{faq.q}</span>
                <span className="font-mono text-base text-[#004D49] shrink-0">
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
                    <div className="pt-3 text-xs sm:text-sm text-[#003835] leading-relaxed font-normal">
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
          8. FOOTER DOCUMENTAL TRASLÚCIDO (RESPONSIVE)
          ========================================================================= */}
      <footer className="bg-white/85 backdrop-blur-md border-t border-white/50 py-8 sm:py-12 px-4 sm:px-6 lg:px-12 text-xs text-[#004D49] shadow-[0_-2px_10px_-2px_rgba(0,0,0,0.02)]">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 sm:gap-6 text-center sm:text-left">
          <div className="flex items-center space-x-3">
            <BrandLogo className="h-6 w-auto" subtitle="" showSubtitle={false} />
            <span className="text-[11px] font-mono text-[#004D49]">• © 2026</span>
          </div>

          <div className="flex items-center space-x-6">
            <button
              onClick={onOpenTerms}
              className="hover:text-[#002B29] transition-colors duration-200 underline cursor-pointer font-medium"
            >
              Términos de Servicio
            </button>
            <a
              href="https://wa.me/51966000000"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[#002B29] transition-colors duration-200 font-medium"
            >
              Soporte WhatsApp
            </a>
          </div>
        </div>
      </footer>

    </div>
  );
};
