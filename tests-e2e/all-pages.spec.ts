import { test, expect, type Page } from '@playwright/test'

/**
 * Ouvre toutes les pages principales de l'app web après login et vérifie :
 *  - la page répond (pas de crash React / écran blanc)
 *  - aucune erreur console fatale
 */

const PAGES = [
  '/',
  '/modules',
  '/pos',
  '/pos/kitchen',
  '/crm',
  '/clients',
  '/invoices',
  '/inventory',
  '/hr',
  '/haccp',
  '/accounting',
  '/sales',
  '/agenda',
  '/reputation',
  '/reputation/avis',
  '/ads',
  '/ai',
  '/owner',
  '/qrmenu',
  '/clickcollect',
  '/delivery',
  '/catering',
  '/maintenance',
  '/music',
  '/billing',
  '/backup',
  '/rgpd',
  '/changelog',
  '/community',
  '/formation',
  '/settings/modules',
  '/settings/theme',
  '/settings/language',
  '/admin',
  '/api',
]

async function login(page: Page) {
  await page.goto('/login')
  await page.locator('input[type="email"]').fill('admin@creorga.local')
  await page.locator('input[placeholder="••••••••"]').fill('Admin1234!')
  await page.locator('button[type="submit"]').click()
  await page.waitForURL('**/welcome', { timeout: 20_000 })
}

test('toutes les pages se chargent sans crash', async ({ page }) => {
  test.setTimeout(300_000)

  const fatalErrors: string[] = []
  page.on('pageerror', (err) => fatalErrors.push(`pageerror: ${err.message}`))

  await login(page)

  const broken: string[] = []
  for (const path of PAGES) {
    fatalErrors.length = 0
    try {
      await page.goto(path, { waitUntil: 'domcontentloaded', timeout: 20_000 })
      await page.waitForTimeout(600)
      // Écran blanc = racine React vide
      const rootContent = await page.locator('#root').innerHTML().catch(() => '')
      if (!rootContent || rootContent.length < 50) {
        broken.push(`${path}: écran blanc (root vide)`)
        continue
      }
      // Redirection inattendue vers /login = session perdue
      if (page.url().includes('/login')) {
        broken.push(`${path}: redirigé vers /login`)
        continue
      }
      if (fatalErrors.length) {
        broken.push(`${path}: ${fatalErrors[0]}`)
      }
    } catch (e: any) {
      broken.push(`${path}: navigation échouée (${e?.message?.slice(0, 80)})`)
    }
  }

  expect(broken, `Pages cassées:\n${broken.join('\n')}`).toEqual([])
})
