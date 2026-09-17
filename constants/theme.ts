/**
 * theme.ts
 * Central source of truth for design tokens used outside of Tailwind/NativeWind.
 * Use for StyleSheet, Animated values, or third-party components.
 *
 * "Warm Neutral, tightened" — the B+C direction approved via the design
 * canvas published this session (theme-canvas). Values match
 * web/app/globals.css exactly (plain hex there too now, not oklch), so
 * mobile and web stay in sync.
 */

export const Colors = {
  // --- Core Brand ---
  primary: '#2E6F68',
  primaryLight: '#DCEAE7',
  primaryBorder: '#BBDAD5',
  primaryMuted: '#C7E4DF',
  primaryForeground: '#FBF6EF',
  accent: '#BE5A2E',
  accentForeground: '#FBF6EF',

  // --- Backgrounds ---
  background: '#FBF6EF',
  backgroundOverlay: 'rgba(251,246,239,0.95)',
  backgroundBlur: 'rgba(251,246,239,0.8)',

  // --- Surfaces ---
  card: '#FFFFFF',

  // --- Foreground / Text ---
  foreground: '#2B2419',
  mutedForeground: '#7A6E5C',

  // --- Secondary ---
  secondary: '#F3E9D8',

  // --- Borders ---
  border: '#ECE1CE',
  borderMuted: 'rgba(236,225,206,0.6)',

  // --- Status ---
  success: '#3E7A52',
  warning: '#C9932E',
  danger: '#B03B34',
  info: '#4C7FA6',

} as const;

// Tint backgrounds for the dashboard stat tiles (TILE_PALETTE) — rgb()
// twins of Colors.primary/info/warning/success above, since a React
// Native style object can't do Tailwind's bg-primary/10 opacity trick.
export const ColorsRgb = {
  primary: '46,111,104',
  info: '76,127,166',
  warning: '201,147,46',
  success: '62,122,82',
} as const;

export const FontFamily = {
  heading: 'Lora_600SemiBold',
  subheading: 'Lora_500Medium',
  body: 'NunitoSans_400Regular',
  caption: 'NunitoSans_400Regular',
  label: 'NunitoSans_700Bold',
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
  md: 9,
  lg: 12,
  xl: 16,
  full: 9999,
} as const;

export const Shadow = {
  card: {
    shadowColor: '#2B2419',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
    elevation: 1,
  },
  cta: {
    shadowColor: '#BE5A2E',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 6,
  },
  modal: {
    shadowColor: '#2B2419',
    shadowOffset: { width: 0, height: 16 },
    shadowOpacity: 0.22,
    shadowRadius: 30,
    elevation: 12,
  },
} as const;
