import { chromium } from '@playwright/test'
const browser = await chromium.launch({ channel: 'chrome', headless: true })
const page = await browser.newPage()
page.on('response', async (r) => { if (r.url().includes('/api/crm/customers')) console.log('RÉPONSE', r.status(), r.url(), '→', (await r.text()).slice(0,80)) })
await page.goto('http://localhost:5174/login', { waitUntil: 'domcontentloaded' })
await page.evaluate(() => { localStorage.setItem('creorga-onboarded', '1'); localStorage.setItem('creorga.onboardingDone', String(Date.now())) })
await page.locator('input[type="email"]').fill('admin@creorga.local')
await page.locator('input[placeholder="••••••••"]').fill('Admin1234!')
await page.locator('button[type="submit"]').click()
await page.waitForURL('**/welcome')
await page.goto('http://localhost:5174/crm/clients', { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(3000)
// fetch manuel avec le token du store
const res = await page.evaluate(async () => {
  const t = JSON.parse(localStorage.getItem('creorga-auth')||'{}')?.state?.accessToken
  const r = await fetch('/api/crm/customers', { headers: { Authorization: 'Bearer '+t } })
  return r.status + ' ' + (await r.text()).slice(0,60)
})
console.log('Fetch manuel proxifié:', res)
await browser.close()
