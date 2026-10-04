import React from 'react';
import { motion } from 'framer-motion';

/**
 * AmbientGlow - Fondo ambiental sedoso estilo Apple / Linear (React Bits)
 * Reemplaza patrones geométricos o de puntos por orbes de luz difusos gigantes
 * que respiran y derivan orgánicamente a 60 FPS con aceleración por GPU.
 */
export const AmbientGlow = ({ className = '' }) => {
  return (
    <div
      aria-hidden="true"
      className={`fixed inset-0 pointer-events-none overflow-hidden z-0 select-none ${className}`}
    >
      {/* Orbe 1: Superior esmeralda suave con deriva elíptica */}
      <motion.div
        animate={{
          x: [0, 40, -30, 0],
          y: [0, -35, 25, 0],
          scale: [1, 1.08, 0.94, 1],
        }}
        transition={{
          duration: 26,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        className="absolute -top-[15%] left-[20%] w-[750px] sm:w-[950px] h-[550px] sm:h-[650px] rounded-full bg-gradient-to-br from-emerald-500/12 via-teal-500/8 to-transparent dark:from-emerald-500/14 dark:via-teal-500/6 dark:to-transparent blur-[130px] sm:blur-[160px] transform-gpu will-change-transform"
      />

      {/* Orbe 2: Lateral izquierdo azul cian / índigo profundo */}
      <motion.div
        animate={{
          x: [0, -45, 35, 0],
          y: [0, 40, -30, 0],
          scale: [1, 0.92, 1.06, 1],
        }}
        transition={{
          duration: 32,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        className="absolute top-[35%] -left-[10%] w-[600px] sm:w-[800px] h-[600px] sm:h-[750px] rounded-full bg-gradient-to-tr from-cyan-500/8 via-emerald-500/5 to-transparent dark:from-cyan-500/10 dark:via-teal-600/6 dark:to-transparent blur-[140px] sm:blur-[170px] transform-gpu will-change-transform"
      />

      {/* Orbe 3: Inferior centrado para profundidad en secciones de mapa y tarjetas */}
      <motion.div
        animate={{
          x: [0, 30, -25, 0],
          y: [0, -25, 30, 0],
          scale: [1, 1.05, 0.96, 1],
        }}
        transition={{
          duration: 28,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        className="absolute top-[70%] left-[30%] w-[700px] sm:w-[900px] h-[500px] sm:h-[600px] rounded-full bg-gradient-to-r from-emerald-500/8 via-teal-500/5 to-transparent dark:from-emerald-500/10 dark:via-cyan-900/10 dark:to-transparent blur-[140px] sm:blur-[160px] transform-gpu will-change-transform"
      />

      {/* Viñeta sutil en bordes para foco central */}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-slate-950/20 dark:to-slate-950/40 pointer-events-none" />
    </div>
  );
};

export default AmbientGlow;
