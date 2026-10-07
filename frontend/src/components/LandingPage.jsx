import React, { useState, useMemo, useRef, useEffect } from 'react';
import { motion, useScroll, useSpring, useTransform, useMotionValue, AnimatePresence } from 'framer-motion';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

// Registrar plugins oficiales de GSAP
gsap.registerPlugin(useGSAP, ScrollTrigger);

import {
  Search,
  MapPin,
  Car,
  ShieldCheck,
  QrCode,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  Building2,
  ArrowRight,
  Navigation,
  Camera,
  CreditCard,
  LogIn,
  Layers,
  Clock,
  Zap,
  Menu,
  X,
  Sparkles,
  CheckCircle2,
  TrendingUp,
  Sun,
  Moon,
  Star,
  Quote,
  Radio,
  SlidersHorizontal,
  Compass,
  Check,
  Smartphone,
  ExternalLink,
  Crown
} from 'lucide-react';
import { Input } from './ui/input';
import { QRCodeSVG } from 'qrcode.react';
import { AyacuchoMap } from './AyacuchoMap';
import { BrandLogo } from './BrandLogo';
import { useTheme } from '../context/ThemeContext';
import { INITIAL_ESTABLISHMENTS } from '../context/EstablishmentContext';
import { SpotlightCard } from './ui/SpotlightCard';
import { BlurText } from './ui/BlurText';
import { CountUp } from './ui/CountUp';
import { TiltedCard } from './ui/TiltedCard';
import { AmbientGlow } from './ui/AmbientGlow';
import { Marquee } from './ui/Marquee';
import { BorderBeam } from './ui/BorderBeam';
import { DecryptedText } from './ui/DecryptedText';

// Curva elástica acelerada por hardware
const FLUID_EASE = [0.16, 1, 0.3, 1];

// Contenedor con efecto scroll reveal suave y espaciado compacto
const ScrollRevealSection = ({ children, className = '', id = '' }) => {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start']
  });

  const opacity = useTransform(scrollYProgress, [0, 0.12, 0.88, 1], [0, 1, 1, 0.96]);
  const y = useTransform(scrollYProgress, [0, 0.12, 0.88, 1], [20, 0, 0, -10]);
  const smoothOpacity = useSpring(opacity, { stiffness: 220, damping: 32 });
  const smoothY = useSpring(y, { stiffness: 220, damping: 32 });

  return (
    <motion.section
      ref={ref}
      id={id}
      style={{ opacity: smoothOpacity, y: smoothY }}
      className={className}
    >
      {children}
    </motion.section>
  );
};

// Botón magnético con micro-interacción
const MagneticButton = ({ children, onClick, className = '', type = 'button' }) => {
  const buttonRef = useRef(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const springX = useSpring(x, { stiffness: 350, damping: 25 });
  const springY = useSpring(y, { stiffness: 350, damping: 25 });

  const handleMouseMove = (e) => {
    if (!buttonRef.current) return;
    const rect = buttonRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    x.set((e.clientX - centerX) * 0.15);
    y.set((e.clientY - centerY) * 0.15);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  return (
    <motion.button
      ref={buttonRef}
      type={type}
      onClick={onClick}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ x: springX, y: springY }}
      className={`inline-flex items-center justify-center transform-gpu will-change-transform ${className}`}
    >
      {children}
    </motion.button>
  );
};

