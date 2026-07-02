import { test, expect } from '@playwright/test'

/**
 * Parcours critiques Creorga :
 *  1. L'API répond (health check)
 *  2. La page de login s'affiche
 *  3. Login avec l'admin fallback (fonctionne sans DB) → arrivée sur /welcome
 *  4. Le portail client public /c est accessible sans authentification
 *  5. Les routes protégées refusent bien les requêtes anonymes
 */

test('l\'API répond au health check', async ({ request }) => {
  const res = await request.get('http://localhost:3002/api/health')
  expect(res.ok()).toBeTruthy()
  const body = await res.json()
  expect(body.status).toBe('ok')
})

test('la page de login s\'affiche', async ({ page }) => {
  await page.goto('/login')
  await expect(page.locator('input[type="email"]')).toBeVisible()
  await expect(page.locator('input[type="password"], input[placeholder="••••••••"]').first()).toBeVisible()
})

test('login admin fallback → welcome', async ({ page }) => {
  await page.goto('/login')
  await page.locator('input[type="email"]').fill('admin@creorga.local')
  await page.locator('input[placeholder="••••••••"]').fill('Admin1234!')
  await page.locator('button[type="submit"]').click()
  await page.waitForURL('**/welcome', { timeout: 15_000 })
  expect(page.url()).toContain('/welcome')
})

test('le portail client public /c est accessible sans login', async ({ page }) => {
  const res = await page.goto('/c?table=1')
  expect(res?.ok()).toBeTruthy()
  // pas de redirection vers /login
  expect(page.url()).toContain('/c')
})

test('les routes protégées refusent les anonymes', async ({ request }) => {
  for (const route of ['/api/stats', '/api/tables', '/api/products', '/api/owner/audit']) {
    const res = await request.get(`http://localhost:3002${route}`)
    expect(res.status(), `${route} doit renvoyer 401`).toBe(401)
  }
})
