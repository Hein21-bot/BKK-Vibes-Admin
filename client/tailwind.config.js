/** @type {import('tailwindcss').Config} */
const v = (name) => `rgb(var(${name}) / <alpha-value>)`;

export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#eef4ff',
          100: '#d9e6ff',
          200: '#bcd3ff',
          300: '#8fb6ff',
          400: '#5a8dff',
          500: '#3366ff',
          600: '#1f47db',
          700: '#1c39b0',
          800: '#1d338b',
          900: '#1d2f6f',
        },
        // Theme-aware semantic tokens (CSS vars defined in index.css)
        page: v('--c-page'),
        panel: v('--c-panel'),
        panel2: v('--c-panel-2'),
        edge: v('--c-edge'),
        ink: v('--c-ink'),
        ink2: v('--c-ink-2'),
      },
      fontFamily: {
        sans: ['Inter', 'Padauk', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
