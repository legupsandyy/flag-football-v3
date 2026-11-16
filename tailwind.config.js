/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "#F7F7F5",
        panel: "#FFFFFF",
        turf: "#0F6B5C",
        amber: "#B5741F",
        grid: "#D8D8D4",
        ink2: "#1A1A1A",
      },
      fontFamily: {
        display: ["'IBM Plex Sans'", "sans-serif"],
        sans: ["'Inter'", "sans-serif"],
        mono: ["'IBM Plex Mono'", "monospace"],
      },
    },
  },
  plugins: [],
};
