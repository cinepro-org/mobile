/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./App.{js,jsx,ts,tsx}', './src/**/*.{js,jsx,ts,tsx}', './index.ts'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        ink: '#07080d',
        surface: '#0f111a',
        elevated: '#161929',
        accent: '#e50914',
        accentMuted: '#ff5c66',
        frost: 'rgba(255,255,255,0.06)',
      },
    },
  },
  plugins: [],
};
