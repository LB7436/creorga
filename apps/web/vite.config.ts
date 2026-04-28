import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  server: {
    port: 5174,
    host: true,
    allowedHosts: true,
    proxy: {
      '/api': {
        target: 'http://localhost:3002',
        changeOrigin: true,
      },
      '/socket.io': {
        target: 'http://localhost:3002',
        ws: true,
      },
    },
  },
  // v3.12 #27 — Bundle splitting : split vendor libs into separate chunks
  // for better caching and smaller initial download.
  build: {
    chunkSizeWarningLimit: 1500,
    rollupOptions: {
      output: {
        manualChunks: {
          'vendor-react':    ['react', 'react-dom', 'react-router-dom'],
          'vendor-charts':   ['recharts'],
          'vendor-motion':   ['framer-motion'],
          'vendor-icons':    ['lucide-react'],
          'vendor-state':    ['zustand'],
          'vendor-ai':       ['tesseract.js'],
          'vendor-utils':    ['date-fns'],
        },
      },
    },
  },
})
