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
  ChevronLeft,
  Quote,
  Radio,
  SlidersHorizontal,
  Compass,
  Check,
  ChevronDown
} from 'lucide-react';
import { Input } from './ui/input';
import { QRCodeSVG } from 'qrcode.react';
import { AyacuchoMap } from './AyacuchoMap';
import { BrandLogo } from './BrandLogo';
import { useTheme } from '../context/ThemeContext';

// Curva elástica ultra fluida acelerada por hardware (GPU)
const FLUID_EASE = [0.16, 1, 0.3, 1];

// Scroll reveal fluido para secciones
const CinematicScrollSection = ({ children, className = '', id = '' }) => {
  const ref = useRef(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ['start end', 'end start']
  });

  const opacity = useTransform(scrollYProgress, [0, 0.15, 0.85, 1], [0, 1, 1, 0.9]);
  const y = useTransform(scrollYProgress, [0, 0.15, 0.85, 1], [30, 0, 0, -20]);
  const smoothOpacity = useSpring(opacity, { stiffness: 180, damping: 28 });
  const smoothY = useSpring(y, { stiffness: 180, damping: 28 });

  return (
    <motion.section
      ref={ref}
      id={id}
      style={{ opacity: smoothOpacity, y: smoothY }}
      className={`transform-gpu will-change-transform relative z-10 ${className}`}
    >
      {children}
    </motion.section>
  );
};

// Botón magnético con inercia elástica
const MagneticButton = ({ children, className = '', onClick, href, type = 'button' }) => {
  const ref = useRef(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const springX = useSpring(x, { stiffness: 240, damping: 18 });
  const springY = useSpring(y, { stiffness: 240, damping: 18 });

  const handleMouseMove = (e) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    x.set((e.clientX - centerX) * 0.2);
    y.set((e.clientY - centerY) * 0.2);
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
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        style={{ x: springX, y: springY }}
        className={`inline-flex items-center justify-center transform-gpu will-change-transform ${className}`}
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
      className={`inline-flex items-center justify-center transform-gpu will-change-transform ${className}`}
    >
      {children}
    </motion.button>
  );
};

// Tarjeta 3D con efecto hover
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

// Carga diferida del mapa interactivo
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
      { rootMargin: '250px' }
    );
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, [shouldLoad]);

  return (
    <div
      ref={containerRef}
      className="relative isolate z-0 rounded-3xl overflow-hidden shadow-2xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900 transition-shadow duration-300 min-h-[460px]"
    >
      {shouldLoad ? (
        <AyacuchoMap parkings={parkings} onSelectParking={onSelectParking} />
      ) : (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-100 dark:bg-slate-950">
          <div className="w-9 h-9 rounded-full border-[3px] border-emerald-500/20 border-t-emerald-500 animate-spin" />
          <p className="text-xs font-bold text-slate-500 dark:text-slate-400 font-sans">
            Cargando mapa en vivo de Huamanga…
          </p>
        </div>
      )}
    </div>
  );
};

