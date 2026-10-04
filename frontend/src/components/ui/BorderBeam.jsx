import React from 'react';

/**
 * BorderBeam - Componente de React Bits / Magic UI
 * Proyecta un haz de luz suave y continuo que recorre el perímetro de la tarjeta.
 * Acelerado por GPU y totalmente limpio, sin elementos externos.
 */
export const BorderBeam = ({
  className = '',
  size = 220,
  duration = 14,
  borderWidth = 1.5,
  colorFrom = '#10b981',
  colorTo = '#06b6d4',
  delay = 0,
}) => {
  return (
    <div
      aria-hidden="true"
      style={{
        '--size': `${size}px`,
        '--duration': `${duration}s`,
        '--delay': `-${delay}s`,
        '--color-from': colorFrom,
        '--color-to': colorTo,
        '--border-width': `${borderWidth}px`,
      }}
      className={`pointer-events-none absolute inset-0 rounded-[inherit] [border:calc(var(--border-width))*1px_solid_transparent] ![mask-clip:padding-box,border-box] ![mask-composite:intersect] [mask:linear-gradient(transparent,transparent),linear-gradient(white,white)] after:absolute after:aspect-square after:w-[calc(var(--size))] after:animate-border-beam after:[animation-delay:var(--delay)] after:[animation-duration:var(--duration)] after:[background:linear-gradient(to_left,var(--color-from),var(--color-to),transparent)] after:[offset-anchor:calc(var(--size)/2)_50%] after:[offset-path:rect(0_auto_auto_0_round_calc(var(--size)))] ${className}`}
    />
  );
};

export default BorderBeam;
