import { chromium } from 'playwright-core'
const OUT = process.argv[2] ?? '.'
const browser = await chromium.launch({ channel: 'msedge' })
const page = await browser.newPage({ viewport: { width: 414, height: 896 } })
await page.addInitScript(() => {
  localStorage.setItem('creorga.guest.lang', 'en')
  localStorage.setItem('creorga-guest-client-profile-v1', JSON.stringify({ id:'s',displayName:'Guest',email:'g@c.lu',phone:'+352',provider:'email',createdAt:1,updatedAt:1 }))
})
await page.goto('http://localhost:5174/c?table=7')
await page.waitForSelector('text=Games', { timeout: 30000 }).catch(()=>{})
await page.waitForTimeout(800)
await page.locator('input[placeholder*="earch"], input').first().fill('Maxi')
await page.waitForTimeout(500)
await page.locator('text=Maxi Burger').first().click(); await page.waitForTimeout(500)
await page.locator('[role="dialog"]').getByText('Solo', { exact:true }).first().click().catch(()=>{})
await page.waitForTimeout(200)
await page.locator('button', { hasText: 'Lancer la partie' }).first().click()
await page.waitForTimeout(1800)
await page.locator('button', { hasText: 'Jouer' }).last().click().catch(()=>{})
await page.waitForTimeout(800)
const canvas = page.locator('canvas').first()
for (let i=0;i<4;i++){ await canvas.click({ position:{x:207,y:500}, force:true }); await page.waitForTimeout(900) }
await page.waitForTimeout(600)
const en = {
  replay: await page.locator('text=Play again').count(),
  best: await page.locator('text=Best score').count(),
  back: await page.locator('button', { hasText: /^Back$/ }).count(),
  over: (await page.locator('text=Game over').count()) + (await page.locator('text=New record').count()),
}
console.log('[i18n EN] modal:', JSON.stringify(en))
await page.screenshot({ path: OUT + '/i18n-en.png' })
await browser.close()
