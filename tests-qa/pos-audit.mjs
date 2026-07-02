import { chromium } from '@playwright/test'
const browser = await chromium.launch({ channel: 'chrome', headless: true })
const page = await browser.newPage()
const errs = [], apiKo = []
page.on('pageerror', (e) => errs.push(String(e?.message).slice(0, 150)))
page.on('response', (r) => { if (r.status() >= 400) apiKo.push(`${r.status()} ${new URL(r.url()).pathname}`) })
page.on('dialog', (d) => d.dismiss().catch(() => {}))
await page.goto('http://localhost:5175', { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(2500)
// clique tous les contrôles visibles (hors destructifs), niveau 1 + niveau 2
const SKIP = /supprimer|delete|reset|vider|payer|encaisser|fermer la caisse/i
let dead = []
for (let round = 0; round < 2; round++) {
  const items = await page.evaluate(() => {
    const els = [...document.querySelectorAll('button, [role="button"], a[href]')]
    els.forEach((el, i) => el.setAttribute('data-qa', String(i)))
    return els.filter((el) => { const r = el.getBoundingClientRect(); return r.width > 4 && r.height > 4 })
      .map((el) => ({ i: Number(el.getAttribute('data-qa')), t: (el.innerText || el.getAttribute('aria-label') || '').trim().slice(0, 40) }))
  })
  const seen = new Set()
  for (const it of items) {
    if (!it.t || SKIP.test(it.t) || seen.has(it.t)) continue
    seen.add(it.t)
    try {
      const before = await page.evaluate(() => document.body.innerHTML.length)
      let net = 0; const onR = (r) => { if (r.url().includes('/api/')) net++ }
      page.on('request', onR)
      await page.locator(`[data-qa="${it.i}"]`).first().click({ timeout: 2000 })
      await page.waitForTimeout(500)
      const after = await page.evaluate(() => document.body.innerHTML.length).catch(() => before)
      page.off('request', onR)
      if (Math.abs(after - before) < 40 && net === 0) dead.push(it.t)
      await page.keyboard.press('Escape').catch(() => {})
    } catch { /* recouvert */ }
  }
}
console.log(`POS: erreurs JS: ${errs.length ? errs.join(' | ') : 'aucune'}`)
console.log(`POS: API KO: ${[...new Set(apiKo)].join(', ') || 'aucun'}`)
console.log(`POS: boutons sans réaction: ${[...new Set(dead)].join(' | ') || 'aucun'}`)
await browser.close()
