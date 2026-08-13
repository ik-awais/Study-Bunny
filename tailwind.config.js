/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        bunny: {
          cream: '#FFFBF5',      // Base background
          card: '#FFFFFF',       // Card background
          blush: '#FFD6E0',      // Primary accents, buttons
          rose: '#FFB6C1',       // Hover states, active timer
          text: '#4A3F3F',       // Primary text (muted brown/charcoal)
          muted: '#8E7F7F',      // Secondary text
          border: '#F2E8E3'      // Soft borders
        }
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        rounded: ['Quicksand', 'system-ui', 'sans-serif'], // For cute headers/timer
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.5rem',
        '4xl': '2rem',
      }
    },
  },
  plugins: [],
}