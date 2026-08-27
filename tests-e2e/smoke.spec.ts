import { test, expect, type APIRequestContext } from '@playwright/test'

async function creerEntreprisePortail(request: APIRequestContext, label: string) {
  const suffixe = `${Date.now()}-${label}-${Math.random().toString(36).slice(2, 8)}`
  const email = `portail-${suffixe}@example.test`
  const password = 'PortailIsolation123!'
  const registration = await request.post('http://localhost:3002/api/auth/register', {
    data: { email, password, firstName: 'Portail', lastName: label, companyName: `Restaurant ${label}` },
  })
  expect(registration.status()).toBe(201)
  const account = await registration.json()
  const companyId = account.companies[0].companyId as string
  const headers = { Authorization: `Bearer ${account.accessToken}`, 'x-company-id': companyId }

  const categoryResponse = await request.post('http://localhost:3002/api/categories', {
    headers,
    data: { name: `Carte ${label}`, icon: '🍽️', sortOrder: 0 },
  })
  expect(categoryResponse.status()).toBe(201)
  const category = await categoryResponse.json()
  const productResponse = await request.post('http://localhost:3002/api/products', {
    headers,
    data: {
      categoryId: category.id,
      name: `Plat exclusif ${label}`,
      description: `Uniquement chez ${label}`,
      price: label === 'A' ? 12.5 : 21.75,
      taxRate: 17,
      allergens: [],
      sortOrder: 0,
    },
  })
  expect(productResponse.status()).toBe(201)
  const product = await productResponse.json()

  const configResponse = await request.patch(`http://localhost:3002/api/portal-config?companyId=${encodeURIComponent(companyId)}`, {
    headers,
    data: {
      welcomeMessage: `Bienvenue ${label}`,
      accentColor: label === 'A' ? '#2563eb' : '#dc2626',
      toggles: { menu: true, order: true, games: true, reviews: true },
    },
  })
  expect(configResponse.ok()).toBeTruthy()

  return { email, password, companyId, headers, product }
}

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

test('le QR menu affiche uniquement le vrai catalogue et encode l’entreprise', async ({ page, request }) => {
  const entreprise = await creerEntreprisePortail(request, 'QR')
  const réponsesMenu: number[] = []
  page.on('response', (response) => {
    if (response.url().includes('/api/portal-config/menu')) réponsesMenu.push(response.status())
  })
  await page.goto('/login')
  await page.locator('input[type="email"]').fill(entreprise.email)
  await page.locator('input[placeholder="••••••••"]').fill(entreprise.password)
  await page.locator('button[type="submit"]').click()
  await page.waitForURL((url) => !url.pathname.includes('/login'), { timeout: 15_000 })
  await page.goto('/qrmenu')

  await expect(page.getByRole('heading', { name: 'Générateur QR Menu' })).toBeVisible()
  await expect(page.getByText('Carte POS synchronisée')).toBeVisible()
  await expect(page.getByText('Plat exclusif QR')).toBeVisible()
  await expect(page.locator('body')).not.toContainText('Entrecôte grillée')
  const portail = page.getByRole('link', { name: 'Ouvrir et tester le portail' })
  await expect(portail).toHaveAttribute('href', new RegExp(`/c\\?companyId=${entreprise.companyId}&table=1$`))
  expect(réponsesMenu.length).toBeGreaterThan(0)
  expect(réponsesMenu.every((status) => status === 200)).toBe(true)
})

