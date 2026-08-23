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
  Sparkles
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

  // Interpolación suave y optimizada (sin saltos de layout en mobile)
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
    <div 
      style={{
        background: 'linear-gradient(90deg, rgb(0, 130, 124) 0%, rgb(203, 255, 252) 100%)'
      }}
      className="w-full min-h-screen text-[#111111] font-sans antialiased selection:bg-[#00827C] selection:text-white relative overflow-x-hidden"
    >
      {/* Indicador elástico superior de scroll */}
      <motion.div 
        className="fixed top-0 left-0 right-0 h-[3px] bg-[#004D49] z-[100] origin-left"
        style={{ scaleX }}
      />

      {/* =========================================================================
          1. HEADER EDITORIAL MINIMALISTA (RESPONSIVE)
          ========================================================================= */}
      <header className="sticky top-0 z-50 bg-white/85 backdrop-blur-md border-b border-white/40 px-4 sm:px-6 lg:px-12 py-3.5 sm:py-4 shadow-[0_2px_12px_-2px_rgba(0,0,0,0.06)] transition-colors duration-300">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          
          {/* Logo y Denominación */}
          <div className="flex items-center space-x-2.5 sm:space-x-3">
            <div className="w-7 h-7 rounded-md bg-[#004D49] text-white flex items-center justify-center font-bold text-xs shadow-xs transition-transform duration-200 hover:scale-105">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3.5 h-3.5">
                <path d="M9 17V7h4a3 3 0 0 1 0 6H9" />
                <circle cx="12" cy="12" r="10" />
              </svg>
            </div>
            <div className="leading-none">
              <span className="text-sm font-black tracking-tight text-[#003835] font-mono">
                SMART-PARK
              </span>
              <span className="text-[10px] text-[#00605B] font-mono block mt-0.5 font-medium">
                Ayacucho • Huamanga
              </span>
            </div>
          </div>

          {/* Navegación Tipográfica (Oculta en móviles para evitar saturación) */}
          <nav className="hidden md:flex items-center space-x-8 text-xs font-semibold text-[#004D49]">
            <a href="#mapa" className="hover:text-[#002B29] transition-colors duration-200">Directorio de Cocheras</a>
            <a href="#sistema" className="hover:text-[#002B29] transition-colors duration-200">Funcionamiento</a>
            <a href="#infraestructura" className="hover:text-[#002B29] transition-colors duration-200">Infraestructura</a>
            <a href="#afiliacion" className="hover:text-[#002B29] transition-colors duration-200">Propietarios</a>
          </nav>

          {/* Acciones */}
          <div className="flex items-center space-x-2 sm:space-x-3">
            <button
              onClick={() => onOpenAuth && onOpenAuth('affiliation')}
              className="hidden sm:inline-flex text-xs font-semibold text-[#004D49] hover:text-[#002B29] px-3 py-1.5 transition-colors duration-200 cursor-pointer"
            >
              Afiliar Cochera
            </button>

            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => onOpenAuth && onOpenAuth('login')}
              className="bg-[#004D49] hover:bg-[#003835] text-white text-xs font-medium px-3.5 sm:px-4 py-2 rounded-md transition-all duration-200 cursor-pointer flex items-center space-x-1.5 sm:space-x-2 shadow-[0_4px_12px_rgba(0,77,73,0.25)]"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Acceder</span>
            </motion.button>
          </div>

        </div>
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
          
          {/* Titular Principal Centrado con Escala Adaptativa */}
          <h1 className="text-3xl sm:text-5xl md:text-6xl lg:text-[72px] font-display text-[#002B29] tracking-[-0.03em] max-w-4xl mx-auto leading-[1.08] sm:leading-[1.02]">
            La infraestructura de estacionamiento para <span className="font-editorial italic font-normal text-[#004D49] tracking-[-0.02em]">Ayacucho</span>.
          </h1>

          {/* Subtítulo Centrado */}
          <p className="text-sm sm:text-[15px] md:text-lg text-[#003835]/80 max-w-2xl mx-auto font-medium leading-relaxed text-center px-2 tracking-[-0.01em]">
            Consulte la disponibilidad en tiempo real, seleccione su plaza en el plano topográfico 2D del estacionamiento y acceda mediante reconocimiento de placa ANPR.
          </p>

          {/* Botones Centrados */}
          <div className="pt-3 flex flex-col sm:flex-row items-center justify-center gap-3 w-full max-w-md sm:max-w-none">
            <motion.a
              whileHover={{ scale: 1.02, y: -1 }}
              whileTap={{ scale: 0.98 }}
              href="#mapa"
              className="w-full sm:w-auto px-7 py-3.5 bg-[#004D49] hover:bg-[#003835] text-white text-xs font-bold tracking-wide rounded-xl transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-[#004D49]/20 hover:shadow-xl hover:shadow-[#004D49]/30"
            >
              <span>Consultar Mapa en Vivo</span>
              <ArrowRight className="w-4 h-4 shrink-0" />
            </motion.a>

            <motion.button
              whileHover={{ scale: 1.02, y: -1 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onOpenAuth && onOpenAuth('affiliation')}
              className="w-full sm:w-auto px-6 py-3.5 bg-white hover:bg-white text-[#004D49] text-xs font-bold tracking-wide rounded-xl border border-[#004D49]/10 shadow-sm hover:shadow-md hover:border-[#004D49]/20 transition-all duration-200 cursor-pointer"
            >
              Afiliar Establecimiento
            </motion.button>
          </div>

        </motion.div>

        {/* Métricas de Precisión */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2, ease: FLUID_EASE }}
          className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4 pt-8 sm:pt-10 border-t border-[#004D49]/10 text-center"
        >
          <div className="bg-white/60 backdrop-blur-sm p-4 sm:p-5 rounded-2xl border border-white/60 shadow-sm hover:shadow-md hover:bg-white/80 transition-all duration-300 group">
            <span className="font-mono text-2xl sm:text-3xl font-black text-[#002B29] block tracking-tight group-hover:scale-105 transition-transform">
              {establishments.length}
            </span>
            <span className="text-[11px] sm:text-xs text-[#004D49]/70 font-bold tracking-wide uppercase block mt-1">Cocheras conectadas</span>
          </div>

          <div className="bg-white/60 backdrop-blur-sm p-4 sm:p-5 rounded-2xl border border-white/60 shadow-sm hover:shadow-md hover:bg-white/80 transition-all duration-300 group">
            <span className="font-mono text-2xl sm:text-3xl font-black text-emerald-700 block tracking-tight group-hover:scale-105 transition-transform">
              {totalFreeSlots}
            </span>
            <span className="text-[11px] sm:text-xs text-[#004D49]/70 font-bold tracking-wide uppercase block mt-1">Plazas libres ahora</span>
          </div>

          <div className="bg-white/60 backdrop-blur-sm p-4 sm:p-5 rounded-2xl border border-white/60 shadow-sm hover:shadow-md hover:bg-white/80 transition-all duration-300 group">
            <span className="font-mono text-2xl sm:text-3xl font-black text-[#002B29] block tracking-tight group-hover:scale-105 transition-transform">
              &lt; 0.2s
            </span>
            <span className="text-[11px] sm:text-xs text-[#004D49]/70 font-bold tracking-wide uppercase block mt-1">Lectura de placa ANPR</span>
          </div>

          <div className="bg-white/60 backdrop-blur-sm p-4 sm:p-5 rounded-2xl border border-white/60 shadow-sm hover:shadow-md hover:bg-white/80 transition-all duration-300 group">
            <span className="font-mono text-2xl sm:text-3xl font-black text-[#002B29] block tracking-tight group-hover:scale-105 transition-transform">
              S/ 4.00
            </span>
            <span className="text-[11px] sm:text-xs text-[#004D49]/70 font-bold tracking-wide uppercase block mt-1">Tarifa base promedio</span>
          </div>
        </motion.div>

      </section>

      {/* =========================================================================
          3. MOCKUP DE VENTANA FAUX-OS
          ========================================================================= */}
      <CinematicScrollSection id="sistema" className="py-16 sm:py-24 px-4 sm:px-6 lg:px-12 max-w-6xl mx-auto space-y-8 sm:space-y-10">
        
        {/* Encabezado Centrado */}
        <div className="max-w-2xl mx-auto text-center space-y-2 px-2">
          <span className="text-xs font-mono text-[#004D49] uppercase tracking-wider block font-bold">
            ARQUITECTURA DE ACCESO
          </span>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-display text-[#002B29] tracking-tight">
            Interacción directa sin aplicaciones intermedias
          </h2>
          <p className="text-xs sm:text-sm text-[#004D49] max-w-lg mx-auto font-medium">
            La plataforma opera mediante interfaz web ligera optimizada para cualquier navegador móvil.
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
            className="rounded-xl border border-white/60 bg-white/95 backdrop-blur-md shadow-[0_20px_50px_-10px_rgba(0,77,73,0.18)] overflow-hidden transition-shadow duration-300 transform-gpu will-change-transform"
          >
            
            {/* Barra superior de ventana */}
            <div className="px-3.5 sm:px-4 py-2.5 sm:py-3 bg-[#F4F9F8] border-b border-[#E0EFEF] flex items-center justify-between">
              <div className="flex items-center space-x-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#D4E8E7]" />
                <span className="w-2.5 h-2.5 rounded-full bg-[#D4E8E7]" />
                <span className="w-2.5 h-2.5 rounded-full bg-[#D4E8E7]" />
              </div>
              <span className="font-mono text-[10px] sm:text-[11px] text-[#00605B] font-medium truncate max-w-[200px] sm:max-w-none">
                smart-park.pe/pase/SPK-8912
              </span>
              <div className="w-6 sm:w-10" />
            </div>

            {/* Cuerpo del Mockup */}
            <div className="p-5 sm:p-8 lg:p-10 grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8 items-center bg-white/95">
              
              <div className="space-y-4 sm:space-y-6 md:col-span-1 md:border-r border-[#E5E5E5] md:pr-6">
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-[#002B29]">1. Selección en Plano 2D</h3>
                  <p className="text-xs text-[#555555] leading-relaxed">
                    Identificación exacta del espacio asignado: techado, estándar o con acceso preferencial.
                  </p>
                </div>

                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-[#002B29]">2. Ruteo Satelital GPS</h3>
                  <p className="text-xs text-[#555555] leading-relaxed">
                    Trazado de navegación directa hacia la garita mediante Google Maps o Waze.
                  </p>
                </div>

                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-[#002B29]">3. Control de Garita</h3>
                  <p className="text-xs text-[#555555] leading-relaxed">
                    Apertura automática de la barrera vehicular tras el reconocimiento de caracteres de placa.
                  </p>
                </div>
              </div>

              {/* Ficha de Pase Digital */}
              <div className="md:col-span-2 bg-[#F8FCFC] p-4 sm:p-6 rounded-lg border border-[#D9EFEF] shadow-xs space-y-4">
                
                <div className="flex items-center justify-between border-b border-[#E0EFEF] pb-3">
                  <div>
                    <h4 className="font-bold text-xs sm:text-sm text-[#002B29]">Smart Park Plaza Mayor</h4>
                    <p className="text-[11px] sm:text-xs text-[#00605B] font-mono">Jr. 28 de Julio 142 • Huamanga</p>
                  </div>
                  <span className="font-mono text-xs font-bold text-[#00827C]">
                    AUTORIZADO
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 sm:gap-3 font-mono text-xs">
                  <div className="p-2.5 sm:p-3 bg-white rounded border border-[#E0EFEF] shadow-2xs">
                    <span className="text-[9px] sm:text-[10px] text-[#787774] block uppercase">Plaza</span>
                    <strong className="text-xs sm:text-sm text-[#002B29] block mt-0.5">A-01</strong>
                  </div>
                  <div className="p-2.5 sm:p-3 bg-white rounded border border-[#E0EFEF] shadow-2xs">
                    <span className="text-[9px] sm:text-[10px] text-[#787774] block uppercase">Vehículo</span>
                    <strong className="text-xs sm:text-sm text-[#002B29] block mt-0.5">ABC-123</strong>
                  </div>
                  <div className="p-2.5 sm:p-3 bg-white rounded border border-[#E0EFEF] shadow-2xs">
                    <span className="text-[9px] sm:text-[10px] text-[#787774] block uppercase">Tolerancia</span>
                    <strong className="text-xs sm:text-sm text-[#00827C] block mt-0.5">15 min</strong>
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center justify-between text-[11px] sm:text-xs text-[#00605B] pt-2 border-t border-[#E0EFEF] font-mono gap-1">
                  <span>Token: SPK-8912-7B2F9A</span>
                  <span>Visión Computacional 60 FPS</span>
                </div>

              </div>

            </div>

          </motion.div>
        </div>

      </CinematicScrollSection>

      {/* =========================================================================
          4. DIRECTORIO Y MAPA (RESPONSIVE)
          ========================================================================= */}
      <CinematicScrollSection id="mapa" className="py-16 sm:py-24 px-4 sm:px-6 lg:px-12 max-w-6xl mx-auto space-y-6 sm:space-y-8">
        
        {/* Encabezado y Filtros Centrados */}
        <div className="max-w-3xl mx-auto text-center space-y-4">
          <div className="space-y-2 px-2">
            <span className="text-xs font-mono text-[#004D49] uppercase tracking-wider block font-bold">
              COBERTURA URBANA
            </span>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-display text-[#002B29] tracking-tight">
              Estacionamientos en Huamanga
            </h2>
            <p className="text-xs sm:text-sm text-[#004D49] max-w-md mx-auto font-medium">
              Tarifas por hora, capacidad de plazas y ruteo directo en tiempo real.
            </p>
          </div>

          {/* Filtros Centrados */}
          <div className="flex items-center justify-center space-x-1.5 sm:space-x-2 overflow-x-auto pb-1 text-xs flex-wrap gap-y-2 px-2">
            <button
              onClick={() => setCategoryFilter('todos')}
              className={`px-3 sm:px-3.5 py-1.5 rounded-md font-medium transition-all duration-200 cursor-pointer border shadow-2xs text-xs ${
                categoryFilter === 'todos'
                  ? 'bg-[#004D49] text-white border-[#004D49]'
                  : 'bg-white/80 text-[#004D49] hover:text-[#002B29] border-white/60 backdrop-blur-xs'
              }`}
            >
              Todos ({establishments.length})
            </button>
            <button
              onClick={() => setCategoryFilter('centro')}
              className={`px-3 sm:px-3.5 py-1.5 rounded-md font-medium transition-all duration-200 cursor-pointer border shadow-2xs text-xs ${
                categoryFilter === 'centro'
                  ? 'bg-[#004D49] text-white border-[#004D49]'
                  : 'bg-white/80 text-[#004D49] hover:text-[#002B29] border-white/60 backdrop-blur-xs'
              }`}
            >
              Centro Histórico
            </button>
            <button
              onClick={() => setCategoryFilter('techados')}
              className={`px-3 sm:px-3.5 py-1.5 rounded-md font-medium transition-all duration-200 cursor-pointer border shadow-2xs text-xs ${
                categoryFilter === 'techados'
                  ? 'bg-[#004D49] text-white border-[#004D49]'
                  : 'bg-white/80 text-[#004D49] hover:text-[#002B29] border-white/60 backdrop-blur-xs'
              }`}
            >
              Techados
            </button>
            <button
              onClick={() => setCategoryFilter('economicos')}
              className={`px-3 sm:px-3.5 py-1.5 rounded-md font-medium transition-all duration-200 cursor-pointer border shadow-2xs text-xs ${
                categoryFilter === 'economicos'
                  ? 'bg-[#004D49] text-white border-[#004D49]'
                  : 'bg-white/80 text-[#004D49] hover:text-[#002B29] border-white/60 backdrop-blur-xs'
              }`}
            >
              Económicos (≤ S/ 4.50)
            </button>
          </div>
        </div>

        {/* Mapa Leaflet con Aislamiento Estricto y Sombra */}
        <div className="relative isolate z-0 rounded-xl border border-white/70 overflow-hidden shadow-[0_12px_36px_-6px_rgba(0,77,73,0.22)] bg-white transition-shadow duration-300">
          <AyacuchoMap
            parkings={filteredParkings}
            onSelectParking={(p) => {
              if (onSelectParking) onSelectParking(p);
            }}
          />
        </div>

        {/* Grilla de Cocheras */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 pt-2 sm:pt-4">
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
                <DynamicTiltCard className="h-full bg-white/95 backdrop-blur-sm rounded-xl border border-white/60 p-4 sm:p-5 flex flex-col justify-between shadow-[0_8px_24px_-4px_rgba(0,77,73,0.12)] hover:shadow-[0_16px_36px_-4px_rgba(0,77,73,0.2)] transition-all duration-300">
                  <div className="space-y-3">
                    <div className="h-32 sm:h-36 rounded-lg overflow-hidden relative bg-[#F7F6F3]">
                      <img 
                        src={p.image || 'https://images.unsplash.com/photo-1506521781263-d8422e82f27a?w=800'} 
                        alt={p.name} 
                        className="w-full h-full object-cover transition-transform duration-500 hover:scale-108" 
                      />
                      <div className="absolute top-2.5 right-2.5 bg-white/95 px-2.5 py-1 rounded text-xs font-mono font-bold text-[#003835] border border-white/60 shadow-xs">
                        S/ {Number(p.rate).toFixed(2)}/h
                      </div>
                    </div>

                    <div className="space-y-1">
                      <h3 className="font-bold text-sm text-[#002B29]">{p.name}</h3>
                      <p className="text-xs text-[#555555] flex items-center gap-1 truncate">
                        <MapPin className="w-3.5 h-3.5 text-[#00827C] shrink-0" />
                        <span>{p.address} {p.reference ? `(${p.reference})` : ''}</span>
                      </p>
                    </div>

                    <div className="flex items-center justify-between text-xs font-mono text-[#555555] pt-2 border-t border-[#EAEAEA]">
                      <span>Disponibilidad:</span>
                      <strong className="text-[#00827C] font-bold">{freeSlots} libres de {totalCount}</strong>
                    </div>
                  </div>

                  <div className="pt-4 space-y-2">
                    <div className="flex items-center gap-2">
                      <a
                        href={`https://www.google.com/maps/dir/?api=1&destination=${p.latitude || -13.1604},${p.longitude || -74.2259}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 py-1.5 px-3 bg-[#F4F9F8] hover:bg-[#E8F3F2] text-[#004D49] rounded text-xs font-semibold text-center border border-[#D9EFEF] shadow-2xs transition-colors duration-200"
                      >
                        Google Maps
                      </a>
                      <a
                        href={`https://waze.com/ul?ll=${p.latitude || -13.1604},${p.longitude || -74.2259}&navigate=yes`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 py-1.5 px-3 bg-[#F4F9F8] hover:bg-[#E8F3F2] text-[#004D49] rounded text-xs font-semibold text-center border border-[#D9EFEF] shadow-2xs transition-colors duration-200"
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
                      className="w-full py-2 bg-[#004D49] hover:bg-[#003835] text-white text-xs font-medium rounded transition-colors duration-200 flex items-center justify-center space-x-1.5 cursor-pointer shadow-[0_4px_12px_rgba(0,77,73,0.25)]"
                    >
                      <span>Ver Plano & Reservar</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </motion.button>
                  </div>
                </DynamicTiltCard>
              </motion.div>
            );
          })}
        </div>

      </CinematicScrollSection>

      {/* =========================================================================
          5. BENTO GRID DE ESPECIFICACIONES
          ========================================================================= */}
      <CinematicScrollSection id="infraestructura" className="py-16 sm:py-24 px-4 sm:px-6 lg:px-12 max-w-6xl mx-auto space-y-8 sm:space-y-10">
        
        {/* Encabezado Centrado */}
        <div className="max-w-2xl mx-auto text-center space-y-2 px-2">
          <span className="text-xs font-mono text-[#004D49] uppercase tracking-wider block font-bold">
            ESPECIFICACIÓN TÉCNICA
          </span>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-display text-[#002B29] tracking-tight">
            Módulos del Sistema Operativo
          </h2>
          <p className="text-xs sm:text-sm text-[#004D49] max-w-md mx-auto font-medium">
            Infraestructura optimizada para operaciones de alto flujo vehicular.
          </p>
        </div>

        {/* Bento Grid Editorial */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6">
          
          <motion.div 
            initial={{ opacity: 0, y: 25 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-20px' }}
            transition={{ duration: 0.5, ease: FLUID_EASE }}
            className="md:col-span-2 bg-white/95 backdrop-blur-sm p-6 sm:p-8 rounded-xl border border-white/60 space-y-5 sm:space-y-6 flex flex-col justify-between shadow-[0_8px_24px_-4px_rgba(0,77,73,0.12)] hover:shadow-[0_16px_36px_-4px_rgba(0,77,73,0.2)] transition-all duration-300"
          >
            <div className="space-y-2">
              <div className="w-8 h-8 rounded bg-[#E0F4F2] text-[#00827C] flex items-center justify-center font-bold text-xs">
                <Camera className="w-4 h-4" />
              </div>
              <h3 className="text-base sm:text-lg font-bold text-[#002B29]">
                Reconocimiento Automático de Placas (ANPR)
              </h3>
              <p className="text-xs text-[#555555] leading-relaxed">
                Algoritmos de visión artificial entrenados para placas vehiculares peruanas con captura a 60 cuadros por segundo y tolerancia a variaciones lumínicas.
              </p>
            </div>
            <div className="p-3 bg-[#F4F9F8] rounded border border-[#D9EFEF] font-mono text-xs text-[#00605B] flex justify-between shadow-2xs">
              <span>Tiempo de detección:</span>
              <strong className="text-[#002B29]">&lt; 180 ms</strong>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 25 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-20px' }}
            transition={{ duration: 0.5, delay: 0.08, ease: FLUID_EASE }}
            className="bg-white/95 backdrop-blur-sm p-6 sm:p-8 rounded-xl border border-white/60 space-y-5 sm:space-y-6 flex flex-col justify-between shadow-[0_8px_24px_-4px_rgba(0,77,73,0.12)] hover:shadow-[0_16px_36px_-4px_rgba(0,77,73,0.2)] transition-all duration-300"
          >
            <div className="space-y-2">
              <div className="w-8 h-8 rounded bg-[#E0F4F2] text-[#00827C] flex items-center justify-center font-bold text-xs">
                <QrCode className="w-4 h-4" />
              </div>
              <h3 className="text-base sm:text-lg font-bold text-[#002B29]">
                Pase Digital Criptográfico
              </h3>
              <p className="text-xs text-[#555555] leading-relaxed">
                Tokens únicos de acceso con temporizador en vivo y respaldo en almacenamiento local del dispositivo.
              </p>
            </div>
            <div className="p-3 bg-[#F4F9F8] rounded border border-[#D9EFEF] font-mono text-xs text-[#00605B] text-center shadow-2xs font-semibold">
              Protocolo Zero-Paper
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 25 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-20px' }}
            transition={{ duration: 0.5, delay: 0.12, ease: FLUID_EASE }}
            className="bg-white/95 backdrop-blur-sm p-6 sm:p-8 rounded-xl border border-white/60 space-y-5 sm:space-y-6 flex flex-col justify-between shadow-[0_8px_24px_-4px_rgba(0,77,73,0.12)] hover:shadow-[0_16px_36px_-4px_rgba(0,77,73,0.2)] transition-all duration-300"
          >
            <div className="space-y-2">
              <div className="w-8 h-8 rounded bg-[#E0F4F2] text-[#00827C] flex items-center justify-center font-bold text-xs">
                <CreditCard className="w-4 h-4" />
              </div>
              <h3 className="text-base sm:text-lg font-bold text-[#002B29]">
                Pasarela de Pagos
              </h3>
              <p className="text-xs text-[#555555] leading-relaxed">
                Integración con Yape, Plin y tarjetas de débito/crédito con liquidación y comprobante inmediato.
              </p>
            </div>
            <div className="p-3 bg-[#F4F9F8] rounded border border-[#D9EFEF] font-mono text-xs text-[#00605B] text-center shadow-2xs font-semibold">
              Yape • Plin • Culqi
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 25 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: '-20px' }}
            transition={{ duration: 0.5, delay: 0.16, ease: FLUID_EASE }}
            className="md:col-span-2 bg-white/95 backdrop-blur-sm p-6 sm:p-8 rounded-xl border border-white/60 space-y-5 sm:space-y-6 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-[0_8px_24px_-4px_rgba(0,77,73,0.12)] hover:shadow-[0_16px_36px_-4px_rgba(0,77,73,0.2)] transition-all duration-300"
          >
            <div className="space-y-2 max-w-md text-center sm:text-left">
              <div className="w-8 h-8 rounded bg-[#E0F4F2] text-[#00827C] flex items-center justify-center font-bold text-xs mx-auto sm:mx-0">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <h3 className="text-base sm:text-lg font-bold text-[#002B29]">
                Seguridad y Trazabilidad de Garita
              </h3>
              <p className="text-xs text-[#555555] leading-relaxed">
                Registro horario inmutable de ingresos y salidas con bitácora fotográfica por evento.
              </p>
            </div>
            <div className="space-y-1.5 text-xs font-mono text-[#00605B] w-full sm:w-auto font-medium">
              <div className="p-2.5 bg-[#F4F9F8] rounded border border-[#D9EFEF] shadow-2xs text-center sm:text-left">
                Auditoría horaria continua
              </div>
              <div className="p-2.5 bg-[#F4F9F8] rounded border border-[#D9EFEF] shadow-2xs text-center sm:text-left">
                Registro de eventos en vivo
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
            <span className="text-xs font-mono text-[#A7F3D0] uppercase tracking-wider block font-bold">
              RED DE COCHERAS EN HUAMANGA
            </span>
            <h2 className="text-2xl sm:text-3xl md:text-4xl font-display tracking-tight text-white">
              Digitalice la operación de su cochera
            </h2>
            <p className="text-xs sm:text-sm text-[#D1FAE5] leading-relaxed max-w-xl mx-auto">
              Integramos el plano 2D interactivo, el sistema de lectura de placas en garita y conectamos su inmueble con conductores de la ciudad.
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
          <span className="text-xs font-mono text-[#004D49] uppercase tracking-wider block font-bold">
            SOPORTE Y CONSULTAS
          </span>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-display text-[#002B29] tracking-tight">
            Preguntas Frecuentes
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
            <div className="w-6 h-6 rounded bg-[#004D49] text-white flex items-center justify-center font-bold text-[10px] shadow-xs">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3.5 h-3.5">
                <path d="M9 17V7h4a3 3 0 0 1 0 6H9" />
                <circle cx="12" cy="12" r="10" />
              </svg>
            </div>
            <span className="font-bold text-[#002B29] font-mono">SMART-PARK AYACUCHO</span>
            <span>• © 2026</span>
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
