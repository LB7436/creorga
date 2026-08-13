import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5177,
    host: true,
    // Même patron qu'apps/web : tous les appels /api sont relatifs, le proxy
    // (dev) ou Caddy (prod) fait suivre au backend — jamais d'URL en dur.
    proxy: {
      '/api': { target: 'http://localhost:3002', changeOrigin: true },
    },
  },
});
