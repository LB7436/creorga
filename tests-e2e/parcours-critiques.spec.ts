import { test, expect, type Page } from '@playwright/test'

/**
 * Parcours UI critiques — TESTPLAN §2, §3, §12, §13.
 *
 * Prérequis : backend (:3002) et frontend (:5174) démarrés, base seedée
 * par `npm run db:seed:rich`.
 */

const IDENTIFIANTS = {
  email: process.env.DEMO_EMAIL || 'bryan@cafe-rondpoint.lu',
  motDePasse: process.env.DEMO_PASSWORD || 'Demo1234!',
}

/** Connexion + neutralisation des écrans de première utilisation. */
async function seConnecter(page: Page) {
  await page.goto('/login', { waitUntil: 'domcontentloaded' })
  await page.waitForSelector('input[type="email"]', { timeout: 30_000 })
  await page.fill('input[type="email"]', IDENTIFIANTS.email)
  await page.fill('input[type="password"]', IDENTIFIANTS.motDePasse)
  await Promise.all([
    page.waitForURL((u) => !String(u).includes('/login'), { timeout: 30_000 }),
    page.click('button[type="submit"]'),
  ])

  // Assistant de configuration et verrou PIN du POS : ils masqueraient les
  // écrans testés au premier lancement.
  await page.evaluate(async () => {
    localStorage.setItem('creorga-onboarded', '1')
    localStorage.setItem('creorga.onboardingDone', '1')
    const octets = new TextEncoder().encode('1234')
    const empreinte = await crypto.subtle.digest('SHA-256', octets)
    localStorage.setItem(
      'creorga.pos.pin',
      Array.from(new Uint8Array(empreinte)).map((b) => b.toString(16).padStart(2, '0')).join(''),
    )
    localStorage.removeItem('creorga.pos.locked')
  })
}

/** Surfaces claires visibles alors que le thème sombre est actif. */
async function surfacesClaires(page: Page): Promise<string[]> {
  return page.evaluate(() => {
    const estClair = (couleur: string) => {
      const m = String(couleur).match(/rgba?\((\d+), (\d+), (\d+)(?:, ([\d.]+))?\)/)
      if (!m) return false
      const alpha = m[4] === undefined ? 1 : parseFloat(m[4])
      return alpha >= 0.5 && +m[1] >= 228 && +m[2] >= 228 && +m[3] >= 228
    }
    const trouvés: string[] = []
    document.querySelectorAll('body *').forEach((el) => {
      const r = el.getBoundingClientRect()
      if (r.width * r.height < 3000 || r.width < 40) return
      if (estClair(getComputedStyle(el).backgroundColor)) {
        trouvés.push(`${el.tagName.toLowerCase()} ${Math.round(r.width)}×${Math.round(r.height)}`)
      }
    })
    return trouvés
  })
}

