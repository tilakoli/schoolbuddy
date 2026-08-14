/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,ts,jsx,tsx}', './components/**/*.{js,ts,jsx,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // --- Core Brand ---
        primary: {
          DEFAULT: '#2563EB',
          light: '#EFF6FF',
          border: '#93C5FD',
          muted: '#BFDBFE',
          foreground: '#FFFFFF',
        },

        // --- Backgrounds ---
        background: {
          DEFAULT: '#F8FAFC',
          overlay: 'rgba(248,250,252,0.95)',
          blur: 'rgba(248,250,252,0.8)',
        },

        // --- Surfaces ---
        card: '#FFFFFF',

        // --- Foreground / Text ---
        foreground: '#0F172A',
        'muted-foreground': '#64748B',

        // --- Secondary ---
        secondary: '#E2E8F0',

        // --- Borders ---
        border: {
          DEFAULT: '#CBD5E1',
          muted: 'rgba(203,213,225,0.6)',
        },

        // --- Status ---
        success: '#22C55E',
        warning: '#F59E0B',
        danger: '#EF4444',
        info: '#38BDF8',

      },

      borderRadius: {
        sm: '8px',
        DEFAULT: '12px',
        lg: '16px',
        xl: '24px',
        full: '9999px',
      },

      spacing: {
        xs: '4px',
        sm: '8px',
        md: '16px',
        lg: '24px',
        xl: '32px',
        '2xl': '48px',
      },
    },
  },
  plugins: [],
};