test('deux portails clients restent totalement séparés de bout en bout', async ({ page, request }) => {
  const a = await creerEntreprisePortail(request, 'A')
  const b = await creerEntreprisePortail(request, 'B')

  const [configA, configB, menuA, menuB] = await Promise.all([
    request.get(`http://localhost:3002/api/portal-config?companyId=${a.companyId}`),
    request.get(`http://localhost:3002/api/portal-config?companyId=${b.companyId}`),
    request.get(`http://localhost:3002/api/portal-config/menu?companyId=${a.companyId}`),
    request.get(`http://localhost:3002/api/portal-config/menu?companyId=${b.companyId}`),
  ])
  expect((await configA.json()).welcomeMessage).toBe('Bienvenue A')
  expect((await configB.json()).welcomeMessage).toBe('Bienvenue B')
  const carteA = JSON.stringify(await menuA.json())
  const carteB = JSON.stringify(await menuB.json())
  expect(carteA).toContain('Plat exclusif A')
  expect(carteA).not.toContain('Plat exclusif B')
  expect(carteB).toContain('Plat exclusif B')
  expect(carteB).not.toContain('Plat exclusif A')

  const guestEmail = `convive-${Date.now()}@example.test`
  const guest = await request.post('http://localhost:3002/api/portal-config/client', {
    data: { companyId: a.companyId, displayName: 'Convive A', email: guestEmail, phone: '+352621111111' },
  })
  expect(guest.status()).toBe(201)
  const review = await request.post('http://localhost:3002/api/portal-config/client-events', {
    data: {
      companyId: a.companyId,
      type: 'review',
      profile: { email: guestEmail },
      payload: { rating: 5, comment: 'Avis uniquement A' },
    },
  })
  expect(review.status()).toBe(201)
  expect((await review.json()).persisted).toBe(true)

  const [clientsA, clientsB, reviewsA, reviewsB] = await Promise.all([
    request.get('http://localhost:3002/api/crm/customers', { headers: a.headers }),
    request.get('http://localhost:3002/api/crm/customers', { headers: b.headers }),
    request.get(`http://localhost:3002/api/portal-config/client-events?companyId=${a.companyId}`, { headers: a.headers }),
    request.get(`http://localhost:3002/api/portal-config/client-events?companyId=${b.companyId}`, { headers: b.headers }),
  ])
  expect(JSON.stringify(await clientsA.json())).toContain(guestEmail)
  expect(JSON.stringify(await clientsB.json())).not.toContain(guestEmail)
  expect(JSON.stringify(await reviewsA.json())).toContain('Avis uniquement A')
  expect(JSON.stringify(await reviewsB.json())).not.toContain('Avis uniquement A')

  const table = `T-${String(Date.now()).slice(-6)}`
  const order = await request.post('http://localhost:3002/api/guest/orders', {
    data: { companyId: a.companyId, tableId: table, items: [{ productId: a.product.id, qty: 2 }] },
  })
  expect(order.status()).toBe(201)
  const orderBody = await order.json()
  expect(orderBody.total).toBe(25)
  const billA = await request.get(`http://localhost:3002/api/guest/bill/${table}?companyId=${a.companyId}`)
  const billB = await request.get(`http://localhost:3002/api/guest/bill/${table}?companyId=${b.companyId}`)
  expect((await billA.json()).count).toBe(1)
  expect((await billB.json()).count).toBe(0)

  await request.post('http://localhost:3002/api/game-scores', { data: { companyId: a.companyId, gameId: 'memory', score: 111, playerName: 'Joueur A', tableId: table } })
  await request.post('http://localhost:3002/api/game-scores', { data: { companyId: b.companyId, gameId: 'memory', score: 999, playerName: 'Joueur B', tableId: table } })
  const scoresA = await request.get(`http://localhost:3002/api/game-scores/all/top?companyId=${a.companyId}`)
  const scoresB = await request.get(`http://localhost:3002/api/game-scores/all/top?companyId=${b.companyId}`)
  const scoresABody = JSON.stringify(await scoresA.json())
  const scoresBBody = JSON.stringify(await scoresB.json())
  expect(scoresABody).toContain('Joueur A')
  expect(scoresABody).not.toContain('Joueur B')
  expect(scoresBBody).toContain('Joueur B')

  await page.goto(`/c?companyId=${a.companyId}&table=${table}`)
  await expect(page.locator('nav')).toBeVisible({ timeout: 45_000 })
  await expect(page.locator('nav')).not.toContainText('Chat')
  await page.locator('nav button', { hasText: 'Menu' }).click()
  await expect(page.getByText('Plat exclusif A')).toBeVisible()
  await expect(page.locator('body')).not.toContainText('Plat exclusif B')
})

