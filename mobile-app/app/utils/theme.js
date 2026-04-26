import React, { createContext, useContext, useMemo, useState } from 'react';

export const spacing = {
  xs: 4,
  sm: 8,
  md: 14,
  lg: 20,
  xl: 28,
  xxl: 36,
};

export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  pill: 999,
};

export const shadows = {
  card: {
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 4 },
    elevation: 3,
  },
  soft: {
    shadowColor: '#000',
    shadowOpacity: 0.06,
    shadowRadius: 8,
    shadowOffset: { width: 0, height: 3 },
    elevation: 2,
  },
};

export const lightColors = {
  background: '#F5F8FC',
  surface: '#FFFFFF',
  surfaceAlt: '#EEF4FF',
  card: '#FFFFFF',

  text: '#0F172A',
  muted: '#64748B',
  subtle: '#94A3B8',

  primary: '#2563EB',
  accent: '#2563EB',
  primarySoft: '#DBEAFE',
  softBlue: '#EFF6FF',

  border: '#D8E3F2',
  danger: '#DC2626',
  warning: '#F59E0B',
  success: '#16A34A',

  glow: 'rgba(37, 99, 235, 0.12)',
  overlay: 'rgba(37, 99, 235, 0.08)',
};

export const darkColors = lightColors;
export const colors = lightColors;

const ThemeContext = createContext({
  colors: lightColors,
  spacing,
  radius,
  shadows,
  isDark: false,
  toggleTheme: () => { },
});

export function ThemeProvider({ children }) {
  const [isDark, setIsDark] = useState(false);

  const value = useMemo(
    () => ({
      colors: lightColors,
      spacing,
      radius,
      shadows,
      isDark: false,
      toggleTheme: () => setIsDark(false),
    }),
    [isDark]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useAppTheme() {
  return useContext(ThemeContext);
}