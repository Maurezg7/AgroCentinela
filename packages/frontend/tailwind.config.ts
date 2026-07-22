import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: '#1a1a2e',
        surface: '#16213e',
        primary: '#0f3460',
        accent: '#e94560',
      },
    },
  },
  plugins: [],
};

export default config;
