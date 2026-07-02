import { chromium } from '@playwright/test'
const browser = await chromium.launch({ channel: 'chrome', headless: true })
const page = await browser.newPage({ viewport: { width: 1280, height: 720 } })
await page.goto('http://localhost:5174/login', { waitUntil: 'domcontentloaded' })
await page.evaluate(() => { localStorage.setItem('creorga-onboarded', '1'); localStorage.setItem('creorga.onboardingDone', String(Date.now())) })
await page.locator('input[type="email"]').fill('admin@creorga.local')
await page.locator('input[placeholder="••••••••"]').fill('Admin1234!')
await page.locator('button[type="submit"]').click()
await page.waitForURL('**/welcome', { timeout: 20000 })
await page.goto('http://localhost:5174/modules', { waitUntil: 'domcontentloaded' })
await page.waitForTimeout(1800)
await page.screenshot({ path: 'tests-qa/vision/10-home-cta.png' })

// Boutons flottants en bas à droite : identifie et clique chacun
const floats = await page.evaluate(() => {
  const els = [...document.querySelectorAll('button, [role="button"]')]
  return els.filter((el) => {
    const s = getComputedStyle(el); const r = el.getBoundingClientRect()
    return (s.position === 'fixed') && r.top > 400 && r.left > 900 && r.width > 20
  }).map((el, i) => { el.setAttribute('data-float', String(i)); return { i, title: el.title || el.getAttribute('aria-label') || el.innerText.slice(0, 20) } })
})
console.log('Boutons flottants:', JSON.stringify(floats))
for (const f of floats) {
  await page.locator(`[data-float="${f.i}"]`).click({ timeout: 2000 }).catch(() => console.log(`float ${f.i} incliquable`))
  await page.waitForTimeout(900)
  await page.screenshot({ path: `tests-qa/vision/11-float-${f.i}.png` })
  await page.keyboard.press('Escape')
  await page.waitForTimeout(400)
}
await browser.close()