// Tarjeta con sutil inclinación 3D en hover
const DynamicTiltCard = ({ children, className = '' }) => {
  const cardRef = useRef(null);
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const [isTouchDevice, setIsTouchDevice] = useState(false);

  useEffect(() => {
    setIsTouchDevice('ontouchstart' in window || navigator.maxTouchPoints > 0);
  }, []);

  const rotateX = useSpring(useTransform(mouseY, [-0.5, 0.5], [5, -5]), { stiffness: 260, damping: 24 });
  const rotateY = useSpring(useTransform(mouseX, [-0.5, 0.5], [-5, 5]), { stiffness: 260, damping: 24 });

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
  const { theme, toggleTheme, isDark } = useTheme();

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeFaq, setActiveFaq] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [mapFilter, setMapFilter] = useState('all'); // 'all' | 'free' | 'historic'
  const [activeAudienceTab, setActiveAudienceTab] = useState('driver'); // 'driver' | 'owner'
  const [hoveredNav, setHoveredNav] = useState(null);


  // Lista garantizada de cocheras: prop establishments o iniciales de Huamanga
  const effectiveList = useMemo(() => {
    return Array.isArray(establishments) && establishments.length > 0
      ? establishments
      : (INITIAL_ESTABLISHMENTS || []);
  }, [establishments]);

  // Cocheras filtradas para el mapa interactivo según filtro rápido y búsqueda
  const mapParkings = useMemo(() => {
    let list = effectiveList;

    if (mapFilter === 'free') {
      const withFree = list.filter((p) => {
        const elements = Array.isArray(p.elements) ? p.elements : [];
        return elements.some((e) => e.type === 'slot' && e.status === 'free');
      });
      if (withFree.length > 0) list = withFree;
    } else if (mapFilter === 'historic') {
      const historic = list.filter((p) => {
        const addr = (p.address || '').toLowerCase();
        const name = (p.name || '').toLowerCase();
        return (
          addr.includes('plaza') ||
          addr.includes('28 de julio') ||
          addr.includes('portal') ||
          addr.includes('centro') ||
          addr.includes('sucre') ||
          name.includes('plaza') ||
          name.includes('centro')
        );
      });
      if (historic.length > 0) list = historic;
    }

    if (!searchTerm.trim()) return list;
    const q = searchTerm.toLowerCase();
    const filtered = list.filter((p) => 
      (p.name || '').toLowerCase().includes(q) || 
      (p.address || '').toLowerCase().includes(q)
    );
    return filtered.length > 0 ? filtered : list;
  }, [effectiveList, searchTerm, mapFilter]);

  // Estadísticas dinámicas de la red de Ayacucho
  const stats = useMemo(() => {
    const list = effectiveList;
    let freeSlots = 0;
    let totalSlots = 0;
    list.forEach((p) => {
      const elements = Array.isArray(p.elements) ? p.elements : [];
      const slots = elements.filter((e) => e.type === 'slot');
      totalSlots += slots.length;
      freeSlots += slots.filter((s) => s.status === 'free').length;
    });

    return {
      connectedParkings: Math.max(list.length, 12),
      freeSlots: Math.max(freeSlots, 48),
      avgRecognitionSecs: 1.8,
      toleranceMinutes: 15
    };
  }, [effectiveList]);

  // Scroll suave hacia una sección
  const scrollTo = (id) => {
    setMobileMenuOpen(false);
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  const landingRef = useRef(null);

  // Animaciones GSAP de alto impacto: revelado en scroll y Bento Grid
  useGSAP(() => {
    // 1. Entrada escalonada de las marcas aliadas en el Trust Bar
    gsap.from('.trust-partner-item', {
      scrollTrigger: {
        trigger: '.trust-partners-container',
        start: 'top 92%',
        toggleActions: 'play none none none'
      },
      opacity: 0,
      y: 12,
      duration: 0.5,
      stagger: 0.06,
      ease: 'power2.out'
    });

    // 4. Aparición limpia de las métricas tipográficas en las tarjetas Bento
    gsap.from('.bento-stat-val', {
      scrollTrigger: {
        trigger: '.bento-stat-val',
        start: 'top 90%',
        toggleActions: 'restart none none reset'
      },
      opacity: 0,
      y: 15,
      duration: 0.65,
      stagger: 0.15,
      ease: 'power3.out'
    });
  }, { scope: landingRef });

  return (
    <div ref={landingRef} className="min-h-screen bg-[#F8FAFC] dark:bg-[#06090F] text-slate-900 dark:text-slate-100 selection:bg-emerald-500 selection:text-white transition-colors duration-300 font-sans relative overflow-x-hidden">
      
      {/* Fondo Ambiental Sedoso con Orbes Orgánicos (Sin Puntos ni Cuadrículas) */}
      <AmbientGlow />

      {/* =========================================================================
          1. HEADER FULL-WIDTH CRISTAL ULTRA-ELEGANTE (TOP-0 NATIVO)
          ========================================================================= */}
      <header className="fixed top-0 left-0 right-0 z-50 w-full bg-slate-950/40 dark:bg-slate-950/60 backdrop-blur-xl border-b border-white/10 transition-all duration-300">
        <div className="responsive-shell safe-area-x h-18 sm:h-20 flex items-center justify-between gap-2">
          
          {/* Logotipo Oficial */}
          <div className="flex items-center gap-3">
            <BrandLogo dark={true} iconSize="w-7 h-7 sm:w-9 sm:h-9" textClassName="text-lg sm:text-2xl" />
          </div>

          {/* Enlaces de Navegación de Escritorio con Indicador Deslizante Elástico */}
          <nav
            onMouseLeave={() => setHoveredNav(null)}
            className="hidden lg:flex items-center gap-1 xl:gap-2 text-xs xl:text-sm font-semibold text-slate-200 tracking-wide p-1 rounded-full bg-white/5 border border-white/10 backdrop-blur-md"
          >
            {[
              { id: 'hero', label: 'Inicio' },
              { id: 'mapa', label: 'Mapa en Vivo' },
              { id: 'beneficios', label: 'Ventajas' },
              { id: 'tecnologia', label: 'Tecnología' },
              { id: 'faq', label: 'Preguntas' },
            ].map((item) => (
              <button
                key={item.id}
                onClick={() => scrollTo(item.id)}
                onMouseEnter={() => setHoveredNav(item.id)}
                className="relative px-3.5 py-1.5 rounded-full text-slate-200 hover:text-white transition-colors cursor-pointer"
              >
                {hoveredNav === item.id && (
                  <motion.span
                    layoutId="nav-hover-pill"
                    transition={{ type: 'spring', stiffness: 400, damping: 30 }}
                    className="absolute inset-0 rounded-full bg-white/15 border border-white/10 pointer-events-none"
                  />
                )}
                <span className="relative z-10">{item.label}</span>
              </button>
            ))}
          </nav>

          {/* Acciones de la Cabecera */}
          <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
            {/* Toggle de Tema */}
            <button
              type="button"
              onClick={toggleTheme}
              aria-label="Cambiar tema"
              className="hidden sm:flex w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-slate-200 items-center justify-center hover:scale-105 transition cursor-pointer border border-white/10 backdrop-blur-md"
            >
              {isDark ? <Sun className="w-4 h-4 text-amber-300" /> : <Moon className="w-4 h-4 text-slate-200" />}
            </button>

            {/* Botón Ingresar */}
            <button
              type="button"
              onClick={() => onOpenAuth && onOpenAuth('login')}
              className="hidden lg:inline-flex items-center gap-1.5 px-3.5 py-2.5 rounded-full text-xs sm:text-sm font-bold text-slate-200 hover:text-white hover:bg-white/10 transition cursor-pointer"
            >
              <LogIn className="w-3.5 h-3.5 text-emerald-400" />
              Ingresar
            </button>

            {/* Botón CTA Afiliar Cochera */}
            <MagneticButton
              onClick={() => onOpenAuth && onOpenAuth('affiliation')}
              className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 px-3 py-2.5 sm:px-5 rounded-full text-xs sm:text-sm font-black shadow-lg shadow-emerald-500/25 hover:scale-105 transition cursor-pointer whitespace-nowrap"
            >
              <span className="sm:hidden">Afiliar</span>
              <span className="hidden sm:inline">Afiliar Cochera</span>
            </MagneticButton>

            {/* Menú Móvil Hamburger */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="lg:hidden w-10 h-10 flex items-center justify-center text-slate-200 hover:text-white bg-white/10 rounded-full shrink-0"
              aria-label="Abrir menú"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Drawer Móvil Desplegable */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="lg:hidden bg-slate-950/95 backdrop-blur-2xl border-b border-white/10 safe-area-x py-5 shadow-2xl space-y-4 max-h-[calc(100dvh-4.5rem)] overflow-y-auto"
            >
              <div className="flex flex-col gap-3 text-sm font-semibold text-slate-200">
                <button onClick={() => { setMobileMenuOpen(false); scrollTo('hero'); }} className="text-left py-1.5 border-b border-white/10">
                  Inicio
                </button>
                <button onClick={() => { setMobileMenuOpen(false); scrollTo('mapa'); }} className="text-left py-1.5 border-b border-white/10">
                  Mapa en Vivo
                </button>
                <button onClick={() => { setMobileMenuOpen(false); scrollTo('beneficios'); }} className="text-left py-1.5 border-b border-white/10">
                  Ventajas
                </button>
                <button onClick={() => { setMobileMenuOpen(false); scrollTo('tecnologia'); }} className="text-left py-1.5 border-b border-white/10">
                  Tecnología
                </button>
                <button onClick={() => { setMobileMenuOpen(false); scrollTo('faq'); }} className="text-left py-1.5">
                  Preguntas Frecuentes
                </button>
              </div>
              <div className="pt-2 flex flex-col gap-2 border-t border-white/10">
                <button
                  type="button"
                  onClick={toggleTheme}
                  className="w-full py-2.5 rounded-full bg-white/10 text-white text-xs font-bold flex items-center justify-center gap-2"
                >
                  {isDark ? <Sun className="w-4 h-4 text-amber-300" /> : <Moon className="w-4 h-4 text-slate-200" />}
                  Cambiar tema
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onOpenAuth && onOpenAuth('login');
                  }}
                  className="w-full py-2.5 rounded-full bg-white/10 text-white text-xs font-bold flex items-center justify-center gap-2"
                >
                  <LogIn className="w-3.5 h-3.5 text-emerald-400" />
                  Iniciar Sesión
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onOpenAuth && onOpenAuth('affiliation');
                  }}
                  className="w-full py-2.5 rounded-full bg-emerald-500 text-slate-950 text-xs font-black shadow-md hover:bg-emerald-400 transition"
                >
                  Afiliar mi Cochera
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* =========================================================================
          2. HERO CINEMÁTICO: ULTRA LIMPIO, VENDEDOR Y DE ALTO IMPACTO
          ========================================================================= */}
      <main id="hero" className="relative w-full min-h-[100svh] lg:min-h-screen flex items-center overflow-hidden bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-white transition-colors duration-300">
        
        {/* Video de Fondo Operacional full-bleed con nitidez absoluta */}
        <video
          src="/videos/smart-park-demo.mp4"
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          ref={(el) => {
            if (el) {
              el.muted = true;
              el.play().catch(() => {});
            }
          }}
          className="absolute inset-0 w-full h-full object-cover pointer-events-none z-0 scale-105 opacity-100 filter brightness-[0.92] dark:brightness-[0.80] contrast-[1.03] transition-all duration-500"
        />

        {/* Scrim lateral sutil detrás del texto: garantiza contraste y letras blancas nítidas dejando el video visible y luminoso en el resto */}
        <div className="absolute inset-0 bg-gradient-to-r from-slate-950/85 via-slate-950/40 to-transparent pointer-events-none z-0" />
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950/35 via-transparent to-slate-950/20 pointer-events-none z-0" />

        {/* Contenido Editorial Limpio del Hero */}
        <div className="relative z-10 responsive-shell safe-area-x pt-28 pb-24 sm:pt-36 sm:pb-28">
          <div className="max-w-2xl lg:max-w-3xl 2xl:max-w-4xl space-y-5 sm:space-y-6 text-left">
            
            {/* Titular Principal Limpio con BlurText */}
            <h1 className="text-[clamp(2.5rem,8.5vw,4.5rem)] 2xl:text-[5.25rem] min-[2200px]:text-[6rem] font-black tracking-[-0.035em] leading-[1.03] text-white drop-shadow-[0_4px_24px_rgba(0,0,0,0.9)] text-balance">
              <BlurText
                text="Estaciona al instante,"
                delay={40}
                className="block"
              />
              <span className="text-emerald-400 block mt-1">
                <BlurText
                  text="sin vueltas ni tickets"
                  delay={50}
                  className="text-emerald-400"
                />
              </span>
            </h1>

            {/* Explicación directa y comercial del sistema */}
            <p className="text-base sm:text-xl 2xl:text-2xl text-slate-100/95 max-w-[62ch] leading-relaxed font-normal drop-shadow-[0_2px_8px_rgba(0,0,0,0.85)]">
              Encuentra cocheras con espacios libres en vivo, reserva tu lugar en segundos y paga solo por los minutos que uses con Yape, Plin o tarjeta.
            </p>

            {/* Botones de Acción */}
            <div className="pt-2 flex flex-col sm:flex-row sm:flex-wrap items-stretch sm:items-center justify-start gap-3 sm:gap-4 max-w-sm sm:max-w-none">
              <MagneticButton
                onClick={() => scrollTo('mapa')}
                className="w-full sm:w-auto justify-center bg-emerald-500 hover:bg-emerald-400 text-slate-950 px-7 py-3.5 sm:px-10 sm:py-4 rounded-full text-sm sm:text-base font-black shadow-xl shadow-emerald-500/25 hover:scale-105 transition cursor-pointer flex items-center gap-2.5"
              >
                <Search className="w-4 h-4 sm:w-5 sm:h-5 text-slate-950" />
                Buscar Cochera Libre
              </MagneticButton>

              <button
                type="button"
                onClick={() => onOpenAuth && onOpenAuth('login')}
                className="w-full sm:w-auto justify-center inline-flex items-center gap-2 text-sm sm:text-base font-bold text-white hover:text-emerald-300 border-2 border-white/80 hover:border-emerald-400 bg-black/30 hover:bg-black/40 backdrop-blur-md px-7 py-3 sm:px-8 sm:py-3.5 rounded-full transition-all cursor-pointer shadow-lg drop-shadow-[0_2px_8px_rgba(0,0,0,0.7)]"
              >
                Pagar / Consultar Estadía
                <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform text-emerald-400" />
              </button>
            </div>

            {/* Telemetría en Vivo Limpia y Profesional (Sin Badges ni Slop) */}
            <div className="pt-4 flex flex-wrap items-center gap-6 sm:gap-8 text-slate-300/90 text-xs sm:text-sm font-medium border-t border-white/10 max-w-xl">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>
                  <strong className="text-white font-mono font-bold">
                    <CountUp to={stats.freeSlots} duration={1.2} />
                  </strong> plazas libres ahora
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-slate-500">•</span>
                <span>
                  <strong className="text-white font-mono font-bold">
                    <CountUp to={stats.connectedParkings} duration={1.2} />
                  </strong> sedes activas
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-slate-500">•</span>
                <span>
                  <strong className="text-white font-mono font-bold">
                    &lt; <CountUp to={stats.avgRecognitionSecs} decimals={1} duration={1} />s
                  </strong> acceso LPR
                </span>
              </div>
            </div>

          </div>
        </div>

        {/* Pestaña curva insignia de bienvenida estilo Smart Parking */}
        <div className="absolute bottom-0 left-0 right-0 z-20 flex justify-center pointer-events-none translate-y-[1px]">
          <div className="relative pointer-events-auto flex flex-col items-center">
            <div className="relative text-[#F8FAFC] dark:text-[#06090F] flex items-center justify-center">
              <svg 
                viewBox="0 0 600 64" 
                className="w-[300px] sm:w-[460px] md:w-[580px] h-[36px] sm:h-[48px] md:h-[56px] drop-shadow-[0_-4px_16px_rgba(0,0,0,0.12)] dark:drop-shadow-[0_-4px_24px_rgba(0,0,0,0.4)]" 
                preserveAspectRatio="none"
              >
                <path 
                  d="M 0,64 C 45,64 55,0 110,0 L 490,0 C 545,0 555,64 600,64 Z" 
                  fill="currentColor" 
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center pt-2 sm:pt-3">
                <span className="text-[10px] sm:text-xs md:text-sm font-black tracking-[0.25em] text-emerald-600 dark:text-emerald-400 uppercase select-none">
                  BIENVENIDO A SMART PARK
                </span>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* =========================================================================
          3. SECCIÓN 2: MAPA EN VIVO DE AYACUCHO (COLOCADO COMO SEGUNDO)
          ========================================================================= */}
      <ScrollRevealSection id="mapa" className="responsive-shell safe-area-x pt-10 2xl:pt-14 pb-6 w-full text-left">
        {/* Encabezado Editorial Integrado estilo Smart Parking */}
        <div className="text-center max-w-3xl mx-auto mb-8 space-y-2">
          <h2 className="text-2xl sm:text-4xl font-black tracking-tight text-slate-900 dark:text-white">
            Un sistema integral e inteligente para una movilidad sin fricción
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-2xl mx-auto leading-relaxed">
            Visualiza plazas disponibles en tiempo real, reserva tu espacio antes de salir y accede al instante mediante lectura automática de matrículas.
          </p>
        </div>

        <div className="flex flex-col md:flex-row md:items-end justify-between mb-5 gap-3">
          <div>
            <h3 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white">
              Cocheras Afiliadas en Ayacucho
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-0.5 max-w-xl">
              Haz clic en cualquier establecimiento para visualizar su plano CAD 2D y reservar plaza al instante.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full md:w-auto">
            {/* Filtros rápidos minimalistas */}
            <div className="inline-flex p-1 bg-slate-100 dark:bg-slate-900/90 rounded-full border border-slate-200 dark:border-slate-800 self-start sm:self-auto">
              <button
                type="button"
                onClick={() => setMapFilter('all')}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition cursor-pointer ${
                  mapFilter === 'all'
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Todas ({effectiveList.length})
              </button>
              <button
                type="button"
                onClick={() => setMapFilter('free')}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition cursor-pointer ${
                  mapFilter === 'free'
                    ? 'bg-white dark:bg-slate-800 text-emerald-600 dark:text-emerald-400 shadow-xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Con plazas libres
              </button>
              <button
                type="button"
                onClick={() => setMapFilter('historic')}
                className={`px-3 py-1 rounded-full text-xs font-semibold transition cursor-pointer ${
                  mapFilter === 'historic'
                    ? 'bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                Centro histórico
              </button>
            </div>

            <div className="w-full sm:w-60">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <Input
                  type="text"
                  placeholder="Buscar calle o cochera..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8 pr-3 py-1.5 rounded-full text-xs bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="rounded-[28px] sm:rounded-[36px] overflow-hidden border border-slate-200/80 dark:border-slate-800/80 shadow-xl bg-white dark:bg-slate-900 p-2 sm:p-3">
          <AyacuchoMap
            parkings={mapParkings}
            establishments={mapParkings}
            onSelectParking={(p) => onSelectParking && onSelectParking(p)}
            onQuickReservation={(p) => onSelectParking && onSelectParking(p)}
          />
        </div>
      </ScrollRevealSection>

      {/* =========================================================================
          4. SECCIÓN 3: DUAL BENTO CARDS (LIMPIO & MINIMALISTA)
          ========================================================================= */}
      <ScrollRevealSection className="responsive-shell safe-area-x py-10 2xl:py-14 w-full text-left">
        <div className="mb-7 max-w-2xl">
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
            Saca el Máximo Provecho a Cada Minuto
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
            Herramientas diseñadas tanto para el conductor diario como para la administración de cocheras.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
          
          {/* Tarjeta 1: Red Unificada de Cocheras (SpotlightCard) */}
          <SpotlightCard
            spotlightColor="rgba(16, 185, 129, 0.12)"
            className="group p-7 sm:p-8 flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 transition-all duration-300 shadow-xs hover:-translate-y-0.5"
          >
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 dark:bg-emerald-500/15 flex items-center justify-center transition-transform duration-300 group-hover:scale-105">
                <Layers className="w-5 h-5 text-emerald-600 dark:text-emerald-400 transition-transform duration-300 group-hover:-rotate-6" strokeWidth={1.8} />
              </div>
              
              <div>
                <h3 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                  Red Unificada de Cocheras
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">
                  Gestiona tus accesos, recibos electrónicos y reservas en múltiples sedes de Huamanga desde una única plataforma digital.
                </p>
              </div>
            </div>

            <div className="pt-7 sm:pt-8 flex items-end justify-between border-t border-slate-100 dark:border-slate-800/80 mt-7 sm:mt-8">
              <button
                type="button"
                onClick={() => scrollTo('mapa')}
                className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer group/link"
              >
                Explorar directorio
                <ArrowRight className="w-3.5 h-3.5 transition-transform duration-200 group-hover/link:translate-x-1" />
              </button>

              <div className="text-right">
                <span className="bento-stat-val block text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight font-mono">
                  +<CountUp to={stats.connectedParkings} duration={1.2} />
                </span>
                <span className="block text-[11px] text-slate-400 dark:text-slate-500 font-medium">
                  Sedes en Ayacucho
                </span>
              </div>
            </div>
          </SpotlightCard>

          {/* Tarjeta 2: Telemetría y Control en Tiempo Real (SpotlightCard) */}
          <SpotlightCard
            spotlightColor="rgba(16, 185, 129, 0.12)"
            className="group p-7 sm:p-8 flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 transition-all duration-300 shadow-xs hover:-translate-y-0.5"
          >
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 dark:bg-emerald-500/15 flex items-center justify-center transition-transform duration-300 group-hover:scale-105">
                <Radio className="w-5 h-5 text-emerald-600 dark:text-emerald-400 transition-transform duration-300 group-hover:rotate-6" strokeWidth={1.8} />
              </div>
              
              <div>
                <h3 className="text-xl sm:text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                  Telemetría y Control en Tiempo Real
                </h3>
                <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 mt-2 leading-relaxed">
                  Visualiza la ocupación exacta plaza por plaza, con reconocimiento de placa por visión computacional y sincronización en la nube.
                </p>
              </div>
            </div>

            <div className="pt-7 sm:pt-8 flex items-end justify-between border-t border-slate-100 dark:border-slate-800/80 mt-7 sm:mt-8">
              <button
                type="button"
                onClick={() => scrollTo('tecnologia')}
                className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer group/link"
              >
                Ver arquitectura tecnológica
                <ArrowRight className="w-3.5 h-3.5 transition-transform duration-200 group-hover/link:translate-x-1" />
              </button>

              <div className="text-right">
                <span className="bento-stat-val block text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight font-mono">
                  &lt;&nbsp;<CountUp to={stats.avgRecognitionSecs} decimals={1} duration={1} />s
                </span>
                <span className="block text-[11px] text-slate-400 dark:text-slate-500 font-medium">
                  Acceso automatizado
                </span>
              </div>
            </div>
          </SpotlightCard>

        </div>
      </ScrollRevealSection>

      {/* =========================================================================
          5. SECCIÓN 4: VENTAJAS EXCLUSIVAS (ICONOGRAFÍA MINIMALISTA)
          ========================================================================= */}
      <ScrollRevealSection id="beneficios" className="responsive-shell safe-area-x py-10 2xl:py-14 w-full">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 text-left items-start">
          
          {/* Columna Izquierda */}
          <div className="lg:col-span-4 space-y-3">
            <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight text-slate-900 dark:text-white">
              Ventajas del Sistema
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              Diseñado minuciosamente para resolver la congestión en el centro histórico de Ayacucho, eliminando la incertidumbre de encontrar estacionamiento seguro.
            </p>
            <div className="pt-1">
              <button
                type="button"
                onClick={() => onOpenAuth && onOpenAuth('affiliation')}
                className="text-xs sm:text-sm font-bold text-emerald-600 dark:text-emerald-400 hover:underline cursor-pointer"
              >
                Afilia tu cochera en 24 horas →
              </button>
            </div>
          </div>

          {/* Columna Derecha: Cuadrícula 2x2 Limpia con SpotlightCards */}
          <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-5 sm:gap-6">
            
            <SpotlightCard
              spotlightColor="rgba(16, 185, 129, 0.08)"
              className="group p-5 sm:p-6 space-y-3 hover:border-slate-300 dark:hover:border-slate-700 transition-all duration-300 hover:-translate-y-0.5"
            >
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/15 flex items-center justify-center transition-transform duration-300 group-hover:scale-110">
                <Clock className="w-4.5 h-4.5 text-emerald-600 dark:text-emerald-400 transition-transform duration-300 group-hover:-rotate-12" />
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                  15 Minutos de Tolerancia
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mt-1">
                  Ventana de llegada garantizada. Tu cupo permanece reservado y protegido contra cancelaciones.
                </p>
              </div>
            </SpotlightCard>

            <SpotlightCard
              spotlightColor="rgba(16, 185, 129, 0.08)"
              className="group p-5 sm:p-6 space-y-3 hover:border-slate-300 dark:hover:border-slate-700 transition-all duration-300 hover:-translate-y-0.5"
            >
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/15 flex items-center justify-center transition-transform duration-300 group-hover:scale-110">
                <Camera className="w-4.5 h-4.5 text-emerald-600 dark:text-emerald-400 transition-transform duration-300 group-hover:scale-105" />
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                  Cámara LPR & Visión AI
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mt-1">
                  Apertura automática de barrera en garita mediante lectura de placas en menos de 2 segundos.
                </p>
              </div>
            </SpotlightCard>

            <SpotlightCard
              spotlightColor="rgba(16, 185, 129, 0.08)"
              className="group p-5 sm:p-6 space-y-3 hover:border-slate-300 dark:hover:border-slate-700 transition-all duration-300 hover:-translate-y-0.5"
            >
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/15 flex items-center justify-center transition-transform duration-300 group-hover:scale-110">
                <CreditCard className="w-4.5 h-4.5 text-emerald-600 dark:text-emerald-400 transition-transform duration-300 group-hover:rotate-6" />
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                  Tarifas Justas al Minuto
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mt-1">
                  Paga exactamente los minutos utilizados vía Yape, Plin o tarjeta con boleta electrónica.
                </p>
              </div>
            </SpotlightCard>

            <SpotlightCard
              spotlightColor="rgba(16, 185, 129, 0.08)"
              className="group p-5 sm:p-6 space-y-3 hover:border-slate-300 dark:hover:border-slate-700 transition-all duration-300 hover:-translate-y-0.5"
            >
              <div className="w-9 h-9 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/15 flex items-center justify-center transition-transform duration-300 group-hover:scale-110">
                <QrCode className="w-4.5 h-4.5 text-emerald-600 dark:text-emerald-400 transition-transform duration-300 group-hover:-rotate-6" />
              </div>
              <div>
                <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                  Pase QR 100% Offline
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mt-1">
                  ¿Sin señal en el sótano? Guarda tu pase en el teléfono y accede sin depender de datos móviles.
                </p>
              </div>
            </SpotlightCard>

          </div>

        </div>
      </ScrollRevealSection>

      {/* =========================================================================
          6. SECCIÓN 5: NUESTROS ALIADOS / MARQUEE INFINITO SUAVE
          ========================================================================= */}
      <section className="responsive-shell safe-area-x py-6 w-full text-center border-y border-slate-200/60 dark:border-slate-800/60 my-5">
        <h3 className="text-[10px] sm:text-xs uppercase font-bold tracking-wider text-slate-400 dark:text-slate-500 mb-3">
          Ecosistema Conectado a los Principales Medios del Perú
        </h3>
        <Marquee speed={28} pauseOnHover={true} className="py-1">
          <span className="text-slate-400 dark:text-slate-400 hover:text-emerald-500 dark:hover:text-emerald-400 font-bold text-xs sm:text-sm tracking-wide transition-colors cursor-default select-none px-2">Yape</span>
          <span className="text-slate-400 dark:text-slate-400 hover:text-emerald-500 dark:hover:text-emerald-400 font-bold text-xs sm:text-sm tracking-wide transition-colors cursor-default select-none px-2">Plin</span>
          <span className="text-slate-400 dark:text-slate-400 hover:text-emerald-500 dark:hover:text-emerald-400 font-bold text-xs sm:text-sm tracking-wide transition-colors cursor-default select-none px-2">Visa</span>
          <span className="text-slate-400 dark:text-slate-400 hover:text-emerald-500 dark:hover:text-emerald-400 font-bold text-xs sm:text-sm tracking-wide transition-colors cursor-default select-none px-2">Mastercard</span>
          <span className="text-slate-400 dark:text-slate-400 hover:text-emerald-500 dark:hover:text-emerald-400 font-bold text-xs sm:text-sm tracking-wide transition-colors cursor-default select-none px-2">BCP</span>
          <span className="text-slate-400 dark:text-slate-400 hover:text-emerald-500 dark:hover:text-emerald-400 font-bold text-xs sm:text-sm tracking-wide transition-colors cursor-default select-none px-2">BBVA</span>
          <span className="text-slate-400 dark:text-slate-400 hover:text-emerald-500 dark:hover:text-emerald-400 font-bold text-xs sm:text-sm tracking-wide transition-colors cursor-default select-none px-2">Interbank</span>
          <span className="text-slate-400 dark:text-slate-400 hover:text-emerald-500 dark:hover:text-emerald-400 font-bold text-xs sm:text-sm tracking-wide transition-colors cursor-default select-none px-2">SAT Huamanga</span>
        </Marquee>
      </section>

      {/* =========================================================================
          7. SECCIÓN 6: CONTRAST DARK ISLAND BANNER (LIMPIO & EXPANSIVO)
          ========================================================================= */}
      <ScrollRevealSection className="responsive-shell safe-area-x py-8 2xl:py-12 w-full">
        <div className="relative rounded-[28px] sm:rounded-[40px] bg-gradient-to-br from-[#0B1324] via-[#070B14] to-[#04060A] text-white p-6 sm:p-10 lg:p-14 overflow-hidden border border-slate-800 dark:border-emerald-500/20 text-left shadow-2xl">
          <div className="absolute -right-16 -top-16 w-80 h-80 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -left-16 -bottom-16 w-64 h-64 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
          
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center relative z-10">
            <div className="md:col-span-7 space-y-4">
              <h2 className="text-2xl sm:text-3xl lg:text-4xl font-black tracking-tight leading-tight">
                Mantén el pulso de tu estadía y tarifa en tiempo real
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 max-w-lg leading-relaxed">
                Recibe notificaciones antes de que finalice tu tiempo, extiende tu reserva o abre navegación en Google Maps.
              </p>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => scrollTo('mapa')}
                  className="bg-white hover:bg-slate-100 text-slate-950 dark:bg-emerald-500 dark:hover:bg-emerald-400 dark:text-slate-950 px-6 py-2.5 rounded-full text-xs sm:text-sm font-black transition cursor-pointer shadow-lg"
                >
                  Buscar mi plaza ahora
                </button>
              </div>
            </div>

            <div className="md:col-span-5 flex justify-center">
              <TiltedCard maxTilt={8} className="w-[240px] sm:w-[260px]">
                <div className="bg-slate-950/90 border border-slate-800/90 rounded-3xl p-5 shadow-2xl backdrop-blur-md space-y-3 relative overflow-hidden group">
                  {/* Rayo de luz perimetral elegante sin badges */}
                  <BorderBeam size={180} duration={12} colorFrom="#10b981" colorTo="#06b6d4" />

                  <div className="flex items-center justify-between border-b border-slate-800/80 pb-2.5 relative z-10">
                    <div>
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Pase Digital</span>
                      <DecryptedText text="#SP-AYAC-2026" className="text-xs font-mono font-bold text-emerald-400" />
                    </div>
                    <div className="text-right">
                      <span className="text-[9px] text-slate-500 block uppercase">Tarifa</span>
                      <span className="text-sm font-black text-white">S/ 3.50/h</span>
                    </div>
                  </div>

                  <div className="theme-preserve-white w-28 h-28 bg-white p-2.5 rounded-2xl mx-auto flex items-center justify-center shadow-inner relative z-10">
                    <QRCodeSVG value="SMART-PARK-DEMO-PASS" size={96} />
                  </div>

                  <div className="space-y-1.5 text-center pt-1 relative z-10">
                    <div className="text-[11px] font-bold text-emerald-400 bg-emerald-500/10 py-1 px-2 rounded-full border border-emerald-500/20 flex items-center justify-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      Tolerancia activa: 14:58 min
                    </div>
                    <div className="text-[10px] text-slate-400 font-medium">
                      Cochera Plaza Mayor · Plaza A-04
                    </div>
                    <div className="text-[9px] font-mono text-slate-500 tracking-wider">
                      PLACA:{' '}
                      <DecryptedText text="AY-8842" className="text-slate-200 font-bold" />
                    </div>
                  </div>
                </div>
              </TiltedCard>
            </div>
          </div>
        </div>
      </ScrollRevealSection>

      {/* =========================================================================
          8. SECCIÓN 7: DOBLE PERSPECTIVA: CONDUCTORES VS DUEÑOS DE COCHERA
          ========================================================================= */}
      <ScrollRevealSection id="tecnologia" className="responsive-shell safe-area-x py-8 2xl:py-12 w-full text-left">
        <div className="text-center max-w-xl mx-auto mb-6 space-y-2.5">
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
            Diseñado para Todo el Ecosistema
          </h2>
          <div className="inline-flex p-1 bg-slate-100 dark:bg-slate-800 rounded-full border border-slate-200/50 dark:border-slate-700/60">
            <button
              type="button"
              onClick={() => setActiveAudienceTab('driver')}
              className={`px-4 py-1.5 rounded-full text-xs sm:text-sm font-bold transition cursor-pointer ${
                activeAudienceTab === 'driver'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Para Conductores
            </button>
            <button
              type="button"
              onClick={() => setActiveAudienceTab('owner')}
              className={`px-4 py-1.5 rounded-full text-xs sm:text-sm font-bold transition cursor-pointer ${
                activeAudienceTab === 'owner'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Para Dueños de Cochera
            </button>
          </div>
        </div>

        <div className="bg-transparent min-h-[160px]">
          <AnimatePresence mode="wait">
            {activeAudienceTab === 'driver' ? (
              <motion.div
                key="driver"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.25, ease: FLUID_EASE }}
                className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6"
              >
                <SpotlightCard
                  spotlightColor="rgba(16, 185, 129, 0.08)"
                  className="group p-5 sm:p-6 space-y-2 hover:border-slate-300 dark:hover:border-slate-700 transition-all duration-300 hover:-translate-y-0.5"
                >
                  <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white transition-colors group-hover:text-emerald-500">Cero Vueltas Inútiles</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    Sabrás de antemano si hay cupos libres antes de llegar a la zona céntrica de Ayacucho.
                  </p>
                </SpotlightCard>

                <SpotlightCard
                  spotlightColor="rgba(16, 185, 129, 0.08)"
                  className="group p-5 sm:p-6 space-y-2 hover:border-slate-300 dark:hover:border-slate-700 transition-all duration-300 hover:-translate-y-0.5"
                >
                  <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white transition-colors group-hover:text-emerald-500">Entrada Ágil con Placa</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    Sin tickets de papel que se pierden. Tu placa registrada activa la barrera en garita.
                  </p>
                </SpotlightCard>

                <SpotlightCard
                  spotlightColor="rgba(16, 185, 129, 0.08)"
                  className="group p-5 sm:p-6 space-y-2 hover:border-slate-300 dark:hover:border-slate-700 transition-all duration-300 hover:-translate-y-0.5"
                >
                  <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white transition-colors group-hover:text-emerald-500">Facturación Digital</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    Recibe tus boletas o facturas automáticamente en tu historial y por correo electrónico.
                  </p>
                </SpotlightCard>
              </motion.div>
            ) : (
              <motion.div
                key="owner"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.25, ease: FLUID_EASE }}
                className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6"
              >
                <SpotlightCard
                  spotlightColor="rgba(16, 185, 129, 0.08)"
                  className="group p-5 sm:p-6 space-y-2 hover:border-slate-300 dark:hover:border-slate-700 transition-all duration-300 hover:-translate-y-0.5"
                >
                  <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white transition-colors group-hover:text-emerald-500">Cero Fugas de Dinero</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    Cada entrada y salida queda auditada en la nube con foto del vehículo y cálculo automático.
                  </p>
                </SpotlightCard>

                <SpotlightCard
                  spotlightColor="rgba(16, 185, 129, 0.08)"
                  className="group p-5 sm:p-6 space-y-2 hover:border-slate-300 dark:hover:border-slate-700 transition-all duration-300 hover:-translate-y-0.5"
                >
                  <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white transition-colors group-hover:text-emerald-500">Plano CAD 2D Flexible</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    Dibuja y reordena tus plazas de autos, camionetas y motos en nuestro editor interactivo en minutos.
                  </p>
                </SpotlightCard>

                <SpotlightCard
                  spotlightColor="rgba(16, 185, 129, 0.08)"
                  className="group p-5 sm:p-6 space-y-2 hover:border-slate-300 dark:hover:border-slate-700 transition-all duration-300 hover:-translate-y-0.5"
                >
                  <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white transition-colors group-hover:text-emerald-500">Reportes y Arqueo</h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                    Cierres de caja automáticos por turno de garita, liquidaciones y analíticas de rentabilidad.
                  </p>
                </SpotlightCard>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </ScrollRevealSection>

      {/* =========================================================================
          9. PREGUNTAS FRECUENTES (FAQ ACORDEÓN COMPACTO)
          ========================================================================= */}
      <ScrollRevealSection id="faq" className="py-10 px-4 sm:px-6 lg:px-8 max-w-5xl mx-auto w-full text-left">
        <div className="text-center mb-6">
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
            Preguntas Frecuentes
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Todo lo que necesitas saber antes de empezar.
          </p>
        </div>

        <div className="space-y-3">
          {[
            {
              q: '¿Cómo funciona la tolerancia de 15 minutos al reservar?',
              a: 'Cuando reservas una plaza, el sistema bloquea el cupo exclusivamente para tu vehículo durante 15 minutos sin recargos. Si llegas dentro de este lapso, tu plaza estará garantizada.'
            },
            {
              q: '¿Qué ocurre si no tengo señal de celular al llegar a la cochera?',
              a: 'No te preocupes. Al confirmar la reserva, puedes guardar el Pase Digital QR en tu galería o abrirlo sin conexión. El escáner óptico de garita lo valida al instante.'
            },
            {
              q: '¿Cómo afilio mi cochera a la red Smart-Park?',
              a: 'Solo debes hacer clic en "Afiliar Cochera", completar los datos básicos de tu establecimiento y nuestro equipo activará tu sede con cámaras LPR o sistema QR en menos de 24 horas.'
            },
            {
              q: '¿Cuáles son los métodos de pago aceptados?',
              a: 'Aceptamos Yape, Plin, tarjetas de débito/crédito (Visa, Mastercard) y cobro en efectivo directamente en la garita con comprobante digital.'
            }
          ].map((item, idx) => {
            const isOpen = activeFaq === idx;
            return (
              <div
                key={idx}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden shadow-sm"
              >
                <button
                  type="button"
                  onClick={() => setActiveFaq(isOpen ? -1 : idx)}
                  className="w-full p-4 sm:p-5 text-left flex items-center justify-between gap-3 cursor-pointer"
                >
                  <span className="text-xs sm:text-sm md:text-base font-bold text-slate-900 dark:text-white">{item.q}</span>
                  <div className={`p-1.5 rounded-full bg-slate-100 dark:bg-slate-800 transition-transform duration-200 shrink-0 ${isOpen ? 'rotate-180' : ''}`}>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                  </div>
                </button>
                <AnimatePresence>
                  {isOpen && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                    >
                      <div className="px-4 sm:px-5 pb-5 text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed border-t border-slate-100 dark:border-slate-800/80 pt-3">
                        {item.a}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </ScrollRevealSection>

      {/* =========================================================================
          10. FOOTER COMPLETO MULTICOLUMNA DE ALTO NIVEL (FULL-WIDTH)
          ========================================================================= */}
      <footer className="w-full bg-slate-950 text-white mt-20 border-t border-slate-800/80 relative overflow-hidden">
        {/* Resplandor ambiental superior */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[800px] h-32 bg-emerald-500/10 blur-[100px] pointer-events-none -z-0" />

        <div className="responsive-shell safe-area-x pt-14 pb-12 relative z-10">
          
          {/* Bloque Superior: Logo Centrado & Presentación de Marca */}
          <div className="flex flex-col items-center text-center max-w-2xl mx-auto pb-10 border-b border-slate-800/80">
            <button
              type="button"
              onClick={() => scrollTo('hero')}
              className="inline-flex items-center justify-center hover:opacity-90 transition-opacity cursor-pointer focus:outline-none mb-3 group"
              title="Ir al inicio"
            >
              <BrandLogo dark={true} iconSize="w-9 h-9 sm:w-11 sm:h-11" textClassName="text-2xl sm:text-3xl" />
            </button>

            <p className="text-xs sm:text-sm text-slate-400 leading-relaxed max-w-md">
              Plataforma integral de movilidad y gestión de cocheras inteligentes en Ayacucho.
            </p>
          </div>

          {/* Bloque Central: 3 Columnas Distribuidas y Equilibradas */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-10 lg:gap-14 max-w-4xl mx-auto py-12 border-b border-slate-800/80 text-center sm:text-left">
            
            {/* Columna 1: Para Conductores */}
            <div className="space-y-3">
              <h4 className="text-xs uppercase font-bold tracking-wider text-slate-200">
                Conductores
              </h4>
              <ul className="space-y-2.5 text-xs sm:text-sm text-slate-400">
                <li>
                  <button
                    type="button"
                    onClick={() => scrollTo('mapa')}
                    className="hover:text-emerald-400 transition-colors cursor-pointer"
                  >
                    Buscar Cochera
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => scrollTo('mapa')}
                    className="hover:text-emerald-400 transition-colors cursor-pointer"
                  >
                    Mapa en Tiempo Real
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => onOpenAuth && onOpenAuth('login')}
                    className="hover:text-emerald-400 transition-colors cursor-pointer"
                  >
                    Pagar / Consultar Estadía
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => scrollTo('beneficios')}
                    className="hover:text-emerald-400 transition-colors cursor-pointer"
                  >
                    Tolerancia de 15 Min
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => scrollTo('beneficios')}
                    className="hover:text-emerald-400 transition-colors cursor-pointer"
                  >
                    Pase Digital QR Offline
                  </button>
                </li>
              </ul>
            </div>

            {/* Columna 2: Para Cocheras & Negocios */}
            <div className="space-y-3">
              <h4 className="text-xs uppercase font-bold tracking-wider text-slate-200">
                Dueños de Cochera
              </h4>
              <ul className="space-y-2.5 text-xs sm:text-sm text-slate-400">
                <li>
                  <button
                    type="button"
                    onClick={() => onOpenAuth && onOpenAuth('affiliation')}
                    className="text-emerald-400 hover:text-emerald-300 font-semibold transition-colors cursor-pointer"
                  >
                    Afiliar mi Cochera →
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => scrollTo('tecnologia')}
                    className="hover:text-emerald-400 transition-colors cursor-pointer"
                  >
                    Editor de Planos CAD 2D
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => scrollTo('tecnologia')}
                    className="hover:text-emerald-400 transition-colors cursor-pointer"
                  >
                    Cámaras LPR & Visión AI
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => scrollTo('tecnologia')}
                    className="hover:text-emerald-400 transition-colors cursor-pointer"
                  >
                    Control de Caja y Arqueo
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => onOpenAuth && onOpenAuth('login')}
                    className="hover:text-emerald-400 transition-colors cursor-pointer"
                  >
                    Panel de Administración
                  </button>
                </li>
              </ul>
            </div>

            {/* Columna 3: Cobertura & Soporte */}
            <div className="space-y-3">
              <h4 className="text-xs uppercase font-bold tracking-wider text-slate-200">
                Ciudad & Legal
              </h4>
              <ul className="space-y-2.5 text-xs sm:text-sm text-slate-400">
                <li>
                  <button
                    type="button"
                    onClick={() => scrollTo('mapa')}
                    className="hover:text-emerald-400 transition-colors cursor-pointer"
                  >
                    Centro Histórico de Ayacucho
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => scrollTo('mapa')}
                    className="hover:text-emerald-400 transition-colors cursor-pointer"
                  >
                    Jr. 28 de Julio & Portal Constitución
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => onOpenTerms && onOpenTerms()}
                    className="hover:text-emerald-400 transition-colors cursor-pointer"
                  >
                    Términos y Condiciones
                  </button>
                </li>
                <li>
                  <button
                    type="button"
                    onClick={() => scrollTo('faq')}
                    className="hover:text-emerald-400 transition-colors cursor-pointer"
                  >
                    Preguntas Frecuentes
                  </button>
                </li>
              </ul>
            </div>

          </div>

          {/* Barra Inferior Completa */}
          <div className="pt-8 flex flex-col sm:flex-row items-center justify-between text-slate-500 text-xs gap-4 text-center sm:text-left">
            <div>
              <span>© {new Date().getFullYear()} Smart-Park Technologies. Todos los derechos reservados.</span>
            </div>

            <div className="flex items-center gap-1.5 text-slate-400">
              <MapPin className="w-3.5 h-3.5 text-emerald-400" />
              <span>Huamanga, Ayacucho · Perú</span>
            </div>
          </div>

        </div>
      </footer>

    </div>
  );
};

export default LandingPage;
