import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // 5178 = port officiel du portail guest (5176 est réservé à marketing)
  server: { port: 5178, host: true },
})
