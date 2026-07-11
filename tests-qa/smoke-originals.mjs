import { chromium } from 'playwright-core'
const OUT = process.argv[2] ?? '.'
const errors = []
const browser = await chromium.launch({ channel: 'msedge' })
const page = await browser.newPage({ viewport: { width: 414, height: 896 } })
page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message))
page.on('console', (m) => { if (m.type()==='error' && !m.text().includes('401') && !m.text().includes('500') && !m.text().includes('429')) errors.push(m.text()) })
await page.addInitScript(() => localStorage.setItem('creorga-guest-client-profile-v1', JSON.stringify({ id:'s',displayName:'T',email:'t@c.lu',phone:'+352',provider:'email',createdAt:1,updatedAt:1 })))
async function launch(name) {
  await page.goto('http://localhost:5174/c?table=7')
  await page.waitForSelector('text=Jeux', { timeout: 30000 }).catch(()=>{})
  await page.waitForTimeout(700)
  await page.locator('input[placeholder*="echercher"]').first().fill(name)
  await page.waitForTimeout(500)
  const card = page.locator(`text=${name}`).first()
  if (!(await card.count())) return `${name}: carte introuvable`
  await card.click(); await page.waitForTimeout(500)
  await page.locator('[role="dialog"]').getByText('Solo', { exact:true }).first().click().catch(()=>{})
  await page.waitForTimeout(200)
  await page.locator('button', { hasText: 'Lancer la partie' }).first().click()
  await page.waitForTimeout(2200)
  const mounted = (await page.locator('button', { hasText: '←' }).count()) > 0 || (await page.locator('text=/Retour/').count()) > 0
  return `${name}: monté=${mounted}`
}
for (const n of ['Mahjong','Rami','Rummi']) console.log('[*]', await launch(n))
console.log('[err]', errors.length); errors.slice(0,5).forEach(e=>console.log('  -',e.slice(0,140)))
await browser.close()
