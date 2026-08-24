import React from 'react';

/**
 * Logotipo tipográfico oficial de Smart-Park
 * SVG Wordmark: 'Smart' (#009688) + 'Park' (#0B2545 / #FFFFFF)
 */
export const BrandLogo = ({ 
  className = 'h-8 sm:h-9 w-auto', 
  dark = false,
  subtitle = 'AYACUCHO',
  showSubtitle = true 
}) => {
  const parkColor = dark ? '#FFFFFF' : '#0B2545';

  return (
    <div className="flex items-center space-x-2 shrink-0 select-none">
      <div className="flex flex-col justify-center">
        <svg 
          viewBox="0 0 340 70" 
          className={className} 
          style={{ width: 'auto', display: 'block' }}
          fill="none" 
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Wordmark puramente tipográfico: Smart Park */}
          <text 
            x="10" 
            y="48" 
            dominantBaseline="auto"
            fontFamily="'Plus Jakarta Sans', 'Inter', 'Montserrat', 'Poppins', system-ui, -apple-system, sans-serif" 
            fontSize="46" 
            letterSpacing="-0.5px"
          >
            <tspan fill="#009688" fontWeight="700">Smart</tspan>
            <tspan dx="8" fill={parkColor} fontWeight="800">Park</tspan>
          </text>
        </svg>

        {showSubtitle && subtitle && (
          <span 
            className={`text-[9px] font-mono font-bold tracking-widest pl-2.5 -mt-1 leading-none ${
              dark ? 'text-emerald-400' : 'text-emerald-700'
            }`}
          >
            {subtitle}
          </span>
        )}
      </div>
    </div>
  );
};