test('les relations métier refusent les identifiants appartenant à une autre société', async ({ request }) => {
  const a = await creerEntreprisePortail(request, 'SEC-A')
  const b = await creerEntreprisePortail(request, 'SEC-B')

  const fournisseurBResponse = await request.post('http://localhost:3002/api/inventory/suppliers', {
    headers: b.headers,
    data: { name: 'Fournisseur privé B' },
  })
  expect(fournisseurBResponse.status()).toBe(201)
  const fournisseurB = await fournisseurBResponse.json()

  const fournisseurEtranger = await request.post('http://localhost:3002/api/inventory/ingredients', {
    headers: a.headers,
    data: { name: 'Intrusion fournisseur', unit: 'kg', supplierId: fournisseurB.id },
  })
  expect(fournisseurEtranger.status()).toBe(400)

  const ingredientBResponse = await request.post('http://localhost:3002/api/inventory/ingredients', {
    headers: b.headers,
    data: { name: 'Ingrédient privé B', unit: 'kg', supplierId: fournisseurB.id },
  })
  expect(ingredientBResponse.status()).toBe(201)
  const ingredientB = await ingredientBResponse.json()

  const recetteEtrangere = await request.put(`http://localhost:3002/api/inventory/recipes/${a.product.id}`, {
    headers: a.headers,
    data: { items: [{ ingredientId: ingredientB.id, quantity: 1 }] },
  })
  expect(recetteEtrangere.status()).toBe(400)

  const fournisseurAResponse = await request.post('http://localhost:3002/api/inventory/suppliers', {
    headers: a.headers,
    data: { name: 'Fournisseur A' },
  })
  expect(fournisseurAResponse.status()).toBe(201)
  const fournisseurA = await fournisseurAResponse.json()
  const ingredientAResponse = await request.post('http://localhost:3002/api/inventory/ingredients', {
    headers: a.headers,
    data: { name: 'Stock contrôlé A', unit: 'kg', currentStock: 2, supplierId: fournisseurA.id },
  })
  expect(ingredientAResponse.status()).toBe(201)
  const ingredientA = await ingredientAResponse.json()
  const commandeResponse = await request.post('http://localhost:3002/api/inventory/purchase-orders', {
    headers: a.headers,
    data: { supplierId: fournisseurA.id, items: [{ ingredientId: ingredientA.id, quantity: 3, unitCost: 4 }] },
  })
  expect(commandeResponse.status()).toBe(201)
  const commande = await commandeResponse.json()
  const premiereReception = await request.put(`http://localhost:3002/api/inventory/purchase-orders/${commande.id}/receive`, { headers: a.headers })
  const secondeReception = await request.put(`http://localhost:3002/api/inventory/purchase-orders/${commande.id}/receive`, { headers: a.headers })
  expect(premiereReception.ok()).toBeTruthy()
  expect(secondeReception.status()).toBe(409)
  const stockA = await request.get('http://localhost:3002/api/inventory/ingredients', { headers: a.headers })
  const ingredientApresReception = (await stockA.json()).find((item: any) => item.id === ingredientA.id)
  expect(ingredientApresReception.currentStock).toBe(5)

  const clientBResponse = await request.post('http://localhost:3002/api/crm/customers', {
    headers: b.headers,
    data: { firstName: 'Client', lastName: 'Privé B', email: `prive-b-${Date.now()}@example.test` },
  })
  expect(clientBResponse.status()).toBe(201)
  const clientB = await clientBResponse.json()

  const avisEtranger = await request.post('http://localhost:3002/api/reputation/reviews', {
    headers: a.headers,
    data: { customerId: clientB.id, platform: 'INTERNAL', rating: 5, comment: 'Ne doit pas être créé' },
  })
  expect(avisEtranger.status()).toBe(400)

  const devisEtranger = await request.post('http://localhost:3002/api/events/quotes', {
    headers: a.headers,
    data: {
      customerId: clientB.id,
      eventName: 'Événement interdit',
      eventDate: new Date(Date.now() + 86_400_000).toISOString(),
      items: [{ description: 'Menu', quantity: 1, unitPrice: 10 }],
    },
  })
  expect(devisEtranger.status()).toBe(400)

  // Le userId envoyé par le navigateur est ignoré : la mémoire reste liée au
  // propriétaire du JWT, aussi bien à l'écriture qu'à la lecture.
  const apprentissage = await request.post('http://localhost:3002/api/agent/memory/learn', {
    headers: a.headers,
    data: { userId: 'identite-usurpee', entity: 'Test JWT', fact: 'mémoire liée au jeton' },
  })
  expect(apprentissage.ok()).toBeTruthy()
  const rappel = await request.get('http://localhost:3002/api/agent/memory/recall?userId=autre-usurpation&entity=Test%20JWT', {
    headers: a.headers,
  })
  expect(rappel.ok()).toBeTruthy()
  expect(JSON.stringify(await rappel.json())).toContain('mémoire liée au jeton')

  const pubA = await request.post('http://localhost:3002/api/ads', {
    headers: a.headers,
    data: { title: 'Publicité privée A', durationSec: 8, isLive: true },
  })
  expect(pubA.ok()).toBeTruthy()
  const [pubsA, pubsB] = await Promise.all([
    request.get(`http://localhost:3002/api/ads/live?companyId=${a.companyId}`),
    request.get(`http://localhost:3002/api/ads/live?companyId=${b.companyId}`),
  ])
  expect(JSON.stringify(await pubsA.json())).toContain('Publicité privée A')
  expect(JSON.stringify(await pubsB.json())).not.toContain('Publicité privée A')

  const veilleA = await request.put('http://localhost:3002/api/affichage/creneau-vide', {
    headers: a.headers,
    data: { mode: 'message', message: 'Écran privé A' },
  })
  expect(veilleA.ok()).toBeTruthy()
  const [programmeA, programmeB] = await Promise.all([
    request.get(`http://localhost:3002/api/affichage/maintenant?companyId=${a.companyId}`),
    request.get(`http://localhost:3002/api/affichage/maintenant?companyId=${b.companyId}`),
  ])
  expect(JSON.stringify(await programmeA.json())).toContain('Écran privé A')
  expect(JSON.stringify(await programmeB.json())).not.toContain('Écran privé A')
})

