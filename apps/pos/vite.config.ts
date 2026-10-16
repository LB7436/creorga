import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'node:path'

export default defineConfig({
  plugins: [react()],
  build: { rollupOptions: { input: { app: path.resolve(__dirname, 'index.html'), recovery: path.resolve(__dirname, 'recovery.html') } } },
  server: { port: 5175, host: '127.0.0.1' },
})
