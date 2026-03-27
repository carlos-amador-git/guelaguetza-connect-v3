/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './**/*.{ts,tsx}',
    '!./node_modules/**',
    '!./backend/**',
    '!./dist/**',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        oaxaca: {
          pink: '#D9006C',
          'pink-light': '#FDE8F0',
          yellow: '#FFD100',
          'yellow-light': '#FFF8E1',
          purple: '#6A0F49',
          'purple-light': '#F3E5F5',
          sky: '#00AEEF',
          'sky-light': '#E1F5FE',
          stone: '#F5F5F4',
          dark: '#1C1917',
          earth: '#8B4513',
        },
        guelaguetza: {
          purple: '#7C3AED',
          'purple-dark': '#6B21A8',
          'purple-light': '#C4B5FD',
          pink: '#EC4899',
          'pink-dark': '#DB2777',
          'pink-light': '#FBCFE8',
          red: '#F43F5E',
          yellow: '#FBBF24',
          'yellow-dark': '#F59E0B',
          'yellow-light': '#FDE68A',
          coral: '#FB7185',
          fuchsia: '#E879F9',
        },
        a11y: {
          gray: '#595959',
          'gray-light': '#6B6B6B',
          muted: '#767676',
        },
      },
      backgroundImage: {
        'guelaguetza-gradient': 'linear-gradient(135deg, #7C3AED 0%, #EC4899 50%, #F43F5E 100%)',
        'guelaguetza-gradient-light': 'linear-gradient(135deg, #A78BFA 0%, #F472B6 50%, #FB7185 100%)',
        'guelaguetza-vertical': 'linear-gradient(180deg, #7C3AED 0%, #EC4899 50%, #FBBF24 100%)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      fontSize: {
        display: ['2.5rem', { lineHeight: '1.1', fontWeight: '700' }],
        title: ['1.5rem', { lineHeight: '1.2', fontWeight: '600' }],
        subtitle: ['1.125rem', { lineHeight: '1.3', fontWeight: '500' }],
      },
      spacing: {
        card: '1rem',
        section: '1.5rem',
        page: '2rem',
        safe: 'env(safe-area-inset-bottom)',
      },
      borderRadius: {
        card: '1rem',
        button: '0.75rem',
        input: '0.75rem',
        modal: '1.5rem',
        pill: '9999px',
      },
      boxShadow: {
        card: '0 2px 8px rgba(0, 0, 0, 0.08)',
        'card-hover': '0 4px 16px rgba(0, 0, 0, 0.12)',
        modal: '0 8px 32px rgba(0, 0, 0, 0.2)',
        button: '0 2px 4px rgba(217, 0, 108, 0.2)',
        'guelaguetza': '0 4px 20px rgba(124, 58, 237, 0.3)',
      },
      transitionDuration: {
        fast: '150ms',
        normal: '200ms',
        slow: '300ms',
      },
      zIndex: {
        dropdown: '50',
        modal: '100',
        toast: '150',
        tooltip: '200',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-out',
        'fade-out': 'fadeOut 0.3s ease-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
        'spin-slow': 'spin 3s linear infinite',
        'pulse-soft': 'pulseSoft 2s ease-in-out infinite',
        'bounce-soft': 'bounceSoft 1s ease-in-out infinite',
        'gradient': 'gradient 3s ease infinite',
        'gradient-slow': 'gradient 5s ease infinite',
        'gradient-text': 'gradientText 3s linear infinite',
        'slide-right': 'slideRight 0.3s ease-out',
      },
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeOut: {
          '0%': { opacity: '1' },
          '100%': { opacity: '0' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideRight: {
          '0%': { transform: 'translateX(-100%)' },
          '100%': { transform: 'translateX(0)' },
        },
        slideDown: {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.7' },
        },
        bounceSoft: {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-5px)' },
        },
        gradient: {
          '0%, 100%': { backgroundPosition: '0% 50%' },
          '50%': { backgroundPosition: '100% 50%' },
        },
        gradientText: {
          '0%': { backgroundPosition: '0% 50%' },
          '100%': { backgroundPosition: '200% 50%' },
        },
      },
    },
  },
  plugins: [],
};
