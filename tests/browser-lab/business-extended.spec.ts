import { test, expect } from '@playwright/test'
const backend = 'http://127.0.0.1:3002', web = 'http://localhost:5174'
test('gestion Chrome : température manuelle, erreur visible, persistance et conversion du devis', async ({ page, context }) => {
  const email = process.env.CREORGA_E2E_EMAIL || '', password = process.env.CREORGA_E2E_PASSWORD || ''
  if (process.env.CREORGA_LAB_BROWSER_TESTS !== '1' || !email.endsWith('.invalid') || !password) throw Error('Compte fictif obligatoire')
  await context.route('**/*', route => ['127.0.0.1', 'localhost', '::1'].includes(new URL(route.request().url()).hostname) ? route.continue() : route.abort())
  const login = await context.request.post(backend + '/api/auth/login', { data: { email, password } }); expect(login.ok()).toBe(true)
  const session = await login.json(), m = session.companies[0], companyId = m.companyId || m.company?.id
  if (session.companies.length !== 1 || m.role !== 'OWNER' || !/fictif/i.test(m.company?.name || '')) throw Error('Société fictive obligatoire')
  const headers = { Authorization: 'Bearer ' + session.accessToken, 'x-company-id': companyId }
  async function api(url: string, method = 'GET', data?: any) {
    const r = await context.request.fetch(backend + '/api' + url, { method, headers, data }); expect(r.ok(), url + ' ' + r.status()).toBe(true); return r.json()
  }
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message)); page.on('dialog', d => d.accept())
  await page.goto(web + '/login'); await page.getByLabel('Adresse email', { exact: true }).fill(email); await page.getByLabel('Mot de passe', { exact: true }).fill(password)
  await page.locator('button[type=submit]').click(); await page.waitForURL(u => u.pathname !== '/login')
  await page.goto(web + '/haccp/temperatures')
  await page.getByRole('button', { name: 'Enregistrer le contrôle', exact: true }).click()
  await expect(page.getByText(/Température manquante/)).toBeVisible()
  const note = 'Mesure manuelle FICTIVE Chrome ' + Date.now()
  await page.getByLabel('Température (°C)', { exact: true }).fill('4')
  await page.getByLabel('Notes', { exact: true }).fill(note)
  await page.getByRole('button', { name: 'Enregistrer le contrôle', exact: true }).click()
  await expect(page.getByText(note, { exact: false })).toBeVisible()
  await page.reload(); await expect(page.getByText(note, { exact: false })).toBeVisible()
  const log = (await api('/haccp/logs')).find((l: any) => l.notes === note)
  expect(log).toMatchObject({ value: 4, source: 'MANUAL' })
  const quote = await api('/invoices/quotes', 'POST', { notes: 'DEVIS FICTIF CHROME', items: [{ description: 'Prestation FICTIVE', quantity: 1, unitPrice: 10, taxRate: 17 }] })
  await page.goto(web + '/invoices/devis')
  await page.getByLabel('Rechercher un devis', { exact: true }).fill(quote.number)
  const converted = page.waitForResponse(r => r.url().endsWith(`/api/invoices/quotes/${quote.id}/convert`) && r.request().method() === 'POST')
  await page.getByRole('button', { name: 'Convertir ' + quote.number + ' en facture', exact: true }).click()
  const response = await converted; expect(response.ok()).toBe(true); const invoice = await response.json()
  const recorded = (await api('/invoices/quotes')).find((q: any) => q.id === quote.id)
  expect(recorded.convertedInvoiceId).toBe(invoice.id)
  expect((await api('/invoices/quotes/' + quote.id + '/convert', 'POST')).id).toBe(invoice.id)
  expect(errors).toEqual([])
})
