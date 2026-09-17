/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,ts,jsx,tsx}', './components/**/*.{js,ts,jsx,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // --- Core Brand ---
        primary: {
          DEFAULT: '#2E6F68',
          light: '#DCEAE7',
          border: '#BBDAD5',
          muted: '#C7E4DF',
          foreground: '#FBF6EF',
        },
        accent: {
          DEFAULT: '#BE5A2E',
          foreground: '#FBF6EF',
        },

        // --- Backgrounds ---
        background: {
          DEFAULT: '#FBF6EF',
          overlay: 'rgba(251,246,239,0.95)',
          blur: 'rgba(251,246,239,0.8)',
        },

        // --- Surfaces ---
        card: '#FFFFFF',

        // --- Foreground / Text ---
        foreground: '#2B2419',
        'muted-foreground': '#7A6E5C',

        // --- Secondary ---
        secondary: '#F3E9D8',

        // --- Borders ---
        border: {
          DEFAULT: '#ECE1CE',
          muted: 'rgba(236,225,206,0.6)',
        },

        // --- Status ---
        success: '#3E7A52',
        warning: '#C9932E',
        danger: '#B03B34',
        info: '#4C7FA6',

      },

      borderRadius: {
        sm: '6px',
        DEFAULT: '9px',
        lg: '12px',
        xl: '16px',
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
