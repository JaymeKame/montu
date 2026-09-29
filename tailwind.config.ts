import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Montu dark playful palette
        'montu-bg': '#0b0714',
        'montu-surface': '#161026',
        'montu-surface-2': '#1f1633',
        'montu-line': 'rgba(255, 255, 255, 0.10)',
        'montu-lime': '#c8f04a',
        'montu-violet': '#8b5cf6',
        'montu-pink': '#f472b6',
        'montu-ink': '#f4f1ff',
        'montu-ink-2': '#b8aecf',
        'montu-ink-3': '#7d7294',
      },
      fontFamily: {
        sans: [
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'sans-serif',
        ],
      },
      borderRadius: {
        card: '18px',
        button: '12px',
      },
      boxShadow: {
        card: '0 8px 32px rgba(0, 0, 0, 0.45)',
        glow: '0 0 24px rgba(200, 240, 74, 0.25)',
      },
    },
  },
  plugins: [],
};

export default config;
