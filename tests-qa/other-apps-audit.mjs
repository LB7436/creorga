import { chromium } from '@playwright/test'
const APPS = [
  { name: 'POS', url: 'http://localhost:5175' },
  { name: 'Marketing', url: 'http://localhost:5176' },
  { name: 'Superadmin', url: 'http://localhost:5177' },
  { name: 'Guest', url: 'http://localhost:5178' },
]
const browser = await chromium.launch({ channel: 'chrome', headless: true })
const page = await browser.newPage()
for (const app of APPS) {
  const errs = [], apiKo = []
  const h1 = (e) => errs.push(String(e?.message).slice(0, 120))
  const h2 = (r) => { if (r.status() >= 400) apiKo.push(`${r.status()} ${new URL(r.url()).pathname}`) }
  page.on('pageerror', h1); page.on('response', h2)
  try {
    await page.goto(app.url, { waitUntil: 'domcontentloaded', timeout: 15000 })
    await page.waitForTimeout(2000)
    const rootLen = await page.evaluate(() => (document.querySelector('#root')?.innerHTML || '').length)
    const btns = await page.evaluate(() => document.querySelectorAll('button, [role="button"], a[href]').length)
    console.log(`[${app.name}] root=${rootLen}ch, ${btns} contrôles, ${errs.length} erreurs JS, API KO: ${[...new Set(apiKo)].join(', ') || 'aucun'}${rootLen < 50 ? '  ⚠️ ÉCRAN BLANC' : ''}`)
  } catch (e) { console.log(`[${app.name}] INACCESSIBLE: ${String(e?.message).slice(0, 80)}`) }
  page.off('pageerror', h1); page.off('response', h2)
}
await browser.close()
