import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { businessBuildPlugin } from '../../scripts/local/business-build-plugin.mjs'

export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const backendUrl = env.VITE_BACKEND_URL || 'http://localhost:3002'
  const businessOnly = process.env.CREORGA_BUSINESS_ONLY === 'true' || process.env.CREORGA_BUSINESS_ONLY === '1'

  return {
    plugins: [react(), businessBuildPlugin(__dirname, businessOnly)],
    publicDir: businessOnly ? false : 'public',
    resolve: {
      alias: {
        ...(businessOnly ? { '@/optional/entertainment': path.resolve(__dirname, './src/optional/entertainment.business.tsx') } : {}),
        '@': path.resolve(__dirname, './src'),
      },
    },
    server: {
      port: 5174,
      host: '127.0.0.1',
      allowedHosts: ['localhost'],
      proxy: {
        '/api/': {
          target: backendUrl,
          changeOrigin: true,
        },
        '/socket.io': {
          target: backendUrl,
          ws: true,
        },
      },
    },
    // v3.12 #27 — Bundle splitting : split vendor libs into separate chunks
    // for better caching and smaller initial download.
    build: {
      chunkSizeWarningLimit: 1500,
      rollupOptions: {
        input: { app: path.resolve(__dirname, 'index.html'), recovery: path.resolve(__dirname, 'recovery.html') },
        output: {
          manualChunks: {
            'vendor-react':  ['react', 'react-dom', 'react-router-dom'],
            'vendor-charts': ['recharts'],
            'vendor-motion': ['framer-motion'],
            'vendor-icons':  ['lucide-react'],
            'vendor-state':  ['zustand'],
            'vendor-ai':     ['tesseract.js'],
            'vendor-utils':  ['date-fns'],
          },
        },
      },
    },
  }
})
