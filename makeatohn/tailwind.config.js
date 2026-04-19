/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['DM Sans', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
        display: ['Syne', 'system-ui', 'sans-serif'],
      },
      colors: {
        app: {
          page:    '#0e0e10',
          surface: '#161618',
          card:    '#1e1e22',
          fg:      '#f0f0f0',
          fg2:     '#8a8a9a',
          fg3:     '#55556a',
        },
        tum: {
          blue:  '#0065BD',
          light: '#64A0C8',
        },
      },
      borderWidth: { 'half': '0.5px' },
    },
  },
  plugins: [],
}
