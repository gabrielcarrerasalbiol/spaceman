'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';

type Theme = 'light' | 'dark-standard' | 'dark-red' | 'dark-emerald' | 'system';

interface ThemeContextType {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  resolvedTheme: 'light' | 'dark-standard' | 'dark-red' | 'dark-emerald';
}

const THEME_KEY = 'skeleton_theme';

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>('system');
  const [resolvedTheme, setResolvedTheme] = useState<'light' | 'dark-standard' | 'dark-red' | 'dark-emerald'>('light');

  useEffect(() => {
    const savedTheme = localStorage.getItem(THEME_KEY) as Theme | null;
    if (savedTheme && ['light', 'dark-standard', 'dark-red', 'dark-emerald', 'system'].includes(savedTheme)) {
      setThemeState(savedTheme);
    }
  }, []);

  useEffect(() => {
    const updateResolvedTheme = () => {
      let resolved: 'light' | 'dark-standard' | 'dark-red' | 'dark-emerald';
      if (theme === 'system') {
        // Default to dark-standard for system dark mode
        resolved = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark-standard' : 'light';
      } else {
        resolved = theme as 'light' | 'dark-standard' | 'dark-red' | 'dark-emerald';
      }
      setResolvedTheme(resolved);
      document.documentElement.setAttribute('data-theme', resolved);
    };

    updateResolvedTheme();

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const handleChange = () => {
      if (theme === 'system') {
        updateResolvedTheme();
      }
    };

    mediaQuery.addEventListener('change', handleChange);
    return () => mediaQuery.removeEventListener('change', handleChange);
  }, [theme]);

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    localStorage.setItem(THEME_KEY, newTheme);
  };

  return (
    <ThemeContext.Provider value={{ theme, setTheme, resolvedTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
