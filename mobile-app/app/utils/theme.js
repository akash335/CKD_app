import { Appearance, useColorScheme } from 'react-native';

export const lightColors = {
  background: '#F4F8FC',
  surface: '#FFFFFF',
  surfaceAlt: '#EEF4FF',
  text: '#0F172A',
  muted: '#64748B',
  border: '#D8E3F1',
  primary: '#1D4ED8',
  accent: '#2563EB',
  softBlue: '#E8F1FF',
  primarySoft: '#DCEBFF',
  success: '#16A34A',
  successBg: '#DCFCE7',
  warning: '#D97706',
  warningBg: '#FEF3C7',
  danger: '#DC2626',
  dangerBg: '#FEE2E2',
  overlay: 'rgba(37, 99, 235, 0.08)',
  glow: 'rgba(59, 130, 246, 0.18)',
};

export const darkColors = {
  background: '#08111F',
  surface: '#0F1B2D',
  surfaceAlt: '#14243A',
  text: '#E8F0FB',
  muted: '#94A3B8',
  border: '#22344D',
  primary: '#3B82F6',
  accent: '#60A5FA',
  softBlue: '#132642',
  primarySoft: '#173055',
  success: '#22C55E',
  successBg: '#123321',
  warning: '#F59E0B',
  warningBg: '#3A2A0C',
  danger: '#F87171',
  dangerBg: '#3F1B1B',
  overlay: 'rgba(96, 165, 250, 0.10)',
  glow: 'rgba(59, 130, 246, 0.24)',
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 20,
  xxl: 24,
  xxxl: 32,
};

export const radius = {
  sm: 10,
  md: 14,
  lg: 18,
  xl: 24,
  pill: 999,
};

export const shadows = {
  card: {
    shadowColor: '#000',
    shadowOpacity: 0.08,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 8 },
    elevation: 4,
  },
  soft: {
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 4 },
    elevation: 2,
  },
};

export const typography = {
  h1: 30,
  h2: 24,
  h3: 18,
  body: 15,
  caption: 13,
};

export function getTheme(scheme = 'light') {
  return scheme === 'dark' ? darkColors : lightColors;
}

export function useAppTheme() {
  const scheme = useColorScheme();
  const isDark = scheme === 'dark';
  const colors = isDark ? darkColors : lightColors;

  return {
    isDark,
    colors,
    spacing,
    radius,
    shadows,
    typography,
  };
}

const initialScheme =
  Appearance.getColorScheme?.() === 'dark' ? 'dark' : 'light';

export const colors = initialScheme === 'dark' ? darkColors : lightColors;