test('l’écran TV public répond et affiche un état de veille au lieu d’une page noire', async ({ page, request }) => {
  const entreprise = await creerEntreprisePortail(request, 'TV')
  const [programmation, publicités] = await Promise.all([
    request.get(`http://localhost:3002/api/affichage/maintenant?companyId=${entreprise.companyId}`),
    request.get(`http://localhost:3002/api/ads/live?companyId=${entreprise.companyId}`),
  ])
  expect(programmation.status()).toBe(200)
  expect(publicités.status()).toBe(200)

  await page.goto(`/ads/tv?companyId=${entreprise.companyId}`)
  await expect(page.getByText(/Creorga TV|LIVE/i).first()).toBeVisible()

  const sansEntreprise = await request.get('http://localhost:3002/api/affichage/maintenant')
  expect(sansEntreprise.status()).toBe(400)
})

test('un nouveau client crée son espace puis peut se reconnecter par email', async ({ page }) => {
  const suffixe = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
  const email = `nouveau-client-${suffixe}@example.test`
  const motDePasse = 'NouveauClient123!'

  await page.goto('/login')
  await page.getByRole('button', { name: 'Créer mon espace' }).first().click()
  await page.locator('input[name="firstName"]').fill('Nouveau')
  await page.locator('input[name="lastName"]').fill('Client')
  await page.locator('input[name="companyName"]').fill('Restaurant de test')
  await page.locator('input[name="email"]').fill(email)
  await page.locator('input[name="password"]').fill(motDePasse)
  await page.locator('input[name="confirmPassword"]').fill(motDePasse)
  await page.locator('button[type="submit"]').click()
  await page.waitForURL('**/setup', { timeout: 20_000 })
  await expect(page.getByText(/Configuration initiale/i)).toBeVisible()
  const nomEtablissement = page.locator('main input').first()
  await expect(nomEtablissement).toHaveValue('Restaurant de test')
  await nomEtablissement.fill('Restaurant configuré')
  await page.getByRole('button', { name: /Enregistrer et continuer/i }).click()
  await expect(page.getByText(/Configurez votre salle/i)).toBeVisible({ timeout: 20_000 })
  await expect(page.getByText(/Plan de salle/i).first()).toBeVisible({ timeout: 20_000 })

  // Une session créée ne suffit pas : on repart d'un navigateur vierge et on
  // vérifie que les identifiants sont réellement sauvegardés en base.
  await page.evaluate(() => localStorage.clear())
  await page.goto('/login')
  await page.locator('input[name="email"]').fill(email)
  await page.locator('input[name="password"]').fill(motDePasse)
  await page.locator('button[type="submit"]').click()
  await page.waitForURL('**/welcome', { timeout: 20_000 })
  await expect(page.locator('body')).toContainText(/Restaurant configuré/i)
})

