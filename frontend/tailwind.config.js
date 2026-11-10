/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./index.html",
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  '#f5f7ff',
          100: '#ecefff',
          300: '#9aa7ff',
          500: '#6366f1',  // primary indigo
          700: '#4338ca',
        },
      },
      boxShadow: {
        'soft-lg': 
          '0 10px 30px rgba(99,102,241,0.12), 0 2px 6px rgba(15,23,42,0.04)',
      }
    },
  },
  plugins: [
    require('@tailwindcss/forms'),
  ],
};
