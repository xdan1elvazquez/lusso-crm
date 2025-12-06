/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "#020617",
        surface: "#0f172a",
        surfaceHighlight: "#1e293b",
        border: "#1e293b",
        primary: "#3b82f6",
        primaryHover: "#2563eb",
        success: "#22c55e",
        warning: "#eab308",
        danger: "#ef4444",
        textMain: "#e2e8f0",
        textMuted: "#94a3b8",
      }
    },
  },
  plugins: [],
}