import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

/**
 * Lighthouse / PageSpeed: NO uses `npm run dev` (puerto 4040) para medir rendimiento.
 * Ahí Vite sirve código sin minificar, React en modo development, @vite/client, react-refresh
 * y WebSocket (HMR) → avisos de "minify", "unused JS", "payload enorme" y bfcache bloqueado.
 *
 * Medición válida: `npm run build` → `npm run preview` → audita la URL que muestre preview
 * (suele ser http://localhost:4173). Ver script `npm run lh:hint`.
 */
export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0', // Permite conexiones desde la red local
    port: 4040,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
        secure: false,
        ws: true, // Habilitar WebSocket proxy
        /** Evita cortes del proxy al pedir imágenes (Cloudinary). */
        proxyTimeout: 60_000,
        configure: (proxy) => {
          proxy.on('error', (err, _req, res) => {
            const code = err && (err.code || err.errno);
            if (code === 'ECONNREFUSED' || code === 'ECONNRESET') {
              console.warn(
                '\n[vite proxy] No hay API en http://localhost:3000 — ¿arrancaste el servidor? (carpeta server: npm run dev)\n'
              );
            }
          });
        },
      }
    }
  },
  build: {
    minify: 'esbuild',
    esbuild: {
      drop: ['console', 'debugger'],
    },
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'framer-motion': ['framer-motion'],
          'lucide': ['lucide-react']
        }
      }
    },
    chunkSizeWarningLimit: 1000
  }
})
