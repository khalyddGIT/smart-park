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
  X,
  Sparkles,
  ShieldAlert,
  Lock,
  MessageSquare,
  FileText,
  ChevronDown,
  Compass,
  CheckCircle2
} from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { AyacuchoMap } from './AyacuchoMap';
import { BrandLogo } from './BrandLogo';

// Curva elástica ultra fluida acelerada por hardware (GPU)
const FLUID_EASE = [0.16, 1, 0.3, 1];

// Componente de Sección con física cinemática y profundidad espacial
const CinematicScrollSection = ({ children, className = '', id = '' }) => {
  const sectionRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start end', 'end start']
  });

  const opacity = useTransform(scrollYProgress, [0, 0.15, 0.85, 1], [0, 1, 1, 0.85]);
  const scale = useTransform(scrollYProgress, [0, 0.2, 0.8, 1], [0.97, 1, 1, 0.98]);
  const y = useTransform(scrollYProgress, [0, 0.2, 0.8, 1], [30, 0, 0, -25]);

  const smoothScale = useSpring(scale, { stiffness: 200, damping: 28, mass: 0.6 });
  const smoothY = useSpring(y, { stiffness: 200, damping: 28, mass: 0.6 });
  const smoothOpacity = useSpring(opacity, { stiffness: 180, damping: 28 });

  return (
    <motion.section
      ref={sectionRef}
      id={id}
      style={{
        opacity: smoothOpacity,
        scale: smoothScale,
        y: smoothY
      }}
      className={`transform-gpu will-change-transform relative z-10 ${className}`}
    >
      {children}
    </motion.section>
  );
};

// Tarjeta con Inercia Interactiva 3D Suave
const DynamicTiltCard = ({ children, className = '' }) => {
  const cardRef = useRef(null);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  useEffect(() => {
    setIsTouchDevice('ontouchstart' in window || navigator.maxTouchPoints > 0);
  }, []);

  const rotateX = useSpring(useTransform(mouseY, [-0.5, 0.5], [6, -6]), { stiffness: 260, damping: 24 });
  const rotateY = useSpring(useTransform(mouseX, [-0.5, 0.5], [-6, 6]), { stiffness: 260, damping: 24 });

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

// Carga diferida del mapa Leaflet
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
    <div ref={containerRef} className="relative isolate z-0 rounded-3xl overflow-hidden shadow-[0_25px_60px_-15px_rgba(0,77,73,0.18)] border border-[#004D49]/15 bg-white transition-shadow duration-300 min-h-[420px]">
      {shouldLoad ? (
        <AyacuchoMap parkings={parkings} onSelectParking={onSelectParking} />
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-[#EAF4F2]">
          <div className="w-9 h-9 rounded-full border-[3px] border-[#004D49]/20 border-t-[#004D49] animate-spin" />
          <p className="text-xs font-bold text-[#004D49]/70 font-sans">Cargando mapa en vivo de Ayacucho…</p>
        </div>
      )}
    </div>
  );
};

