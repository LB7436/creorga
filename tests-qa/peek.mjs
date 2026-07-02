import { chromium } from '@playwright/test'
const browser = await chromium.launch({ channel: 'chrome', headless: true })
const page = await browser.newPage()
for (const [name, url] of [['Marketing','http://localhost:5176'],['Superadmin','http://localhost:5177']]) {
  await page.goto(url, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(2500)
  const txt = await page.evaluate(() => document.body.innerText.slice(0, 300))
  console.log(`── ${name} ──\n${txt}\n`)
  await page.screenshot({ path: `tests-qa/screenshots/app-${name.toLowerCase()}.png` })
}
await browser.close()
