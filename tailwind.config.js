/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./app/**/*.{js,ts,jsx,tsx}', './components/**/*.{js,ts,jsx,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        // --- Core Brand ---
        primary: {
          DEFAULT: '#343996',
          light: '#E8ECFE',
          border: '#B4BCDF',
          muted: '#C8D4FF',
          foreground: '#FBFCFD',
        },
        accent: {
          DEFAULT: '#E97300',
          foreground: '#FFFAF5',
        },

        // --- Backgrounds ---
        background: {
          DEFAULT: '#F9FAFB',
          overlay: 'rgba(249,250,251,0.95)',
          blur: 'rgba(249,250,251,0.8)',
        },

        // --- Surfaces ---
        card: '#FFFFFF',

        // --- Foreground / Text ---
        foreground: '#15181F',
        'muted-foreground': '#656970',

        // --- Secondary ---
        secondary: '#EEF0F3',

        // --- Borders ---
        border: {
          DEFAULT: '#E3E5E7',
          muted: 'rgba(227,229,231,0.6)',
        },

        // --- Status ---
        success: '#2C965D',
        warning: '#DA950B',
        danger: '#CC3336',
        info: '#2A94C7',

      },

      borderRadius: {
        sm: '6px',
        DEFAULT: '10px',
        lg: '14px',
        xl: '20px',
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
