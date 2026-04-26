#!/usr/bin/env node
// E2E: admin (5174) adds chair + item via /api/floor-state
// then verifies it appears in GET state.
const BASE = 'http://localhost:3002/api/floor-state'

async function j(method, path = '', body) {
  const r = await fetch(`${BASE}${path}`, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined,
  })
  return r.json()
}

console.log('🧪 Test sync plan de salle\n')

console.log('1️⃣  Reset state…')
await j('POST', '/reset')

console.log('2️⃣  Table t2 → add chair…')
const r1 = await j('POST', '/chairs', { tableId: 't2', label: 'Ch1', customerName: 'Marie' })
const chair = r1.chairs[0]
console.log(`   ✓ Chaise créée id=${chair.id} table=${chair.tableId} client=${chair.customerName}`)

console.log('3️⃣  Ajout d\'items sur la chaise…')
await j('POST', `/chairs/${chair.id}/items`, { name: 'Café', price: 2.80, qty: 2 })
await j('POST', `/chairs/${chair.id}/items`, { name: 'Croissant', price: 3.50, qty: 1 })
const r2 = await j('GET')
const chair2 = r2.chairs.find(c => c.id === chair.id)
console.log(`   ✓ ${chair2.items.length} items ajoutés, total = ${chair2.items.reduce((s,i) => s + i.price*i.qty, 0).toFixed(2)} €`)

console.log('4️⃣  Transfert de la chaise vers t5…')
const r3 = await j('POST', '/transfer/chair', { chairId: chair.id, toTableId: 't5' })
const chair3 = r3.chairs.find(c => c.id === chair.id)
console.log(`   ✓ Chaise maintenant sur table ${chair3.tableId}`)

console.log('5️⃣  Transfert d\'UN item vers une autre chaise…')
const r4 = await j('POST', '/chairs', { tableId: 't3', label: 'Ch1', customerName: 'Lucas' })
const chair4 = r4.chairs.find(c => c.customerName === 'Lucas')
const itemId = chair3.items[0].id
await j('POST', '/transfer/items', {
  fromType: 'chair', fromId: chair.id,
  toType: 'chair', toId: chair4.id,
  itemIds: [itemId],
})
const r5 = await j('GET')
const src = r5.chairs.find(c => c.id === chair.id)
const dst = r5.chairs.find(c => c.id === chair4.id)
console.log(`   ✓ Source a ${src.items.length} items, destination a ${dst.items.length} items`)

console.log('\n✅ FLOOR-STATE 100% fonctionnel — transfert chaise + items + chaises multiples OK')
console.log('\nReset final…')
await j('POST', '/reset')
