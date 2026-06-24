/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        cream: '#FAFAF7',
        coffee: {
          dark: '#2C1810',
          medium: '#5C3317',
          light: '#8B5A3C',
        },
        gold: '#D4A853',
      },
    },
  },
  plugins: [],
}
