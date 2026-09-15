import React from 'react';
import logoImg from '../assets/logo.png';

/**
 * Isotipo oficial de Smart-Park
 * Pin de geolocalización verde con órbita y silueta de vehículo.
 * Soporta modo con cápsula/badge de alto contraste y glow.
 */
export const BrandIcon = ({ 
  className = 'w-7 h-7 sm:w-8 sm:h-8', 
  withBadge = false, 
  badgeClassName = '',
  alt = 'Smart-Park' 
}) => {
  if (withBadge) {
    return (
      <div className={`relative flex items-center justify-center shrink-0 rounded-xl sm:rounded-2xl p-1 bg-white shadow-md shadow-emerald-950/25 ring-2 ring-emerald-400/60 ${badgeClassName}`}>
        <img
          src={logoImg}
          alt={alt}
          className={`aspect-square object-contain shrink-0 select-none ${className}`}
          draggable={false}
        />
      </div>
    );
  }
  return (
    <img
      src={logoImg}
      alt={alt}
      className={`aspect-square object-contain shrink-0 select-none drop-shadow-sm ${className}`}
      draggable={false}
    />
  );
};

/**
 * Logotipo oficial de Smart-Park
 * Diseño de alto impacto: cápsula blanca pura de máximo contraste, resplandor esmeralda y tipografía bold
 */
export const BrandLogo = ({ 
  className = '', 
  iconSize = 'w-8 h-8 sm:w-9 sm:h-9',
  iconClassName = '',
  textClassName = '',
  showText = true,
  iconOnly = false,
  withBadge = false,
  dark = null,
  onClick = null
}) => {
  // Ajuste de contraste para el texto 'Park'
  const parkColorClass = dark === true 
    ? 'text-white' 
    : dark === false 
    ? 'text-slate-900' 
    : 'text-slate-900 dark:text-white';

  // Ajuste de contraste para el texto 'Smart'
  const smartColorClass = dark === true
    ? 'text-emerald-400'
    : dark === false
    ? 'text-emerald-600'
    : 'text-emerald-600 dark:text-emerald-400';

  return (
    <div 
      onClick={onClick}
      className={`inline-flex items-center gap-2.5 select-none bg-transparent group ${onClick ? 'cursor-pointer' : ''} ${className}`}
    >
      {/* Contenedor del Isotipo */}
      {withBadge ? (
        <div className="relative flex items-center justify-center shrink-0">
          <div className="relative rounded-xl p-1 bg-white shadow-md ring-1 ring-slate-200/80 flex items-center justify-center">
            <img
              src={logoImg}
              alt="Smart-Park"
              className={`${iconSize} aspect-square object-contain shrink-0 ${iconClassName}`}
              draggable={false}
            />
          </div>
        </div>
      ) : (
        <img
          src={logoImg}
          alt="Smart-Park"
          className={`${iconSize} aspect-square object-contain shrink-0 select-none drop-shadow-sm transition-transform duration-200 group-hover:scale-105 ${iconClassName}`}
          draggable={false}
        />
      )}

      {/* Tipografía Oficial 'Smart Park' */}
      {showText && !iconOnly && (
        <span className={`font-sans tracking-tight leading-none text-xl sm:text-2xl font-black flex items-baseline ${textClassName}`}>
          <span className={`transition-colors font-extrabold ${smartColorClass}`}>
            Smart
          </span>
          <span className={`ml-1 font-black transition-colors ${parkColorClass}`}>
            Park
          </span>
        </span>
      )}
    </div>
  );
};

export default BrandLogo;


