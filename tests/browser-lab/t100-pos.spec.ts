import { test, expect, type Page, type BrowserContext } from '@playwright/test'

const backend = 'http://127.0.0.1:3002', pos = 'http://localhost:5175'

async function login(page: Page, context: BrowserContext) {
  const email = process.env.CREORGA_E2E_EMAIL || '', password = process.env.CREORGA_E2E_PASSWORD || ''
  if (process.env.CREORGA_LAB_BROWSER_TESTS !== '1' || !email.endsWith('.invalid') || !password) throw new Error('Laboratoire privé et compte fictif obligatoires')
  await context.route('**/*', route => ['127.0.0.1', 'localhost', '::1'].includes(new URL(route.request().url()).hostname) ? route.continue() : route.abort())
  await page.goto(pos)
  await page.getByLabel('Adresse email', { exact: true }).fill(email)
  await page.getByLabel('Mot de passe', { exact: true }).fill(password)
  const authenticated = page.waitForResponse(r => r.url().endsWith('/api/auth/login') && r.request().method() === 'POST')
  await page.getByRole('button', { name: 'Se connecter', exact: true }).click()
  const response = await authenticated
  expect(response.ok()).toBe(true)
  const session = await response.json(), member = session.companies[0], companyId = member.companyId || member.company?.id
  if (session.companies.length !== 1 || member.role !== 'OWNER' || !/fictif/i.test(member.company?.name || '')) throw new Error('Propriétaire de société fictive requis')
  const headers = { Authorization: 'Bearer ' + session.accessToken, 'x-company-id': companyId }
  async function api(path: string, method = 'GET', data?: any, extra = {}) {
    const r = await context.request.fetch(backend + '/api' + path, { method, headers: { ...headers, ...extra }, data })
    expect(r.ok(), path + ' HTTP ' + r.status()).toBe(true); return r.json()
  }
  await page.getByRole('button', { name: 'Journal', exact: true }).waitFor()
  return { api }
}

// Ces trois contrôles complémentaires exercent React/Chrome et les contrats
// réseau sur une projection fictive isolée. Ils ne prouvent ni une écriture
// PostgreSQL ni une confirmation bancaire. Aucun brouillon ne quitte ce double.
async function uiBoundary(page: Page, api: (path: string) => Promise<any>, withLine = false) {
  const base = await api('/pos/bootstrap'), tableId = crypto.randomUUID(), targetId = crypto.randomUUID(), coverId = crypto.randomUUID(), productId = crypto.randomUUID(), lineId = crypto.randomUUID()
  const product = { id: productId, name: 'Café FICTIF UI', price: 3.3, taxRate: 3, category: 'Boissons', emoji: '☕', active: true }
  const line = { id: lineId, menuItemId: productId, name: product.name, qty: 3, price: 3.3, taxRate: 3, note: 'Consigne FICTIF', coverId }
  const source = { id: tableId, name: 'T100 FICTIF UI source', shape: 'round', seats: 2, x: 150, y: 150, section: 'salle-test', status: 'occupied', covers: [{ id: coverId, label: 'Groupe FICTIF', items: withLine ? [line] : [] }], mergedWith: [] }
  const target = { ...source, id: targetId, name: 'T100 FICTIF UI destination', x: 450, covers: [], status: 'available' }
  const snapshot = { ...base, tables: [source, target], menu: [product], seats: [], editor: { ...base.editor, rooms: [{ id: 'salle-test', label: 'Salle FICTIF', color: '#6366f1', x: 20, y: 20, w: 1000, h: 600 }], fixtures: [], scenes: [], background: null } }
  const drafts: any[] = []
  await page.route('**/api/pos/bootstrap', route => route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify(snapshot) }))
  await page.route('**/api/pos/draft', async route => {
    const body = route.request().postDataJSON()
    if (body.tables.some((t: any) => t.id !== tableId && t.id !== targetId)) throw new Error('Un plan non fictif tente de rejoindre le double T100')
    drafts.push(structuredClone(body)); snapshot.tables = body.tables; snapshot.seats = body.seats; snapshot.editor = body.editor; snapshot.revision++
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ updatedAt: snapshot.revision, posPricing: {} }) })
  })
  await page.waitForResponse(r => r.url().endsWith('/api/pos/bootstrap'))
  await expect(page.getByRole('button', { name: new RegExp(source.name) })).toBeVisible()
  return { snapshot, drafts, product, line, source, target }
}

