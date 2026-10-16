import { test, expect } from '@playwright/test'

// Ce parcours écrit seulement dans une société fictive du laboratoire loopback.
// Les secrets sont fournis hors dépôt. Aucun profil persistant n'est ouvert.
const backend = 'http://127.0.0.1:3002', web = 'http://localhost:5174', pos = 'http://localhost:5175'
test('fusion POS/QR, acompte, réponse perdue et addition privée renouvelée', async ({ page, context }) => {
  const email = process.env.CREORGA_E2E_EMAIL || '', password = process.env.CREORGA_E2E_PASSWORD || ''
  if (process.env.CREORGA_LAB_BROWSER_TESTS !== '1' || !email.endsWith('.invalid') || !password) throw new Error('Activation explicite et compte fictif .invalid requis')
  await context.route('**/*', route => {
    const u = new URL(route.request().url())
    return ['localhost', '127.0.0.1', '::1'].includes(u.hostname) || ['about:', 'data:', 'blob:'].includes(u.protocol) ? route.continue() : route.abort()
  })
  page.on('dialog', d => d.accept())
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message))
  const login = await context.request.post(backend + '/api/auth/login', { data: { email, password } })
  expect(login.ok()).toBe(true)
  const session = await login.json()
  expect(session.companies).toHaveLength(1)
  const member = session.companies[0], companyId = member.companyId || member.company?.id
  if (member.role !== 'OWNER' || !/fictif/i.test(member.company?.name || '')) throw new Error('Société propriétaire explicitement fictive obligatoire')
  const headers = { Authorization: 'Bearer ' + session.accessToken, 'x-company-id': companyId }
  async function api(url: string, method = 'GET', data?: any, extra = {}) {
    const r = await context.request.fetch(backend + '/api' + url, { method, headers: { ...headers, ...extra }, data })
    expect(r.ok(), 'Opération locale ' + url + ' HTTP ' + r.status()).toBe(true)
    return r.json()
  }
  const stamp = Date.now(), category = await api('/categories', 'POST', { name: 'FICTIF QR ' + stamp })
  const product = await api('/products', 'POST', { categoryId: category.id, name: 'Café FICTIF ' + stamp, price: 3.5, taxRate: 3 })
  const tables: any[] = [], visits: any[] = []
  for (const label of ['source', 'destination']) {
    const floor = await api('/floor-state'), name = 'E2E FICTIF ' + stamp + ' ' + label
    const saved = await api('/floor-state/tables', 'POST', { name, section: floor.zones[0].name, shape: 'round', seats: 2, x: 100, y: 100 })
    const table = saved.tables.find((t: any) => t.name === name); tables.push(table)
    const visit = await api('/guest-visits', 'POST', { tableId: table.id }), link = await api(`/guest-visits/${visit.id}/link`, 'POST')
    const ordered = await context.request.post(backend + '/api/guest/orders', { headers: { 'x-guest-access': link.token },
      data: { companyId, tableId: table.id, requestId: crypto.randomUUID(), items: [{ productId: product.id, qty: 1 }] } })
    expect(ordered.status()).toBe(201)
    visits.push({ ...visit, token: link.token, order: await ordered.json() })
  }
  const initial = await api('/pos/bootstrap'), guestCoverId = initial.tables.find((t: any) => t.id === tables[0].id).covers[0].id
  await api('/pos/payments', 'POST', { requestId: crypto.randomUUID(), tableId: tables[0].id, coverIds: [guestCoverId], amountCents: 100, expectedOutstandingCents: 350, method: 'CASH' })
  await page.goto(pos)
  await page.getByLabel('Adresse email', { exact: true }).fill(email); await page.getByLabel('Mot de passe', { exact: true }).fill(password)
  await page.getByRole('button', { name: 'Se connecter', exact: true }).click(); await page.getByRole('button', { name: 'Journal', exact: true }).waitFor()
  await page.getByRole('button', { name: new RegExp(tables[0].name) }).press('Enter'); await page.getByRole('button', { name: 'Voir la commande', exact: true }).click()
  await page.getByRole('button', { name: 'Transfert', exact: true }).click()
  let moved: any
  await page.route('**/api/pos/table-movements', async route => { const r = await route.fetch(); expect(r.ok()).toBe(true); moved = await r.json(); await route.abort('connectionfailed') })
  await page.getByRole('button', { name: new RegExp(tables[1].name) }).click()
  await expect.poll(async () => (await api('/pos/bootstrap')).tables.find((t: any) => t.id === tables[1].id).covers.length).toBe(2)
  await page.unroute('**/api/pos/table-movements')
  expect(moved.kind).toBe('MERGE'); expect(moved.visitIds.sort()).toEqual(visits.map(v => v.id).sort())
  const target = (await api('/pos/bootstrap')).tables.find((t: any) => t.id === tables[1].id)
  expect(target.covers.find((c: any) => c.id === guestCoverId).payment.outstandingCents).toBe(250)
  for (const v of visits) {
    const refused = await context.request.get(`${backend}/api/guest/bill/${tables[1].id}?companyId=${companyId}`, { headers: { 'x-guest-access': v.token } })
    expect(refused.status()).toBe(403)
  }
  await page.goto(web + '/login'); await page.getByLabel('Adresse email', { exact: true }).fill(email); await page.getByLabel('Mot de passe', { exact: true }).fill(password)
  await page.locator('button[type=submit]').click(); await page.waitForURL(u => u.pathname !== '/login')
  await page.goto(web + '/qrmenu'); await page.getByLabel('Table de la visite', { exact: true }).selectOption(tables[1].id)
  await expect(page.getByRole('button', { name: 'Ouvrir la visite et afficher son QR', exact: true })).toBeDisabled()
  for (const v of visits) {
    await page.getByLabel('Groupe QR à cette table', { exact: true }).selectOption(v.id)
    await page.getByRole('button', { name: 'Afficher un QR pour cette visite', exact: true }).click()
    const link = page.getByRole('link', { name: 'Ouvrir le portail de cette visite', exact: true }); await link.waitFor()
    const href = (await link.getAttribute('href'))!, token = new URLSearchParams(new URL(href).hash.slice(1)).get('access')!
    const bill = await context.request.get(`${backend}/api/guest/bill/${tables[1].id}?companyId=${companyId}`, { headers: { 'x-guest-access': token } })
    expect((await bill.json()).orderIds).toEqual([v.order.id])
    const guest = await context.newPage(); await guest.goto(href); await guest.getByRole('button', { name: 'Menu', exact: true }).click()
    await expect(guest.getByText(/Addition de cette visite/)).toBeVisible()
    await guest.close()
  }
  expect(errors).toEqual([])
  // Données de recette conservées : pas de purge ni de profil historique manipulé.
})