// Sección de Storytelling paso a paso
const StickyStorytellingSection = () => {
  const [activeStep, setActiveStep] = useState(0);

  const steps = [
    {
      num: '01',
      title: 'Elige tu Cochera en el Mapa',
      desc: 'Consulta en tiempo real qué playas de Huamanga tienen cupos libres, revisa sus tarifas por hora y compara distancias a pie.',
      icon: MapPin,
      preview: (
        <div className="space-y-3 font-mono text-xs">
          <div className="flex items-center justify-between bg-slate-900 text-white p-3 rounded-2xl border border-slate-800 shadow-md">
            <div className="flex items-center gap-2">
              <MapPin className="w-4 h-4 text-emerald-400 shrink-0" />
              <span className="font-bold text-white font-sans">Smart Park Plaza Mayor</span>
            </div>
            <span className="bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 px-2 py-0.5 rounded-full text-[10px] font-bold">
              14 Cupos Libres
            </span>
          </div>

          <div className="relative h-44 bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden flex flex-col justify-between p-3.5">
            <div className="absolute inset-0 bg-[radial-gradient(#334155_1px,transparent_1px)] bg-[size:16px_16px] opacity-30 pointer-events-none" />
            
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col items-center gap-1.5">
              <div className="relative flex items-center justify-center">
                <span className="animate-ping absolute inline-flex h-10 w-10 rounded-full bg-emerald-400 opacity-30" />
                <div className="w-9 h-9 rounded-full bg-emerald-500 border-2 border-white shadow-lg flex items-center justify-center text-slate-950 font-black">
                  <Car className="w-4 h-4 text-slate-950" />
                </div>
              </div>
              <span className="bg-slate-950/90 text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-500/40">
                S/ 4.50 / h
              </span>
            </div>

            <div className="relative z-10 flex justify-between items-end text-[10px]">
              <span className="bg-slate-950/90 text-slate-300 px-2.5 py-1 rounded-lg border border-slate-800 flex items-center gap-1.5 font-sans">
                <Navigation className="w-3 h-3 text-cyan-400 shrink-0" />
                <span>350m · 2 min llegada</span>
              </span>
              <span className="bg-emerald-500 text-slate-950 font-bold px-2.5 py-1 rounded-lg shadow-sm font-sans">
                Cajón A-04 Libre
              </span>
            </div>
          </div>
        </div>
      )
    },
    {
      num: '02',
      title: 'Reserva tu Cajón en el Plano 2D',
      desc: 'Selecciona tu lugar preferido en el gemelo digital de la cochera, ingresa tu placa y confirma tu horario con tolerancia de 15 min.',
      icon: Car,
      preview: (
        <div className="space-y-3 font-mono text-xs">
          <div className="bg-slate-900 p-3 rounded-2xl border border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-24 h-9 bg-white text-slate-950 border-2 border-slate-300 rounded-lg flex flex-col items-center justify-center font-bold tracking-wider relative overflow-hidden shadow-inner">
                <span className="text-[7px] text-blue-700 tracking-widest leading-none font-sans font-black uppercase">PERU</span>
                <span className="text-sm font-black text-slate-900 leading-none">W1P-404</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block font-sans">Vehículo</span>
                <span className="text-xs font-bold text-white font-sans">Toyota Yaris (Gris)</span>
              </div>
            </div>
            <span className="text-emerald-400 text-xs font-bold bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/30 font-sans">
              Asignado
            </span>
          </div>

          <div className="bg-slate-950 p-3.5 rounded-2xl border border-slate-800 space-y-2 font-sans">
            <div className="flex justify-between items-center text-slate-300 text-xs">
              <span>Cajón en Plano CAD:</span>
              <span className="text-emerald-400 font-bold text-sm bg-emerald-500/20 px-2 py-0.5 rounded-md border border-emerald-500/40">
                A-04 (Techado)
              </span>
            </div>
            <div className="flex justify-between items-center text-slate-400 text-xs">
              <span>Modalidad de Reserva:</span>
              <span className="text-slate-200 font-semibold">Estadía Libre / Por Horas</span>
            </div>
            <div className="flex justify-between items-center text-slate-400 text-xs">
              <span>Cortesía Anti-Demora:</span>
              <span className="text-cyan-400 font-bold">15 min de tolerancia</span>
            </div>
          </div>
        </div>
      )
    },
    {
      num: '03',
      title: 'Accede con Reconocimiento o QR',
      desc: 'Al llegar a la garita, la cámara LPR lee tu placa al instante o muestras tu Pase Digital en el lector para ingreso automático.',
      icon: QrCode,
      preview: (
        <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 text-center space-y-3 font-mono text-xs">
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <span className="text-emerald-400 font-bold text-[11px] font-sans">PASE DIGITAL #SPK-8912</span>
            <span className="bg-emerald-500 text-slate-950 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase font-sans">ACTIVO</span>
          </div>

          <div className="bg-white p-3 rounded-xl border border-slate-200 inline-block shadow-inner">
            <QRCodeSVG value="SPK-DEMO-2026-W1P404" size={90} />
          </div>

          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800 space-y-1.5 text-[11px] text-left font-sans">
            <div className="flex items-center justify-between text-emerald-400 font-bold">
              <span className="flex items-center gap-1.5">
                <Camera className="w-3.5 h-3.5 text-emerald-400 animate-pulse" /> Cámara ANPR Garita
              </span>
              <span className="text-[10px] text-slate-400 font-mono">0.8s detección</span>
            </div>
            <p className="text-[10px] text-slate-300 flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Placa W1P-404 validada</span>
            </p>
            <p className="text-[10px] text-emerald-400 font-bold flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span>Barrera automática levantada</span>
            </p>
          </div>
        </div>
      )
    }
  ];

  return (
    <CinematicScrollSection id="sistema" className="py-16 sm:py-24 px-4 sm:px-6 lg:px-12 max-w-6xl mx-auto space-y-10">
      <div className="max-w-2xl mx-auto text-center space-y-3 px-2">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-bold tracking-wide">
          <Sparkles className="w-3.5 h-3.5" />
          <span>PROCESO FLUIDO Y RÁPIDO</span>
        </div>
        <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          Cómo estacionar con <span className="text-emerald-500">Smart Park</span>
        </h2>
        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-lg mx-auto font-medium">
          Olvídate de dar vueltas en Huamanga buscando un sitio. Todo se gestiona en tres pasos directos.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center max-w-5xl mx-auto">
        {/* Pasos */}
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
                    ? 'bg-white dark:bg-slate-900 border-emerald-500 shadow-xl shadow-emerald-950/10'
                    : 'bg-white/70 dark:bg-slate-900/60 border-slate-200 dark:border-slate-800 hover:bg-white dark:hover:bg-slate-900'
                }`}
              >
                <div className="flex items-start gap-4">
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 font-bold ${
                    isSelected ? 'bg-emerald-500 text-slate-950' : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400'
                  }`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-mono font-bold text-emerald-600 dark:text-emerald-400 block">{s.num}</span>
                    <h3 className="text-base font-bold text-slate-900 dark:text-white">{s.title}</h3>
                    <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed mt-1">{s.desc}</p>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* Pantalla Sticky de Visualización */}
        <div className="md:col-span-6 sticky top-24">
          <div className="bg-slate-950 p-6 rounded-3xl border border-slate-800 text-white shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <span className="text-xs font-mono font-bold text-emerald-400">
                Paso {activeStep + 1} — {steps[activeStep].title}
              </span>
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            </div>
            
            <AnimatePresence mode="wait">
              <motion.div
                key={activeStep}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.22 }}
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

