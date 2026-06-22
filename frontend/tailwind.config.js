/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      colors: {
        primary: "#019C47",
        secondary: "#214296",
        tertiary: "#FFC107",
      },
      fontFamily: {
        sans: ["Poppins", "system-ui", "-apple-system", "Segoe UI", "Roboto", "Helvetica Neue", "Arial", "Noto Sans", "sans-serif"],
        display: ["Oswald", "Poppins", "sans-serif"],
        figtree: ["Figtree", "Poppins", "sans-serif"],
      },
      keyframes: {
        'rise': {
          '0%': { opacity: '0', transform: 'translateY(24px) scale(0.97)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
        'lift-in': {
          '0%': { opacity: '0', transform: 'translateY(32px) scale(0.95)' },
          '60%': { opacity: '1', transform: 'translateY(-4px) scale(1.01)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1)' },
        },
      },
      animation: {
        'rise': 'rise 0.5s cubic-bezier(0.22,1,0.36,1) both',
        'rise-d1': 'rise 0.5s cubic-bezier(0.22,1,0.36,1) 0.1s both',
        'rise-d2': 'rise 0.5s cubic-bezier(0.22,1,0.36,1) 0.2s both',
        'rise-d3': 'rise 0.5s cubic-bezier(0.22,1,0.36,1) 0.35s both',
        'rise-d4': 'rise 0.5s cubic-bezier(0.22,1,0.36,1) 0.5s both',
        'lift-in': 'lift-in 0.7s cubic-bezier(0.22,1,0.36,1) 0.15s both',
      },
    },
  },
  plugins: [],
};
