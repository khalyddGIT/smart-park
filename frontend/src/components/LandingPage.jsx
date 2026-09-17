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
  const [activeAudienceTab, setActiveAudienceTab] = useState('driver'); // 'driver' | 'owner'

  // Lista garantizada de cocheras: prop establishments o iniciales de Huamanga
  const effectiveList = useMemo(() => {
    return Array.isArray(establishments) && establishments.length > 0
      ? establishments
      : (INITIAL_ESTABLISHMENTS || []);
  }, [establishments]);

  // Cocheras filtradas para el mapa interactivo
  const mapParkings = useMemo(() => {
    if (!searchTerm.trim()) return effectiveList;
    const q = searchTerm.toLowerCase();
    const filtered = effectiveList.filter((p) => 
      (p.name || '').toLowerCase().includes(q) || 
      (p.address || '').toLowerCase().includes(q)
    );
    return filtered.length > 0 ? filtered : effectiveList;
  }, [effectiveList, searchTerm]);

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

  // Animaciones GSAP de alto impacto: levitación 3D, parallax y revelado en scroll
  useGSAP(() => {
    // 1. Levitación física 3D continua de los mockups de smartphones en el Hero
    gsap.to('.hero-phone-1', {
      y: '-=10',
      rotation: '+=1.8',
      duration: 3.4,
      ease: 'sine.inOut',
      repeat: -1,
      yoyo: true
    });

    gsap.to('.hero-phone-2', {
      y: '+=9',
      rotation: '-=1.4',
      duration: 3.8,
      ease: 'sine.inOut',
      repeat: -1,
      yoyo: true,
      delay: 0.35
    });

    // 2. Parallax de profundidad con ScrollTrigger en los mockups al hacer scroll
    gsap.to(['.hero-phone-1', '.hero-phone-2'], {
      yPercent: -14,
      ease: 'none',
      scrollTrigger: {
        trigger: '#hero',
        start: 'top top',
        end: 'bottom top',
        scrub: 1
      }
    });

    // 3. Entrada escalonada de las marcas aliadas en el Trust Bar
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
        toggleActions: 'play none none none'
      },
      opacity: 0,
      y: 15,
      duration: 0.65,
      stagger: 0.15,
      ease: 'power3.out'
    });
  }, { scope: landingRef });

  return (
    <div ref={landingRef} className="min-h-screen bg-[#F8FAFC] dark:bg-[#06090F] text-slate-900 dark:text-slate-100 selection:bg-lime-400 selection:text-slate-950 transition-colors duration-300 font-sans pb-12 relative overflow-x-hidden">
      
      {/* Halo ambiental expansivo de fondo en Modo Oscuro */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[1400px] h-[700px] bg-gradient-to-b from-emerald-500/10 via-lime-500/5 to-transparent dark:from-emerald-500/15 dark:via-lime-400/5 dark:to-transparent rounded-full blur-3xl opacity-70" />
        <div className="absolute inset-0 bg-[radial-gradient(#94a3b8_1px,transparent_1px)] dark:bg-[radial-gradient(#1e293b_1px,transparent_1px)] [background-size:32px_32px] opacity-20 dark:opacity-30" />
      </div>

      {/* =========================================================================
          1. HEADER FLOTANTE EN ISLA DE VIDRIO (EXPANSIVO WIDESCREEN)
          ========================================================================= */}
      <header className="fixed top-4 left-0 right-0 z-50 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white/90 dark:bg-slate-900/90 backdrop-blur-xl border border-slate-200/80 dark:border-slate-800/80 rounded-full px-6 py-3 shadow-md shadow-black/5 flex items-center justify-between">
            
            {/* Logotipo Oficial */}
            <div className="flex items-center gap-2.5">
              <BrandLogo dark={isDark} />
            </div>

            {/* Enlaces de Navegación de Escritorio */}
            <nav className="hidden md:flex items-center gap-8 text-xs font-semibold text-slate-600 dark:text-slate-300 tracking-wide">
              <button onClick={() => scrollTo('hero')} className="hover:text-emerald-500 dark:hover:text-lime-400 transition cursor-pointer">
                Inicio
              </button>
              <button onClick={() => scrollTo('mapa')} className="hover:text-emerald-500 dark:hover:text-lime-400 transition cursor-pointer">
                Mapa en Vivo
              </button>
              <button onClick={() => scrollTo('beneficios')} className="hover:text-emerald-500 dark:hover:text-lime-400 transition cursor-pointer">
                Ventajas
              </button>
              <button onClick={() => scrollTo('tecnologia')} className="hover:text-emerald-500 dark:hover:text-lime-400 transition cursor-pointer">
                Tecnología
              </button>
              <button onClick={() => scrollTo('faq')} className="hover:text-emerald-500 dark:hover:text-lime-400 transition cursor-pointer">
                Preguntas
              </button>
            </nav>

            {/* Acciones de la Cabecera */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={toggleTheme}
                aria-label="Cambiar tema"
                className="w-9 h-9 rounded-full bg-slate-100 dark:bg-slate-800/90 text-slate-600 dark:text-slate-300 flex items-center justify-center hover:scale-105 transition cursor-pointer border border-transparent dark:border-slate-700/60"
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
                className="bg-slate-950 dark:bg-white text-white dark:text-slate-950 px-3.5 py-1.5 sm:px-5 sm:py-2.5 rounded-full text-[11px] sm:text-xs font-bold shadow-md hover:bg-slate-800 dark:hover:bg-slate-100 transition cursor-pointer whitespace-nowrap"
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
              className="md:hidden max-w-7xl mx-auto mt-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl p-4 shadow-2xl space-y-3"
            >
              <div className="flex flex-col gap-2.5 text-sm font-semibold text-slate-800 dark:text-slate-200">
                <button onClick={() => { setMobileMenuOpen(false); scrollTo('hero'); }} className="text-left py-1.5 border-b border-slate-100 dark:border-slate-800">
                  Inicio
                </button>
                <button onClick={() => { setMobileMenuOpen(false); scrollTo('mapa'); }} className="text-left py-1.5 border-b border-slate-100 dark:border-slate-800">
                  Mapa en Vivo
                </button>
                <button onClick={() => { setMobileMenuOpen(false); scrollTo('beneficios'); }} className="text-left py-1.5 border-b border-slate-100 dark:border-slate-800">
                  Ventajas
                </button>
                <button onClick={() => { setMobileMenuOpen(false); scrollTo('tecnologia'); }} className="text-left py-1.5 border-b border-slate-100 dark:border-slate-800">
                  Tecnología
                </button>
                <button onClick={() => { setMobileMenuOpen(false); scrollTo('faq'); }} className="text-left py-1.5">
                  Preguntas Frecuentes
                </button>
              </div>
              <div className="pt-2 flex flex-col gap-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onOpenAuth && onOpenAuth('login');
                  }}
                  className="w-full py-2.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-bold flex items-center justify-center gap-2"
                >
                  <LogIn className="w-3.5 h-3.5" />
                  Iniciar Sesión
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onOpenAuth && onOpenAuth('affiliation');
                  }}
                  className="w-full py-2.5 rounded-full bg-emerald-600 text-white text-xs font-bold shadow-md hover:bg-emerald-700 transition"
                >
                  Afiliar mi Cochera
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* =========================================================================
          2. HERO ISLAND (EXPANSIVO, RESPONSIVE & SLEEK DARK MODE)
          ========================================================================= */}
      <main id="hero" className="pt-24 sm:pt-28 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        <div className="relative rounded-[28px] sm:rounded-[40px] overflow-hidden bg-gradient-to-br from-[#E2F952] via-[#D5F83C] to-[#BAEF2E] dark:from-[#0B1324] dark:via-[#080D1A] dark:to-[#050811] dark:border dark:border-emerald-500/20 text-slate-950 dark:text-white p-5 sm:p-8 md:p-10 lg:p-14 shadow-2xl transition-all">
          
          {/* Malla decorativa de fondo y resplandor radial */}
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(255,255,255,0.45),transparent_55%)] dark:bg-[radial-gradient(circle_at_80%_20%,rgba(16,185,129,0.18),transparent_60%)] pointer-events-none" />
          <div className="absolute -top-24 -right-24 w-96 h-96 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-6 items-center relative z-10">
            
            {/* Columna Izquierda: Copywriting y CTA */}
            <div className="lg:col-span-7 space-y-5 text-center lg:text-left">
              
              {/* Titular Principal de Impacto */}
              <h1 className="text-3xl sm:text-5xl lg:text-6xl xl:text-6xl font-black tracking-tight leading-[1.08]">
                Estaciona al instante en la ciudad
              </h1>

              {/* Subtítulo Conciso */}
              <p className="text-xs sm:text-base text-slate-800 dark:text-slate-300 max-w-lg leading-relaxed font-medium mx-auto lg:mx-0">
                Encuentra plaza en tiempo real, ingresa con lectura automática de placa o código QR, y paga la tarifa exacta al minuto mediante Yape, Plin o tarjetas.
              </p>

              {/* Botones de Acción Primarios */}
              <div className="pt-2 flex flex-wrap items-center justify-center lg:justify-start gap-3.5">
                <MagneticButton
                  onClick={() => scrollTo('mapa')}
                  className="bg-slate-950 dark:bg-lime-400 text-white dark:text-slate-950 px-7 py-3 rounded-full text-xs sm:text-sm font-black shadow-xl hover:scale-105 transition cursor-pointer flex items-center gap-2"
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

              {/* Flecha Doodle Orgánica SVG */}
              <div className="hidden lg:block pt-1">
                <svg className="w-36 h-10 text-slate-900/70 dark:text-lime-400/80" viewBox="0 0 160 50" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                  <path d="M 10 15 C 50 5, 90 28, 140 32" strokeDasharray="5 3" />
                  <polyline points="132,24 142,32 134,40" />
                </svg>
              </div>
            </div>

            {/* Columna Derecha: Mockups 3D Superpuestos Expansivos */}
            <div className="lg:col-span-5 relative flex justify-center lg:justify-end mt-4 lg:mt-0">
              <div className="relative w-full max-w-[300px] sm:max-w-[360px] lg:max-w-[420px] h-[340px] sm:h-[390px] lg:h-[440px]">
                
                {/* Teléfono 1: Fondo Oscuro Tilted (Plano CAD 2D & LPR) */}
                <motion.div
                  initial={{ y: 15, opacity: 0, rotate: 5 }}
                  animate={{ y: 0, opacity: 1, rotate: 5 }}
                  transition={{ duration: 0.7, ease: FLUID_EASE }}
                  className="hero-phone-1 absolute right-0 top-3 sm:top-4 w-[195px] sm:w-[230px] lg:w-[260px] bg-slate-950 rounded-[28px] sm:rounded-[32px] p-2.5 sm:p-3 shadow-2xl border-4 border-slate-800 text-white z-10 will-change-transform"
                >
                  <div className="w-14 sm:w-16 h-2.5 sm:h-3 bg-slate-800 rounded-full mx-auto mb-2 sm:mb-2.5" />
                  
                  <div className="space-y-2 sm:space-y-2.5 text-left">
                    <div className="flex items-center justify-between px-1">
                      <span className="text-[8px] sm:text-[9px] font-bold text-slate-400">PLANO 2D EN VIVO</span>
                      <span className="text-[7px] sm:text-[8px] font-bold text-emerald-400">15 Libres</span>
                    </div>

                    {/* Plazas */}
                    <div className="grid grid-cols-3 gap-1 bg-slate-900/90 p-1.5 sm:p-2 rounded-xl border border-slate-800">
                      <div className="bg-emerald-500/20 border border-emerald-500/50 rounded p-1 text-center">
                        <span className="text-[7px] sm:text-[8px] font-bold text-emerald-400">A-01</span>
                      </div>
                      <div className="bg-red-500/20 border border-red-500/50 rounded p-1 text-center">
                        <span className="text-[7px] sm:text-[8px] font-bold text-red-400">A-02</span>
                      </div>
                      <div className="bg-emerald-500/20 border border-emerald-500/50 rounded p-1 text-center">
                        <span className="text-[7px] sm:text-[8px] font-bold text-emerald-400">A-03</span>
                      </div>
                      <div className="bg-emerald-500/20 border border-emerald-500/50 rounded p-1 text-center">
                        <span className="text-[7px] sm:text-[8px] font-bold text-emerald-400">B-01</span>
                      </div>
                      <div className="bg-red-500/20 border border-red-500/50 rounded p-1 text-center">
                        <span className="text-[7px] sm:text-[8px] font-bold text-red-400">B-02</span>
                      </div>
                      <div className="bg-emerald-500/20 border border-emerald-500/50 rounded p-1 text-center">
                        <span className="text-[7px] sm:text-[8px] font-bold text-emerald-400">B-03</span>
                      </div>
                    </div>

                    {/* LPR */}
                    <div className="p-1.5 sm:p-2 rounded-lg bg-slate-900 border border-slate-800 space-y-0.5">
                      <div className="flex items-center gap-1 text-[8px] sm:text-[9px] text-lime-400 font-bold">
                        <Camera className="w-2.5 h-2.5" />
                        LPR-IA Detectado
                      </div>
                      <div className="text-[9px] sm:text-[10px] font-mono font-black text-slate-100 bg-slate-800 px-1.5 py-0.5 rounded text-center">
                        ABC-123 · Auto
                      </div>
                    </div>

                    <div className="text-[7px] sm:text-[8px] text-center text-slate-400">
                      Barrera automática desbloqueada
                    </div>
                  </div>
                </motion.div>

                {/* Teléfono 2: Primer Plano (Búsqueda y Pase Digital Adaptado a Dark Mode) */}
                <motion.div
                  initial={{ y: 30, opacity: 0, rotate: -2 }}
                  animate={{ y: 0, opacity: 1, rotate: -2 }}
                  transition={{ duration: 0.7, delay: 0.1, ease: FLUID_EASE }}
                  className="hero-phone-2 absolute left-0 top-0 w-[205px] sm:w-[245px] lg:w-[275px] bg-white dark:bg-slate-900/95 dark:backdrop-blur-md text-slate-900 dark:text-white rounded-[28px] sm:rounded-[32px] p-2.5 sm:p-3.5 shadow-2xl border-4 border-slate-900/10 dark:border-slate-700/80 z-20 text-left transition-colors will-change-transform"
                >
                  <div className="w-20 h-3 bg-slate-200 dark:bg-slate-700 rounded-full mx-auto mb-2.5" />
                  
                  <div className="space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] sm:text-xs font-black text-slate-900 dark:text-white">Ayacucho Parking</span>
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                    </div>

                    <div className="flex items-center gap-1.5 bg-slate-100 dark:bg-slate-800 px-2.5 py-1.5 rounded-full text-[9px] sm:text-[10px] text-slate-500 dark:text-slate-400 border border-slate-200/50 dark:border-slate-700/60">
                      <Search className="w-3 h-3 shrink-0" />
                      <span className="truncate">Plaza Mayor, Jr. Callao...</span>
                    </div>

                    <div className="p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 space-y-1.5">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] sm:text-xs font-bold text-slate-900 dark:text-white">Cochera Central</span>
                        <span className="text-[9px] sm:text-[10px] font-black text-emerald-600 dark:text-lime-400">S/ 3.50/h</span>
                      </div>
                      <div className="flex items-center gap-1 text-[8px] sm:text-[9px] text-slate-500 dark:text-slate-400">
                        <MapPin className="w-2.5 h-2.5 text-emerald-500 shrink-0" />
                        <span className="truncate">Jr. 28 de Julio · 12 libres</span>
                      </div>
                      <div className="w-full py-1.5 rounded-lg bg-slate-950 dark:bg-lime-400 text-white dark:text-slate-950 text-[9px] sm:text-[10px] font-black text-center shadow-sm">
                        Reservar Plaza
                      </div>
                    </div>

                    <div className="p-2 rounded-xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800/60 flex items-center gap-2.5">
                      <div className="w-8 h-8 bg-white dark:bg-slate-800 p-0.5 rounded-lg border border-emerald-300 dark:border-emerald-700/60 flex items-center justify-center shrink-0">
                        <QrCode className="w-5 h-5 text-slate-900 dark:text-emerald-400" />
                      </div>
                      <div className="text-[8px] sm:text-[9px] min-w-0">
                        <p className="font-bold text-emerald-950 dark:text-emerald-300 truncate">Pase QR Activo</p>
                        <p className="text-emerald-700 dark:text-emerald-400">Tolerancia: 14:20 min</p>
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
          3. SECCIÓN 2: MAPA EN VIVO DE AYACUCHO (COLOCADO COMO SEGUNDO)
          ========================================================================= */}
      <ScrollRevealSection id="mapa" className="pt-10 pb-6 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full text-left">
        <div className="flex flex-col md:flex-row md:items-end justify-between mb-5 gap-3">
          <div>
            <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
              Cocheras Afiliadas en Ayacucho
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-xl">
              Haz clic en cualquier establecimiento para visualizar su plano CAD 2D y reservar plaza al instante.
            </p>
          </div>

          <div className="w-full md:w-72">
            <div className="relative">
              <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
              <Input
                type="text"
                placeholder="Buscar calle o nombre..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8 pr-3 py-1.5 rounded-full text-xs bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-slate-900 dark:text-white"
              />
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
      <ScrollRevealSection className="py-10 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full text-left">
        <div className="mb-7 max-w-2xl">
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 dark:text-white">
            Saca el Máximo Provecho a Cada Minuto
          </h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1.5 leading-relaxed">
            Herramientas diseñadas tanto para el conductor diario como para la administración de cocheras.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5 sm:gap-6">
          
          {/* Tarjeta 1: Red Unificada de Cocheras */}
          <DynamicTiltCard className="rounded-3xl bg-white dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 p-7 sm:p-8 flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 transition-colors">
            <div className="space-y-3">
              <Layers className="w-6 h-6 text-emerald-600 dark:text-lime-400" strokeWidth={1.5} />
              
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
                className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-emerald-600 dark:text-lime-400 hover:underline cursor-pointer group"
              >
                Explorar directorio
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </button>

              <div className="text-right">
                <span className="bento-stat-val block text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight font-mono">
                  +12
                </span>
                <span className="block text-[11px] text-slate-400 dark:text-slate-500 font-medium">
                  Sedes en Ayacucho
                </span>
              </div>
            </div>
          </DynamicTiltCard>

          {/* Tarjeta 2: Telemetría y Control en Tiempo Real */}
          <DynamicTiltCard className="rounded-3xl bg-white dark:bg-slate-900/80 border border-slate-200/80 dark:border-slate-800 p-7 sm:p-8 flex flex-col justify-between hover:border-slate-300 dark:hover:border-slate-700 transition-colors">
            <div className="space-y-3">
              <Radio className="w-6 h-6 text-emerald-600 dark:text-lime-400" strokeWidth={1.5} />
              
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
                className="inline-flex items-center gap-1.5 text-xs sm:text-sm font-bold text-emerald-600 dark:text-lime-400 hover:underline cursor-pointer group"
              >
                Ver arquitectura tecnológica
                <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
              </button>

              <div className="text-right">
                <span className="bento-stat-val block text-2xl sm:text-3xl font-black text-slate-900 dark:text-white tracking-tight font-mono">
                  &lt; 2s
                </span>
                <span className="block text-[11px] text-slate-400 dark:text-slate-500 font-medium">
                  Acceso automatizado
                </span>
              </div>
            </div>
          </DynamicTiltCard>

        </div>
      </ScrollRevealSection>

      {/* =========================================================================
          5. SECCIÓN 4: VENTAJAS EXCLUSIVAS (ICONOGRAFÍA MINIMALISTA)
          ========================================================================= */}
      <ScrollRevealSection id="beneficios" className="py-10 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
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
                className="text-xs sm:text-sm font-bold text-emerald-600 dark:text-lime-400 hover:underline cursor-pointer"
              >
                Afilia tu cochera en 24 horas →
              </button>
            </div>
          </div>

          {/* Columna Derecha: Cuadrícula 2x2 Limpia */}
          <div className="lg:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-6 sm:gap-7">
            
            <div className="p-4 sm:p-5 rounded-2xl bg-white/70 dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800 space-y-2">
              <Clock className="w-5 h-5 text-emerald-600 dark:text-lime-400" />
              <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                15 Minutos de Tolerancia
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Ventana de llegada garantizada. Tu cupo permanece reservado y protegido contra cancelaciones.
              </p>
            </div>

            <div className="p-4 sm:p-5 rounded-2xl bg-white/70 dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800 space-y-2">
              <Camera className="w-5 h-5 text-emerald-600 dark:text-lime-400" />
              <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                Cámara LPR & Visión AI
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Apertura automática de barrera en garita mediante lectura de placas en menos de 2 segundos.
              </p>
            </div>

            <div className="p-4 sm:p-5 rounded-2xl bg-white/70 dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800 space-y-2">
              <CreditCard className="w-5 h-5 text-emerald-600 dark:text-lime-400" />
              <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                Tarifas Justas al Minuto
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Paga exactamente los minutos utilizados vía Yape, Plin o tarjeta con boleta electrónica.
              </p>
            </div>

            <div className="p-4 sm:p-5 rounded-2xl bg-white/70 dark:bg-slate-900/60 border border-slate-200/70 dark:border-slate-800 space-y-2">
              <QrCode className="w-5 h-5 text-emerald-600 dark:text-lime-400" />
              <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                Pase QR 100% Offline
              </h4>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                ¿Sin señal en el sótano? Guarda tu pase en el teléfono y accede sin depender de datos móviles.
              </p>
            </div>

          </div>

        </div>
      </ScrollRevealSection>

      {/* =========================================================================
          6. SECCIÓN 5: NUESTROS ALIADOS / TRUST BAR COMPACTO
          ========================================================================= */}
      <section className="py-6 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full text-center border-y border-slate-200/60 dark:border-slate-800/60 my-4">
        <h3 className="text-[10px] sm:text-xs uppercase font-bold tracking-wider text-slate-400 dark:text-slate-500 mb-3">
          Ecosistema Conectado a los Principales Medios del Perú
        </h3>
        <div className="trust-partners-container flex flex-wrap items-center justify-center gap-x-6 gap-y-3.5 sm:gap-10 lg:gap-14 text-slate-400 dark:text-slate-500 font-bold text-xs sm:text-sm">
          <span className="trust-partner-item hover:text-emerald-500 transition cursor-default">Yape</span>
          <span className="trust-partner-item hover:text-emerald-500 transition cursor-default">Plin</span>
          <span className="trust-partner-item hover:text-emerald-500 transition cursor-default">Visa</span>
          <span className="trust-partner-item hover:text-emerald-500 transition cursor-default">Mastercard</span>
          <span className="trust-partner-item hover:text-emerald-500 transition cursor-default">BCP</span>
          <span className="trust-partner-item hover:text-emerald-500 transition cursor-default">BBVA</span>
          <span className="trust-partner-item hover:text-emerald-500 transition cursor-default">Interbank</span>
          <span className="trust-partner-item hover:text-emerald-500 transition cursor-default">SAT Huamanga</span>
        </div>
      </section>

      {/* =========================================================================
          7. SECCIÓN 6: CONTRAST DARK ISLAND BANNER (LIMPIO & EXPANSIVO)
          ========================================================================= */}
      <ScrollRevealSection className="py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full">
        <div className="relative rounded-[28px] sm:rounded-[40px] bg-gradient-to-br from-[#0B1324] via-[#070B14] to-[#04060A] text-white p-6 sm:p-10 lg:p-14 overflow-hidden border border-slate-800 dark:border-emerald-500/20 text-left shadow-2xl">
          <div className="absolute -right-16 -top-16 w-80 h-80 bg-emerald-500/15 rounded-full blur-3xl pointer-events-none" />
          <div className="absolute -left-16 -bottom-16 w-64 h-64 bg-lime-500/10 rounded-full blur-3xl pointer-events-none" />
          
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
                  className="bg-white dark:bg-lime-400 text-slate-950 px-6 py-2.5 rounded-full text-xs sm:text-sm font-black hover:bg-slate-200 dark:hover:bg-lime-300 transition cursor-pointer shadow-lg"
                >
                  Buscar mi plaza ahora
                </button>
              </div>
            </div>

            <div className="md:col-span-5 flex justify-center">
              <div className="w-[210px] bg-slate-900/90 border border-slate-800 rounded-3xl p-4 shadow-2xl text-center space-y-2.5 backdrop-blur-sm">
                <div className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Pase de Acceso</div>
                <div className="text-lg font-black text-white">S/ 3.50</div>
                <div className="w-28 h-28 bg-white p-2 rounded-2xl mx-auto flex items-center justify-center shadow-inner">
                  <QRCodeSVG value="SMART-PARK-DEMO-PASS" size={96} />
                </div>
                <div className="text-[9px] text-emerald-400 font-bold bg-emerald-500/15 py-1 rounded-full border border-emerald-500/20">
                  Tolerancia: 14:58 min
                </div>
                <div className="text-[9px] text-slate-400 font-medium">
                  Cochera Plaza Mayor · Plaza A-04
                </div>
              </div>
            </div>
          </div>
        </div>
      </ScrollRevealSection>

      {/* =========================================================================
          8. SECCIÓN 7: DOBLE PERSPECTIVA: CONDUCTORES VS DUEÑOS DE COCHERA
          ========================================================================= */}
      <ScrollRevealSection id="tecnologia" className="py-8 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto w-full text-left">
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

        <div className="bg-white dark:bg-slate-900 rounded-[28px] sm:rounded-[36px] border border-slate-200 dark:border-slate-800 p-7 sm:p-10 shadow-sm">
          {activeAudienceTab === 'driver' ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
              <div className="p-4 sm:p-5 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/50 dark:border-slate-800/60 space-y-2">
                <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">Cero Vueltas Inútiles</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Sabrás de antemano si hay cupos libres antes de llegar a la zona céntrica de Ayacucho.
                </p>
              </div>

              <div className="p-4 sm:p-5 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/50 dark:border-slate-800/60 space-y-2">
                <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">Entrada Ágil con Placa</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Sin tickets de papel que se pierden. Tu placa registrada activa la barrera en garita.
                </p>
              </div>

              <div className="p-4 sm:p-5 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/50 dark:border-slate-800/60 space-y-2">
                <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">Facturación Digital</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Recibe tus boletas o facturas automáticamente en tu historial y por correo electrónico.
                </p>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 sm:gap-8">
              <div className="p-4 sm:p-5 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/50 dark:border-slate-800/60 space-y-2">
                <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">Cero Fugas de Dinero</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Cada entrada y salida queda auditada en la nube con foto del vehículo y cálculo automático.
                </p>
              </div>

              <div className="p-4 sm:p-5 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/50 dark:border-slate-800/60 space-y-2">
                <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">Plano CAD 2D Flexible</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
                  Dibuja y reordena tus plazas de autos, camionetas y motos en nuestro editor interactivo en minutos.
                </p>
              </div>

              <div className="p-4 sm:p-5 rounded-2xl bg-slate-50/70 dark:bg-slate-800/40 border border-slate-200/50 dark:border-slate-800/60 space-y-2">
                <h4 className="font-bold text-xs sm:text-sm text-slate-900 dark:text-white">Reportes y Arqueo</h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
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
          10. FOOTER NEGRO REDONDEADO CENTRADO & ELEGANTE
          ========================================================================= */}
      <footer className="mt-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 w-full">
        <div className="relative rounded-t-[32px] sm:rounded-t-[44px] bg-slate-950 text-white p-8 sm:p-12 text-xs border-t border-x border-slate-800/80 overflow-hidden space-y-8">
          {/* Resplandor superior sutil */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-28 bg-emerald-500/10 blur-3xl pointer-events-none -z-0" />

          {/* Bloque Central: Logo y Descripción sin badges */}
          <div className="relative z-10 flex flex-col items-center justify-center text-center space-y-2.5">
            <button
              type="button"
              onClick={() => scrollTo('hero')}
              className="inline-flex items-center justify-center hover:opacity-90 transition-opacity cursor-pointer focus:outline-none"
              title="Ir al inicio"
            >
              <BrandLogo dark={true} iconSize="w-9 h-9 sm:w-10 sm:h-10" textClassName="text-2xl sm:text-3xl" />
            </button>

            <p className="text-xs sm:text-sm text-slate-400 max-w-md leading-relaxed">
              Plataforma tecnológica de estacionamientos inteligentes de Ayacucho, Perú.
            </p>
          </div>

          {/* Navegación Centrada */}
          <nav aria-label="Footer Navigation" className="relative z-10 flex flex-wrap items-center justify-center gap-2 sm:gap-4 text-slate-300 font-semibold text-xs sm:text-sm">
            <button
              type="button"
              onClick={() => scrollTo('hero')}
              className="px-3.5 py-1.5 rounded-xl hover:bg-slate-900 hover:text-emerald-400 transition-all cursor-pointer"
            >
              Inicio
            </button>
            <button
              type="button"
              onClick={() => scrollTo('mapa')}
              className="px-3.5 py-1.5 rounded-xl hover:bg-slate-900 hover:text-emerald-400 transition-all cursor-pointer"
            >
              Mapa en Vivo
            </button>
            <button
              type="button"
              onClick={() => scrollTo('beneficios')}
              className="px-3.5 py-1.5 rounded-xl hover:bg-slate-900 hover:text-emerald-400 transition-all cursor-pointer"
            >
              Ventajas
            </button>
            <button
              type="button"
              onClick={() => scrollTo('tecnologia')}
              className="px-3.5 py-1.5 rounded-xl hover:bg-slate-900 hover:text-emerald-400 transition-all cursor-pointer"
            >
              Tecnología
            </button>
            <button
              type="button"
              onClick={() => onOpenTerms && onOpenTerms()}
              className="px-3.5 py-1.5 rounded-xl hover:bg-slate-900 hover:text-emerald-400 transition-all cursor-pointer"
            >
              Términos y Condiciones
            </button>
          </nav>

          {/* Barra Inferior: Derechos y Ubicación */}
          <div className="relative z-10 border-t border-slate-800/90 pt-6 flex flex-col sm:flex-row items-center justify-between text-slate-500 text-xs gap-3 text-center sm:text-left">
            <span>© {new Date().getFullYear()} Smart-Park. Todos los derechos reservados.</span>
            <span>Desarrollado para Huamanga, Ayacucho</span>
          </div>
        </div>
      </footer>

    </div>
  );
};

export default LandingPage;