// Carrusel interactivo de testimonios de Ayacucho
const TestimonialsCarouselSection = () => {
  const [filter, setFilter] = useState('todos');
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
      quote: 'La ventana de 15 minutos de tolerancia es una tranquilidad enorme para los que lidiamos con el tráfico de Huamanga. No te cancelan la reserva si te demoras un par de minutos.',
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
      quote: 'Pagar con Yape o Plin directo y no tener que buscar monedas en la guantera a medianoche me da muchísima seguridad. El Pase Digital con QR funciona de inmediato.',
      date: 'Hace 4 días',
      highlight: 'Pagos Yape/Plin Inmediatos',
      badge: 'Conductora Verificada'
    }
  ], []);

  const filtered = useMemo(() => {
    if (filter === 'todos') return testimonials;
    return testimonials.filter(t => t.roleType === filter);
  }, [testimonials, filter]);

  const handleFilterChange = (newFilter) => {
    setFilter(newFilter);
    setCurrentIndex(0);
  };

  useEffect(() => {
    if (isPaused || filtered.length <= 1) return;
    const timer = setInterval(() => {
      setDirection(1);
      setCurrentIndex((prev) => (prev + 1) % filtered.length);
    }, 5000);
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
    enter: (dir) => ({ x: dir > 0 ? 80 : -80, opacity: 0, scale: 0.98 }),
    center: {
      x: 0,
      opacity: 1,
      scale: 1,
      transition: { x: { type: 'spring', stiffness: 280, damping: 28 }, opacity: { duration: 0.3 } }
    },
    exit: (dir) => ({ x: dir > 0 ? -80 : 80, opacity: 0, scale: 0.98, transition: { duration: 0.2 } })
  };

  return (
    <CinematicScrollSection id="testimonios" className="py-16 sm:py-24 px-4 sm:px-6 lg:px-12 max-w-5xl mx-auto space-y-10">
      <div className="max-w-2xl mx-auto text-center space-y-3">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-bold tracking-wide">
          <Star className="w-3.5 h-3.5 fill-emerald-500 text-emerald-500" />
          <span>EXPERIENCIAS REALES EN HUAMANGA</span>
        </div>

        <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
          La confianza de quienes ya <span className="text-emerald-500">estacionan sin vueltas</span>
        </h2>
        
        <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 font-medium max-w-xl mx-auto">
          Conductores y administradores de playas en Ayacucho comparten cómo Smart Park modernizó su día a día.
        </p>

        <div className="pt-2 flex flex-wrap items-center justify-center gap-3 text-xs font-semibold text-slate-700 dark:text-slate-300">
          <div className="flex items-center gap-1">
            {[...Array(5)].map((_, i) => (
              <Star key={i} className="w-4 h-4 text-amber-400 fill-amber-400" />
            ))}
          </div>
          <span className="font-extrabold text-slate-900 dark:text-white font-mono">4.9 / 5.0</span>
          <span className="text-slate-400">•</span>
          <span>Basado en más de 350 conductores y 18 sedes</span>
        </div>
      </div>

      {/* Selector de Filtros */}
      <div className="flex justify-center">
        <div className="inline-flex p-1.5 rounded-2xl bg-slate-200/70 dark:bg-slate-800/80 border border-slate-300/60 dark:border-slate-700 backdrop-blur-md shadow-inner text-xs font-bold">
          <button
            type="button"
            onClick={() => handleFilterChange('todos')}
            className={`px-4 py-1.5 rounded-xl transition cursor-pointer ${
              filter === 'todos'
                ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-sm'
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
                ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-sm'
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
                ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            Dueños de Cochera ({testimonials.filter(t => t.roleType === 'propietario').length})
          </button>
        </div>
      </div>

      {/* Contenedor del Carrusel */}
      <div
        className="relative max-w-3xl mx-auto"
        onMouseEnter={() => setIsPaused(true)}
        onMouseLeave={() => setIsPaused(false)}
      >
        <div className="overflow-hidden min-h-[280px] sm:min-h-[240px] flex items-center justify-center p-1">
          <AnimatePresence mode="wait" custom={direction}>
            <motion.div
              key={item.id}
              custom={direction}
              variants={variants}
              initial="enter"
              animate="center"
              exit="exit"
              className="w-full bg-white dark:bg-slate-900/95 backdrop-blur-xl rounded-3xl p-6 sm:p-8 border border-slate-200 dark:border-slate-800 shadow-xl flex flex-col justify-between space-y-5 select-none"
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-center gap-3.5">
                  <div className={`w-12 h-12 rounded-2xl bg-gradient-to-br ${item.avatarBg} text-white font-extrabold flex items-center justify-center text-sm shadow-md shrink-0`}>
                    {item.initials}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-base font-bold text-slate-900 dark:text-white leading-tight">
                        {item.name}
                      </h3>
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400" />
                        {item.badge}
                      </span>
                    </div>
                    <p className="text-xs text-emerald-600 dark:text-emerald-400 font-semibold mt-0.5">
                      {item.role} <span className="text-slate-400 font-normal">· {item.detail}</span>
                    </p>
                  </div>
                </div>

                <div className="hidden sm:inline-flex items-center gap-1 px-3 py-1 rounded-xl text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 shrink-0">
                  <Sparkles className="w-3 h-3 text-amber-500" />
                  <span>{item.highlight}</span>
                </div>
              </div>

              <div className="relative pl-1">
                <Quote className="w-7 h-7 text-emerald-500/20 dark:text-emerald-400/20 absolute -top-3 -left-2 rotate-180 -z-10" />
                <p className="text-sm sm:text-base text-slate-700 dark:text-slate-200 leading-relaxed font-normal italic">
                  "{item.quote}"
                </p>
              </div>

              <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800 text-xs">
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
                <div className="text-[11px] font-medium text-slate-400">
                  {item.date}
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Botones de Navegación del Carrusel */}
        <div className="flex items-center justify-center gap-3 pt-3">
          <button
            type="button"
            onClick={() => paginate(-1)}
            aria-label="Testimonio anterior"
            className="p-2 rounded-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:text-emerald-500 shadow-sm transition"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-1.5">
            {filtered.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={() => {
                  setDirection(i > currentIndex ? 1 : -1);
                  setCurrentIndex(i);
                }}
                className={`h-1.5 rounded-full transition-all ${
                  currentIndex === i ? 'w-6 bg-emerald-500' : 'w-1.5 bg-slate-300 dark:bg-slate-700'
                }`}
              />
            ))}
          </div>
          <button
            type="button"
            onClick={() => paginate(1)}
            aria-label="Testimonio siguiente"
            className="p-2 rounded-full border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 hover:text-emerald-500 shadow-sm transition"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
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

  const heroRef = useRef(null);
  const containerRef = useRef(null);

  // Filtrado reactivo de cocheras
  const filteredParkings = useMemo(() => {
    return establishments.filter((p) => {
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        p.name.toLowerCase().includes(q) ||
        p.address.toLowerCase().includes(q) ||
        (p.reference && p.reference.toLowerCase().includes(q)) ||
        (p.city && p.city.toLowerCase().includes(q));

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

  // Conteo de plazas libres en tiempo real
  const totalFreeSlots = useMemo(() => {
    return establishments.reduce((acc, curr) => {
      return acc + (curr.elements || []).filter(e => e.type === 'slot' && e.status === 'free').length;
    }, 0);
  }, [establishments]);

  const faqs = [
    {
      q: '¿Cómo se realiza el ingreso a la cochera con mi reserva?',
      a: 'Al confirmar tu reserva se genera tu Pase Digital. Al llegar a la cochera en Huamanga, la cámara de garita con visión artificial OpenCV lee tu placa registrada y abre la barrera en menos de 2 segundos, o puedes mostrar el código QR al operador.'
    },
    {
      q: '¿Cuáles son los canales de pago habilitados?',
      a: 'Puedes pagar en línea con Yape, Plin y tarjetas de crédito o débito a través de la pasarela Culqi, o cancelar en efectivo directo en la garita al salir.'
    },
    {
      q: '¿Existe tolerancia de tiempo ante imprevistos de tráfico en Ayacucho?',
      a: 'Sí, todas las reservas cuentan con 15 minutos oficiales de cortesía tras la hora seleccionada para asegurar tu llegada sin cancelaciones ni recargos indebidos.'
    },
    {
      q: '¿Cómo puedo afiliar mi playa de estacionamiento a Smart Park?',
      a: 'Haz clic en "Afiliar Cochera", completa los datos de tu establecimiento y nuestro equipo configurará el plano digital interactivo 2D y el acceso de garita en menos de 24 horas sin costo de instalación.'
    }
  ];

  return (
    <div
      ref={containerRef}
      className="w-full min-h-screen bg-slate-50 dark:bg-[#070B12] text-slate-900 dark:text-slate-100 font-sans antialiased selection:bg-emerald-500 selection:text-white relative overflow-x-hidden transition-colors"
    >
      {/* Fondo ambiental sutil sin manchas saturadas */}
      <div className="fixed inset-0 pointer-events-none z-0 overflow-hidden">
        <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[800px] h-[500px] bg-emerald-500/10 dark:bg-emerald-500/5 rounded-full blur-[140px]" />
        <div className="absolute top-[40%] -right-40 w-[600px] h-[600px] bg-cyan-500/5 dark:bg-cyan-500/5 rounded-full blur-[160px]" />
      </div>

      {/* =========================================================================
          1. HEADER FLOTANTE ULTRA-PREMIUM
          ========================================================================= */}
      <header className="sticky top-0 z-50 px-3 sm:px-6 lg:px-10 pt-2 sm:pt-3 pb-2 transition-all duration-300">
        <div className="max-w-6xl mx-auto bg-white/80 dark:bg-slate-950/80 backdrop-blur-xl border border-slate-200/80 dark:border-white/10 px-4 sm:px-6 py-2.5 rounded-2xl sm:rounded-3xl shadow-lg shadow-black/5 dark:shadow-black/40 flex items-center justify-between relative">
          
          {/* Logo Oficial */}
          <BrandLogo dark={isDark} />

          {/* Navegación Desktop */}
          <nav className="hidden md:flex items-center space-x-1 lg:space-x-2 text-xs font-bold text-slate-600 dark:text-slate-300">
            <a href="#mapa" className="px-3 py-1.5 rounded-xl hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-slate-100 dark:hover:bg-white/5 transition">
              Mapa en Vivo
            </a>
            <a href="#sistema" className="px-3 py-1.5 rounded-xl hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-slate-100 dark:hover:bg-white/5 transition">
              Cómo Funciona
            </a>
            <a href="#caracteristicas" className="px-3 py-1.5 rounded-xl hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-slate-100 dark:hover:bg-white/5 transition">
              Tecnología
            </a>
            <a href="#perspectiva" className="px-3 py-1.5 rounded-xl hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-slate-100 dark:hover:bg-white/5 transition">
              Beneficios
            </a>
            <a href="#testimonios" className="px-3 py-1.5 rounded-xl hover:text-emerald-600 dark:hover:text-emerald-400 hover:bg-slate-100 dark:hover:bg-white/5 transition">
              Testimonios
            </a>
          </nav>

          {/* Acciones */}
          <div className="flex items-center space-x-2 sm:space-x-2.5">
            {/* Tema Claro/Oscuro */}
            <button
              type="button"
              onClick={toggleTheme}
              title={`Tema actual: ${theme}. Clic para alternar`}
              aria-label="Alternar tema"
              className="p-2 rounded-xl bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-slate-200 border border-slate-200 dark:border-white/10 transition cursor-pointer flex items-center justify-center shrink-0"
            >
              {isDark ? <Sun className="w-4 h-4 text-amber-300" /> : <Moon className="w-4 h-4 text-slate-600" />}
            </button>

            {/* Afiliar Cochera */}
            <MagneticButton
              onClick={() => onOpenAuth && onOpenAuth('affiliation')}
              className="hidden sm:inline-flex text-xs font-bold text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 px-3.5 py-2 rounded-xl border border-slate-200 dark:border-white/10 transition cursor-pointer"
            >
              Afiliar Cochera
            </MagneticButton>

            {/* Acceder / Iniciar Sesión */}
            <MagneticButton
              onClick={() => onOpenAuth && onOpenAuth('login')}
              className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black px-4 sm:px-5 py-2 rounded-xl transition cursor-pointer flex items-center space-x-1.5 shadow-md shadow-emerald-500/20"
            >
              <LogIn className="w-3.5 h-3.5 text-slate-950 stroke-[2.5]" />
              <span>Acceder</span>
            </MagneticButton>

            {/* Menú Móvil */}
            <button
              type="button"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/10 rounded-xl transition cursor-pointer"
              aria-label="Abrir menú"
            >
              {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Menú Móvil Desplegable */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.98 }}
              transition={{ duration: 0.2, ease: FLUID_EASE }}
              className="md:hidden mt-2 max-w-6xl mx-auto bg-white/95 dark:bg-slate-950/95 backdrop-blur-xl border border-slate-200 dark:border-white/10 p-4 rounded-2xl shadow-2xl space-y-2 text-xs font-bold text-slate-800 dark:text-slate-200"
            >
              <a href="#mapa" onClick={() => setMobileMenuOpen(false)} className="block px-3.5 py-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-white/10 transition">Mapa en Vivo</a>
              <a href="#sistema" onClick={() => setMobileMenuOpen(false)} className="block px-3.5 py-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-white/10 transition">Cómo Funciona</a>
              <a href="#caracteristicas" onClick={() => setMobileMenuOpen(false)} className="block px-3.5 py-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-white/10 transition">Tecnología</a>
              <a href="#perspectiva" onClick={() => setMobileMenuOpen(false)} className="block px-3.5 py-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-white/10 transition">Beneficios</a>
              <a href="#testimonios" onClick={() => setMobileMenuOpen(false)} className="block px-3.5 py-2.5 rounded-xl hover:bg-slate-100 dark:hover:bg-white/10 transition">Testimonios</a>
              <div className="pt-2 border-t border-slate-200 dark:border-white/10 flex flex-col gap-2">
                <button type="button" onClick={() => { setMobileMenuOpen(false); onOpenAuth && onOpenAuth('affiliation'); }} className="w-full py-2.5 bg-slate-100 dark:bg-white/10 rounded-xl text-center font-bold">
                  Afiliar Cochera
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </header>

      {/* =========================================================================
          2. HERO SECTION DE ALTO IMPACTO
          ========================================================================= */}
      <section ref={heroRef} className="pt-12 sm:pt-18 pb-14 sm:pb-20 px-4 sm:px-6 lg:px-12 max-w-6xl mx-auto space-y-8 text-center relative z-10">
        
        {/* Micro-badge de Estado en Vivo */}
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, ease: FLUID_EASE }}
          className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-700 dark:text-emerald-300 text-xs font-bold tracking-tight shadow-xs"
        >
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500" />
          </span>
          <span>Red Inteligente de Estacionamientos · Ayacucho, Perú</span>
        </motion.div>

        {/* Titular Principal */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1, ease: FLUID_EASE }}
          className="space-y-4 max-w-4xl mx-auto"
        >
          <h1 className="text-3xl sm:text-5xl md:text-6xl font-extrabold tracking-tight text-slate-900 dark:text-white leading-[1.12]">
            Estacionamiento en Tiempo Real en <span className="text-emerald-500">Ayacucho</span>
          </h1>
          <p className="text-sm sm:text-base md:text-lg text-slate-600 dark:text-slate-400 max-w-2xl mx-auto font-normal leading-relaxed">
            Consulta cupos libres al instante, reserva tu lugar exacto en el mapa y accede directo con reconocimiento de placa sin tickets de papel.
          </p>
        </motion.div>

        {/* Buscador Rápido y Filtros */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2, ease: FLUID_EASE }}
          className="max-w-2xl mx-auto space-y-3"
        >
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <Input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar cochera en Huamanga (ej. Plaza Mayor, Jr. Bellido, Mercado)…"
              className="w-full h-12 pl-11 pr-10 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-sm font-medium text-slate-900 dark:text-white placeholder:text-slate-400 shadow-sm focus-visible:ring-2 focus-visible:ring-emerald-500/40"
            />
            {searchQuery && (
              <button
                type="button"
                onClick={() => setSearchQuery('')}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          {/* Quick Filter Pills */}
          <div className="flex flex-wrap items-center justify-center gap-1.5 text-xs font-semibold">
            <button
              type="button"
              onClick={() => { setCategoryFilter('todos'); setSearchQuery(''); }}
              className={`px-3 py-1 rounded-xl transition ${
                categoryFilter === 'todos' && !searchQuery
                  ? 'bg-slate-900 text-white dark:bg-emerald-500 dark:text-slate-950 font-bold'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:border-emerald-500/50'
              }`}
            >
              Todas
            </button>
            <button
              type="button"
              onClick={() => { setCategoryFilter('centro'); setSearchQuery('Plaza Mayor'); }}
              className={`px-3 py-1 rounded-xl transition ${
                searchQuery === 'Plaza Mayor'
                  ? 'bg-slate-900 text-white dark:bg-emerald-500 dark:text-slate-950 font-bold'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:border-emerald-500/50'
              }`}
            >
              Plaza Mayor
            </button>
            <button
              type="button"
              onClick={() => { setCategoryFilter('techados'); setSearchQuery(''); }}
              className={`px-3 py-1 rounded-xl transition ${
                categoryFilter === 'techados'
                  ? 'bg-slate-900 text-white dark:bg-emerald-500 dark:text-slate-950 font-bold'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:border-emerald-500/50'
              }`}
            >
              Techados
            </button>
            <button
              type="button"
              onClick={() => { setCategoryFilter('economicos'); setSearchQuery(''); }}
              className={`px-3 py-1 rounded-xl transition ${
                categoryFilter === 'economicos'
                  ? 'bg-slate-900 text-white dark:bg-emerald-500 dark:text-slate-950 font-bold'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 hover:border-emerald-500/50'
              }`}
            >
              Económicos (≤ S/ 4.50)
            </button>
          </div>
        </motion.div>

        {/* Acciones Principales Hero */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3, ease: FLUID_EASE }}
          className="flex flex-wrap items-center justify-center gap-3 pt-2"
        >
          <MagneticButton
            href="#mapa"
            className="px-6 py-3.5 rounded-2xl bg-slate-900 hover:bg-slate-800 dark:bg-emerald-500 dark:hover:bg-emerald-400 text-white dark:text-slate-950 text-xs font-black shadow-lg transition flex items-center gap-2 cursor-pointer"
          >
            <Car className="w-4 h-4" />
            <span>Ver Cocheras Disponibles en el Mapa</span>
            <ArrowRight className="w-4 h-4" />
          </MagneticButton>

          <MagneticButton
            onClick={() => onOpenAuth && onOpenAuth('affiliation')}
            className="px-5 py-3.5 rounded-2xl bg-white dark:bg-slate-900 text-slate-800 dark:text-slate-200 text-xs font-bold border border-slate-200 dark:border-slate-800 hover:border-emerald-500/50 shadow-sm transition flex items-center gap-2 cursor-pointer"
          >
            <Building2 className="w-4 h-4 text-emerald-500" />
            <span>Afiliar mi Playa de Estacionamiento</span>
          </MagneticButton>
        </motion.div>

        {/* Barra de Estadísticas y Confianza */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4, ease: FLUID_EASE }}
          className="pt-8 max-w-4xl mx-auto"
        >
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 p-4 rounded-3xl bg-white/80 dark:bg-slate-900/80 backdrop-blur-md border border-slate-200 dark:border-slate-800 shadow-sm">
            <div className="p-3 text-center space-y-0.5">
              <span className="text-2xl sm:text-3xl font-black font-mono text-emerald-600 dark:text-emerald-400">+12</span>
              <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400">Cocheras Conectadas</p>
            </div>
            <div className="p-3 text-center space-y-0.5 border-l border-slate-100 dark:border-slate-800">
              <span className="text-2xl sm:text-3xl font-black font-mono text-emerald-600 dark:text-emerald-400">{totalFreeSlots || 34}</span>
              <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400">Cupos Libres en Vivo</p>
            </div>
            <div className="p-3 text-center space-y-0.5 border-t md:border-t-0 md:border-l border-slate-100 dark:border-slate-800">
              <span className="text-2xl sm:text-3xl font-black font-mono text-emerald-600 dark:text-emerald-400">&lt; 2s</span>
              <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400">Lectura LPR de Placa</p>
            </div>
            <div className="p-3 text-center space-y-0.5 border-t md:border-t-0 md:border-l border-slate-100 dark:border-slate-800">
              <span className="text-2xl sm:text-3xl font-black font-mono text-emerald-600 dark:text-emerald-400">15 min</span>
              <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400">Cortesía Anti-Demora</p>
            </div>
          </div>
        </motion.div>

      </section>

      {/* =========================================================================
          3. MAPA EN VIVO & RADAR DE COCHERAS (SECCIÓN ESTRELLA)
          ========================================================================= */}
      <CinematicScrollSection id="mapa" className="py-12 sm:py-20 px-4 sm:px-6 lg:px-12 max-w-6xl mx-auto space-y-6">
        <div className="max-w-3xl mx-auto text-center space-y-2 px-2">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-bold">
            <Radio className="w-3.5 h-3.5 animate-pulse" />
            <span>RADAR EN TIEMPO REAL</span>
          </div>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Cocheras Conectadas en <span className="text-emerald-500">Huamanga</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-md mx-auto font-medium">
            Selecciona una cochera en el mapa para ver sus tarifas, cupos libres y entrar directo a su plano 2D.
          </p>
        </div>

        {/* Mapa Interactivo */}
        <LazyMapSection
          parkings={filteredParkings}
          onSelectParking={(p) => {
            if (onSelectParking) onSelectParking(p);
          }}
        />
      </CinematicScrollSection>

      {/* =========================================================================
          4. BENTO GRID: TECNOLOGÍA SMART-PARK
          ========================================================================= */}
      <CinematicScrollSection id="caracteristicas" className="py-16 sm:py-24 px-4 sm:px-6 lg:px-12 max-w-6xl mx-auto space-y-8">
        <div className="max-w-2xl mx-auto text-center space-y-2 px-2">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-bold">
            <Zap className="w-3.5 h-3.5" />
            <span>TECNOLOGÍA DE VANGUARDIA</span>
          </div>
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Innovaciones integradas en <span className="text-emerald-500">Smart Park</span>
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 max-w-lg mx-auto font-medium">
            Diseñado para erradicar el tráfico en Ayacucho y optimizar el negocio de estacionamientos.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Card 1: Reconocimiento LPR */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3 flex flex-col justify-between hover:border-emerald-500/40 hover:-translate-y-1 transition duration-200">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <Camera className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">Reconocimiento LPR</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Visión artificial que lee tu placa al llegar a garita. La barrera se levanta sin bajar la ventanilla.
              </p>
            </div>
          </div>

          {/* Card 2: Gemelo CAD 2D */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3 flex flex-col justify-between hover:border-emerald-500/40 hover:-translate-y-1 transition duration-200">
            <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-600 dark:text-cyan-400 flex items-center justify-center">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">Gemelo Digital 2D</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Plano interactivo para elegir tu cajón exacto (techado, rampa o planta baja) con estado en vivo.
              </p>
            </div>
          </div>

          {/* Card 3: Pagos Digitales */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3 flex flex-col justify-between hover:border-emerald-500/40 hover:-translate-y-1 transition duration-200">
            <div className="w-10 h-10 rounded-2xl bg-teal-500/10 border border-teal-500/20 text-teal-600 dark:text-teal-400 flex items-center justify-center">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">Pagos Yape / Tarjeta</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Paga de inmediato con Yape, Plin o tarjetas vía Culqi. Sin necesidad de buscar cambio o monedas.
              </p>
            </div>
          </div>

          {/* Card 4: Pase Digital QR */}
          <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3 flex flex-col justify-between hover:border-emerald-500/40 hover:-translate-y-1 transition duration-200">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white mb-1">Pase Digital QR</h3>
              <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                Voucher digital con 15 min de tolerancia y enlace directo de navegación en Waze y Google Maps.
              </p>
            </div>
          </div>

        </div>
      </CinematicScrollSection>

      {/* =========================================================================
          5. CÓMO FUNCIONA (STORYTELLING EN 3 PASOS)
          ========================================================================= */}
      <StickyStorytellingSection />

      {/* =========================================================================
          6. PERSPECTIVA DUAL: CONDUCTOR VS PROPIETARIO
          ========================================================================= */}
      <CinematicScrollSection id="perspectiva" className="py-16 sm:py-24 px-4 sm:px-6 lg:px-12 max-w-6xl mx-auto space-y-8">
        <div className="max-w-2xl mx-auto text-center space-y-3">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-600 dark:text-emerald-400 text-xs font-bold">
            <SlidersHorizontal className="w-3.5 h-3.5" />
            <span>SOLUCIÓN A LA MEDIDA</span>
          </div>

          <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            ¿Cómo te ayuda <span className="text-emerald-500">Smart Park</span>?
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 font-medium">
            Selecciona tu rol y descubre las herramientas diseñadas para tu día a día en Ayacucho.
          </p>

          {/* Selector de Perfil */}
          <div className="inline-flex p-1.5 rounded-2xl bg-slate-200/70 dark:bg-slate-800/80 border border-slate-300/60 dark:border-slate-700 backdrop-blur-md shadow-inner mt-2">
            <button
              type="button"
              onClick={() => setUserPersona('conductor')}
              className={`flex items-center gap-2 px-5 sm:px-7 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
                userPersona === 'conductor'
                  ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-sm'
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
                  ? 'bg-white dark:bg-slate-900 text-emerald-600 dark:text-emerald-400 shadow-sm'
                  : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <Building2 className="w-4 h-4" />
              <span>Tengo una Cochera</span>
            </button>
          </div>
        </div>

        {/* Contenido Condicional */}
        <AnimatePresence mode="wait">
          {userPersona === 'conductor' ? (
            <motion.div
              key="conductor"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25 }}
              className="space-y-6"
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                    <Navigation className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">Llegada Guiada con GPS</h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    Navegación asistida en Waze y Google Maps directo a la puerta de la cochera. Ahorra tiempo en horas punta.
                  </p>
                </div>

                <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
                  <div className="w-10 h-10 rounded-2xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center">
                    <Clock className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">15 Minutos de Tolerancia</h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    Ventana de cortesía oficial ante retrasos o tráfico en Huamanga. Tu cajón permanece reservado y asegurado.
                  </p>
                </div>

                <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
                  <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 flex items-center justify-center">
                    <ShieldCheck className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">Cero Tickets Perdidos</h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    Todo el registro de entrada, estadía y comprobante de pago queda archivado de manera transparente en tu perfil.
                  </p>
                </div>
              </div>

              <div className="text-center pt-2">
                <a
                  href="#mapa"
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-slate-900 hover:bg-slate-800 dark:bg-emerald-500 dark:hover:bg-emerald-400 text-white dark:text-slate-950 text-xs font-black shadow-md transition"
                >
                  <Car className="w-4 h-4" />
                  <span>Explorar Cocheras en el Mapa</span>
                  <ArrowRight className="w-4 h-4" />
                </a>
              </div>
            </motion.div>
          ) : (
            <motion.div
              key="propietario"
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -12 }}
              transition={{ duration: 0.25 }}
              className="space-y-6"
            >
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
                  <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                    <TrendingUp className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">Control Total de Caja</h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    Audita en tiempo real las entradas y salidas de cada operador de garita. Cero fugas de dinero en turnos diurnos y nocturnos.
                  </p>
                </div>

                <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
                  <div className="w-10 h-10 rounded-2xl bg-teal-500/10 text-teal-600 dark:text-teal-400 flex items-center justify-center">
                    <Layers className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">Editor CAD 2D Gratuito</h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    Dibuja y ajusta tus cajones, vías y áreas de maniobra en minutos. Visualiza la ocupación exacta desde cualquier dispositivo.
                  </p>
                </div>

                <div className="bg-white dark:bg-slate-900 p-6 rounded-3xl border border-slate-200 dark:border-slate-800 shadow-sm space-y-3">
                  <div className="w-10 h-10 rounded-2xl bg-cyan-500/10 text-cyan-600 dark:text-cyan-400 flex items-center justify-center">
                    <Zap className="w-5 h-5" />
                  </div>
                  <h3 className="text-base font-bold text-slate-900 dark:text-white">+35% Mayor Facturación</h3>
                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
                    Capta conductores que planifican su estacionamiento antes de llegar al centro histórico y asegura reservas anticipadas.
                  </p>
                </div>
              </div>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => onOpenAuth && onOpenAuth('affiliation')}
                  className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black shadow-md transition cursor-pointer"
                >
                  <Building2 className="w-4 h-4" />
                  <span>Solicitar Afiliación de mi Cochera</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </CinematicScrollSection>

      {/* =========================================================================
          7. TESTIMONIOS REALES DE AYACUCHO
          ========================================================================= */}
      <TestimonialsCarouselSection />

      {/* =========================================================================
          8. PREGUNTAS FRECUENTES (FAQ)
          ========================================================================= */}
      <CinematicScrollSection id="faq" className="py-16 sm:py-24 px-4 sm:px-6 lg:px-12 max-w-4xl mx-auto space-y-8">
        <div className="text-center space-y-2">
          <h2 className="text-2xl sm:text-3xl md:text-4xl font-extrabold text-slate-900 dark:text-white tracking-tight">
            Preguntas Frecuentes
          </h2>
          <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-400 font-medium">
            Respuestas a las dudas más comunes sobre el servicio de Smart Park en Huamanga.
          </p>
        </div>

        <div className="space-y-3">
          {faqs.map((faq, idx) => {
            const isOpen = activeFaq === idx;
            return (
              <div
                key={idx}
                className="bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 overflow-hidden transition"
              >
                <button
                  type="button"
                  onClick={() => setActiveFaq(isOpen ? null : idx)}
                  className="w-full p-5 text-left flex items-center justify-between gap-4 cursor-pointer"
                >
                  <span className="text-sm font-bold text-slate-900 dark:text-white">{faq.q}</span>
                  <div className={`p-1 rounded-full bg-slate-100 dark:bg-slate-800 transition-transform ${isOpen ? 'rotate-180' : ''}`}>
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
                      <div className="px-5 pb-5 text-xs sm:text-sm text-slate-600 dark:text-slate-400 leading-relaxed border-t border-slate-100 dark:border-slate-800/80 pt-3">
                        {faq.a}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      </CinematicScrollSection>

      {/* =========================================================================
          9. CTA FINAL DE CONVERSIÓN
          ========================================================================= */}
      <CinematicScrollSection className="py-12 sm:py-20 px-4 sm:px-6 lg:px-12 max-w-5xl mx-auto">
        <div className="p-8 sm:p-12 rounded-3xl bg-gradient-to-br from-slate-900 via-slate-950 to-slate-900 text-white border border-slate-800 shadow-2xl relative overflow-hidden text-center space-y-6">
          <div className="absolute top-0 right-0 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
          
          <div className="space-y-2 max-w-2xl mx-auto relative z-10">
            <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
              Moderniza tu forma de estacionar en Huamanga
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 max-w-lg mx-auto">
              Únete a la red de conductores y playas conectadas que ya ahorran tiempo y combustible a diario.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-3 relative z-10">
            <MagneticButton
              href="#mapa"
              className="px-6 py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black shadow-lg transition flex items-center gap-2 cursor-pointer"
            >
              <Car className="w-4 h-4" />
              <span>Ver Mapa en Vivo</span>
            </MagneticButton>
            <MagneticButton
              onClick={() => onOpenAuth && onOpenAuth('affiliation')}
              className="px-6 py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold border border-white/20 transition flex items-center gap-2 cursor-pointer"
            >
              <Building2 className="w-4 h-4 text-emerald-400" />
              <span>Afiliar mi Cochera</span>
            </MagneticButton>
          </div>
        </div>
      </CinematicScrollSection>

      {/* =========================================================================
          10. FOOTER CORPORATIVO LIMPIO
          ========================================================================= */}
      <footer className="border-t border-slate-200 dark:border-slate-800/80 bg-white dark:bg-slate-950 py-10 px-4 sm:px-6 lg:px-12 text-slate-500 text-xs z-10 relative">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 text-center md:text-left">
          <div className="space-y-2 flex flex-col items-center md:items-start">
            <BrandLogo dark={isDark} />
            <p className="text-[11px] text-slate-500 dark:text-slate-400 max-w-sm">
              Ecosistema Inteligente de Estacionamientos de Ayacucho, Perú.
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 text-xs font-semibold text-slate-600 dark:text-slate-300">
            <a href="#mapa" className="hover:text-emerald-500 transition">Directorio</a>
            <a href="#sistema" className="hover:text-emerald-500 transition">Cómo Funciona</a>
            <a href="#caracteristicas" className="hover:text-emerald-500 transition">Tecnología</a>
            <button
              type="button"
              onClick={() => onOpenTerms && onOpenTerms()}
              className="hover:text-emerald-500 transition cursor-pointer"
            >
              Términos y Condiciones
            </button>
          </div>

          <div className="text-[11px] text-slate-400 dark:text-slate-500">
            © {new Date().getFullYear()} Smart-Park. Todos los derechos reservados.
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
