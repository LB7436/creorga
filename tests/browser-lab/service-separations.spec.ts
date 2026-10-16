import { test, expect } from '@playwright/test'
const backend = 'http://127.0.0.1:3002', pos = 'http://localhost:5175'

test('séparations natives : clavier, réponse perdue, prix historiques, préparation et rechargement', async ({ page, context }) => {
  const email = process.env.CREORGA_E2E_EMAIL || '', password = process.env.CREORGA_E2E_PASSWORD || ''
  if (process.env.CREORGA_LAB_BROWSER_TESTS !== '1' || !email.endsWith('.invalid') || !password) throw new Error('Laboratoire et compte fictif requis')
  await context.route('**/*', route => ['127.0.0.1', 'localhost', '::1'].includes(new URL(route.request().url()).hostname) ? route.continue() : route.abort())
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message)); page.on('dialog', d => d.accept())
  const login = await context.request.post(backend + '/api/auth/login', { data: { email, password } }); expect(login.ok()).toBe(true)
  const session = await login.json(), member = session.companies[0], companyId = member.companyId || member.company?.id
  if (session.companies.length !== 1 || member.role !== 'OWNER' || !/fictif/i.test(member.company?.name || '')) throw new Error('Société propriétaire fictive obligatoire')
  const headers = { Authorization: 'Bearer ' + session.accessToken, 'x-company-id': companyId }
  async function api(url: string, method = 'GET', data?: any, extra = {}) {
    const r = await context.request.fetch(backend + '/api' + url, { method, headers: { ...headers, ...extra }, data })
    expect(r.ok(), url + ' HTTP ' + r.status()).toBe(true); return r.json()
  }
  const stamp = Date.now(), category = await api('/categories', 'POST', { name: 'FICTIF séparation ' + stamp })
  const product = await api('/products', 'POST', { categoryId: category.id, name: 'Café FICTIF séparé ' + stamp, price: 3.5, taxRate: 3 })
  const tables: any[] = []
  for (const label of ['source', 'destination', 'groupe']) {
    const floor = await api('/floor-state'), name = 'RECETTE FICTIF ' + stamp + ' ' + label
    const saved = await api('/floor-state/tables', 'POST', { name, section: floor.zones[0].name, shape: 'round', seats: 2, x: 100, y: 100 })
    tables.push(saved.tables.find((t: any) => t.name === name))
  }
  const before = await api('/pos/bootstrap'), coverId = crypto.randomUUID(), lineId = crypto.randomUUID()
  before.tables.find((t: any) => t.id === tables[0].id).covers.push({ id: coverId, label: 'Groupe FICTIF natif', items: [{ id: lineId, menuItemId: product.id, name: product.name, price: 3.5, qty: 3, note: 'Bar : sans glace ; cuisine : sans sel', coverId }] })
  await api('/pos/draft', 'PUT', { tables: before.tables, seats: before.seats }, { 'If-Match': String(before.revision) })
  const ticket = (await api('/pos/kitchen')).tickets.find((t: any) => t.id === coverId)
  await api('/pos/kitchen/' + coverId, 'PATCH', { status: 'ready', updatedAt: ticket.updatedAt })
  const loginUi = async () => { await page.getByLabel('Adresse email', { exact: true }).fill(email); await page.getByLabel('Mot de passe', { exact: true }).fill(password); await page.getByRole('button', { name: 'Se connecter', exact: true }).click(); await page.getByRole('button', { name: 'Journal', exact: true }).waitFor() }
  await page.goto(pos); await loginUi()
  const openTable = async (name: string) => { await page.getByRole('button', { name: new RegExp(name) }).press('Enter'); await page.getByRole('button', { name: 'Voir la commande', exact: true }).click() }
  await openTable(tables[0].name)
  const line = page.getByRole('button', { name: 'Sélectionner la ligne ' + product.name, exact: true })
  await line.press('Enter')
  await page.getByRole('button', { name: 'Séparer une ligne', exact: true }).press('Enter')
  const dialog = page.getByRole('dialog', { name: 'Séparer une ligne', exact: true })
  await expect(dialog).toBeVisible()
  for (let i = 0; i < 15; i++) { await page.keyboard.press('Tab'); expect(await dialog.evaluate(el => el.contains(document.activeElement))).toBe(true) }
  await dialog.getByLabel('Quantité à déplacer').fill('1'); await dialog.getByLabel('Table de destination').selectOption(tables[1].id)
  let operation: any
  await page.route('**/api/pos/service-separations', async route => { const r = await route.fetch(); expect(r.ok()).toBe(true); operation = await r.json(); await route.abort('connectionfailed') })
  await dialog.getByRole('button', { name: 'Confirmer la séparation', exact: true }).click()
  await expect(dialog).toBeHidden(); await page.unroute('**/api/pos/service-separations')
  expect(operation.lineMoves[0]).toMatchObject({ sourceLineId: lineId, qty: 1, price: 3.5, taxRate: 3 })
  const after = await api('/pos/bootstrap')
  expect(after.tables.find((t: any) => t.id === tables[0].id).covers[0].items[0].qty).toBe(2)
  expect(after.tables.find((t: any) => t.id === tables[1].id).covers[0].items[0]).toMatchObject({ qty: 1, price: 3.5, taxRate: 3 })
  const kitchens = (await api('/pos/kitchen')).tickets.filter((t: any) => t.id === coverId || t.coverId === operation.targetCoverId)
  expect(kitchens).toHaveLength(1); expect(kitchens[0].status).toBe('ready'); expect(kitchens[0].routing.map((r: any) => r.qty).sort()).toEqual([1, 2])
  await page.reload(); await loginUi()
  await openTable(tables[1].name)
  for (const width of [375, 768, 1440]) {
    await page.setViewportSize({ width, height: 1000 })
    await page.getByRole('button', { name: 'Séparer le groupe', exact: true }).click()
    const group = page.getByRole('dialog', { name: 'Séparer le groupe sélectionné', exact: true }); await expect(group).toBeVisible()
    expect(await group.evaluate(el => el.scrollWidth <= el.clientWidth + 1)).toBe(true)
    await page.keyboard.press('Escape'); await expect(group).toBeHidden()
    await expect(page.getByRole('button', { name: 'Séparer le groupe', exact: true })).toBeFocused()
  }
  await page.getByRole('button', { name: 'Séparer le groupe', exact: true }).click()
  await page.getByRole('dialog').getByRole('button', { name: new RegExp(tables[2].name) }).click()
  await expect.poll(async () => (await api('/pos/bootstrap')).tables.find((t: any) => t.id === tables[2].id).covers.length).toBe(1)
  expect((await api('/pos/bootstrap')).tables.find((t: any) => t.id === tables[1].id).covers).toHaveLength(0)
  // Fixture persistante pour la restauration des nouvelles contraintes. Le
  // parcours de réservation est ici HTTP, pas une interface de réservation livrée.
  const reservedTable = await api('/tables', 'POST', { name: 'Réservation FICTIF ' + stamp, capacity: 4 })
  const reservation = await api('/reservations', 'POST', { tableId: reservedTable.id, guestName: 'Groupe FICTIF recette', partySize: 2, date: '2027-04-10T17:00:00Z' })
  expect((await api('/reservations?date=2027-04-10')).some((r: any) => r.id === reservation.id)).toBe(true)
  expect(errors).toEqual([])
})
