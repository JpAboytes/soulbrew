/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Paleta de marca derivada del logo Soulbrew (verde olivo + café espresso)
        cream: '#FAFAF7',
        paper: '#F4EFE4',    // crema cálida tipo papel de carta (cards/secciones)
        line: '#E2D9C8',     // hairline cálida para separadores y leader dots
        coffee: {
          dark: '#42241A',   // café espresso del logo (estructura/texto)
          medium: '#5C3A28',
          light: '#7C5A43',
        },
        olive: '#4E5B3D',    // verde olivo del logo (acento/CTA)
        salvia: '#AEBB92',   // salvia clara (texto/íconos sobre fondos oscuros)
        gold: '#4E5B3D',     // alias retro-compatible → ahora el olivo de marca
      },
      fontFamily: {
        // Display con carácter de imprenta (cartas de café), texto limpio y cálido.
        display: ['Fraunces', 'ui-serif', 'Georgia', 'serif'],
        sans: ['"DM Sans"', 'system-ui', '-apple-system', 'sans-serif'],
      },
      keyframes: {
        'card-in': {
          '0%': { opacity: '0', transform: 'translateY(16px) scale(.94) rotate(-1.5deg)' },
          '100%': { opacity: '1', transform: 'translateY(0) scale(1) rotate(0)' },
        },
        'rise': {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'card-in': 'card-in .6s cubic-bezier(.16,1,.3,1) both',
        'rise': 'rise .5s ease-out both',
      },
    },
  },
  plugins: [],
}
