#!/usr/bin/env node
const BACKEND = 'http://localhost:3002'

async function j(method, url, body) {
  const r = await fetch(url, {
    method, headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  })
  return r.json()
}

console.log('🧪 Test sync module-config super-admin ↔ web\n')

console.log('1️⃣  Reset…')
await j('POST', `${BACKEND}/api/module-config/reset`)

console.log('2️⃣  Super-admin 5177 cache le module "hr"…')
const r1 = await j('PATCH', `${BACKEND}/api/module-config/hr`, { displayMode: 'hidden' })
console.log('   Backend:', JSON.stringify(r1.config.hr))

console.log('3️⃣  Super-admin marque "formation" comme coming_soon…')
const r2 = await j('PATCH', `${BACKEND}/api/module-config/formation`, { displayMode: 'coming_soon', customLabel: 'Formation (bientôt)' })
console.log('   Backend:', JSON.stringify(r2.config.formation))

console.log('4️⃣  Web 5174 poll GET /api/module-config…')
const r3 = await j('GET', `${BACKEND}/api/module-config`)
const hr = r3.config.hr
const formation = r3.config.formation

const ok = hr?.displayMode === 'hidden' && formation?.displayMode === 'coming_soon'
console.log(`   hr       → displayMode=${hr?.displayMode}`)
console.log(`   formation→ displayMode=${formation?.displayMode}, label="${formation?.customLabel}"`)

console.log('\n' + (ok ? '✅ SYNC OK' : '❌ SYNC CASSÉ'))

console.log('\n5️⃣  Reset final…')
await j('POST', `${BACKEND}/api/module-config/reset`)
