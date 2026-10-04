import React, { useRef } from 'react';
import { motion, useInView } from 'framer-motion';

/**
 * BlurText - Componente tipográfico de React Bits
 * Despliega el texto palabra por palabra con un desenfoque progresivo suave.
 * Permite re-animarse cada vez que vuelve a entrar al viewport al hacer scroll (once = false).
 */
export const BlurText = ({
  text = '',
  delay = 50,
  className = '',
  animateBy = 'words', // 'words' | 'letters'
  direction = 'top',   // 'top' | 'bottom'
  once = false,
  as: Component = 'span',
  onAnimationComplete,
}) => {
  const ref = useRef(null);
  const isInView = useInView(ref, { once, margin: '-20px' });

  const elements = animateBy === 'words' ? text.split(' ') : text.split('');

  const defaultFrom =
    direction === 'top'
      ? { filter: 'blur(10px)', opacity: 0, y: -12 }
      : { filter: 'blur(10px)', opacity: 0, y: 12 };

  const defaultTo = {
    filter: 'blur(0px)',
    opacity: 1,
    y: 0,
  };

  return (
    <Component ref={ref} className={`inline-flex flex-wrap ${className}`}>
      {elements.map((el, index) => (
        <motion.span
          key={index}
          initial={defaultFrom}
          animate={isInView ? defaultTo : defaultFrom}
          transition={{
            duration: 0.45,
            delay: isInView ? (index * delay) / 1000 : 0,
            ease: [0.25, 1, 0.5, 1],
          }}
          onAnimationComplete={
            index === elements.length - 1 ? onAnimationComplete : undefined
          }
          className="inline-block whitespace-pre will-change-[transform,filter,opacity]"
        >
          {el}
          {animateBy === 'words' && index < elements.length - 1 && '\u00A0'}
        </motion.span>
      ))}
    </Component>
  );
};

export default BlurText;
