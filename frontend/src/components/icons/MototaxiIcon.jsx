import React from 'react';

/**
 * Icono de Mototaxi / Torito / Trimóvil estilo Lucide
 * Diseñado en rejilla 24x24 con trazo de 2px, esquinas redondeadas
 * y silueta fiel al clásico mototaxi peruano (Bajaj RE / TVS King).
 */
export const MototaxiIcon = ({ className = "w-4 h-4", ...props }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    {...props}
  >
    {/* Rueda delantera */}
    <circle cx="5" cy="18" r="2.5" />
    {/* Rueda trasera */}
    <circle cx="18" cy="18" r="2.5" />
    {/* Silueta exterior de cabina, techo y frontal */}
    <path d="M19 15.5V8a2 2 0 0 0-2-2H9.5L5 12v3.5" />
    {/* Poste delantero del parabrisas */}
    <path d="M9.5 6L6 12" />
    {/* Cabina / ventanilla de pasajeros */}
    <path d="M10 7.5h6.5v5H10z" />
    {/* Manillar de conducción */}
    <path d="M5 12h3" />
    {/* Chasis inferior */}
    <path d="M7.5 18h8" />
  </svg>
);

export default MototaxiIcon;
