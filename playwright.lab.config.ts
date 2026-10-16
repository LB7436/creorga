import { defineConfig } from '@playwright/test'
export default defineConfig({
  testDir: './tests/browser-lab', testMatch: '**/*.spec.ts', workers: 1, retries: 0,
  timeout: 90000, expect: { timeout: 15000 }, reporter: 'list',
  outputDir: 'test-results/browser-lab',
  use: { channel: 'chrome', headless: true, locale: 'fr-FR', viewport: { width: 1440, height: 1100 },
    trace: 'off', screenshot: 'off', video: 'off' },
})
