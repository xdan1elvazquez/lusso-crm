/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Fondo principal (Muy oscuro, casi negro)
        background: "#020617", // Slate-950 modificado
        
        // Superficies (Paneles, Tarjetas)
        surface: "#0f172a", // Slate-900
        surfaceHighlight: "#1e293b", // Slate-800 (para hovers)
        
        // Bordes (Sutiles y elegantes)
        border: "#1e293b", // Slate-800
        
        // Acentos (Azul eléctrico Lusso)
        primary: "#3b82f6", // Blue-500
        primaryHover: "#2563eb", // Blue-600
        
        // Textos
        textMain: "#f8fafc", // Slate-50 (Blanco casi puro)
        textMuted: "#94a3b8", // Slate-400 (Gris medio)
        
        // Estados
        success: "#10b981", // Emerald-500
        warning: "#f59e0b", // Amber-500
        danger: "#ef4444", // Red-500
      },
      borderRadius: {
        'xl': '0.75rem',
        '2xl': '1rem', // Un poco menos curvo que el light, más "tech"
      },
      boxShadow: {
        'glow': '0 0 20px -5px rgba(59, 130, 246, 0.15)', // Resplandor azul sutil
      }
    },
  },
  plugins: [],
}