// Smoke test TOWER DEFENSE v6 : placement, panneau tour, vague complète, preview
import { chromium } from 'playwright-core'
const OUT = process.argv[2] ?? '.'
const errors = []
const browser = await chromium.launch({ channel: 'msedge' })
const page = await browser.newPage({ viewport: { width: 414, height: 896 } })
page.on('pageerror', (err) => errors.push('PAGEERROR: ' + err.message))
page.on('console', (m) => { if (m.type() === 'error' && !m.text().includes('401') && !m.text().includes('500')) errors.push(m.text()) })
await page.addInitScript(() => {
  localStorage.setItem('creorga-guest-client-profile-v1', JSON.stringify({
    id: 'smoke-1', displayName: 'Testeur', email: 'test@creorga.lu', phone: '+352000000',
    provider: 'email', createdAt: 1, updatedAt: 1,
  }))
})

await page.goto('http://localhost:5174/c?table=7')
await page.waitForSelector('text=Jeux', { timeout: 30000 }).catch(() => {})
await page.waitForTimeout(800)
await page.locator('input[placeholder*="echercher"]').first().fill('Tower')
await page.waitForTimeout(500)
await page.locator('text=Tower Defense').first().click()
await page.waitForTimeout(600)
await page.locator('[role="dialog"]').getByText('Solo', { exact: true }).first().click()
await page.waitForTimeout(300)
await page.locator('button', { hasText: 'Lancer la partie' }).first().click()
await page.waitForTimeout(2500)

// menu TD : méta shop + records visibles, puis Démarrer
console.log('[1] menu: étoiles =', (await page.locator('text=/étoiles/').count()) > 0, '· records =', (await page.locator('text=/Records/').count()) > 0)
await page.locator('button', { hasText: 'Démarrer' }).first().click()
await page.waitForTimeout(1200)

// prep : preview de vague + timer absent avant vague 1
console.log('[2] preview vague 1 =', (await page.locator('text=Prochaine vague').count()) > 0, '·', (await page.locator('text=/8× Runner/').count()) > 0)

// placement souris (direct) : essaie plusieurs cellules
const canvas = page.locator('canvas').first()
const box = await canvas.boundingBox()
const spots = [[0.38, 0.52], [0.62, 0.46], [0.5, 0.66], [0.3, 0.4]]
let placed = false
for (const [fx, fy] of spots) {
  await canvas.click({ position: { x: box.width * fx, y: box.height * fy }, force: true })
  await page.waitForTimeout(400)
  if (await page.locator('text=/Cible :/').count()) { placed = true; break }
}
console.log('[3] tour placée + panneau (priorité ciblage) =', placed)
if (placed) {
  await page.locator('button', { hasText: 'Cible :' }).first().click()
  await page.waitForTimeout(200)
  console.log('[4] cycle priorité =', await page.locator('button', { hasText: 'Cible :' }).first().textContent())
  await page.locator('button', { hasText: 'Fermer' }).first().click()
}

// lancer la vague 1 puis accélérer x2
await page.locator('button', { hasText: /Vague 1\/15/ }).first().click()
await page.waitForTimeout(400)
const speedBtn = page.locator('button', { hasText: /^(1|1\.5|2)x$/ }).first()
await speedBtn.click(); await page.waitForTimeout(150); await speedBtn.click()
console.log('[5] vague lancée, vitesse =', await speedBtn.textContent())
await page.screenshot({ path: OUT + '/td-wave1.png' })

// attendre la fin de la vague 1 (retour prep : bouton Vague 2/15 + countdown)
const wave2 = page.locator('button', { hasText: /Vague 2\/15/ })
await wave2.waitFor({ timeout: 90000 })
const timerVisible = (await page.locator('text=/anticipée/').count()) > 0
console.log('[6] vague 1 terminée -> prep vague 2, countdown =', timerVisible)
await page.screenshot({ path: OUT + '/td-prep2.png' })

console.log('[7] erreurs console/page =', errors.length)
errors.slice(0, 6).forEach((e) => console.log('   -', e.slice(0, 160)))
await browser.close()
