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
    // En local : Google Chrome installé (pas de téléchargement Chromium).
    // En CI, ou avec PLAYWRIGHT_CHROMIUM=1 : Chromium fourni par Playwright —
    // indispensable sur une machine sans Chrome (conteneur, VM d'audit).
    ...(process.env.CI || process.env.PLAYWRIGHT_CHROMIUM === '1'
      ? {}
      : { channel: 'chrome' as const }),
    // PLAYWRIGHT_CHROMIUM_PATH pointe un binaire déjà présent sur la machine,
    // utile quand la version de @playwright/test ne correspond pas au build
    // des navigateurs installés (message « Executable doesn't exist at… »).
    ...(process.env.PLAYWRIGHT_CHROMIUM_PATH
      ? { launchOptions: { executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH, args: ['--no-sandbox'] } }
      : {}),
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
