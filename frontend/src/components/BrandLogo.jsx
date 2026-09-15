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
  iconSize = 'w-7 h-7 sm:w-8 sm:h-8',
  iconClassName = '',
  textClassName = '',
  showText = true,
  iconOnly = false,
  withBadge = true,
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
      className={`inline-flex items-center gap-2.5 sm:gap-3 select-none bg-transparent group ${onClick ? 'cursor-pointer' : ''} ${className}`}
    >
      {/* Contenedor Cápsula Resaltante del Isotipo */}
      {withBadge ? (
        <div className="relative flex items-center justify-center shrink-0">
          {/* Resplandor ambiental para fondos oscuros */}
          <div className="absolute -inset-1 rounded-2xl bg-emerald-400/30 blur-xs opacity-75 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
          
          {/* Cápsula de máximo contraste en blanco puro */}
          <div className="relative rounded-xl sm:rounded-2xl p-1 sm:p-1.5 bg-white shadow-md shadow-black/30 ring-2 ring-emerald-400/80 group-hover:scale-105 group-hover:ring-emerald-300 transition-all duration-300 flex items-center justify-center">
            <img
              src={logoImg}
              alt="Smart-Park"
              className={`${iconSize} aspect-square object-contain shrink-0 drop-shadow-xs ${iconClassName}`}
              draggable={false}
            />
          </div>
        </div>
      ) : (
        <img
          src={logoImg}
          alt="Smart-Park"
          className={`${iconSize} aspect-square object-contain shrink-0 drop-shadow-md ${iconClassName}`}
          draggable={false}
        />
      )}

      {/* Tipografía Oficial de Alto Impacto */}
      {showText && !iconOnly && (
        <span className={`font-sans tracking-tight leading-none text-xl sm:text-2xl font-black flex items-baseline drop-shadow-xs ${textClassName}`}>
          <span className={`transition-colors font-extrabold ${smartColorClass}`}>
            Smart
          </span>
          <span className={`ml-1 font-black transition-colors ${parkColorClass}`}>
            Park
          </span>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 ml-1.5 inline-block shadow-[0_0_8px_#34d399] animate-pulse" />
        </span>
      )}
    </div>
  );
};

export default BrandLogo;


