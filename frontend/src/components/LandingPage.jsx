import React, { useState, useMemo } from 'react';
import { motion, useScroll, useSpring, AnimatePresence } from 'framer-motion';
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
  Globe
} from 'lucide-react';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { AyacuchoMap } from './AyacuchoMap';

// Variantes de animación atómicas (HyperFrames motion rules)
const FLUID_EASE = [0.16, 1, 0.3, 1]; // Curva de desaceleración natural

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1
    }
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.6,
      ease: FLUID_EASE
    }
  }
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

  // Barra de progreso de lectura fluida
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 140,
    damping: 30,
    restDelta: 0.001
  });

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
    <div className="min-h-screen bg-[#FBFBFA] text-[#191919] font-sans antialiased selection:bg-[#EAEAEA] selection:text-black">
      
      {/* Indicador de progreso con física elástica */}
      <motion.div 
        className="fixed top-0 left-0 right-0 h-[2px] bg-[#111111] z-[100] origin-left"
        style={{ scaleX }}
      />

      {/* =========================================================================
          1. HEADER EDITORIAL MINIMALISTA
          ========================================================================= */}
      <header className="sticky top-0 z-50 bg-[#FBFBFA]/90 backdrop-blur-md border-b border-[#EAEAEA] px-6 lg:px-12 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          
          {/* Logo y Denominación */}
          <div className="flex items-center space-x-3">
            <div className="w-7 h-7 rounded-md bg-[#111111] text-white flex items-center justify-center font-bold text-xs">
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
            <a href="#mapa" className="hover:text-[#111111] transition-colors">Directorio de Cocheras</a>
            <a href="#sistema" className="hover:text-[#111111] transition-colors">Funcionamiento</a>
            <a href="#infraestructura" className="hover:text-[#111111] transition-colors">Infraestructura</a>
            <a href="#afiliacion" className="hover:text-[#111111] transition-colors">Propietarios</a>
          </nav>

          {/* Acciones */}
          <div className="flex items-center space-x-3">
            <button
              onClick={() => onOpenAuth && onOpenAuth('affiliation')}
              className="hidden sm:inline-flex text-xs font-medium text-[#787774] hover:text-[#111111] px-3 py-1.5 transition cursor-pointer"
            >
              Afiliar Cochera
            </button>

            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={() => onOpenAuth && onOpenAuth('login')}
              className="bg-[#111111] hover:bg-[#333333] text-white text-xs font-medium px-4 py-2 rounded-md transition cursor-pointer flex items-center space-x-2 shadow-xs"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Acceder al Sistema</span>
            </motion.button>
          </div>

        </div>
      </header>

      {/* =========================================================================
          2. HERO SECTION CON COREOGRAFÍA HYPERFRAMES
          ========================================================================= */}
      <motion.section 
        initial="hidden"
        animate="visible"
        variants={containerVariants}
        className="pt-24 pb-20 px-6 lg:px-12 max-w-6xl mx-auto space-y-12"
      >
        
        <div className="max-w-4xl space-y-6">
          
          <motion.div 
            variants={itemVariants}
            className="inline-flex items-center space-x-2 px-2.5 py-1 bg-[#EDF3EC] text-[#346538] rounded-md text-xs font-mono font-medium border border-[#DCE8DB]"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#346538] animate-pulse" />
            <span>{totalFreeSlots} plazas disponibles en tiempo real en Huamanga</span>
          </motion.div>

          <motion.h1 
            variants={itemVariants}
            className="text-4xl sm:text-6xl lg:text-7xl font-extrabold tracking-tight text-[#111111] leading-[1.08]"
          >
            La infraestructura de estacionamiento para Ayacucho.
          </motion.h1>

          <motion.p 
            variants={itemVariants}
            className="text-base sm:text-lg text-[#555555] max-w-2xl font-normal leading-relaxed"
          >
            Consulte la disponibilidad en tiempo real, seleccione su plaza en el plano topográfico 2D del estacionamiento y acceda mediante reconocimiento de placa ANPR.
          </motion.p>

          <motion.div 
            variants={itemVariants}
            className="pt-2 flex flex-col sm:flex-row items-center gap-3"
          >
            <motion.a
              whileTap={{ scale: 0.98 }}
              href="#mapa"
              className="w-full sm:w-auto px-6 py-3 bg-[#111111] hover:bg-[#2B2B2B] text-white text-xs font-medium rounded-md transition flex items-center justify-center space-x-2 cursor-pointer shadow-xs"
            >
              <span>Consultar Mapa en Vivo</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </motion.a>

            <button
              onClick={() => onOpenAuth && onOpenAuth('affiliation')}
              className="w-full sm:w-auto px-5 py-3 bg-white hover:bg-[#F0F0EF] text-[#111111] text-xs font-medium rounded-md border border-[#EAEAEA] transition cursor-pointer"
            >
              Afiliar Establecimiento
            </button>
          </motion.div>

        </div>

        {/* Métricas de Precisión */}
        <motion.div 
          variants={itemVariants}
          className="grid grid-cols-2 md:grid-cols-4 gap-6 pt-8 border-t border-[#EAEAEA]"
        >
          <div className="space-y-1">
            <span className="font-mono text-2xl font-bold text-[#111111] block">
              {establishments.length}
            </span>
            <span className="text-xs text-[#787774] font-medium block">Cocheras conectadas</span>
          </div>

          <div className="space-y-1">
            <span className="font-mono text-2xl font-bold text-[#346538] block">
              {totalFreeSlots}
            </span>
            <span className="text-xs text-[#787774] font-medium block">Plazas libres ahora</span>
          </div>

          <div className="space-y-1">
            <span className="font-mono text-2xl font-bold text-[#111111] block">
              &lt; 0.2s
            </span>
            <span className="text-xs text-[#787774] font-medium block">Lectura de placa ANPR</span>
          </div>

          <div className="space-y-1">
            <span className="font-mono text-2xl font-bold text-[#111111] block">
              S/ 4.00
            </span>
            <span className="text-xs text-[#787774] font-medium block">Tarifa base promedio</span>
          </div>
        </motion.div>

      </motion.section>

      {/* =========================================================================
          3. MOCKUP DE VENTANA FAUX-OS (Document Style)
          ========================================================================= */}
      <section id="sistema" className="py-16 px-6 lg:px-12 max-w-6xl mx-auto space-y-8">
        
        <div className="max-w-2xl space-y-2">
          <span className="text-xs font-mono text-[#787774] uppercase tracking-wider block">
            ARQUITECTURA DE ACCESO
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold text-[#111111] tracking-tight">
            Interacción directa sin aplicaciones intermedias
          </h2>
          <p className="text-xs sm:text-sm text-[#787774]">
            La plataforma opera mediante interfaz web ligera optimizada para cualquier navegador móvil.
          </p>
        </div>

        {/* Contenedor Faux-OS Window Chrome */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.6, ease: FLUID_EASE }}
          className="rounded-xl border border-[#EAEAEA] bg-white shadow-xs overflow-hidden"
        >
          
          {/* Barra superior de ventana */}
          <div className="px-4 py-3 bg-[#F7F6F3] border-b border-[#EAEAEA] flex items-center justify-between">
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
          <div className="p-6 sm:p-10 grid grid-cols-1 md:grid-cols-3 gap-8 items-center bg-white">
            
            <div className="space-y-6 md:col-span-1 border-r border-[#EAEAEA] md:pr-6">
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
            <div className="md:col-span-2 bg-[#FBFBFA] p-6 rounded-lg border border-[#EAEAEA] space-y-4">
              
              <div className="flex items-center justify-between border-b border-[#EAEAEA] pb-3">
                <div>
                  <h4 className="font-bold text-sm text-[#111111]">Smart Park Plaza Mayor</h4>
                  <p className="text-xs text-[#787774] font-mono">Jr. 28 de Julio 142 • Huamanga</p>
                </div>
                <span className="px-2.5 py-1 rounded bg-[#EDF3EC] text-[#346538] font-mono text-xs font-semibold">
                  AUTORIZADO
                </span>
              </div>

              <div className="grid grid-cols-3 gap-3 font-mono text-xs">
                <div className="p-3 bg-white rounded border border-[#EAEAEA]">
                  <span className="text-[10px] text-[#787774] block uppercase">Plaza</span>
                  <strong className="text-sm text-[#111111] block mt-0.5">A-01</strong>
                </div>
                <div className="p-3 bg-white rounded border border-[#EAEAEA]">
                  <span className="text-[10px] text-[#787774] block uppercase">Vehículo</span>
                  <strong className="text-sm text-[#111111] block mt-0.5">ABC-123</strong>
                </div>
                <div className="p-3 bg-white rounded border border-[#EAEAEA]">
                  <span className="text-[10px] text-[#787774] block uppercase">Tolerancia</span>
                  <strong className="text-sm text-[#346538] block mt-0.5">15 min</strong>
                </div>
              </div>

              <div className="flex items-center justify-between text-xs text-[#787774] pt-2 border-t border-[#EAEAEA] font-mono">
                <span>Token: SPK-8912-7B2F9A</span>
                <span>Visión Computacional 60 FPS</span>
              </div>

            </div>

          </div>

        </motion.div>

      </section>

      {/* =========================================================================
          4. DIRECTORIO Y MAPA EN TIEMPO REAL
          ========================================================================= */}
      <section id="mapa" className="py-16 px-6 lg:px-12 max-w-6xl mx-auto space-y-8">
        
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div className="space-y-1">
            <span className="text-xs font-mono text-[#787774] uppercase tracking-wider block">
              COBERTURA URBANA
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-[#111111] tracking-tight">
              Estacionamientos en Huamanga
            </h2>
            <p className="text-xs sm:text-sm text-[#787774]">
              Tarifas por hora, capacidad de plazas y ruteo directo.
            </p>
          </div>

          {/* Filtros */}
          <div className="flex items-center space-x-2 overflow-x-auto pb-1 text-xs">
            <button
              onClick={() => setCategoryFilter('todos')}
              className={`px-3 py-1.5 rounded-md font-medium transition cursor-pointer border ${
                categoryFilter === 'todos'
                  ? 'bg-[#111111] text-white border-[#111111]'
                  : 'bg-white text-[#787774] hover:text-[#111111] border-[#EAEAEA]'
              }`}
            >
              Todos ({establishments.length})
            </button>
            <button
              onClick={() => setCategoryFilter('centro')}
              className={`px-3 py-1.5 rounded-md font-medium transition cursor-pointer border ${
                categoryFilter === 'centro'
                  ? 'bg-[#111111] text-white border-[#111111]'
                  : 'bg-white text-[#787774] hover:text-[#111111] border-[#EAEAEA]'
              }`}
            >
              Centro Histórico
            </button>
            <button
              onClick={() => setCategoryFilter('techados')}
              className={`px-3 py-1.5 rounded-md font-medium transition cursor-pointer border ${
                categoryFilter === 'techados'
                  ? 'bg-[#111111] text-white border-[#111111]'
                  : 'bg-white text-[#787774] hover:text-[#111111] border-[#EAEAEA]'
              }`}
            >
              Techados
            </button>
            <button
              onClick={() => setCategoryFilter('economicos')}
              className={`px-3 py-1.5 rounded-md font-medium transition cursor-pointer border ${
                categoryFilter === 'economicos'
                  ? 'bg-[#111111] text-white border-[#111111]'
                  : 'bg-white text-[#787774] hover:text-[#111111] border-[#EAEAEA]'
              }`}
            >
              Económicos (≤ S/ 4.50)
            </button>
          </div>
        </div>

        {/* Mapa Leaflet */}
        <div className="rounded-xl border border-[#EAEAEA] overflow-hidden shadow-xs bg-white">
          <AyacuchoMap
            parkings={filteredParkings}
            onSelectParking={(p) => {
              if (onSelectParking) onSelectParking(p);
            }}
          />
        </div>

        {/* Grilla de Cocheras con Estilo Documental */}
        <motion.div 
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: '-40px' }}
          variants={containerVariants}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-4"
        >
          {filteredParkings.map((p) => {
            const elements = p.elements || [];
            const freeSlots = elements.filter(e => e.type === 'slot' && e.status === 'free').length;
            const totalCount = elements.filter(e => e.type === 'slot').length || p.totalSlots || 0;

            return (
              <motion.div 
                key={p.id} 
                variants={itemVariants}
                whileHover={{ y: -3, transition: { duration: 0.2, ease: FLUID_EASE } }}
                className="bg-white rounded-xl border border-[#EAEAEA] p-5 flex flex-col justify-between shadow-xs hover:border-[#D4D4D4] transition-colors"
              >
                <div className="space-y-3">
                  <div className="h-36 rounded-lg overflow-hidden relative bg-[#F7F6F3]">
                    <img 
                      src={p.image || 'https://images.unsplash.com/photo-1506521781263-d8422e82f27a?w=800'} 
                      alt={p.name} 
                      className="w-full h-full object-cover" 
                    />
                    <div className="absolute top-2.5 right-2.5 bg-white/95 px-2.5 py-1 rounded text-xs font-mono font-bold text-[#111111] border border-[#EAEAEA] shadow-xs">
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

                  <div className="flex items-center justify-between text-xs font-mono text-[#787774] pt-2 border-t border-[#EAEAEA]">
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
                      className="flex-1 py-1.5 px-3 bg-[#FBFBFA] hover:bg-[#F0F0EF] text-[#111111] rounded text-xs font-medium text-center border border-[#EAEAEA] transition"
                    >
                      Google Maps
                    </a>
                    <a
                      href={`https://waze.com/ul?ll=${p.latitude || -13.1604},${p.longitude || -74.2259}&navigate=yes`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex-1 py-1.5 px-3 bg-[#FBFBFA] hover:bg-[#F0F0EF] text-[#111111] rounded text-xs font-medium text-center border border-[#EAEAEA] transition"
                    >
                      Waze
                    </a>
                  </div>

                  <motion.button
                    whileTap={{ scale: 0.98 }}
                    onClick={() => {
                      if (onSelectParking) onSelectParking(p);
                    }}
                    className="w-full py-2 bg-[#111111] hover:bg-[#2B2B2B] text-white text-xs font-medium rounded transition flex items-center justify-center space-x-1.5 cursor-pointer shadow-xs"
                  >
                    <span>Ver Plano & Reservar</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </motion.button>
                </div>

              </motion.div>
            );
          })}
        </motion.div>

      </section>

      {/* =========================================================================
          5. BENTO GRID DE ESPECIFICACIONES TÉCNICAS
          ========================================================================= */}
      <section id="infraestructura" className="py-16 px-6 lg:px-12 max-w-6xl mx-auto space-y-8">
        
        <div className="max-w-2xl space-y-2">
          <span className="text-xs font-mono text-[#787774] uppercase tracking-wider block">
            ESPECIFICACIÓN TÉCNICA
          </span>
          <h2 className="text-2xl sm:text-3xl font-bold text-[#111111] tracking-tight">
            Módulos del Sistema Operativo
          </h2>
        </div>

        {/* Bento Grid Editorial */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          
          <div className="md:col-span-2 bg-white p-8 rounded-xl border border-[#EAEAEA] space-y-6 flex flex-col justify-between shadow-xs">
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
            <div className="p-3 bg-[#FBFBFA] rounded border border-[#EAEAEA] font-mono text-xs text-[#787774] flex justify-between">
              <span>Tiempo de detección:</span>
              <strong className="text-[#111111]">&lt; 180 ms</strong>
            </div>
          </div>

          <div className="bg-white p-8 rounded-xl border border-[#EAEAEA] space-y-6 flex flex-col justify-between shadow-xs">
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
            <div className="p-3 bg-[#FBFBFA] rounded border border-[#EAEAEA] font-mono text-xs text-[#787774] text-center">
              Protocolo Zero-Paper
            </div>
          </div>

          <div className="bg-white p-8 rounded-xl border border-[#EAEAEA] space-y-6 flex flex-col justify-between shadow-xs">
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
            <div className="p-3 bg-[#FBFBFA] rounded border border-[#EAEAEA] font-mono text-xs text-[#787774] text-center">
              Yape • Plin • Culqi
            </div>
          </div>

          <div className="md:col-span-2 bg-white p-8 rounded-xl border border-[#EAEAEA] space-y-6 flex flex-col sm:flex-row items-center justify-between gap-6 shadow-xs">
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
              <div className="p-2.5 bg-[#FBFBFA] rounded border border-[#EAEAEA]">
                Auditoría horaria continua
              </div>
              <div className="p-2.5 bg-[#FBFBFA] rounded border border-[#EAEAEA]">
                Registro de eventos en vivo
              </div>
            </div>
          </div>

        </div>

      </section>

      {/* =========================================================================
          6. SECCIÓN PROPIETARIOS DE ESTACIONAMIENTOS
          ========================================================================= */}
      <section id="afiliacion" className="py-16 px-6 lg:px-12 max-w-6xl mx-auto">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-40px' }}
          transition={{ duration: 0.6, ease: FLUID_EASE }}
          className="bg-[#111111] text-white rounded-xl p-8 sm:p-12 space-y-6 flex flex-col md:flex-row items-center justify-between gap-8"
        >
          
          <div className="max-w-xl space-y-3">
            <span className="text-xs font-mono text-[#A3A3A3] uppercase tracking-wider block">
              RED DE COCHERAS EN HUAMANGA
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">
              Digitalice la operación de su cochera
            </h2>
            <p className="text-xs sm:text-sm text-[#A3A3A3] leading-relaxed">
              Integramos el plano 2D interactivo, el sistema de lectura de placas en garita y conectamos su inmueble con conductores de la ciudad.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto shrink-0">
            <motion.button
              whileTap={{ scale: 0.98 }}
              onClick={() => onOpenAuth && onOpenAuth('affiliation')}
              className="px-5 py-2.5 bg-white hover:bg-[#EAEAEA] text-[#111111] text-xs font-medium rounded transition cursor-pointer shadow-xs"
            >
              Solicitar Afiliación
            </motion.button>
            <a
              href="https://wa.me/51966000000?text=Hola,%20deseo%20afiliar%20mi%20cochera%20en%20Ayacucho"
              target="_blank"
              rel="noopener noreferrer"
              className="px-5 py-2.5 bg-[#222222] hover:bg-[#333333] text-white text-xs font-medium rounded border border-[#333333] transition text-center"
            >
              Contacto Directo
            </a>
          </div>

        </motion.div>
      </section>

      {/* =========================================================================
          7. PREGUNTAS FRECUENTES (FAQ)
          ========================================================================= */}
      <section className="py-16 px-6 lg:px-12 max-w-4xl mx-auto space-y-8">
        
        <div className="space-y-1">
          <span className="text-xs font-mono text-[#787774] uppercase tracking-wider block">
            SOPORTE Y CONSULTAS
          </span>
          <h2 className="text-2xl font-bold text-[#111111] tracking-tight">
            Preguntas Frecuentes
          </h2>
        </div>

        <div className="divide-y divide-[#EAEAEA] border-y border-[#EAEAEA]">
          {faqs.map((faq, idx) => (
            <div key={idx} className="py-4">
              <button
                onClick={() => setActiveFaq(activeFaq === idx ? null : idx)}
                className="w-full text-left font-medium text-xs sm:text-sm text-[#111111] flex items-center justify-between hover:text-[#555555] cursor-pointer"
              >
                <span>{faq.q}</span>
                <span className="font-mono text-base text-[#787774]">
                  {activeFaq === idx ? '−' : '+'}
                </span>
              </button>
              {activeFaq === idx && (
                <div className="pt-3 text-xs sm:text-sm text-[#555555] leading-relaxed">
                  {faq.a}
                </div>
              )}
            </div>
          ))}
        </div>

      </section>

      {/* =========================================================================
          8. FOOTER DOCUMENTAL
          ========================================================================= */}
      <footer className="bg-white border-t border-[#EAEAEA] py-12 px-6 lg:px-12 text-xs text-[#787774]">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center space-x-3">
            <div className="w-6 h-6 rounded bg-[#111111] text-white flex items-center justify-center font-bold text-[10px]">
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
              className="hover:text-[#111111] transition underline cursor-pointer"
            >
              Términos de Servicio
            </button>
            <a
              href="https://wa.me/51966000000"
              target="_blank"
              rel="noopener noreferrer"
              className="hover:text-[#111111] transition"
            >
              Soporte WhatsApp
            </a>
          </div>
        </div>
      </footer>

    </div>
  );
};
