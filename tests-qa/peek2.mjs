import { chromium } from '@playwright/test'
const browser = await chromium.launch({ channel: 'chrome', headless: true })
const page = await browser.newPage()
for (const [name, url] of [['Marketing','http://localhost:5176'],['Superadmin','http://localhost:5177'],['Guest','http://localhost:5178']]) {
  await page.goto(url, { waitUntil: 'domcontentloaded' })
  await page.waitForTimeout(2500)
  const txt = await page.evaluate(() => document.body.innerText.replace(/\s+/g, ' ').slice(0, 150))
  console.log(`[${name}] ${txt}`)
}
await browser.close()
