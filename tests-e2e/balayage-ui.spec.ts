import { test, type Page } from '@playwright/test'
import fs from 'fs'
import path from 'path'

/**
 * Phase 4 — balayage UI de toutes les routes déclarées dans App.tsx.
 *
 * Complète `all-pages.spec.ts` (35 routes, erreurs console seules) en
 * ajoutant ce que la sandbox ne couvrait pas :
 *   - écran blanc : moins de 50 caractères de texte utile = P0 ;
 *   - `pageerror` (exception React non rattrapée) ;
 *   - réponses 4xx / 5xx du réseau ;
 *   - libellés cassés : clés i18n brutes, `undefined`, `NaN`,
 *     `[object Object]`, `Invalid Date` ;
 *   - capture d'écran par route, en clair, en sombre et en mobile 390×844.
 *
 * Ce spec CONSTATE : il journalise tout pour le rapport, sans faire échouer
 * la suite sur des défauts cosmétiques.
 */

const ROUTES = [
  '/', '/modules', '/welcome', '/tour', '/demo', '/status',
  '/pos', '/pos/kitchen',
  '/crm', '/clients',
  '/invoices', '/accounting', '/sales', '/billing',
  '/inventory', '/autoorder', '/centralkitchen',
  '/hr', '/haccp', '/maintenance',
  '/agenda', '/catering', '/clickcollect', '/delivery',
  '/qrmenu', '/music', '/ads', '/ads/tv',
  '/reputation', '/reputation/avis', '/reputation/reponses', '/reputation/statistiques',
  '/ai', '/ai/local', '/ai/settings',
  '/owner', '/sites', '/licences', '/referral', '/community', '/formation',
  '/sustainability', '/backup', '/rgpd', '/changelog',
  '/admin', '/api', '/api/marketplace',
  '/settings/modules', '/settings/theme', '/settings/language', '/settings/env-mode',
  '/setup', '/setup/assistant', '/setup/floor-vision',
  '/standalone/calendar', '/standalone/floor', '/standalone/planning', '/standalone/stock',
]

const LIBELLES_CASSES = [
  /\bundefined\b/,
  /\bNaN\b/,
  /\[object Object\]/,
  /Invalid Date/,
  /\b(common|nav|menu|settings|errors)\.[a-z][a-zA-Z.]+/, // clé i18n brute
]

const RACINE_CAPTURES = path.resolve(__dirname, '..', 'tests-qa', 'screenshots', 'run-2026-07-27')

interface Constat {
  route: string
  variante: string
  texteLong: number
  pageErrors: string[]
  consoleErrors: string[]
  reponsesKO: string[]
  libelles: string[]
}

const constats: Constat[] = []

function nomFichier(route: string): string {
  return route === '/' ? 'racine' : route.replace(/^\//, '').replace(/\//g, '-')
}

async function login(page: Page) {
  await page.goto('/login', { waitUntil: 'domcontentloaded' })
  await page.locator('input[type="email"]').fill('admin@creorga.local')
  await page.locator('input[type="password"]').first().fill('Admin1234!')
  await page.locator('button[type="submit"]').first().click()
  await page.waitForURL((u) => !u.pathname.includes('/login'), { timeout: 30_000 })
}

async function balayer(page: Page, route: string, variante: string): Promise<Constat> {
  const pageErrors: string[] = []
  const consoleErrors: string[] = []
  const reponsesKO: string[] = []

  const surErreur = (e: Error) => pageErrors.push(e.message.slice(0, 200))
  const surConsole = (m: any) => {
    if (m.type() === 'error') consoleErrors.push(String(m.text()).slice(0, 200))
  }
  const surReponse = (r: any) => {
    if (r.status() >= 400) reponsesKO.push(`${r.status()} ${r.url().replace(/^https?:\/\/[^/]+/, '')}`)
  }

  page.on('pageerror', surErreur)
  page.on('console', surConsole)
  page.on('response', surReponse)

  try {
    await page.goto(route, { waitUntil: 'domcontentloaded', timeout: 60_000 })
    // Laisse React monter et les requêtes initiales partir.
    await page.waitForTimeout(1200)
  } catch (e: any) {
    pageErrors.push(`NAVIGATION: ${e.message.slice(0, 160)}`)
  }

  const texte = (await page.locator('body').innerText().catch(() => '')) || ''
  const libelles = LIBELLES_CASSES.filter((re) => re.test(texte)).map((re) => {
    const m = texte.match(re)
    return m ? m[0] : String(re)
  })

  const dossier = path.join(RACINE_CAPTURES, variante)
  fs.mkdirSync(dossier, { recursive: true })
  await page
    .screenshot({ path: path.join(dossier, `${nomFichier(route)}.png`), fullPage: false })
    .catch(() => {})

  page.off('pageerror', surErreur)
  page.off('console', surConsole)
  page.off('response', surReponse)

  return { route, variante, texteLong: texte.trim().length, pageErrors, consoleErrors, reponsesKO, libelles }
}

function bilan() {
  fs.mkdirSync(RACINE_CAPTURES, { recursive: true })
  fs.writeFileSync(path.join(RACINE_CAPTURES, 'constats.json'), JSON.stringify(constats, null, 2), 'utf8')

  const ecranBlanc = constats.filter((c) => c.texteLong < 50)
  const exceptions = constats.filter((c) => c.pageErrors.length)
  const libelles = constats.filter((c) => c.libelles.length)
  const reseau = constats.filter((c) => c.reponsesKO.length)

  console.log('\n════ BALAYAGE UI ════')
  console.log(`Routes x variantes : ${constats.length}`)
  console.log(`Ecran blanc (<50 car.) : ${ecranBlanc.length}`)
  for (const c of ecranBlanc) console.log(`   P0 ${c.variante} ${c.route} — ${c.texteLong} car.`)
  console.log(`Exceptions pageerror : ${exceptions.length}`)
  for (const c of exceptions) console.log(`   P0 ${c.variante} ${c.route} — ${c.pageErrors[0]}`)
  console.log(`Libelles casses : ${libelles.length}`)
  for (const c of libelles) console.log(`   ${c.variante} ${c.route} — ${c.libelles.join(', ')}`)
  console.log(`Routes avec 4xx/5xx : ${reseau.length}`)
  for (const c of reseau.slice(0, 25)) {
    console.log(`   ${c.variante} ${c.route} — ${c.reponsesKO.slice(0, 3).join(' | ')}`)
  }
  console.log('═════════════════════\n')
}

test.describe('Phase 4 — balayage UI', () => {
  test.describe.configure({ mode: 'serial' })

  test('clair — toutes les routes', async ({ page }) => {
    test.setTimeout(15 * 60_000)
    await login(page)
    for (const route of ROUTES) constats.push(await balayer(page, route, 'clair'))
  })

  test('sombre — toutes les routes', async ({ page }) => {
    test.setTimeout(15 * 60_000)
    await page.emulateMedia({ colorScheme: 'dark' })
    await login(page)
    for (const route of ROUTES) constats.push(await balayer(page, route, 'sombre'))
  })

  test('mobile 390x844 — toutes les routes', async ({ page }) => {
    test.setTimeout(15 * 60_000)
    await page.setViewportSize({ width: 390, height: 844 })
    await login(page)
    for (const route of ROUTES) constats.push(await balayer(page, route, 'mobile-390x844'))
    bilan()
  })
})
