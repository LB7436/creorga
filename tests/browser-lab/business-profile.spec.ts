import { test, expect, type Page, type BrowserContext } from '@playwright/test'
const backend = 'http://127.0.0.1:3002', web = 'http://localhost:5174'
async function laboratory(page: Page, context: BrowserContext) {
  const email = process.env.CREORGA_E2E_EMAIL || '', password = process.env.CREORGA_E2E_PASSWORD || ''
  if (process.env.CREORGA_LAB_BROWSER_TESTS !== '1' || !email.endsWith('.invalid') || !password) throw Error('Compte fictif requis')
  await context.route('**/*', route => ['127.0.0.1', 'localhost', '::1'].includes(new URL(route.request().url()).hostname) ? route.continue() : route.abort())
  await context.route('**/api/agent/**', route => route.fulfill({ status: 503, json: { error: 'IA neutralisée en laboratoire' } }))
  const login = await context.request.post(backend + '/api/auth/login', { data: { email, password } })
  expect(login.ok()).toBe(true)
  const session = await login.json(), membership = session.companies[0], companyId = membership.companyId || membership.company?.id
  if (session.companies.length !== 1 || membership.role !== 'OWNER' || !/fictif/i.test(membership.company?.name || '')) throw Error('Société fictive obligatoire')
  await context.addInitScript(data => localStorage.setItem('creorga-auth', JSON.stringify({ version: 0, state: {
    accessToken: data.accessToken, user: data.user, companies: data.companies, company: data.companies[0].company,
    companyId: data.companies[0].companyId || data.companies[0].company.id, isAuthenticated: true, role: 'owner', viewMode: 'owner', viewAsEmployeeId: null,
  } })), session)
  return { companyId, headers: { Authorization: 'Bearer ' + session.accessToken, 'x-company-id': companyId } }
}

test('profil métier : libellé puis reset efface seulement le brouillon confirmé', async ({ page, context }) => {
  await laboratory(page, context)
  let config: Record<string, any> = {}, revision = 1
  await context.route('**/api/module-config**', async route => {
    const req = route.request(), pathname = new URL(req.url()).pathname
    if (req.method() === 'PATCH') { const id = pathname.split('/').at(-1)!; config[id] = { displayMode: 'visible', ...req.postDataJSON() }; revision++ }
    if (req.method() === 'POST' && pathname.endsWith('/reset')) { config = {}; revision++ }
    await route.fulfill({ json: { config, updatedAt: revision } })
  })
  await page.goto(web + '/settings/modules')
  const input = page.getByPlaceholder(/Libellé personnalisé/).first()
  await expect(input).toBeEnabled(); await input.fill('Libellé FICTIF de recette'); await input.press('Tab')
  await expect(page.getByText('Enregistrement…', { exact: true })).toHaveCount(0)
  await page.getByRole('button', { name: '↺ Réinitialiser', exact: true }).click()
  await expect(input).toHaveValue('')
})

test('profil métier : un libellé refusé reste disponible pour correction', async ({ page, context }) => {
  await laboratory(page, context)
  await context.route('**/api/module-config**', route => route.request().method() === 'GET'
    ? route.fulfill({ json: { config: {}, updatedAt: 1 } })
    : route.fulfill({ status: 403, json: { error: 'Refus FICTIF de configuration' } }))
  await page.goto(web + '/settings/modules')
  const input = page.getByPlaceholder(/Libellé personnalisé/).first()
  await expect(input).toBeEnabled(); await input.fill('Saisie FICTIVE conservée'); await input.press('Tab')
  await expect(page.getByRole('alert').filter({ hasText: /Synchronisation/ })).toBeVisible()
  await expect(input).toHaveValue('Saisie FICTIVE conservée')
})

test('profil métier : jeux absents, menu QR présent et réglages ludiques préservés', async ({ page, context }) => {
  const { companyId } = await laboratory(page, context)
  expect((await context.request.get(backend + '/api/health').then(r => r.json())).profile).toBe('business')
  expect((await context.request.get(backend + '/api/game-scores?companyId=' + companyId)).status()).toBe(404)
  let snapshot = { companyId, restaurantName: 'Établissement FICTIF', toggles: { menu: true, order: true, games: true, reviews: true }, games: { mensch: true, scoopa: false },
    welcomeMessage: '', accentColor: '#6366f1', tableNumber: '1', themeMode: 'dark', updatedAt: 1 }
  const writes: any[] = []
  await context.route(/\/api\/portal-config(?:\?.*)?$/, async route => {
    if (route.request().method() === 'PATCH') { const patch = route.request().postDataJSON(); writes.push(patch); snapshot = { ...snapshot, ...patch, updatedAt: snapshot.updatedAt + 1 } }
    await route.fulfill({ json: snapshot })
  })
  await page.goto(web + '/clients')
  await expect(page.getByRole('heading', { name: 'Portail Client', exact: true })).toBeVisible()
  await expect(page.getByText('Activer les jeux', { exact: true })).toHaveCount(0)
  await expect(page.getByText('Jeux disponibles', { exact: true })).toHaveCount(0)
  const welcome = page.getByPlaceholder(/Ex: Bienvenue chez nous/)
  await welcome.fill('Bienvenue FICTIVE sans jeux')
  await page.getByRole('button', { name: 'Enregistrer le message', exact: true }).click()
  await expect.poll(() => writes.length).toBe(1)
  expect(writes[0].games).toBeUndefined(); expect(snapshot.games).toEqual({ mensch: true, scoopa: false }); expect(snapshot.toggles.games).toBe(true)
  await expect(page.getByText('URL :', { exact: true }).locator('..')).toContainText('http://localhost:5174/c?')
  for (const width of [375, 768, 1440]) {
    await page.setViewportSize({ width, height: 1000 })
    await page.goto(web + '/c?companyId=' + companyId)
    await expect(page.getByRole('button', { name: 'Menu', exact: true })).toBeVisible()
    await expect(page.getByRole('button', { name: /Jeux/ })).toHaveCount(0)
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1)).toBe(true)
  }
  await page.goto(web + '/c?companyId=' + companyId + '&embed=games')
  await expect(page.getByRole('heading', { name: 'Profil professionnel' })).toBeVisible()
})

