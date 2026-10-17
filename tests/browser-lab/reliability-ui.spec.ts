import { test, expect, type Page, type BrowserContext } from '@playwright/test'
import fs from 'node:fs'

const backend = 'http://127.0.0.1:3002', web = 'http://localhost:5174'
let primaryFixtureSession: any
async function laboratory(context: BrowserContext) {
  const email = process.env.CREORGA_E2E_EMAIL || '', password = process.env.CREORGA_E2E_PASSWORD || ''
  if (process.env.CREORGA_LAB_BROWSER_TESTS !== '1' || !email.endsWith('.invalid') || !password) throw Error('Compte fictif requis')
  await context.route('**/*', route => ['127.0.0.1', 'localhost', '::1'].includes(new URL(route.request().url()).hostname) ? route.continue() : route.abort())
  await context.route('**/api/agent/**', route => route.fulfill({ status: 503, json: { error: 'IA neutralisée en laboratoire' } }))
  if (!primaryFixtureSession) {
    const response = await context.request.post(backend + '/api/auth/login', { data: { email, password } })
    expect(response.ok()).toBe(true)
    primaryFixtureSession = await response.json()
  }
  const session = primaryFixtureSession, membership = session.companies[0]
  if (session.companies.length !== 1 || membership.role !== 'OWNER' || !/fictif/i.test(membership.company?.name || '')) throw Error('Société fictive obligatoire')
  await context.addInitScript(data => {
    if (sessionStorage.getItem('reliability-fixture-initialized')) return
    sessionStorage.setItem('reliability-fixture-initialized', '1')
    localStorage.setItem('creorga-auth', JSON.stringify({ version: 0, state: {
      accessToken: data.accessToken, user: data.user, companies: data.companies, company: data.companies[0].company,
      companyId: data.companies[0].companyId || data.companies[0].company.id, isAuthenticated: true, role: 'owner', viewMode: 'owner', viewAsEmployeeId: null,
    } }))
  }, session)
  return session
}

async function logoutFromHeader(page: Page, firstName: string) {
  await page.locator('header button').filter({ hasText: firstName }).last().click()
  await page.getByRole('button', { name: /Déconnexion|Se déconnecter/ }).click()
}

async function browserLogin(page: Page, context: BrowserContext) {
  const email = process.env.CREORGA_E2E_EMAIL || '', password = process.env.CREORGA_E2E_PASSWORD || ''
  if (process.env.CREORGA_LAB_BROWSER_TESTS !== '1' || !email.endsWith('.invalid') || !password) throw Error('Compte fictif requis')
  await context.route('**/*', route => ['127.0.0.1', 'localhost', '::1'].includes(new URL(route.request().url()).hostname) ? route.continue() : route.abort())
  await context.route('**/api/agent/**', route => route.fulfill({ status: 503, json: { error: 'IA neutralisée en laboratoire' } }))
  await page.goto(web + '/login')
  await page.getByLabel('Adresse email', { exact: true }).fill(email)
  await page.getByLabel('Mot de passe', { exact: true }).fill(password)
  const login = page.waitForResponse(response => new URL(response.url()).pathname === '/api/auth/login' && response.request().method() === 'POST')
  await page.getByRole('button', { name: 'Se connecter', exact: true }).click()
  const response = await login
  expect(response.ok()).toBe(true)
  const session = await response.json()
  if (session.companies.length !== 1 || session.companies[0].role !== 'OWNER' || !/fictif/i.test(session.companies[0].company?.name || '')) throw Error('Société fictive obligatoire')
  // Cette recette isole l'authentification, pas le parcours d'installation.
  // Marqueur dans le Chrome neuf seulement, sans modification de la société.
  await page.evaluate(companyId => localStorage.setItem('creorga-onboarded-v2:' + companyId, '1'), session.companies[0].companyId)
  await expect(page).not.toHaveURL(/\/login$/)
  // Précondition indispensable : même cookie/origine que l'interface. Un 401
  // avant déconnexion serait un test trompeur de la révocation.
  const before = await page.evaluate(async () => (await fetch('/api/auth/refresh', { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: '{}' })).status)
  expect(before).toBe(200)
  return session
}

