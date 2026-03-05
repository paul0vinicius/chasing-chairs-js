/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        // Mapeando as fontes que você já importou no index.css
        bayoc: ['Bayoc', 'sans-serif'],
        pixel: ['VT323', 'monospace'],
      },
      colors: {
        // As cores que extraímos da sua imagem de referência
        retro: {
          yellow: '#ffcc00',
          dark: '#1a1a1a',
          green: '#00ff00',
          cyan: '#00ffff',
        },
      },
    },
  },
  plugins: [],
}
