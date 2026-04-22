/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class', // 👈 ESSENCIAL

  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],

  theme: {
  extend: {
    colors: {
      background: {
        DEFAULT: '#f3f4f6',
        dark: '#0f172a',
      },
      card: {
        DEFAULT: '#ffffff',
        dark: '#1f2937',
      },
      text: {
        DEFAULT: '#111827',
        dark: '#f9fafb',
      }
    }
  }
},

  plugins: [],
}
