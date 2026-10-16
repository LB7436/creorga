import { test, expect, type BrowserContext, type Page } from '@playwright/test'

const backend = 'http://127.0.0.1:3002'
const web = 'http://localhost:5174'

async function openFictitiousSession(page: Page, context: BrowserContext, path = '/ai') {
  const email = process.env.CREORGA_E2E_EMAIL || '', password = process.env.CREORGA_E2E_PASSWORD || ''
  if (process.env.CREORGA_LAB_BROWSER_TESTS !== '1' || !email.endsWith('.invalid') || !password) throw Error('Compte fictif de laboratoire obligatoire')
  await context.route('**/*', route => ['127.0.0.1', 'localhost', '::1'].includes(new URL(route.request().url()).hostname) ? route.continue() : route.abort())
  await context.route('**/api/agent/**', route => route.fulfill({ status: 503, json: { error: 'Prestataire IA neutralisé en laboratoire' } }))
  const login = await context.request.post(backend + '/api/auth/login', { data: { email, password } })
  expect(login.ok()).toBe(true)
  const session = await login.json(), member = session.companies[0]
  if (session.companies.length !== 1 || member.role !== 'OWNER' || !/fictif/i.test(member.company?.name || '')) throw Error('Société fictive propriétaire obligatoire')
  await context.addInitScript(data => localStorage.setItem('creorga-auth', JSON.stringify({ version: 0, state: {
    accessToken: data.accessToken, user: data.user, companies: data.companies, company: data.companies[0].company,
    companyId: data.companies[0].companyId || data.companies[0].company.id, isAuthenticated: true, role: 'owner', viewMode: 'owner', viewAsEmployeeId: null,
  } })), session)
  await page.goto(web + path)
  if (path === '/ai') {
    await page.getByRole('button', { name: 'Désactiver voix', exact: true }).click()
    await expect(page.getByRole('button', { name: 'Activer voix', exact: true })).toBeVisible()
  }
}

test('T100 assistant : une réponse sans voix libère la saisie suivante', async ({ page, context }) => {
  await openFictitiousSession(page, context)
  await page.route('**/api/agent/super-ask', route => route.fulfill({ json: { kind: 'text', text: 'Réponse fictive sans voix' } }))
  const input = page.getByPlaceholder(/Dites un ordre à/)
  await input.fill('Question fictive')
  await input.locator('..').locator('button[type=submit]').click()
  await expect(page.getByText('Réponse fictive sans voix', { exact: true })).toBeVisible()
  await input.fill('Deuxième question fictive')
  await expect(input.locator('..').locator('button[type=submit]')).toBeEnabled()
})

test('T100 assistant : validation refusée sans faux succès ni perte de l’aperçu', async ({ page, context }) => {
  await openFictitiousSession(page, context)
  await page.route('**/api/agent/super-ask', route => route.fulfill({ json: { kind: 'action', success: true, intent: 'preview', summary: 'Aperçu fictif', uiAction: { type: 'preview', confirmText: 'Décision fictive à confirmer', confirmEndpoint: '/api/agent/intent/confirm', confirmPayload: { test: true } } } }))
  let confirmations = 0
  await page.route('**/api/agent/intent/confirm', async route => { confirmations++; await route.fulfill({ status: 409, json: { error: 'Conflit fictif : aucune action appliquée' } }) })
  const input = page.getByPlaceholder(/Dites un ordre à/)
  await input.fill('Action fictive')
  await input.locator('..').locator('button[type=submit]').click()
  await page.getByRole('button', { name: /Valider/ }).evaluate((button: HTMLButtonElement) => { button.click(); button.click() })
  await expect(page.getByText(/Action validée/)).toHaveCount(0)
  await expect(page.getByText(/Conflit fictif/)).toBeVisible()
  await expect(page.getByText('Décision fictive à confirmer', { exact: true })).toBeVisible()
  expect(confirmations).toBe(1)

  await page.unroute('**/api/agent/intent/confirm')
  await page.route('**/api/agent/intent/confirm', route => { confirmations++; return route.abort('connectionfailed') })
  await page.getByRole('button', { name: /Valider/ }).click()
  await expect(page.getByRole('button', { name: 'Résultat à vérifier' })).toBeDisabled()
  await expect(page.getByRole('alert')).toContainText('aucune répétition automatique')
  expect(confirmations).toBe(2)
})

