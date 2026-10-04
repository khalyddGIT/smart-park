import React, { useRef, useState, useEffect } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';

/**
 * TiltedCard - Componente de React Bits
 * Añade una inclinación física 3D refinada y un reflejo de luz sutil (glare)
 * perfecto para tickets digitales, pases QR y tarjetas destacadas.
 */
export const TiltedCard = ({
  children,
  className = '',
  maxTilt = 6,
  scale = 1.02,
  glare = true,
}) => {
  const cardRef = useRef(null);
  const [isTouchDevice, setIsTouchDevice] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    setIsTouchDevice('ontouchstart' in window || navigator.maxTouchPoints > 0);
  }, []);

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  // Físicas suaves de resorte
  const springConfig = { stiffness: 280, damping: 26 };
  const rotateX = useSpring(useTransform(mouseY, [-0.5, 0.5], [maxTilt, -maxTilt]), springConfig);
  const rotateY = useSpring(useTransform(mouseX, [-0.5, 0.5], [-maxTilt, maxTilt]), springConfig);
  const cardScale = useSpring(isHovered ? scale : 1, springConfig);

  const [glarePosition, setGlarePosition] = useState({ x: 50, y: 50 });

  const handleMouseMove = (e) => {
    if (isTouchDevice || !cardRef.current) return;
    const rect = cardRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;

    mouseX.set(x);
    mouseY.set(y);

    if (glare) {
      setGlarePosition({
        x: ((e.clientX - rect.left) / rect.width) * 100,
        y: ((e.clientY - rect.top) / rect.height) * 100,
      });
    }
  };

  const handleMouseEnter = () => {
    if (!isTouchDevice) setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    mouseX.set(0);
    mouseY.set(0);
  };

  if (isTouchDevice) {
    return <div className={className}>{children}</div>;
  }

  return (
    <div style={{ perspective: 1000 }} className="inline-block w-full">
      <motion.div
        ref={cardRef}
        onMouseMove={handleMouseMove}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        style={{
          rotateX,
          rotateY,
          scale: cardScale,
          transformStyle: 'preserve-3d',
        }}
        className={`relative will-change-transform ${className}`}
      >
        {children}

        {/* Reflejo Glare discreto y elegante */}
        {glare && isHovered && (
          <div
            className="pointer-events-none absolute inset-0 rounded-[inherit] z-30 transition-opacity duration-300"
            style={{
              background: `radial-gradient(circle 240px at ${glarePosition.x}% ${glarePosition.y}%, rgba(255, 255, 255, 0.08), transparent 70%)`,
            }}
          />
        )}
      </motion.div>
    </div>
  );
};

export default TiltedCard;
