/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/renderer/**/*.{html,js}'],
  theme: {
    extend: {
      colors: {
        'app-blue': {
          700: '#1d4ed8',
          900: '#1e3a8a'
        },
        'app-gray': {
          400: '#9ca3af',
          500: '#6b7280',
          600: '#4b5563',
          700: '#374151',
          800: '#1f2937',
          900: '#111827'
        },
        'app-green': {
          600: '#16a34a',
          700: '#15803d'
        },
        'app-red': {
          500: '#ef4444',
          600: '#dc2626'
        },
        'purple': {
          600: '#9333ea',
          700: '#7c3aed',
          800: '#6b21a8'
        }
      },
      animation: {
        'slide-in-right': 'slideInRight 0.3s ease-out',
        'fade-in': 'fadeIn 0.3s ease-out'
      },
      keyframes: {
        slideInRight: {
          '0%': { transform: 'translateX(100%)' },
          '100%': { transform: 'translateX(0)' }
        },
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(-10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' }
        }
      }
    }
  },
  plugins: []
}