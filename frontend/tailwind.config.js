/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        iron: {
          50: '#f7f7f6',
          100: '#e5e4e2',
          200: '#cac8c4',
          300: '#a8a59f',
          400: '#86827a',
          500: '#6b6860',
          600: '#55534c',
          700: '#46443f',
          800: '#3a3936',
          900: '#33322f',
          950: '#1a1918',
        },
        rust: {
          300: '#eb9a72',
          400: '#e07b4a',
          500: '#d4622c',
          600: '#b84d1f',
          700: '#963d18',
          800: '#6e2d13',
          900: '#4a1e0c',
        },
        steel: {
          400: '#60a5fa',
          500: '#3b82f6',
          600: '#2563eb',
        }
      },
      fontFamily: {
        display: ['Oswald', 'sans-serif'],
        body: ['Source Sans 3', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace'],
      },
    },
  },
  plugins: [],
}
