import React, { useRef, useState, useEffect } from 'react';

/**
 * Componente de plano CAD auto-escalable y responsivo para Smart-Park.
 * Escala dinámicamente el lienzo de 1100x700px para llenar completamente el contenedor
 * manteniendo la relación de aspecto sin distorsión y sin desperdiciar espacio.
 */
export const AutoFitFloorPlan = ({
  elements = [],
  name = 'Plano de Cochera',
  selectable = false,
  selectedSlot = null,
  onSelectSlot = null,
  containerHeightClass = 'h-[460px] sm:h-[540px] md:h-[620px]'
}) => {
  const containerRef = useRef(null);
  const [scale, setScale] = useState(0.5);

  useEffect(() => {
    if (!containerRef.current) return;
    
    const updateScale = () => {
      if (!containerRef.current) return;
      const { clientWidth, clientHeight } = containerRef.current;
      if (clientWidth > 0 && clientHeight > 0) {
        // Escala óptima calculada dinámicamente con margen de seguridad del 96%
        const scaleX = (clientWidth * 0.96) / 1100;
        const scaleY = (clientHeight * 0.96) / 700;
        const fitScale = Math.min(scaleX, scaleY);
        setScale(Math.max(0.2, fitScale));
      }
    };

    updateScale();

    const observer = new ResizeObserver(() => updateScale());
    observer.observe(containerRef.current);
    
    window.addEventListener('resize', updateScale);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateScale);
    };
  }, []);

  return (
    <div className={`relative bg-[#1c253b] rounded-2xl border-2 border-slate-700/80 overflow-hidden p-2 sm:p-4 w-full ${containerHeightClass} flex items-center justify-center shadow-xl`}>
      <div 
        ref={containerRef} 
        className="w-full h-full relative flex items-center justify-center overflow-hidden rounded-xl bg-[#243048] border border-slate-700/60"
      >
        <div 
          style={{
            width: 1100,
            height: 700,
            transform: `scale(${scale})`,
            transformOrigin: 'center center',
          }} 
          className="relative bg-[#2a3752] shadow-2xl rounded-2xl shrink-0 transition-transform duration-200 ease-out border border-slate-600/50"
        >
          {elements.map((el) => {
            if (el.type === 'slot') {
              const status = el.status || 'free';
              const isFree = status === 'free';
              const isReserved = status === 'reserved';
              const isOut = status === 'out_of_service' || status === 'disabled';
              const isOccupied = !isFree && !isReserved && !isOut;
              const isSel = selectedSlot === el.code;

              let slotClass = '';
              if (isSel) {
                slotClass = 'bg-emerald-500 text-white border-emerald-300 z-30 shadow-lg ring-2 ring-emerald-400/50 scale-105';
              } else if (isFree) {
                slotClass = 'bg-emerald-950/60 text-emerald-300 border-emerald-500/70 hover:bg-emerald-900/80 hover:border-emerald-400 hover:scale-105 cursor-pointer z-10';
              } else if (isReserved) {
                slotClass = 'bg-amber-950/60 text-amber-300 border-amber-500/70 opacity-90 cursor-not-allowed z-0';
              } else if (isOut) {
                slotClass = 'bg-slate-900/80 text-slate-500 border-slate-700/60 opacity-60 cursor-not-allowed z-0';
              } else {
                slotClass = 'bg-rose-950/70 text-rose-300 border-rose-600/60 opacity-80 cursor-not-allowed z-0';
              }

              return (
                <button
                  type="button"
                  key={el.code || el.id}
                  disabled={!selectable || !isFree}
                  onClick={() => selectable && isFree && onSelectSlot && onSelectSlot(el.code)}
                  style={{
                    left: el.x,
                    top: el.y,
                    width: el.w || 60,
                    height: el.h || 100,
                    transform: el.rot ? `rotate(${el.rot}deg)` : undefined
                  }}
                  className={`absolute rounded-xl border-2 flex flex-col items-center justify-center font-mono transition-all duration-150 p-1 ${slotClass}`}
                >
                  <span className="text-xs font-black">{el.code}</span>
                  {!isFree && !isSel && (
                    <span className="text-[8px] font-bold mt-0.5 tracking-tight">
                      {isReserved ? 'RESERV.' : isOut ? 'FUERA' : 'OCUPADO'}
                    </span>
                  )}
                </button>
              );
            }
            if (el.type === 'wall') {
              return (
                <div 
                  key={el.id} 
                  style={{ left: el.x, top: el.y, width: el.w, height: el.h }} 
                  className="absolute bg-slate-600 border border-slate-500 rounded-sm shadow-md"
                />
              );
            }
            if (el.type === 'road') {
              return (
                <div 
                  key={el.id} 
                  style={{ left: el.x, top: el.y, width: el.w, height: el.h }} 
                  className="absolute bg-slate-800/90 border-y border-dashed border-amber-400/40 flex items-center justify-center text-[10px] font-semibold text-amber-300/80 shadow-inner tracking-wider"
                >
                  Circulación
                </div>
              );
            }
            if (el.type === 'gate') {
              return (
                <div 
                  key={el.id} 
                  style={{ left: el.x, top: el.y, width: el.w, height: el.h }} 
                  className="absolute bg-emerald-950/90 border border-emerald-400 rounded-xl flex items-center justify-center text-[10px] font-bold text-emerald-300 shadow-md"
                >
                  Garita
                </div>
              );
            }
            return null;
          })}
        </div>
      </div>
    </div>
  );
};