test('fiabilité UI : déconnexion clavier révoque le cookie réel et reste déconnectée après rechargement', async ({ page, context }) => {
  const session = await browserLogin(page, context)
  await page.goto(web + '/inventory/stock')
  await page.locator('header button').filter({ hasText: session.user.firstName }).last().press('Enter')
  await page.getByRole('button', { name: /Déconnexion|Se déconnecter/ }).press('Enter')
  await expect(page).toHaveURL(/\/login$/)
  await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('creorga-auth')!).state.logoutRevocationPending)).toBe(false)
  expect(await page.evaluate(async () => (await fetch('/api/auth/refresh', { method: 'POST', credentials: 'include' })).status)).toBe(401)
  await page.reload()
  await expect(page).toHaveURL(/\/login$/)
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('creorga-auth')!).state.isAuthenticated)).toBe(false)
})

test('fiabilité UI : refus serveur de déconnexion verrouille, résiste au rechargement puis permet la reprise explicite', async ({ page, context }) => {
  const session = await browserLogin(page, context)
  let refuse = true, refreshes = 0, logins = 0
  page.on('request', request => {
    const pathname = new URL(request.url()).pathname
    if (pathname === '/api/auth/refresh') refreshes++
    if (pathname === '/api/auth/login') logins++
  })
  await context.route('**/api/auth/logout', route => refuse ? route.fulfill({ status: 503, json: { message: 'Révocation FICTIVE indisponible' } }) : route.continue())
  await page.goto(web + '/inventory/stock')
  await logoutFromHeader(page, session.user.firstName)
  await expect(page).toHaveURL(/\/login$/)
  await expect(page.getByRole('alert').filter({ hasText: 'révocation serveur non confirmée' })).toBeVisible()
  let state = await page.evaluate(() => JSON.parse(localStorage.getItem('creorga-auth')!).state)
  expect(state.isAuthenticated).toBe(false); expect(state.user).toBeNull(); expect(state.accessToken).toBeNull(); expect(state.logoutRevocationPending).toBe(true)
  await page.reload()
  await expect(page.getByRole('alert').filter({ hasText: 'révocation serveur non confirmée' })).toBeVisible()
  await expect(page.locator('.creorga-header')).toHaveCount(0)
  await expect(page.getByRole('button', { name: 'Se connecter', exact: true })).toBeDisabled()
  await page.getByLabel('Adresse email', { exact: true }).fill(process.env.CREORGA_E2E_EMAIL!)
  await page.getByLabel('Mot de passe', { exact: true }).fill(process.env.CREORGA_E2E_PASSWORD!)
  await page.getByLabel('Mot de passe', { exact: true }).press('Enter')
  expect(logins).toBe(0); expect(refreshes).toBe(0)
  refuse = false
  await page.getByRole('button', { name: 'Réessayer la révocation serveur', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Se connecter', exact: true })).toBeEnabled()
  state = await page.evaluate(() => JSON.parse(localStorage.getItem('creorga-auth')!).state)
  expect(state.isAuthenticated).toBe(false); expect(state.logoutRevocationPending).toBe(false)
  expect(await page.evaluate(async () => (await fetch('/api/auth/refresh', { method: 'POST', credentials: 'include' })).status)).toBe(401)
  // Le changement de génération retire également les anciennes saisies de
  // connexion. La nouvelle connexion exige de ressaisir les identifiants.
  await page.getByLabel('Adresse email', { exact: true }).fill(process.env.CREORGA_E2E_EMAIL!)
  await page.getByLabel('Mot de passe', { exact: true }).fill(process.env.CREORGA_E2E_PASSWORD!)
  await page.getByRole('button', { name: 'Se connecter', exact: true }).click()
  await expect(page).not.toHaveURL(/\/login$/)
  expect(logins).toBe(1)
})

for (const entry of [{ path: '/modules', label: 'Modules' }, { path: '/m/settings', label: 'Mobile' }]) {
  test(`fiabilité UI : déconnexion ${entry.label} rejoint la révocation sûre sans reset destructif`, async ({ page, context }) => {
    await browserLogin(page, context)
    await page.goto(web + entry.path)
    if (entry.label === 'Mobile') {
      await expect(page.getByRole('button', { name: 'Réinitialisation locale — procédure de reprise requise', exact: true })).toBeDisabled()
      expect(await page.evaluate(() => JSON.parse(localStorage.getItem('creorga-auth')!).state.isAuthenticated)).toBe(true)
    }
    const confirmed = page.waitForResponse(response => new URL(response.url()).pathname === '/api/auth/logout' && response.request().method() === 'POST')
    await page.getByRole('button', { name: entry.label === 'Mobile' ? 'Déconnecter' : 'Déconnexion', exact: true }).press('Enter')
    expect((await confirmed).ok()).toBe(true)
    await expect(page).toHaveURL(/\/login$/)
    await expect.poll(() => page.evaluate(() => JSON.parse(localStorage.getItem('creorga-auth')!).state.logoutRevocationPending)).toBe(false)
    expect(await page.evaluate(async () => (await fetch('/api/auth/refresh', { method: 'POST', credentials: 'include' })).status)).toBe(401)
    await page.reload()
    await expect(page).toHaveURL(/\/login$/)
  })
}

test('fiabilité UI : ancien mur photos non attribué reste en quarantaine et intact', async ({ page, context }) => {
  await laboratory(context)
  const legacy = JSON.stringify({ version: 0, state: { photos: [{ id: 'legacy-fictif', moduleId: 'clients', dataUrl: 'data:image/png;base64,aW52YWxpZA==', category: 'other', caption: 'Ancien compte FICTIF inconnu', addedAt: 1 }] } })
  await context.addInitScript(value => localStorage.setItem('creorga-photo-wall', value), legacy)
  await page.goto(web + '/clients')
  await expect(page.getByRole('heading', { name: /Mur photos/ })).toBeVisible()
  await expect(page.getByText('Ancien compte FICTIF inconnu', { exact: true })).toHaveCount(0)
  expect(await page.evaluate(() => localStorage.getItem('creorga-photo-wall'))).toBe(legacy)
})

test('fiabilité UI : image fictive locale persistée, filtrée puis retirée au clavier', async ({ page, context }) => {
  await laboratory(context)
  await page.goto(web + '/clients')
  const wall = page.locator('section').filter({ has: page.getByRole('heading', { name: /Mur photos/ }) }).last()
  await wall.getByPlaceholder('Légende (optionnelle)').fill('Image locale FICTIVE')
  await wall.locator('select').selectOption('other')
  const picker = page.waitForEvent('filechooser')
  await wall.getByRole('button', { name: '+ Ajouter photos', exact: true }).click()
  await (await picker).setFiles({ name: 'image-fictive.png', mimeType: 'image/png', buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRDoAAAAASUVORK5CYII=', 'base64') })
  await expect(wall.getByRole('img', { name: 'Image locale FICTIVE', exact: true })).toBeVisible()
  await page.reload()
  await expect(wall.getByRole('img', { name: 'Image locale FICTIVE', exact: true })).toBeVisible()
  await wall.getByRole('button', { name: '☕ Café', exact: true }).click()
  await expect(wall.getByRole('img', { name: 'Image locale FICTIVE', exact: true })).toHaveCount(0)
  await wall.getByRole('button', { name: 'Tous', exact: true }).click()
  await wall.getByRole('button', { name: 'Supprimer la photo Image locale FICTIVE', exact: true }).press('Enter')
  await expect(wall.getByRole('img', { name: 'Image locale FICTIVE', exact: true })).toHaveCount(0)
  await page.reload()
  await expect(wall.getByRole('img', { name: 'Image locale FICTIVE', exact: true })).toHaveCount(0)
})

test('fiabilité UI : réception double clic ne crédite pas deux fois et refus permet une reprise explicite', async ({ page, context }) => {
  await laboratory(context)
  const supplier = { id: 'supplier-fiable', name: 'Fournisseur FICTIF', contactName: null, email: null, phone: null }
  const ingredient = { id: 'ingredient-fiable', name: 'Article FICTIF réception', unit: 'pièce', currentStock: 10, costPerUnit: 1, minStockLevel: 2, supplier }
  const order = { id: 'order-fiable', status: 'PENDING', total: 4, createdAt: '2026-10-16T10:00:00Z', supplier, items: [{ id: 'line-fiable', quantity: 4, unitCost: 1, ingredient }] }
  let requests = 0, release!: () => void
  const gate = new Promise<void>(resolve => { release = resolve })
  await context.route('**/api/inventory/ingredients', route => route.fulfill({ json: [ingredient] }))
  await context.route('**/api/inventory/suppliers', route => route.fulfill({ json: [supplier] }))
  await context.route('**/api/inventory/purchase-orders', route => route.fulfill({ json: [order] }))
  await context.route('**/api/inventory/purchase-orders/order-fiable/receive', async route => {
    requests++; await gate; await route.fulfill({ status: 503, json: { message: 'Réception FICTIVE refusée' } })
  })
  await page.goto(web + '/inventory/commandes')
  const receive = page.getByRole('button', { name: 'Réceptionner', exact: true })
  try {
    await receive.dblclick()
    await expect.poll(() => requests).toBe(1)
    await expect(page.getByRole('button', { name: /Réception.*cours|Réceptionner/ }).last()).toBeDisabled()
  } finally { release() }
  await expect(page.getByText('Réception FICTIVE refusée', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Réceptionner', exact: true })).toBeEnabled()
  expect(requests).toBe(1)
  expect(order.status).toBe('PENDING')
})

test('fiabilité UI : une projection stock ancienne ne remplace pas la réception plus récente', async ({ page, context }) => {
  await laboratory(context)
  const supplier = { id: 'supplier-projection', name: 'Projection FICTIVE', contactName: null, email: null, phone: null }
  const ingredient = { id: 'ingredient-projection', name: 'Article FICTIF', unit: 'pièce', currentStock: 10, costPerUnit: 1, minStockLevel: 2, supplier }
  const makeOrder = (id: string, status = 'PENDING') => ({ id, status, total: 4, createdAt: '2026-10-16T10:00:00Z', supplier, items: [{ id: `line-${id}`, quantity: 4, unitCost: 1, ingredient }] })
  let reads = 0, release!: () => void, oldReadStarted!: () => void
  const gate = new Promise<void>(resolve => { release = resolve }), oldStarted = new Promise<void>(resolve => { oldReadStarted = resolve })
  await context.route('**/api/inventory/ingredients', route => route.fulfill({ json: [ingredient] }))
  await context.route('**/api/inventory/suppliers', route => route.fulfill({ json: [supplier] }))
  await context.route('**/api/inventory/purchase-orders', async route => {
    reads++
    if (reads === 1) return route.fulfill({ json: [makeOrder('a'), makeOrder('b')] })
    if (reads === 2) { oldReadStarted(); await gate; return route.fulfill({ headers: { 'x-fixture-projection': 'ancienne' }, json: [makeOrder('a', 'RECEIVED'), makeOrder('b')] }) }
    await route.fulfill({ json: [makeOrder('a', 'RECEIVED'), makeOrder('b', 'RECEIVED')] })
  })
  await context.route(/\/api\/inventory\/purchase-orders\/[ab]\/receive$/, route => route.fulfill({ json: { success: true } }))
  await page.goto(web + '/inventory/commandes')
  const oldResponse = page.waitForResponse(response => response.headers()['x-fixture-projection'] === 'ancienne')
  await page.getByRole('button', { name: 'Réceptionner', exact: true }).first().click()
  await oldStarted
  try {
    await page.getByRole('button', { name: /Réceptionner/, exact: true }).last().click()
    await expect(page.getByText('Réceptionné', { exact: true })).toHaveCount(2)
  } finally { release() }
  await (await oldResponse).finished()
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))))
  await expect.poll(() => reads).toBe(3)
  await expect(page.getByRole('button', { name: 'Réceptionner', exact: true })).toHaveCount(0)
})

async function multiLaboratory(context: BrowserContext) {
  const file = process.env.CREORGA_E2E_MULTI_ACCOUNT_FILE
  if (!file) throw Error('Fixture privée multi-sociétés requise ; scénario non exécutable sans ses accès')
  const account = JSON.parse(fs.readFileSync(file, 'utf8'))
  if (process.env.CREORGA_LAB_BROWSER_TESTS !== '1' || !String(account.email).endsWith('.invalid') || !account.password) throw Error('Compte fictif requis')
  await context.route('**/*', route => ['127.0.0.1', 'localhost', '::1'].includes(new URL(route.request().url()).hostname) ? route.continue() : route.abort())
  await context.route('**/api/agent/**', route => route.fulfill({ status: 503, json: { error: 'IA neutralisée en laboratoire' } }))
  const response = await context.request.post(backend + '/api/auth/login', { data: { email: account.email, password: account.password } })
  expect(response.ok()).toBe(true)
  const session = await response.json()
  if (session.companies.length < 2 || session.companies.some((membership: any) => !/fictif/i.test(membership.company?.name || ''))) throw Error('Deux sociétés fictives obligatoires')
  const owner = session.companies.find((membership: any) => membership.role === 'OWNER')
  const employee = session.companies.find((membership: any) => membership.role === 'EMPLOYEE')
  if (!owner || !employee) throw Error('Propriétaire A et salarié B requis')
  await context.addInitScript(data => {
    if (sessionStorage.getItem('reliability-multi-initialized')) return
    sessionStorage.setItem('reliability-multi-initialized', '1')
    localStorage.setItem('creorga-auth', JSON.stringify({ version: 0, state: { ...data, isAuthenticated: true, role: 'owner', viewMode: 'owner', viewAsEmployeeId: null } }))
  }, { accessToken: session.accessToken, user: session.user, companies: session.companies, company: owner.company, companyId: owner.companyId })
  return { account, session, owner, employee }
}

test('fiabilité UI : changement de société et rôle par sélecteur utilise les adhésions réelles', async ({ page, context }) => {
  const { account, session, owner, employee } = await multiLaboratory(context)
  await page.goto(web + '/clients')
  const imageCaption = 'Photo A FICTIVE non partagée'
  const wall = page.locator('section').filter({ has: page.getByRole('heading', { name: /Mur photos/ }) }).last()
  await wall.getByPlaceholder('Légende (optionnelle)').fill(imageCaption)
  const picker = page.waitForEvent('filechooser')
  await wall.getByRole('button', { name: '+ Ajouter photos', exact: true }).click()
  await (await picker).setFiles({ name: 'societe-a-fictive.png', mimeType: 'image/png', buffer: Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRDoAAAAASUVORK5CYII=', 'base64') })
  await expect(page.getByRole('img', { name: imageCaption, exact: true })).toBeVisible()
  await page.goto(web + '/inventory/stock')
  const selector = page.getByRole('combobox', { name: 'Société active', exact: true })
  await expect(selector).toHaveValue(owner.companyId)
  const inactive = account.companies.find((company: any) => company.active === false)
  if (!inactive) throw Error('Adhésion inactive de laboratoire requise')
  await expect(selector.locator(`option[value="${inactive.id}"]`)).toHaveCount(0)
  page.once('dialog', dialog => dialog.dismiss())
  await selector.selectOption(employee.companyId)
  await expect(selector).toHaveValue(owner.companyId)
  page.once('dialog', dialog => dialog.accept())
  await selector.selectOption(employee.companyId)
  await expect(selector).toHaveValue(employee.companyId)
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('creorga-auth')!).state)
  expect(stored.role).toBe('employee'); expect(stored.viewMode).toBe('employee')
  await page.reload()
  await expect(page.getByRole('combobox', { name: 'Société active', exact: true })).toHaveValue(employee.companyId)
  expect((await context.request.get(backend + '/api/owner/audit', { headers: { Authorization: 'Bearer ' + session.accessToken, 'x-company-id': employee.companyId } })).status()).toBe(403)
  expect((await context.request.get(backend + '/api/inventory/ingredients', { headers: { Authorization: 'Bearer ' + session.accessToken, 'x-company-id': inactive.id } })).status()).toBe(403)
  expect((await context.request.get(backend + '/api/inventory/ingredients', { headers: { Authorization: 'Bearer ' + session.accessToken, 'x-company-id': 'unknown-company-fixture' } })).status()).toBe(403)
  await page.goto(web + '/clients')
  await expect(page.getByRole('img', { name: imageCaption, exact: true })).toHaveCount(0)
  await page.goto(web + '/inventory/stock')
  page.once('dialog', dialog => dialog.accept())
  await page.getByRole('combobox', { name: 'Société active', exact: true }).selectOption(owner.companyId)
  await page.goto(web + '/clients')
  await expect(page.getByRole('img', { name: imageCaption, exact: true })).toBeVisible()
})

test('fiabilité UI : fournisseur, stock, commande et réception persistent réellement dans la société fictive A', async ({ page, context }) => {
  const { owner, employee, session } = await multiLaboratory(context)
  const suffix = Date.now().toString(36), supplierName = `Fournisseur FICTIF UI ${suffix}`, ingredientName = `Article FICTIF UI ${suffix}`
  const headers = { Authorization: 'Bearer ' + session.accessToken, 'x-company-id': owner.companyId }
  await page.goto(web + '/inventory/fournisseurs')
  await page.getByLabel('Société', { exact: true }).fill(supplierName)
  await page.getByLabel('Contact', { exact: true }).fill('Personne FICTIVE')
  await page.getByLabel('Email', { exact: true }).fill('fournisseur@fixture.invalid')
  await page.getByRole('button', { name: 'Enregistrer le fournisseur', exact: true }).click()
  await expect(page.getByText(supplierName, { exact: true })).toBeVisible()
  await page.reload()
  await expect(page.getByText(supplierName, { exact: true })).toBeVisible()
  await page.goto(web + '/inventory/stock')
  await page.getByLabel('Nom', { exact: true }).fill(ingredientName)
  await page.getByLabel('Stock actuel', { exact: true }).fill('10')
  await page.getByLabel('Seuil d’alerte', { exact: true }).fill('2')
  await page.getByLabel('Coût unitaire', { exact: true }).fill('2')
  await page.getByRole('combobox', { name: 'Fournisseur', exact: true }).selectOption({ label: supplierName })
  await page.getByRole('button', { name: 'Enregistrer l’article', exact: true }).click()
  const stock = page.getByRole('spinbutton', { name: 'Stock de ' + ingredientName, exact: true })
  await expect(stock).toHaveValue('10')
  await stock.fill('12.5'); await stock.press('Tab')
  await expect(page.getByText('Stock enregistré sur le serveur', { exact: true })).toBeVisible()
  await page.reload()
  await expect(stock).toHaveValue('12.5')
  await page.goto(web + '/inventory/commandes')
  await page.getByRole('combobox', { name: 'Fournisseur', exact: true }).selectOption({ label: supplierName })
  await page.getByRole('combobox', { name: 'Article', exact: true }).selectOption({ label: ingredientName })
  await page.getByLabel('Quantité', { exact: true }).fill('4')
  await page.getByLabel('Coût unitaire', { exact: true }).fill('2')
  await page.getByRole('button', { name: 'Enregistrer le bon', exact: true }).click()
  const order = page.locator('article').filter({ hasText: ingredientName })
  await expect(order).toContainText('8.00 €')
  await order.getByRole('button', { name: 'Réceptionner', exact: true }).click()
  await expect(order).toContainText('Réceptionné')
  await page.reload()
  await expect(order).toContainText('Réceptionné')
  await page.goto(web + '/inventory/stock')
  await expect(stock).toHaveValue('16.5')
  const data = await context.request.get(backend + '/api/inventory/ingredients', { headers }).then(response => response.json())
  const stored = data.find((item: any) => item.name === ingredientName)
  expect(stored.currentStock).toBe(16.5)
  expect(stored.supplier.name).toBe(supplierName)
  // Pas de règle de rôle inventée pour le stock : cette requête teste uniquement
  // l'isolation des IDs entre A et B, déjà membres du même compte fictif.
  const foreign = await context.request.put(backend + '/api/inventory/ingredients/' + stored.id, { headers: { ...headers, 'x-company-id': employee.companyId }, data: { currentStock: 999 } })
  expect(foreign.status()).toBe(404)
  const checked = await context.request.get(backend + '/api/inventory/ingredients', { headers }).then(response => response.json())
  expect(checked.find((item: any) => item.id === stored.id).currentStock).toBe(16.5)
})
