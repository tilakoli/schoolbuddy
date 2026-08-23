/**
 * theme.ts
 * Central source of truth for design tokens used outside of Tailwind/NativeWind.
 * Use for StyleSheet, Animated values, or third-party components.
 *
 * Deep/refined SaaS direction (Linear/Notion/Vercel-adjacent) — values
 * converted precisely from the approved oklch mockup palette so mobile and
 * web match exactly. See web/app/globals.css for the web token side.
 */

export const Colors = {
  // --- Core Brand ---
  primary: '#343996',
  primaryLight: '#E8ECFE',
  primaryBorder: '#B4BCDF',
  primaryMuted: '#C8D4FF',
  primaryForeground: '#FBFCFD',
  accent: '#E97300',
  accentForeground: '#FFFAF5',

  // --- Backgrounds ---
  background: '#F9FAFB',
  backgroundOverlay: 'rgba(249,250,251,0.95)',
  backgroundBlur: 'rgba(249,250,251,0.8)',

  // --- Surfaces ---
  card: '#FFFFFF',

  // --- Foreground / Text ---
  foreground: '#15181F',
  mutedForeground: '#656970',

  // --- Secondary ---
  secondary: '#EEF0F3',

  // --- Borders ---
  border: '#E3E5E7',
  borderMuted: 'rgba(227,229,231,0.6)',

  // --- Status ---
  success: '#2C965D',
  warning: '#DA950B',
  danger: '#CC3336',
  info: '#2A94C7',

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
  sm: 6,
  md: 10,
  lg: 14,
  xl: 20,
  full: 9999,
} as const;

export const Shadow = {
  card: {
    shadowColor: '#15181F',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 1,
  },
  cta: {
    shadowColor: '#343996',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
    elevation: 6,
  },
  modal: {
    shadowColor: '#15181F',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.2,
    shadowRadius: 30,
    elevation: 12,
  },
} as const;