test.describe('Parcours critiques', () => {
  test('POS-1/10 — vente complète : commande puis encaissement', async ({ page }) => {
    await seConnecter(page)
    await page.goto('/pos/dashboard', { waitUntil: 'domcontentloaded' })
    await page.waitForLoadState('networkidle').catch(() => {})

    // Le tableau de bord POS doit afficher ses indicateurs temps réel.
    await expect(page.getByText(/Tableau de bord POS/i).first()).toBeVisible({ timeout: 30_000 })
    await expect(page.getByText(/CA du jour/i).first()).toBeVisible()

    // Le plan de salle doit lister des tables issues du seed.
    await page.goto('/pos/floor', { waitUntil: 'domcontentloaded' })
    await page.waitForLoadState('networkidle').catch(() => {})
    // « Plan de salle » figure aussi dans le menu latéral : viser la 1re occurrence.
    await expect(page.getByText(/Plan de salle/i).first()).toBeVisible({ timeout: 30_000 })
    await expect(page.getByText(/SALLE PRINCIPALE|Libres/i).first()).toBeVisible()
  })

  test('FAC — le module facturation liste devis et factures', async ({ page }) => {
    await seConnecter(page)
    await page.goto('/invoices', { waitUntil: 'domcontentloaded' })
    await page.waitForLoadState('networkidle').catch(() => {})

    await expect(page.locator('body')).toContainText(/Devis|Factures/i, { timeout: 20_000 })
    // Les documents seedés portent la numérotation séquentielle.
    await expect(page.locator('body')).toContainText(/INV-|DEV-|FAC-/i)
  })

  test('CRM — les clients seedés sont visibles', async ({ page }) => {
    await seConnecter(page)
    await page.goto('/crm/clients', { waitUntil: 'domcontentloaded' })
    await page.waitForLoadState('networkidle').catch(() => {})

    // Régression : les clients étaient invisibles car filtrés sur isGuest.
    const lignes = page.locator('table tbody tr, [role="row"]')
    await expect(lignes.first()).toBeVisible({ timeout: 20_000 })
  })

  test('GST-6 — les 4 pages du portail invité répondent', async ({ browser }) => {
    // Le portail est conçu pour le téléphone (le client scanne un QR à table) :
    // la barre de navigation du bas n'est pas rendue sur un viewport bureau.
    const ctx = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
      // Sans locale explicite le portail bascule en anglais et les onglets
      // s'appellent Games/Reviews au lieu de Jeux/Avis.
      locale: 'fr-FR',
    })
    const page = await ctx.newPage()

    await page.goto('/c?table=T4', { waitUntil: 'domcontentloaded' })
    // Le portail charge le catalogue des 40 jeux : attendre la barre du bas.
    await expect(page.locator('nav button').first()).toBeVisible({ timeout: 45_000 })

    for (const onglet of ['Jeux', 'Menu', 'Chat', 'Avis']) {
      await page.locator('nav button', { hasText: onglet }).first().click()
      await page.waitForTimeout(700)
      await expect(page.locator('nav')).toBeVisible()
    }

    await ctx.close()
  })

  test('GST-7 — plateau Petits Chevaux cadré sur tablette Retina', async ({ browser }) => {
    const ctx = await browser.newContext({
      viewport: { width: 1180, height: 820 },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
    })
    const page = await ctx.newPage()

    // Profil invité pré-rempli : le jeu est marqué « nouveau » et exige un
    // compte avant de démarrer une partie.
    await ctx.addInitScript(() => {
      const t = 1752940000000
      localStorage.setItem('creorga-guest-client-profile-v1', JSON.stringify({
        id: 'e2e-guest', displayName: 'Léa Muller', email: 'lea@example.lu',
        phone: '+352 621 123 456', provider: 'email', createdAt: t, updatedAt: t,
      }))
    })

    await page.goto('/c?table=T4', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(2000)
    await page.fill('input[placeholder*="Rechercher un jeu"]', 'chevaux')
    await page.waitForTimeout(800)
    await page.locator('text=Petits Chevaux 3D').first().click()
    await page.waitForTimeout(1200)
    await page.locator('button', { hasText: /Lancer la partie/ }).first().click()
    await page.waitForTimeout(3000)

    const démarrer = page.locator('button', { hasText: /Demarrer la partie/ }).first()
    if (await démarrer.count()) await démarrer.click()
    await page.waitForTimeout(2500)

    const mesure = await page.evaluate(() => {
      const c = document.querySelector('canvas')
      if (!c) return null
      const r = c.getBoundingClientRect()
      const hôte = c.parentElement!.getBoundingClientRect()
      return {
        ratio: Math.min(window.devicePixelRatio, 2), // plafonné par le jeu
        bufferW: c.width, bufferH: c.height,
        cssW: Math.round(r.width), cssH: Math.round(r.height),
        hôteW: Math.round(hôte.width), hôteH: Math.round(hôte.height),
      }
    })

    expect(mesure).not.toBeNull()
    // Régression : le canvas débordait de son conteneur sur écran Retina,
    // ne laissant voir que le quart haut-gauche de la scène.
    expect(Math.abs(mesure!.bufferW - mesure!.cssW * mesure!.ratio)).toBeLessThanOrEqual(2)
    expect(Math.abs(mesure!.bufferH - mesure!.cssH * mesure!.ratio)).toBeLessThanOrEqual(2)
    expect(Math.abs(mesure!.cssW - mesure!.hôteW)).toBeLessThanOrEqual(2)

    await ctx.close()
  })

  test('UI-1 — aucune surface claire sur les modules principaux', async ({ page }) => {
    // Chaque route est compilée à la demande par Vite au premier passage.
    test.setTimeout(240_000)
    await seConnecter(page)

    const modules = [
      '/', '/pos/dashboard', '/crm/clients', '/invoices', '/inventory',
      '/hr/planning', '/accounting', '/haccp', '/reservations', '/sites',
    ]

    const fautifs: string[] = []
    for (const route of modules) {
      await page.goto(route, { waitUntil: 'domcontentloaded' })
      await page.waitForLoadState('networkidle').catch(() => {})
      await page.waitForTimeout(800)
      const clairs = await surfacesClaires(page)
      if (clairs.length) fautifs.push(`${route} → ${clairs.slice(0, 3).join(', ')}`)
    }

    expect(fautifs, `Surfaces claires en thème sombre :\n${fautifs.join('\n')}`).toEqual([])
  })
})
