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
  CheckCircle2,
  TrendingUp,
  Sun,
  Moon,
  Star,
  ChevronLeft,
  Quote
} from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { QRCodeSVG } from 'qrcode.react';
import { AyacuchoMap } from './AyacuchoMap';
import { BrandLogo } from './BrandLogo';
import { useTheme } from '../context/ThemeContext';

// Curva elástica ultra fluida acelerada por hardware (GPU)
const FLUID_EASE = [0.16, 1, 0.3, 1];

// 1. HERO REVEAL: REVELACIÓN PALABRA POR PALABRA
const TextRevealHeadline = ({ text }) => {
  const words = text.split(' ');
  return (
    <span className="inline-block">
      {words.map((word, i) => (
        <motion.span
          key={i}
          initial={{ opacity: 0, y: 22, filter: 'blur(6px)' }}
          animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
          transition={{
            duration: 0.55,
            delay: 0.12 + i * 0.07,
            ease: FLUID_EASE
          }}
          className="inline-block mr-[0.25em]"
        >
          {word}
        </motion.span>
      ))}
    </span>
  );
};

// 4. MAGNETIC BUTTONS: BOTONES MAGNÉTICOS CTA CON SEGUIMIENTO DE CURSOR
const MagneticButton = ({ children, className = '', onClick, href, type = 'button' }) => {
  const ref = useRef(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const springX = useSpring(x, { stiffness: 220, damping: 18 });
  const springY = useSpring(y, { stiffness: 220, damping: 18 });

  const handleMouseMove = (e) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    x.set((e.clientX - centerX) * 0.22);
    y.set((e.clientY - centerY) * 0.22);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  if (href) {
    return (
      <motion.a
        ref={ref}
        href={href}
        onClick={onClick}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{ x: springX, y: springY }}
        whileHover={{ scale: 1.03 }}
        whileTap={{ scale: 0.97 }}
        className={`transform-gpu will-change-transform ${className}`}
      >
        {children}
      </motion.a>
    );
  }

  return (
    <motion.button
      ref={ref}
      type={type}
      onClick={onClick}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{ x: springX, y: springY }}
      whileHover={{ scale: 1.03 }}
      whileTap={{ scale: 0.97 }}
      className={`transform-gpu will-change-transform ${className}`}
    >
      {children}
    </motion.button>
  );
};

// 5. SCROLL REVEAL: REVELACIÓN DE SECCIONES CON FÍSICA CINEMÁTICA
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

// 12. CARD 3D HOVER: TARJETA 3D HOVER CON INERCIA
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
          <p className="text-xs font-bold text-[#004D49]/70 dark:text-emerald-200/70 font-sans">Cargando mapa en vivo de Ayacucho…</p>
        </div>
      )}
    </div>
  );
};

