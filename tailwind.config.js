/** @type {import('tailwindcss').Config} */
module.exports = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        protein: '#22c55e',
        carbs: '#f97316',
        fat: '#3b82f6',
        calories: '#ef4444',
        fiber: '#a855f7',
        sugar: '#ec4899',
      }
    },
  },
  plugins: [],
}
