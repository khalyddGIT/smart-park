import React, { useEffect, useRef, useState } from 'react';
import { useInView } from 'framer-motion';

/**
 * CountUp - Componente de métricas animadas de React Bits
 * Incrementa suavemente un valor numérico desde 0 hasta el objetivo al entrar en pantalla.
 * Permite re-animarse cada vez que vuelve a entrar al viewport al hacer scroll (once = false).
 */
export const CountUp = ({
  to,
  from = 0,
  direction = 'up',
  delay = 0,
  duration = 1.4,
  className = '',
  startWhen = true,
  separator = '',
  decimals = 0,
  prefix = '',
  suffix = '',
  once = false,
}) => {
  const [current, setCurrent] = useState(from);
  const ref = useRef(null);
  const isInView = useInView(ref, { once, margin: '-30px' });

  useEffect(() => {
    if (!isInView) {
      if (!once) {
        setCurrent(from);
      }
      return;
    }

    if (!startWhen) return;

    let timeoutId;
    let animationFrameId;

    const startAnimation = () => {
      const startTime = performance.now();
      const diff = to - from;

      const updateCount = (currentTime) => {
        const elapsed = (currentTime - startTime) / 1000;
        const progress = Math.min(elapsed / duration, 1);

        // Curva suave ease-out cubic
        const easeOut = 1 - Math.pow(1 - progress, 3);
        const value = from + diff * easeOut;

        setCurrent(value);

        if (progress < 1) {
          animationFrameId = requestAnimationFrame(updateCount);
        } else {
          setCurrent(to);
        }
      };

      animationFrameId = requestAnimationFrame(updateCount);
    };

    if (delay > 0) {
      timeoutId = setTimeout(startAnimation, delay * 1000);
    } else {
      startAnimation();
    }

    return () => {
      clearTimeout(timeoutId);
      cancelAnimationFrame(animationFrameId);
    };
  }, [isInView, startWhen, from, to, duration, delay, once]);

  const formatted =
    prefix +
    current.toLocaleString(undefined, {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }) +
    suffix;

  return (
    <span ref={ref} className={`tabular-nums inline-block ${className}`}>
      {formatted}
    </span>
  );
};

export default CountUp;
