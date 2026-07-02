import { chromium } from '@playwright/test'
const browser = await chromium.launch({ channel: 'chrome', headless: true })
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
await page.goto('http://localhost:5174/login', { waitUntil: 'domcontentloaded' })
// skip onboarding/tour avant login
await page.evaluate(() => { localStorage.setItem('creorga-onboarded', 'true'); localStorage.setItem('creorga-tour-done', 'true') })
await page.locator('input[type="email"]').fill('admin@creorga.local')
await page.locator('input[placeholder="••••••••"]').fill('Admin1234!')
await page.locator('button[type="submit"]').click()
await page.waitForURL('**/welcome', { timeout: 20000 })
await page.goto('http://localhost:5174/modules', { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(1500)
// ferme tout modal résiduel
await page.keyboard.press('Escape')
await page.getByText('Passer cette étape').click({ timeout: 1500 }).catch(() => {})
await page.getByText('Skip tour').click({ timeout: 1500 }).catch(() => {})
await page.waitForTimeout(600)
await page.screenshot({ path: 'tests-qa/vision/01-modules.png' })
const gear = page.locator('button[title="Panneau administrateur"]')
console.log('bouton ⚙ présent:', await gear.count())
if (await gear.count()) {
  await gear.click()
  await page.waitForTimeout(500)
  await page.screenshot({ path: 'tests-qa/vision/02-adminmenu-open.png' })
  for (const label of ['Designer la salle', 'Clients & portail', 'Super Admin']) {
    const res = await page.getByText(label, { exact: false }).first().click({ timeout: 3000 }).then(() => 'CLIC OK').catch((e) => 'INCLIQUABLE (' + e.message.split('\n')[0].slice(0, 60) + ')')
    await page.waitForTimeout(900)
    console.log(`"${label}": ${res} → ${page.url()}`)
    await page.screenshot({ path: `tests-qa/vision/03-after-${label.replace(/[^a-z]/gi, '')}.png` })
    await page.goto('http://localhost:5174/modules', { waitUntil: 'domcontentloaded' })
    await page.waitForTimeout(900)
    await gear.click().catch(() => {})
    await page.waitForTimeout(400)
  }
}
await browser.close()
