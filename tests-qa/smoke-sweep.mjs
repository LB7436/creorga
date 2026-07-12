// Balayage non-régression : lance chaque jeu (par data-game-id), interactions
// génériques, capture pageerror + erreurs console + imbrication <button> dans <button>.
// Usage : node tests-qa/smoke-sweep.mjs <id1> <id2> ...
import { chromium } from 'playwright-core'

const IDS = process.argv.slice(2)
const PROFILE = { id: 'smoke', displayName: 'Testeur', email: 't@creorga.lu', phone: '+352', provider: 'email', createdAt: 1, updatedAt: 1 }
const BENIGN = /401|429|500|Failed to load resource|net::ERR|favicon/i

const browser = await chromium.launch({ channel: 'msedge' })
const results = []

for (const id of IDS) {
  const errors = []
  const page = await browser.newPage({ viewport: { width: 414, height: 896 } })
  page.on('pageerror', (e) => errors.push('PAGEERR: ' + String(e.message).slice(0, 130)))
  page.on('console', (m) => {
    if (m.type() !== 'error') return
    const t = m.text()
    if (BENIGN.test(t)) return
    errors.push(t.replace(/\s+/g, ' ').slice(0, 150))
  })
  await page.addInitScript((p) => localStorage.setItem('creorga-guest-client-profile-v1', JSON.stringify(p)), PROFILE)

  let mounted = false, nested = 0, note = ''
  try {
    await page.goto('http://localhost:5174/c?table=7', { waitUntil: 'domcontentloaded' })
    await page.waitForSelector('input[placeholder*="echercher"], input[placeholder*="Rechercher"]', { timeout: 20000 }).catch(() => {})
    await page.waitForTimeout(500)
    const card = page.locator(`[data-game-id="${id}"]`).first()
    if (!(await card.count())) { results.push({ id, mounted, nested, err: errors.length, note: 'carte introuvable' }); await page.close(); continue }
    await card.scrollIntoViewIfNeeded().catch(() => {})
    await card.click({ force: true })
    await page.waitForTimeout(500)
    const solo = page.locator('[role="dialog"]').getByText('Solo', { exact: true }).first()
    if (await solo.count()) await solo.click().catch(() => {})
    await page.waitForTimeout(150)
    const start = page.locator('[role="dialog"] button', { hasText: /Lancer la partie/ }).first()
    if (await start.count()) await start.click().catch(() => {})
    await page.waitForTimeout(1700)
    mounted = (await page.locator('button', { hasText: /←|Retour|Zurück/ }).count()) > 0

    const canvas = page.locator('canvas').first()
    if (await canvas.count()) {
      for (const [x, y] of [[207, 430], [150, 500], [260, 500], [207, 300], [207, 560]]) {
        await canvas.click({ position: { x, y }, force: true }).catch(() => {})
        await page.waitForTimeout(130)
      }
    }
    for (const k of ['ArrowRight', 'ArrowUp', 'ArrowLeft', 'ArrowDown', 'Enter', ' ']) {
      await page.keyboard.press(k).catch(() => {})
      await page.waitForTimeout(90)
    }
    const btns = page.locator('button')
    const n = Math.min(await btns.count(), 45)
    let clicked = 0
    for (let i = 0; i < n && clicked < 7; i++) {
      const b = btns.nth(i)
      const txt = ((await b.innerText().catch(() => '')) || '').trim()
      if (/←|Retour|Zurück|Menü|Spiele|Chat|Bewert|Nouvelle|Recommencer|Rejouer|Nochmal|Favoris/i.test(txt)) continue
      await b.click({ force: true, timeout: 800 }).catch(() => {})
      clicked++
      await page.waitForTimeout(130)
    }
    await page.waitForTimeout(300)
    nested = await page.evaluate(() => document.querySelectorAll('button button').length)
  } catch (e) {
    note = 'EXCEPTION: ' + String(e && e.message ? e.message : e).slice(0, 110)
  }
  results.push({ id, mounted, nested, err: errors.length, errs: errors.slice(0, 3), note })
  await page.close()
}

await browser.close()
console.log(JSON.stringify(results, null, 1))
