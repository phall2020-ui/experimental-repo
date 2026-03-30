/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        navy: { 950: '#0A0E1A', 900: '#0F1629', 800: '#141B2D', 700: '#1E2A40' },
        solar: { 400: '#FCD34D', 500: '#F59E0B', 600: '#D97706' },
        online: '#10B981',
        offline: '#EF4444',
        standby: '#6B7280',
        fault: '#EF4444',
      },
      fontFamily: { sans: ['Inter', 'system-ui', 'sans-serif'] }
    }
  },
  plugins: []
}
