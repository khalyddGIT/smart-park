import React, { useState, useMemo, useRef } from 'react';
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

// Curva de desaceleración orgánica y elástica
const FLUID_EASE = [0.16, 1, 0.3, 1];

// Componente de Sección con Animaciones de Scroll Exageradas y 3D en Avance y Retroceso
const CinematicScrollSection = ({ children, className = '', id = '' }) => {
  const sectionRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start end', 'end start']
  });

  // Interpolaciones pronunciadas de entrada (0 -> 0.35) y salida (0.65 -> 1)
  const opacity = useTransform(scrollYProgress, [0, 0.25, 0.75, 1], [0.1, 1, 1, 0.15]);
  const scale = useTransform(scrollYProgress, [0, 0.3, 0.7, 1], [0.86, 1, 1, 0.88]);
  const y = useTransform(scrollYProgress, [0, 0.3, 0.7, 1], [140, 0, 0, -100]);
  const rotateX = useTransform(scrollYProgress, [0, 0.3, 0.7, 1], [14, 0, 0, -12]);

  const smoothScale = useSpring(scale, { stiffness: 140, damping: 20 });
  const smoothY = useSpring(y, { stiffness: 140, damping: 20 });
  const smoothRotateX = useSpring(rotateX, { stiffness: 140, damping: 20 });

  return (
    <div style={{ perspective: 1400 }}>
      <motion.section
        ref={sectionRef}
        id={id}
        style={{
          opacity,
          scale: smoothScale,
          y: smoothY,
          rotateX: smoothRotateX,
          transformStyle: 'preserve-3d'
        }}
        className={className}
      >
        {children}
      </motion.section>
    </div>
  );
};

