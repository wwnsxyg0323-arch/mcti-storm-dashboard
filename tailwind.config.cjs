/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./index.html", "./src/**/*.{ts,tsx,js,jsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          500: "#22c55e",
          600: "#16a34a",
          700: "#15803d",
        },
      },
    },
  },
  plugins: [],
};

