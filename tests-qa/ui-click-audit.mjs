/**
 * Audit QA UI intégral Creorga — clique chaque bouton/lien de chaque page et
 * mesure la réaction réelle. Détecte :
 *  - boutons morts (aucune réaction : ni navigation, ni modale, ni DOM, ni réseau)
 *  - erreurs JavaScript (pageerror + console.error)
 *  - appels API en échec (4xx/5xx)
 *  - pages blanches / redirections inattendues
 * Sortie : tests-qa/ui-audit-results.json + captures dans tests-qa/screenshots/
 *
 *   node tests-qa/ui-click-audit.mjs
 */
import { chromium } from '@playwright/test'
import fs from 'fs'
import path from 'path'

const BASE = 'http://localhost:5174'
const OUT_DIR = path.resolve('tests-qa')
const SHOT_DIR = path.join(OUT_DIR, 'screenshots')
fs.mkdirSync(SHOT_DIR, { recursive: true })

const DEFAULT_PAGES = [
  '/', '/modules', '/pos', '/pos/kitchen', '/crm', '/clients', '/invoices',
  '/inventory', '/hr', '/haccp', '/accounting', '/sales', '/agenda',
  '/reputation', '/ads', '/ai', '/owner', '/qrmenu', '/clickcollect',
  '/delivery', '/catering', '/maintenance', '/music', '/billing', '/backup',
  '/rgpd', '/changelog', '/community', '/formation', '/settings/modules',
  '/settings/theme', '/settings/language', '/admin', '/api', '/c?table=1',
]
// Surcharge possible : QA_PAGES="/crm,/pos" QA_CAP=200 node tests-qa/ui-click-audit.mjs
const PAGES = process.env.QA_PAGES ? process.env.QA_PAGES.split(',') : DEFAULT_PAGES
const CAP = Number(process.env.QA_CAP || 30)

// Boutons destructifs / de session à ne PAS cliquer
const SKIP_RE = /déconnexion|deconnexion|logout|supprimer|delete|réinitialiser|reinitialiser|reset|vider|effacer|retirer|annuler l|payer|encaisser/i

const results = { startedAt: new Date().toISOString(), pages: [] }

const browser = await chromium.launch({ channel: 'chrome', headless: true })
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } })
const page = await ctx.newPage()

async function snap(route, tag) {
  const name = route.replace(/[^a-z0-9]/gi, '_') + '-' + tag + '.png'
  await page.screenshot({ path: path.join(SHOT_DIR, name), fullPage: false }).catch(() => {})
}

// ── Login une fois ──────────────────────────────────────────────────────────
await page.goto(`${BASE}/login`, { waitUntil: 'domcontentloaded' })
await page.locator('input[type="email"]').fill('admin@creorga.local')
await page.locator('input[placeholder="••••••••"]').fill('Admin1234!')
await page.locator('button[type="submit"]').click()
await page.waitForURL('**/welcome', { timeout: 20000 })
console.log('[audit] connecté')

// Auto-fermer les dialogs natifs pour ne pas bloquer
page.on('dialog', (d) => d.dismiss().catch(() => {}))

