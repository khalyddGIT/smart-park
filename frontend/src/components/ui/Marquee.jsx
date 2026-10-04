import React from 'react';

/**
 * Marquee - Componente de carrusel continuo infinito estilo React Bits
 * Desplaza elementos en un bucle horizontal suave con desvanecimiento en los extremos
 * y pausa opcional al pasar el cursor.
 */
export const Marquee = ({
  children,
  speed = 35, // segundos por ciclo completo
  pauseOnHover = true,
  direction = 'left',
  className = '',
}) => {
  return (
    <div
      className={`relative w-full overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_10%,black_90%,transparent)] ${className}`}
    >
      <div
        className={`flex w-max items-center gap-10 sm:gap-14 animate-marquee ${
          pauseOnHover ? 'hover:[animation-play-state:paused]' : ''
        }`}
        style={{
          animationDuration: `${speed}s`,
          animationDirection: direction === 'right' ? 'reverse' : 'normal',
        }}
      >
        {/* Primera copia */}
        <div className="flex items-center gap-10 sm:gap-14 shrink-0">
          {children}
        </div>
        {/* Segunda copia para bucle continuo transparente */}
        <div className="flex items-center gap-10 sm:gap-14 shrink-0" aria-hidden="true">
          {children}
        </div>
        {/* Tercera copia para pantallas ultra-anchas */}
        <div className="flex items-center gap-10 sm:gap-14 shrink-0" aria-hidden="true">
          {children}
        </div>
      </div>
    </div>
  );
};

export default Marquee;
