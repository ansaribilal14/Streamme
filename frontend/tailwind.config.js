/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        background: '#0A0A0A',
        surface: '#141414',
        'surface-elevated': '#1F1F1F',
        border: '#2A2A2A',
        'text-primary': '#FFFFFF',
        'text-secondary': '#A3A3A3',
        'text-muted': '#525252',
        accent: '#E50914',
        'accent-hover': '#B81D24',
        success: '#22C55E',
        warning: '#F59E0B',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        card: '8px',
        modal: '12px',
        btn: '6px',
        badge: '4px',
      },
      boxShadow: {
        card: '0 4px 24px rgba(0, 0, 0, 0.6)',
        modal: '0 8px 48px rgba(0, 0, 0, 0.8)',
      },
      animation: {
        shimmer: 'shimmer 2s linear infinite',
        'fade-in': 'fadeIn 200ms ease',
        'scale-in': 'scaleIn 200ms ease',
      },
      keyframes: {
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        fadeIn: {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.95)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
      },
    },
  },
  plugins: [],
};
