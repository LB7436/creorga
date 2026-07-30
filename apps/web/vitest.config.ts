import { defineConfig } from 'vitest/config'
import path from 'path'

// Premier lanceur de tests d'une application front du monorepo.
// Environnement `node` volontairement : les cas couverts ici portent sur de la
// logique (intercepteur HTTP, choix d'URL), pas sur du rendu React. Le `window`
// nécessaire est posé explicitement par chaque test, ce qui évite d'embarquer
// jsdom et rend visible ce dont le code dépend réellement.
export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
