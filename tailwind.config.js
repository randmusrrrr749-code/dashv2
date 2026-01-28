/** @type {import('tailwindcss').Config} */
module.exports = {
    content: [
      "./app/**/*.{js,ts,jsx,tsx}",
      "./pages/**/*.{js,ts,jsx,tsx}",
      "./components/**/*.{js,ts,jsx,tsx}",
    ],
    theme: {
      fontSize: {
        xs: ["0.8125rem", { lineHeight: "1.4" }],
        sm: ["0.9375rem", { lineHeight: "1.5" }],
        base: ["1.0625rem", { lineHeight: "1.6" }],
        lg: ["1.1875rem", { lineHeight: "1.6" }],
        xl: ["1.375rem", { lineHeight: "1.5" }],
        "2xl": ["1.625rem", { lineHeight: "1.4" }],
        "3xl": ["2rem", { lineHeight: "1.25" }],
        "4xl": ["2.5rem", { lineHeight: "1.15" }],
        "5xl": ["3rem", { lineHeight: "1.1" }],
        "6xl": ["3.5rem", { lineHeight: "1.05" }],
      },
      extend: {
        colors: {
          // Bellarium brand colors
          'blv': {
            50: '#fff0f6',
            100: '#ffd6e8',
            200: '#ffadd2',
            300: '#ff85ba',
            400: '#ff4d9f',
            500: '#ff0066', // Primary pink/magenta
            600: '#e6005c',
            700: '#cc0052',
            800: '#b30047',
            900: '#99003d',
          },
          'blv-cyan': {
            50: '#e6fcff',
            100: '#b3f5ff',
            200: '#80eeff',
            300: '#4de7ff',
            400: '#1ae0ff',
            500: '#00d4ff', // Secondary cyan
            600: '#00bfe6',
            700: '#00a9cc',
            800: '#0094b3',
            900: '#007f99',
          },
          'blv-gold': {
            400: '#ffd700',
            500: '#f7931a', // Logo orange-gold
            600: '#e6850f',
          },
        },
      },
    },
    plugins: [],
  };
  