// 15. STICKY STORYTELLING: SECCIÓN PRINCIPAL PASO A PASO CON PANTALLA FIJA
const StickyStorytellingSection = () => {
  const [activeStep, setActiveStep] = useState(0);

  const steps = [
    {
      num: '01',
      title: 'Elige tu Cochera',
      desc: 'Explora las sedes disponibles en el mapa interactivo 3D de Ayacucho, verifica tarifas y plazas en vivo.',
      icon: MapPin,
      preview: (
        <div className="space-y-3 font-mono text-xs">
          <div className="flex items-center justify-between bg-slate-900/90 text-white p-3 rounded-2xl border border-emerald-500/40 shadow-md">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="font-bold text-white">Central Plaza Mayor</span>
            </div>
            <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded-full text-[10px] font-bold">
              12 Plazas Libres
            </span>
          </div>

          <div className="relative h-40 bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden flex flex-col justify-between p-3">
            <div className="absolute inset-0 bg-[linear-gradient(to_right,#1e293b_1px,transparent_1px),linear-gradient(to_bottom,#1e293b_1px,transparent_1px)] bg-[size:16px_16px] opacity-40 pointer-events-none" />
            
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-1.5">
              <div className="relative flex items-center justify-center">
                <span className="animate-ping absolute inline-flex h-10 w-10 rounded-full bg-emerald-400 opacity-40" />
                <div className="w-8 h-8 rounded-full bg-emerald-500 border-2 border-white shadow-lg flex items-center justify-center text-slate-950 font-black">
                  <Car className="w-4 h-4 text-slate-950" />
                </div>
              </div>
              <span className="bg-slate-950/90 text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-500/40">
                S/ 5.00 / h
              </span>
            </div>

            <div className="relative z-10 flex justify-between items-end text-[10px]">
              <span className="bg-slate-950/80 text-slate-300 px-2.5 py-1 rounded-lg border border-slate-800 flex items-center gap-1">
                <Navigation className="w-3 h-3 text-cyan-400 shrink-0" />
                <span>350m · 2 min llegada</span>
              </span>
              <span className="bg-emerald-500 text-slate-950 font-bold px-2 py-1 rounded-lg shadow-sm">
                Cajón A-04 Reservable
              </span>
            </div>
          </div>
        </div>
      )
    },
    {
      num: '02',
      title: 'Digita tu Placa & Horario',
      desc: 'Selecciona tu cajón preferido e ingresa tu placa directamente. No requiere registro ni trámites previos.',
      icon: Car,
      preview: (
        <div className="space-y-3 font-mono text-xs">
          <div className="bg-slate-900 p-3 rounded-2xl border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-24 h-9 bg-white text-slate-950 border-2 border-slate-400 rounded-lg flex flex-col items-center justify-center font-bold tracking-wider relative overflow-hidden shadow-inner">
                <span className="text-[7px] text-blue-700 tracking-widest leading-none font-sans font-black uppercase">PERU</span>
                <span className="text-sm font-black text-slate-900 leading-none">W1P-404</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block font-sans">Vehículo</span>
                <span className="text-xs font-bold text-white">Toyota Yaris (Gris)</span>
              </div>
            </div>
            <span className="text-emerald-400 text-xs font-bold bg-emerald-500/10 px-2 py-1 rounded-lg border border-emerald-500/30">
              Registrado
            </span>
          </div>

          <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800 space-y-2">
            <div className="flex justify-between items-center text-slate-300 text-xs">
              <span>Cajón Seleccionado:</span>
              <span className="text-emerald-400 font-bold text-sm bg-emerald-500/20 px-2 py-0.5 rounded-md border border-emerald-500/40">
                A-04 (Techado)
              </span>
            </div>
            <div className="flex justify-between items-center text-slate-400 text-[11px]">
              <span>Duración Estancia:</span>
              <span className="text-slate-200">2 Horas (S/ 10.00)</span>
            </div>
            <div className="flex justify-between items-center text-slate-400 text-[11px]">
              <span>Tolerancia de Llegada:</span>
              <span className="text-cyan-400 font-bold">+15 min de gracia</span>
            </div>
          </div>
        </div>
      )
    },
    {
      num: '03',
      title: 'Pase Digital & Detección OpenCV',
      desc: 'Genera tu Pase QR instantáneo. Al llegar a la garita, el sistema OpenCV reconoce tu placa y abre el portón.',
      icon: QrCode,
      preview: (
        <div className="bg-slate-900 p-4 rounded-2xl border border-emerald-500/40 text-center space-y-3 font-mono text-xs">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="text-emerald-400 font-bold text-[11px]">PASE DIGITAL #SPK-8912</span>
            <span className="bg-emerald-500 text-slate-950 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase">VALIDADO</span>
          </div>

          <div className="bg-white p-3 rounded-xl border border-slate-200 inline-block shadow-inner">
            <QRCodeSVG value="SPK-DEMO-2026-W1P404" size={88} />
          </div>

          <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 space-y-1 text-[11px] text-left">
            <div className="flex items-center justify-between text-emerald-400 font-bold">
              <span className="flex items-center gap-1">
                <Camera className="w-3.5 h-3.5 text-emerald-400 animate-pulse" /> OpenCV Gate
              </span>
              <span className="text-[10px] text-slate-400">99.4% precisión</span>
            </div>
            <p className="text-[10px] text-slate-300">✓ Detección de Placa W1P-404 exitosa</p>
            <p className="text-[10px] text-emerald-400 font-bold">✓ Barrera electromecánica abierta</p>
          </div>
        </div>
      )
    }
  ];

  return (
    <CinematicScrollSection id="sistema" className="py-12 sm:py-20 px-4 sm:px-6 lg:px-12 max-w-6xl mx-auto space-y-8">
      <div className="max-w-2xl mx-auto text-center space-y-2 px-2">
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-display font-extrabold text-[#002B29] dark:text-[#DFF7F0] tracking-tight">
          Estaciona rápido y <span className="text-[#004D49] dark:text-emerald-300">sin complicaciones</span>
        </h2>
        <p className="text-xs sm:text-sm text-[#004D49] dark:text-emerald-200/80 max-w-lg mx-auto font-medium">
          Sin descargar aplicaciones pesadas. Todo funciona directo desde tu navegador móvil.
        </p>
      </div>

      {/* Sticky Storytelling Layout */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center max-w-5xl mx-auto">
        
        {/* Pasos Seleccionables */}
        <div className="md:col-span-6 space-y-3">
          {steps.map((s, idx) => {
            const Icon = s.icon;
            const isSelected = activeStep === idx;
            return (
              <motion.div
                key={idx}
                onClick={() => setActiveStep(idx)}
                whileHover={{ scale: 1.01 }}
                className={`p-5 rounded-3xl border transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-white border-[#004D49] shadow-xl shadow-[#004D49]/10'
                    : 'bg-white/70 border-[#004D49]/15 hover:bg-white'
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 font-bold ${
                    isSelected ? 'bg-[#004D49] text-white' : 'bg-emerald-500/10 text-[#004D49] dark:text-emerald-300'
                  }`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-mono font-bold text-[#004D49] dark:text-emerald-300 block">{s.num}</span>
                    <h3 className="text-base font-bold text-slate-900">{s.title}</h3>
                    <p className="text-xs text-slate-600 leading-relaxed mt-1">{s.desc}</p>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Pantalla Sticky de Visualización de Proceso */}
        <div className="md:col-span-6 sticky top-24">
          <div className="bg-slate-950 p-6 rounded-3xl border border-slate-800 text-white shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <span className="text-xs font-mono font-bold text-emerald-400">
                Paso {activeStep + 1} — {steps[activeStep].title}
              </span>
            </div>
            
            <AnimatePresence mode="wait">
              <motion.div
                key={activeStep}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.25 }}
              >
                {steps[activeStep].preview}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>

      </div>
    </CinematicScrollSection>
  );
};

// 16. CARRUSEL INTERACTIVO DE TESTIMONIOS Y RESEÑAS (AYACUCHO)
const TestimonialsCarouselSection = () => {
  const [filter, setFilter] = useState('todos'); // 'todos' | 'conductor' | 'propietario'
  const [currentIndex, setCurrentIndex] = useState(0);
  const [direction, setDirection] = useState(1);
  const [isPaused, setIsPaused] = useState(false);

  const testimonials = useMemo(() => [
    {
      id: 1,
      roleType: 'conductor',
      name: 'Carlos M. Huamán',
      role: 'Conductor Frecuente',
      detail: 'Toyota Yaris · Gris Plata',
      location: 'Huamanga Centro',
      rating: 5,
      avatarBg: 'from-emerald-500 to-teal-700',
      initials: 'CH',
      quote: 'Encontrar estacionamiento un sábado por la tarde cerca a la Plaza Mayor era una pesadilla. Con Smart Park reservo desde mi casa y la cámara de garita reconoce mi placa al instante. Cero estrés y sin monedas exactas.',
      date: 'Hace 3 días',
      highlight: 'Entrada en 3 segundos',
      badge: 'Conductor Verificado'
    },
    {
      id: 2,
      roleType: 'propietario',
      name: 'Rosaura Quispe de Morales',
      role: 'Propietaria de Cochera El Portal',
      detail: '42 Cajones · 2 Niveles',
      location: 'Jr. 28 de Julio, Ayacucho',
      rating: 5,
      avatarBg: 'from-cyan-500 to-blue-700',
      initials: 'RQ',
      quote: 'Antes teníamos descuadres de caja en el turno de la noche y no sabíamos cuántos autos entraban. Ahora audito los cobros en efectivo y Yape en tiempo real desde mi celular. Las reservas nos aumentaron los ingresos más de 30%.',
      date: 'Hace 1 semana',
      highlight: '+30% Ingresos Auditados',
      badge: 'Cochera Verificada'
    },
    {
      id: 3,
      roleType: 'conductor',
      name: 'Ing. Miguel Ángel Barrientos',
      role: 'Usuario Diario por Trabajo',
      detail: 'Kia Sportage · Negro',
      location: 'Zona Bancaria / Poder Judicial',
      rating: 5,
      avatarBg: 'from-amber-500 to-orange-700',
      initials: 'MB',
      quote: 'El trazado de ruta 3D te guía exacto esquivando calles con tráfico o cerradas. Además, la ventana de 15 minutos de tolerancia es una tranquilidad enorme para los que lidiamos con el tráfico de Huamanga.',
      date: 'Hace 2 semanas',
      highlight: '15 min de Tolerancia',
      badge: 'Conductor Verificado'
    },
    {
      id: 4,
      roleType: 'propietario',
      name: 'David Cárdenas Pariona',
      role: 'Administrador de Playa San Juan',
      detail: '28 Cajones · Techado',
      location: 'Jr. Bellido, Ayacucho',
      rating: 5,
      avatarBg: 'from-teal-500 to-emerald-800',
      initials: 'DC',
      quote: 'Diseñé el plano de mi local en 10 minutos con el editor 2D sin pagar software caro. El sistema de garita es tan rápido que el operador registra cada entrada con solo apretar la tecla Enter.',
      date: 'Hace 5 días',
      highlight: 'Editor 2D sin Costos',
      badge: 'Cochera Verificada'
    },
    {
      id: 5,
      roleType: 'conductor',
      name: 'Lucía Vivanco Rivas',
      role: 'Emprendedora & Conductora',
      detail: 'Hyundai Grand i10 · Rojo',
      location: 'Mercado Magdalena & Centro',
      rating: 5,
      avatarBg: 'from-pink-500 to-rose-700',
      initials: 'LV',
      quote: 'Pagar con Yape o Plin directo y no tener que buscar monedas en la guantera a medianoche me da muchísima seguridad. El Pase Digital con QR funciona de inmediato. ¡Smart Park hacía falta en Ayacucho!',
      date: 'Hace 4 días',
      highlight: 'Pagos Yape/Plin Inmediatos',
      badge: 'Conductora Verificada'
    }
  ], []);

  const filtered = useMemo(() => {
    if (filter === 'todos') return testimonials;
    return testimonials.filter(t => t.roleType === filter);
  }, [testimonials, filter]);

  // Si se cambia de filtro, resetear el índice al inicio
  const handleFilterChange = (newFilter) => {
    setFilter(newFilter);
    setCurrentIndex(0);
  };

  // Auto-play cada 4.5 segundos con pausa si el cursor está encima
  useEffect(() => {
    if (isPaused || filtered.length <= 1) return;
    const timer = setInterval(() => {
      setDirection(1);
      setCurrentIndex((prev) => (prev + 1) % filtered.length);
    }, 4500);
    return () => clearInterval(timer);
  }, [isPaused, filtered.length]);

  const paginate = (newDirection) => {
    setDirection(newDirection);
    if (newDirection === 1) {
      setCurrentIndex((prev) => (prev + 1) % filtered.length);
    } else {
      setCurrentIndex((prev) => (prev - 1 + filtered.length) % filtered.length);
    }
  };

  const item = filtered[currentIndex] || filtered[0];

  const variants = {
    enter: (dir) => ({
      x: dir > 0 ? 100 : -100,
      opacity: 0,
      scale: 0.96
    }),
    center: {
      x: 0,
      opacity: 1,
      scale: 1,
      transition: {
        x: { type: 'spring', stiffness: 280, damping: 28 },
        opacity: { duration: 0.35 },
        scale: { duration: 0.35 }
      }
    },
    exit: (dir) => ({
      x: dir > 0 ? -100 : 100,
      opacity: 0,
      scale: 0.96,
      transition: {
        x: { type: 'spring', stiffness: 280, damping: 28 },
        opacity: { duration: 0.25 },
        scale: { duration: 0.25 }
      }
    })
  };

  return (
    <CinematicScrollSection id="testimonios" className="py-14 sm:py-24 px-4 sm:px-6 lg:px-12 max-w-5xl mx-auto space-y-10">
      
      {/* Encabezado de la Sección */}
      <div className="max-w-2xl mx-auto text-center space-y-3">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-800 dark:text-emerald-300 text-xs font-bold tracking-wide">
          <Sparkles className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          <span>EXPERIENCIAS REALES EN AYACUCHO</span>
        </div>

        <h2 className="text-2xl sm:text-3xl md:text-4xl font-display font-extrabold text-[#002B29] dark:text-[#DFF7F0] tracking-tight">
          La confianza de quienes ya <span className="text-[#004D49] dark:text-emerald-300">estacionan sin vueltas</span>
        </h2>
        
        <p className="text-xs sm:text-sm text-[#004D49]/80 dark:text-emerald-200/80 font-medium max-w-xl mx-auto">
          Conductores y administradores de playas en Huamanga comparten cómo Smart Park modernizó su día a día.
        </p>

        {/* Resumen de Calificación Social Proof */}
        <div className="pt-2 flex flex-wrap items-center justify-center gap-3 text-xs font-semibold text-slate-700 dark:text-slate-300">
          <div className="flex items-center gap-1">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className="w-4 h-4 text-amber-400 fill-amber-400 drop-shadow-xs" />
            ))}
          </div>
          <span className="font-extrabold text-slate-900 dark:text-white font-mono">4.9 / 5.0</span>
          <span className="text-slate-400">•</span>
          <span>Basado en más de 350 conductores y 18 sedes</span>
        </div>
      </div>

      {/* Selector de Filtros por Categoría */}
      <div className="flex justify-center">
        <div className="inline-flex p-1 rounded-2xl bg-slate-200/70 dark:bg-slate-800/80 border border-slate-300/60 dark:border-slate-700 backdrop-blur-md shadow-inner text-xs font-bold">
          <button
            type="button"
            onClick={() => handleFilterChange('todos')}
            className={`px-4 py-1.5 rounded-xl transition cursor-pointer ${
              filter === 'todos'
                ? 'bg-white dark:bg-[#0f1d30] text-emerald-800 dark:text-emerald-300 shadow-xs border border-slate-200/60 dark:border-emerald-500/30'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Todos ({testimonials.length})
          </button>
          <button
            type="button"
            onClick={() => handleFilterChange('conductor')}
            className={`px-4 py-1.5 rounded-xl transition cursor-pointer ${
              filter === 'conductor'
                ? 'bg-white dark:bg-[#0f1d30] text-emerald-800 dark:text-emerald-300 shadow-xs border border-slate-200/60 dark:border-emerald-500/30'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Conductores ({testimonials.filter(t => t.roleType === 'conductor').length})
          </button>
          <button
            type="button"
            onClick={() => handleFilterChange('propietario')}
            className={`px-4 py-1.5 rounded-xl transition cursor-pointer ${
              filter === 'propietario'
                ? 'bg-white dark:bg-[#0f1d30] text-emerald-800 dark:text-emerald-300 shadow-xs border border-slate-200/60 dark:border-emerald-500/30'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Dueños de Cochera ({testimonials.filter(t => t.roleType === 'propietario').length})
          </button>
        </div>
      </div>

      {/* Contenedor del Carrusel Animado */}
      <div
        className="relative max-w-3xl mx-auto"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      >
        {/* Glow de fondo */}
        <div className="absolute inset-0 bg-gradient-to-r from-emerald-500/10 via-teal-500/10 to-cyan-500/10 rounded-3xl blur-2xl -z-10 pointer-events-none" />

        {/* Tarjeta del Slide con Gestos Táctiles y Transición de Resorte */}
        <div className="overflow-hidden min-h-[300px] sm:min-h-[260px] flex items-center justify-center p-1 sm:p-2">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={item.id}
              custom={direction}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              drag="x"
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.25}
              onDragEnd={(_, info) => {
                if (info.offset.x < -40 || info.velocity.x < -300) {
                  paginate(1);
                } else if (info.offset.x > 40 || info.velocity.x > 300) {
                  paginate(-1);
                }
              }}
              className="w-full bg-white/95 dark:bg-[#0c1626]/95 backdrop-blur-xl rounded-3xl p-6 sm:p-8 border border-[#004D49]/20 dark:border-slate-800 shadow-[0_20px_50px_rgba(0,77,73,0.12)] dark:shadow-[0_20px_50px_rgba(0,0,0,0.5)] flex flex-col justify-between space-y-6 select-none cursor-grab active:cursor-grabbing"
            >
              {/* Header de la Tarjeta */}
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  {/* Avatar con Gradiente */}
                  <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${item.avatarBg} text-white font-extrabold flex items-center justify-center text-sm shadow-md shadow-emerald-950/20 shrink-0`}>
                    {item.initials}
                  </div>

                  {/* Nombre y Rol */}
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-black text-slate-900 dark:text-white leading-tight">
                        {item.name}
                      </h3>
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                        {item.badge}
                      </span>
                    </div>

                    <p className="text-xs text-[#004D49] dark:text-emerald-300/90 font-semibold mt-0.5">
                      {item.role} <span className="text-slate-400 font-normal">· {item.detail}</span>
                    </p>
                  </div>
                </div>

                {/* Tag de Destacado */}
                <div className="hidden sm:inline-flex items-center gap-1 px-3 py-1 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800/80 text-slate-800 dark:text-slate-200 border border-slate-200/80 dark:border-slate-700/80 shrink-0">
                  <Sparkles className="w-3 h-3 text-amber-500" />
                  <span>{item.highlight}</span>
                </div>
              </div>

              {/* Comentario y Comilla */}
              <div className="relative pl-1 sm:pl-2">
                <Quote className="w-8 h-8 text-emerald-500/20 dark:text-emerald-400/20 absolute -top-3 -left-2 rotate-180 -z-10" />
                <p className="text-sm sm:text-base text-slate-700 dark:text-slate-200 leading-relaxed font-normal italic">
                  "{item.quote}"
                </p>
              </div>

              {/* Footer de la tarjeta con Estrellas y Fecha */}
              <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800/80 text-xs">
                <div className="flex items-center gap-1.5">
                  <div className="flex text-amber-400">
                    {[...Array(item.rating)].map((_, i) => (
                      <Star key={i} className="w-4 h-4 fill-amber-400" />
                    ))}
                  </div>
                  <span className="font-extrabold text-slate-900 dark:text-white font-mono ml-1">5.0</span>
                  <span className="text-slate-400 hidden sm:inline">·</span>
                  <span className="text-slate-500 dark:text-slate-400 hidden sm:inline flex items-center gap-1">
                    <MapPin className="w-3 h-3 text-emerald-500" /> {item.location}
                  </span>
                </div>

                <div className="text-[11px] font-medium text-slate-400 dark:text-slate-500">
                  {item.date}
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Botones Flotantes Prev / Next */}
        <button
          type="button"
          onClick={() => paginate(-1)}
          className="absolute -left-3 sm:-left-6 top-1/2 -translate-y-1/2 w-10 sm:w-12 h-10 sm:h-12 rounded-2xl bg-white/90 dark:bg-slate-900/90 text-slate-800 dark:text-slate-100 border border-slate-200/80 dark:border-slate-700/80 shadow-lg hover:scale-110 active:scale-95 transition-all flex items-center justify-center cursor-pointer z-20 backdrop-blur-md group"
          aria-label="Testimonio anterior"
        >
          <ChevronLeft className="w-5 h-5 text-slate-700 dark:text-slate-200 group-hover:-translate-x-0.5 transition-transform" />
        </button>

        <button
          type="button"
          onClick={() => paginate(1)}
          className="absolute -right-3 sm:-right-6 top-1/2 -translate-y-1/2 w-10 sm:w-12 h-10 sm:h-12 rounded-2xl bg-white/90 dark:bg-slate-900/90 text-slate-800 dark:text-slate-100 border border-slate-200/80 dark:border-slate-700/80 shadow-lg hover:scale-110 active:scale-95 transition-all flex items-center justify-center cursor-pointer z-20 backdrop-blur-md group"
          aria-label="Siguiente testimonio"
        >
          <ChevronRight className="w-5 h-5 text-slate-700 dark:text-slate-200 group-hover:translate-x-0.5 transition-transform" />
        </button>

        {/* Indicadores de Paginación (Pills) */}
        <div className="flex items-center justify-center gap-2 pt-6">
          {filtered.map((_, i) => (
            <button
              key={i}
              type="button"
              onClick={() => {
                setDirection(i > currentIndex ? 1 : -1);
                setCurrentIndex(i);
              }}
              className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${
                currentIndex === i
                  ? 'w-8 bg-[#004D49] dark:bg-emerald-400'
                  : 'w-2 bg-slate-300 dark:bg-slate-700 hover:bg-slate-400 dark:hover:bg-slate-600'
              }`}
              aria-label={`Ir al testimonio ${i + 1}`}
            />
          ))}
        </div>

        {/* Nota interactiva sutil */}
        <p className="text-[11px] text-center text-slate-400 dark:text-slate-500 font-medium pt-2 flex items-center justify-center gap-1.5">
          <span>Desliza para explorar</span>
          <span>•</span>
          <span>Se pausa al pasar el cursor</span>
        </p>

      </div>

    </CinematicScrollSection>
  );
};

export const LandingPage = ({
  establishments = [],
  onOpenAuth,
  onSelectParking,
  onOpenTerms
}) => {
  const { theme, toggleTheme, isDark } = useTheme();
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('todos');
  const [userPersona, setUserPersona] = useState('conductor');
  const [activeFaq, setActiveFaq] = useState(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  // Referencias para Parallax Global (13. PARALLAX BACKGROUND)
  const heroRef = useRef(null);
  const containerRef = useRef(null);

  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 200,
    damping: 30,
    restDelta: 0.001
  });

  // 13. PARALLAX BACKGROUND: CAPAS DE PROFUNDIDAD
  const bgOrb1Y = useTransform(scrollYProgress, [0, 1], [0, 300]);
  const bgOrb2Y = useTransform(scrollYProgress, [0, 1], [0, -350]);
  const bgOrb3Y = useTransform(scrollYProgress, [0, 1], [0, 200]);
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

  // 10. LIVE NUMBER TRANSITION: PLAZAS LIBRES EN TIEMPO REAL
  const totalFreeSlots = useMemo(() => {
    return establishments.reduce((acc, curr) => {
      return acc + (curr.elements || []).filter(e => e.type === 'slot' && e.status === 'free').length;
    }, 0);
  }, [establishments]);

  const faqs = [
    {
      q: '¿Cómo se realiza el ingreso a la cochera con la reserva?',
      a: 'Al confirmar tu reserva recibes un Pase Digital. Al llegar a la cochera en Huamanga, el sistema de visión artificial OpenCV reconoce tu placa registrada o puedes mostrar el código QR para ingresar de inmediato.'
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
        background: isDark
          ? 'linear-gradient(180deg, #070D18 0%, #0A1424 35%, #08101E 70%, #050A14 100%)'
          : 'linear-gradient(180deg, #F2F9F8 0%, #F8FCFB 35%, #EFF7F5 70%, #E6F3F0 100%)'
      }}
      className="w-full min-h-screen text-[#111111] dark:text-slate-100 font-sans antialiased selection:bg-[#00827C] selection:text-white relative overflow-x-hidden transition-colors"
    >
      {/* FONDO FLUIDO CON GRADIENTES SUAVES OPACADOS (SIN LÍNEAS NI CUADRADOS) */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        
        {/* Aura Central Superior Difuminada */}
        <motion.div
          animate={{
            scale: [1, 1.12, 1],
            opacity: [0.4, 0.65, 0.4]
          }}
          transition={{ duration: 14, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute -top-40 left-1/2 -translate-x-1/2 w-[1000px] h-[600px] bg-gradient-to-b from-emerald-200/40 via-teal-200/30 to-transparent dark:from-emerald-900/20 dark:via-teal-900/10 rounded-full blur-[160px] transform-gpu pointer-events-none"
        />

        {/* Orbe Flotante 1: Esmeralda Suave */}
        <motion.div
          style={{ y: smoothBgOrb1 }}
          animate={{ scale: [1, 1.08, 1] }}
          transition={{ duration: 16, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute -top-20 -right-20 w-[700px] h-[700px] bg-gradient-to-br from-emerald-300/30 via-teal-200/20 to-transparent dark:from-emerald-900/25 dark:via-teal-950/20 rounded-full blur-[170px] transform-gpu pointer-events-none"
        />

        {/* Orbe Flotante 2: Cyan Opacado */}
        <motion.div
          style={{ y: smoothBgOrb2 }}
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
          className="absolute top-[35%] -left-40 w-[750px] h-[750px] bg-gradient-to-tr from-cyan-200/30 via-emerald-200/25 to-transparent dark:from-cyan-900/20 dark:via-emerald-950/20 rounded-full blur-[180px] transform-gpu pointer-events-none"
        />

        {/* Orbe Flotante 3: Menta Inferior */}
        <motion.div
          style={{ y: smoothBgOrb3 }}
          className="absolute -bottom-20 -right-20 w-[700px] h-[700px] bg-gradient-to-tl from-teal-300/25 via-emerald-200/20 to-transparent dark:from-teal-950/20 dark:via-emerald-950/15 rounded-full blur-[160px] transform-gpu pointer-events-none"
        />

      </div>


      {/* =========================================================================
          1. HEADER FLOTANTE ULTRA-PREMIUM
          ========================================================================= */}
      <header className="sticky top-0 z-50 px-3 sm:px-6 lg:px-10 pt-2 sm:pt-3 pb-2 transition-all duration-300">
        <div className="max-w-6xl mx-auto bg-[#002624]/90 backdrop-blur-xl border border-[#005e58]/50 px-4 sm:px-6 py-3 rounded-2xl sm:rounded-3xl shadow-[0_12px_40px_rgba(0,38,36,0.35)] flex items-center justify-between text-white relative">

          <BrandLogo className="h-8 sm:h-9 w-auto" dark={true} />

          <nav className="hidden md:flex items-center space-x-1 lg:space-x-2 text-xs font-semibold">
            <a href="#mapa" className="px-3.5 py-1.5 rounded-xl text-emerald-100/90 hover:text-white hover:bg-white/10 transition-all duration-200">
              Mapa 3D
            </a>
            <a href="#perspectiva" className="px-3.5 py-1.5 rounded-xl text-emerald-100/90 hover:text-white hover:bg-white/10 transition-all duration-200">
              Conductores & Dueños
            </a>
            <a href="#caracteristicas" className="px-3.5 py-1.5 rounded-xl text-emerald-100/90 hover:text-white hover:bg-white/10 transition-all duration-200">
              Tecnología
            </a>
            <a href="#testimonios" className="px-3.5 py-1.5 rounded-xl text-emerald-100/90 hover:text-white hover:bg-white/10 transition-all duration-200">
              Testimonios
            </a>
          </nav>

          <div className="flex items-center space-x-2 sm:space-x-3">
            {/* Botón Alternar Tema Visual Sol / Luna */}
            <button
              type="button"
              onClick={toggleTheme}
              title={`Tema actual: ${theme}. Clic para alternar modo claro/oscuro`}
              aria-label="Alternar modo visual"
              className="p-2 rounded-xl bg-white/10 hover:bg-white/20 text-emerald-200 hover:text-white border border-emerald-500/30 transition cursor-pointer flex items-center justify-center shrink-0"
            >
              {isDark ? <Sun className="w-4 h-4 text-amber-300" /> : <Moon className="w-4 h-4 text-emerald-200" />}
            </button>

            <MagneticButton
              onClick={() => onOpenAuth && onOpenAuth('affiliation')}
              className="hidden sm:inline-flex text-xs font-bold text-emerald-200 hover:text-white bg-white/5 hover:bg-white/15 px-3.5 py-2 rounded-xl border border-emerald-500/30 transition-all duration-200 cursor-pointer"
            >
              Afiliar Cochera
            </MagneticButton>

            <MagneticButton
              onClick={() => onOpenAuth && onOpenAuth('login')}
              className="bg-gradient-to-r from-emerald-400 to-teal-400 hover:from-emerald-300 hover:to-teal-300 text-slate-950 text-xs font-black px-4 sm:px-5 py-2.5 rounded-xl transition-all duration-200 cursor-pointer flex items-center space-x-2 shadow-[0_0_20px_rgba(52,211,153,0.35)]"
            >
              <LogIn className="w-4 h-4 shrink-0 text-slate-950 stroke-[2.5]" />
              <span>Acceder</span>
            </MagneticButton>

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

        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.97 }}
              transition={{ duration: 0.2, ease: FLUID_EASE }}
              className="md:hidden mt-2 max-w-6xl mx-auto bg-[#002624]/95 backdrop-blur-xl border border-[#005e58]/50 p-4 rounded-2xl shadow-2xl space-y-2 text-xs font-bold text-emerald-100"
            >
              <a href="#mapa" onClick={() => setMobileMenuOpen(false)} className="block px-3.5 py-2.5 rounded-xl hover:bg-white/10 hover:text-white transition">Mapa 3D en Vivo</a>
              <a href="#perspectiva" onClick={() => setMobileMenuOpen(false)} className="block px-3.5 py-2.5 rounded-xl hover:bg-white/10 hover:text-white transition">Conductores & Dueños</a>
              <a href="#caracteristicas" onClick={() => setMobileMenuOpen(false)} className="block px-3.5 py-2.5 rounded-xl hover:bg-white/10 hover:text-white transition">Tecnología</a>
              <a href="#testimonios" onClick={() => setMobileMenuOpen(false)} className="block px-3.5 py-2.5 rounded-xl hover:bg-white/10 hover:text-white transition">Testimonios</a>
              <div className="pt-2 border-t border-emerald-500/20 flex flex-col gap-2">
                <button type="button" onClick={toggleTheme} className="w-full py-2.5 bg-white/10 text-emerald-200 hover:text-white rounded-xl text-center font-bold flex items-center justify-center gap-2">
                  {isDark ? <Sun className="w-4 h-4 text-amber-300" /> : <Moon className="w-4 h-4 text-emerald-200" />}
                  <span>{isDark ? 'Modo Claro' : 'Modo Oscuro'}</span>
                </button>
                <button type="button" onClick={() => { setMobileMenuOpen(false); onOpenAuth && onOpenAuth('affiliation'); }} className="w-full py-2.5 bg-white/10 text-emerald-200 hover:text-white rounded-xl text-center font-bold">
                  Afiliar Cochera
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* =========================================================================
          2. HERO SECTION CON REVEAL Y MAGNETIC BUTTONS
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


          {/* HERO TÍTULO EDITORIAL */}
          <motion.h1 className="font-display font-extrabold text-3xl sm:text-5xl md:text-6xl lg:text-[60px] tracking-tight max-w-3xl mx-auto leading-[1.12] sm:leading-[1.08] text-[#002B29] dark:text-[#E6FFF7]">
            Estacionamientos en Tiempo Real en Ayacucho
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.2, ease: FLUID_EASE }}
            className="text-sm sm:text-base md:text-lg text-[#003835]/80 dark:text-[#BFE3DA]/85 max-w-2xl mx-auto font-medium leading-relaxed text-center px-2"
          >
            Consulta disponibilidad de plazas en cocheras de Huamanga, reserva tu espacio y accede directo sin tickets físicos.
          </motion.p>

          {/* 12. CARD 3D HOVER */}
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.35, ease: FLUID_EASE }}
            className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-3xl mx-auto pt-4 text-left"
          >

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

                {/* 4. MAGNETIC BUTTON CTA */}
                <MagneticButton
                  href="#mapa"
                  className="w-full py-3 bg-[#004D49] hover:bg-[#003835] text-white text-xs font-bold rounded-xl transition flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-[#004D49]/20 mt-3"
                >
                  <span>Consultar Cocheras en Vivo</span>
                  <ArrowRight className="w-4 h-4 text-emerald-400" />
                </MagneticButton>
              </div>
            </DynamicTiltCard>

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

                <MagneticButton
                  onClick={() => onOpenAuth && onOpenAuth('affiliation')}
                  className="w-full py-3 bg-gradient-to-r from-emerald-400 to-teal-400 text-slate-950 text-xs font-black rounded-xl transition flex items-center justify-center gap-2 cursor-pointer shadow-md shadow-emerald-400/20 mt-3"
                >
                  <Building2 className="w-4 h-4 text-slate-950" />
                  <span>Solicitar Afiliación de Cochera</span>
                </MagneticButton>
              </div>
            </DynamicTiltCard>

          </motion.div>
        </motion.div>

      </section>

      {/* =========================================================================
          3. MAPBOX MAP & MARKERS ANIMATION
          ========================================================================= */}
      <CinematicScrollSection id="mapa" className="py-12 sm:py-20 px-4 sm:px-6 lg:px-12 max-w-6xl mx-auto space-y-6 sm:space-y-8">

        <div className="max-w-3xl mx-auto text-center space-y-2 px-2">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-display font-extrabold text-[#002B29] dark:text-[#DFF7F0] tracking-tight">
            Estacionamientos Conectados en <span className="text-[#004D49] dark:text-emerald-300">Huamanga</span>
          </h2>
          <p className="text-xs sm:text-sm text-[#004D49] dark:text-emerald-200/80 max-w-md mx-auto font-medium">
            Consulta disponibilidad en vivo, precios por hora y navega directamente a la cochera.
          </p>
        </div>

        <div className="max-w-3xl mx-auto space-y-3 px-2">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-[#004D49]/60 dark:text-emerald-300/60 pointer-events-none" />
            <Input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por nombre, dirección o referencia…"
              className="w-full h-12 pl-11 pr-10 rounded-2xl bg-white/95 backdrop-blur-md border border-[#004D49]/15 text-sm font-medium text-[#002B29] dark:text-slate-100 placeholder:text-[#004D49]/40 dark:placeholder:text-slate-400/60 shadow-sm focus-visible:ring-2 focus-visible:ring-emerald-500/40 focus-visible:border-emerald-500/50 transition"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                aria-label="Limpiar búsqueda"
                className="absolute right-3 top-1/2 -translate-y-1/2 w-7 h-7 rounded-lg flex items-center justify-center text-[#004D49]/50 dark:text-emerald-300/60 hover:text-[#002B29] dark:hover:text-emerald-200 hover:bg-[#004D49]/5 transition cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* 7. MAP ZOOM & 8. MARKER ANIMATION & 14. VEHICLE ANIMATION */}
        <LazyMapSection
          parkings={filteredParkings}
          onSelectParking={(p) => {
            if (onSelectParking) onSelectParking(p);
          }}
        />

      </CinematicScrollSection>

      {/* =========================================================================
          11. FLOATING CARDS: CARACTERÍSTICAS
          ========================================================================= */}
      <CinematicScrollSection id="caracteristicas" className="py-12 sm:py-20 px-4 sm:px-6 lg:px-12 max-w-6xl mx-auto space-y-8">
        
        <div className="max-w-2xl mx-auto text-center space-y-2 px-2">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-display font-extrabold text-[#002B29] dark:text-[#DFF7F0] tracking-tight">
            Tecnología Diseñada para <span className="text-[#004D49] dark:text-emerald-300">Smart Park</span>
          </h2>
          <p className="text-xs sm:text-sm text-[#004D49] dark:text-emerald-200/80 max-w-lg mx-auto font-medium">
            Una plataforma moderna que combina trazado 3D, visión artificial y pasarelas de pago digitales.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* FEATURE CARD 1 */}
          <div className="bg-white/95 backdrop-blur-md p-6 rounded-3xl border border-[#004D49]/15 shadow-sm space-y-3 flex flex-col justify-between hover:border-emerald-500/50 hover:-translate-y-1 transition duration-200">
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

          {/* FEATURE CARD 2 */}
          <div className="bg-white/95 backdrop-blur-md p-6 rounded-3xl border border-[#004D49]/15 shadow-sm space-y-3 flex flex-col justify-between hover:border-teal-500/50 hover:-translate-y-1 transition duration-200">
            <div className="w-10 h-10 rounded-2xl bg-teal-500/10 border border-teal-500/30 text-teal-700 flex items-center justify-center">
              <Camera className="w-5 h-5 text-teal-700" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 mb-1">Detección OpenCV</h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Detección por visión artificial OpenCV al llegar a la garita de control sin tickets impresos.
              </p>
            </div>
          </div>

          {/* FEATURE CARD 3 */}
          <div className="bg-white/95 backdrop-blur-md p-6 rounded-3xl border border-[#004D49]/15 shadow-sm space-y-3 flex flex-col justify-between hover:border-cyan-500/50 hover:-translate-y-1 transition duration-200">
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

          {/* FEATURE CARD 4 */}
          <div className="bg-white/95 backdrop-blur-md p-6 rounded-3xl border border-[#004D49]/15 shadow-sm space-y-3 flex flex-col justify-between hover:border-emerald-500/50 hover:-translate-y-1 transition duration-200">
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
          SELECTOR DE PERSPECTIVA: CONDUCTOR VS PROPIETARIO
          ========================================================================= */}
      <CinematicScrollSection id="perspectiva" className="py-12 sm:py-20 px-4 sm:px-6 lg:px-12 max-w-6xl mx-auto space-y-8">
        
        {/* Encabezado y Switch */}
        <div className="max-w-2xl mx-auto text-center space-y-4">
          <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-800 dark:text-cyan-300 text-xs font-bold tracking-wide">
            <Sparkles className="w-3.5 h-3.5 text-cyan-600 dark:text-cyan-400" />
            <span>SOLUCIÓN A LA MEDIDA</span>
          </div>

          <h2 className="text-2xl sm:text-3xl md:text-4xl font-display font-extrabold text-[#002B29] dark:text-[#DFF7F0] tracking-tight">
            ¿Cómo te ayuda <span className="text-[#004D49] dark:text-emerald-300">Smart Park</span>?
          </h2>
          <p className="text-xs sm:text-sm text-[#004D49]/80 dark:text-emerald-200/80 font-medium">
            Selecciona tu perfil y descubre las herramientas diseñadas especialmente para ti en Ayacucho.
          </p>

          {/* Segmented Control Pill */}
          <div className="inline-flex p-1.5 rounded-2xl bg-slate-200/70 dark:bg-slate-800/80 border border-slate-300/60 dark:border-slate-700 backdrop-blur-md shadow-inner">
            <button
              type="button"
              onClick={() => setUserPersona('conductor')}
              className={`flex items-center gap-2 px-5 sm:px-7 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                userPersona === 'conductor'
                  ? 'bg-white dark:bg-[#0f1d30] text-emerald-800 dark:text-emerald-300 shadow-md border border-slate-200/60 dark:border-emerald-500/30'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Car className="w-4 h-4" />
              <span>Soy Conductor</span>
            </button>
            <button
              type="button"
              onClick={() => setUserPersona('propietario')}
              className={`flex items-center gap-2 px-5 sm:px-7 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                userPersona === 'propietario'
                  ? 'bg-white dark:bg-[#0f1d30] text-emerald-800 dark:text-emerald-300 shadow-md border border-slate-200/60 dark:border-emerald-500/30'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Building2 className="w-4 h-4" />
              <span>Tengo una Cochera</span>
            </button>
          </div>
        </div>

        {/* Contenido Dinámico con AnimatePresence */}
        <AnimatePresence mode="wait">
          {userPersona === 'conductor' ? (
            <motion.div
              key="conductor"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                <div className="bg-white/95 dark:bg-[#0c1626]/95 backdrop-blur-md p-6 rounded-3xl border border-[#004D49]/15 dark:border-slate-800 shadow-sm space-y-3 flex flex-col justify-between hover:border-emerald-500/50 transition">
                  <div className="space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border border-emerald-500/30 flex items-center justify-center">
                      <Navigation className="w-6 h-6" />
                    </div>
                    <h3 className="text-base font-black text-slate-900 dark:text-white">Ruta 3D con GPS en Vivo</h3>
                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                      Llega directo a la puerta de la cochera con trazado topográfico 3D de Ayacucho. Ahorra combustible y tiempo en horas pico.
                    </p>
                  </div>
                  <div className="pt-2 text-[11px] font-bold text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Sin perderte en el tráfico
                  </div>
                </div>

                <div className="bg-white/95 dark:bg-[#0c1626]/95 backdrop-blur-md p-6 rounded-3xl border border-[#004D49]/15 dark:border-slate-800 shadow-sm space-y-3 flex flex-col justify-between hover:border-teal-500/50 transition">
                  <div className="space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-teal-500/10 text-teal-700 dark:text-teal-400 border border-teal-500/30 flex items-center justify-center">
                      <Camera className="w-6 h-6" />
                    </div>
                    <h3 className="text-base font-black text-slate-900 dark:text-white">Entrada sin Tickets Físicos</h3>
                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                      El sistema inteligente de cámaras OpenCV lee tu placa o escanea tu Pase QR encriptado para darte ingreso en menos de 3 segundos.
                    </p>
                  </div>
                  <div className="pt-2 text-[11px] font-bold text-teal-700 dark:text-teal-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Cero pérdidas de papelitos
                  </div>
                </div>

                <div className="bg-white/95 dark:bg-[#0c1626]/95 backdrop-blur-md p-6 rounded-3xl border border-[#004D49]/15 dark:border-slate-800 shadow-sm space-y-3 flex flex-col justify-between hover:border-cyan-500/50 transition">
                  <div className="space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 text-cyan-700 dark:text-cyan-400 border border-cyan-500/30 flex items-center justify-center">
                      <CreditCard className="w-6 h-6" />
                    </div>
                    <h3 className="text-base font-black text-slate-900 dark:text-white">Pagos Yape, Plin y Tarjetas</h3>
                    <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                      Paga sin preocuparte por tener monedas exactas. Incluye 15 minutos de cortesía y comprobante digital inmediato.
                    </p>
                  </div>
                  <div className="pt-2 text-[11px] font-bold text-cyan-700 dark:text-cyan-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> 15 min de tolerancia garantizada
                  </div>
                </div>

              </div>

              <div className="text-center pt-2">
                <a
                  href="#mapa"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-[#004D49] hover:bg-[#003835] dark:bg-emerald-500 dark:hover:bg-emerald-400 text-white dark:text-slate-950 text-xs font-black shadow-md shadow-[#004D49]/20 transition"
                >
                  <Car className="w-4 h-4" />
                  <span>Explorar Cocheras en el Mapa 3D</span>
                  <ArrowRight className="w-4 h-4" />
                </a>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="propietario"
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.3 }}
              className="space-y-6"
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                <div className="bg-slate-900 text-white p-6 rounded-3xl border border-slate-800 shadow-xl space-y-3 flex flex-col justify-between hover:border-emerald-500/50 transition">
                  <div className="space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-emerald-400/20 text-emerald-400 border border-emerald-400/30 flex items-center justify-center">
                      <TrendingUp className="w-6 h-6" />
                    </div>
                    <h3 className="text-base font-black text-white">Caja y Turnos sin Fugas</h3>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      Registra de forma transparente cada vehículo que entra y sale. Controla el dinero en efectivo y digital recaudado por cada turno de garita desde tu teléfono.
                    </p>
                  </div>
                  <div className="pt-2 text-[11px] font-bold text-emerald-300 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Auditoría total de ingresos
                  </div>
                </div>

                <div className="bg-slate-900 text-white p-6 rounded-3xl border border-slate-800 shadow-xl space-y-3 flex flex-col justify-between hover:border-teal-500/50 transition">
                  <div className="space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-teal-400/20 text-teal-400 border border-teal-400/30 flex items-center justify-center">
                      <Layers className="w-6 h-6" />
                    </div>
                    <h3 className="text-base font-black text-white">Plano CAD 2D Interactivo</h3>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      Dibuja tu cochera con cajones, muros y vías de circulación en nuestro estudio visual. Monitorea cajones libres y ocupados en tiempo real.
                    </p>
                  </div>
                  <div className="pt-2 text-[11px] font-bold text-teal-300 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Editor visual sin software costoso
                  </div>
                </div>

                <div className="bg-slate-900 text-white p-6 rounded-3xl border border-slate-800 shadow-xl space-y-3 flex flex-col justify-between hover:border-cyan-500/50 transition">
                  <div className="space-y-3">
                    <div className="w-12 h-12 rounded-2xl bg-cyan-400/20 text-cyan-400 border border-cyan-400/30 flex items-center justify-center">
                      <Sparkles className="w-6 h-6" />
                    </div>
                    <h3 className="text-base font-black text-white">+35% Mayor Ocupación</h3>
                    <p className="text-xs text-slate-300 leading-relaxed">
                      Atrae conductores que van a centros de trabajo, bancos y eventos turísticos en Huamanga mediante reservas anticipadas online.
                    </p>
                  </div>
                  <div className="pt-2 text-[11px] font-bold text-cyan-300 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Afiliación sin costo inicial
                  </div>
                </div>

              </div>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => onOpenAuth && onOpenAuth('affiliation')}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-400 to-teal-400 text-slate-950 text-xs font-black shadow-md shadow-emerald-400/20 hover:scale-[1.02] transition cursor-pointer"
                >
                  <Building2 className="w-4 h-4" />
                  <span>Solicitar Afiliación de mi Cochera en Ayacucho</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      </CinematicScrollSection>

      {/* =========================================================================
          15. STICKY STORYTELLING: SECCIÓN PRINCIPAL
          ========================================================================= */}
      <StickyStorytellingSection />

      {/* =========================================================================
          16. CARRUSEL INTERACTIVO DE TESTIMONIOS Y RESEÑAS
          ========================================================================= */}
      <TestimonialsCarouselSection />

      {/* =========================================================================
          PREGUNTAS FRECUENTES (FAQS ACCORDION)
          ========================================================================= */}
      <CinematicScrollSection className="py-12 sm:py-20 px-4 sm:px-6 lg:px-12 max-w-4xl mx-auto space-y-8">

        <div className="text-center space-y-2">
          <h2 className="text-2xl sm:text-3xl font-display font-extrabold text-[#002B29] dark:text-[#DFF7F0] tracking-tight">
            Preguntas Frecuentes
          </h2>
          <p className="text-xs sm:text-sm text-[#004D49] dark:text-emerald-200/80 font-medium">
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
                  className="w-full p-5 text-left flex items-center justify-between font-bold text-xs sm:text-sm text-slate-800 hover:text-[#004D49] dark:hover:text-emerald-300 cursor-pointer"
                >
                  <span>{faq.q}</span>
                  <ChevronDown className={`w-4 h-4 text-[#004D49] dark:text-emerald-300 transition-transform duration-200 shrink-0 ml-2 ${isOpen ? 'rotate-180' : ''}`} />
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
          FOOTER ELEGANTE CLARO
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
