import React from 'react';

/**
 * Logotipo oficial de Smart-Park
 * Exclusivamente el SVG Wordmark (Sin textos adicionales alrededor)
 */
export const BrandLogo = ({ 
  className = 'h-8 sm:h-9 w-auto', 
  dark = null 
}) => {
  return (
    <div className="flex items-center shrink-0 select-none bg-transparent">
      <svg 
        viewBox="0 0 500 120" 
        className={className} 
        style={{ width: 'auto', display: 'block' }}
        fill="none" 
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Wordmark puramente tipográfico: Smart Park */}
        <text 
          x="250" 
          y="72" 
          textAnchor="middle" 
          dominantBaseline="middle"
          fontFamily="'Plus Jakarta Sans', 'Inter', 'Montserrat', 'Poppins', system-ui, -apple-system, sans-serif" 
          fontSize="52" 
          letterSpacing="-0.5px"
        >
          <tspan fill="#10B981" fontWeight="700">Smart</tspan>
          <tspan 
            dx="12" 
            fill={dark === true ? '#FFFFFF' : dark === false ? '#0B2545' : 'currentColor'} 
            className={dark === null ? 'text-slate-900 dark:text-white fill-current' : ''} 
            fontWeight="800"
          >
            Park
          </tspan>
        </text>
      </svg>
    </div>
  );
};
