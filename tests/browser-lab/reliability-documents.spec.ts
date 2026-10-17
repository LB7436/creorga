import { test, expect, type BrowserContext, type Page } from '@playwright/test'
import { createHash } from 'node:crypto'
import { PDFDocument } from 'pdf-lib'

const backend = 'http://127.0.0.1:3002', web = 'http://localhost:5174'
async function laboratory(page: Page, context: BrowserContext) {
  const email = process.env.CREORGA_E2E_EMAIL || '', password = process.env.CREORGA_E2E_PASSWORD || ''
  const companyId = process.env.CREORGA_E2E_COMPANY_ID || '', otherCompanyId = process.env.CREORGA_E2E_OTHER_COMPANY_ID || ''
  if (process.env.CREORGA_LAB_BROWSER_TESTS !== '1' || !email.endsWith('.invalid') || !password || !companyId || !otherCompanyId) throw Error('Compte multi-sociétés fictif explicite requis')
  await context.route('**/*', route => ['127.0.0.1', 'localhost', '::1'].includes(new URL(route.request().url()).hostname) ? route.continue() : route.abort())
  await context.route('**/api/agent/**', route => route.fulfill({ status: 503, json: { error: 'IA neutralisée en laboratoire' } }))
  expect((await context.request.get(backend + '/api/health').then(r => r.json())).profile).toBe('business')
  const login = await context.request.post(backend + '/api/auth/login', { data: { email, password } })
  expect(login.ok()).toBe(true)
  const session = await login.json()
  const membership = session.companies.find((m: any) => (m.companyId || m.company?.id) === companyId)
  const other = session.companies.find((m: any) => (m.companyId || m.company?.id) === otherCompanyId)
  if (membership?.role !== 'OWNER' || other?.role !== 'EMPLOYEE' || !/fictif/i.test(membership?.company?.name || '') || !membership.company.address) throw Error('Société A fictive propriétaire et adresse de laboratoire requises')
  await context.addInitScript(({ session, companyId, membership, origin }) => {
    if (location.origin !== origin || location.pathname === '/api/document-download' || localStorage.getItem('creorga-document-fixture-seeded')) return
    localStorage.setItem('creorga-auth', JSON.stringify({ version: 0, state: { ...session,
      companyId, company: membership.company, isAuthenticated: true, role: 'owner', viewMode: 'owner', viewAsEmployeeId: null,
    } }))
    localStorage.setItem('creorga-document-fixture-seeded', '1')
  }, { session, companyId, membership, origin: web })
  const headers = { Authorization: 'Bearer ' + session.accessToken, 'x-company-id': companyId }
  const create = await context.request.post(backend + '/api/invoices', { headers, data: { notes: 'RECETTE FICTIVE T69', items: [{ description: 'Prestation FICTIVE de laboratoire', quantity: 1, unitPrice: 10, taxRate: 17 }] } })
  expect(create.status()).toBe(201)
  const invoice = await create.json()
  const issue = await context.request.put(`${backend}/api/invoices/${invoice.id}/status`, { headers, data: { status: 'SENT' } })
  expect(issue.status()).toBe(200)
  const issued = await issue.json()
  await page.goto(web + '/invoices/factures')
  await page.getByRole('textbox', { name: 'Rechercher une facture' }).fill(invoice.number)
  await page.getByRole('button', { name: `Voir ${invoice.number}`, exact: true }).press('Enter')
  await expect(page.getByRole('region', { name: 'Liens temporaires du PDF' })).toBeVisible()
  return { companyId, otherCompanyId, headers, invoice: issued }
}
async function pdfBytes(page: Page) {
  const event = page.waitForEvent('download')
  await page.getByRole('button', { name: 'Télécharger le PDF original', exact: true }).press('Enter')
  const download = await event, stream = await download.createReadStream()
  if (!stream) throw Error('Flux PDF non reçu')
  const chunks: Buffer[] = []; for await (const chunk of stream) chunks.push(Buffer.from(chunk))
  const bytes = Buffer.concat(chunks)
  expect(bytes.subarray(0, 5).toString()).toBe('%PDF-')
  expect((await PDFDocument.load(bytes)).getPageCount()).toBeGreaterThan(0)
  return bytes
}

