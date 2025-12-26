import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    // Aumentamos el límite de aviso a 1000kb (1MB) para que no sea tan ruidoso
    chunkSizeWarningLimit: 1000, 
    rollupOptions: {
      output: {
        // Esta función ayuda a separar las librerías grandes en archivos distintos
        manualChunks(id) {
          if (id.includes('node_modules')) {
            // Separa Firebase (suele ser lo más pesado)
            if (id.includes('firebase')) {
              return 'firebase';
            }
            // Separa herramientas de PDF
            if (id.includes('jspdf')) {
              return 'pdf-libs';
            }
            // Separa React y sus dependencias principales
            if (id.includes('react') || id.includes('react-dom') || id.includes('react-router-dom')) {
              return 'react-vendor';
            }
            // El resto de node_modules va a un archivo "vendor" general
            return 'vendor';
          }
        },
      },
    },
  },
})