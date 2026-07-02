import { chromium } from '@playwright/test'
const ROUTE = process.env.ROUTE || '/crm/clients'
const NAME = process.env.NAME || 'shot'
const browser = await chromium.launch({ channel: 'chrome', headless: true })
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
await page.goto('http://localhost:5174/login', { waitUntil: 'domcontentloaded' })
await page.evaluate(() => { localStorage.setItem('creorga-onboarded', '1'); localStorage.setItem('creorga.onboardingDone', String(Date.now())) })
await page.locator('input[type="email"]').fill('admin@creorga.local')
await page.locator('input[placeholder="••••••••"]').fill('Admin1234!')
await page.locator('button[type="submit"]').click()
await page.waitForURL('**/welcome')
await page.goto('http://localhost:5174' + ROUTE, { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(1600)
await page.screenshot({ path: `tests-qa/vision/${NAME}.png` })
console.log('capturé', NAME)
await browser.close()