test('T100 POS : un import invalide ne retire aucune table et ne produit aucun brouillon destructeur', async ({ page, context }) => {
  const { api } = await login(page, context)
  const before = await api('/pos/bootstrap'), drafts: any[] = [], errors: string[] = []
  page.on('pageerror', e => errors.push(e.message))
  // Échec simulé de la frontière réseau : même l'ancienne version défectueuse
  // ne doit jamais pouvoir sauvegarder un plan vidé dans le laboratoire.
  await page.route('**/api/pos/draft', async route => {
    drafts.push(route.request().postDataJSON())
    await route.fulfill({ status: 503, contentType: 'application/json', body: JSON.stringify({ error: 'Interception de sécurité du test T100' }) })
  })
  await page.getByRole('button', { name: 'Éditeur', exact: true }).click()
  await page.getByRole('button', { name: '↓ Export', exact: true }).click()
  await page.getByRole('button', { name: 'Importer', exact: true }).click()
  await page.getByPlaceholder('Coller le JSON à importer...').fill('{"tables":{},"fixtures":[]}')
  page.once('dialog', d => d.accept())
  await page.getByRole('button', { name: 'Importer le plan', exact: true }).click()
  const visibleCount = before.tables.filter((t: any) => !t.isMergedInto).length
  await expect(page.getByText(visibleCount + (visibleCount === 1 ? ' table' : ' tables'), { exact: true })).toBeVisible()
  // Une assertion web-first sur le plan suffit au RED ; ce délai laisse aussi
  // passer le debounce réel de 450 ms afin de contrôler l'absence d'écriture.
  await page.waitForTimeout(800)
  expect(drafts).toEqual([])
  expect((await api('/pos/bootstrap')).tables.map((t: any) => t.id)).toEqual(before.tables.map((t: any) => t.id))
  expect(errors).toEqual([])
})

test('T100 POS : transfert serveur des quantités et prix historiques, puis refus réseau sans perte de ligne', async ({ page, context }) => {
  const { api } = await login(page, context)
  const stamp = Date.now(), category = await api('/categories', 'POST', { name: 'FICTIF T100 ' + stamp })
  const product = await api('/products', 'POST', { categoryId: category.id, name: 'Café FICTIF T100 ' + stamp, price: 3.3, taxRate: 3 })
  const tables: any[] = []
  for (const suffix of ['source', 'destination']) {
    const floor = await api('/floor-state'), name = 'T100 FICTIF ' + stamp + ' ' + suffix
    const saved = await api('/floor-state/tables', 'POST', { name, section: floor.zones[0].name, shape: 'round', seats: 2, x: 100, y: 100 })
    tables.push(saved.tables.find((t: any) => t.name === name))
  }
  const before = await api('/pos/bootstrap'), coverId = crypto.randomUUID(), lineId = crypto.randomUUID()
  before.tables.find((t: any) => t.id === tables[0].id).covers.push({ id: coverId, label: 'Groupe FICTIF T100', items: [{ id: lineId, menuItemId: product.id, name: product.name, price: 3.3, qty: 3, taxRate: 3, note: 'Sans glace', coverId }] })
  await api('/pos/draft', 'PUT', { tables: before.tables, seats: before.seats }, { 'If-Match': String(before.revision) })
  await api('/products/' + product.id, 'PUT', { price: 9.9, taxRate: 17 })
  await page.reload()
  await page.getByLabel('Adresse email', { exact: true }).fill(process.env.CREORGA_E2E_EMAIL!)
  await page.getByLabel('Mot de passe', { exact: true }).fill(process.env.CREORGA_E2E_PASSWORD!)
  await page.getByRole('button', { name: 'Se connecter', exact: true }).click()
  await page.getByRole('button', { name: 'Serveur', exact: true }).click()
  await page.getByRole('button', { name: new RegExp(tables[0].name) }).click()
  await page.getByRole('button', { name: 'Transférer la ligne ' + product.name, exact: true }).click()
  const dialog = page.getByRole('dialog', { name: 'Transférer une ligne', exact: true })
  await dialog.getByLabel('Table de destination').selectOption(tables[1].id)
  await dialog.getByRole('button', { name: 'Confirmer le transfert', exact: true }).click()
  await expect(dialog).toBeHidden()
  const after = await api('/pos/bootstrap'), moved = after.tables.find((t: any) => t.id === tables[1].id).covers.flatMap((c: any) => c.items)
  expect(moved).toHaveLength(1)
  expect(moved[0]).toMatchObject({ id: lineId, price: 3.3, taxRate: 3, qty: 3, note: 'Sans glace' })
  expect(after.tables.find((t: any) => t.id === tables[0].id).covers.flatMap((c: any) => c.items)).toHaveLength(0)
  await page.getByRole('button', { name: new RegExp(tables[1].name) }).click()
  await page.getByRole('button', { name: 'Transférer la ligne ' + product.name, exact: true }).click()
  await dialog.getByLabel('Table de destination').selectOption(tables[0].id)
  await page.route('**/api/pos/service-separations', route => route.fulfill({ status: 503, contentType: 'application/json', body: '{"message":"Réseau indisponible FICTIF"}' }))
  await dialog.getByRole('button', { name: 'Confirmer le transfert', exact: true }).click()
  await expect(dialog.getByRole('alert')).toContainText('Réseau indisponible')
  const failed = await api('/pos/bootstrap')
  expect(failed.tables.find((t: any) => t.id === tables[1].id).covers.flatMap((c: any) => c.items)).toEqual(moved)
  expect(failed.tables.find((t: any) => t.id === tables[0].id).covers.flatMap((c: any) => c.items)).toHaveLength(0)
})

