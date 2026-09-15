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

// Contenedor con efecto scroll reveal suave
const ScrollRevealSection = ({ children, className = '', id = '' }) => {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start']
  });

  const opacity = useTransform(scrollYProgress, [0, 0.15, 0.85, 1], [0, 1, 1, 0.95]);
  const y = useTransform(scrollYProgress, [0, 0.15, 0.85, 1], [30, 0, 0, -20]);
  const smoothOpacity = useSpring(opacity, { stiffness: 200, damping: 30 });
  const smoothY = useSpring(y, { stiffness: 200, damping: 30 });

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
    x.set((e.clientX - centerX) * 0.18);
    y.set((e.clientY - centerY) * 0.18);
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
    <div className="min-h-screen bg-[#F8FAFC] dark:bg-[#070B12] text-slate-900 dark:text-slate-100 selection:bg-lime-400 selection:text-slate-950 transition-colors duration-300 font-sans pb-16">
      
      {/* =========================================================================
          1. HEADER FLOTANTE EN ISLA DE VIDRIO
          ========================================================================= */}
      <header className="fixed top-4 left-0 right-0 z-50 px-4 sm:px-6">
        <div className="max-w-6xl mx-auto">
          <div className="bg-white/85 dark:bg-slate-900/85 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/80 rounded-full px-5 py-3 shadow-lg shadow-black/5 flex items-center justify-between">
            
            {/* Logotipo Oficial */}
            <div className="flex items-center gap-3">
              <BrandLogo dark={isDark} />
            </div>

            {/* Enlaces de Navegación de Escritorio */}
            <nav className="hidden md:flex items-center gap-7 text-xs font-semibold text-slate-600 dark:text-slate-300 tracking-wide">
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
            <div className="flex items-center gap-2.5">
              <button
                type="button"
                onClick={toggleTheme}
                aria-label="Cambiar tema"
                className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 flex items-center justify-center hover:scale-105 transition cursor-pointer"
              >
                {isDark ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-slate-700" />}
              </button>

              <button
                type="button"
                onClick={() => onOpenAuth && onOpenAuth('login')}
                className="hidden sm:inline-flex items-center gap-1.5 px-4 py-2 rounded-full text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
              >
                <LogIn className="w-3.5 h-3.5" />
                Ingresar
              </button>

              <MagneticButton
                onClick={() => onOpenAuth && onOpenAuth('affiliation')}
                className="bg-slate-950 dark:bg-white text-white dark:text-slate-950 px-5 py-2.5 rounded-full text-xs font-bold shadow-md hover:bg-slate-800 dark:hover:bg-slate-100 transition cursor-pointer"
              >
                Afiliar Cochera
              </MagneticButton>

              {/* Menú Móvil Hamburger */}
              <button
                type="button"
                onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
                className="md:hidden p-2 text-slate-700 dark:text-slate-200 hover:text-emerald-500"
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
              className="md:hidden max-w-6xl mx-auto mt-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-3xl p-5 shadow-2xl space-y-4"
            >
              <div className="flex flex-col gap-3 text-sm font-semibold">
                <button onClick={() => scrollTo('hero')} className="text-left py-2 border-b border-slate-100 dark:border-slate-800">
                  Inicio
                </button>
                <button onClick={() => scrollTo('beneficios')} className="text-left py-2 border-b border-slate-100 dark:border-slate-800">
                  Ventajas
                </button>
                <button onClick={() => scrollTo('mapa')} className="text-left py-2 border-b border-slate-100 dark:border-slate-800">
                  Directorio & Mapa
                </button>
                <button onClick={() => scrollTo('tecnologia')} className="text-left py-2 border-b border-slate-100 dark:border-slate-800">
                  Tecnología
                </button>
                <button onClick={() => scrollTo('faq')} className="text-left py-2">
                  Preguntas Frecuentes
                </button>
              </div>
              <div className="pt-2 flex flex-col gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onOpenAuth && onOpenAuth('login');
                  }}
                  className="w-full py-2.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-bold"
                >
                  Iniciar Sesión
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* =========================================================================
          2. HERO ISLAND (INSPIRADO EN EL DISEÑO FINTECH DE REFERENCIA)
          Gran tarjeta redondeada con acento, tipografía fuerte, doodle y teléfonos 3D
          ========================================================================= */}
      <main id="hero" className="pt-24 sm:pt-28 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto">
        <div className="relative rounded-[36px] sm:rounded-[44px] overflow-hidden bg-gradient-to-br from-[#E2F952] via-[#D5F83C] to-[#BAEF2E] dark:from-[#0F172A] dark:via-[#090D16] dark:to-[#070B12] dark:border dark:border-slate-800 text-slate-950 dark:text-white p-8 sm:p-12 lg:p-16 shadow-2xl transition-all">
          
          {/* Malla decorativa de fondo */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(255,255,255,0.4),transparent_50%)] dark:bg-[radial-gradient(circle_at_80%_20%,rgba(16,185,129,0.12),transparent_50%)] pointer-events-none" />

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 lg:gap-6 items-center relative z-10">
            
            {/* Columna Izquierda: Copywriting, CTA y Flecha Doodle */}
            <div className="lg:col-span-7 space-y-6 text-left">
              
              {/* Badge Superior */}
              <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-black/10 dark:bg-emerald-500/15 backdrop-blur-md text-[11px] sm:text-xs font-bold tracking-wide uppercase text-slate-900 dark:text-emerald-400">
                <span className="w-2 h-2 rounded-full bg-emerald-600 dark:bg-emerald-400 animate-pulse" />
                Red Inteligente · Ayacucho, Perú
              </div>

              {/* Titular Principal de Impacto */}
              <h1 className="text-4xl sm:text-5xl lg:text-6xl font-black tracking-tight leading-[1.05]">
                Estaciona al instante <span className="inline-block text-emerald-700 dark:text-lime-400">✦</span> en la ciudad
              </h1>

              {/* Subtítulo Conciso */}
              <p className="text-sm sm:text-base text-slate-800 dark:text-slate-300 max-w-lg leading-relaxed font-medium">
                Encuentra plaza en tiempo real, ingresa con lectura automática de placa o código QR, y paga la tarifa exacta al minuto mediante Yape, Plin o tarjetas.
              </p>

              {/* Botones de Acción Primarios */}
              <div className="pt-2 flex flex-wrap items-center gap-4">
                <MagneticButton
                  onClick={() => scrollTo('mapa')}
                  className="bg-slate-950 dark:bg-lime-400 text-white dark:text-slate-950 px-7 py-3.5 rounded-full text-sm font-black shadow-xl hover:scale-105 transition cursor-pointer flex items-center gap-2"
                >
                  <Search className="w-4 h-4" />
                  Explorar Cocheras
                </MagneticButton>

                <button
                  type="button"
                  onClick={() => scrollTo('beneficios')}
                  className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-slate-900 dark:text-slate-200 hover:underline cursor-pointer group"
                >
                  Ver ventajas del sistema
                  <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                </button>
              </div>

              {/* Flecha Doodle Orgánica SVG (conectando el texto con los móviles) */}
              <div className="hidden lg:block pt-4">
                <svg className="w-48 h-16 text-slate-900/70 dark:text-lime-400/80" viewBox="0 0 200 80" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M 10 20 C 60 5, 120 40, 180 50" strokeDasharray="6 4" />
                  <polyline points="172,40 183,50 174,62" />
                </svg>
              </div>
            </div>

            {/* Columna Derecha: Mockups 3D Superpuestos de Smartphones */}
            <div className="lg:col-span-5 relative flex justify-center lg:justify-end">
              <div className="relative w-full max-w-[340px] sm:max-w-[380px] h-[460px] sm:h-[500px]">
                
                {/* Teléfono 1: Fondo Oscuro Tilted (Plano CAD 2D & LPR) */}
                <motion.div
                  initial={{ y: 20, opacity: 0, rotate: 6 }}
                  animate={{ y: 0, opacity: 1, rotate: 6 }}
                  transition={{ duration: 0.8, ease: FLUID_EASE }}
                  className="absolute right-0 top-6 w-[230px] sm:w-[260px] bg-slate-950 rounded-[38px] p-3 shadow-2xl border-4 border-slate-800 text-white z-10"
                >
                  {/* Notch / Speaker */}
                  <div className="w-20 h-4 bg-slate-800 rounded-full mx-auto mb-2" />
                  
                  {/* Pantalla Simulada CAD */}
                  <div className="space-y-3 text-left">
                    <div className="flex items-center justify-between px-1">
                      <span className="text-[10px] font-bold text-slate-400">PLANO 2D EN VIVO</span>
                      <span className="text-[9px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 font-bold">15 Libres</span>
                    </div>

                    {/* Simulación de Plazas */}
                    <div className="grid grid-cols-3 gap-1.5 bg-slate-900/90 p-2.5 rounded-2xl border border-slate-800">
                      <div className="bg-emerald-500/20 border border-emerald-500/50 rounded-lg p-2 text-center">
                        <span className="text-[9px] font-bold text-emerald-400">A-01</span>
                      </div>
                      <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-2 text-center">
                        <span className="text-[9px] font-bold text-red-400">A-02</span>
                      </div>
                      <div className="bg-emerald-500/20 border border-emerald-500/50 rounded-lg p-2 text-center">
                        <span className="text-[9px] font-bold text-emerald-400">A-03</span>
                      </div>
                      <div className="bg-emerald-500/20 border border-emerald-500/50 rounded-lg p-2 text-center">
                        <span className="text-[9px] font-bold text-emerald-400">B-01</span>
                      </div>
                      <div className="bg-red-500/20 border border-red-500/50 rounded-lg p-2 text-center">
                        <span className="text-[9px] font-bold text-red-400">B-02</span>
                      </div>
                      <div className="bg-emerald-500/20 border border-emerald-500/50 rounded-lg p-2 text-center">
                        <span className="text-[9px] font-bold text-emerald-400">B-03</span>
                      </div>
                    </div>

                    {/* Banner de Reconocimiento LPR */}
                    <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                      <div className="flex items-center gap-1.5 text-[10px] text-lime-400 font-bold">
                        <Camera className="w-3 h-3" />
                        LPR-IA Detectado
                      </div>
                      <div className="text-[11px] font-mono font-black text-slate-100 bg-slate-800 px-2 py-0.5 rounded text-center">
                        ABC-123 · Auto
                      </div>
                    </div>

                    <div className="text-[9px] text-center text-slate-400 font-medium">
                      Barrera automática desbloqueada
                    </div>
                  </div>
                </motion.div>

                {/* Teléfono 2: Primer Plano Blanco (Búsqueda y Pase Digital) */}
                <motion.div
                  initial={{ y: 40, opacity: 0, rotate: -3 }}
                  animate={{ y: 0, opacity: 1, rotate: -3 }}
                  transition={{ duration: 0.8, delay: 0.15, ease: FLUID_EASE }}
                  className="absolute left-0 top-0 w-[240px] sm:w-[270px] bg-white text-slate-900 rounded-[38px] p-3.5 shadow-2xl border-4 border-slate-900/10 z-20 text-left"
                >
                  {/* Notch */}
                  <div className="w-24 h-4 bg-slate-200 rounded-full mx-auto mb-2" />
                  
                  <div className="space-y-3">
                    {/* Header App */}
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-slate-900">Ayacucho Parking</span>
                      <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    </div>

                    {/* Mini Barra de Búsqueda */}
                    <div className="flex items-center gap-2 bg-slate-100 px-3 py-1.5 rounded-full text-[10px] text-slate-500">
                      <Search className="w-3 h-3" />
                      <span>Plaza Mayor, Jr. Callao...</span>
                    </div>

                    {/* Tarjeta de Cochera Destacada */}
                    <div className="p-2.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[11px] font-bold text-slate-900">Cochera Central</span>
                        <span className="text-[10px] font-black text-emerald-600 bg-emerald-100 px-2 py-0.5 rounded-full">S/ 3.50/h</span>
                      </div>
                      <div className="flex items-center gap-1 text-[9px] text-slate-500">
                        <MapPin className="w-2.5 h-2.5 text-emerald-500" />
                        Jr. 28 de Julio · 12 libres
                      </div>
                      <div className="w-full py-1.5 rounded-xl bg-slate-950 text-white text-[10px] font-bold text-center">
                        Reservar Plaza
                      </div>
                    </div>

                    {/* Micro Pase QR */}
                    <div className="p-2 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center gap-2.5">
                      <div className="w-8 h-8 bg-white p-1 rounded-lg border border-emerald-300 flex items-center justify-center">
                        <QrCode className="w-6 h-6 text-slate-900" />
                      </div>
                      <div className="text-[9px]">
                        <p className="font-bold text-emerald-950">Pase QR Activo</p>
                        <p className="text-emerald-700 font-medium">Tolerancia: 14:20 min</p>
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
          3. DUAL BENTO CARDS ("SACA EL MÁXIMO PROVECHO A TUS VIAJES")
          Dos tarjetas redondeadas con diseño gráfico en la esquina
          ========================================================================= */}
      <ScrollRevealSection className="py-16 px-4 sm:px-6 max-w-6xl mx-auto text-left">
        <div className="mb-8">
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
            Saca el Máximo Provecho a Cada Minuto
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
            Herramientas diseñadas tanto para el conductor diario como para la gestión municipal y privada.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          
          {/* Tarjeta 1: Red Unificada de Cocheras */}
          <DynamicTiltCard className="rounded-[32px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 relative overflow-hidden shadow-sm flex flex-col justify-between">
            <div className="space-y-3 z-10">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                Red Unificada de Cocheras
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-sm leading-relaxed">
                Gestiona tus accesos, recibos electrónicos y reservas en múltiples sedes de Huamanga desde una única plataforma digital.
              </p>
              <div className="pt-3">
                <button
                  type="button"
                  onClick={() => scrollTo('mapa')}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-lime-400 hover:underline cursor-pointer"
                >
                  Explorar directorio
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Elemento gráfico en la esquina */}
            <div className="absolute right-4 -bottom-6 w-36 h-36 bg-lime-300/30 dark:bg-emerald-500/10 rounded-full blur-xl pointer-events-none" />
            <div className="absolute right-6 bottom-6 flex items-center gap-2 opacity-80 pointer-events-none">
              <div className="w-10 h-16 rounded-full bg-slate-950 dark:bg-white/10" />
              <div className="w-14 h-14 rounded-2xl bg-lime-400 dark:bg-emerald-500 flex items-center justify-center text-slate-950 font-black text-xs">
                +12
              </div>
            </div>
          </DynamicTiltCard>

          {/* Tarjeta 2: Telemetría y Precisión en Vivo */}
          <DynamicTiltCard className="rounded-[32px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 p-8 relative overflow-hidden shadow-sm flex flex-col justify-between">
            <div className="space-y-3 z-10">
              <h3 className="text-xl font-bold text-slate-900 dark:text-white">
                Telemetría y Control en Tiempo Real
              </h3>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-sm leading-relaxed">
                Visualiza la ocupación exacta plaza por plaza, con reconocimiento de placa por visión computacional y sincronización en la nube.
              </p>
              <div className="pt-3">
                <button
                  type="button"
                  onClick={() => scrollTo('tecnologia')}
                  className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600 dark:text-lime-400 hover:underline cursor-pointer"
                >
                  Ver arquitectura tecnológica
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>

            {/* Elemento gráfico circular / medidor */}
            <div className="absolute right-6 bottom-6 w-24 h-24 flex items-center justify-center pointer-events-none">
              <svg className="w-24 h-24 transform -rotate-90" viewBox="0 0 36 36">
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
              <span className="absolute text-xs font-black text-slate-900 dark:text-white">85%</span>
            </div>
          </DynamicTiltCard>

        </div>
      </ScrollRevealSection>

      {/* =========================================================================
          4. SECCIÓN "VENTAJAS" CON BADGES CIRCULARES
          Columna izquierda: Titular e intro. Columna derecha: 2x2 grid de beneficios
          ========================================================================= */}
      <ScrollRevealSection id="beneficios" className="py-12 px-4 sm:px-6 max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-10 text-left items-start">
          
          {/* Columna Izquierda (4 columnas) */}
          <div className="lg:col-span-4 space-y-4">
            <h2 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white">
              Ventajas Exclusivas
            </h2>
            <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed">
              Diseñado minuciosamente para resolver la congestión en el centro histórico de Ayacucho, eliminando la incertidumbre de encontrar estacionamiento seguro.
            </p>
            <div className="pt-2">
              <button
                type="button"
                onClick={() => onOpenAuth && onOpenAuth('affiliation')}
                className="text-xs font-bold text-emerald-600 dark:text-lime-400 hover:underline cursor-pointer"
              >
                Afilia tu cochera en menos de 24 horas →
              </button>
            </div>
          </div>

          {/* Columna Derecha: Cuadrícula 2x2 con Círculos de Acento (8 columnas) */}
          <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-8">
            
            {/* Ventaja 1: 15 min de tolerancia */}
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-full bg-lime-400 dark:bg-emerald-500/20 text-slate-950 dark:text-emerald-400 flex items-center justify-center font-black">
                <Clock className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                15 Minutos de Tolerancia
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Ventana de llegada garantizada. Si te retrasas en el tráfico, tu cupo permanece reservado y protegido contra sabotajes.
              </p>
            </div>

            {/* Ventaja 2: Reconocimiento LPR */}
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-full bg-lime-400 dark:bg-emerald-500/20 text-slate-950 dark:text-emerald-400 flex items-center justify-center font-black">
                <Camera className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                Cámara LPR & Visión AI
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Apertura automática de barrera en garita mediante lectura óptica de placas en menos de 2 segundos.
              </p>
            </div>

            {/* Ventaja 3: Cobro exacto por minuto */}
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-full bg-lime-400 dark:bg-emerald-500/20 text-slate-950 dark:text-emerald-400 flex items-center justify-center font-black">
                <CreditCard className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                Tarifas Justas al Minuto
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Cero redondeos injustos. Paga exactamente los minutos utilizados vía Yape, Plin o tarjetas con comprobante electrónico.
              </p>
            </div>

            {/* Ventaja 4: Pase Offline */}
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-full bg-lime-400 dark:bg-emerald-500/20 text-slate-950 dark:text-emerald-400 flex items-center justify-center font-black">
                <QrCode className="w-5 h-5" />
              </div>
              <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                Pase QR 100% Offline
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                ¿Sin señal en el sótano? Guarda tu pase en el teléfono y accede sin depender de datos móviles o cobertura celular.
              </p>
            </div>

          </div>

        </div>
      </ScrollRevealSection>

      {/* =========================================================================
          5. NUESTROS ALIADOS / TRUST BAR
          Row de medios de pago y entidades aliadas en formato badge
          ========================================================================= */}
      <section className="py-12 px-4 sm:px-6 max-w-6xl mx-auto text-center border-y border-slate-200/70 dark:border-slate-800/70 my-8">
        <h3 className="text-xs uppercase font-bold tracking-wider text-slate-500 dark:text-slate-400 mb-6">
          Ecosistema Conectado a los Principales Medios del Perú
        </h3>
        <div className="flex flex-wrap items-center justify-center gap-6 sm:gap-10 text-slate-400 dark:text-slate-500 font-bold text-sm">
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
          6. CONTRAST DARK ISLAND BANNER
          Isla oscura con titular contundente y mockup central que sobresale
          ========================================================================= */}
      <ScrollRevealSection className="py-10 px-4 sm:px-6 max-w-6xl mx-auto">
        <div className="relative rounded-[36px] sm:rounded-[44px] bg-slate-950 text-white p-8 sm:p-14 overflow-hidden border border-slate-800 text-left shadow-2xl">
          
          {/* Líneas orgánicas / wave lines de fondo */}
          <div className="absolute -right-20 -top-20 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
          
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 items-center relative z-10">
            
            {/* Columna Izquierda: Titular y CTA */}
            <div className="md:col-span-7 space-y-4">
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-[10px] font-bold tracking-wider uppercase text-emerald-400">
                Control Total al Volante
              </div>
              <h2 className="text-2xl sm:text-4xl font-black tracking-tight leading-tight">
                Mantén el pulso de tu estadía y tarifa en tiempo real
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 max-w-md leading-relaxed">
                Recibe notificaciones automáticas antes de que finalice tu tiempo, extiende tu reserva con un toque o abre la navegación directa hacia tu plaza en Waze o Google Maps.
              </p>
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => scrollTo('mapa')}
                  className="bg-white text-slate-950 px-6 py-3 rounded-full text-xs font-bold hover:bg-slate-200 transition cursor-pointer"
                >
                  Buscar mi plaza ahora
                </button>
              </div>
            </div>

            {/* Columna Derecha: Mockup del Pase Digital QR */}
            <div className="md:col-span-5 flex justify-center">
              <div className="w-[220px] bg-slate-900 border-2 border-slate-800 rounded-3xl p-4 shadow-xl text-center space-y-3">
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide">Pase de Acceso</div>
                <div className="text-lg font-black text-white">S/ 3.50</div>
                <div className="w-28 h-28 bg-white p-2 rounded-2xl mx-auto flex items-center justify-center">
                  <QRCodeSVG value="SMART-PARK-DEMO-PASS" size={96} />
                </div>
                <div className="text-[10px] text-emerald-400 font-bold bg-emerald-500/10 py-1 rounded-full">
                  Tolerancia: 14:58 min
                </div>
                <div className="text-[9px] text-slate-400">
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
      <ScrollRevealSection id="mapa" className="py-16 px-4 sm:px-6 max-w-6xl mx-auto text-left">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400 text-xs font-bold mb-2">
              <Radio className="w-3.5 h-3.5 animate-pulse" />
              Radar Activo de Ayacucho
            </div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
              Cocheras Afiliadas con Cupos Disponibles
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
              Haz clic en cualquier establecimiento para visualizar su plano CAD 2D y reservar plaza al instante.
            </p>
          </div>

          {/* Buscador Rápido */}
          <div className="w-full md:w-72">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                type="text"
                placeholder="Buscar por calle o nombre..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9 pr-4 py-2 rounded-full text-xs bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800"
              />
            </div>
          </div>
        </div>

        {/* Componente del Mapa de Ayacucho */}
        <div className="rounded-[32px] overflow-hidden border border-slate-200 dark:border-slate-800 shadow-lg bg-white dark:bg-slate-900 p-2 sm:p-4">
          <AyacuchoMap
            establishments={establishments}
            onSelectParking={(p) => onSelectParking && onSelectParking(p)}
          />
        </div>
      </ScrollRevealSection>

      {/* =========================================================================
          8. DOBLE PERSPECTIVA: CONDUCTORES VS DUEÑOS DE COCHERA
          ========================================================================= */}
      <ScrollRevealSection id="tecnologia" className="py-12 px-4 sm:px-6 max-w-6xl mx-auto text-left">
        <div className="text-center max-w-xl mx-auto mb-8 space-y-3">
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
            Diseñado para Todo el Ecosistema
          </h2>
          <div className="inline-flex p-1 bg-slate-100 dark:bg-slate-800 rounded-full">
            <button
              type="button"
              onClick={() => setActiveAudienceTab('driver')}
              className={`px-5 py-2 rounded-full text-xs font-bold transition cursor-pointer ${
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
              className={`px-5 py-2 rounded-full text-xs font-bold transition cursor-pointer ${
                activeAudienceTab === 'owner'
                  ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              Para Dueños de Cochera
            </button>
          </div>
        </div>

        <div className="bg-white dark:bg-slate-900 rounded-[32px] border border-slate-200 dark:border-slate-800 p-8 sm:p-12 shadow-sm">
          {activeAudienceTab === 'driver' ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="space-y-2">
                <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-xs">
                  01
                </div>
                <h4 className="font-bold text-sm text-slate-900 dark:text-white">Cero Vueltas Inútiles</h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Sabrás de antemano si hay cupos libres antes de llegar a la zona céntrica de Ayacucho.
                </p>
              </div>

              <div className="space-y-2">
                <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-xs">
                  02
                </div>
                <h4 className="font-bold text-sm text-slate-900 dark:text-white">Entrada Ágil con Placa</h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Sin tickets de papel que se pierden. Tu placa registrada activa la barrera en garita.
                </p>
              </div>

              <div className="space-y-2">
                <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center font-bold text-xs">
                  03
                </div>
                <h4 className="font-bold text-sm text-slate-900 dark:text-white">Facturación Digital</h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Recibe tus boletas o facturas automáticamente en tu historial y por correo electrónico.
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="space-y-2">
                <div className="w-8 h-8 rounded-full bg-lime-400 dark:bg-lime-500/20 text-slate-950 dark:text-lime-400 flex items-center justify-center font-bold text-xs">
                  01
                </div>
                <h4 className="font-bold text-sm text-slate-900 dark:text-white">Cero Fugas de Dinero</h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Cada entrada y salida queda auditada en la nube con foto del vehículo y cálculo automático.
                </p>
              </div>

              <div className="space-y-2">
                <div className="w-8 h-8 rounded-full bg-lime-400 dark:bg-lime-500/20 text-slate-950 dark:text-lime-400 flex items-center justify-center font-bold text-xs">
                  02
                </div>
                <h4 className="font-bold text-sm text-slate-900 dark:text-white">Plano CAD 2D Flexible</h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Dibuja y reordena tus plazas de autos, camionetas y motos en nuestro editor interactivo en minutos.
                </p>
              </div>

              <div className="space-y-2">
                <div className="w-8 h-8 rounded-full bg-lime-400 dark:bg-lime-500/20 text-slate-950 dark:text-lime-400 flex items-center justify-center font-bold text-xs">
                  03
                </div>
                <h4 className="font-bold text-sm text-slate-900 dark:text-white">Reportes y Arqueo</h4>
                <p className="text-xs text-slate-500 leading-relaxed">
                  Cierres de caja automáticos por turno de garita, liquidaciones y analíticas de rentabilidad.
                </p>
              </div>
            </div>
          )}
        </div>
      </ScrollRevealSection>

      {/* =========================================================================
          9. PREGUNTAS FRECUENTES (FAQ ACORDEÓN)
          ========================================================================= */}
      <ScrollRevealSection id="faq" className="py-12 px-4 sm:px-6 max-w-4xl mx-auto text-left">
        <div className="text-center mb-10">
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
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden"
              >
                <button
                  type="button"
                  onClick={() => setActiveFaq(isOpen ? -1 : idx)}
                  className="w-full p-5 text-left flex items-center justify-between gap-4 cursor-pointer"
                >
                  <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">{item.q}</span>
                  <div className={`p-1 rounded-full bg-slate-100 dark:bg-slate-800 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}>
                    <ChevronDown className="w-4 h-4 text-slate-500" />
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
                      <div className="px-5 pb-5 text-xs text-slate-600 dark:text-slate-400 leading-relaxed border-t border-slate-100 dark:border-slate-800/80 pt-3">
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
          10. FOOTER NEGRO REDONDEADO (ESTILO FINTECH)
          ========================================================================= */}
      <footer className="mt-16 max-w-6xl mx-auto px-4 sm:px-6">
        <div className="rounded-t-[36px] sm:rounded-t-[44px] bg-slate-950 text-white p-10 sm:p-14 text-xs space-y-8">
          <div className="flex flex-col md:flex-row items-center md:items-start justify-between gap-8 text-center md:text-left">
            <div className="space-y-2">
              <BrandLogo dark={true} />
              <p className="text-[11px] text-slate-400 max-w-xs">
                Plataforma tecnológica de estacionamientos inteligentes de Ayacucho, Perú.
              </p>
            </div>

            <div className="flex flex-wrap justify-center gap-6 font-semibold text-slate-300 text-xs">
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

          <div className="border-t border-slate-800 pt-6 flex flex-col sm:flex-row items-center justify-between text-slate-500 text-[11px] gap-3">
            <span>© {new Date().getFullYear()} Smart-Park. Todos los derechos reservados.</span>
            <span>Desarrollado para Huamanga, Ayacucho</span>
          </div>
        </div>
      </footer>

    </div>
  );
};

export default LandingPage;
