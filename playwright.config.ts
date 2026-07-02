import { defineConfig } from '@playwright/test'

/**
 * Tests e2e Creorga — démarre le backend (mode fallback sans DB) et le
 * frontend web, puis déroule les parcours critiques dans Chromium.
 *
 *   npx playwright test
 */
export default defineConfig({
  testDir: './tests-e2e',
  timeout: 60_000,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? 'github' : 'list',
  use: {
    baseURL: 'http://localhost:5174',
    // Utilise le Google Chrome installé (pas de téléchargement Chromium)
    channel: 'chrome',
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  webServer: [
    {
      command: 'npm run dev --workspace=apps/backend',
      url: 'http://localhost:3002/api/health',
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
    },
    {
      command: 'npm run dev --workspace=apps/web',
      url: 'http://localhost:5174',
      reuseExistingServer: !process.env.CI,
      timeout: 60_000,
    },
  ],
})
