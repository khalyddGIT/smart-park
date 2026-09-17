import React, { useRef } from 'react';
import gsap from 'gsap';
import { useGSAP } from '@gsap/react';
import logoImg from '../assets/logo.png';

// Registrar plugin useGSAP oficialmente
gsap.registerPlugin(useGSAP);

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
  const iconRef = useRef(null);

  if (withBadge) {
    return (
      <div className={`relative flex items-center justify-center shrink-0 rounded-xl sm:rounded-2xl p-1 bg-white shadow-md shadow-emerald-950/25 ring-2 ring-emerald-400/60 ${badgeClassName}`}>
        <img
          ref={iconRef}
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
      ref={iconRef}
      src={logoImg}
      alt={alt}
      className={`aspect-square object-contain shrink-0 select-none drop-shadow-sm ${className}`}
      draggable={false}
    />
  );
};

/**
 * Logotipo oficial de Smart-Park con animaciones GSAP
 * Microinteracciones elásticas aceleradas por hardware en hover y entrada suave
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
  const containerRef = useRef(null);
  const iconRef = useRef(null);

  // Colores dinámicos de texto
  const parkColorClass = dark === true 
    ? 'text-white' 
    : dark === false 
    ? 'text-slate-900' 
    : 'text-slate-900 dark:text-white';

  const smartColorClass = dark === true
    ? 'text-emerald-400'
    : dark === false
    ? 'text-emerald-600'
    : 'text-emerald-600 dark:text-emerald-400';

  // Animaciones y microinteracciones GSAP
  const { contextSafe } = useGSAP({ scope: containerRef });

  const handleMouseEnter = contextSafe(() => {
    if (iconRef.current) {
      gsap.to(iconRef.current, {
        scale: 1.14,
        rotation: -5,
        duration: 0.35,
        ease: 'back.out(2)',
        overwrite: 'auto'
      });
    }
    gsap.to('.brand-smart', { y: -2, duration: 0.22, ease: 'power2.out', overwrite: 'auto' });
    gsap.to('.brand-park', { y: -2, duration: 0.22, delay: 0.04, ease: 'power2.out', overwrite: 'auto' });
  });

  const handleMouseLeave = contextSafe(() => {
    if (iconRef.current) {
      gsap.to(iconRef.current, {
        scale: 1,
        rotation: 0,
        duration: 0.3,
        ease: 'power2.out',
        overwrite: 'auto'
      });
    }
    gsap.to(['.brand-smart', '.brand-park'], { y: 0, duration: 0.25, ease: 'power2.out', overwrite: 'auto' });
  });

  return (
    <div 
      ref={containerRef}
      onClick={onClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`inline-flex items-center gap-2.5 select-none bg-transparent group ${onClick ? 'cursor-pointer' : ''} ${className}`}
    >
      {/* Contenedor del Isotipo */}
      {withBadge ? (
        <div className="relative flex items-center justify-center shrink-0">
          <div className="relative rounded-xl p-1 bg-white shadow-md ring-1 ring-slate-200/80 flex items-center justify-center">
            <img
              ref={iconRef}
              src={logoImg}
              alt="Smart-Park"
              className={`${iconSize} aspect-square object-contain shrink-0 ${iconClassName}`}
              draggable={false}
            />
          </div>
        </div>
      ) : (
        <img
          ref={iconRef}
          src={logoImg}
          alt="Smart-Park"
          className={`${iconSize} aspect-square object-contain shrink-0 select-none drop-shadow-sm will-change-transform ${iconClassName}`}
          draggable={false}
        />
      )}

      {/* Tipografía Oficial 'Smart Park' */}
      {showText && !iconOnly && (
        <span className={`font-sans tracking-tight leading-none text-xl sm:text-2xl font-black flex items-baseline ${textClassName}`}>
          <span className={`brand-smart inline-block transition-colors font-extrabold will-change-transform ${smartColorClass}`}>
            Smart
          </span>
          <span className={`brand-park inline-block ml-1 font-black transition-colors will-change-transform ${parkColorClass}`}>
            Park
          </span>
        </span>
      )}
    </div>
  );
};

export default BrandLogo;


