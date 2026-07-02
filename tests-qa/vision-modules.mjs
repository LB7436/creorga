import { chromium } from '@playwright/test'
const browser = await chromium.launch({ channel: 'chrome', headless: true })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
await page.goto('http://localhost:5174/login', { waitUntil: 'domcontentloaded' })
await page.evaluate(() => { localStorage.setItem('creorga-onboarded', '1'); localStorage.setItem('creorga.onboardingDone', String(Date.now())) })
await page.locator('input[type="email"]').fill('admin@creorga.local')
await page.locator('input[placeholder="••••••••"]').fill('Admin1234!')
await page.locator('button[type="submit"]').click()
await page.waitForURL('**/welcome')

const MODULES = process.env.MODS ? process.env.MODS.split(',') : [
  '/crm/clients', '/invoices/devis', '/inventory/stock', '/hr/planning',
  '/haccp/journee', '/accounting/caisse', '/reputation', '/pos/floor',
]
const results = []
for (const route of MODULES) {
  const errs = []
  page.on('pageerror', (e) => errs.push(String(e?.message).slice(0, 100)))
  await page.goto('http://localhost:5174' + route, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(1500)
  const slug = route.replace(/[^a-z]/gi, '_')
  await page.screenshot({ path: `tests-qa/vision/mod-${slug}.png` })
  // texte visible + nb de boutons + présence d'un titre
  const info = await page.evaluate(() => {
    const title = document.querySelector('h1, h2')?.textContent?.trim().slice(0, 50) || '(aucun titre h1/h2)'
    const btns = document.querySelectorAll('button, [role="button"]').length
    const inputs = document.querySelectorAll('input, textarea, select').length
    const bodyLen = (document.querySelector('#root')?.innerHTML || '').length
    // détecte texte "lorem"/"placeholder"/"TODO"/"à venir"
    const txt = document.body.innerText
    const suspects = ['lorem', 'placeholder', 'TODO', 'undefined', 'NaN', '[object Object]'].filter((s) => txt.includes(s))
    return { title, btns, inputs, bodyLen, suspects }
  })
  results.push({ route, ...info, jsErrors: errs.length })
  console.log(`${route}: titre="${info.title}" | ${info.btns} boutons, ${info.inputs} champs | suspects: ${info.suspects.join(',') || 'aucun'} | JS err: ${errs.length}${info.bodyLen < 200 ? ' ⚠️ VIDE' : ''}`)
  page.removeAllListeners('pageerror')
}
import fs from 'fs'
fs.writeFileSync('tests-qa/modules-vision.json', JSON.stringify(results, null, 2))
await browser.close()