test('T100 POS : les synchronisations serveur ne prolongent pas une session inactive', async ({ page, context }) => {
  await page.clock.install()
  await login(page, context)
  const poll = page.waitForResponse(r => r.url().endsWith('/api/pos/bootstrap'))
  await page.clock.fastForward(590_000)
  await poll
  await page.waitForTimeout(150)
  await page.clock.fastForward(15_000)
  await expect(page.getByLabel('Adresse email', { exact: true })).toBeVisible()
  await expect(page.getByRole('button', { name: 'Journal', exact: true })).toBeHidden()
})

test('T100 POS : les raccourcis sans connecteur ne prétendent pas effectuer une action', async ({ page, context }) => {
  await login(page, context)
  await page.getByRole('button', { name: 'Serveur', exact: true }).click()
  await page.getByRole('button', { name: '☰', exact: true }).click()
  for (const name of ['Réclamer une table', 'Demander de patienter', 'Annoncer un anniversaire', 'Appeler un collègue', 'Demander nettoyage', 'Terminal de paiement', 'Rapport de shift']) {
    await expect(page.getByRole('button', { name: new RegExp(name) })).toBeDisabled()
  }
  await expect(page.getByText(/Raccourcis non connectés/)).toBeVisible()
})

test('T100 POS frontière simulée : appui long, annulation sans ajout, clic court et validation unique de note', async ({ page, context }) => {
  const { api } = await login(page, context), ui = await uiBoundary(page, api)
  await page.getByRole('button', { name: 'Serveur', exact: true }).click()
  const product = page.getByRole('button', { name: /^☕ Café FICTIF UI / })
  const count = () => ui.snapshot.tables[0].covers.flatMap((c: any) => c.items).reduce((sum: number, item: any) => sum + item.qty, 0)
  async function longPress() {
    const box = await product.boundingBox(); if (!box) throw new Error('Produit fictif non visible')
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
    await page.mouse.down(); await page.waitForTimeout(600)
    await expect(page.getByPlaceholder('Ex: sans gluten, bien cuit, sans oignon...')).toBeVisible()
    await page.mouse.up()
  }
  await longPress()
  await expect(page.getByRole('button', { name: 'Transférer la ligne ' + ui.product.name, exact: true })).toHaveCount(0)
  await page.getByRole('button', { name: 'Annuler', exact: true }).click()
  await page.waitForTimeout(550); expect(count()).toBe(0); expect(ui.drafts).toHaveLength(0)
  await product.click()
  await expect.poll(count).toBe(1)
  await longPress()
  expect(count()).toBe(1)
  await page.getByPlaceholder('Ex: sans gluten, bien cuit, sans oignon...').fill('Sans sucre FICTIF')
  await page.getByRole('button', { name: 'Ajouter', exact: true }).click()
  await expect.poll(count).toBe(2)
  expect(ui.snapshot.tables[0].covers.flatMap((c: any) => c.items).filter((i: any) => i.note === 'Sans sucre FICTIF')).toHaveLength(1)
})

