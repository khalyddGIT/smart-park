import React from 'react';
import logoImg from '../assets/logo.png';

/**
 * Isotipo oficial de Smart-Park
 * Pin de geolocalización verde con órbita y silueta de vehículo
 */
export const BrandIcon = ({ className = 'h-8 w-8', alt = 'Smart-Park' }) => (
  <img
    src={logoImg}
    alt={alt}
    className={`aspect-square object-contain shrink-0 select-none drop-shadow-xs ${className}`}
    draggable={false}
  />
);

/**
 * Logotipo oficial de Smart-Park
 * Combina el isotipo oficial con la tipografía corporativa 'Smart Park'
 */
export const BrandLogo = ({ 
  className = 'h-8 sm:h-9 w-auto', 
  iconClassName = '',
  textClassName = '',
  showText = true,
  iconOnly = false,
  dark = null,
  onClick = null
}) => {
  const parkColorClass = dark === true 
    ? 'text-white' 
    : dark === false 
    ? 'text-slate-900' 
    : 'text-slate-900 dark:text-white';

  return (
    <div 
      onClick={onClick}
      className={`inline-flex items-center gap-2 select-none bg-transparent ${onClick ? 'cursor-pointer' : ''}`}
    >
      {/* Isotipo Oficial */}
      <img
        src={logoImg}
        alt="Smart-Park"
        className={`${className} aspect-square object-contain shrink-0 drop-shadow-xs ${iconClassName}`}
        draggable={false}
      />

      {/* Tipografía Oficial */}
      {showText && !iconOnly && (
        <span className={`font-sans tracking-tight leading-none text-lg sm:text-xl font-extrabold flex items-baseline ${textClassName}`}>
          <span className="text-emerald-500 font-bold">Smart</span>
          <span className={`ml-1 font-black transition-colors ${parkColorClass}`}>
            Park
          </span>
        </span>
      )}
    </div>
  );
};

export default BrandLogo;

