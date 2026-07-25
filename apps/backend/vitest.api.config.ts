import { defineConfig } from 'vitest/config'

/**
 * Suite d'audit API — tests d'intégration contre un serveur REEL.
 *
 *   Terminal 1 : npm run dev        (backend sur :3002)
 *   Terminal 2 : npm run test:api
 *
 * Séparée de vitest.config.ts (tests unitaires hermétiques) : celle-ci
 * a besoin du backend et de PostgreSQL peuplé par `npm run db:seed:rich`.
 * L'URL est surchargeable via API_URL.
 */
export default defineConfig({
  test: {
    include: ['src/**/*.api-test.ts'],
    exclude: ['dist/**', 'node_modules/**'],
    testTimeout: 30_000,
    hookTimeout: 30_000,
    // Les tests partagent une base : exécution séquentielle pour que les
    // compteurs (numéros de commande, soldes) restent déterministes.
    fileParallelism: false,
  },
})