test('T100 POS frontière simulée : annuler et rétablir la géométrie préserve la finance arrivée après le snapshot', async ({ page, context }) => {
  const { api } = await login(page, context), ui = await uiBoundary(page, api)
  await page.getByRole('button', { name: 'Éditeur', exact: true }).click()
  await page.locator('g[transform="translate(150,150) rotate(0)"]').click()
  const x = page.locator('input[type=number]').first()
  await expect(x).toHaveValue('150'); await x.fill('250')
  await expect.poll(() => ui.snapshot.tables[0].x).toBe(250)
  const financial = { ...ui.line, qty: 3, price: 3.3, taxRate: 3 }, payment = { orderId: crypto.randomUUID(), totalCents: 990, paidCents: 100, outstandingCents: 890 }
  ;(ui.snapshot.tables[0].covers[0] as any).items = [financial]
  ;(ui.snapshot.tables[0].covers[0] as any).payment = payment
  ui.snapshot.revision++
  await page.waitForResponse(r => r.url().endsWith('/api/pos/bootstrap'))
  await page.waitForTimeout(100)
  await page.getByRole('button', { name: '↶ Annuler', exact: true }).click()
  await expect(x).toHaveValue('150')
  await expect.poll(() => ui.snapshot.tables[0].x).toBe(150)
  expect(ui.snapshot.tables[0].covers[0]).toMatchObject({ items: [financial], payment })
  await page.getByRole('button', { name: '↷ Rétablir', exact: true }).click()
  await expect(x).toHaveValue('250')
  await expect.poll(() => ui.snapshot.tables[0].x).toBe(250)
  expect(ui.snapshot.tables[0].covers[0]).toMatchObject({ items: [financial], payment })
})

test('T100 POS frontière simulée : transfert contextuel annulé une fois, refus 503 puis reprise confirmée', async ({ page, context }) => {
  const { api } = await login(page, context), ui = await uiBoundary(page, api, true)
  const attempts: any[] = []; let accepted = false, fail = true, confirmations = 0
  page.on('dialog', async dialog => { confirmations++; if (accepted) await dialog.accept(); else await dialog.dismiss() })
  await page.route('**/api/pos/table-movements**', async route => {
    if (route.request().method() !== 'POST') { await route.fulfill({ status: 404, contentType: 'application/json', body: '{"message":"Référence fictive absente"}' }); return }
    const body = route.request().postDataJSON(); attempts.push(body)
    if (fail) { await route.fulfill({ status: 503, contentType: 'application/json', body: '{"message":"Transfert FICTIF indisponible"}' }); return }
    ui.snapshot.tables[1].covers = ui.snapshot.tables[0].covers; ui.snapshot.tables[1].status = 'occupied'; ui.snapshot.tables[0].covers = []; ui.snapshot.tables[0].status = 'dirty'; ui.snapshot.revision++
    await route.fulfill({ status: 200, contentType: 'application/json', body: JSON.stringify({ requestId: body.requestId, revision: ui.snapshot.revision }) })
  })
  async function chooseTransfer() {
    const close = page.getByRole('button', { name: '×', exact: true })
    if (await close.isVisible()) await close.click()
    await page.getByRole('button', { name: new RegExp(ui.source.name) }).click({ button: 'right' })
    await page.getByRole('button', { name: /Transférer/, exact: false }).click()
    await page.getByRole('button', { name: new RegExp(ui.target.name) }).click()
  }
  await chooseTransfer(); await page.waitForTimeout(100)
  expect(confirmations).toBe(1); expect(attempts).toHaveLength(0)
  expect(ui.snapshot.tables[0].covers[0].items).toEqual([ui.line])
  accepted = true
  await chooseTransfer()
  await expect(page.getByRole('status').filter({ hasText: 'Transfert non confirmé' })).toContainText('Transfert FICTIF indisponible')
  expect(attempts).toHaveLength(1); expect(ui.snapshot.tables[0].covers[0].items).toEqual([ui.line]); expect(ui.snapshot.tables[1].covers).toHaveLength(0)
  fail = false
  await chooseTransfer()
  await expect(page.getByRole('status').filter({ hasText: 'Transfert confirmé' })).toBeVisible()
  expect(attempts).toHaveLength(2); expect(attempts[1].requestId).toBe(attempts[0].requestId)
  expect(ui.snapshot.tables[0].covers).toHaveLength(0); expect(ui.snapshot.tables[1].covers[0].items).toEqual([ui.line])
  expect(confirmations).toBe(3)
})
