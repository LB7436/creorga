import { test, expect } from '@playwright/test'
test('profil métier : la salle ERP affiche la projection PostgreSQL réelle sans écriture ni révision perdue', async ({ page, context }) => {
  const email=process.env.CREORGA_E2E_EMAIL||'',password=process.env.CREORGA_E2E_PASSWORD||''
  if(process.env.CREORGA_LAB_BROWSER_TESTS!=='1'||!email.endsWith('.invalid')||!password)throw Error('Compte fictif requis')
  await context.route('**/*',route=>['127.0.0.1','localhost','::1'].includes(new URL(route.request().url()).hostname)?route.continue():route.abort())
  await context.route('**/api/agent/**',route=>route.fulfill({status:503,json:{error:'IA neutralisée'}}))
  const login=await context.request.post('http://127.0.0.1:3002/api/auth/login',{data:{email,password}});expect(login.ok()).toBe(true)
  const session=await login.json(),membership=session.companies[0]
  if(session.companies.length!==1||membership.role!=='OWNER'||!/fictif/i.test(membership.company?.name||''))throw Error('Société fictive requise')
  await context.addInitScript(data=>localStorage.setItem('creorga-auth',JSON.stringify({version:0,state:{accessToken:data.accessToken,user:data.user,companies:data.companies,company:data.companies[0].company,
    companyId:data.companies[0].companyId||data.companies[0].company.id,isAuthenticated:true,role:'owner',viewMode:'owner',viewAsEmployeeId:null}})),session)
  const errors:string[]=[],writes:string[]=[];page.on('pageerror',error=>errors.push(error.message))
  page.on('request',request=>{if(new URL(request.url()).pathname.startsWith('/api/floor-state')&&request.method()!=='GET')writes.push(request.method())})
  const loaded=page.waitForResponse(response=>new URL(response.url()).pathname==='/api/floor-state'&&response.request().method()==='GET')
  await page.goto('http://localhost:5174/standalone/floor')
  const response=await loaded;expect(response.ok()).toBe(true)
  const data=await response.json();expect(data.tables.length).toBeGreaterThan(0)
  await expect(page.getByRole('heading',{name:/Plan de salle/})).toBeVisible()
  await expect(page.getByRole('alert').filter({hasText:/Plan de salle indisponible/})).toHaveCount(0)
  await page.reload();await expect(page.getByRole('heading',{name:/Plan de salle/})).toBeVisible()
  expect(writes).toEqual([]);expect(errors).toEqual([])
})