test('deux nouveaux clients ont des configurations de salle et de modules séparées', async ({ request }) => {
  const register = async (label: string) => {
    const suffixe = `${Date.now()}-${label}-${Math.random().toString(36).slice(2, 8)}`
    const response = await request.post('http://localhost:3002/api/auth/register', {
      data: {
        email: `salle-${suffixe}@example.test`,
        password: 'IsolationSalle123!',
        firstName: 'Test',
        lastName: label,
        companyName: `Restaurant ${label}`,
      },
    })
    expect(response.status()).toBe(201)
    const payload = await response.json()
    return {
      token: payload.accessToken as string,
      companyId: payload.companies[0].companyId as string,
    }
  }

  const clientA = await register('A')
  const clientB = await register('B')
  const headersA = {
    Authorization: `Bearer ${clientA.token}`,
    'x-company-id': clientA.companyId,
  }
  const headersB = {
    Authorization: `Bearer ${clientB.token}`,
    'x-company-id': clientB.companyId,
  }

  const initialA = await request.get('http://localhost:3002/api/floor-state', { headers: headersA })
  expect(initialA.ok()).toBeTruthy()
  const planA = await initialA.json()

  const savedA = await request.post('http://localhost:3002/api/floor-state/tables', {
    headers: headersA,
    data: {
      name: 'Table privée du client A', seats: 4,
      section: planA.zones[0].name, shape: 'round', x: 120, y: 120,
    },
  })
  expect(savedA.ok()).toBeTruthy()

  const [reloadedA, reloadedB] = await Promise.all([
    request.get('http://localhost:3002/api/floor-state', { headers: headersA }),
    request.get('http://localhost:3002/api/floor-state', { headers: headersB }),
  ])
  expect(reloadedA.ok()).toBeTruthy()
  expect(reloadedB.ok()).toBeTruthy()
  expect((await reloadedA.json()).tables[0].name).toBe('Table privée du client A')
  expect((await reloadedB.json()).tables).toEqual([])

  const moduleA = await request.patch('http://localhost:3002/api/module-config/hr', {
    headers: headersA,
    data: { displayMode: 'hidden', customLabel: 'RH privée A' },
  })
  expect(moduleA.ok()).toBeTruthy()

  const [modulesA, modulesB] = await Promise.all([
    request.get('http://localhost:3002/api/module-config', { headers: headersA }),
    request.get('http://localhost:3002/api/module-config', { headers: headersB }),
  ])
  expect(modulesA.ok()).toBeTruthy()
  expect(modulesB.ok()).toBeTruthy()
  expect((await modulesA.json()).config.hr).toMatchObject({ displayMode: 'hidden', customLabel: 'RH privée A' })
  expect((await modulesB.json()).config.hr).toBeUndefined()

  const libelleRetabli = await request.patch('http://localhost:3002/api/module-config/hr', {
    headers: headersA,
    data: { customLabel: '' },
  })
  expect(libelleRetabli.ok()).toBeTruthy()
  expect((await libelleRetabli.json()).config.hr.customLabel).toBeUndefined()
})

