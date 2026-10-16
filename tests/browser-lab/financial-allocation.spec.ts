import { test, expect } from '@playwright/test'
const backend = 'http://127.0.0.1:3002', pos = 'http://localhost:5175'
test('allocation QR : décision responsable, acomptes explicites, panne réseau, QR privés et paiement du groupe dans Chrome', async ({ page, context }, info) => {
  test.setTimeout(180000)
  const email = process.env.CREORGA_E2E_EMAIL || '', password = process.env.CREORGA_E2E_PASSWORD || ''
  if (process.env.CREORGA_LAB_BROWSER_TESTS !== '1' || !email.endsWith('.invalid') || !password) throw Error('Compte fictif de laboratoire obligatoire')
  await context.route('**/*', route => ['127.0.0.1', 'localhost', '::1'].includes(new URL(route.request().url()).hostname) ? route.continue() : route.abort())
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message)); page.on('dialog', d => d.accept())
  const login = await context.request.post(backend + '/api/auth/login', { data: { email, password } }); expect(login.ok()).toBe(true)
  const session = await login.json(), member = session.companies[0], companyId = member.companyId || member.company?.id
  if (session.companies.length !== 1 || member.role !== 'OWNER' || !/fictif/i.test(member.company?.name || '')) throw Error('Société fictive propriétaire obligatoire')
  const headers = { Authorization: 'Bearer ' + session.accessToken, 'x-company-id': companyId }
  async function api(url: string, method = 'GET', data?: any) {
    const r = await context.request.fetch(backend + '/api' + url, { method, headers, data })
    expect(r.ok(), url + ' HTTP ' + r.status()).toBe(true); return r.json()
  }
  const stamp = Date.now(), category = await api('/categories', 'POST', { name: 'ALLOCATION FICTIF ' + stamp })
  const product = await api('/products', 'POST', { categoryId: category.id, name: 'Café ALLOCATION FICTIF ' + stamp, price: 3.5, taxRate: 3, stock: 100 })
  const floor = await api('/floor-state'), name = 'ALLOCATION FICTIF ' + stamp
  const created = await api('/floor-state/tables', 'POST', { name, section: floor.zones[0].name, shape: 'round', seats: 4, x: 100, y: 100 }), table = created.tables.find((t: any) => t.name === name)
  const visit = await api('/guest-visits', 'POST', { tableId: table.id }), link = await api(`/guest-visits/${visit.id}/link`, 'POST')
  const ordered = await context.request.post(backend + '/api/guest/orders', { headers: { 'x-guest-access': link.token }, data: { companyId, tableId: table.id, requestId: crypto.randomUUID(), items: [{ productId: product.id, qty: 3 }] } })
  expect(ordered.ok()).toBe(true); const publicOrder = await ordered.json()
  const order = (await api('/orders')).find((o: any) => o.publicToken === publicOrder.id)
  await api('/pos/payments', 'POST', { requestId: crypto.randomUUID(), tableId: table.id, coverIds: ['guest:' + order.id], amountCents: 500, expectedOutstandingCents: 1050, method: 'CASH' })
  await api('/guest/orders/' + publicOrder.id + '/status', 'PATCH', { status: 'preparing' })
  const loginUi = async () => { await page.getByLabel('Adresse email', { exact: true }).fill(email); await page.getByLabel('Mot de passe', { exact: true }).fill(password); await page.getByRole('button', { name: 'Se connecter', exact: true }).click(); await page.getByRole('button', { name: 'Journal', exact: true }).waitFor() }
  const openTable = async () => { await page.getByRole('button', { name: new RegExp(name) }).press('Enter'); await page.getByRole('button', { name: 'Voir la commande', exact: true }).click() }
  await page.goto(pos); await loginUi(); await openTable()
  await page.getByRole('button', { name: 'Répartir la commande QR', exact: true }).press('Enter')
  const dialog = page.getByRole('dialog', { name: 'Répartir la commande QR', exact: true }); await expect(dialog.getByText('Total historique', { exact: false })).toBeVisible()
  for (const width of [375, 768, 1440]) {
    await page.setViewportSize({ width, height: 1000 })
    expect(await dialog.evaluate(el => el.scrollWidth <= el.clientWidth + 1)).toBe(true)
    for (let i = 0; i < 4; i++) { await page.keyboard.press('Tab'); expect(await dialog.evaluate(el => el.contains(document.activeElement))).toBe(true) }
  }
  await dialog.getByLabel('Quantité ' + product.name + ' — groupe 1 (total 3)', { exact: true }).fill('1')
  await dialog.getByLabel('Quantité ' + product.name + ' — groupe 2 (total 3)', { exact: true }).fill('2')
  await dialog.getByLabel('Consigne cuisine — groupe 1', { exact: true }).fill('Sans sel')
  await dialog.getByLabel('Consigne bar — groupe 2', { exact: true }).fill('Sans glace')
  await dialog.getByLabel(/Motif de la répartition/).fill('Décision de recette fictive, groupes distincts')
  await dialog.getByRole('button', { name: 'Calculer l’aperçu sans enregistrer', exact: true }).click()
  await expect(dialog.getByRole('alert')).toContainText(/règlement|acompte|Répartition/)
  await dialog.getByLabel(/Acompte 1 CASH.*groupe 1/).fill('2.00')
  await dialog.getByLabel(/Acompte 1 CASH.*groupe 2/).fill('3.00')
  await dialog.getByRole('button', { name: 'Calculer l’aperçu sans enregistrer', exact: true }).click()
  await expect(dialog.getByRole('heading', { name: /Aperçu —/ })).toBeFocused()
  await expect(dialog.getByRole('button', { name: 'Confirmer la répartition financière', exact: true })).toBeDisabled()
  await dialog.getByRole('checkbox').check()
  let operation: any
  await page.route('**/api/pos/financial-allocations', async route => { const r = await route.fetch(); expect(r.ok()).toBe(true); operation = await r.json(); await route.abort('connectionfailed') })
  await dialog.getByRole('button', { name: 'Confirmer la répartition financière', exact: true }).click()
  await expect(dialog).toBeHidden(); await page.unroute('**/api/pos/financial-allocations')
  expect(operation.groups.map((g: any) => g.outstandingCents).sort((a: number, b: number) => a - b)).toEqual([150, 400])
  const oldBill = await context.request.get(`${backend}/api/guest/bill/${table.id}?companyId=${companyId}`, { headers: { 'x-guest-access': link.token } }); expect(oldBill.status()).toBe(403)
  for (const g of operation.groups) {
    const renewed = await api(`/guest-visits/${g.visitId}/link`, 'POST')
    const bill = await context.request.get(`${backend}/api/guest/bill/${table.id}?companyId=${companyId}`, { headers: { 'x-guest-access': renewed.token } })
    expect((await bill.json()).total).toBe(g.outstandingCents / 100)
  }
  await page.reload(); await loginUi(); await openTable()
  await page.getByRole('button', { name: /Encaisser · F4/ }).click()
  const panel = page.getByRole('region', { name: 'Acompte et solde' })
  await panel.getByLabel('Groupe à encaisser').selectOption('guest:share:' + operation.groups[0].id)
  await panel.getByLabel('Moyen acompte', { exact: true }).selectOption('CARD')
  await panel.getByRole('button', { name: 'Enregistrer le solde / réessayer', exact: true }).click()
  await expect(panel.getByRole('status')).toContainText('Règlement déclaré enregistré')
  const current = await api('/orders/' + order.id)
  expect(current.paidAt).toBeNull(); expect(current.items[0].quantity).toBe(3)
  const kitchen = (await api('/pos/kitchen')).tickets.filter((t: any) => t.id === 'guest:' + order.id)
  expect(kitchen).toHaveLength(1); expect(kitchen[0].routing).toHaveLength(2); expect(kitchen[0].status).toBe('preparing')
  expect(errors).toEqual([])
  await info.attach('allocation-chrome-observations', { body: JSON.stringify({ widths: [375, 768, 1440], groups: 2, originalOrderCount: 1, originalQuantity: 3, oldQrStatus: 403, lostResponseRecovered: true, payment: 'manual_declaration_fictional', remainingOriginalCents: operation.groups[1].outstandingCents, pageErrors: errors }), contentType: 'application/json' })
})