for (const route of PAGES) {
  const report = {
    route, jsErrors: [], consoleErrors: [], failedRequests: [],
    deadButtons: [], testedButtons: 0, totalButtons: 0, notes: [],
  }
  const jsErr = (e) => report.jsErrors.push(String(e?.message || e).slice(0, 200))
  const conErr = (m) => { if (m.type() === 'error') report.consoleErrors.push(m.text().slice(0, 200)) }
  const failReq = (r) => {
    const s = r.status()
    if (s >= 400 && r.url().includes('/api/')) report.failedRequests.push(`${s} ${r.request().method()} ${new URL(r.url()).pathname}`)
  }
  page.on('pageerror', jsErr); page.on('console', conErr); page.on('response', failReq)

  try {
    await page.goto(BASE + route, { waitUntil: 'domcontentloaded', timeout: 20000 })
    await page.waitForTimeout(1200)

    const rootLen = await page.locator('#root').innerHTML().then((h) => h.length).catch(() => 0)
    if (rootLen < 50) { report.notes.push('ÉCRAN BLANC'); await snap(route, 'blank') }
    if (page.url().includes('/login')) report.notes.push('REDIRIGÉ VERS /login (session perdue)')

    // Enumère les contrôles cliquables visibles
    const tagAll = () => page.evaluate(() => {
      const els = [...document.querySelectorAll('button, [role="button"], a[href]')]
      els.forEach((el, i) => el.setAttribute('data-qa-idx', String(i)))
      return els
        .filter((el) => {
          const r = el.getBoundingClientRect()
          const st = getComputedStyle(el)
          return r.width > 4 && r.height > 4 && st.visibility !== 'hidden' && st.display !== 'none'
        })
        .map((el) => ({
          idx: Number(el.getAttribute('data-qa-idx')),
          tag: el.tagName.toLowerCase(),
          text: (el.innerText || el.getAttribute('aria-label') || el.getAttribute('title') || '').trim().slice(0, 60),
          href: el.getAttribute('href') || null,
          disabled: el.disabled === true,
        }))
    })
    const controls = await tagAll()
    report.totalButtons = controls.length

    // Déduplique par texte, saute destructifs/disabled/liens externes
    const seen = new Set()
    const toTest = controls.filter((c) => {
      if (c.disabled || !c.text) return false
      if (SKIP_RE.test(c.text)) return false
      if (c.href && /^(http|mailto|tel)/.test(c.href)) return false
      const key = c.text.toLowerCase()
      if (seen.has(key)) return false
      seen.add(key)
      return true
    }).slice(0, CAP)

    for (const c of toTest) {
      report.testedButtons++
      try {
        const before = await page.evaluate(() => ({
          url: location.href,
          dom: document.body.innerHTML.length,
          modals: document.querySelectorAll('[role="dialog"], [class*="modal"], [class*="Modal"], [class*="drawer"], [class*="Drawer"], [class*="overlay"]').length,
        }))
        let netActivity = 0
        const onReq = (r) => { if (r.url().includes('/api/')) netActivity++ }
        page.on('request', onReq)

        const el = page.locator(`[data-qa-idx="${c.idx}"]`)
        if (!(await el.count())) { page.off('request', onReq); continue }
        await el.first().click({ timeout: 3000 })
        await page.waitForTimeout(700)

        const after = await page.evaluate(() => ({
          url: location.href,
          dom: document.body.innerHTML.length,
          modals: document.querySelectorAll('[role="dialog"], [class*="modal"], [class*="Modal"], [class*="drawer"], [class*="Drawer"], [class*="overlay"]').length,
        })).catch(() => before)
        page.off('request', onReq)

        const navigated = after.url !== before.url
        const domChanged = Math.abs(after.dom - before.dom) > 40
        const modalOpened = after.modals > before.modals

        if (!navigated && !domChanged && !modalOpened && netActivity === 0) {
          report.deadButtons.push({ text: c.text, tag: c.tag })
        }

        // remise en état
        if (modalOpened) await page.keyboard.press('Escape').catch(() => {})
        if (navigated) {
          await page.goto(BASE + route, { waitUntil: 'domcontentloaded', timeout: 15000 })
          await page.waitForTimeout(600)
          await tagAll()
        }
      } catch {
        // clic impossible (élément recouvert, animation…) — non compté comme mort
      }
    }

    if (report.deadButtons.length || report.jsErrors.length) await snap(route, 'issues')
  } catch (e) {
    report.notes.push(`NAVIGATION ÉCHOUÉE: ${String(e?.message).slice(0, 120)}`)
  }

  page.off('pageerror', jsErr); page.off('console', conErr); page.off('response', failReq)
  results.pages.push(report)
  console.log(`[audit] ${route} — ${report.testedButtons}/${report.totalButtons} testés, ${report.deadButtons.length} morts, ${report.jsErrors.length} JS err, ${report.failedRequests.length} API KO`)
}

results.finishedAt = new Date().toISOString()
fs.writeFileSync(path.join(OUT_DIR, 'ui-audit-results.json'), JSON.stringify(results, null, 2))
console.log('[audit] terminé → tests-qa/ui-audit-results.json')
await browser.close()
