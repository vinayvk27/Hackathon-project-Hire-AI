import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    host: '0.0.0.0',
    port: 5173,
    strictPort: true,
    proxy: {
      '/api':        { target: 'http://127.0.0.1:8001', changeOrigin: true },
      '/auth':       { target: 'http://127.0.0.1:8001', changeOrigin: true },
      '/jobs':       { target: 'http://127.0.0.1:8001', changeOrigin: true },
      '/candidates': { target: 'http://127.0.0.1:8001', changeOrigin: true },
      '/audio':      { target: 'http://127.0.0.1:8001', changeOrigin: true },
      '/assessment': { target: 'http://127.0.0.1:8001', changeOrigin: true },
      '/interview':  { target: 'http://127.0.0.1:8001', changeOrigin: true },
      '/pipeline':   { target: 'http://127.0.0.1:8001', changeOrigin: true },
    },
  },
})
