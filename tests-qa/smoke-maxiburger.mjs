// Smoke test MAXI BURGER : profil pré-injecté, lancement, 3 taps, retour interne
import { chromium } from 'playwright-core'
const OUT = process.argv[2]
const errors = []
const browser = await chromium.launch({ channel: 'msedge' })
const page = await browser.newPage({ viewport: { width: 414, height: 896 } })
page.on('pageerror', (err) => errors.push('PAGEERROR: ' + err.message))
page.on('console', (m) => { if (m.type() === 'error' && !m.text().includes('401')) errors.push(m.text()) })
await page.addInitScript(() => {
  localStorage.setItem('creorga-guest-client-profile-v1', JSON.stringify({
    id: 'smoke-1', displayName: 'Testeur', email: 'test@creorga.lu', phone: '+352000000',
    provider: 'email', createdAt: 1, updatedAt: 1,
  }))
})

await page.goto('http://localhost:5174/c?table=7')
await page.waitForSelector('text=Jeux', { timeout: 30000 }).catch(() => {})
await page.waitForTimeout(1000)

const search = page.locator('input[placeholder*="echercher"]').first()
await search.fill('Maxi')
await page.waitForTimeout(500)
const card = page.locator('text=Maxi Burger').first()
if (!(await card.count())) { console.log('!! carte Maxi Burger introuvable'); await page.screenshot({ path: OUT + '/burger-hub.png' }); process.exit(2) }
await card.click()
await page.waitForTimeout(600)
await page.locator('[role="dialog"]').getByText('Solo', { exact: true }).first().click()
await page.waitForTimeout(300)
await page.locator('button', { hasText: 'Lancer la partie' }).first().click()
console.log('[1] partie lancée')
await page.waitForTimeout(2000)

// écran d'accueil du jeu
const playBtn = page.locator('button', { hasText: 'Jouer' }).last()
const hasPlay = await playBtn.count()
console.log('[2] écran accueil Maxi Burger =', hasPlay > 0)
if (hasPlay) await playBtn.click()
await page.waitForTimeout(600)
await page.screenshot({ path: OUT + '/burger-afterplay.png' })
await page.waitForTimeout(900)

// 4 taps sur le canvas (drop d'ingrédients)
const canvas = page.locator('canvas').first()
for (let i = 0; i < 4; i++) {
  await canvas.click({ position: { x: 207, y: 500 }, force: true })
  await page.waitForTimeout(950)
}
await page.screenshot({ path: OUT + '/burger-ingame.png' })
const floors = await page.locator('text=/étage/').first().textContent().catch(() => null)
console.log('[3] HUD étages =', floors)

// fin de partie -> Rejouer -> re-jeu -> sortie
const modalTxt = page.locator('text=/Nouveau record|Partie termin/')
if (await modalTxt.count()) {
  console.log('[4] GameOverModal affiché (record soumis)')
  await page.locator('button', { hasText: 'Rejouer' }).first().click()
  await page.waitForTimeout(900)
  await canvas.click({ position: { x: 207, y: 500 }, force: true })
  await page.waitForTimeout(900)
  console.log('[5] Rejouer fonctionne =', (await page.locator('text=/étage/').count()) > 0)
}
if (await modalTxt.count()) {
  await page.locator('button', { hasText: /^Retour$/ }).first().click()
} else {
  await page.locator('button', { hasText: '←' }).first().click({ force: true })
}
await page.waitForTimeout(1200)
console.log('[6] retour hub =', (await page.locator('input[placeholder*="echercher"]').count()) > 0)
console.log('[7] erreurs console/page =', errors.length)
errors.slice(0, 6).forEach((e) => console.log('   -', e.slice(0, 160)))
await browser.close()
