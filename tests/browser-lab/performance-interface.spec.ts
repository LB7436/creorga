import { test, expect } from '@playwright/test'
import os from 'node:os'
const backend = 'http://127.0.0.1:3002', pos = 'http://localhost:5175'
const summarize = (samples: number[]) => { const sorted = [...samples].sort((a, b) => a - b); return { samples: samples.map(n => Number(n.toFixed(2))), n: samples.length, minMs: sorted[0], medianMs: sorted[Math.floor(sorted.length / 2)], p95Ms: sorted[Math.ceil(sorted.length * .95) - 1], maxMs: sorted.at(-1) } }
test('mesures locales et interface synthétique 100 produits 25 tables 200 lignes', async ({ page, context, browser }, testInfo) => {
  test.setTimeout(180000)
  const email = process.env.CREORGA_E2E_EMAIL || '', password = process.env.CREORGA_E2E_PASSWORD || ''
  if (process.env.CREORGA_LAB_BROWSER_TESTS !== '1' || !email.endsWith('.invalid') || !password) throw new Error('Compte fictif de laboratoire obligatoire')
  await context.route('**/*', route => ['127.0.0.1', 'localhost', '::1'].includes(new URL(route.request().url()).hostname) ? route.continue() : route.abort())
  const login = await context.request.post(backend + '/api/auth/login', { data: { email, password } }); expect(login.ok()).toBe(true)
  const session = await login.json(), member = session.companies[0], companyId = member.companyId || member.company?.id
  if (session.companies.length !== 1 || member.role !== 'OWNER' || !/fictif/i.test(member.company?.name || '')) throw new Error('Société fictive propriétaire obligatoire')
  const headers = { Authorization: 'Bearer ' + session.accessToken, 'x-company-id': companyId }
  async function api(url: string, method = 'GET', data?: any, extra = {}) {
    const response = await context.request.fetch(backend + '/api' + url, { method, data, headers: { ...headers, ...extra } })
    expect(response.ok(), url + ' HTTP ' + response.status()).toBe(true); return response.json()
  }
  let floor = await api('/pos/bootstrap'), created: any[] = floor.tables.filter((t: any) => t.name.startsWith('Charge FICTIF ') && t.covers.some((c: any) => !c.id.startsWith('guest:') && !c.payment && c.items.length)).slice(0, 25)
  let addedFixture = { products: 0, tables: 0, nativeLines: 0 }
  if (created.length < 25 || floor.menu.length < 100) {
    if (floor.tables.length + 25 > 300) throw new Error('Le laboratoire atteint sa limite : conserver les données et préparer une autre société fictive, sans purge.')
    const stamp = Date.now(), category = await api('/categories', 'POST', { name: 'PERFORMANCE FICTIF ' + stamp }), products: any[] = []
    for (let i = 0; i < 100; i++) products.push(await api('/products', 'POST', { categoryId: category.id, name: `Article FICTIF ${stamp} ${i}`, price: 3.5 + i, taxRate: i % 2 ? 17 : 3 }))
    floor = await api('/pos/bootstrap'); const room = floor.editor.rooms[0].id
    created = Array.from({ length: 25 }, (_, i) => {
      const id = crypto.randomUUID()
      return { id, name: `Charge FICTIF ${stamp} ${i}`, section: room, shape: 'round', status: 'occupied', seats: 4, x: (i % 5) * 120, y: Math.floor(i / 5) * 100, mergedWith: [],
        covers: Array.from({ length: 4 }, (_, c) => { const coverId = crypto.randomUUID(); return { id: coverId, label: `Groupe ${c + 1}`, items: Array.from({ length: 2 }, (_, l) => { const product = products[(i * 4 + c + l) % products.length]; return { id: crypto.randomUUID(), menuItemId: product.id, name: product.name, price: product.price, taxRate: product.taxRate, qty: 1, note: '', coverId } }) } }) }
    })
    await api('/pos/draft', 'PUT', { tables: [...floor.tables, ...created], seats: floor.seats }, { 'If-Match': String(floor.revision) })
    addedFixture = { products: 100, tables: 25, nativeLines: 200 }
  }
  const reads: number[] = [], writes: number[] = [], dialogs: number[] = [], payments: number[] = []
  let current: any
  for (let i = 0; i < 20; i++) { const t = performance.now(); current = await api('/pos/bootstrap'); reads.push(performance.now() - t) }
  for (let i = 0; i < 10; i++) {
    current.tables.find((t: any) => t.id === created[0].id).x += 1
    const t = performance.now(), result = await api('/pos/draft', 'PUT', { tables: current.tables, seats: current.seats }, { 'If-Match': String(current.revision) })
    writes.push(performance.now() - t); current.revision = result.updatedAt
  }
  const payable = created.slice(3).flatMap(table => table.covers.filter((c: any) => !c.id.startsWith('guest:') && !c.payment && c.items.length).map((cover: any) => ({ table, cover }))).slice(0, 10)
  expect(payable).toHaveLength(10)
  for (let i = 0; i < payable.length; i++) {
    const { table, cover } = payable[i], amountCents = cover.items.reduce((n: number, l: any) => n + Math.round(l.price * l.qty * 100), 0)
    const t = performance.now(), result = await api('/pos/payments', 'POST', { requestId: crypto.randomUUID(), tableId: table.id, coverIds: [cover.id], amountCents, expectedOutstandingCents: amountCents, method: i % 2 ? 'CARD' : 'CASH' })
    payments.push(performance.now() - t); expect(result).toMatchObject({ status: 'SETTLED', outstandingCents: 0, confirmation: 'manual_declaration' })
  }
  const errors: string[] = []; page.on('pageerror', e => errors.push(e.message))
  await page.goto(pos); await page.getByLabel('Adresse email', { exact: true }).fill(email); await page.getByLabel('Mot de passe', { exact: true }).fill(password)
  await page.getByRole('button', { name: 'Se connecter', exact: true }).click(); await page.getByRole('button', { name: 'Journal', exact: true }).waitFor()
  await page.getByRole('button', { name: new RegExp(created[0].name) }).press('Enter'); await page.getByRole('button', { name: 'Voir la commande', exact: true }).click()
  const trigger = page.getByRole('button', { name: 'Séparer le groupe', exact: true }), dialog = page.getByRole('dialog', { name: 'Séparer le groupe sélectionné' })
  const ready = async () => { await expect(dialog).toBeVisible(); await expect.poll(() => dialog.evaluate(el => Number(getComputedStyle(el).opacity) * Number(getComputedStyle(el.parentElement!).opacity)), { intervals: [30], timeout: 5000 }).toBeGreaterThanOrEqual(.99) }
  for (let i = 0; i < 10; i++) { const t = performance.now(); await trigger.click(); await ready(); dialogs.push(performance.now() - t); await page.keyboard.press('Escape'); await expect(dialog).toBeHidden() }
  const sizes = []
  for (const width of [375, 768, 1440]) {
    await page.setViewportSize({ width, height: 1000 }); await trigger.click(); await ready()
    sizes.push({ width, dialogFits: await dialog.evaluate(el => el.scrollWidth <= el.clientWidth + 1), pageFits: await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1) })
    await testInfo.attach(`separation-${width}.png`, { body: await page.screenshot(), contentType: 'image/png' })
    await page.keyboard.press('Escape'); await expect(dialog).toBeHidden()
  }
  expect(sizes.every(s => s.dialogFits && s.pageFits)).toBe(true)
  await trigger.click(); await expect(dialog).toBeVisible()
  const contrast = await dialog.evaluate(root => {
    const rgba = (s: string) => { const numbers = s.match(/[\d.]+/g); return numbers ? numbers.map(Number) : [0, 0, 0, 0] }
    const over = (a: number[], b: number[]) => { const alpha = a[3] ?? 1; return [0, 1, 2].map(i => a[i] * alpha + b[i] * (1 - alpha)) }
    const luminance = (v: number[]) => v.slice(0, 3).map(n => n / 255).map(n => n <= .04045 ? n / 12.92 : ((n + .055) / 1.055) ** 2.4).reduce((s, n, i) => s + n * [.2126, .7152, .0722][i], 0)
    const nodes: Element[] = [root, ...root.querySelectorAll('*')]
    return nodes.filter(el => el.getBoundingClientRect().height && Array.from(el.childNodes).some(n => n.nodeType === Node.TEXT_NODE && n.textContent?.trim())).map(el => {
      const ancestors: Element[] = []; let p: Element | null = el
      while (p) { ancestors.unshift(p); p = p.parentElement }
      let bg = [255, 255, 255]
      for (const a of ancestors) bg = over(rgba(getComputedStyle(a).backgroundColor), bg)
      const fg = over(rgba(getComputedStyle(el).color), bg), a = luminance(fg), b = luminance(bg)
      return { tag: el.tagName, ratio: Number(((Math.max(a, b) + .05) / (Math.min(a, b) + .05)).toFixed(2)) }
    })
  })
  expect(contrast.filter(c => c.ratio < 4.5), 'Contraste des textes de la fenêtre ciblée').toEqual([])
  await page.keyboard.press('Escape')
  const metrics = { measuredAt: new Date().toISOString(), os: os.type() + ' ' + os.release(), cpu: os.cpus()[0].model, logicalCpus: os.cpus().length, ramGiB: Math.round(os.totalmem() / 2 ** 30), node: process.version, chrome: browser.version(), network: 'loopback, sans ralentissement artificiel, autres services locaux actifs', addedFixture, fixtureMode: addedFixture.tables ? 'création fictive' : 'réutilisation du jeu Charge FICTIF conservé, sans purge',
    actualDataset: { menuProducts: current.menu.length, tables: current.tables.length, openLines: current.tables.flatMap((t: any) => t.covers).flatMap((c: any) => c.items).length, salesInCurrentJournal: current.ventes.length },
    bootstrapHttpAndJson: summarize(reads), draftConfirmedHttpAndJson: summarize(writes), manualPaymentConfirmedHttpAndJson: summarize(payments), dialogClickToOpaquePlaywright: summarize(dialogs), sizes, dialogTextContrast: { sampledTextNodes: contrast.length, minRatio: Math.min(...contrast.map(c => c.ratio)) }, jsErrors: errors,
    limitations: 'Mesure mono-utilisateur synthétique : lectures, sauvegardes, règlements manuels fictifs et ouverture de dialogue. Pas une baseline, un service chargé, Core Web Vitals, matériel physique ou paiement bancaire.' }
  await testInfo.attach('performance-locale.json', { body: JSON.stringify(metrics, null, 2), contentType: 'application/json' })
  expect(errors).toEqual([])
})
