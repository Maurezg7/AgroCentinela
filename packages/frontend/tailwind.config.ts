import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: '#0F111A',
        foreground: '#F4F1EA',
        card: { DEFAULT: '#191C28', foreground: '#F4F1EA' },
        popover: { DEFAULT: '#191C28', foreground: '#F4F1EA' },
        primary: { DEFAULT: '#D97848', foreground: '#0F111A' },
        secondary: { DEFAULT: '#282C3A', foreground: '#F4F1EA' },
        muted: { DEFAULT: '#20232F', foreground: '#A8A79E' },
        accent: { DEFAULT: '#3A3320', foreground: '#F4F1EA' },
        destructive: { DEFAULT: '#E0503A', foreground: '#FCF6F2' },
        frost: { DEFAULT: '#5FB4E5', foreground: '#0F111A' },
        warning: { DEFAULT: '#E89A3C', foreground: '#0F111A' },
        safe: { DEFAULT: '#4FC38A', foreground: '#0F111A' },
        earth: { DEFAULT: '#8A6A47', foreground: '#F4F1EA' },
        danger: { DEFAULT: '#E0503A', foreground: '#FCF6F2' },
        border: 'rgba(255,255,255,0.08)',
        input: 'rgba(255,255,255,0.12)',
        ring: '#D97848',
      },
      fontFamily: {
        display: ['"Space Grotesk"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        sans: ['"DM Sans"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};

export default config;
