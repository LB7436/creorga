#!/usr/bin/env node
// End-to-end test: simulate admin (5174) -> backend -> guest (5178) sync.
const BACKEND = 'http://localhost:3002'

async function call(method, path, body, origin) {
  const res = await fetch(`${BACKEND}${path}`, {
    method,
    headers: { 'Content-Type': 'application/json', 'Origin': origin },
    body: body ? JSON.stringify(body) : undefined,
  })
  return res.json()
}

console.log('🧪 Test sync Admin 5174 ↔ Guest 5178\n')

// Step 1 — Admin toggles "games off, chat off"
console.log('1️⃣  Admin (5174) désactive Jeux et Chat…')
const r1 = await call('PATCH', '/api/portal-config', {
  toggles: { menu: true, order: true, games: false, chat: false, reviews: true, announcements: true },
  accentColor: '#ef4444',
  welcomeMessage: 'Test sync fonctionne !',
}, 'http://localhost:5174')
console.log('   Backend renvoie:', JSON.stringify(r1.toggles), 'updatedAt=' + r1.updatedAt)

// Step 2 — Guest polls after 1s
console.log('\n2️⃣  Guest (5178) poll après 1s…')
await new Promise(r => setTimeout(r, 1000))
const r2 = await call('GET', '/api/portal-config', null, 'http://localhost:5178')
console.log('   Guest voit:', JSON.stringify(r2.toggles))
console.log('   Couleur:', r2.accentColor)
console.log('   Message:', r2.welcomeMessage)

const ok = r2.toggles.games === false && r2.toggles.chat === false && r2.accentColor === '#ef4444'
console.log('\n' + (ok ? '✅ SYNC OK — le guest reçoit bien les changements' : '❌ SYNC CASSÉ'))

// Step 3 — Reset
console.log('\n3️⃣  Reset pour remettre tout en ON…')
await call('POST', '/api/portal-config/reset', null, 'http://localhost:5174')
console.log('   Reset fait.')
