import { chromium } from '@playwright/test'
const browser = await chromium.launch({ channel: 'chrome', headless: true })
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
await page.goto('http://localhost:5174/login', { waitUntil: 'domcontentloaded' })
await page.evaluate(() => { localStorage.setItem('creorga-onboarded', '1'); localStorage.setItem('creorga.onboardingDone', String(Date.now())) })
await page.locator('input[type="email"]').fill('admin@creorga.local')
await page.locator('input[placeholder="••••••••"]').fill('Admin1234!')
await page.locator('button[type="submit"]').click()
await page.waitForURL('**/welcome')
await page.goto('http://localhost:5174/modules', { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(1500)
await page.keyboard.press('Control+Shift+A')
await page.waitForTimeout(1000)
const input = page.locator('input[placeholder*="obi"]').last()
await input.fill("Quel est le chiffre d'affaires du jour ?")
await page.keyboard.press('Enter')
// attends jusqu'à 45s que "réfléchit" disparaisse
for (let i = 0; i < 45; i++) {
  await page.waitForTimeout(1000)
  const thinking = await page.getByText('réfléchit').count()
  if (!thinking) break
}
await page.waitForTimeout(500)
await page.screenshot({ path: 'tests-qa/vision/14-robi-final.png' })
console.log('réponse capturée')
await browser.close()