test('documents métier : vrai PDF au clavier, rejeu, rechargement et révocation sans octets divulgués', async ({ page, context }) => {
  const { invoice } = await laboratory(page, context)
  const posts: { auth: boolean; cookie: boolean; query: boolean }[] = []
  context.on('request', request => {
    if (new URL(request.url()).pathname === '/api/document-download' && request.method() === 'POST') posts.push({ auth: Boolean(request.headers().authorization), cookie: Boolean(request.headers().cookie), query: Boolean(new URL(request.url()).search) })
  })
  const created = page.waitForResponse(response => response.url().endsWith(`/api/invoices/${invoice.id}/document-links`) && response.request().method() === 'POST')
  await page.getByRole('button', { name: 'Créer un lien temporaire', exact: true }).press('Enter')
  const link = await (await created).json()
  await expect(page.getByRole('status').filter({ hasText: 'Rien n’a été envoyé ni copié automatiquement.' })).toBeVisible()
  const popupEvent = page.waitForEvent('popup')
  await page.getByRole('link', { name: 'Ouvrir le lien créé', exact: true }).press('Enter')
  const popup = await popupEvent
  await expect(popup.getByRole('heading', { name: 'Votre document PDF' })).toBeVisible()
  expect(Boolean(new URL(popup.url()).hash)).toBe(false)
  const first = await pdfBytes(popup), second = await pdfBytes(popup)
  expect(createHash('sha256').update(first).digest('hex')).toBe(invoice.issuedPdfHash)
  expect(first.equals(second)).toBe(true)
  expect(posts.length).toBe(2)
  expect(posts.every(entry => !entry.auth && !entry.cookie && !entry.query)).toBe(true)
  await page.reload()
  await page.getByRole('textbox', { name: 'Rechercher une facture' }).fill(invoice.number)
  await page.getByRole('button', { name: `Voir ${invoice.number}`, exact: true }).click()
  await expect(page.getByRole('link', { name: 'Ouvrir le lien créé', exact: true })).toHaveCount(0)
  await page.getByRole('button', { name: `Révoquer le lien ${link.id.slice(0, 8)}`, exact: true }).click()
  await page.getByRole('textbox', { name: 'Motif de révocation', exact: true }).fill('Fin de recette FICTIVE')
  await page.getByRole('textbox', { name: 'Motif de révocation', exact: true }).press('Enter')
  await expect(page.getByRole('status').filter({ hasText: 'Lien révoqué pour les nouvelles demandes.' })).toBeVisible()
  let unexpectedDownload = false; popup.on('download', () => { unexpectedDownload = true })
  const refused = popup.waitForResponse(response => new URL(response.url()).pathname === '/api/document-download' && response.request().method() === 'POST')
  await popup.getByRole('button', { name: 'Télécharger le PDF original', exact: true }).click()
  expect((await refused).status()).toBe(404)
  await expect(popup.getByRole('status')).toContainText('Téléchargement refusé ou interrompu')
  expect(unexpectedDownload).toBe(false)
  await popup.close()
})

test('documents métier : réponse perdue, reprise par même référence et erreur visible', async ({ page, context }) => {
  const { invoice, headers } = await laboratory(page, context)
  let lost = false; const requests: string[] = [], expiry: string[] = []
  await context.route(`**/api/invoices/${invoice.id}/document-links`, async route => {
    if (route.request().method() !== 'POST') return route.continue()
    requests.push(route.request().postDataJSON().requestId)
    const response = await route.fetch(); const body = await response.json(); expiry.push(body.expiresAt)
    if (!lost) { lost = true; return route.fulfill({ status: 503, json: { message: 'Accusé FICTIF perdu après création. Reprenez la même référence.' } }) }
    return route.fulfill({ response })
  })
  await page.getByRole('button', { name: 'Créer un lien temporaire', exact: true }).click()
  await expect(page.getByRole('alert').filter({ hasText: 'Accusé FICTIF perdu' })).toBeVisible()
  await expect(page.getByRole('link', { name: 'Ouvrir le lien créé', exact: true })).toHaveCount(0)
  await page.getByRole('button', { name: 'Créer un lien temporaire', exact: true }).click()
  await expect(page.getByRole('link', { name: 'Ouvrir le lien créé', exact: true })).toBeVisible()
  expect(requests.length).toBe(2); expect(requests[0] === requests[1]).toBe(true)
  expect(expiry[0] === expiry[1]).toBe(true)
  const list = await context.request.get(`${backend}/api/invoices/${invoice.id}/document-links`, { headers })
  expect(list.ok()).toBe(true); expect((await list.json()).length).toBe(1)
})

