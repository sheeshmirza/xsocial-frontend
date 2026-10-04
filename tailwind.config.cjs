/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        brand: {
          DEFAULT: "#1f6d82",
          dark: "#245b73",
          accent: "#bb6b3d",
          light: "#e8efff",
        },
        surface: {
          DEFAULT: "#ffffff",
          soft: "#f8faff",
        },
        slate: {
          500: "#475569", // Enhanced contrast for WCAG AA
          600: "#334155",
        },
      },
      fontFamily: {
        sans: ["Sora", "Manrope", "system-ui", "sans-serif"],
      },
      keyframes: {
        "fade-in": {
          "0%": { opacity: "0", transform: "scale(0.97)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        "slide-in": {
          "0%": { opacity: "0", transform: "translateY(-8px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
      },
      animation: {
        "fade-in": "fade-in 150ms ease-out",
        "slide-in": "slide-in 200ms ease-out",
      },
    },
  },
  plugins: [],
};
