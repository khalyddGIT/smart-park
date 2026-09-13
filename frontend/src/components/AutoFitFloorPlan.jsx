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
  allowInspectAll = false,
  containerHeightClass = 'h-[460px] sm:h-[540px] md:h-[620px]'
}) => {
  const containerRef = useRef(null);
  const [scale, setScale] = useState(0.5);
  const safeElements = Array.isArray(elements) ? elements : [];

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
          {safeElements.length === 0 ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-center p-6 text-slate-400">
              <div className="w-12 h-12 rounded-xl bg-slate-800/80 border border-slate-700 flex items-center justify-center mb-2">
                <div className="w-7 h-7 rounded-lg bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 font-mono font-black text-sm flex items-center justify-center">
                  P
                </div>
              </div>
              <p className="text-xs font-bold text-slate-300">Cargando distribución del plano...</p>
              <p className="text-[11px] text-slate-500 mt-0.5">Sincronizando cajones en vivo</p>
            </div>
          ) : (
            safeElements.map((el) => {
              if (el.type === 'slot') {
                const status = el.status || 'free';
                const isFree = status === 'free';
                const isReserved = status === 'reserved';
                const isOut = status === 'out_of_service' || status === 'disabled';
                const isOccupied = !isFree && !isReserved && !isOut;
                const isSel = selectedSlot === el.code;
                const canClick = selectable && (isFree || allowInspectAll);

                let slotClass = '';
                if (isSel) {
                  slotClass = 'bg-cyan-500 text-white border-cyan-200 z-30 shadow-xl ring-4 ring-cyan-400/60 scale-105';
                } else if (isFree) {
                  slotClass = `bg-emerald-950/60 text-emerald-300 border-emerald-500/70 hover:bg-emerald-900/80 hover:border-emerald-400 hover:scale-105 z-10 ${canClick ? 'cursor-pointer' : ''}`;
                } else if (isReserved) {
                  slotClass = `bg-amber-950/60 text-amber-300 border-amber-500/70 hover:border-amber-300 opacity-95 z-10 ${canClick ? 'cursor-pointer hover:scale-105' : 'cursor-not-allowed'}`;
                } else if (isOut) {
                  slotClass = `bg-slate-900/80 text-slate-500 border-slate-700/60 opacity-60 z-0 ${canClick ? 'cursor-pointer' : 'cursor-not-allowed'}`;
                } else {
                  slotClass = `bg-rose-950/75 text-rose-300 border-rose-600/70 hover:border-rose-400 opacity-90 z-10 ${canClick ? 'cursor-pointer hover:scale-105' : 'cursor-not-allowed'}`;
                }

                return (
                  <button
                    type="button"
                    key={el.code || el.id}
                    disabled={!canClick}
                    onClick={() => canClick && onSelectSlot && onSelectSlot(el.code, el)}
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
                    {!isSel && (
                      <span className="text-[8px] font-bold mt-0.5 tracking-tight">
                        {isFree ? 'LIBRE' : isReserved ? 'RESERV.' : isOut ? 'FUERA' : 'OCUPADO'}
                      </span>
                    )}
                    {isSel && (
                      <span className="text-[8px] font-black mt-0.5 tracking-tight bg-cyan-900/80 px-1 rounded text-cyan-200">
                        VER FICHA
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
          })
        )}
        </div>
      </div>
    </div>
  );
};