test('planning métier : nuit de 4 h puis 8 h, refus visible sans perte de saisie', async ({ page, context }) => {
  await laboratory(page, context)
  const team = [{ userId: 'employee-fictif-a', role: 'EMPLOYEE', user: { id: 'employee-fictif-a', firstName: 'Camille', lastName: 'FICTIF', email: 'planning@fixture.invalid' }, profile: {} }]
  const writes: any[] = []
  await context.route('**/api/hr/team', route => route.fulfill({ json: team }))
  await context.route('**/api/hr/leave-requests', route => route.fulfill({ json: [] }))
  await context.route('**/api/reservations', route => route.fulfill({ json: [] }))
  await context.route('**/api/hr/shifts', route => {
    if (route.request().method() === 'GET') return route.fulfill({ json: [] })
    writes.push(route.request().postDataJSON()); return route.fulfill({ status: 409, json: { message: 'Conflit FICTIF de planning' } })
  })
  await page.goto(web + '/standalone/planning?view=day')
  // La grille est cliquable ; exercice réel du formulaire, pas d'import d'un store.
  await page.getByRole('button', { name: /Ajouter un shift .*20:00/ }).first().press('Enter')
  await expect(page.getByRole('heading', { name: 'Ajouter un shift' })).toBeVisible()
  await page.getByLabel('Employé', { exact: true }).selectOption('employee-fictif-a')
  await expect(page.getByLabel('Fin', { exact: true })).toHaveValue('24')
  await expect(page.getByText(/Durée écoulée : 4 h/)).toBeVisible()
  await page.getByLabel('Début', { exact: true }).selectOption('22'); await page.getByLabel('Fin', { exact: true }).selectOption('6')
  await expect(page.getByText(/Durée écoulée : 8 h/)).toBeVisible()
  await page.getByRole('button', { name: 'Ajouter', exact: true }).click()
  await expect(page.getByText(/Conflit FICTIF de planning/)).toBeVisible()
  await expect(page.getByLabel('Début', { exact: true })).toHaveValue('22'); await expect(page.getByLabel('Fin', { exact: true })).toHaveValue('6')
  expect(writes).toHaveLength(1)
  expect((Date.parse(writes[0].endTime) - Date.parse(writes[0].startTime)) / 3_600_000).toBe(8)
  expect(writes[0].breakMinutes).toBe(30)
})

test('portail métier : un enregistrement en cours verrouille les thèmes et évite le double clic', async ({ page, context }) => {
  const { companyId } = await laboratory(page, context)
  let snapshot = { companyId, toggles: {menu:true,games:true,reviews:true}, games: {mensch:true}, welcomeMessage:'', accentColor:'#6366f1', tableNumber:'1', themeMode:'dark', updatedAt:1 }
  let release!:()=>void
  const pending = new Promise<void>(resolve=>{release=resolve}), writes:any[]=[]
  await context.route(/\/api\/portal-config(?:\?.*)?$/, async route => {
    if(route.request().method()==='PATCH') { const patch=route.request().postDataJSON(); writes.push(patch); await pending; snapshot={...snapshot,...patch,updatedAt:2} }
    await route.fulfill({json:snapshot})
  })
  await page.goto(web+'/clients')
  const light=page.getByRole('button',{name:/^Clair/}), dark=page.getByRole('button',{name:/^Sombre/})
  await light.click(); await expect.poll(()=>writes.length).toBe(1)
  try { await expect(dark).toBeDisabled(); await expect(light).toBeDisabled() } finally { release() }
  await expect(light).toBeEnabled(); expect(writes).toHaveLength(1)
})

test('portail métier : un onglet ancien ne réactive pas le menu en enregistrant son message', async ({ page, context }) => {
  const { companyId } = await laboratory(page, context)
  let snapshot = { companyId, toggles: {menu:true,order:true,games:true,reviews:true}, games:{mensch:true}, welcomeMessage:'',accentColor:'#6366f1',tableNumber:'1',themeMode:'dark',updatedAt:1 }
  const writes:any[]=[]
  await context.route(/\/api\/portal-config(?:\?.*)?$/, async route=>{
    if(route.request().method()==='PATCH') { const patch=route.request().postDataJSON();writes.push(patch);snapshot={...snapshot,...patch,toggles:{...snapshot.toggles,...patch.toggles},games:{...snapshot.games,...patch.games},updatedAt:snapshot.updatedAt+1} }
    await route.fulfill({json:snapshot})
  })
  const second=await context.newPage()
  await page.goto(web+'/clients');await second.goto(web+'/clients')
  await expect(second.getByRole('heading',{name:'Portail Client',exact:true})).toBeVisible()
  await page.getByRole('switch',{name:'Afficher le menu',exact:true}).click()
  await expect.poll(()=>snapshot.toggles.menu).toBe(false)
  await second.getByPlaceholder(/Ex: Bienvenue chez nous/).fill('Message FICTIF autre onglet')
  await second.getByRole('button',{name:'Enregistrer le message',exact:true}).click()
  await expect.poll(()=>writes.length).toBe(2)
  expect(writes[1]).toEqual({welcomeMessage:'Message FICTIF autre onglet'});expect(snapshot.toggles.menu).toBe(false)
})
