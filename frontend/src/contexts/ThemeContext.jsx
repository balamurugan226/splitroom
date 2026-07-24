import React, { createContext, useContext, useState, useEffect } from 'react';

const ThemeContext = createContext(null);

export const ACCENT_THEMES = {
  blue: { name: 'Sapphire Blue', primary: '#3b82f6', dark: '#2563eb', light: '#eff6ff' },
  emerald: { name: 'Emerald Green', primary: '#10b981', dark: '#059669', light: '#ecfdf5' },
  purple: { name: 'Royal Purple', primary: '#8b5cf6', dark: '#7c3aed', light: '#f5f3ff' },
  amber: { name: 'Amber Sunset', primary: '#f59e0b', dark: '#d97706', light: '#fffbeb' },
  rose: { name: 'Crimson Rose', primary: '#e11d48', dark: '#be123c', light: '#fff1f2' }
};

export function ThemeProvider({ children }) {
  const [theme, setTheme] = useState(() => localStorage.getItem('splitroom_theme') || 'light');
  const [accent, setAccent] = useState(() => localStorage.getItem('splitroom_accent') || 'blue');

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
    localStorage.setItem('splitroom_theme', theme);
  }, [theme]);

  useEffect(() => {
    const selected = ACCENT_THEMES[accent] || ACCENT_THEMES.blue;
    document.documentElement.style.setProperty('--accent-blue', selected.primary);
    document.documentElement.style.setProperty('--accent-blue-dark', selected.dark);
    document.documentElement.style.setProperty('--accent-blue-light', selected.light);
    localStorage.setItem('splitroom_accent', accent);
  }, [accent]);

  const toggleTheme = () => setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  const changeAccent = (colorKey) => {
    if (ACCENT_THEMES[colorKey]) setAccent(colorKey);
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme, accent, changeAccent, ACCENT_THEMES }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
