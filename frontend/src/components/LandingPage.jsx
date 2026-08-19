import React, { useState } from 'react';
import { motion, useScroll, useSpring, AnimatePresence } from 'framer-motion';
import { 
  Search, 
  MapPin, 
  Car, 
  ShieldCheck, 
  QrCode, 
  Sparkles, 
  ChevronRight, 
  Building2, 
  CheckCircle2, 
  ArrowRight, 
  Zap, 
  Clock, 
  Navigation, 
  Camera, 
  CreditCard, 
  Smartphone, 
  Award, 
  Phone, 
  HelpCircle,
  LogIn,
  Filter,
  Check,
  Star,
  Shield,
  Layers,
  Activity,
  Scan,
  Compass,
  Cpu,
  RefreshCw,
  Sliders,
  CheckCheck
} from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Card } from './ui/card';
import { AyacuchoMap } from './AyacuchoMap';

export const LandingPage = ({ 
  establishments = [], 
  onOpenAuth, 
  onSelectParking, 
  onOpenTerms 
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('todos');
  const [activeFaq, setActiveFaq] = useState(null);
  
  // Estados para Showcase Interactivo de la App (Mobbin/Refero style)
  const [activeTabShowcase, setActiveTabShowcase] = useState('qr'); // 'qr' | 'anpr' | 'cad'

  // Estados para el Simulador de Garita ANPR en Vivo
  const [simPlate, setSimPlate] = useState('ABC-123');
  const [isScanning, setIsScanning] = useState(false);
  const [scanResult, setScanResult] = useState(null);

  // Barra de Progreso de Scroll
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.001
  });

  // Ejecutar simulación de lectura de placa ANPR
  const handleRunPlateScan = () => {
    if (!simPlate.trim()) return;
    setIsScanning(true);
    setScanResult(null);

    setTimeout(() => {
      setIsScanning(false);
      setScanResult({
        plate: simPlate.toUpperCase(),
        status: 'AUTORIZADO',
        confidence: '99.8%',
        vehicle: 'Toyota Hilux • Blanco',
        slot: 'Plaza A-01 (Techada)',
        time: '0.18s'
      });
    }, 1200);
  };

  // Filtrado de cocheras
  const filteredParkings = establishments.filter((p) => {
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

  const totalSlots = establishments.reduce((acc, curr) => {
    return acc + (curr.elements || []).filter(e => e.type === 'slot').length;
  }, 0);

  const totalFreeSlots = establishments.reduce((acc, curr) => {
    return acc + (curr.elements || []).filter(e => e.type === 'slot' && e.status === 'free').length;
  }, 0);

  const testimonials = [
    {
      name: 'Carlos Mendoza',
      role: 'Conductor Frecuente',
      zone: 'Jr. 28 de Julio, Huamanga',
      text: 'Antes perdía 20 minutos buscando dónde dejar mi camioneta cerca a la Plaza Mayor. Con Smart-Park llego directo a mi plaza reservada y la garita me abre con solo leer la placa.',
      stars: 5
    },
    {
      name: 'Ing. Maritza Quispe',
      role: 'Administradora de Cochera',
      zone: 'Cochera Portal Unión',
      text: 'Digitalizar nuestra cochera nos tomó menos de un día. El sistema de planos CAD y la liquidación automática de pagos por Yape/Plin multiplicaron nuestros clientes diarios.',
      stars: 5
    },
    {
      name: 'Diego Alarcón',
      role: 'Turista / Visitante',
      zone: 'Lima ➔ Ayacucho',
      text: 'El pase QR con integración directa a Waze es espectacular. Llegué a Ayacucho por Semana Santa y tenía mi plaza segura sin complicaciones.',
      stars: 5
    }
  ];

  const faqs = [
    {
      q: '¿Cómo funciona el ingreso automático con cámara ANPR?',
      a: 'Al registrar tu vehículo o hacer tu reserva, la cámara instalada en la garita detecta la placa de tu auto a 60 FPS mediante visión por computadora y levanta la barrera en menos de 0.2 segundos sin que tengas que bajar la ventana ni tocar tickets.'
    },
    {
      q: '¿Puedo pagar con Yape, Plin o Tarjeta?',
      a: 'Sí. Aceptamos pagos seguros en línea mediante Culqi (tarjetas de crédito y débito Visa, Mastercard), además de transferencias por Yape y Plin con emisión automática de tu comprobante electrónico de pago.'
    },
    {
      q: '¿Existe tolerancia de tiempo si hay tráfico en Huamanga?',
      a: 'Sí, todas las cocheras de la red cuentan con 15 minutos de cortesía y tolerancia garantizada para que tu estancia sea completamente libre de estrés.'
    },
    {
      q: '¿Cómo afilio mi estacionamiento si soy propietario en Ayacucho?',
      a: 'Solo haz clic en "Afiliar mi Cochera", completa el formulario con la ubicación y capacidad, y nuestro equipo configurará tu plano topográfico interactivo en 24 horas.'
    }
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 font-sans selection:bg-emerald-500 selection:text-white antialiased overflow-x-hidden relative">
      
      {/* =========================================================================
          BARRA DE PROGRESO DE SCROLL SUPERIOR
          ========================================================================= */}
      <motion.div 
        className="fixed top-0 left-0 right-0 h-1 bg-gradient-to-r from-emerald-400 via-teal-400 to-emerald-500 z-[100] origin-left shadow-[0_0_12px_rgba(52,211,153,0.8)]"
        style={{ scaleX }}
      />

      {/* =========================================================================
          1. HEADER GLASSMORPHISM DARK CON REFLEJOS
          ========================================================================= */}
      <header className="sticky top-0 z-50 px-4 sm:px-6 lg:px-10 py-3.5 bg-slate-950/80 backdrop-blur-2xl border-b border-slate-800/80 shadow-2xl select-none">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          
          {/* Logo y Badge de Ciudad */}
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-slate-900 to-slate-950 text-emerald-400 flex items-center justify-center font-bold shadow-lg shadow-emerald-500/10 border border-emerald-500/30 shrink-0">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-5 h-5">
                <path d="M9 17V7h4a3 3 0 0 1 0 6H9" />
                <circle cx="12" cy="12" r="10" />
              </svg>
            </div>
            <div>
              <span className="text-base sm:text-lg font-black text-white tracking-tight font-tech block leading-tight">
                SMART-PARK
              </span>
              <span className="text-[9px] font-mono text-emerald-400 font-extrabold uppercase tracking-wider block">
                Ayacucho • Huamanga
              </span>
            </div>
          </div>

          {/* Menú Central Desktop con Hover Animado */}
          <nav className="hidden md:flex items-center space-x-8 text-xs font-bold text-slate-300">
            <a href="#showcase" className="hover:text-emerald-400 transition-colors">Innovación</a>
            <a href="#simulador" className="hover:text-emerald-400 transition-colors">Simulador ANPR</a>
            <a href="#mapa" className="hover:text-emerald-400 transition-colors">Mapa en Vivo</a>
            <a href="#tecnologia" className="hover:text-emerald-400 transition-colors">Tecnología</a>
            <a href="#afiliacion" className="hover:text-emerald-400 transition-colors">Para Cocheras</a>
          </nav>

          {/* Acciones de Autenticación */}
          <div className="flex items-center space-x-2.5">
            <button
              onClick={() => onOpenAuth && onOpenAuth('affiliation')}
              className="hidden sm:flex items-center space-x-1.5 px-3.5 py-2 rounded-xl border border-slate-800 bg-slate-900/90 hover:bg-slate-800 text-slate-200 text-xs font-bold transition shadow-xs cursor-pointer hover:border-slate-700"
            >
              <Building2 className="w-3.5 h-3.5 text-emerald-400" />
              <span>Afiliar Cochera</span>
            </button>
            <Button
              onClick={() => onOpenAuth && onOpenAuth('login')}
              className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs px-4.5 py-2 rounded-xl shadow-lg shadow-emerald-500/25 cursor-pointer flex items-center space-x-1.5 transition-all hover:scale-[1.02] active:scale-95"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Iniciar Sesión</span>
            </Button>
          </div>

        </div>
      </header>

      {/* =========================================================================
          2. HERO SECTION REFERO / MOBBIN STYLE CON GLOW Y PARALLAX
          ========================================================================= */}
      <section className="relative pt-16 pb-20 sm:pt-24 sm:pb-32 px-4 sm:px-6 lg:px-8 overflow-hidden">
        
        {/* Orbes de luz volumétrica de fondo */}
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[350px] bg-gradient-to-r from-emerald-500/20 via-teal-500/15 to-emerald-600/20 rounded-full blur-[140px] pointer-events-none" />
        <div className="absolute top-1/3 right-10 w-[400px] h-[300px] bg-cyan-500/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute -bottom-20 left-10 w-[450px] h-[250px] bg-emerald-500/10 rounded-full blur-[130px] pointer-events-none" />

        {/* Patrón de cuadrícula de precisión sutil */}
        <div 
          className="absolute inset-0 opacity-[0.04] pointer-events-none bg-[radial-gradient(#34d399_1px,transparent_1px)] [background-size:24px_24px]" 
        />

        <div className="max-w-5xl mx-auto text-center relative z-10 space-y-8">
          
          {/* Badge Flotante con Pulso y Borde Brillante */}
          <motion.div 
            initial={{ opacity: 0, y: -15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: 'easeOut' }}
            className="inline-flex items-center space-x-2.5 px-4 py-1.5 rounded-full bg-slate-900/90 border border-emerald-500/30 shadow-[0_0_20px_rgba(16,185,129,0.15)] text-xs font-bold text-emerald-300"
          >
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
            <span className="font-mono tracking-wide">{totalFreeSlots} plazas libres en tiempo real</span>
            <span className="text-slate-600">•</span>
            <span className="text-slate-300 font-medium">Ayacucho, Perú</span>
          </motion.div>

          {/* Titular Principal Editorial */}
          <motion.h1 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1, ease: 'easeOut' }}
            className="text-4xl sm:text-6xl lg:text-7xl font-black text-white tracking-tight leading-[1.08] max-w-4xl mx-auto"
          >
            Aparca sin vueltas en Ayacucho.{' '}
            <span className="bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-500 bg-clip-text text-transparent underline decoration-emerald-500/30 decoration-wavy decoration-2">
              Reserva tu plaza en vivo.
            </span>
          </motion.h1>

          {/* Subtítulo */}
          <motion.p 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2, ease: 'easeOut' }}
            className="text-sm sm:text-base md:text-lg text-slate-400 max-w-2xl mx-auto font-normal leading-relaxed"
          >
            Explora el plano topográfico 2D de las mejores cocheras de Huamanga, elige tu plaza exacta y accede sin tickets mediante lectura de placa ANPR y pase digital QR.
          </motion.p>

          {/* Barra de Búsqueda Rápida Glassmorphism */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3, ease: 'easeOut' }}
            className="max-w-xl mx-auto pt-2"
          >
            <div className="p-2 bg-slate-900/90 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-800 flex flex-col sm:flex-row items-center gap-2 ring-1 ring-white/10 hover:border-emerald-500/40 transition-colors">
              <div className="flex-1 flex items-center space-x-2.5 px-3 w-full">
                <Search className="w-4 h-4 text-emerald-400 shrink-0" />
                <Input
                  type="text"
                  placeholder="Buscar por jirón, Plaza Mayor o cochera..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="border-none shadow-none focus-visible:ring-0 text-xs sm:text-sm h-10 px-0 placeholder:text-slate-500 text-white bg-transparent"
                />
              </div>
              <a
                href="#mapa"
                className="w-full sm:w-auto px-6 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black rounded-xl shadow-lg shadow-emerald-500/20 transition flex items-center justify-center space-x-1.5 shrink-0"
              >
                <span>Ver Mapa en Vivo</span>
                <ChevronRight className="w-4 h-4" />
              </a>
            </div>
          </motion.div>

          {/* Tarjetas de Estadísticas Flotantes */}
          <motion.div 
            initial={{ opacity: 0, y: 25 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4, ease: 'easeOut' }}
            className="pt-8 grid grid-cols-2 sm:grid-cols-4 gap-3.5 max-w-4xl mx-auto text-left"
          >
            <div className="bg-slate-900/70 backdrop-blur-md p-4 rounded-2xl border border-slate-800/90 shadow-xl hover:border-slate-700 transition">
              <span className="text-2xl sm:text-3xl font-black text-white font-mono block">
                {establishments.length}+
              </span>
              <span className="text-[11px] text-slate-400 font-bold block mt-0.5">Cocheras Conectadas</span>
            </div>
            <div className="bg-slate-900/70 backdrop-blur-md p-4 rounded-2xl border border-slate-800/90 shadow-xl hover:border-slate-700 transition">
              <span className="text-2xl sm:text-3xl font-black text-emerald-400 font-mono block">
                100%
              </span>
              <span className="text-[11px] text-slate-400 font-bold block mt-0.5">Pase QR & Waze GPS</span>
            </div>
            <div className="bg-slate-900/70 backdrop-blur-md p-4 rounded-2xl border border-slate-800/90 shadow-xl hover:border-slate-700 transition">
              <span className="text-2xl sm:text-3xl font-black text-white font-mono block">
                &lt; 0.2s
              </span>
              <span className="text-[11px] text-slate-400 font-bold block mt-0.5">Lectura de Placa ANPR</span>
            </div>
            <div className="bg-slate-900/70 backdrop-blur-md p-4 rounded-2xl border border-slate-800/90 shadow-xl hover:border-slate-700 transition">
              <span className="text-2xl sm:text-3xl font-black text-emerald-400 font-mono block">
                S/ 4.00
              </span>
              <span className="text-[11px] text-slate-400 font-bold block mt-0.5">Tarifa Base por Hora</span>
            </div>
          </motion.div>

        </div>
      </section>

      {/* =========================================================================
          3. SHOWCASE INTERACTIVO DE LA APP (MOBBIN / REFERO EXPERIMENTAL)
          ========================================================================= */}
      <section id="showcase" className="py-16 sm:py-24 px-4 sm:px-6 lg:px-8 max-w-6xl mx-auto space-y-10">
        
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 font-mono block">
            INTERFAZ DE CLASE MUNDIAL
          </span>
          <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
            Diseñado para la velocidad y simplicidad
          </h2>
          <p className="text-xs sm:text-sm text-slate-400">
            Interactúa con los módulos principales y comprueba cómo funciona la experiencia digital.
          </p>
        </div>

        {/* Pestañas Selectoras del Mockup */}
        <div className="flex justify-center">
          <div className="inline-flex p-1.5 rounded-2xl bg-slate-900 border border-slate-800 gap-1 shadow-xl">
            <button
              onClick={() => setActiveTabShowcase('qr')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-2 cursor-pointer ${
                activeTabShowcase === 'qr' 
                  ? 'bg-emerald-500 text-slate-950 shadow-md font-black' 
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <QrCode className="w-3.5 h-3.5" />
              <span>1. Pase Digital QR</span>
            </button>
            <button
              onClick={() => setActiveTabShowcase('anpr')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-2 cursor-pointer ${
                activeTabShowcase === 'anpr' 
                  ? 'bg-emerald-500 text-slate-950 shadow-md font-black' 
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Camera className="w-3.5 h-3.5" />
              <span>2. Garita ANPR en Vivo</span>
            </button>
            <button
              onClick={() => setActiveTabShowcase('cad')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition flex items-center space-x-2 cursor-pointer ${
                activeTabShowcase === 'cad' 
                  ? 'bg-emerald-500 text-slate-950 shadow-md font-black' 
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>3. Plano CAD Topográfico</span>
            </button>
          </div>
        </div>

        {/* Marco de Previsualización Isométrica Interactiva */}
        <div className="relative rounded-3xl bg-gradient-to-b from-slate-900 via-slate-900/90 to-slate-950 border border-slate-800 p-6 sm:p-10 shadow-2xl overflow-hidden ring-1 ring-white/10">
          
          <AnimatePresence mode="wait">
            {activeTabShowcase === 'qr' && (
              <motion.div
                key="qr"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.3 }}
                className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center"
              >
                <div className="space-y-4">
                  <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-xl bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 text-xs font-mono font-bold">
                    <Smartphone className="w-3.5 h-3.5" />
                    <span>Pase Móvil de Acceso</span>
                  </div>
                  <h3 className="text-2xl font-black text-white tracking-tight">
                    Tu pase de estacionamiento siempre contigo
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                    Al confirmar tu reserva se genera un código QR de alta resolución con temporizador en vivo, datos de tu vehículo y botones para abrir la ruta en Google Maps o Waze.
                  </p>
                  <div className="space-y-2 pt-2 text-xs font-medium text-slate-300">
                    <div className="flex items-center space-x-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span>Legible en pantallas de celular con brillo reducido</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span>Integración directa de navegación GPS con 1 toque</span>
                    </div>
                  </div>
                </div>

                {/* Tarjeta Visual de Pase QR */}
                <div className="max-w-xs mx-auto bg-white text-slate-900 p-5 rounded-3xl shadow-2xl border border-slate-200 space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <div>
                      <h4 className="font-extrabold text-xs">Smart Park Plaza Mayor</h4>
                      <p className="text-[10px] text-slate-500">Jr. 28 de Julio 142</p>
                    </div>
                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 font-mono font-bold text-[10px] rounded-lg">
                      ACTIVO
                    </span>
                  </div>

                  <div className="bg-slate-50 p-4 rounded-2xl border border-slate-200 flex flex-col items-center justify-center space-y-2">
                    <div className="w-36 h-36 bg-white p-2 rounded-xl border border-slate-300 shadow-inner flex items-center justify-center">
                      <QrCode className="w-32 h-32 text-slate-900" />
                    </div>
                    <span className="font-mono text-xs font-black text-slate-800 tracking-wider">
                      SPK-8912-7B2F9A
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-center text-xs">
                    <div className="bg-slate-50 p-2 rounded-xl border border-slate-200">
                      <span className="text-[9px] text-slate-500 block">Plaza</span>
                      <strong className="font-mono text-emerald-700">A-01</strong>
                    </div>
                    <div className="bg-slate-50 p-2 rounded-xl border border-slate-200">
                      <span className="text-[9px] text-slate-500 block">Placa</span>
                      <strong className="font-mono text-slate-900">ABC-123</strong>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTabShowcase === 'anpr' && (
              <motion.div
                key="anpr"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.3 }}
                className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center"
              >
                <div className="space-y-4">
                  <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-xl bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 text-xs font-mono font-bold">
                    <Camera className="w-3.5 h-3.5" />
                    <span>Algoritmo de Visión Artificial</span>
                  </div>
                  <h3 className="text-2xl font-black text-white tracking-tight">
                    Apertura de garita a 60 FPS por lectura de placa
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                    Las cámaras ANPR detectan el ingreso del vehículo a la garita, cruzan la placa con la reserva en la nube y abren la barrera en menos de 0.2 segundos.
                  </p>
                  <div className="space-y-2 pt-2 text-xs font-medium text-slate-300">
                    <div className="flex items-center space-x-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span>Reconocimiento de caracteres peruanos (MTC) al 99.8%</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span>Visión nocturna por infrarrojos para días lluviosos</span>
                    </div>
                  </div>
                </div>

                {/* Vista de Garita ANPR */}
                <div className="bg-slate-950 p-6 rounded-3xl border border-slate-800 shadow-2xl space-y-4 font-mono text-xs">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <div className="flex items-center space-x-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping" />
                      <span className="text-slate-300 font-bold">GARITA PRINCIPAL ANPR</span>
                    </div>
                    <span className="text-[10px] text-emerald-400 font-bold bg-emerald-950/80 px-2 py-0.5 rounded-md border border-emerald-500/40">
                      EN VIVO 60 FPS
                    </span>
                  </div>

                  <div className="relative h-44 bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden flex flex-col items-center justify-center p-4">
                    {/* Línea de escaneo láser animada */}
                    <div className="absolute top-0 left-0 right-0 h-0.5 bg-emerald-400 shadow-[0_0_15px_#34d399] animate-pulse" />
                    
                    <div className="border-2 border-emerald-400/80 bg-slate-950/80 px-5 py-2.5 rounded-xl text-center space-y-1 shadow-xl">
                      <span className="text-[10px] text-slate-400 block">PLACA DETECTADA</span>
                      <strong className="text-xl font-black text-emerald-400 tracking-widest block font-mono">
                        ABC-123
                      </strong>
                    </div>
                    <span className="text-[10px] text-emerald-400 font-bold mt-2">
                      ✔ BARRERA DE ACCESO ABIERTA
                    </span>
                  </div>

                  <div className="flex justify-between text-[11px] text-slate-400">
                    <span>Tiempo de respuesta: <strong className="text-white">0.18s</strong></span>
                    <span>Tolerancia: <strong className="text-white">15 min</strong></span>
                  </div>
                </div>
              </motion.div>
            )}

            {activeTabShowcase === 'cad' && (
              <motion.div
                key="cad"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -15 }}
                transition={{ duration: 0.3 }}
                className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center"
              >
                <div className="space-y-4">
                  <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-xl bg-emerald-500/10 text-emerald-300 border border-emerald-500/20 text-xs font-mono font-bold">
                    <Layers className="w-3.5 h-3.5" />
                    <span>Planos CAD Topográficos</span>
                  </div>
                  <h3 className="text-2xl font-black text-white tracking-tight">
                    Elige exactamente dónde vas a estacionar
                  </h3>
                  <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                    Nuestra tecnología de planos 2D vectoriales te permite ver la distribución real de la cochera, saber si una plaza está techada, cerca a la salida o adaptada para PMR.
                  </p>
                  <div className="space-y-2 pt-2 text-xs font-medium text-slate-300">
                    <div className="flex items-center space-x-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span>Actualización de ocupación en tiempo real por WebSocket</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span>Diferenciación de plazas estándar, motos y personas con discapacidad</span>
                    </div>
                  </div>
                </div>

                {/* Plano CAD Mockup */}
                <div className="bg-slate-950 p-6 rounded-3xl border border-slate-800 shadow-2xl space-y-4 font-mono text-xs">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <span className="text-slate-300 font-bold">DISTRIBUCIÓN DE PLAZAS 2D</span>
                    <span className="text-emerald-400 font-bold">14 LIBRES</span>
                  </div>

                  <div className="grid grid-cols-4 gap-2.5 p-3 bg-slate-900 rounded-2xl border border-slate-800">
                    <div className="bg-emerald-500/20 border-2 border-emerald-400 text-emerald-300 p-3 rounded-xl text-center font-bold">
                      A-01
                      <span className="text-[9px] block font-normal">Libre</span>
                    </div>
                    <div className="bg-emerald-500/20 border-2 border-emerald-400 text-emerald-300 p-3 rounded-xl text-center font-bold">
                      A-02
                      <span className="text-[9px] block font-normal">Libre</span>
                    </div>
                    <div className="bg-rose-500/20 border border-rose-500/40 text-rose-300 p-3 rounded-xl text-center font-bold opacity-60">
                      A-03
                      <span className="text-[9px] block font-normal">Ocupada</span>
                    </div>
                    <div className="bg-emerald-500/20 border-2 border-emerald-400 text-emerald-300 p-3 rounded-xl text-center font-bold">
                      A-04
                      <span className="text-[9px] block font-normal">Libre</span>
                    </div>
                  </div>

                  <p className="text-[10px] text-slate-400 text-center">
                    Toca cualquier plaza verde para seleccionarla en el plano real
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

        </div>
      </section>

      {/* =========================================================================
          4. SIMULADOR INTERACTIVO DE GARITA ANPR EN VIVO
          ========================================================================= */}
      <section id="simulador" className="py-16 sm:py-20 px-4 sm:px-6 lg:px-8 max-w-4xl mx-auto space-y-8">
        
        <div className="text-center space-y-2">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 text-xs font-mono font-bold">
            <Cpu className="w-3.5 h-3.5" />
            <span>Simulador Interactivo de Reconocimiento</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
            Prueba cómo la cámara inteligente lee tu placa
          </h2>
          <p className="text-xs sm:text-sm text-slate-400">
            Ingresa la placa de tu auto y prueba el algoritmo de detección en milisegundos.
          </p>
        </div>

        {/* Card del Simulador */}
        <div className="bg-gradient-to-b from-slate-900 to-slate-950 p-6 sm:p-8 rounded-3xl border border-slate-800 shadow-2xl space-y-6">
          
          <div className="flex flex-col sm:flex-row gap-3 items-center">
            <div className="flex-1 w-full relative">
              <Car className="w-4 h-4 absolute left-3.5 top-3.5 text-slate-400" />
              <Input
                type="text"
                placeholder="Ingresa tu placa (Ej. ABC-123, AYC-501)"
                value={simPlate}
                onChange={(e) => setSimPlate(e.target.value.toUpperCase())}
                maxLength={7}
                className="pl-10 h-12 bg-slate-950 border-slate-800 text-emerald-400 font-mono font-bold text-sm tracking-widest uppercase focus-visible:ring-emerald-500"
              />
            </div>
            <Button
              onClick={handleRunPlateScan}
              disabled={isScanning}
              className="w-full sm:w-auto h-12 px-6 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs rounded-xl shadow-lg shadow-emerald-500/20 transition cursor-pointer"
            >
              {isScanning ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  <span>Escaneando Placa...</span>
                </>
              ) : (
                <>
                  <Scan className="w-4 h-4 mr-2" />
                  <span>Probar Detección ANPR</span>
                </>
              )}
            </Button>
          </div>

          {/* Resultado del Escaneo */}
          {scanResult && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="p-5 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 space-y-3 font-mono text-xs"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <CheckCheck className="w-5 h-5 text-emerald-400" />
                  <span className="font-bold text-white text-sm">Vehículo Identificado con Éxito</span>
                </div>
                <span className="px-2 py-0.5 rounded-lg bg-emerald-400 text-slate-950 font-black text-[10px]">
                  {scanResult.status}
                </span>
              </div>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-1 text-slate-300">
                <div>
                  <span className="text-[10px] text-slate-500 block">Placa</span>
                  <strong className="text-emerald-400 font-bold">{scanResult.plate}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">Precisión OCR</span>
                  <strong className="text-white">{scanResult.confidence}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">Plaza Asignada</span>
                  <strong className="text-white">{scanResult.slot}</strong>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">Latencia</span>
                  <strong className="text-emerald-400">{scanResult.time}</strong>
                </div>
              </div>
            </motion.div>
          )}

        </div>
      </section>

      {/* =========================================================================
          5. MAPA EN VIVO & CATÁLOGO DE COCHERAS EN HUAMANGA
          ========================================================================= */}
      <section id="mapa" className="py-16 sm:py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-8 bg-slate-900/40 rounded-3xl border border-slate-800/80 my-8">
        
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-xs font-mono font-bold mb-2">
              <Navigation className="w-3.5 h-3.5" />
              <span>Exploración Satelital en Tiempo Real</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Cocheras Conectadas en Ayacucho
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              Selecciona cualquier estacionamiento para consultar tarifas, fotos y plazas libres.
            </p>
          </div>

          {/* Filtros Rápidos */}
          <div className="flex items-center space-x-2 overflow-x-auto pb-1 text-xs scrollbar-none flex-nowrap shrink-0">
            <span className="text-slate-500 font-bold uppercase text-[10px] pr-1 flex items-center gap-1 shrink-0">
              <Filter className="w-3 h-3" /> Filtrar:
            </span>
            <button
              onClick={() => setCategoryFilter('todos')}
              className={`px-3 py-1.5 rounded-xl font-bold transition shrink-0 whitespace-nowrap cursor-pointer ${
                categoryFilter === 'todos' ? 'bg-emerald-500 text-slate-950 shadow-md font-black' : 'bg-slate-900 text-slate-300 border border-slate-800 hover:bg-slate-800'
              }`}
            >
              Todas ({establishments.length})
            </button>
            <button
              onClick={() => setCategoryFilter('centro')}
              className={`px-3 py-1.5 rounded-xl font-bold transition shrink-0 whitespace-nowrap cursor-pointer ${
                categoryFilter === 'centro' ? 'bg-emerald-500 text-slate-950 shadow-md font-black' : 'bg-slate-900 text-slate-300 border border-slate-800 hover:bg-slate-800'
              }`}
            >
              Centro Histórico
            </button>
            <button
              onClick={() => setCategoryFilter('techados')}
              className={`px-3 py-1.5 rounded-xl font-bold transition shrink-0 whitespace-nowrap cursor-pointer ${
                categoryFilter === 'techados' ? 'bg-emerald-500 text-slate-950 shadow-md font-black' : 'bg-slate-900 text-slate-300 border border-slate-800 hover:bg-slate-800'
              }`}
            >
              Techadas
            </button>
            <button
              onClick={() => setCategoryFilter('economicos')}
              className={`px-3 py-1.5 rounded-xl font-bold transition shrink-0 whitespace-nowrap cursor-pointer ${
                categoryFilter === 'economicos' ? 'bg-emerald-500 text-slate-950 shadow-md font-black' : 'bg-slate-900 text-slate-300 border border-slate-800 hover:bg-slate-800'
              }`}
            >
              Económicas (≤ S/ 4.50)
            </button>
          </div>
        </div>

        {/* Mapa Interactivo con Leaflet y Marquee */}
        <AyacuchoMap
          parkings={filteredParkings}
          onSelectParking={(p) => {
            if (onSelectParking) onSelectParking(p);
          }}
        />

        {/* Grilla de Tarjetas de Cocheras con Navegación GPS */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-4">
          {filteredParkings.map((p) => {
            const elements = p.elements || [];
            const freeSlots = elements.filter(e => e.type === 'slot' && e.status === 'free').length;
            const totalCount = elements.filter(e => e.type === 'slot').length || p.totalSlots || 0;

            return (
              <Card key={p.id} className="overflow-hidden border-slate-800 bg-slate-900/90 shadow-xl hover:border-emerald-500/40 transition duration-300 flex flex-col justify-between rounded-3xl group">
                <div>
                  <div className="h-44 relative overflow-hidden bg-slate-950">
                    <img 
                      src={p.image || 'https://images.unsplash.com/photo-1506521781263-d8422e82f27a?w=800'} 
                      alt={p.name} 
                      className="w-full h-full object-cover group-hover:scale-105 transition duration-500 opacity-90 group-hover:opacity-100" 
                    />
                    <div className="absolute top-3 right-3 bg-slate-950/90 backdrop-blur-md px-3 py-1 rounded-xl text-xs font-black text-emerald-400 shadow-md border border-emerald-500/30 font-mono">
                      S/ {Number(p.rate).toFixed(2)}/h
                    </div>
                    <div className="absolute bottom-3 left-3 bg-slate-950/90 backdrop-blur-md text-emerald-400 px-3 py-1 rounded-xl text-xs font-bold font-mono border border-emerald-500/30">
                      {freeSlots} Libres de {totalCount}
                    </div>
                    <div className="absolute top-3 left-3 bg-slate-900/80 backdrop-blur-md text-slate-300 px-2.5 py-0.5 rounded-lg text-[10px] font-bold border border-slate-700">
                      {p.level}
                    </div>
                  </div>

                  <div className="p-5 space-y-3">
                    <div>
                      <h3 className="font-extrabold text-white text-base leading-tight">{p.name}</h3>
                      <p className="text-xs text-slate-400 flex items-center gap-1 mt-1">
                        <MapPin className="w-3.5 h-3.5 text-emerald-400 flex-shrink-0" /> 
                        <span className="truncate">{p.address} {p.reference ? `(${p.reference})` : ''}</span>
                      </p>
                    </div>

                    {/* WhatsApp */}
                    {p.whatsapp && (
                      <div className="flex items-center space-x-2 text-xs pt-0.5">
                        <a
                          href={`https://wa.me/${p.whatsapp.replace(/\D/g, '')}?text=Hola,%20solicito%20informaci%C3%B3n%20sobre%20el%20estacionamiento%20${encodeURIComponent(p.name)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-950/60 hover:bg-emerald-900/80 px-2.5 py-1 rounded-lg border border-emerald-500/30 transition"
                        >
                          <span>💬 WhatsApp</span>
                        </a>
                      </div>
                    )}
                  </div>
                </div>

                <div className="p-5 pt-0 space-y-2.5">
                  {/* Botones de Navegación GPS Rápida */}
                  <div className="flex items-center gap-2">
                    <a
                      href={`https://www.google.com/maps/dir/?api=1&destination=${p.latitude || -13.1604},${p.longitude || -74.2259}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 py-1.5 px-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1.5 transition border border-slate-700"
                      title="Abrir ruta en Google Maps"
                    >
                      <span>📍 Maps</span>
                    </a>
                    <a
                      href={`https://waze.com/ul?ll=${p.latitude || -13.1604},${p.longitude || -74.2259}&navigate=yes`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 py-1.5 px-2 bg-blue-950/80 hover:bg-blue-900 text-blue-300 rounded-xl text-[11px] font-bold flex items-center justify-center gap-1.5 border border-blue-800"
                      title="Abrir ruta en Waze"
                    >
                      <span>🚗 Waze</span>
                    </a>
                  </div>

                  <Button 
                    onClick={() => {
                      if (onSelectParking) onSelectParking(p);
                    }} 
                    className="w-full font-black gap-2 text-xs bg-emerald-500 hover:bg-emerald-400 text-slate-950 shadow-md cursor-pointer py-2.5 rounded-xl transition-all hover:scale-[1.01]"
                  >
                    <span>Ver Plano & Reservar</span>
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>

      </section>

      {/* =========================================================================
          6. CUADRÍCULA BENTO DE TECNOLOGÍA
          ========================================================================= */}
      <section id="tecnologia" className="py-16 sm:py-24 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto space-y-10">
        
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 font-mono block">
            ARQUITECTURA DE VANGUARDIA
          </span>
          <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
            Infraestructura Inteligente para Huamanga
          </h2>
        </div>

        {/* Bento Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          {/* Card 1: ANPR */}
          <div className="md:col-span-2 bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 text-white p-8 rounded-3xl border border-slate-800 shadow-2xl flex flex-col justify-between space-y-6 relative overflow-hidden">
            <div className="space-y-3 z-10 max-w-md">
              <div className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-xl bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-mono font-bold">
                <Camera className="w-3.5 h-3.5" />
                <span>IA & Visión Computacional</span>
              </div>
              <h3 className="text-2xl font-black tracking-tight text-white">
                Reconocimiento Automático de Placas (ANPR)
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Nuestras garitas cuentan con algoritmos de OCR que procesan placas peruanas a 60 FPS. Cero esperas para ingresar o salir.
              </p>
            </div>

            <div className="p-4 bg-slate-950/90 rounded-2xl border border-slate-800 flex items-center justify-between font-mono text-xs z-10">
              <div className="flex items-center space-x-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span className="text-slate-400">Detección Garita:</span>
                <strong className="text-emerald-400 font-bold">ABC-123</strong>
              </div>
              <span className="text-emerald-400 font-bold bg-emerald-950/60 px-2 py-0.5 rounded-lg border border-emerald-500/40">
                AUTORIZADO
              </span>
            </div>
          </div>

          {/* Card 2: Pase QR */}
          <div className="bg-slate-900/80 p-8 rounded-3xl border border-slate-800 shadow-xl flex flex-col justify-between space-y-6">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
                <QrCode className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-black text-white tracking-tight">
                Pase QR con Temporizador
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Pase digital de alta resolución con cuenta regresiva en vivo y compatible con modo offline en caso de baja cobertura.
              </p>
            </div>
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-center font-mono text-xs font-bold text-emerald-400">
              SPK-8912-7B2F9A
            </div>
          </div>

          {/* Card 3: Pasarelas de Pago */}
          <div className="bg-slate-900/80 p-8 rounded-3xl border border-slate-800 shadow-xl flex flex-col justify-between space-y-6">
            <div className="space-y-3">
              <div className="w-10 h-10 rounded-xl bg-blue-500/20 text-blue-400 flex items-center justify-center border border-blue-500/30">
                <CreditCard className="w-5 h-5" />
              </div>
              <h3 className="text-lg font-black text-white tracking-tight">
                Pagos con Culqi, Yape & Plin
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Paga de forma 100% segura con tus billeteras digitales favoritas y recibe tu comprobante electrónico de inmediato.
              </p>
            </div>
            <div className="flex items-center space-x-2 text-[11px] font-bold text-slate-300">
              <span className="px-2 py-1 bg-slate-950 rounded-lg border border-slate-800">Yape</span>
              <span className="px-2 py-1 bg-slate-950 rounded-lg border border-slate-800">Plin</span>
              <span className="px-2 py-1 bg-slate-950 rounded-lg border border-slate-800">Tarjetas</span>
            </div>
          </div>

          {/* Card 4: Seguridad */}
          <div className="md:col-span-2 bg-slate-900/80 p-8 rounded-3xl border border-slate-800 shadow-xl flex flex-col sm:flex-row items-center justify-between gap-6">
            <div className="space-y-3 max-w-md">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <h3 className="text-xl font-black text-white tracking-tight">
                Seguridad & Monitoreo 24 Horas
              </h3>
              <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                Todas las cocheras de la red cuentan con registro fotográfico de entradas y salidas, trazabilidad por auditoría y soporte ante incidentes.
              </p>
            </div>
            <div className="flex flex-col gap-2 w-full sm:w-auto">
              <div className="flex items-center space-x-2 text-xs font-bold text-slate-300 bg-slate-950 px-4 py-2 rounded-xl border border-slate-800">
                <Check className="w-4 h-4 text-emerald-400" />
                <span>Auditoría de garita en tiempo real</span>
              </div>
              <div className="flex items-center space-x-2 text-xs font-bold text-slate-300 bg-slate-950 px-4 py-2 rounded-xl border border-slate-800">
                <Check className="w-4 h-4 text-emerald-400" />
                <span>Tolerancia de cortesía garantizada</span>
              </div>
            </div>
          </div>

        </div>

      </section>

      {/* =========================================================================
          7. TESTIMONIOS MARQUEE EN HUAMANGA
          ========================================================================= */}
      <section className="py-16 bg-slate-900/50 border-y border-slate-800 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto space-y-10">
          
          <div className="text-center max-w-2xl mx-auto space-y-2">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 font-mono block">
              VALORACIONES REALES
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Lo que dicen los conductores en Ayacucho
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {testimonials.map((t, idx) => (
              <div key={idx} className="bg-slate-950 p-6 rounded-3xl border border-slate-800 shadow-xl space-y-4 flex flex-col justify-between">
                <div className="space-y-3">
                  <div className="flex items-center space-x-1 text-amber-400">
                    {[...Array(t.stars)].map((_, i) => (
                      <Star key={i} className="w-3.5 h-3.5 fill-current" />
                    ))}
                  </div>
                  <p className="text-xs sm:text-sm text-slate-300 leading-relaxed italic">
                    "{t.text}"
                  </p>
                </div>

                <div className="border-t border-slate-800/80 pt-3">
                  <h4 className="font-bold text-xs text-white">{t.name}</h4>
                  <p className="text-[10px] text-slate-500">{t.role} • {t.zone}</p>
                </div>
              </div>
            ))}
          </div>

        </div>
      </section>

      {/* =========================================================================
          8. SECCIÓN PARA DUEÑOS DE COCHERAS (B2B AFILIACIÓN)
          ========================================================================= */}
      <section id="afiliacion" className="py-16 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        <div className="bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 text-white rounded-3xl p-8 sm:p-12 shadow-2xl relative overflow-hidden border border-slate-800">
          
          <div className="max-w-2xl space-y-4 relative z-10">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400 font-mono block">
              PARA PROPIETARIOS DE ESTACIONAMIENTOS
            </span>
            <h2 className="text-2xl sm:text-4xl font-black text-white tracking-tight">
              ¿Tienes una cochera en Ayacucho? Digitaliza tu negocio hoy.
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Únete a la red Smart-Park. Te proporcionamos el plano digital 2D de tu cochera, la interfaz de garita, liquidación automática de pagos y miles de conductores que buscan dónde aparcar.
            </p>
            
            <div className="pt-2 flex flex-col sm:flex-row gap-3">
              <Button
                onClick={() => onOpenAuth && onOpenAuth('affiliation')}
                className="bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs h-11 px-6 rounded-xl shadow-lg cursor-pointer transition-all hover:scale-[1.02]"
              >
                <Building2 className="w-4 h-4 mr-2" />
                <span>Solicitar Afiliación Gratuita</span>
              </Button>
              <a
                href="https://wa.me/51966000000?text=Hola,%20tengo%20una%20cochera%20en%20Ayacucho%20y%20deseo%20afiliarme%20a%20Smart-Park"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center px-6 h-11 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs border border-slate-700 transition cursor-pointer"
              >
                <span>Hablar con un Asesor</span>
              </a>
            </div>
          </div>

        </div>
      </section>

      {/* =========================================================================
          9. PREGUNTAS FRECUENTES (FAQ)
          ========================================================================= */}
      <section className="py-16 bg-slate-950 border-t border-slate-800 px-4 sm:px-6 lg:px-8">
        <div className="max-w-4xl mx-auto space-y-8">
          <div className="text-center space-y-2">
            <h2 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Preguntas Frecuentes
            </h2>
            <p className="text-xs sm:text-sm text-slate-400">
              Todo lo que necesitas saber antes de tu primera reserva.
            </p>
          </div>

          <div className="space-y-3">
            {faqs.map((faq, idx) => (
              <div 
                key={idx}
                className="border border-slate-800 rounded-2xl overflow-hidden transition bg-slate-900/60"
              >
                <button
                  onClick={() => setActiveFaq(activeFaq === idx ? null : idx)}
                  className="w-full p-4.5 text-left font-bold text-xs sm:text-sm text-white flex items-center justify-between hover:bg-slate-900 cursor-pointer"
                >
                  <span>{faq.q}</span>
                  <span className="text-emerald-400 font-mono text-base">{activeFaq === idx ? '−' : '+'}</span>
                </button>
                {activeFaq === idx && (
                  <div className="p-4.5 bg-slate-950 border-t border-slate-800 text-xs sm:text-sm text-slate-400 leading-relaxed animate-in fade-in">
                    {faq.a}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* =========================================================================
          10. FOOTER CORPORATIVO
          ========================================================================= */}
      <footer className="bg-slate-950 text-white py-12 px-4 sm:px-6 lg:px-8 border-t border-slate-800">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 text-xs text-slate-400">
          <div className="flex items-center space-x-3">
            <div className="w-8 h-8 rounded-xl bg-slate-900 text-emerald-400 flex items-center justify-center font-bold border border-slate-800 shadow-md">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className="w-4 h-4">
                <path d="M9 17V7h4a3 3 0 0 1 0 6H9" />
                <circle cx="12" cy="12" r="10" />
              </svg>
            </div>
            <div>
              <span className="font-extrabold text-white tracking-tight font-tech">SMART-PARK AYACUCHO</span>
              <p className="text-[10px] text-slate-500">© 2026 Smart-Park Inc. Red de Estacionamientos Inteligentes.</p>
            </div>
          </div>

          <div className="flex items-center space-x-6">
            <button
              onClick={onOpenTerms}
              className="hover:text-emerald-400 transition underline cursor-pointer"
            >
              Términos Legales & Condiciones
            </button>
            <a
              href="https://wa.me/51966000000"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-emerald-400 transition"
            >
              Soporte WhatsApp
            </a>
          </div>
        </div>
      </footer>

    </div>
  );
};
