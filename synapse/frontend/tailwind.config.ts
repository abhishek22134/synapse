/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-dm-sans)", "system-ui", "sans-serif"],
      },
      colors: {
        green: {
          50:  "#E1F5EE",
          500: "#1D9E75",
          600: "#0F6E56",
          700: "#085041",
        },
      },
    },
  },
  plugins: [],
}
