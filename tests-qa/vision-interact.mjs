/**
 * Auditeur d'interaction par module : clique chaque bouton visible (hors
 * destructifs), capture avant/après, et journalise la réaction observée.
 *   MODULE="/crm/clients" node tests-qa/vision-interact.mjs
 */
import { chromium } from '@playwright/test'
import fs from 'fs'

const MODULE = process.env.MODULE || '/crm/clients'
const CAP = Number(process.env.CAP || 24)
const slug = MODULE.replace(/[^a-z0-9]/gi, '_')
const dir = `tests-qa/vision/interact-${slug}`
fs.mkdirSync(dir, { recursive: true })
const SKIP = /déconnexion|logout|supprimer|delete|réinitialiser|reset|vider|payer|encaisser|clôturer|valider le paiement/i

const browser = await chromium.launch({ channel: 'chrome', headless: true })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
page.on('dialog', (d) => d.dismiss().catch(() => {}))
await page.goto('http://localhost:5174/login', { waitUntil: 'domcontentloaded' })
await page.evaluate(() => { localStorage.setItem('creorga-onboarded', '1'); localStorage.setItem('creorga.onboardingDone', String(Date.now())) })
await page.locator('input[type="email"]').fill('admin@creorga.local')
await page.locator('input[placeholder="••••••••"]').fill('Admin1234!')
await page.locator('button[type="submit"]').click()
await page.waitForURL('**/welcome')
await page.goto('http://localhost:5174' + MODULE, { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(1500)
await page.screenshot({ path: `${dir}/00-initial.png` })

const controls = await page.evaluate(() => {
  const els = [...document.querySelectorAll('button, [role="button"], a[href]')]
  els.forEach((el, i) => el.setAttribute('data-qi', String(i)))
  return els.filter((el) => { const r = el.getBoundingClientRect(); const s = getComputedStyle(el); return r.width > 4 && r.height > 4 && s.visibility !== 'hidden' })
    .map((el) => ({ i: Number(el.getAttribute('data-qi')), text: (el.innerText || el.getAttribute('aria-label') || el.title || '').trim().slice(0, 40) }))
})
const seen = new Set()
const toTest = controls.filter((c) => c.text && !SKIP.test(c.text) && !seen.has(c.text) && seen.add(c.text)).slice(0, CAP)
console.log(`${MODULE}: ${controls.length} contrôles, ${toTest.length} testés`)

const log = []
for (const c of toTest) {
  try {
    const before = await page.evaluate(() => ({ url: location.href, dom: document.body.innerHTML.length, modals: document.querySelectorAll('[role="dialog"],[class*="modal"],[class*="Modal"],[class*="drawer"],[class*="Drawer"]').length }))
    let net = 0; const onR = (r) => { if (r.url().includes('/api/')) net++ }
    page.on('request', onR)
    const el = page.locator(`[data-qi="${c.i}"]`)
    if (!(await el.count())) { page.off('request', onR); continue }
    await el.first().click({ timeout: 2500 })
    await page.waitForTimeout(650)
    const after = await page.evaluate(() => ({ url: location.href, dom: document.body.innerHTML.length, modals: document.querySelectorAll('[role="dialog"],[class*="modal"],[class*="Modal"],[class*="drawer"],[class*="Drawer"]').length }))
    page.off('request', onR)
    const nav = after.url !== before.url, dom = Math.abs(after.dom - before.dom) > 40, modal = after.modals > before.modals
    const reaction = nav ? `navigue → ${after.url.replace('http://localhost:5174', '')}` : modal ? 'ouvre panneau/modale' : dom ? 'change le contenu' : net ? 'appel réseau' : 'AUCUNE RÉACTION'
    log.push({ text: c.text, reaction })
    const safe = c.text.replace(/[^a-z0-9]/gi, '_').slice(0, 20) || 'x'
    if (modal || (dom && !nav)) await page.screenshot({ path: `${dir}/click-${c.i}-${safe}.png` })
    if (modal) await page.keyboard.press('Escape').catch(() => {})
    if (nav) { await page.goto('http://localhost:5174' + MODULE, { waitUntil: 'domcontentloaded' }); await page.waitForTimeout(700); await page.evaluate(() => { document.querySelectorAll('button,[role="button"],a[href]').forEach((el, i) => el.setAttribute('data-qi', String(i))) }) }
  } catch { log.push({ text: c.text, reaction: 'clic impossible (recouvert)' }) }
}
fs.writeFileSync(`${dir}/log.json`, JSON.stringify(log, null, 2))
console.log(log.map((l) => `  • "${l.text}" → ${l.reaction}`).join('\n'))
const dead = log.filter((l) => l.reaction === 'AUCUNE RÉACTION')
console.log(dead.length ? `\n⚠️ ${dead.length} sans réaction: ${dead.map((d) => d.text).join(', ')}` : '\n✅ tous réagissent')
await browser.close()
