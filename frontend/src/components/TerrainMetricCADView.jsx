import React, { useState } from 'react';
import { 
  MapPin, 
  Layers, 
  Grid, 
  Plus, 
  Trash2, 
  Sparkles, 
  Compass, 
  Ruler, 
  Maximize2, 
  CheckCircle2, 
  AlertTriangle,
  Zap,
  Sliders,
  Car,
  Building,
  Navigation,
  Accessibility,
  Bike
} from 'lucide-react';

import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Input } from './ui/input';

export const TerrainMetricCADView = ({ slots, onSlotsChange, parkingLocation = "Ayacucho - Centro Histórico" }) => {
  // Dimensiones del Lote en Metros Reales (Escala 1:1)
  const [lotLength, setLotLength] = useState(36); // 36 metros de largo
  const [lotWidth, setLotWidth] = useState(24);   // 24 metros de ancho
  const [satelliteBg, setSatelliteBg] = useState(true);
  const [selectedElementId, setSelectedElementId] = useState(null);
  const [message, setMessage] = useState('');

  // 1 metro = 20 píxeles en el lienzo de ingeniería
  const SCALE = 20; 

  const totalAreaM2 = lotLength * lotWidth;
  const totalStalls = slots.length;
  const pmrCount = slots.filter(s => s.slotType === 'pmr').length;
  const pmrRatio = totalStalls > 0 ? (pmrCount / totalStalls) * 100 : 0;
  const pmrCompliant = pmrCount >= Math.max(1, Math.ceil(totalStalls * 0.04));

  // Área ocupada por cajones (aprox 12.5 m² por cajón de auto)
  const stallsAreaM2 = totalStalls * 12.5;
  const drivewayAreaM2 = Math.max(0, totalAreaM2 - stallsAreaM2);
  const efficiency = totalAreaM2 > 0 ? Math.min(100, Math.round((stallsAreaM2 / totalAreaM2) * 100)) : 0;

  // 🪄 ASISTENTE INTELIGENTE: Auto-distribución matemática de capacidad
  const handleAutoCalculateCapacity = () => {
    // Cálculo de cajones normativos (2.5m de ancho x 5.0m de largo)
    // Carril central de 6.0m de rodadura
    const stallWidthM = 2.5;
    const stallLengthM = 5.0;
    const drivewayM = 6.0;

    const slotsPerRow = Math.floor((lotLength - 6) / stallWidthM); // margen de 6m para accesos
    const newSlots = [];
    let counter = 1;

    // Fila Superior (Norte)
    for (let i = 0; i < slotsPerRow; i++) {
      const isPmr = counter === 1;
      const isEv = counter === 2;
      const slotType = isPmr ? 'pmr' : isEv ? 'ev' : 'auto';

      newSlots.push({
        id: Date.now() + counter,
        code: isPmr ? `PMR-01` : isEv ? `EV-01` : `A-0${counter}`,
        slotType,
        x: (3 + i * stallWidthM) * SCALE,
        y: 2 * SCALE,
        w: (isPmr ? 3.8 : stallWidthM) * SCALE,
        h: stallLengthM * SCALE,
        rot: 0,
        status: counter % 3 === 0 ? 'occupied' : 'free',
        plate: counter % 3 === 0 ? `AYC-${100 + counter}` : null
      });
      counter++;
    }

    // Fila Inferior (Sur)
    for (let i = 0; i < slotsPerRow; i++) {
      newSlots.push({
        id: Date.now() + counter,
        code: `B-0${i + 1}`,
        slotType: 'auto',
        x: (3 + i * stallWidthM) * SCALE,
        y: (lotWidth - stallLengthM - 2) * SCALE,
        w: stallWidthM * SCALE,
        h: stallLengthM * SCALE,
        rot: 0,
        status: counter % 2 === 0 ? 'occupied' : 'free',
        plate: counter % 2 === 0 ? `W1P-${200 + counter}` : null
      });
      counter++;
    }

    onSlotsChange(newSlots);
    setMessage(`Auto-Cálculo Exitoso: Se han distribuido ${newSlots.length} plazas normativas optimizando el lote de ${totalAreaM2} m².`);
    setTimeout(() => setMessage(''), 4500);

  };

  // Agregar Cajón Individual a Escala
  const handleAddMetricSlot = (type = 'auto') => {
    const widthM = type === 'pmr' ? 3.8 : type === 'moto' ? 1.2 : 2.5;
    const lengthM = type === 'moto' ? 2.5 : 5.0;
    const count = slots.length + 1;

    const newSlot = {
      id: Date.now(),
      code: type === 'pmr' ? `PMR-0${count}` : type === 'moto' ? `M-0${count}` : `N-0${count}`,
      slotType: type,
      x: 4 * SCALE,
      y: 4 * SCALE,
      w: widthM * SCALE,
      h: lengthM * SCALE,
      rot: 0,
      status: 'free'
    };

    onSlotsChange([...slots, newSlot]);
    setSelectedElementId(newSlot.id);
  };

  return (
    <div className="space-y-6">
      {/* ENCABEZADO DE INGENIERÍA Y CONTROL DE TERRENO */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">

        <div>
          <h2 className="text-xl font-black text-slate-900">Diseño Métrico a Escala (1:1)</h2>
          <p className="text-xs text-slate-500">Distribución con escala métrica (Cajón 2.50m × 5.00m, Carril 6.00m).</p>
        </div>


        {/* Parámetros del Terreno en Metros */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center space-x-2 bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-2xl">
            <Ruler className="w-4 h-4 text-emerald-600" />
            <div className="text-xs font-bold text-slate-700">
              <span>Largo: </span>
              <input 
                type="number" 
                value={lotLength} 
                onChange={(e) => setLotLength(Math.max(15, parseInt(e.target.value) || 15))}
                className="w-12 bg-white border border-slate-300 rounded-md text-center font-mono font-black text-xs px-1"
              />
              <span className="text-slate-400"> m</span>
            </div>
            <span className="text-slate-300">×</span>
            <div className="text-xs font-bold text-slate-700">
              <span>Ancho: </span>
              <input 
                type="number" 
                value={lotWidth} 
                onChange={(e) => setLotWidth(Math.max(12, parseInt(e.target.value) || 12))}
                className="w-12 bg-white border border-slate-300 rounded-md text-center font-mono font-black text-xs px-1"
              />
              <span className="text-slate-400"> m</span>
            </div>
          </div>

          <Button 
            onClick={handleAutoCalculateCapacity}
            className="bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs gap-1.5 shadow-md shadow-emerald-600/20"
          >
            <Sparkles className="w-4 h-4" />
            <span>Auto-Calcular Capacidad Óptima</span>
          </Button>

          <Button 
            variant="outline" 
            onClick={() => setSatelliteBg(!satelliteBg)} 
            className="text-xs font-bold gap-1.5"
          >
            <Layers className="w-4 h-4 text-cyan-600" />
            <span>{satelliteBg ? 'Ocultar Satélite' : 'Ver Satélite'}</span>
          </Button>
        </div>
      </div>

      {message && (
        <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl text-emerald-800 text-xs font-bold shadow-sm animate-in fade-in">
          {message}
        </div>
      )}

      {/* BARRA DE INSERCIÓN DE ELEMENTOS ARQUITECTÓNICOS A ESCALA */}
      <div className="flex flex-wrap items-center gap-2 bg-white p-3 rounded-2xl border border-slate-200 shadow-sm">
        <span className="text-[10px] font-black uppercase tracking-wider text-slate-400 px-2">Agregar a Escala:</span>
        <Button onClick={() => handleAddMetricSlot('auto')} variant="outline" size="sm" className="font-bold text-xs gap-1">
          <Car className="w-3.5 h-3.5 text-emerald-600" /> Cajón Auto (2.5m × 5.0m)
        </Button>
        <Button onClick={() => handleAddMetricSlot('pmr')} variant="outline" size="sm" className="font-bold text-xs gap-1">
          <Accessibility className="w-3.5 h-3.5 text-blue-600" /> Plaza PMR (3.8m × 5.0m)
        </Button>
        <Button onClick={() => handleAddMetricSlot('moto')} variant="outline" size="sm" className="font-bold text-xs gap-1">
          <Bike className="w-3.5 h-3.5 text-amber-600" /> Moto (1.2m × 2.5m)
        </Button>
        <Button onClick={() => handleAddMetricSlot('ev')} variant="outline" size="sm" className="font-bold text-xs gap-1">
          <Zap className="w-3.5 h-3.5 text-teal-600" /> Carga EV (2.5m × 5.0m)
        </Button>
      </div>


      {/* LIENZO DE GEODISEÑO SATELITAL A ESCALA MÉTRICA */}
      <div className="relative w-full min-h-[580px] bg-slate-900 rounded-3xl overflow-auto border-4 border-slate-800 shadow-2xl p-8 flex items-center justify-center">

        {/* Capa de Fondo Satelital Fotogramétrico */}
        {satelliteBg && (
          <div 
            className="absolute inset-0 bg-cover bg-center opacity-35 filter contrast-125 saturate-150 pointer-events-none"
            style={{
              backgroundImage: `url('https://images.unsplash.com/photo-1524813686514-a57563d77d46?w=1600')`
            }}
          />
        )}

        {/* LOTE FÍSICO DELIMITADO (POLÍGONO MÉTRICO) */}
        <div 
          style={{
            width: `${lotLength * SCALE}px`,
            height: `${lotWidth * SCALE}px`,
          }}
          className="relative bg-[#1c222d]/95 backdrop-blur-md rounded-2xl border-4 border-amber-400 shadow-[0_20px_50px_rgba(0,0,0,0.8)] overflow-hidden"
        >
          {/* Reglas de Acotación Métricas (Ejes X e Y con marcas cada 5 metros) */}
          <div className="absolute top-0 left-0 right-0 h-6 bg-slate-800/90 border-b border-slate-700 flex items-center justify-between px-3 text-[9px] font-mono text-amber-400 font-bold pointer-events-none">
            <span>0m (Linde Oeste)</span>
            <span>{lotLength / 2}m (Eje Central)</span>
            <span>{lotLength}m (Linde Este)</span>
          </div>

          <div className="absolute top-6 bottom-0 left-0 w-6 bg-slate-800/90 border-r border-slate-700 flex flex-col items-center justify-between py-3 text-[9px] font-mono text-amber-400 font-bold pointer-events-none">
            <span>0m</span>
            <span>{lotWidth / 2}m</span>
            <span>{lotWidth}m</span>
          </div>

          {/* Cuadrícula de 1 metro × 1 metro */}
          <div 
            style={{ backgroundSize: `${SCALE}px ${SCALE}px` }}
            className="absolute inset-6 bg-[linear-gradient(to_right,#334155_1px,transparent_1px),linear-gradient(to_bottom,#334155_1px,transparent_1px)] opacity-40 pointer-events-none"
          />

          {/* Carril de Circulación y Maniobra (6 metros reglamentarios) */}
          <div 
            style={{
              top: `${(lotWidth / 2 - 3) * SCALE}px`,
              height: `${6 * SCALE}px`,
            }}
            className="absolute left-6 right-0 bg-[#252c3b] border-y-2 border-dashed border-amber-400/50 flex items-center justify-around px-6 pointer-events-none"
          >
            <div className="text-[11px] font-mono font-black text-amber-400/80 flex items-center gap-2">
              <Navigation className="w-4 h-4 rotate-90" />
              <span>CARRIL DE RODADURA Y MANIOBRA (ANCHO NORMATIVO: 6.00 m)</span>
              <Navigation className="w-4 h-4 rotate-90" />
            </div>
          </div>

          {/* RENDERIZADO DE CAJONES MÉTRICOS */}
          <div className="absolute inset-0">
            {slots.map((slot) => {
              const isSelected = slot.id === selectedElementId;
              const isFree = slot.status === 'free';
              const isPMR = slot.slotType === 'pmr';
              const isEV = slot.slotType === 'ev';
              const isMoto = slot.slotType === 'moto';

              return (
                <div
                  key={slot.id}
                  onClick={() => setSelectedElementId(slot.id)}
                  style={{
                    left: `${slot.x}px`,
                    top: `${slot.y}px`,
                    width: `${slot.w}px`,
                    height: `${slot.h}px`,
                    transform: `rotate(${slot.rot || 0}deg)`
                  }}
                  className={`absolute border-2 rounded-lg cursor-pointer transition-all flex flex-col justify-between p-1.5 select-none ${
                    isSelected ? 'ring-4 ring-cyan-400 border-cyan-400 z-30' : 'z-10'
                  } ${
                    isPMR 
                      ? 'border-blue-500 bg-blue-950/60 text-blue-200' 
                      : isEV
                      ? 'border-emerald-500 bg-emerald-950/60 text-emerald-200'
                      : isMoto
                      ? 'border-amber-500 bg-amber-950/60 text-amber-200'
                      : isFree
                      ? 'border-emerald-400/80 bg-emerald-900/30 text-emerald-100 hover:bg-emerald-800/40'
                      : 'border-rose-400/80 bg-rose-950/50 text-rose-200'
                  }`}
                >
                  <div className="flex items-center justify-between text-[9px] font-mono font-black">
                    <span>{slot.code}</span>
                    <span>{(slot.w / SCALE).toFixed(1)}m × {(slot.h / SCALE).toFixed(1)}m</span>
                  </div>

                  <div className="text-center text-[10px] font-black">
                    {isPMR && 'Preferencial'}
                    {isEV && 'Punto Carga EV'}
                    {isMoto && 'Espacio Moto'}
                    {!isPMR && !isEV && !isMoto && (isFree ? 'LIBRE' : 'OCUPADO')}
                  </div>



                  <div className="w-full h-1 bg-white/40 rounded-xs" />
                </div>
              );
            })}
          </div>

          {/* Garita y Portón de Acceso */}
          <div 
            style={{ top: `${(lotWidth / 2 - 2) * SCALE}px`, left: '6px' }}
            className="absolute w-12 h-14 bg-slate-900 border-2 border-emerald-400 rounded-r-lg z-20 flex flex-col items-center justify-center text-[8px] font-mono font-black text-emerald-300 shadow-xl"
          >
            <span>ACCESO</span>
            <span className="text-[7px] text-white">GARITA</span>
          </div>
        </div>
      </div>

      {/* AUDITORÍA TÉCNICA Y NORMATIVA URBANÍSTICA (HUD) */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">Área Total del Lote</p>
          <p className="text-2xl font-black text-slate-900 mt-1">{totalAreaM2} m²</p>
          <p className="text-[10px] text-slate-500 font-mono mt-0.5">{lotLength}m largo × {lotWidth}m ancho</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">Eficiencia Espacial</p>
          <div className="flex items-baseline space-x-2 mt-1">
            <span className="text-2xl font-black text-emerald-600">{efficiency}%</span>
            <span className="text-[10px] text-slate-500 font-mono">({stallsAreaM2} m² útiles)</span>
          </div>
          <div className="w-full bg-slate-100 h-1.5 rounded-full mt-1.5 overflow-hidden">
            <div style={{ width: `${efficiency}%` }} className="bg-emerald-500 h-full rounded-full" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">Normativa PMR (Accesibilidad)</p>
          <div className="flex items-center space-x-2 mt-1">
            {pmrCompliant ? (
              <span className="flex items-center gap-1 font-bold text-xs text-emerald-600">
                <CheckCircle2 className="w-3.5 h-3.5" /> Cumple ({pmrCount} plazas)
              </span>
            ) : (
              <span className="flex items-center gap-1 font-bold text-xs text-rose-600">
                <AlertTriangle className="w-3.5 h-3.5" /> Requiere {Math.max(1, Math.ceil(totalStalls * 0.04))} PMR
              </span>
            )}
          </div>
          <p className="text-[10px] text-slate-500 mt-1 font-mono">Mínimo 4% de capacidad para PMR</p>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
          <p className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider">Capacidad Diseñada</p>
          <p className="text-2xl font-black text-slate-900 mt-1">{totalStalls} Plazas</p>
          <p className="text-[10px] text-slate-500 font-mono mt-0.5">Potencial: S/ {(totalStalls * 5.0 * 12).toFixed(2)} / día</p>
        </div>
      </div>
    </div>
  );
};
