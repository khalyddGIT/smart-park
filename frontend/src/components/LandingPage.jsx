import React, { useState, useMemo, useRef, useEffect } from 'react';
import { motion, useScroll, useSpring, useTransform, useMotionValue, AnimatePresence } from 'framer-motion';
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
  const { theme, toggleTheme } = useTheme();
  const isDark = theme === 'dark';

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [activeFaq, setActiveFaq] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [activeAudienceTab, setActiveAudienceTab] = useState('driver'); // 'driver' | 'owner'

  // Estadísticas dinámicas de la red de Ayacucho
  const stats = useMemo(() => {
    const list = Array.isArray(establishments) ? establishments : [];
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
  }, [establishments]);

  // Cocheras filtradas por buscador rápido
  const filteredParkings = useMemo(() => {
    if (!searchTerm.trim()) return (establishments || []).slice(0, 4);
    const q = searchTerm.toLowerCase();
    return (establishments || [])
      .filter((p) => (p.name || '').toLowerCase().includes(q) || (p.address || '').toLowerCase().includes(q))
      .slice(0, 4);
  }, [establishments, searchTerm]);

  // Scroll suave hacia una sección
  const scrollTo = (id) => {
    setMobileMenuOpen(false);
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#070B12] text-slate-900 dark:text-slate-100 selection:bg-lime-400 selection:text-slate-950 transition-colors duration-300 font-sans pb-8">
      
      {/* =========================================================================
          1. HEADER FLOTANTE EN ISLA DE VIDRIO
          ========================================================================= */}
      <header className="fixed top-3 left-0 right-0 z-50 px-4 sm:px-6">
        <div className="max-w-5xl mx-auto">
          <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/80 rounded-full px-5 py-2.5 shadow-md shadow-black/5 flex items-center justify-between">
            
            {/* Logotipo Oficial */}
            <div className="flex items-center gap-2.5">
              <BrandLogo dark={isDark} />
            </div>

            {/* Enlaces de Navegación de Escritorio */}
            <nav className="hidden md:flex items-center gap-6 text-xs font-semibold text-slate-600 dark:text-slate-300 tracking-wide">
              <button onClick={() => scrollTo('hero')} className="hover:text-emerald-500 dark:hover:text-lime-400 transition cursor-pointer">
                Inicio
              </button>
              <button onClick={() => scrollTo('beneficios')} className="hover:text-emerald-500 dark:hover:text-lime-400 transition cursor-pointer">
                Ventajas
              </button>
              <button onClick={() => scrollTo('mapa')} className="hover:text-emerald-500 dark:hover:text-lime-400 transition cursor-pointer">
                Directorio
              </button>
              <button onClick={() => scrollTo('tecnologia')} className="hover:text-emerald-500 dark:hover:text-lime-400 transition cursor-pointer">
                Tecnología
              </button>
              <button onClick={() => scrollTo('faq')} className="hover:text-emerald-500 dark:hover:text-lime-400 transition cursor-pointer">
                Preguntas
              </button>
            </nav>

            {/* Acciones de la Cabecera */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={toggleTheme}
                aria-label="Cambiar tema"
                className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center hover:scale-105 transition cursor-pointer"
              >
                {isDark ? <Sun className="w-3.5 h-3.5 text-amber-400" /> : <Moon className="w-3.5 h-3.5 text-slate-700" />}
              </button>

              <button
                type="button"
                onClick={() => onOpenAuth && onOpenAuth('login')}
                className="hidden sm:inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                <LogIn className="w-3.5 h-3.5" />
                Ingresar
              </button>

              <MagneticButton
                onClick={() => onOpenAuth && onOpenAuth('affiliation')}
                className="bg-slate-950 dark:bg-white text-white dark:text-slate-950 px-4 py-2 rounded-full text-xs font-bold shadow hover:bg-slate-800 dark:hover:bg-slate-100 transition cursor-pointer"
              >
                Afiliar Cochera
              </MagneticButton>

              {/* Menú Móvil Hamburger */}
              <button
                type="button"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-1.5 text-slate-700 dark:text-slate-200 hover:text-emerald-500"
                aria-label="Abrir menú"
              >
                {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
              </button>
            </div>
          </div>
        </div>

        {/* Drawer Móvil Desplegable */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="md:hidden max-w-5xl mx-auto mt-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-2xl space-y-3"
            >
              <div className="flex flex-col gap-2.5 text-sm font-semibold">
                <button onClick={() => scrollTo('hero')} className="text-left py-1.5 border-b border-slate-100 dark:border-slate-800">
                  Inicio
                </button>
                <button onClick={() => scrollTo('beneficios')} className="text-left py-1.5 border-b border-slate-100 dark:border-slate-800">
                  Ventajas
                </button>
                <button onClick={() => scrollTo('mapa')} className="text-left py-1.5 border-b border-slate-100 dark:border-slate-800">
                  Directorio & Mapa
                </button>
                <button onClick={() => scrollTo('tecnologia')} className="text-left py-1.5 border-b border-slate-100 dark:border-slate-800">
                  Tecnología
                </button>
                <button onClick={() => scrollTo('faq')} className="text-left py-1.5">
                  Preguntas Frecuentes
                </button>
              </div>
              <div className="pt-1 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onOpenAuth && onOpenAuth('login');
                  }}
                  className="w-full py-2 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-bold"
                >
                  Iniciar Sesión
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* =========================================================================
          2. HERO ISLAND (COMPACTO Y COHESIVO)
          ========================================================================= */}
      <main id="hero" className="pt-20 sm:pt-22 px-4 sm:px-6 max-w-5xl mx-auto">
        <div className="relative rounded-[32px] sm:rounded-[36px] overflow-hidden bg-gradient-to-br from-[#E2F952] via-[#D5F83C] to-[#BAEF2E] dark:from-[#0F172A] dark:via-[#090D16] dark:to-[#070B12] dark:border dark:border-slate-800 text-slate-950 dark:text-white p-6 sm:p-10 shadow-xl transition-all">
          
          {/* Malla decorativa de fondo */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(255,255,255,0.4),transparent_50%)] dark:bg-[radial-gradient(circle_at_80%_20%,rgba(16,185,129,0.12),transparent_50%)] pointer-events-none" />

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-4 items-center relative z-10">
            
            {/* Columna Izquierda: Copywriting y CTA */}
            <div className="lg:col-span-7 space-y-4 text-left">
              
              {/* Badge Superior */}
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-black/10 dark:bg-emerald-500/15 backdrop-blur-md text-[11px] font-bold tracking-wide uppercase text-slate-900 dark:text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-600 dark:bg-emerald-400 animate-pulse" />
                Red Inteligente · Ayacucho, Perú
              </div>

              {/* Titular Principal de Impacto */}
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-black tracking-tight leading-[1.08]">
                Estaciona al instante <span className="inline-block text-emerald-700 dark:text-lime-400">✦</span> en la ciudad
              </h1>

              {/* Subtítulo Conciso */}
              <p className="text-xs sm:text-sm text-slate-800 dark:text-slate-300 max-w-md leading-relaxed font-medium">
                Encuentra plaza en tiempo real, ingresa con lectura automática de placa o código QR, y paga la tarifa exacta al minuto mediante Yape, Plin o tarjetas.
              </p>

              {/* Botones de Acción Primarios */}
              <div className="pt-1 flex flex-wrap items-center gap-3">
                <MagneticButton
                  onClick={() => scrollTo('mapa')}
                  className="bg-slate-950 dark:bg-lime-400 text-white dark:text-slate-950 px-6 py-2.5 rounded-full text-xs sm:text-sm font-black shadow-lg hover:scale-105 transition cursor-pointer flex items-center gap-2"
                >
                  <Search className="w-3.5 h-3.5" />
                  Explorar Cocheras
                </MagneticButton>

                <button
                  type="button"
                  onClick={() => scrollTo('beneficios')}
                  className="inline-flex items-center gap-1 text-xs font-bold text-slate-900 dark:text-slate-200 hover:underline cursor-pointer group"
                >
                  Ver ventajas del sistema
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>

              {/* Flecha Doodle Orgánica SVG */}
              <div className="hidden lg:block pt-1">
                <svg className="w-36 h-10 text-slate-900/70 dark:text-lime-400/80" viewBox="0 0 160 50" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M 10 15 C 50 5, 90 28, 140 32" strokeDasharray="5 3" />
                  <polyline points="132,24 142,32 134,40" />
                </svg>
              </div>
            </div>

            {/* Columna Derecha: Mockups 3D Superpuestos Compactos */}
            <div className="lg:col-span-5 relative flex justify-center lg:justify-end">
              <div className="relative w-full max-w-[310px] sm:max-w-[340px] h-[360px] sm:h-[390px]">
                
                {/* Teléfono 1: Fondo Oscuro Tilted (Plano CAD 2D & LPR) */}
                <motion.div
                  initial={{ y: 15, opacity: 0, rotate: 5 }}
                  animate={{ y: 0, opacity: 1, rotate: 5 }}
                  transition={{ duration: 0.7, ease: FLUID_EASE }}
                  className="absolute right-0 top-3 w-[210px] sm:w-[230px] bg-slate-950 rounded-[30px] p-2.5 shadow-2xl border-3 border-slate-800 text-white z-10"
                >
                  <div className="w-16 h-3 bg-slate-800 rounded-full mx-auto mb-2" />
                  
                  <div className="space-y-2 text-left">
                    <div className="flex items-center justify-between px-1">
                      <span className="text-[9px] font-bold text-slate-400">PLANO 2D EN VIVO</span>
                      <span className="text-[8px] px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold">15 Libres</span>
                    </div>

                    {/* Plazas */}
                    <div className="grid grid-cols-3 gap-1 bg-slate-900/90 p-2 rounded-xl border border-slate-800">
                      <div className="bg-emerald-500/20 border border-emerald-500/50 rounded p-1 text-center">
                        <span className="text-[8px] font-bold text-emerald-400">A-01</span>
                      </div>
                      <div className="bg-red-500/20 border border-red-500/50 rounded p-1 text-center">
                        <span className="text-[8px] font-bold text-red-400">A-02</span>
                      </div>
                      <div className="bg-emerald-500/20 border border-emerald-500/50 rounded p-1 text-center">
                        <span className="text-[8px] font-bold text-emerald-400">A-03</span>
                      </div>
                      <div className="bg-emerald-500/20 border border-emerald-500/50 rounded p-1 text-center">
                        <span className="text-[8px] font-bold text-emerald-400">B-01</span>
                      </div>
                      <div className="bg-red-500/20 border border-red-500/50 rounded p-1 text-center">
                        <span className="text-[8px] font-bold text-red-400">B-02</span>
                      </div>
                      <div className="bg-emerald-500/20 border border-emerald-500/50 rounded p-1 text-center">
                        <span className="text-[8px] font-bold text-emerald-400">B-03</span>
                      </div>
                    </div>

                    {/* LPR */}
                    <div className="p-2 rounded-lg bg-slate-900 border border-slate-800 space-y-0.5">
                      <div className="flex items-center gap-1 text-[9px] text-lime-400 font-bold">
                        <Camera className="w-2.5 h-2.5" />
                        LPR-IA Detectado
                      </div>
                      <div className="text-[10px] font-mono font-black text-slate-100 bg-slate-800 px-1.5 py-0.5 rounded text-center">
                        ABC-123 · Auto
                      </div>
                    </div>

                    <div className="text-[8px] text-center text-slate-400">
                      Barrera automática desbloqueada
                    </div>
                  </div>
                </motion.div>

                {/* Teléfono 2: Primer Plano Blanco (Búsqueda y Pase Digital) */}
                <motion.div
                  initial={{ y: 30, opacity: 0, rotate: -2 }}
                  animate={{ y: 0, opacity: 1, rotate: -2 }}
                  transition={{ duration: 0.7, delay: 0.1, ease: FLUID_EASE }}
                  className="absolute left-0 top-0 w-[220px] sm:w-[245px] bg-white text-slate-900 rounded-[30px] p-3 shadow-2xl border-3 border-slate-900/10 z-20 text-left"
                >
                  <div className="w-20 h-3 bg-slate-200 rounded-full mx-auto mb-2" />
                  
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-black text-slate-900">Ayacucho Parking</span>
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    </div>

                    <div className="flex items-center gap-1.5 bg-slate-100 px-2.5 py-1 rounded-full text-[9px] text-slate-500">
                      <Search className="w-2.5 h-2.5" />
                      <span>Plaza Mayor, Jr. Callao...</span>
                    </div>

                    <div className="p-2 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-slate-900">Cochera Central</span>
                        <span className="text-[9px] font-black text-emerald-600 bg-emerald-100 px-1.5 py-0.5 rounded-full">S/ 3.50/h</span>
                      </div>
                      <div className="flex items-center gap-1 text-[8px] text-slate-500">
                        <MapPin className="w-2 h-2 text-emerald-500" />
                        Jr. 28 de Julio · 12 libres
                      </div>
                      <div className="w-full py-1 rounded-lg bg-slate-950 text-white text-[9px] font-bold text-center">
                        Reservar Plaza
                      </div>
                    </div>

                    <div className="p-1.5 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center gap-2">
                      <div className="w-7 h-7 bg-white p-0.5 rounded border border-emerald-300 flex items-center justify-center">
                        <QrCode className="w-5 h-5 text-slate-900" />
                      </div>
                      <div className="text-[8px]">
                        <p className="font-bold text-emerald-950">Pase QR Activo</p>
                        <p className="text-emerald-700">Tolerancia: 14:20 min</p>
                      </div>
                    </div>
                  </div>
                </motion.div>

              </div>
            </div>

          </div>
        </div>
      </main>

      {/* =========================================================================
          3. DUAL BENTO CARDS (ESPACIADO COMPACTO)
          ========================================================================= */}
      <ScrollRevealSection className="pt-6 pb-2 px-4 sm:px-6 max-w-5xl mx-auto text-left">
        <div className="mb-4">
          <h2 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white">
            Saca el Máximo Provecho a Cada Minuto
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Herramientas diseñadas tanto para el conductor diario como para la gestión municipal y privada.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5">
          
          {/* Tarjeta 1: Red Unificada de Cocheras */}
          <DynamicTiltCard className="rounded-[28px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 relative overflow-hidden shadow-sm flex flex-col justify-between">
            <div className="space-y-2 z-10">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Red Unificada de Cocheras
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 max-w-sm leading-relaxed">
                Gestiona tus accesos, recibos electrónicos y reservas en múltiples sedes de Huamanga desde una única plataforma digital.
              </p>
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => scrollTo('mapa')}
                  className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-lime-400 hover:underline cursor-pointer"
                >
                  Explorar directorio
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </div>

            <div className="absolute right-4 bottom-4 flex items-center gap-2 opacity-80 pointer-events-none">
              <div className="w-8 h-12 rounded-full bg-slate-950 dark:bg-white/10" />
              <div className="w-11 h-11 rounded-xl bg-lime-400 dark:bg-emerald-500 flex items-center justify-center text-slate-950 font-black text-xs">
                +12
              </div>
            </div>
          </DynamicTiltCard>

          {/* Tarjeta 2: Telemetría y Precisión en Vivo */}
          <DynamicTiltCard className="rounded-[28px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-6 relative overflow-hidden shadow-sm flex flex-col justify-between">
            <div className="space-y-2 z-10">
              <h3 className="text-lg font-bold text-slate-900 dark:text-white">
                Telemetría y Control en Tiempo Real
              </h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 max-w-sm leading-relaxed">
                Visualiza la ocupación exacta plaza por plaza, con reconocimiento de placa por visión computacional y sincronización en la nube.
              </p>
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => scrollTo('tecnologia')}
                  className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-lime-400 hover:underline cursor-pointer"
                >
                  Ver arquitectura tecnológica
                  <ArrowRight className="w-3 h-3" />
                </button>
              </div>
            </div>

            <div className="absolute right-4 bottom-4 w-16 h-16 flex items-center justify-center pointer-events-none">
              <svg className="w-16 h-16 transform -rotate-90" viewBox="0 0 36 36">
                <path
                  className="text-slate-200 dark:text-slate-800"
                  strokeWidth="3.5"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
                <path
                  className="text-emerald-500 dark:text-lime-400"
                  strokeDasharray="85, 100"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  stroke="currentColor"
                  fill="none"
                  d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                />
              </svg>
              <span className="absolute text-[11px] font-black text-slate-900 dark:text-white">85%</span>
            </div>
          </DynamicTiltCard>

        </div>
      </ScrollRevealSection>

      {/* =========================================================================
          4. SECCIÓN "VENTAJAS" CON BADGES CIRCULARES
          ========================================================================= */}
      <ScrollRevealSection id="beneficios" className="py-6 px-4 sm:px-6 max-w-5xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 text-left items-start">
          
          {/* Columna Izquierda */}
          <div className="lg:col-span-4 space-y-3">
            <h2 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
              Ventajas Exclusivas
            </h2>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Diseñado minuciosamente para resolver la congestión en el centro histórico de Ayacucho, eliminando la incertidumbre de encontrar estacionamiento seguro.
            </p>
            <div>
              <button
                type="button"
                onClick={() => onOpenAuth && onOpenAuth('affiliation')}
                className="text-xs font-bold text-emerald-600 dark:text-lime-400 hover:underline cursor-pointer"
              >
                Afilia tu cochera en 24 horas →
              </button>
            </div>
          </div>

          {/* Columna Derecha: Cuadrícula 2x2 */}
          <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-5">
            
            <div className="space-y-2">
              <div className="w-8 h-8 rounded-full bg-lime-400 dark:bg-emerald-500/20 text-slate-950 dark:text-emerald-400 flex items-center justify-center font-black">
                <Clock className="w-4 h-4" />
              </div>
              <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                15 Minutos de Tolerancia
              </h4>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                Ventana de llegada garantizada. Tu cupo permanece reservado y protegido contra cancelaciones.
              </p>
            </div>

            <div className="space-y-2">
              <div className="w-8 h-8 rounded-full bg-lime-400 dark:bg-emerald-500/20 text-slate-950 dark:text-emerald-400 flex items-center justify-center font-black">
                <Camera className="w-4 h-4" />
              </div>
              <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                Cámara LPR & Visión AI
              </h4>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                Apertura automática de barrera en garita mediante lectura de placas en menos de 2 segundos.
              </p>
            </div>

            <div className="space-y-2">
              <div className="w-8 h-8 rounded-full bg-lime-400 dark:bg-emerald-500/20 text-slate-950 dark:text-emerald-400 flex items-center justify-center font-black">
                <CreditCard className="w-4 h-4" />
              </div>
              <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                Tarifas Justas al Minuto
              </h4>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                Paga exactamente los minutos utilizados vía Yape, Plin o tarjeta con boleta electrónica.
              </p>
            </div>

            <div className="space-y-2">
              <div className="w-8 h-8 rounded-full bg-lime-400 dark:bg-emerald-500/20 text-slate-950 dark:text-emerald-400 flex items-center justify-center font-black">
                <QrCode className="w-4 h-4" />
              </div>
              <h4 className="text-xs font-bold text-slate-900 dark:text-white">
                Pase QR 100% Offline
              </h4>
              <p className="text-[11px] text-slate-600 dark:text-slate-400 leading-relaxed">
                ¿Sin señal en el sótano? Guarda tu pase en el teléfono y accede sin depender de datos móviles.
              </p>
            </div>

          </div>

        </div>
      </ScrollRevealSection>

      {/* =========================================================================
          5. NUESTROS ALIADOS / TRUST BAR COMPACTO
          ========================================================================= */}
      <section className="py-4 px-4 max-w-5xl mx-auto text-center border-y border-slate-200/60 dark:border-slate-800/60 my-3">
        <h3 className="text-[10px] uppercase font-bold tracking-wider text-slate-400 dark:text-slate-500 mb-3">
          Ecosistema Conectado a los Principales Medios del Perú
        </h3>
        <div className="flex flex-wrap items-center justify-center gap-5 sm:gap-8 text-slate-400 dark:text-slate-500 font-bold text-xs">
          <span className="hover:text-emerald-500 transition">Yape</span>
          <span className="hover:text-emerald-500 transition">Plin</span>
          <span className="hover:text-emerald-500 transition">Visa</span>
          <span className="hover:text-emerald-500 transition">Mastercard</span>
          <span className="hover:text-emerald-500 transition">BCP</span>
          <span className="hover:text-emerald-500 transition">BBVA</span>
          <span className="hover:text-emerald-500 transition">Interbank</span>
          <span className="hover:text-emerald-500 transition">SAT Huamanga</span>
        </div>
      </section>

      {/* =========================================================================
          6. CONTRAST DARK ISLAND BANNER COMPACTO
          ========================================================================= */}
      <ScrollRevealSection className="py-6 px-4 sm:px-6 max-w-5xl mx-auto">
        <div className="relative rounded-[32px] bg-slate-950 text-white p-6 sm:p-8 overflow-hidden border border-slate-800 text-left shadow-xl">
          <div className="absolute -right-16 -top-16 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
          
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center relative z-10">
            <div className="md:col-span-7 space-y-3">
              <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/10 text-[9px] font-bold tracking-wider uppercase text-emerald-400">
                Control Total al Volante
              </div>
              <h2 className="text-xl sm:text-3xl font-black tracking-tight leading-tight">
                Mantén el pulso de tu estadía y tarifa en tiempo real
              </h2>
              <p className="text-xs text-slate-400 max-w-md leading-relaxed">
                Recibe notificaciones antes de que finalice tu tiempo, extiende tu reserva o abre navegación en Waze o Google Maps.
              </p>
              <div className="pt-1">
                <button
                  type="button"
                  onClick={() => scrollTo('mapa')}
                  className="bg-white text-slate-950 px-5 py-2 rounded-full text-xs font-bold hover:bg-slate-200 transition cursor-pointer"
                >
                  Buscar mi plaza ahora
                </button>
              </div>
            </div>

            <div className="md:col-span-5 flex justify-center">
              <div className="w-[190px] bg-slate-900 border border-slate-800 rounded-2xl p-3 shadow-lg text-center space-y-2">
                <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">Pase de Acceso</div>
                <div className="text-base font-black text-white">S/ 3.50</div>
                <div className="w-24 h-24 bg-white p-1.5 rounded-xl mx-auto flex items-center justify-center">
                  <QRCodeSVG value="SMART-PARK-DEMO-PASS" size={84} />
                </div>
                <div className="text-[9px] text-emerald-400 font-bold bg-emerald-500/10 py-0.5 rounded-full">
                  Tolerancia: 14:58 min
                </div>
                <div className="text-[8px] text-slate-400">
                  Cochera Plaza Mayor · Plaza A-04
                </div>
              </div>
            </div>
          </div>
        </div>
      </ScrollRevealSection>

      {/* =========================================================================
          7. RADAR DE COCHERAS & MAPA EN VIVO DE AYACUCHO
          ========================================================================= */}
      <ScrollRevealSection id="mapa" className="py-6 px-4 sm:px-6 max-w-5xl mx-auto text-left">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-4 gap-3">
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 text-xs font-bold mb-1.5">
              <Radio className="w-3 h-3 animate-pulse" />
              Radar Activo de Ayacucho
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white">
              Cocheras Afiliadas con Cupos Disponibles
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Haz clic en cualquier establecimiento para visualizar su plano CAD 2D y reservar plaza al instante.
            </p>
          </div>

          <div className="w-full md:w-64">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                type="text"
                placeholder="Buscar calle o nombre..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 pr-3 py-1.5 rounded-full text-xs bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
              />
            </div>
          </div>
        </div>

        <div className="rounded-[28px] overflow-hidden border border-slate-200 dark:border-slate-800 shadow-md bg-white dark:bg-slate-900 p-2 sm:p-3">
          <AyacuchoMap
            establishments={establishments}
            onSelectParking={(p) => onSelectParking && onSelectParking(p)}
          />
        </div>
      </ScrollRevealSection>

      {/* =========================================================================
          8. DOBLE PERSPECTIVA: CONDUCTORES VS DUEÑOS DE COCHERA
          ========================================================================= */}
      <ScrollRevealSection id="tecnologia" className="py-6 px-4 sm:px-6 max-w-5xl mx-auto text-left">
        <div className="text-center max-w-xl mx-auto mb-5 space-y-2">
          <h2 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white">
            Diseñado para Todo el Ecosistema
          </h2>
          <div className="inline-flex p-1 bg-slate-100 dark:bg-slate-800 rounded-full">
            <button
              type="button"
              onClick={() => setActiveAudienceTab('driver')}
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition cursor-pointer ${
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
              className={`px-4 py-1.5 rounded-full text-xs font-bold transition cursor-pointer ${
                activeAudienceTab === 'owner'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Para Dueños de Cochera
            </button>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-[28px] border border-slate-200 dark:border-slate-800 p-6 sm:p-8 shadow-sm">
          {activeAudienceTab === 'driver' ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-1.5">
                <div className="w-7 h-7 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-xs">
                  01
                </div>
                <h4 className="font-bold text-xs text-slate-900 dark:text-white">Cero Vueltas Inútiles</h4>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Sabrás de antemano si hay cupos libres antes de llegar a la zona céntrica de Ayacucho.
                </p>
              </div>

              <div className="space-y-1.5">
                <div className="w-7 h-7 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-xs">
                  02
                </div>
                <h4 className="font-bold text-xs text-slate-900 dark:text-white">Entrada Ágil con Placa</h4>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Sin tickets de papel que se pierden. Tu placa registrada activa la barrera en garita.
                </p>
              </div>

              <div className="space-y-1.5">
                <div className="w-7 h-7 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-xs">
                  03
                </div>
                <h4 className="font-bold text-xs text-slate-900 dark:text-white">Facturación Digital</h4>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Recibe tus boletas o facturas automáticamente en tu historial y por correo electrónico.
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-1.5">
                <div className="w-7 h-7 rounded-full bg-lime-400 dark:bg-lime-500/20 text-slate-950 dark:text-lime-400 flex items-center justify-center font-bold text-xs">
                  01
                </div>
                <h4 className="font-bold text-xs text-slate-900 dark:text-white">Cero Fugas de Dinero</h4>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Cada entrada y salida queda auditada en la nube con foto del vehículo y cálculo automático.
                </p>
              </div>

              <div className="space-y-1.5">
                <div className="w-7 h-7 rounded-full bg-lime-400 dark:bg-lime-500/20 text-slate-950 dark:text-lime-400 flex items-center justify-center font-bold text-xs">
                  02
                </div>
                <h4 className="font-bold text-xs text-slate-900 dark:text-white">Plano CAD 2D Flexible</h4>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Dibuja y reordena tus plazas de autos, camionetas y motos en nuestro editor interactivo en minutos.
                </p>
              </div>

              <div className="space-y-1.5">
                <div className="w-7 h-7 rounded-full bg-lime-400 dark:bg-lime-500/20 text-slate-950 dark:text-lime-400 flex items-center justify-center font-bold text-xs">
                  03
                </div>
                <h4 className="font-bold text-xs text-slate-900 dark:text-white">Reportes y Arqueo</h4>
                <p className="text-[11px] text-slate-500 leading-relaxed">
                  Cierres de caja automáticos por turno de garita, liquidaciones y analíticas de rentabilidad.
                </p>
              </div>
            </div>
          )}
        </div>
      </ScrollRevealSection>

      {/* =========================================================================
          9. PREGUNTAS FRECUENTES (FAQ ACORDEÓN COMPACTO)
          ========================================================================= */}
      <ScrollRevealSection id="faq" className="py-6 px-4 sm:px-6 max-w-4xl mx-auto text-left">
        <div className="text-center mb-5">
          <h2 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900 dark:text-white">
            Preguntas Frecuentes
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Todo lo que necesitas saber antes de empezar.
          </p>
        </div>

        <div className="space-y-2.5">
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
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => setActiveFaq(isOpen ? -1 : idx)}
                  className="w-full p-4 text-left flex items-center justify-between gap-3 cursor-pointer"
                >
                  <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">{item.q}</span>
                  <div className={`p-1 rounded-full bg-slate-100 dark:bg-slate-800 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}>
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
                      <div className="px-4 pb-4 text-xs text-slate-600 dark:text-slate-400 leading-relaxed border-t border-slate-100 dark:border-slate-800/80 pt-2.5">
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
          10. FOOTER NEGRO REDONDEADO COMPACTO
          ========================================================================= */}
      <footer className="mt-8 max-w-5xl mx-auto px-4 sm:px-6">
        <div className="rounded-t-[30px] bg-slate-950 text-white p-6 sm:p-8 text-xs space-y-6">
          <div className="flex flex-col md:flex-row items-center md:items-start justify-between gap-6 text-center md:text-left">
            <div className="space-y-1.5">
              <BrandLogo dark={true} />
              <p className="text-[11px] text-slate-400 max-w-xs">
                Plataforma tecnológica de estacionamientos inteligentes de Ayacucho, Perú.
              </p>
            </div>

            <div className="flex flex-wrap justify-center gap-5 font-semibold text-slate-300 text-xs">
              <button onClick={() => scrollTo('hero')} className="hover:text-lime-400 transition cursor-pointer">
                Inicio
              </button>
              <button onClick={() => scrollTo('mapa')} className="hover:text-lime-400 transition cursor-pointer">
                Directorio
              </button>
              <button onClick={() => scrollTo('beneficios')} className="hover:text-lime-400 transition cursor-pointer">
                Ventajas
              </button>
              <button onClick={() => scrollTo('tecnologia')} className="hover:text-lime-400 transition cursor-pointer">
                Tecnología
              </button>
              <button
                type="button"
                onClick={() => onOpenTerms && onOpenTerms()}
                className="hover:text-lime-400 transition cursor-pointer"
              >
                Términos y Condiciones
              </button>
            </div>
          </div>

          <div className="border-t border-slate-800 pt-4 flex flex-col sm:flex-row items-center justify-between text-slate-500 text-[10px] gap-2">
            <span>© {new Date().getFullYear()} Smart-Park. Todos los derechos reservados.</span>
            <span>Desarrollado para Huamanga, Ayacucho</span>
          </div>
        </div>
      </footer>

    </div>
  );
};

export default LandingPage;
