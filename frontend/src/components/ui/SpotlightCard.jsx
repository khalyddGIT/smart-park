import React, { useRef, useState, useCallback } from 'react';

/**
 * SpotlightCard - Componente de React Bits adaptado para Smart Park
 * Proporciona un sutil efecto de luz radial que sigue el cursor del mouse,
 * evocando la estética refinada de interfaces tipo Linear o Stripe sin saturación visual.
 */
export const SpotlightCard = ({
  children,
  className = '',
  spotlightColor = 'rgba(16, 185, 129, 0.12)',
  ...props
}) => {
  const divRef = useRef(null);
  const [isFocused, setIsFocused] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const [opacity, setOpacity] = useState(0);

  const handleMouseMove = useCallback((e) => {
    if (!divRef.current || isFocused) return;
    const rect = divRef.current.getBoundingClientRect();
    setPosition({ x: e.clientX - rect.left, y: e.clientY - rect.top });
  }, [isFocused]);

  const handleFocus = () => {
    setIsFocused(true);
    setOpacity(0.7);
  };

  const handleBlur = () => {
    setIsFocused(false);
    setOpacity(0);
  };

  const handleMouseEnter = () => {
    setOpacity(1);
  };

  const handleMouseLeave = () => {
    setOpacity(0);
  };

  return (
    <div
      ref={divRef}
      onMouseMove={handleMouseMove}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`relative rounded-3xl border border-slate-200/80 dark:border-slate-800 bg-white dark:bg-slate-900/90 overflow-hidden transition-colors ${className}`}
      {...props}
    >
      {/* Capa de iluminación interactiva */}
      <div
        className="pointer-events-none absolute -inset-px opacity-0 transition-opacity duration-300 z-10"
        style={{
          opacity,
          background: `radial-gradient(450px circle at ${position.x}px ${position.y}px, ${spotlightColor}, transparent 80%)`,
        }}
      />
      {/* Contenido */}
      <div className="relative z-20 h-full w-full">
        {children}
      </div>
    </div>
  );
};

export default SpotlightCard;
