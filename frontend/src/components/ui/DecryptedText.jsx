import React, { useEffect, useState, useRef } from 'react';
import { useInView } from 'framer-motion';

/**
 * DecryptedText - Componente de tipografía tecnológica de React Bits
 * Produce un sutil efecto de desencriptado al hacer hover o al entrar en el viewport.
 * Ideal para matrículas vehiculares, códigos de reserva y referencias técnicas.
 */
export const DecryptedText = ({
  text = '',
  speed = 40,
  maxIterations = 8,
  characters = 'ABCDEFGHJKLMNPQRSTUVWXYZ0123456789',
  className = '',
  animateOn = 'hover', // 'hover' | 'view'
}) => {
  const [displayText, setDisplayText] = useState(text);
  const [isHovering, setIsHovering] = useState(false);
  const containerRef = useRef(null);
  const isInView = useInView(containerRef, { once: false, margin: '-20px' });
  const intervalRef = useRef(null);

  const startScramble = () => {
    let iteration = 0;
    clearInterval(intervalRef.current);

    intervalRef.current = setInterval(() => {
      setDisplayText(() =>
        text
          .split('')
          .map((char, index) => {
            if (char === ' ' || char === '-' || char === '#') return char;
            if (index < iteration) return text[index];
            return characters[Math.floor(Math.random() * characters.length)];
          })
          .join('')
      );

      if (iteration >= text.length) {
        clearInterval(intervalRef.current);
      }
      iteration += 1 / (maxIterations / text.length);
    }, speed);
  };

  useEffect(() => {
    if (animateOn === 'view' && isInView) {
      startScramble();
    }
    return () => clearInterval(intervalRef.current);
  }, [isInView, animateOn, text]);

  const handleMouseEnter = () => {
    setIsHovering(true);
    startScramble();
  };

  const handleMouseLeave = () => {
    setIsHovering(false);
  };

  return (
    <span
      ref={containerRef}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      className={`font-mono select-none cursor-default inline-block ${className}`}
    >
      {displayText}
    </span>
  );
};

export default DecryptedText;
