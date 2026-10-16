import { test, expect, type Page, type BrowserContext } from '@playwright/test'
const backend = 'http://127.0.0.1:3002', web = 'http://localhost:5174'

async function laboratory(page: Page, context: BrowserContext) {
  const email = process.env.CREORGA_E2E_EMAIL || '', password = process.env.CREORGA_E2E_PASSWORD || ''
  if (process.env.CREORGA_LAB_BROWSER_TESTS !== '1' || !email.endsWith('.invalid') || !password) throw Error('Compte fictif obligatoire')
  await context.route('**/*', route => ['127.0.0.1', 'localhost', '::1'].includes(new URL(route.request().url()).hostname) ? route.continue() : route.abort())
  await context.route('**/api/agent/**', route => route.fulfill({ status: 503, json: { message: 'IA neutralisée en laboratoire' } }))
  const login = await context.request.post(backend + '/api/auth/login', { data: { email, password } })
  expect(login.ok()).toBe(true)
  const session = await login.json(), m = session.companies[0]
  if (session.companies.length !== 1 || m.role !== 'OWNER' || !/fictif/i.test(m.company?.name || '')) throw Error('Société fictive obligatoire')
  await context.addInitScript(data => localStorage.setItem('creorga-auth', JSON.stringify({ version: 0, state: {
    accessToken: data.accessToken, user: data.user, companies: data.companies, company: data.companies[0].company,
    companyId: data.companies[0].companyId || data.companies[0].company.id, isAuthenticated: true, role: 'owner', viewMode: 'owner', viewAsEmployeeId: null,
  } })), session)
}

test('T100 accès distant : saisir et sauvegarder une origine étrangère ne transmet aucune session', async ({ page, context }) => {
  await laboratory(page, context)
  let externalRequests = 0
  await context.route('https://autre.fixture.invalid/**', route => { externalRequests++; return route.abort() })
  await page.goto(web + '/m/world')
  await page.getByRole('textbox', { name: 'URL du serveur', exact: true }).fill('https://autre.fixture.invalid')
  await page.getByRole('button', { name: 'Sauvegarder & connecter', exact: true }).click()
  await expect(page.getByRole('alert')).toContainText('Aucun jeton n’a été envoyé')
  const outcome = await page.evaluate(async () => {
    const { fetchAuth } = await import('/src/lib/fetchAuth.ts')
    try { await fetchAuth('https://autre.fixture.invalid/api'); return 'SENT' } catch (e: any) { return e.message }
  })
  expect(outcome).toContain('non autorisée')
  expect(externalRequests).toBe(0)
})

test('T100 publicité : un refus de création conserve la saisie et affiche une erreur', async ({ page, context }) => {
  await laboratory(page, context)
  await context.route('**/api/ads', route => route.request().method() === 'GET' ? route.fulfill({ json: { ads: [] } }) : route.fulfill({ status: 503, json: { error: 'Enregistrement fictif refusé' } }))
  await page.goto(web + '/ads/regie')
  await page.getByRole('button', { name: '+ Nouvelle pub', exact: true }).click()
  const title = page.getByPlaceholder('Ex: Plat du jour : entrecôte', { exact: true })
  await title.fill('Offre T100 FICTIVE conservée')
  await page.getByRole('button', { name: /Créer la pub/ }).click()
  await expect(title).toBeVisible()
  await expect(title).toHaveValue('Offre T100 FICTIVE conservée')
  await expect(page.getByRole('alert')).toContainText('Enregistrement fictif refusé')
})

test('T100 stock : refus visible, valeur serveur restaurée et absence d’écriture inchangée', async ({ page, context }) => {
  await laboratory(page, context)
  let writes = 0
  await context.route(/\/api\/inventory\/ingredients(?:\/[^?]*)?(?:\?.*)?$/, route => {
    if (route.request().method() !== 'GET') { writes++; return route.fulfill({ status: 403, json: { message: 'Stock fictif refusé' } }) }
    return route.fulfill({ json: [{ id: 'ingredient-t100', name: 'Article T100 FICTIF', unit: 'pièce', costPerUnit: 1, currentStock: 10, minStockLevel: 2 }] })
  })
  await context.route('**/api/inventory/suppliers', route => route.fulfill({ json: [] }))
  await context.route('**/api/inventory/purchase-orders', route => route.fulfill({ json: [] }))
  await page.goto(web + '/inventory/stock')
  const input = page.getByRole('row').filter({ hasText: 'Article T100 FICTIF' }).getByRole('spinbutton')
  await expect(input).toHaveValue('10')
  await input.fill('99'); await input.press('Tab')
  await expect(page.getByText('Stock fictif refusé', { exact: true })).toBeVisible()
  await expect(input).toHaveValue('10')
  expect(writes).toBe(1)
  await input.focus(); await input.press('Tab')
  expect(writes).toBe(1)
})
