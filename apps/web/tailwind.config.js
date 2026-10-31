/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        canvas: {
          default: '#0B0F17',
        },
        surface: {
          base: '#111827',
          elevated: '#1A2234',
          highlight: '#243048',
        },
        border: {
          subtle: '#253047',
          strong: '#374665',
        },
        accent: {
          primary: '#3B82F6',
          subtle: '#60A5FA',
          muted: 'rgba(59, 130, 246, 0.14)',
        },
        status: {
          pass: '#10B981',
          warn: '#F59E0B',
          fail: '#EF4444',
          neutral: '#64748B',
        },
        text: {
          primary: '#F8FAFC',
          secondary: '#94A3B8',
          tertiary: '#64748B',
        }
      },
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
}