test('documents métier : aller-retour réel de société pendant le digest ne réactive pas un ancien envoi email', async ({ page, context }) => {
  const { invoice, companyId, otherCompanyId } = await laboratory(page, context)
  await page.evaluate(invoiceId => {
    const original = crypto.subtle.digest.bind(crypto.subtle)
    ;(window as any).__documentDigestHeld = false
    crypto.subtle.digest = async (algorithm, data) => {
      const text = new TextDecoder().decode(data as ArrayBuffer)
      if (!text.includes(invoiceId)) return original(algorithm, data)
      ;(window as any).__documentDigestHeld = true
      await new Promise<void>(resolve => { (window as any).__releaseDocumentDigest = resolve })
      return original(algorithm, data)
    }
  }, invoice.id)
  let sends = 0
  await context.route(`**/api/invoices/${invoice.id}/email`, route => { sends++; return route.fulfill({ status: 503, json: { message: 'Envoi interdit pendant cette recette' } }) })
  await page.getByPlaceholder('Adresse de test .invalid en recette locale').fill('destinataire@fixture.invalid')
  await page.getByRole('button', { name: 'Envoyer le PDF par email', exact: true }).click()
  await expect.poll(() => page.evaluate(() => Boolean((window as any).__documentDigestHeld))).toBe(true)
  page.once('dialog', dialog => dialog.accept())
  await page.getByRole('combobox', { name: 'Société active', exact: true }).selectOption(otherCompanyId)
  await expect(page.getByRole('dialog', { name: `Facture ${invoice.number}`, exact: true })).toHaveCount(0)
  page.once('dialog', dialog => dialog.accept())
  await page.getByRole('combobox', { name: 'Société active', exact: true }).selectOption(companyId)
  await expect(page.getByRole('combobox', { name: 'Société active', exact: true })).toHaveValue(companyId)
  await page.evaluate(() => (window as any).__releaseDocumentDigest())
  await expect.poll(() => page.evaluate(() => Object.keys(localStorage).filter(key => key.startsWith('creorga-invoice-mail:')).length)).toBe(0)
  expect(sends).toBe(0)
  await expect(page.getByRole('region', { name: 'Liens temporaires du PDF' })).toHaveCount(0)
})

test('documents métier : une ancienne lecture HTTP retardée ne fait pas disparaître le nouveau lien confirmé', async ({ page, context }) => {
  const { invoice } = await laboratory(page, context)
  await page.getByRole('dialog', { name: `Facture ${invoice.number}`, exact: true }).getByRole('button', { name: 'Fermer', exact: true }).click()
  let release!: () => void, captured = false, scheduled = false
  const held = new Promise<void>(resolve => { release = resolve })
  await context.route(`**/api/invoices/${invoice.id}/document-links`, async route => {
    if (route.request().method() !== 'GET' || scheduled) return route.continue()
    scheduled = true
    const snapshot = await route.fetch()
    expect((await snapshot.json()).length).toBe(0)
    captured = true
    await held
    return route.fulfill({ response: snapshot })
  })
  await page.getByRole('button', { name: `Voir ${invoice.number}`, exact: true }).click()
  await expect.poll(() => captured).toBe(true)
  const create = page.waitForResponse(response => response.url().endsWith(`/api/invoices/${invoice.id}/document-links`) && response.request().method() === 'POST')
  await page.getByRole('button', { name: 'Créer un lien temporaire', exact: true }).click()
  const link = await (await create).json()
  const revoke = page.getByRole('button', { name: `Révoquer le lien ${link.id.slice(0, 8)}`, exact: true })
  await expect(revoke).toBeVisible()
  const oldResponse = page.waitForResponse(response => response.url().endsWith(`/api/invoices/${invoice.id}/document-links`) && response.request().method() === 'GET')
  release(); await oldResponse
  await expect(revoke).toBeVisible()
})