// Componente de Tipificación con Gradiente Dinámico Claro
const GradientTypewriter = () => {
  const dynamicWords = useMemo(() => [
    'Ayacucho',
    'Huamanga',
    'Tiempo Real',
    'tu Celular'
  ], []);

  const [wordIndex, setWordIndex] = useState(0);
  const [currentText, setCurrentText] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    const word = dynamicWords[wordIndex];
    const typingSpeed = isDeleting ? 45 : 95;

    const timeout = setTimeout(() => {
      if (!isDeleting) {
        setCurrentText(word.substring(0, currentText.length + 1));
        if (currentText === word) {
          setTimeout(() => setIsDeleting(true), 2600);
        }
      } else {
        setCurrentText(word.substring(0, currentText.length - 1));
        if (currentText === '') {
          setIsDeleting(false);
          setWordIndex((prev) => (prev + 1) % dynamicWords.length);
        }
      }
    }, typingSpeed);

    return () => clearTimeout(timeout);
  }, [currentText, isDeleting, wordIndex, dynamicWords]);

  return (
    <span className="inline-block relative">
      <span className="bg-gradient-to-r from-emerald-600 via-teal-500 to-emerald-600 bg-clip-text text-transparent font-black">
        {currentText || '\u00A0'}
      </span>
      <span className="inline-block w-[3px] sm:w-[4px] h-[0.85em] ml-1 bg-gradient-to-b from-emerald-500 to-teal-400 align-middle rounded-full animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.7)]" />
    </span>
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

  // Referencias para Parallax Global
  const heroRef = useRef(null);
  const containerRef = useRef(null);

  // Barra elástica de progreso de lectura superior
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 200,
    damping: 30,
    restDelta: 0.001
  });

  // Parallax del Fondo Global
  const bgOrb1Y = useTransform(scrollYProgress, [0, 1], [0, 280]);
  const bgOrb2Y = useTransform(scrollYProgress, [0, 1], [0, -320]);
  const bgOrb3Y = useTransform(scrollYProgress, [0, 1], [0, 180]);
  const smoothBgOrb1 = useSpring(bgOrb1Y, { stiffness: 100, damping: 25 });
  const smoothBgOrb2 = useSpring(bgOrb2Y, { stiffness: 100, damping: 25 });
  const smoothBgOrb3 = useSpring(bgOrb3Y, { stiffness: 100, damping: 25 });

  // Parallax del Hero
  const { scrollYProgress: heroScrollProgress } = useScroll({
    target: heroRef,
    offset: ['start start', 'end start']
  });

  const heroHeadlineY = useTransform(heroScrollProgress, [0, 1], [0, -55]);
  const heroOpacity = useTransform(heroScrollProgress, [0, 0.85], [1, 0.2]);
  const heroScale = useTransform(heroScrollProgress, [0, 1], [1, 0.96]);

  const smoothHeroHeadlineY = useSpring(heroHeadlineY, { stiffness: 180, damping: 26, mass: 0.7 });
  const smoothHeroScale = useSpring(heroScale, { stiffness: 180, damping: 26, mass: 0.7 });

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
      a: 'Al confirmar tu reserva recibes un Pase Digital. Al llegar a la cochera en Huamanga, la cámara inteligente ANPR reconoce tu placa registrada o puedes mostrar el código QR para ingresar de inmediato.'
    },
    {
      q: '¿Cuáles son los canales de pago habilitados?',
      a: 'Puedes pagar de forma rápida con PayPal Express Checkout, Yape, Plin y tarjetas de débito o crédito Visa, Mastercard y Amex.'
    },
    {
      q: '¿Existe tolerancia de tiempo ante eventualidades de tráfico en Ayacucho?',
      a: 'Todas las cocheras afiliadas cuentan con 15 minutos de cortesía tras la hora seleccionada para asegurar tu llegada sin inconvenientes.'
    },
    {
      q: '¿Cómo puedo afiliar mi playa de estacionamiento?',
      a: 'Haz clic en "Afiliar Cochera", completa los datos de tu establecimiento y nuestro equipo configurará el mapa digital interactivo de tu local en menos de 24 horas.'
    }
  ];

  return (
    <div
      ref={containerRef}
      style={{
        background: 'linear-gradient(180deg, #F4F9F8 0%, #FBFDFC 35%, #F0F7F6 70%, #E8F4F2 100%)'
      }}
      className="w-full min-h-screen text-[#111111] font-sans antialiased selection:bg-[#00827C] selection:text-white relative overflow-x-hidden"
    >
      {/* =========================================================================
          CAPAS DE PROFUNDIDAD ATMOSFÉRICA & PARALLAX FLOTANTE (SPATIAL LIGHT LAYERS)
          ========================================================================= */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        {/* Orbe 1: Esmeralda Superior */}
        <motion.div
          style={{ y: smoothBgOrb1 }}
          className="absolute -top-32 -right-32 w-[550px] h-[550px] bg-gradient-to-br from-emerald-400/15 via-teal-300/10 to-transparent rounded-full blur-[140px] transform-gpu will-change-transform"
        />

        {/* Orbe 2: Cyan Medio Izquierdo */}
        <motion.div
          style={{ y: smoothBgOrb2 }}
          className="absolute top-[40%] -left-40 w-[600px] h-[600px] bg-gradient-to-tr from-cyan-400/10 via-emerald-300/10 to-transparent rounded-full blur-[160px] transform-gpu will-change-transform"
        />

        {/* Orbe 3: Esmeralda Profundo Inferior */}
        <motion.div
          style={{ y: smoothBgOrb3 }}
          className="absolute bottom-10 right-10 w-[500px] h-[500px] bg-gradient-to-tl from-[#004D49]/12 via-teal-400/8 to-transparent rounded-full blur-[150px] transform-gpu will-change-transform"
        />

        {/* Cuadrícula sutil de ingeniería espacial */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#004D49_1px,transparent_1px),linear-gradient(to_bottom,#004D49_1px,transparent_1px)] bg-[size:4rem_4rem] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-[0.025]" />
      </div>

      {/* Indicador elástico superior de scroll */}
      <motion.div
        className="fixed top-0 left-0 right-0 h-[3px] bg-gradient-to-r from-emerald-500 via-teal-400 to-[#004D49] z-[100] origin-left shadow-[0_0_10px_rgba(16,185,129,0.5)]"
        style={{ scaleX }}
      />

      {/* =========================================================================
          1. HEADER FLOTANTE ULTRA-PREMIUM (GLASSMORPHISM CLARO)
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
            <a href="#caracteristicas" className="px-3.5 py-1.5 rounded-xl text-emerald-100/90 hover:text-white hover:bg-white/10 transition-all duration-200">
              Características
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
              type="button"
              onClick={() => onOpenAuth && onOpenAuth('affiliation')}
              className="hidden sm:inline-flex text-xs font-bold text-emerald-200 hover:text-white bg-white/5 hover:bg-white/15 px-3.5 py-2 rounded-xl border border-emerald-500/30 transition-all duration-200 cursor-pointer"
            >
              Afiliar Cochera
            </button>

            <motion.button
              type="button"
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
              type="button"
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
                href="#caracteristicas"
                onClick={() => setMobileMenuOpen(false)}
                className="block px-3.5 py-2.5 rounded-xl hover:bg-white/10 hover:text-white transition"
              >
                Características
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
                  type="button"
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
          2. HERO SECTION LUMINOSA CON PROFUNDIDAD Y RESPONSIVE FLUIDO
          ========================================================================= */}
      <section ref={heroRef} className="pt-14 sm:pt-20 pb-16 sm:pb-24 px-4 sm:px-6 lg:px-12 max-w-5xl mx-auto space-y-8 sm:space-y-10 text-center relative z-10">

        <motion.div
          style={{
            y: smoothHeroHeadlineY,
            opacity: heroOpacity,
            scale: smoothHeroScale
          }}
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: FLUID_EASE }}
          className="space-y-5 sm:space-y-6 flex flex-col items-center transform-gpu will-change-transform"
        >

          {/* Insignia Flotante Superior */}
          <div className="inline-flex items-center gap-2 bg-[#004D49]/10 border border-[#004D49]/20 text-[#004D49] text-xs font-mono font-bold px-4 py-1.5 rounded-full shadow-xs">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping inline-block" />
            <Zap className="w-3.5 h-3.5 text-[#004D49] shrink-0" />
            <span>SISTEMA INTELIGENTE DE ESTACIONAMIENTOS</span>
          </div>

          {/* Titular Principal Centrado */}
          <motion.h1
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2, ease: FLUID_EASE }}
            className="font-display font-extrabold text-3xl sm:text-5xl md:text-6xl lg:text-[62px] tracking-tight max-w-3xl mx-auto leading-[1.14] sm:leading-[1.08]"
          >
            <span className="bg-gradient-to-r from-[#002B29] via-[#004D49] to-[#002B29] bg-clip-text text-transparent">
              Ecosistema Inteligente de Estacionamientos en{' '}
            </span>
            <GradientTypewriter />
          </motion.h1>

          {/* Subtítulo Centrado */}
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.35, ease: FLUID_EASE }}
            className="text-sm sm:text-base md:text-lg text-[#003835]/80 max-w-2xl mx-auto font-medium leading-relaxed text-center px-2"
          >
            Conectamos a conductores en Ayacucho con estacionamientos disponibles en tiempo real, facilitando la reserva de tu sitio e ingreso directo.
          </motion.p>

          {/* LAS 2 TARJETAS PRINCIPALES DEL SISTEMA (3D TILT CARDS) */}
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.5, ease: FLUID_EASE }}
            className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-3xl mx-auto pt-4 text-left"
          >

            {/* OPCIÓN 1: CONDUCTORES / USUARIOS */}
            <DynamicTiltCard className="h-full">
              <div className="bg-white/95 backdrop-blur-md p-6 rounded-3xl border border-emerald-500/30 shadow-xl shadow-emerald-950/5 space-y-4 flex flex-col justify-between h-full group hover:border-emerald-600/60 transition-all duration-300">
                <div className="space-y-3">
                  <div className="w-11 h-11 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 flex items-center justify-center font-bold shadow-xs">
                    <Car className="w-6 h-6 text-emerald-700" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-slate-900 tracking-tight group-hover:text-emerald-800 transition">
                      Buscar & Reservar Plazas
                    </h3>
                    <p className="text-xs text-slate-600 leading-relaxed mt-1 font-sans">
                      Encuentra cocheras en Huamanga, elige tu sitio preferido en el mapa y accede directo reconociendo tu placa sin tickets.
                    </p>
                  </div>
                </div>

                <motion.a
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  href="#mapa"
                  className="w-full py-3 bg-[#004D49] hover:bg-[#003835] text-white text-xs font-bold rounded-xl transition flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-[#004D49]/20 mt-3"
                >
                  <span>Consultar Cocheras en Vivo</span>
                  <ArrowRight className="w-4 h-4 text-emerald-400" />
                </motion.a>
              </div>
            </DynamicTiltCard>

            {/* OPCIÓN 2: PROPIETARIOS DE COCHERAS */}
            <DynamicTiltCard className="h-full">
              <div className="bg-slate-900 text-white p-6 rounded-3xl border border-slate-800 shadow-xl shadow-slate-950/20 space-y-4 flex flex-col justify-between h-full group hover:border-emerald-500/50 transition-all duration-300">
                <div className="space-y-3">
                  <div className="w-11 h-11 rounded-2xl bg-emerald-400/20 border border-emerald-400/30 text-emerald-400 flex items-center justify-center font-bold shadow-xs">
                    <Building2 className="w-6 h-6 text-emerald-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-white tracking-tight group-hover:text-emerald-300 transition">
                      Afiliar mi Estacionamiento
                    </h3>
                    <p className="text-xs text-slate-300 leading-relaxed mt-1 font-sans">
                      Registra tu cochera, organiza tus espacios en el mapa digital, recibe reservas online y automatiza el cobro sin costo inicial.
                    </p>
                  </div>
                </div>

                <motion.button
                  type="button"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => onOpenAuth && onOpenAuth('affiliation')}
                  className="w-full py-3 bg-gradient-to-r from-emerald-400 to-teal-400 text-slate-950 text-xs font-black rounded-xl transition flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-emerald-400/20 mt-3"
                >
                  <Building2 className="w-4 h-4 text-slate-950" />
                  <span>Solicitar Afiliación de Cochera</span>
                </motion.button>
              </div>
            </DynamicTiltCard>

          </motion.div>
        </motion.div>

      </section>

      {/* =========================================================================
          2.5 BANDA DE MÉTRICAS EN VIVO CON GLASS ELEVATION CLARA
          ========================================================================= */}
      <CinematicScrollSection className="py-6 sm:py-8 px-4 sm:px-6 lg:px-12">
        <div className="max-w-5xl mx-auto bg-white/85 backdrop-blur-xl border border-[#004D49]/15 rounded-3xl shadow-[0_20px_45px_rgba(0,77,73,0.08)] grid grid-cols-2 md:grid-cols-4 divide-x divide-y md:divide-y-0 divide-[#004D49]/10 overflow-hidden">
          {[
            { value: `${Math.max(establishments.length, 0)}`, suffix: '', label: 'Cocheras conectadas en vivo' },
            { value: `${totalFreeSlots}`, suffix: '', label: 'Plazas libres ahora mismo' },
            { value: '98', suffix: '%', label: 'Ingresos con pase automático' },
            { value: '15', suffix: ' min', label: 'Tolerancia garantizada' }
          ].map((m, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.45, delay: i * 0.07, ease: FLUID_EASE }}
              className="p-5 sm:p-6 text-center group hover:bg-emerald-50/30 transition duration-300"
            >
              <div className="text-2xl sm:text-4xl font-display font-black text-[#002B29] tracking-tight">
                {m.value}<span className="text-[#004D49]">{m.suffix}</span>
              </div>
              <div className="mt-1 text-[10px] sm:text-xs text-[#004D49]/70 font-bold uppercase tracking-wide">
                {m.label}
              </div>
            </motion.div>
          ))}
        </div>
      </CinematicScrollSection>

      {/* =========================================================================
          3. DIRECTORIO Y MAPA EN VIVO EN HUAMANGA
          ========================================================================= */}
      <CinematicScrollSection id="mapa" className="py-12 sm:py-20 px-4 sm:px-6 lg:px-12 max-w-6xl mx-auto space-y-6 sm:space-y-8">

        {/* Encabezado Centrado */}
        <div className="max-w-3xl mx-auto text-center space-y-2 px-2">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-display font-extrabold text-[#002B29] tracking-tight">
            Estacionamientos Conectados en <span className="text-[#004D49]">Huamanga</span>
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
              className="w-full h-12 pl-11 pr-10 rounded-2xl bg-white/95 backdrop-blur-md border border-[#004D49]/15 text-sm font-medium text-[#002B29] placeholder:text-[#004D49]/40 shadow-sm focus-visible:ring-2 focus-visible:ring-emerald-500/40 focus-visible:border-emerald-500/50 transition"
            />
            {searchQuery && (
              <button
                type="button"
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
                type="button"
                onClick={() => setCategoryFilter(cat.id)}
                className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all duration-200 cursor-pointer ${
                  categoryFilter === cat.id
                    ? 'bg-[#004D49] text-white border-[#004D49] shadow-md shadow-[#004D49]/20'
                    : 'bg-white/85 text-[#004D49] border-[#004D49]/15 hover:border-emerald-500/50 hover:bg-white'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          <div className="flex items-center justify-center gap-2 pt-1 font-mono text-xs">
            <span className="relative flex w-2.5 h-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-60" />
              <span className="relative inline-flex rounded-full w-2.5 h-2.5 bg-emerald-500" />
            </span>
            <p className="text-[#004D49] font-semibold">
              {filteredParkings.length} {filteredParkings.length === 1 ? 'cochera coincide' : 'cocheras coinciden'} ·{' '}
              <strong className="font-black text-[#002B29]">{totalFreeSlots} plazas libres</strong> en la red
            </p>
          </div>
        </div>

        {/* Mapa Leaflet Interactivo */}
        <LazyMapSection
          parkings={filteredParkings}
          onSelectParking={(p) => {
            if (onSelectParking) onSelectParking(p);
          }}
        />

      </CinematicScrollSection>

      {/* =========================================================================
          3.5 CARACTERÍSTICAS & TECNOLOGÍA DEL SISTEMA (BENTO CARDS CLARAS)
          ========================================================================= */}
      <CinematicScrollSection id="caracteristicas" className="py-12 sm:py-20 px-4 sm:px-6 lg:px-12 max-w-6xl mx-auto space-y-8">
        
        <div className="max-w-2xl mx-auto text-center space-y-2 px-2">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-display font-extrabold text-[#002B29] tracking-tight">
            Tecnología Diseñada para <span className="text-[#004D49]">Smart Park</span>
          </h2>
          <p className="text-xs sm:text-sm text-[#004D49] max-w-lg mx-auto font-medium">
            Una plataforma moderna que combina trazado 3D, visión artificial y pasarelas de pago digitales.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Card 1: Navegación 3D */}
          <div className="bg-white/95 backdrop-blur-md p-6 rounded-3xl border border-[#004D49]/15 shadow-xl space-y-3 flex flex-col justify-between hover:border-emerald-500/50 transition">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 flex items-center justify-center">
              <Compass className="w-5 h-5 text-emerald-700" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 mb-1">Ruta 3D en Vivo</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Trazado con GPS en tiempo real, indicaciones por voz y elevación topográfica DEM.
              </p>
            </div>
          </div>

          {/* Card 2: Reconocimiento ANPR */}
          <div className="bg-white/95 backdrop-blur-md p-6 rounded-3xl border border-[#004D49]/15 shadow-xl space-y-3 flex flex-col justify-between hover:border-teal-500/50 transition">
            <div className="w-10 h-10 rounded-2xl bg-teal-500/10 border border-teal-500/30 text-teal-700 flex items-center justify-center">
              <Camera className="w-5 h-5 text-teal-700" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 mb-1">Acceso ANPR</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Detección automática de placas al llegar a la garita de control sin tickets impresos.
              </p>
            </div>
          </div>

          {/* Card 3: Pagos Multicanal */}
          <div className="bg-white/95 backdrop-blur-md p-6 rounded-3xl border border-[#004D49]/15 shadow-xl space-y-3 flex flex-col justify-between hover:border-cyan-500/50 transition">
            <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-700 flex items-center justify-center">
              <CreditCard className="w-5 h-5 text-cyan-700" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 mb-1">Pagos Digitales</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Pasarela segura con PayPal Express, Culqi, Yape, Plin y tarjetas bancarias.
              </p>
            </div>
          </div>

          {/* Card 4: Pase QR Instantáneo */}
          <div className="bg-white/95 backdrop-blur-md p-6 rounded-3xl border border-[#004D49]/15 shadow-xl space-y-3 flex flex-col justify-between hover:border-emerald-500/50 transition">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 flex items-center justify-center">
              <QrCode className="w-5 h-5 text-emerald-700" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 mb-1">Pase Digital QR</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Código QR encriptado generado al instante con ventana de tolerancia configurable.
              </p>
            </div>
          </div>

        </div>

      </CinematicScrollSection>

      {/* =========================================================================
          4. CÓMO FUNCIONA — EXPERIENCIA PASO A PASO
          ========================================================================= */}
      <CinematicScrollSection id="sistema" className="py-12 sm:py-20 px-4 sm:px-6 lg:px-12 max-w-6xl mx-auto space-y-8">

        {/* Encabezado Centrado */}
        <div className="max-w-2xl mx-auto text-center space-y-2 px-2">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-display font-extrabold text-[#002B29] tracking-tight">
            Estaciona rápido y <span className="text-[#004D49]">sin complicaciones</span>
          </h2>
          <p className="text-xs sm:text-sm text-[#004D49] max-w-lg mx-auto font-medium">
            Sin descargar aplicaciones pesadas. Todo funciona directo y seguro desde tu navegador móvil.
          </p>
        </div>

        {/* Pasos de Funcionamiento */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
          
          <div className="bg-white/95 p-6 rounded-3xl border border-[#004D49]/15 shadow-lg space-y-3 relative overflow-hidden">
            <div className="text-4xl font-mono font-black text-[#004D49]/20 absolute top-4 right-6">01</div>
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 flex items-center justify-center font-bold">
              <MapPin className="w-5 h-5 text-emerald-700" />
            </div>
            <h3 className="text-base font-bold text-slate-900">1. Elige tu Cochera</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Explora las sedes disponibles en el mapa interactivo de Ayacucho y consulta la tarifa por hora.
            </p>
          </div>

          <div className="bg-white/95 p-6 rounded-3xl border border-[#004D49]/15 shadow-lg space-y-3 relative overflow-hidden">
            <div className="text-4xl font-mono font-black text-[#004D49]/20 absolute top-4 right-6">02</div>
            <div className="w-10 h-10 rounded-2xl bg-teal-500/10 border border-teal-500/30 text-teal-700 flex items-center justify-center font-bold">
              <Car className="w-5 h-5 text-teal-700" />
            </div>
            <h3 className="text-base font-bold text-slate-900">2. Digita tu Placa</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Selecciona tu cajón preferido e ingresa tu número de placa para generar el pase en 2 segundos.
            </p>
          </div>

          <div className="bg-white/95 p-6 rounded-3xl border border-[#004D49]/15 shadow-lg space-y-3 relative overflow-hidden">
            <div className="text-4xl font-mono font-black text-[#004D49]/20 absolute top-4 right-6">03</div>
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 flex items-center justify-center font-bold">
              <QrCode className="w-5 h-5 text-emerald-700" />
            </div>
            <h3 className="text-base font-bold text-slate-900">3. Navega e Ingresa</h3>
            <p className="text-xs text-slate-600 leading-relaxed">
              Sigue la ruta 3D en tiempo real. Al llegar, la cámara ANPR abre la barrera o muestra tu Pase QR.
            </p>
          </div>

        </div>

      </CinematicScrollSection>

      {/* =========================================================================
          5. PREGUNTAS FRECUENTES (FAQS ACCORDION CLARO)
          ========================================================================= */}
      <CinematicScrollSection className="py-12 sm:py-20 px-4 sm:px-6 lg:px-12 max-w-4xl mx-auto space-y-8">

        <div className="text-center space-y-2">
          <h2 className="text-2xl sm:text-3xl font-display font-extrabold text-[#002B29] tracking-tight">
            Preguntas Frecuentes
          </h2>
          <p className="text-xs sm:text-sm text-[#004D49] font-medium">
            Resuelve tus dudas sobre el servicio de reserva y acceso.
          </p>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, i) => {
            const isOpen = activeFaq === i;
            return (
              <div
                key={i}
                className="bg-white/95 border border-[#004D49]/15 rounded-2xl overflow-hidden shadow-xs transition"
              >
                <button
                  type="button"
                  onClick={() => setActiveFaq(isOpen ? null : i)}
                  className="w-full p-5 text-left flex items-center justify-between font-bold text-xs sm:text-sm text-slate-800 hover:text-[#004D49] cursor-pointer"
                >
                  <span>{faq.q}</span>
                  <ChevronDown className={`w-4 h-4 text-[#004D49] transition-transform duration-200 shrink-0 ml-2 ${isOpen ? 'rotate-180' : ''}`} />
                </button>
                <AnimatePresence>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="px-5 pb-5 text-xs text-slate-600 leading-relaxed border-t border-slate-100 pt-3"
                    >
                      {faq.a}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>

      </CinematicScrollSection>

      {/* =========================================================================
          6. FOOTER ELEGANTE CLARO
          ========================================================================= */}
      <footer className="border-t border-[#004D49]/15 bg-[#002624] py-10 px-4 sm:px-6 lg:px-12 text-slate-300 text-xs z-10 relative">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-left">
          
          <div className="space-y-2 flex flex-col items-center md:items-start">
            <BrandLogo className="h-7 w-auto" dark={true} />
            <p className="text-[11px] text-emerald-200/80 max-w-sm">
              Ecosistema Inteligente de Estacionamientos de Ayacucho, Perú.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 text-xs font-semibold text-emerald-100/90">
            <a href="#mapa" className="hover:text-white transition">Directorio de Cocheras</a>
            <a href="#caracteristicas" className="hover:text-white transition">Características</a>
            <a href="#sistema" className="hover:text-white transition">Funcionamiento</a>
            <button
              type="button"
              onClick={() => onOpenTerms && onOpenTerms()}
              className="hover:text-white transition cursor-pointer"
            >
              Términos y Condiciones
            </button>
          </div>

          <div className="text-[11px] text-emerald-200/60 font-mono">
            © {new Date().getFullYear()} Smart Park. Todos los derechos reservados.
          </div>

        </div>
      </footer>

    </div>
  );
};
