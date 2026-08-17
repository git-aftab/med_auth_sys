/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        bg: '#000000',
        surface: '#111111',
        'surface-2': '#1a1a1a',
        border: '#2a2a2a',
        text: '#ffffff',
        'text-secondary': '#b3b3b3',

        critical: '#ef4444',
        high: '#f97316',
        medium: '#eab308',
        low: '#3b82f6',
        success: '#22c55e',

        dose: {
          50:  '#f0fdf9',
          100: '#ccfbef',
          200: '#99f6e0',
          300: '#5eead4',
          400: '#2dd4bf',
          500: '#14b8a6',
          600: '#0d9488',
          700: '#0f766e',
          800: '#115e59',
          900: '#134e4a',
          950: '#042f2e',
        },
        ink: {
          900: '#000000',
          800: '#111111',
          700: '#1a1a1a',
          600: '#222222',
          500: '#2a2a2a',
          400: '#3a3a3a',
          300: '#666666',
          200: '#8a8a8a',
          100: '#b3b3b3',
          50:  '#e5e5e5',
        },
        ok:   '#22c55e',
        fail: '#ef4444',
        warn: '#eab308',
      },
      fontFamily: {
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      borderRadius: {
        card: '16px',
        control: '12px',
        '2xl': '16px',
        '3xl': '24px',
      },
      boxShadow: {
        'glass': '0 4px 24px -4px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.06)',
        'card':  '0 2px 16px -2px rgba(0,0,0,0.4)',
        'glow-teal':  '0 0 24px -4px rgba(20, 184, 166, 0.35)',
        'glow-green': '0 0 24px -4px rgba(34, 197, 94, 0.35)',
        'glow-red':   '0 0 24px -4px rgba(239, 68, 68, 0.35)',
      },
    },
  },
  plugins: [],
}
