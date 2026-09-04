import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext();

export const AVAILABLE_THEMES = [
  {
    id: 'light',
    name: 'Claro Esmeralda',
    shortName: 'Claro',
    desc: 'Limpio, luminoso y profesional con acentos esmeralda.',
    isDark: false,
    preview: {
      bg: '#F8FAFC',
      card: '#FFFFFF',
      border: '#E2E8F0',
      text: '#0F172A',
      accent: '#059669'
    }
  },
  {
    id: 'dark',
    name: 'Oscuro Obsidiana',
    shortName: 'Obsidiana',
    desc: 'Fondo oscuro relajante para garitas y trabajo nocturno.',
    isDark: true,
    preview: {
      bg: '#0B0F19',
      card: '#151D2F',
      border: '#1E293B',
      text: '#F8FAFC',
      accent: '#10B981'
    }
  },
  {
    id: 'midnight',
    name: 'Medianoche Azul',
    shortName: 'Medianoche',
    desc: 'Paleta zafiro profundo con acentos cian de alta elegancia.',
    isDark: true,
    preview: {
      bg: '#070D1E',
      card: '#0D1B3E',
      border: '#1E3568',
      text: '#F0F6FC',
      accent: '#38BDF8'
    }
  },
  {
    id: 'high-contrast',
    name: 'Alto Contraste',
    shortName: 'Contraste',
    desc: 'Negro puro y verde táctico para pantallas bajo luz solar intensa.',
    isDark: true,
    preview: {
      bg: '#000000',
      card: '#0D0D0D',
      border: '#404040',
      text: '#FFFFFF',
      accent: '#22C55E'
    }
  }
];

const THEME_STORAGE_KEY = 'smart_park_theme';
const AUTO_DARK_STORAGE_KEY = 'smart_park_theme_auto_dark';

export const ThemeProvider = ({ children }) => {
  const [autoDark, setAutoDarkState] = useState(() => {
    try {
      return localStorage.getItem(AUTO_DARK_STORAGE_KEY) === 'true';
    } catch {
      return false;
    }
  });

  const [theme, setThemeState] = useState(() => {
    try {
      const saved = localStorage.getItem(THEME_STORAGE_KEY);
      if (saved && AVAILABLE_THEMES.some(t => t.id === saved)) {
        return saved;
      }
      // Detección automática por horario si autoDark está activo
      const isAuto = localStorage.getItem(AUTO_DARK_STORAGE_KEY) === 'true';
      if (isAuto) {
        const hour = new Date().getHours();
        return (hour >= 19 || hour < 6) ? 'dark' : 'light';
      }
      // Detección de preferencia del SO
      if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
        return 'dark';
      }
    } catch {}
    return 'light';
  });

  // Aplicar tema al DOM
  useEffect(() => {
    const root = document.documentElement;
    root.setAttribute('data-theme', theme);

    const isThemeDark = theme !== 'light';
    if (isThemeDark) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }

    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {}
  }, [theme]);

  // Manejar modo oscuro automático por horario
  useEffect(() => {
    if (!autoDark) return;

    const checkTime = () => {
      const hour = new Date().getHours();
      const shouldBeDark = hour >= 19 || hour < 6;
      setThemeState(prev => {
        if (shouldBeDark && prev === 'light') return 'dark';
        if (!shouldBeDark && (prev === 'dark' || prev === 'midnight')) return 'light';
        return prev;
      });
    };

    checkTime();
    const interval = setInterval(checkTime, 60000);
    return () => clearInterval(interval);
  }, [autoDark]);

  const setTheme = (newTheme) => {
    if (AVAILABLE_THEMES.some(t => t.id === newTheme)) {
      setThemeState(newTheme);
    }
  };

  const setAutoDark = (enabled) => {
    setAutoDarkState(enabled);
    try {
      localStorage.setItem(AUTO_DARK_STORAGE_KEY, enabled ? 'true' : 'false');
    } catch {}
  };

  const isDark = theme !== 'light';

  const toggleTheme = () => {
    setThemeState(prev => (prev === 'light' ? 'dark' : 'light'));
  };

  return (
    <ThemeContext.Provider value={{
      theme,
      setTheme,
      isDark,
      toggleTheme,
      autoDark,
      setAutoDark,
      availableThemes: AVAILABLE_THEMES
    }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme debe ser usado dentro de un ThemeProvider');
  }
  return context;
};
