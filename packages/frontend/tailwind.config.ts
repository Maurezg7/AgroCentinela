import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        background: '#0D1512',
        foreground: '#E8F0EC',
        card: { DEFAULT: '#16211C', foreground: '#E8F0EC' },
        popover: { DEFAULT: '#16211C', foreground: '#E8F0EC' },
        primary: { DEFAULT: '#4ADE80', foreground: '#0D1512' },
        secondary: { DEFAULT: '#1E2B25', foreground: '#E8F0EC' },
        muted: { DEFAULT: '#1E2B25', foreground: '#8FA69A' },
        accent: { DEFAULT: '#4ADE80', foreground: '#0D1512' },
        destructive: { DEFAULT: '#EF4444', foreground: '#FFFFFF' },
        warning: { DEFAULT: '#FBBF24', foreground: '#0D1512' },
        danger: { DEFAULT: '#EF4444', foreground: '#FFFFFF' },
        border: '#24332C',
        input: '#24332C',
        ring: '#4ADE80',
      },
      borderRadius: {
        sm: 'calc(0.625rem - 4px)',
        md: 'calc(0.625rem - 2px)',
        lg: '0.625rem',
        xl: 'calc(0.625rem + 4px)',
        '2xl': 'calc(0.625rem + 8px)',
        '3xl': 'calc(0.625rem + 12px)',
      },
    },
  },
  plugins: [],
} satisfies Config;
