/**
 * theme.ts
 * Central source of truth for design tokens used outside of Tailwind/NativeWind.
 * Use for StyleSheet, Animated values, or third-party components.
 */

export const Colors = {
  // --- Core Brand ---
  primary: '#2563EB',
  primaryLight: '#EFF6FF',
  primaryBorder: '#93C5FD',
  primaryMuted: '#BFDBFE',
  primaryForeground: '#FFFFFF',

  // --- Backgrounds ---
  background: '#F8FAFC',
  backgroundOverlay: 'rgba(248,250,252,0.95)',
  backgroundBlur: 'rgba(248,250,252,0.8)',

  // --- Surfaces ---
  card: '#FFFFFF',

  // --- Foreground / Text ---
  foreground: '#0F172A',
  mutedForeground: '#64748B',

  // --- Secondary ---
  secondary: '#E2E8F0',

  // --- Borders ---
  border: '#CBD5E1',
  borderMuted: 'rgba(203,213,225,0.6)',

  // --- Status ---
  success: '#22C55E',
  warning: '#F59E0B',
  danger: '#EF4444',
  info: '#38BDF8',

} as const;

export const FontFamily = {
  heading: undefined,
  subheading: undefined,
  body: undefined,
  caption: undefined,
  label: undefined,
} as const;

export const FontSize = {
  xs: 11,
  sm: 13,
  md: 15,
  lg: 18,
  xl: 22,
  '2xl': 28,
  '3xl': 34,
} as const;

export const Spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  '2xl': 48,
} as const;

export const BorderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  full: 9999,
} as const;

export const Shadow = {
  card: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 3,
  },
  cta: {
    shadowColor: '#2563EB',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.25,
    shadowRadius: 40,
    elevation: 8,
  },
  modal: {
    shadowColor: '#0F172A',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 16,
    elevation: 8,
  },
} as const;
