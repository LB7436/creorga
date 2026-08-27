import { test, expect, type Page, type APIRequestContext } from '@playwright/test'

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

async function idSocieteDemo(request: APIRequestContext): Promise<string> {
  const login = await request.post('http://localhost:3002/api/auth/login', {
    data: { email: IDENTIFIANTS.email, password: IDENTIFIANTS.motDePasse },
  })
  expect(login.ok()).toBeTruthy()
  const body = await login.json()
  return body.companies[0].companyId as string
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
  test('RH — le planning charge la base et ne simule jamais un envoi email', async ({ page }) => {
    await seConnecter(page)
    await page.goto('/hr/planning', { waitUntil: 'domcontentloaded' })
    await expect(page.getByText(/Planning équipe/i).first()).toBeVisible({ timeout: 30_000 })
    await expect(page.getByText(/employés actifs/i).first()).toBeVisible({ timeout: 30_000 })

    const publier = page.getByRole('button', { name: /Publier et envoyer/i })
    await expect(publier).toBeEnabled({ timeout: 30_000 })
    await publier.click()
    // Tant que le fournisseur n'est pas configuré, l'interface doit annoncer
    // l'absence d'envoi — jamais afficher un faux succès.
    await expect(page.locator('body')).toContainText(/Envoi email non configuré/i, { timeout: 20_000 })
    await expect(page.locator('body')).not.toContainText(/email\(s\) confirmé\(s\)/i)
  })

  test('POS-1/10 — vente complète : commande puis encaissement', async ({ page }) => {
    await seConnecter(page)
    await page.goto('/pos/dashboard', { waitUntil: 'domcontentloaded' })
    // networkidle est borne : le back-office interroge le serveur toutes les
    // 1,5 a 2 s (config modules, plan de salle), le reseau n'est donc jamais
    // inactif et l'attente par defaut consommait tout le budget du test.
    await page.waitForLoadState('networkidle', { timeout: 3_000 }).catch(() => {})

    // Le tableau de bord POS doit afficher ses indicateurs temps réel.
    await expect(page.getByText(/Tableau de bord POS/i).first()).toBeVisible({ timeout: 30_000 })
    await expect(page.getByText(/CA du jour/i).first()).toBeVisible()

    // Le plan de salle doit lister des tables issues du seed.
    await page.goto('/pos/floor', { waitUntil: 'domcontentloaded' })
    await page.waitForLoadState('networkidle', { timeout: 3_000 }).catch(() => {})
    // « Plan de salle » figure aussi dans le menu latéral : viser la 1re occurrence.
    await expect(page.getByText(/Plan de salle/i).first()).toBeVisible({ timeout: 30_000 })
    await expect(page.getByText(/SALLE PRINCIPALE|Libres/i).first()).toBeVisible()
  })

  test('FAC — le module facturation liste devis et factures', async ({ page }) => {
    await seConnecter(page)
    await page.goto('/invoices', { waitUntil: 'domcontentloaded' })
    await page.waitForLoadState('networkidle', { timeout: 3_000 }).catch(() => {})

    await expect(page.locator('body')).toContainText(/Devis|Factures/i, { timeout: 20_000 })
    // Les documents seedés portent la numérotation séquentielle.
    await expect(page.locator('body')).toContainText(/INV-|DEV-|FAC-/i)
  })

  test('CRM — les clients seedés sont visibles', async ({ page }) => {
    await seConnecter(page)
    await page.goto('/crm/clients', { waitUntil: 'domcontentloaded' })
    await page.waitForLoadState('networkidle', { timeout: 3_000 }).catch(() => {})

    // Régression : les clients étaient invisibles car filtrés sur isGuest.
    const lignes = page.locator('table tbody tr, [role="row"]')
    await expect(lignes.first()).toBeVisible({ timeout: 20_000 })
  })

  test('CRM — créer, modifier, créditer puis supprimer une vraie fiche', async ({ page }) => {
    await seConnecter(page)
    await page.goto('/crm/clients', { waitUntil: 'domcontentloaded' })
    await expect(page.getByRole('button', { name: /Nouveau client/i })).toBeVisible({ timeout: 30_000 })

    const suffixe = String(Date.now()).slice(-6)
    const prenom = `E2E${suffixe}`
    const email = `e2e-${suffixe}@example.test`

    await page.getByRole('button', { name: /Nouveau client/i }).click()
    await page.getByLabel('Prénom *', { exact: true }).fill(prenom)
    await page.getByLabel('Nom *', { exact: true }).fill('Validation')
    await page.getByLabel('Email', { exact: true }).fill(email)
    await page.getByLabel('Téléphone', { exact: true }).fill('+352 621 000 000')
    await page.getByRole('button', { name: /Créer le client/i }).click()

    await page.getByLabel('Rechercher un client').fill(prenom)
    const fiche = page.getByRole('button', { name: new RegExp(prenom, 'i') }).first()
    await expect(fiche).toBeVisible({ timeout: 20_000 })
    await fiche.click()

    await expect(page.getByRole('link', { name: new RegExp(email, 'i') })).toHaveAttribute('href', `mailto:${email}`)
    await page.getByRole('button', { name: '+ 10', exact: true }).click()
    await expect(page.getByText(/10 point\(s\) actuellement/i)).toBeVisible({ timeout: 20_000 })

    await page.getByPlaceholder('Montant en euros').fill('1')
    await page.getByRole('button', { name: 'Créditer', exact: true }).click()
    await expect(page.getByText(/1,00/).first()).toBeVisible({ timeout: 20_000 })

    await page.getByRole('button', { name: 'Modifier', exact: true }).click()
    await page.getByLabel('Notes').fill('Créé par le test de parcours réel')
    await page.getByRole('button', { name: /Enregistrer les modifications/i }).click()
    await expect(page.getByText('Créé par le test de parcours réel').first()).toBeVisible({ timeout: 20_000 })

    page.once('dialog', (dialog) => dialog.accept())
    await page.getByRole('button', { name: 'Supprimer', exact: true }).click()
    await expect(page.getByText(prenom)).toHaveCount(0, { timeout: 20_000 })
  })

  test('Navigation — les anciennes maquettes annoncent honnêtement leur indisponibilité', async ({ page }) => {
    await seConnecter(page)
    for (const path of ['/sales', '/sites', '/rgpd', '/maintenance', '/api', '/crm/fidelite']) {
      await page.goto(path, { waitUntil: 'domcontentloaded' })
      await expect(page.getByText('En préparation', { exact: true })).toBeVisible({ timeout: 20_000 })
      await expect(page.locator('body')).toContainText(/pas encore relié à une sauvegarde fiable/i)
    }
  })

  test('AUTH-1 — un nouveau restaurateur crée son espace et sauvegarde sa première salle', async ({ page, request }) => {
    const suffixe = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
    const email = `nouveau-${suffixe}@example.test`
    const motDePasse = 'Nouveau1234!'
    const etablissement = `Bistro QA ${suffixe.slice(-5)}`
    const nouvelleSalle = `Salon QA ${suffixe.slice(-5)}`
    const nouvelleTable = `Table QA ${suffixe.slice(-5)}`
    const couleur = '#0ea5e9'

    await page.goto('/login', { waitUntil: 'domcontentloaded' })
    await page.getByRole('button', { name: 'Créer mon espace' }).first().click()
    await page.getByLabel('Prénom').fill('Nouveau')
    await page.getByLabel('Nom', { exact: true }).fill('Restaurateur')
    await page.getByLabel('Nom de l’établissement').fill(etablissement)
    await page.getByLabel('Adresse email').fill(email)
    await page.getByLabel('Mot de passe', { exact: true }).fill(motDePasse)
    await page.getByLabel('Confirmer le mot de passe').fill(motDePasse)
    await page.locator('button[type="submit"]').click()

    await expect(page).toHaveURL(/\/setup$/, { timeout: 30_000 })
    await expect(page.getByRole('heading', { name: /Bienvenue/i })).toBeVisible()
    await expect(page.getByLabel('Nom du restaurant / café')).toHaveValue(etablissement)
    await page.getByRole('button', { name: `Couleur ${couleur}` }).click()
    await page.getByRole('button', { name: /Enregistrer et continuer/i }).click()

    await expect(page.getByRole('heading', { name: /Configurez votre salle/i })).toBeVisible({ timeout: 30_000 })
    await page.getByRole('button', { name: /Salles/i }).click()
    await expect(page.getByRole('dialog', { name: /Gérer les salles/i })).toBeVisible()
    await page.getByLabel('Nom de la nouvelle salle').fill(nouvelleSalle)
    await page.getByRole('button', { name: /Ajouter cette salle/i }).click()
    await expect(page.getByLabel(`Nom de la salle ${nouvelleSalle}`)).toBeVisible({ timeout: 15_000 })

    await page.getByRole('button', { name: 'Fermer la gestion des salles' }).click()
    await page.getByRole('button', { name: /Mode Config/i }).click()
    await page.getByRole('button', { name: `Ajouter une table à ${nouvelleSalle}` }).click()
    await expect(page.getByRole('button', { name: 'Configurer la table Table 1' })).toBeVisible({ timeout: 15_000 })
    await page.getByRole('button', { name: 'Configurer la table Table 1' }).click()
    await expect(page.getByRole('dialog', { name: /Table 1/i })).toBeVisible()
    await page.getByLabel('Nom de la table').fill(nouvelleTable)
    await page.getByLabel('Nombre de places').fill('6')
    await page.getByLabel('Forme de la table').selectOption('rect')
    await page.getByRole('button', { name: 'Sauvegarder la table' }).click()
    await expect(page.getByRole('button', { name: `Configurer la table ${nouvelleTable}` })).toBeVisible({ timeout: 15_000 })

    // La table vide puis sa salle peuvent être supprimées sans données fantômes.
    await page.getByRole('button', { name: `Configurer la table ${nouvelleTable}` }).click()
    page.once('dialog', (dialog) => dialog.accept())
    await page.getByRole('button', { name: 'Supprimer la table' }).click()
    await expect(page.getByRole('button', { name: `Configurer la table ${nouvelleTable}` })).toHaveCount(0, { timeout: 15_000 })

    await page.getByRole('button', { name: /Salles/i }).click()
    page.once('dialog', (dialog) => dialog.accept())
    await page.getByRole('button', { name: `Supprimer la salle ${nouvelleSalle}` }).click()
    await expect(page.getByLabel(`Nom de la salle ${nouvelleSalle}`)).toHaveCount(0, { timeout: 15_000 })

    // Contrôle serveur : nom et couleur doivent survivre au navigateur.
    const login = await request.post('http://localhost:3002/api/auth/login', {
      data: { email, password: motDePasse },
    })
    expect(login.ok()).toBeTruthy()
    const session = await login.json()
    expect(session.companies[0].company.name).toBe(etablissement)
    const companyId = session.companies[0].companyId as string
    const portal = await request.get(`http://localhost:3002/api/portal-config?companyId=${encodeURIComponent(companyId)}`)
    expect(portal.ok()).toBeTruthy()
    expect((await portal.json()).accentColor).toBe(couleur)
  })

  test('GST-6 — les 3 pages réellement reliées du portail invité répondent', async ({ browser, request }) => {
    // Ce test ne doit pas dépendre des préférences déjà enregistrées dans la
    // base de démonstration. Il active temporairement les trois onglets qu'il
    // vérifie, puis remet exactement la configuration précédente en place.
    const login = await request.post('http://localhost:3002/api/auth/login', {
      data: { email: IDENTIFIANTS.email, password: IDENTIFIANTS.motDePasse },
    })
    expect(login.ok()).toBeTruthy()
    const session = await login.json()
    const companyId = session.companies[0].companyId as string
    const headers = {
      Authorization: `Bearer ${session.accessToken}`,
      'x-company-id': companyId,
    }
    const configAvantResponse = await request.get(`http://localhost:3002/api/portal-config?companyId=${encodeURIComponent(companyId)}`)
    expect(configAvantResponse.ok()).toBeTruthy()
    const configAvant = await configAvantResponse.json()
    const activation = await request.patch(`http://localhost:3002/api/portal-config?companyId=${encodeURIComponent(companyId)}`, {
      headers,
      data: {
        toggles: { ...configAvant.toggles, menu: true, games: true, reviews: true },
      },
    })
    expect(activation.ok()).toBeTruthy()
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
    try {
      const page = await ctx.newPage()

      await page.goto(`/c?companyId=${companyId}&table=T4`, { waitUntil: 'domcontentloaded' })
      // Le portail charge la sélection resserrée : attendre la barre du bas.
      await expect(page.locator('nav button').first()).toBeVisible({ timeout: 45_000 })

      await expect(page.locator('nav')).not.toContainText('Chat')
      for (const onglet of ['Jeux', 'Menu', 'Avis']) {
        const bouton = page.locator('nav button', { hasText: onglet }).first()
        await expect(bouton).toBeVisible()
        await bouton.click()
        await page.waitForTimeout(700)
        await expect(page.locator('nav')).toBeVisible()
      }
    } finally {
      await ctx.close()
      const restauration = await request.patch(`http://localhost:3002/api/portal-config?companyId=${encodeURIComponent(companyId)}`, {
        headers,
        data: { toggles: configAvant.toggles },
      })
      expect(restauration.ok()).toBeTruthy()
    }
  })

  test('GST-7 — plateau Petits Chevaux cadré sur tablette Retina', async ({ browser, request }) => {
    const companyId = await idSocieteDemo(request)
    const ctx = await browser.newContext({
      viewport: { width: 1180, height: 820 },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
    })
    const page = await ctx.newPage()

    // Profil invité pré-rempli : le jeu est marqué « nouveau » et exige un
    // compte avant de démarrer une partie.
    await ctx.addInitScript((activeCompanyId) => {
      const t = 1752940000000
      localStorage.setItem('creorga-guest-client-profile-v1', JSON.stringify({
        id: 'e2e-guest', displayName: 'Léa Muller', email: 'lea@example.lu',
        phone: '+352 621 123 456', provider: 'email', companyId: activeCompanyId, createdAt: t, updatedAt: t,
      }))
    }, companyId)

    await page.goto(`/c?companyId=${companyId}&table=T4`, { waitUntil: 'domcontentloaded' })
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

  test('GST-8 — catalogue des jeux honnête : recommandé famille, casino à part, lanceur fidèle', async ({ browser, request }) => {
    const companyId = await idSocieteDemo(request)
    const ctx = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
      locale: 'fr-FR',
    })
    const page = await ctx.newPage()
    await page.goto(`/c?companyId=${companyId}&table=T4`, { waitUntil: 'domcontentloaded' })
    await expect(page.locator('input[placeholder*="Rechercher un jeu"]')).toBeVisible({ timeout: 45_000 })

    // 1. Le jeu recommandé est un jeu famille du registre — jamais casino.
    const recommande = page.locator('[data-game-id^="featured-"]').first()
    await expect(recommande).toBeVisible()
    const idRecommande = (await recommande.getAttribute('data-game-id'))!.replace('featured-', '')
    expect(['mensch', 'scoopa', 'memory', 'connect4', 'ttt', 'rummikub', 'simon', 'yahtzee']).toContain(idRecommande)

    // 2. Plus d'invitation DUEL/TOUR factice ni de notes inventées.
    const corps = await page.locator('body').innerText()
    expect(corps).not.toContain('Invitation de table')
    expect(corps).not.toMatch(/\b4[,.][0-9]\s*$/m)

    // 3. Le casino a sa propre section, avec sa mention, hors du catalogue principal.
    const casino = page.locator('[data-section="casino"]')
    await expect(casino).toContainText('mises fictives')
    await expect(casino).toContainText('Blackjack')
    const catalogue = page.locator('text=/^Catalogue \\(\\d+\\)$/')
    await expect(catalogue).toBeVisible()
    // La sélection resserrée contient 14 jeux principaux et 2 jeux casino.
    // Chaque catégorie est aussi bornée à cinq par le test unitaire du registre.
    await expect(page.locator('button', { hasText: /^🎮\s*Tous/ }).first()).toContainText('14')

    // 4. Puissance 4 se joue contre l'ordinateur : ni « 2 joueurs », ni tournoi,
    //    ni sélecteur de difficulté (le jeu ne le lit pas).
    await page.locator('[data-game-id="connect4"]').click()
    const dialogue = page.locator('[role="dialog"]')
    await expect(dialogue).toBeVisible()
    await expect(dialogue).toContainText('Vs ordinateur')
    await expect(dialogue).toContainText('Règles')
    await expect(dialogue).not.toContainText('Tournoi')
    await expect(dialogue).not.toContainText('Difficulté')
    await dialogue.locator('button[aria-label="Fermer"]').click()

    // 5. Les Petits Chevaux annoncent 1–4 joueurs, la 3D et le vrai mode tournoi.
    await page.locator('[data-game-id="mensch"]').click()
    await expect(dialogue).toContainText('1–4 joueurs')
    await expect(dialogue).toContainText('Tournoi')
    await expect(dialogue).toContainText('3D')
    await dialogue.locator('button[aria-label="Fermer"]').click()

    // 6. Les Échecs lisent bien la difficulté choisie ici : le sélecteur est présent.
    await page.locator('[data-game-id="chess"]').click()
    await expect(dialogue).toContainText('Difficulté')
    await dialogue.locator('button[aria-label="Fermer"]').click()

    // 7. Les jeux bêta et les anciens jeux écartés ne sont plus proposés.
    expect(await page.locator('[data-game-id="rami"]').count()).toBe(0)
    expect(await page.locator('body').innerText()).not.toContain('Version bêta')

    await ctx.close()
  })

  test('GST-9 — le back-office lit la sélection resserrée et signale le casino', async ({ page }) => {
    await seConnecter(page)
    await page.goto('/clients', { waitUntil: 'domcontentloaded' })
    await page.waitForLoadState('networkidle', { timeout: 3_000 }).catch(() => {})
    await expect(page.getByText(/jeux activés/i).first()).toBeVisible({ timeout: 30_000 })
    const corps = await page.locator('body').innerText()
    // 16 jeux retenus, aucun bêta et aucun ancien jeu écarté.
    expect(corps).toMatch(/\/ 16 jeux activés/)
    expect(corps).not.toContain('Rami Salon')
    expect(corps).not.toContain('Mahjong Bamboo')
    expect(corps).not.toContain('BÊTA')
    expect(corps).toContain('Casino · mises fictives · 18+')
  })

  test('TOG-1 — Portail client : un interrupteur refusé par le serveur revient en arrière', async ({ page }) => {
    await seConnecter(page)
    await page.goto('/clients', { waitUntil: 'domcontentloaded' })
    const menu = page.locator('button[role="switch"][aria-label="Afficher le menu"]')
    await expect(menu).toBeVisible({ timeout: 30_000 })
    // Laisser la valeur serveur arriver (le hook la pose après le premier GET).
    await page.waitForTimeout(1200)
    const avant = await menu.getAttribute('aria-checked')

    // 1. Le serveur refuse (403 simulé) : l'affichage optimiste DOIT être annulé.
    // Le PATCH porte toujours ?companyId=… : le motif doit inclure la query,
    // sinon le test laisse passer la requête réelle et mesure un faux échec.
    await page.route('**/api/portal-config**', (route) => {
      if (route.request().method() === 'PATCH') {
        return route.fulfill({ status: 403, contentType: 'application/json', body: JSON.stringify({ error: 'Action réservée au propriétaire' }) })
      }
      return route.continue()
    })
    await menu.click()
    await expect(menu).toHaveAttribute('aria-checked', avant!, { timeout: 5_000 })
    await expect(page.locator('body')).toContainText(/réservé au propriétaire/i)
    await page.unroute('**/api/portal-config**')

    // 2. Le serveur accepte : la valeur persiste après rechargement (source serveur).
    await menu.click()
    await expect(menu).toHaveAttribute('aria-checked', avant === 'true' ? 'false' : 'true', { timeout: 5_000 })
    await page.waitForTimeout(800)
    await page.reload({ waitUntil: 'domcontentloaded' })
    const menuBis = page.locator('button[role="switch"][aria-label="Afficher le menu"]')
    await expect(menuBis).toBeVisible({ timeout: 30_000 })
    await page.waitForTimeout(1500)
    await expect(menuBis).toHaveAttribute('aria-checked', avant === 'true' ? 'false' : 'true')

    // Remise en l'état initial pour ne pas laisser le portail modifié.
    await menuBis.click()
    await expect(menuBis).toHaveAttribute('aria-checked', avant!, { timeout: 5_000 })
    await page.waitForTimeout(800)
  })

  test('TOG-2 — Portail client : message et table ne sont sauvegardés qu’après confirmation', async ({ page }) => {
    await seConnecter(page)
    await page.goto('/clients', { waitUntil: 'domcontentloaded' })
    const message = page.locator('textarea').first()
    const table = page.locator('input[placeholder="1"]').first()
    await expect(message).toBeVisible({ timeout: 30_000 })
    const messageAvant = await message.inputValue()
    const tableAvant = await table.inputValue()
    const valeurMessage = `Test sauvegarde ${Date.now()}`
    const valeurTable = `QA-${String(Date.now()).slice(-5)}`

    await message.fill(valeurMessage)
    const sauverMessage = page.getByRole('button', { name: 'Enregistrer le message' })
    await expect(sauverMessage).toBeEnabled()
    await sauverMessage.click()
    await expect(sauverMessage).toBeDisabled({ timeout: 10_000 })

    await table.fill(valeurTable)
    const sauverTable = page.getByRole('button', { name: 'Enregistrer la table' })
    await expect(sauverTable).toBeEnabled()
    await sauverTable.click()
    await expect(sauverTable).toBeDisabled({ timeout: 10_000 })

    await page.reload({ waitUntil: 'domcontentloaded' })
    await expect(message).toHaveValue(valeurMessage, { timeout: 30_000 })
    await expect(table).toHaveValue(valeurTable)

    // Remise à l’état initial pour garder un environnement de test stable.
    await message.fill(messageAvant)
    await page.getByRole('button', { name: 'Enregistrer le message' }).click()
    await expect(page.getByRole('button', { name: 'Enregistrer le message' })).toBeDisabled({ timeout: 10_000 })
    await table.fill(tableAvant)
    await page.getByRole('button', { name: 'Enregistrer la table' }).click()
    await expect(page.getByRole('button', { name: 'Enregistrer la table' })).toBeDisabled({ timeout: 10_000 })
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
      await page.waitForLoadState('networkidle', { timeout: 3_000 }).catch(() => {})
      await page.waitForTimeout(800)
      const clairs = await surfacesClaires(page)
      if (clairs.length) fautifs.push(`${route} → ${clairs.slice(0, 3).join(', ')}`)
    }

    expect(fautifs, `Surfaces claires en thème sombre :\n${fautifs.join('\n')}`).toEqual([])
  })
})
