/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Paleta de marca derivada del logo Soulbrew (verde olivo + café espresso)
        cream: '#FAFAF7',
        coffee: {
          dark: '#42241A',   // café espresso del logo (estructura/texto)
          medium: '#5C3A28',
          light: '#7C5A43',
        },
        olive: '#4E5B3D',    // verde olivo del logo (acento/CTA)
        salvia: '#AEBB92',   // salvia clara (texto/íconos sobre fondos oscuros)
        gold: '#4E5B3D',     // alias retro-compatible → ahora el olivo de marca
      },
    },
  },
  plugins: [],
}