test('un vrai jeton de terminal POS accède aux commandes sans Bearer JWT', async ({ request }) => {
  const deviceToken = process.env.E2E_POS_DEVICE_TOKEN
  test.skip(!deviceToken, 'E2E_POS_DEVICE_TOKEN non fourni')

  const response = await request.get('http://localhost:3002/api/orders', {
    headers: {
      'x-device-token': deviceToken!,
      'x-company-id': process.env.POS_DEVICE_COMPANY_ID || 'seed-rich-company',
    },
  })
  expect(response.ok()).toBeTruthy()
  expect(Array.isArray(await response.json())).toBeTruthy()
})

test('une table ou chaise avec des articles ne peut pas être effacée par le bouton Fermer', async ({ request }) => {
  const suffixe = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
  const registration = await request.post('http://localhost:3002/api/auth/register', {
    data: {
      email: `addition-${suffixe}@example.test`, password: 'AdditionProtegee123!',
      firstName: 'Test', lastName: 'Addition', companyName: `Restaurant addition ${suffixe}`,
    },
  })
  expect(registration.status()).toBe(201)
  const session = await registration.json()
  const headers = {
    Authorization: `Bearer ${session.accessToken}`,
    'x-company-id': session.companies[0].companyId as string,
  }

  const initial = await request.get('http://localhost:3002/api/floor-state', { headers })
  const plan = await initial.json()
  const tableResponse = await request.post('http://localhost:3002/api/floor-state/tables', {
    headers,
    data: { name: 'Table protégée', seats: 2, section: plan.zones[0].name, shape: 'round', x: 100, y: 100 },
  })
  expect(tableResponse.status()).toBe(201)
  const table = (await tableResponse.json()).tables.find((item: any) => item.name === 'Table protégée')

  const chairResponse = await request.post('http://localhost:3002/api/floor-state/chairs', {
    headers, data: { tableId: table.id, label: 'Place 1' },
  })
  expect(chairResponse.ok()).toBeTruthy()
  const chair = (await chairResponse.json()).chairs.find((item: any) => item.tableId === table.id)
  const itemResponse = await request.post(`http://localhost:3002/api/floor-state/chairs/${chair.id}/items`, {
    headers, data: { name: 'Produit réel', price: 12.5, qty: 1 },
  })
  expect(itemResponse.ok()).toBeTruthy()
  const item = (await itemResponse.json()).chairs.find((entry: any) => entry.id === chair.id).items[0]

  expect((await request.post(`http://localhost:3002/api/floor-state/chairs/${chair.id}/close`, { headers })).status()).toBe(409)
  expect((await request.post(`http://localhost:3002/api/floor-state/tables/${table.id}/close`, { headers })).status()).toBe(409)

  const stillThere = await request.get('http://localhost:3002/api/floor-state', { headers })
  expect((await stillThere.json()).chairs.find((entry: any) => entry.id === chair.id).items).toHaveLength(1)

  expect((await request.delete(`http://localhost:3002/api/floor-state/chairs/${chair.id}/items/${item.id}`, { headers })).ok()).toBeTruthy()
  expect((await request.post(`http://localhost:3002/api/floor-state/chairs/${chair.id}/close`, { headers })).ok()).toBeTruthy()
  const closed = await request.post(`http://localhost:3002/api/floor-state/tables/${table.id}/close`, { headers })
  expect(closed.ok()).toBeTruthy()
  const closedPlan = await closed.json()
  expect(closedPlan.tables.find((entry: any) => entry.id === table.id).status).toBe('NETTOYAGE')
  expect(closedPlan.chairs.some((entry: any) => entry.tableId === table.id)).toBe(false)
})

test('un portail sans identifiant d’entreprise refuse honnêtement le QR incomplet', async ({ page }) => {
  const res = await page.goto('/c?table=1')
  expect(res?.ok()).toBeTruthy()
  expect(page.url()).toContain('/c')
  await expect(page.getByText('QR incomplet')).toBeVisible()
})

test('les routes protégées refusent les anonymes', async ({ request }) => {
  for (const route of ['/api/stats', '/api/tables', '/api/products', '/api/owner/audit']) {
    const res = await request.get(`http://localhost:3002${route}`)
    expect(res.status(), `${route} doit renvoyer 401`).toBe(401)
  }
})