// Tarjeta con Inercia 3D pronunciada y Reacción Dinámica al Cursor
const DynamicTiltCard = ({ children, className = '' }) => {
  const cardRef = useRef(null);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const rotateX = useSpring(useTransform(mouseY, [-0.5, 0.5], [10, -10]), { stiffness: 260, damping: 22 });
  const rotateY = useSpring(useTransform(mouseX, [-0.5, 0.5], [-10, 10]), { stiffness: 260, damping: 22 });
  const cardScale = useSpring(useTransform(mouseX, [-0.5, 0, 0.5], [1.02, 1, 1.02]), { stiffness: 260, damping: 22 });

  const handleMouseMove = (e) => {
    if (!cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;
    const xFromCenter = (e.clientX - rect.left) / width - 0.5;
    const yFromCenter = (e.clientY - rect.top) / height - 0.5;
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
      style={{
        rotateX,
        rotateY,
        scale: cardScale,
        transformStyle: 'preserve-3d',
        perspective: 1200
      }}
      className={className}
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

  // Referencias para Parallax y Scroll-Driven Animations
  const heroRef = useRef(null);
  const mockupSectionRef = useRef(null);

  // Barra elástica de progreso de lectura superior
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 160,
    damping: 28,
    restDelta: 0.001
  });

  // =========================================================================
  // FONDO GRADIENTE 3D ESPACIAL DINÁMICO INTERPOLADO POR SCROLL
  // (Tonos suaves y elegantes que mutan sin saturación excesiva)
  // =========================================================================
  const bgPageColor = useTransform(
    scrollYProgress,
    [0, 0.25, 0.5, 0.75, 1],
    ['#FBFBFA', '#F4F7F4', '#F0F5F9', '#FAF6EE', '#FBFBFA']
  );

  const orb1X = useTransform(scrollYProgress, [0, 0.5, 1], ['-8%', '35%', '-2%']);
  const orb1Y = useTransform(scrollYProgress, [0, 0.5, 1], ['4%', '38%', '76%']);
  const orb1Scale = useTransform(scrollYProgress, [0, 0.5, 1], [1, 1.25, 0.95]);
  const orb1Color = useTransform(
    scrollYProgress,
    [0, 0.33, 0.66, 1],
    ['rgba(215, 237, 218, 0.7)', 'rgba(214, 235, 252, 0.65)', 'rgba(252, 238, 210, 0.6)', 'rgba(215, 237, 218, 0.7)']
  );

  const orb2X = useTransform(scrollYProgress, [0, 0.5, 1], ['75%', '50%', '15%']);
  const orb2Y = useTransform(scrollYProgress, [0, 0.5, 1], ['12%', '65%', '28%']);
  const orb2Scale = useTransform(scrollYProgress, [0, 0.5, 1], [1.15, 0.9, 1.2]);
  const orb2Color = useTransform(
    scrollYProgress,
    [0, 0.33, 0.66, 1],
    ['rgba(214, 235, 252, 0.65)', 'rgba(252, 238, 210, 0.6)', 'rgba(215, 237, 218, 0.7)', 'rgba(214, 235, 252, 0.65)']
  );

  // Parallax Exagerado en la Hero Section
  const { scrollYProgress: heroScrollProgress } = useScroll({
    target: heroRef,
    offset: ['start start', 'end start']
  });

  const heroHeadlineY = useTransform(heroScrollProgress, [0, 1], [0, 180]);
  const heroOpacity = useTransform(heroScrollProgress, [0, 0.7], [1, 0]);
  const heroScale = useTransform(heroScrollProgress, [0, 1], [1, 0.88]);
  const heroRotateX = useTransform(heroScrollProgress, [0, 1], [0, -16]);
  const heroMetricsY = useTransform(heroScrollProgress, [0, 1], [0, 80]);

  const smoothHeroHeadlineY = useSpring(heroHeadlineY, { stiffness: 120, damping: 20 });
  const smoothHeroScale = useSpring(heroScale, { stiffness: 120, damping: 20 });
  const smoothHeroRotateX = useSpring(heroRotateX, { stiffness: 120, damping: 20 });

  // Transformación 3D Exagerada del Mockup Faux-OS
  const { scrollYProgress: mockupScrollProgress } = useScroll({
    target: mockupSectionRef,
    offset: ['start end', 'center center']
  });

  const mockupRotateX = useTransform(mockupScrollProgress, [0, 1], [26, 0]);
  const mockupScale = useTransform(mockupScrollProgress, [0, 1], [0.82, 1]);
  const mockupOpacity = useTransform(mockupScrollProgress, [0, 0.4], [0.2, 1]);
  const smoothMockupRotateX = useSpring(mockupRotateX, { stiffness: 90, damping: 18 });
  const smoothMockupScale = useSpring(mockupScale, { stiffness: 90, damping: 18 });

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
    <motion.div 
      style={{ backgroundColor: bgPageColor }}
      className="min-h-screen text-[#191919] font-sans antialiased selection:bg-[#EAEAEA] selection:text-black overflow-x-hidden relative transition-colors duration-500"
    >
      
      {/* =========================================================================
          ORBES GRADIENTES 3D FLOTANTES DINÁMICOS DE FONDO
          ========================================================================= */}
      <div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
        {/* Orbe 3D Primario */}
        <motion.div
          style={{
            left: orb1X,
            top: orb1Y,
            scale: orb1Scale,
            backgroundColor: orb1Color,
          }}
          className="absolute w-[500px] h-[500px] sm:w-[650px] sm:h-[650px] rounded-full blur-[130px] opacity-70 transition-colors duration-700"
        />

        {/* Orbe 3D Secundario */}
        <motion.div
          style={{
            left: orb2X,
            top: orb2Y,
            scale: orb2Scale,
            backgroundColor: orb2Color,
          }}
          className="absolute w-[450px] h-[450px] sm:w-[600px] sm:h-[600px] rounded-full blur-[140px] opacity-65 transition-colors duration-700"
        />
      </div>

      {/* Indicador elástico superior de scroll */}
      <motion.div 
        className="fixed top-0 left-0 right-0 h-[3px] bg-[#111111] z-[100] origin-left"
        style={{ scaleX }}
      />

      {/* =========================================================================
          1. HEADER EDITORIAL MINIMALISTA
          ========================================================================= */}
      <header className="sticky top-0 z-50 bg-[#FBFBFA]/85 backdrop-blur-md border-b border-[#E5E5E5] px-6 lg:px-12 py-4 shadow-[0_2px_8px_-2px_rgba(0,0,0,0.03)] transition-colors duration-300">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          
          {/* Logo y Denominación */}
          <div className="flex items-center space-x-3">
            <div className="w-7 h-7 rounded-md bg-[#111111] text-white flex items-center justify-center font-bold text-xs shadow-xs transition-transform duration-200 hover:scale-105">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3.5 h-3.5">
                <path d="M9 17V7h4a3 3 0 0 1 0 6H9" />
                <circle cx="12" cy="12" r="10" />
              </svg>
            </div>
            <div className="leading-none">
              <span className="text-sm font-black tracking-tight text-[#111111] font-mono">
                SMART-PARK
              </span>
              <span className="text-[10px] text-[#787774] font-mono block mt-0.5">
                Ayacucho • Huamanga
              </span>
            </div>
          </div>

          {/* Navegación Tipográfica */}
          <nav className="hidden md:flex items-center space-x-8 text-xs font-medium text-[#787774]">
            <a href="#mapa" className="hover:text-[#111111] transition-colors duration-200">Directorio de Cocheras</a>
            <a href="#sistema" className="hover:text-[#111111] transition-colors duration-200">Funcionamiento</a>
            <a href="#infraestructura" className="hover:text-[#111111] transition-colors duration-200">Infraestructura</a>
            <a href="#afiliacion" className="hover:text-[#111111] transition-colors duration-200">Propietarios</a>
          </nav>

          {/* Acciones */}
          <div className="flex items-center space-x-3">
            <button
              onClick={() => onOpenAuth && onOpenAuth('affiliation')}
              className="hidden sm:inline-flex text-xs font-medium text-[#787774] hover:text-[#111111] px-3 py-1.5 transition-colors duration-200 cursor-pointer"
            >
              Afiliar Cochera
            </button>

            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={() => onOpenAuth && onOpenAuth('login')}
              className="bg-[#111111] hover:bg-[#333333] text-white text-xs font-medium px-4 py-2 rounded-md transition-all duration-200 cursor-pointer flex items-center space-x-2 shadow-[0_2px_6px_rgba(0,0,0,0.12)]"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Acceder al Sistema</span>
            </motion.button>
          </div>

        </div>
      </header>

      {/* =========================================================================
          2. HERO SECTION CON PARALLAX Y TILT 3D EXAGERADO AL SCROLLEAR
          ========================================================================= */}
      <div style={{ perspective: 1400 }}>
        <section ref={heroRef} className="pt-24 pb-20 px-6 lg:px-12 max-w-5xl mx-auto space-y-12 text-center">
          
          <motion.div 
            style={{ 
              y: smoothHeroHeadlineY, 
              opacity: heroOpacity,
              scale: smoothHeroScale,
              rotateX: smoothHeroRotateX,
              transformStyle: 'preserve-3d'
            }}
            initial={{ opacity: 0, y: 50, scale: 0.92 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.9, ease: FLUID_EASE }}
            className="space-y-6 flex flex-col items-center"
          >
            
            {/* Titular Principal Centrado con Gran Impacto */}
            <h1 className="text-4xl sm:text-6xl lg:text-7xl font-display text-[#111111] tracking-tight max-w-4xl mx-auto leading-[1.06]">
              La infraestructura de estacionamiento para <span className="font-editorial italic font-normal text-[#2A2A2A]">Ayacucho</span>.
            </h1>

            {/* Subtítulo Centrado */}
            <p className="text-base sm:text-lg text-[#555555] max-w-2xl mx-auto font-normal leading-relaxed text-center">
              Consulte la disponibilidad en tiempo real, seleccione su plaza en el plano topográfico 2D del estacionamiento y acceda mediante reconocimiento de placa ANPR.
            </p>

            {/* Botones Centrados */}
            <div className="pt-2 flex flex-col sm:flex-row items-center justify-center gap-3 w-full">
              <motion.a
                whileHover={{ scale: 1.04, y: -2 }}
                whileTap={{ scale: 0.96 }}
                href="#mapa"
                className="w-full sm:w-auto px-7 py-3 bg-[#111111] hover:bg-[#2B2B2B] text-white text-xs font-medium rounded-md transition-all duration-200 flex items-center justify-center space-x-2 cursor-pointer shadow-[0_6px_16px_rgba(0,0,0,0.14)]"
              >
                <span>Consultar Mapa en Vivo</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </motion.a>

              <motion.button
                whileHover={{ scale: 1.04, y: -2 }}
                whileTap={{ scale: 0.96 }}
                onClick={() => onOpenAuth && onOpenAuth('affiliation')}
                className="w-full sm:w-auto px-6 py-3 bg-white/90 hover:bg-[#F0F0EF] text-[#111111] text-xs font-medium rounded-md border border-[#E5E5E5] shadow-xs transition-colors duration-200 cursor-pointer backdrop-blur-xs"
              >
                Afiliar Establecimiento
              </motion.button>
            </div>

          </motion.div>

          {/* Métricas de Precisión con Parallax Propio */}
          <motion.div 
            style={{ y: heroMetricsY }}
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.25, ease: FLUID_EASE }}
            className="grid grid-cols-2 md:grid-cols-4 gap-6 pt-8 border-t border-[#E5E5E5] text-center"
          >
            <div className="space-y-1">
              <span className="font-mono text-2xl sm:text-3xl font-bold text-[#111111] block">
                {establishments.length}
              </span>
              <span className="text-xs text-[#787774] font-medium block">Cocheras conectadas</span>
            </div>

            <div className="space-y-1">
              <span className="font-mono text-2xl sm:text-3xl font-bold text-[#346538] block">
                {totalFreeSlots}
              </span>
              <span className="text-xs text-[#787774] font-medium block">Plazas libres ahora</span>
            </div>

            <div className="space-y-1">
              <span className="font-mono text-2xl sm:text-3xl font-bold text-[#111111] block">
                &lt; 0.2s
              </span>
              <span className="text-xs text-[#787774] font-medium block">Lectura de placa ANPR</span>
            </div>

            <div className="space-y-1">
              <span className="font-mono text-2xl sm:text-3xl font-bold text-[#111111] block">
                S/ 4.00
              </span>
              <span className="text-xs text-[#787774] font-medium block">Tarifa base promedio</span>
            </div>
          </motion.div>

        </section>
      </div>

      {/* =========================================================================
          3. MOCKUP DE VENTANA FAUX-OS CON 3D SCROLL PROFUNDO
          ========================================================================= */}
      <CinematicScrollSection id="sistema" className="py-16 px-6 lg:px-12 max-w-6xl mx-auto space-y-10">
        
        {/* Encabezado Centrado */}
        <div className="max-w-2xl mx-auto text-center space-y-2">
          <span className="text-xs font-mono text-[#787774] uppercase tracking-wider block">
            ARQUITECTURA DE ACCESO
          </span>
          <h2 className="text-2xl sm:text-4xl font-display text-[#111111] tracking-tight">
            Interacción directa sin aplicaciones intermedias
          </h2>
          <p className="text-xs sm:text-sm text-[#787774] max-w-lg mx-auto">
            La plataforma opera mediante interfaz web ligera optimizada para cualquier navegador móvil.
          </p>
        </div>

        {/* Contenedor Faux-OS Window Chrome con Inclinación 3D Marcada */}
        <div ref={mockupSectionRef} style={{ perspective: 1200 }}>
          <motion.div 
            style={{ 
              rotateX: smoothMockupRotateX,
              scale: smoothMockupScale,
              opacity: mockupOpacity,
              transformStyle: 'preserve-3d'
            }}
            className="rounded-xl border border-[#E5E5E5] bg-white/95 backdrop-blur-md shadow-[0_16px_48px_-6px_rgba(0,0,0,0.1),0_4px_16px_rgba(0,0,0,0.03)] overflow-hidden transition-shadow duration-300"
          >
            
            {/* Barra superior de ventana */}
            <div className="px-4 py-3 bg-[#F7F6F3]/90 border-b border-[#E5E5E5] flex items-center justify-between">
              <div className="flex items-center space-x-1.5">
                <span className="w-2.5 h-2.5 rounded-full bg-[#E5E5E5] border border-[#D4D4D4]" />
                <span className="w-2.5 h-2.5 rounded-full bg-[#E5E5E5] border border-[#D4D4D4]" />
                <span className="w-2.5 h-2.5 rounded-full bg-[#E5E5E5] border border-[#D4D4D4]" />
              </div>
              <span className="font-mono text-[11px] text-[#787774]">
                smart-park.pe/pase/SPK-8912
              </span>
              <div className="w-10" />
            </div>

            {/* Cuerpo del Mockup */}
            <div className="p-6 sm:p-10 grid grid-cols-1 md:grid-cols-3 gap-8 items-center bg-white/90">
              
              <div className="space-y-6 md:col-span-1 border-r border-[#E5E5E5] md:pr-6">
                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-[#111111]">1. Selección en Plano 2D</h3>
                  <p className="text-xs text-[#787774] leading-relaxed">
                    Identificación exacta del espacio asignado: techado, estándar o con acceso preferencial.
                  </p>
                </div>

                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-[#111111]">2. Ruteo Satelital GPS</h3>
                  <p className="text-xs text-[#787774] leading-relaxed">
                    Trazado de navegación directa hacia la garita mediante Google Maps o Waze.
                  </p>
                </div>

                <div className="space-y-1">
                  <h3 className="text-sm font-bold text-[#111111]">3. Control de Garita</h3>
                  <p className="text-xs text-[#787774] leading-relaxed">
                    Apertura automática de la barrera vehicular tras el reconocimiento de caracteres de placa.
                  </p>
                </div>
              </div>

              {/* Ficha de Pase Digital */}
              <div className="md:col-span-2 bg-[#FBFBFA]/90 p-6 rounded-lg border border-[#E5E5E5] shadow-xs space-y-4">
                
                <div className="flex items-center justify-between border-b border-[#E5E5E5] pb-3">
                  <div>
                    <h4 className="font-bold text-sm text-[#111111]">Smart Park Plaza Mayor</h4>
                    <p className="text-xs text-[#787774] font-mono">Jr. 28 de Julio 142 • Huamanga</p>
                  </div>
                  <span className="font-mono text-xs font-bold text-[#346538]">
                    AUTORIZADO
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-3 font-mono text-xs">
                  <div className="p-3 bg-white rounded border border-[#E5E5E5] shadow-2xs transition-colors duration-200 hover:border-[#D4D4D4]">
                    <span className="text-[10px] text-[#787774] block uppercase">Plaza</span>
                    <strong className="text-sm text-[#111111] block mt-0.5">A-01</strong>
                  </div>
                  <div className="p-3 bg-white rounded border border-[#E5E5E5] shadow-2xs transition-colors duration-200 hover:border-[#D4D4D4]">
                    <span className="text-[10px] text-[#787774] block uppercase">Vehículo</span>
                    <strong className="text-sm text-[#111111] block mt-0.5">ABC-123</strong>
                  </div>
                  <div className="p-3 bg-white rounded border border-[#E5E5E5] shadow-2xs transition-colors duration-200 hover:border-[#D4D4D4]">
                    <span className="text-[10px] text-[#787774] block uppercase">Tolerancia</span>
                    <strong className="text-sm text-[#346538] block mt-0.5">15 min</strong>
                  </div>
                </div>

                <div className="flex items-center justify-between text-xs text-[#787774] pt-2 border-t border-[#E5E5E5] font-mono">
                  <span>Token: SPK-8912-7B2F9A</span>
                  <span>Visión Computacional 60 FPS</span>
                </div>

              </div>

            </div>

          </motion.div>
        </div>

      </CinematicScrollSection>

      {/* =========================================================================
          4. DIRECTORIO Y MAPA CON SCROLL DINÁMICO
          ========================================================================= */}
      <CinematicScrollSection id="mapa" className="py-16 px-6 lg:px-12 max-w-6xl mx-auto space-y-8">
        
        {/* Encabezado y Filtros Centrados */}
        <div className="max-w-3xl mx-auto text-center space-y-4">
          <div className="space-y-2">
            <span className="text-xs font-mono text-[#787774] uppercase tracking-wider block">
              COBERTURA URBANA
            </span>
            <h2 className="text-2xl sm:text-4xl font-display text-[#111111] tracking-tight">
              Estacionamientos en Huamanga
            </h2>
            <p className="text-xs sm:text-sm text-[#787774] max-w-md mx-auto">
              Tarifas por hora, capacidad de plazas y ruteo directo en tiempo real.
            </p>
          </div>

          {/* Filtros Centrados */}
          <div className="flex items-center justify-center space-x-2 overflow-x-auto pb-1 text-xs flex-wrap gap-y-2">
            <button
              onClick={() => setCategoryFilter('todos')}
              className={`px-3.5 py-1.5 rounded-md font-medium transition-all duration-200 cursor-pointer border shadow-2xs ${
                categoryFilter === 'todos'
                  ? 'bg-[#111111] text-white border-[#111111]'
                  : 'bg-white/90 text-[#787774] hover:text-[#111111] border-[#E5E5E5] backdrop-blur-xs'
              }`}
            >
              Todos ({establishments.length})
            </button>
            <button
              onClick={() => setCategoryFilter('centro')}
              className={`px-3.5 py-1.5 rounded-md font-medium transition-all duration-200 cursor-pointer border shadow-2xs ${
                categoryFilter === 'centro'
                  ? 'bg-[#111111] text-white border-[#111111]'
                  : 'bg-white/90 text-[#787774] hover:text-[#111111] border-[#E5E5E5] backdrop-blur-xs'
              }`}
            >
              Centro Histórico
            </button>
            <button
              onClick={() => setCategoryFilter('techados')}
              className={`px-3.5 py-1.5 rounded-md font-medium transition-all duration-200 cursor-pointer border shadow-2xs ${
                categoryFilter === 'techados'
                  ? 'bg-[#111111] text-white border-[#111111]'
                  : 'bg-white/90 text-[#787774] hover:text-[#111111] border-[#E5E5E5] backdrop-blur-xs'
              }`}
            >
              Techados
            </button>
            <button
              onClick={() => setCategoryFilter('economicos')}
              className={`px-3.5 py-1.5 rounded-md font-medium transition-all duration-200 cursor-pointer border shadow-2xs ${
                categoryFilter === 'economicos'
                  ? 'bg-[#111111] text-white border-[#111111]'
                  : 'bg-white/90 text-[#787774] hover:text-[#111111] border-[#E5E5E5] backdrop-blur-xs'
              }`}
            >
              Económicos (≤ S/ 4.50)
            </button>
          </div>
        </div>

        {/* Mapa Leaflet con Aislamiento Estricto y Sombra */}
        <div className="relative isolate z-0 rounded-xl border border-[#E5E5E5] overflow-hidden shadow-[0_8px_30px_-4px_rgba(0,0,0,0.08)] bg-white transition-shadow duration-300 hover:shadow-lg">
          <AyacuchoMap
            parkings={filteredParkings}
            onSelectParking={(p) => {
              if (onSelectParking) onSelectParking(p);
            }}
          />
        </div>

        {/* Grilla de Cocheras con Parallax y Entrada Fluida */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-4">
          {filteredParkings.map((p, idx) => {
            const elements = p.elements || [];
            const freeSlots = elements.filter(e => e.type === 'slot' && e.status === 'free').length;
            const totalCount = elements.filter(e => e.type === 'slot').length || p.totalSlots || 0;

            return (
              <motion.div 
                key={p.id}
                initial={{ opacity: 0, y: 50, scale: 0.93 }}
                whileInView={{ opacity: 1, y: 0, scale: 1 }}
                viewport={{ once: false, margin: '-40px' }}
                transition={{ duration: 0.6, delay: (idx % 3) * 0.08, ease: FLUID_EASE }}
              >
                <DynamicTiltCard className="h-full bg-white/95 backdrop-blur-sm rounded-xl border border-[#E5E5E5] p-5 flex flex-col justify-between shadow-[0_4px_14px_-2px_rgba(0,0,0,0.04)] hover:border-[#D1D1D1] hover:shadow-[0_16px_36px_-4px_rgba(0,0,0,0.1)] transition-all duration-300">
                  <div className="space-y-3">
                    <div className="h-36 rounded-lg overflow-hidden relative bg-[#F7F6F3]">
                      <img 
                        src={p.image || 'https://images.unsplash.com/photo-1506521781263-d8422e82f27a?w=800'} 
                        alt={p.name} 
                        className="w-full h-full object-cover transition-transform duration-500 hover:scale-108" 
                      />
                      <div className="absolute top-2.5 right-2.5 bg-white/95 px-2.5 py-1 rounded text-xs font-mono font-bold text-[#111111] border border-[#E5E5E5] shadow-xs">
                        S/ {Number(p.rate).toFixed(2)}/h
                      </div>
                    </div>

                    <div className="space-y-1">
                      <h3 className="font-bold text-sm text-[#111111]">{p.name}</h3>
                      <p className="text-xs text-[#787774] flex items-center gap-1 truncate">
                        <MapPin className="w-3.5 h-3.5 text-[#111111] shrink-0" />
                        <span>{p.address} {p.reference ? `(${p.reference})` : ''}</span>
                      </p>
                    </div>

                    <div className="flex items-center justify-between text-xs font-mono text-[#787774] pt-2 border-t border-[#E5E5E5]">
                      <span>Disponibilidad:</span>
                      <strong className="text-[#346538] font-bold">{freeSlots} libres de {totalCount}</strong>
                    </div>
                  </div>

                  <div className="pt-4 space-y-2">
                    <div className="flex items-center gap-2">
                      <a
                        href={`https://www.google.com/maps/dir/?api=1&destination=${p.latitude || -13.1604},${p.longitude || -74.2259}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 py-1.5 px-3 bg-[#FBFBFA] hover:bg-[#F0F0EF] text-[#111111] rounded text-xs font-medium text-center border border-[#E5E5E5] shadow-2xs transition-colors duration-200"
                      >
                        Google Maps
                      </a>
                      <a
                        href={`https://waze.com/ul?ll=${p.latitude || -13.1604},${p.longitude || -74.2259}&navigate=yes`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 py-1.5 px-3 bg-[#FBFBFA] hover:bg-[#F0F0EF] text-[#111111] rounded text-xs font-medium text-center border border-[#E5E5E5] shadow-2xs transition-colors duration-200"
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
                      className="w-full py-2 bg-[#111111] hover:bg-[#2B2B2B] text-white text-xs font-medium rounded transition-colors duration-200 flex items-center justify-center space-x-1.5 cursor-pointer shadow-[0_2px_6px_rgba(0,0,0,0.12)]"
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
          5. BENTO GRID DE ESPECIFICACIONES CON PARALLAX MARCADO
          ========================================================================= */}
      <CinematicScrollSection id="infraestructura" className="py-16 px-6 lg:px-12 max-w-6xl mx-auto space-y-10">
        
        {/* Encabezado Centrado */}
        <div className="max-w-2xl mx-auto text-center space-y-2">
          <span className="text-xs font-mono text-[#787774] uppercase tracking-wider block">
            ESPECIFICACIÓN TÉCNICA
          </span>
          <h2 className="text-2xl sm:text-4xl font-display text-[#111111] tracking-tight">
            Módulos del Sistema Operativo
          </h2>
          <p className="text-xs sm:text-sm text-[#787774] max-w-md mx-auto">
            Infraestructura optimizada para operaciones de alto flujo vehicular.
          </p>
        </div>

        {/* Bento Grid Editorial con Scroll Parallax */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          <motion.div 
            initial={{ opacity: 0, y: 50, scale: 0.94 }}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            viewport={{ once: false, margin: '-40px' }}
            transition={{ duration: 0.7, ease: FLUID_EASE }}
            className="md:col-span-2 bg-white/95 backdrop-blur-sm p-8 rounded-xl border border-[#E5E5E5] space-y-6 flex flex-col justify-between shadow-[0_4px_14px_-2px_rgba(0,0,0,0.04)] hover:border-[#D1D1D1] hover:shadow-[0_16px_36px_-4px_rgba(0,0,0,0.09)] transition-all duration-300"
          >
            <div className="space-y-2">
              <div className="w-8 h-8 rounded bg-[#EDF3EC] text-[#346538] flex items-center justify-center font-bold text-xs">
                <Camera className="w-4 h-4" />
              </div>
              <h3 className="text-lg font-bold text-[#111111]">
                Reconocimiento Automático de Placas (ANPR)
              </h3>
              <p className="text-xs text-[#555555] leading-relaxed">
                Algoritmos de visión artificial entrenados para placas vehiculares peruanas con captura a 60 cuadros por segundo y tolerancia a variaciones lumínicas.
              </p>
            </div>
            <div className="p-3 bg-[#FBFBFA] rounded border border-[#E5E5E5] font-mono text-xs text-[#787774] flex justify-between shadow-2xs">
              <span>Tiempo de detección:</span>
              <strong className="text-[#111111]">&lt; 180 ms</strong>
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 50, scale: 0.94 }}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            viewport={{ once: false, margin: '-40px' }}
            transition={{ duration: 0.7, delay: 0.1, ease: FLUID_EASE }}
            className="bg-white/95 backdrop-blur-sm p-8 rounded-xl border border-[#E5E5E5] space-y-6 flex flex-col justify-between shadow-[0_4px_14px_-2px_rgba(0,0,0,0.04)] hover:border-[#D1D1D1] hover:shadow-[0_16px_36px_-4px_rgba(0,0,0,0.09)] transition-all duration-300"
          >
            <div className="space-y-2">
              <div className="w-8 h-8 rounded bg-[#E1F3FE] text-[#1F6C9F] flex items-center justify-center font-bold text-xs">
                <QrCode className="w-4 h-4" />
              </div>
              <h3 className="text-lg font-bold text-[#111111]">
                Pase Digital Criptográfico
              </h3>
              <p className="text-xs text-[#555555] leading-relaxed">
                Tokens únicos de acceso con temporizador en vivo y respaldo en almacenamiento local del dispositivo.
              </p>
            </div>
            <div className="p-3 bg-[#FBFBFA] rounded border border-[#E5E5E5] font-mono text-xs text-[#787774] text-center shadow-2xs">
              Protocolo Zero-Paper
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 50, scale: 0.94 }}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            viewport={{ once: false, margin: '-40px' }}
            transition={{ duration: 0.7, delay: 0.15, ease: FLUID_EASE }}
            className="bg-white/95 backdrop-blur-sm p-8 rounded-xl border border-[#E5E5E5] space-y-6 flex flex-col justify-between shadow-[0_4px_14px_-2px_rgba(0,0,0,0.04)] hover:border-[#D1D1D1] hover:shadow-[0_16px_36px_-4px_rgba(0,0,0,0.09)] transition-all duration-300"
          >
            <div className="space-y-2">
              <div className="w-8 h-8 rounded bg-[#FBF3DB] text-[#956400] flex items-center justify-center font-bold text-xs">
                <CreditCard className="w-4 h-4" />
              </div>
              <h3 className="text-lg font-bold text-[#111111]">
                Pasarela de Pagos
              </h3>
              <p className="text-xs text-[#555555] leading-relaxed">
                Integración con Yape, Plin y tarjetas de débito/crédito con liquidación y comprobante inmediato.
              </p>
            </div>
            <div className="p-3 bg-[#FBFBFA] rounded border border-[#E5E5E5] font-mono text-xs text-[#787774] text-center shadow-2xs">
              Yape • Plin • Culqi
            </div>
          </motion.div>

          <motion.div 
            initial={{ opacity: 0, y: 50, scale: 0.94 }}
            whileInView={{ opacity: 1, y: 0, scale: 1 }}
            viewport={{ once: false, margin: '-40px' }}
            transition={{ duration: 0.7, delay: 0.2, ease: FLUID_EASE }}
            className="md:col-span-2 bg-white/95 backdrop-blur-sm p-8 rounded-xl border border-[#E5E5E5] space-y-6 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-[0_4px_14px_-2px_rgba(0,0,0,0.04)] hover:border-[#D1D1D1] hover:shadow-[0_16px_36px_-4px_rgba(0,0,0,0.09)] transition-all duration-300"
          >
            <div className="space-y-2 max-w-md">
              <div className="w-8 h-8 rounded bg-[#EDF3EC] text-[#346538] flex items-center justify-center font-bold text-xs">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <h3 className="text-lg font-bold text-[#111111]">
                Seguridad y Trazabilidad de Garita
              </h3>
              <p className="text-xs text-[#555555] leading-relaxed">
                Registro horario inmutable de ingresos y salidas con bitácora fotográfica por evento.
              </p>
            </div>
            <div className="space-y-1.5 text-xs font-mono text-[#787774] w-full sm:w-auto">
              <div className="p-2.5 bg-[#FBFBFA] rounded border border-[#E5E5E5] shadow-2xs">
                Auditoría horaria continua
              </div>
              <div className="p-2.5 bg-[#FBFBFA] rounded border border-[#E5E5E5] shadow-2xs">
                Registro de eventos en vivo
              </div>
            </div>
          </motion.div>

        </div>

      </CinematicScrollSection>

      {/* =========================================================================
          6. SECCIÓN PROPIETARIOS CON APARICIÓN DINÁMICA
          ========================================================================= */}
      <CinematicScrollSection id="afiliacion" className="py-16 px-6 lg:px-12 max-w-5xl mx-auto">
        <motion.div 
          initial={{ opacity: 0, y: 50, scale: 0.92 }}
          whileInView={{ opacity: 1, y: 0, scale: 1 }}
          viewport={{ once: false, margin: '-40px' }}
          transition={{ duration: 0.8, ease: FLUID_EASE }}
          className="bg-[#111111] text-white rounded-xl p-8 sm:p-14 space-y-6 flex flex-col items-center text-center border border-[#262626] shadow-[0_24px_60px_-10px_rgba(0,0,0,0.45)]"
        >
          
          <div className="max-w-2xl space-y-3">
            <span className="text-xs font-mono text-[#A3A3A3] uppercase tracking-wider block">
              RED DE COCHERAS EN HUAMANGA
            </span>
            <h2 className="text-2xl sm:text-4xl font-display tracking-tight text-white">
              Digitalice la operación de su cochera
            </h2>
            <p className="text-xs sm:text-sm text-[#A3A3A3] leading-relaxed max-w-xl mx-auto">
              Integramos el plano 2D interactivo, el sistema de lectura de placas en garita y conectamos su inmueble con conductores de la ciudad.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 w-full sm:w-auto pt-2">
            <motion.button
              whileHover={{ scale: 1.04, y: -2 }}
              whileTap={{ scale: 0.96 }}
              onClick={() => onOpenAuth && onOpenAuth('affiliation')}
              className="w-full sm:w-auto px-6 py-3 bg-white hover:bg-[#EAEAEA] text-[#111111] text-xs font-medium rounded transition-all duration-200 cursor-pointer shadow-[0_4px_12px_rgba(255,255,255,0.15)]"
            >
              Solicitar Afiliación
            </motion.button>
            <motion.a
              whileHover={{ scale: 1.04, y: -2 }}
              whileTap={{ scale: 0.96 }}
              href="https://wa.me/51966000000?text=Hola,%20deseo%20afiliar%20mi%20cochera%20en%20Ayacucho"
              target="_blank"
              rel="noopener noreferrer"
              className="w-full sm:w-auto px-6 py-3 bg-[#222222] hover:bg-[#333333] text-white text-xs font-medium rounded border border-[#333333] transition-colors duration-200 text-center"
            >
              Contacto Directo
            </motion.a>
          </div>

        </motion.div>
      </CinematicScrollSection>

      {/* =========================================================================
          7. PREGUNTAS FRECUENTES (FAQ) CON SCROLL REVEAL CASCADA
          ========================================================================= */}
      <CinematicScrollSection className="py-16 px-6 lg:px-12 max-w-4xl mx-auto space-y-10">
        
        {/* Encabezado Centrado */}
        <div className="max-w-2xl mx-auto text-center space-y-2">
          <span className="text-xs font-mono text-[#787774] uppercase tracking-wider block">
            SOPORTE Y CONSULTAS
          </span>
          <h2 className="text-2xl sm:text-4xl font-display text-[#111111] tracking-tight">
            Preguntas Frecuentes
          </h2>
          <p className="text-xs sm:text-sm text-[#787774]">
            Respuestas a las dudas principales sobre el funcionamiento del sistema.
          </p>
        </div>

        <div className="divide-y divide-[#E5E5E5] border-y border-[#E5E5E5]">
          {faqs.map((faq, idx) => (
            <motion.div 
              key={idx} 
              initial={{ opacity: 0, y: 25 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: false, margin: '-20px' }}
              transition={{ duration: 0.5, delay: idx * 0.06, ease: FLUID_EASE }}
              className="py-4.5"
            >
              <button
                onClick={() => setActiveFaq(activeFaq === idx ? null : idx)}
                className="w-full text-left font-medium text-xs sm:text-sm text-[#111111] flex items-center justify-between hover:text-[#555555] transition-colors duration-200 cursor-pointer"
              >
                <span>{faq.q}</span>
                <span className="font-mono text-base text-[#787774]">
                  {activeFaq === idx ? '−' : '+'}
                </span>
              </button>
              <AnimatePresence>
                {activeFaq === idx && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.35, ease: FLUID_EASE }}
                    className="overflow-hidden"
                  >
                    <div className="pt-3 text-xs sm:text-sm text-[#555555] leading-relaxed">
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
          8. FOOTER DOCUMENTAL
          ========================================================================= */}
      <footer className="bg-white/95 backdrop-blur-md border-t border-[#E5E5E5] py-12 px-6 lg:px-12 text-xs text-[#787774] shadow-[0_-2px_10px_-2px_rgba(0,0,0,0.02)]">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center space-x-3">
            <div className="w-6 h-6 rounded bg-[#111111] text-white flex items-center justify-center font-bold text-[10px] shadow-xs">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-3.5 h-3.5">
                <path d="M9 17V7h4a3 3 0 0 1 0 6H9" />
                <circle cx="12" cy="12" r="10" />
              </svg>
            </div>
            <span className="font-bold text-[#111111] font-mono">SMART-PARK AYACUCHO</span>
            <span>• © 2026</span>
          </div>

          <div className="flex items-center space-x-6">
            <button
              onClick={onOpenTerms}
              className="hover:text-[#111111] transition-colors duration-200 underline cursor-pointer"
            >
              Términos de Servicio
            </button>
            <a
              href="https://wa.me/51966000000"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[#111111] transition-colors duration-200"
            >
              Soporte WhatsApp
            </a>
          </div>
        </div>
      </footer>

    </motion.div>
  );
};