test('T100 assistant : une réponse tardive ne contamine pas une nouvelle discussion', async ({ page, context }) => {
  await openFictitiousSession(page, context)
  let release!: () => void
  const ready = new Promise<void>(resolve => { release = resolve })
  await page.route('**/api/agent/super-ask', async route => { await ready; await route.fulfill({ json: { kind: 'text', text: 'Réponse de la première discussion' } }) })
  const input = page.getByPlaceholder(/Dites un ordre à/)
  await input.fill('Question première discussion')
  await input.locator('..').locator('button[type=submit]').click()
  await expect(page.getByText(/réfléchit/)).toBeVisible()
  await page.getByRole('button', { name: 'Nouvelle conversation', exact: true }).click()
  await expect(page.getByText('Question première discussion', { exact: true })).toHaveCount(0)
  const response = page.waitForResponse('**/api/agent/super-ask')
  release()
  await response
  await page.getByRole('button', { name: 'Mes conversations', exact: true }).click()
  await page.getByText('Question première discussion', { exact: true }).first().click()
  await expect(page.getByText('Réponse de la première discussion', { exact: true })).toBeVisible()
  await page.getByRole('button', { name: 'Mes conversations', exact: true }).click()
  await page.getByText('Nouvelle discussion', { exact: true }).last().click()
  await expect(page.getByText('Question première discussion', { exact: true })).toHaveCount(0)
  await expect(page.getByText('Réponse de la première discussion', { exact: true })).toHaveCount(0)
  await page.reload()
  await page.getByRole('button', { name: 'Mes conversations', exact: true }).click()
  await page.getByText('Question première discussion', { exact: true }).first().click()
  await expect(page.getByText('Réponse de la première discussion', { exact: true })).toBeVisible()
})

test('T100 assistant : le PDF joint est transmis et sa réponse débloque la saisie', async ({ page, context }) => {
  await openFictitiousSession(page, context)
  let bytes = ''
  await page.route('**/api/agent/process-pdf', route => { bytes = route.request().postDataJSON().pdfBase64; return route.fulfill({ json: { text: 'PDF fictif analysé', summary: 'Document de laboratoire' } }) })
  const pdf = Buffer.from('%PDF-1.4\nDocument fictif de laboratoire\n%%EOF')
  await page.locator('input[type=file][accept*=".pdf"]').setInputFiles({ name: 'recette-fictive.pdf', mimeType: 'application/pdf', buffer: pdf })
  const input = page.getByPlaceholder(/pièce\(s\) jointe/)
  await input.fill('Lire ce document fictif')
  await input.locator('..').locator('button[type=submit]').click()
  await expect(page.getByText('PDF fictif analysé', { exact: true })).toBeVisible()
  expect(Buffer.from(bytes, 'base64')).toEqual(pdf)
})

test('T100 alertes : une erreur de chargement n’est jamais affichée comme Tout va bien', async ({ page, context }) => {
  await openFictitiousSession(page, context, '/m/alerts')
  await expect(page.getByText('Tout va bien', { exact: true })).toHaveCount(0)
  await expect(page.getByRole('alert')).toContainText(/indisponible|incomplète/i)
  await page.route('**/api/agent/execute', route => {
    const command = route.request().postDataJSON().commandId
    return command === 'pos.stale-sessions'
      ? route.fulfill({ status: 503, json: { error: 'Contrôle fictif indisponible' } })
      : route.fulfill({ json: { ui: { items: [] }, text: 'Aucun élément fictif' } })
  })
  await page.getByRole('button', { name: 'Actualiser les contrôles' }).click()
  await expect(page.getByRole('alert')).toContainText('Vérification incomplète')
  await expect(page.getByText(/2\/3 contrôles disponibles/)).toBeVisible()
  await page.unroute('**/api/agent/execute')
  await page.route('**/api/agent/execute', route => route.fulfill({ json: { ui: { items: [] }, text: 'Aucun élément fictif' } }))
  await page.getByRole('button', { name: 'Actualiser les contrôles' }).click()
  await expect(page.getByText('Aucune alerte détectée par ces contrôles', { exact: true })).toBeVisible()
  await expect(page.getByRole('alert')).toHaveCount(0)
})

test('T100 réglages : le choix d’assistant est réel, la biométrie financière indisponible est annoncée', async ({ page, context }) => {
  await openFictitiousSession(page, context, '/setup/assistant')
  await page.getByPlaceholder('Nommez votre assistant…').fill('Recette Robi')
  await page.locator('[data-mascot=chef]').click()
  await page.getByRole('button', { name: /Créer mon assistant/ }).click()
  await page.waitForURL('**/modules')
  await page.goto(web + '/setup/assistant')
  await expect(page.getByPlaceholder('Nommez votre assistant…')).toHaveValue('Recette Robi')
  await expect(page.locator('[data-mascot=chef]')).toHaveCSS('border-top-width', '2px')
  await page.goto(web + '/m/settings')
  await expect(page.getByText(/Biométrie financière.*indisponible/i)).toBeVisible()
  await expect(page.getByText('Confirmer biométrie pour > 200 €', { exact: true })).toHaveCount(0)
})
