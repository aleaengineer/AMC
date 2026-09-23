/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./pages/**/*.{js,ts,jsx,tsx,mdx}"
  ],
  theme: {
    extend: {
      colors: {
        afna: {
          dark: "#0a0e1a",
          card: "#111827",
          border: "#1f2937",
          primary: "#3b82f6",
          success: "#10b981",
          warning: "#f59e0b",
          danger: "#ef4444"
        }
      }
    }
  },
  plugins: []
};
