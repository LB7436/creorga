#!/usr/bin/env node
/**
 * Full QA audit — tests every critical flow.
 * Runs from: node tests-qa/full-audit.mjs
 * Reports each module with OK/FAIL + notes.
 * Results saved to tests-qa/report.json + report.md.
 */
import fs from 'fs'
import path from 'path'

const BACKEND = 'http://localhost:3002'
const WEB = 'http://localhost:5174'
const POS = 'http://localhost:5175'
const GUEST = 'http://localhost:5178'
const SUPER = 'http://localhost:5177'
const MARKETING = 'http://localhost:5176'
const OLLAMA = 'http://localhost:11434'

const results = []
const record = (module, test, ok, notes = '') => {
  const entry = { module, test, ok, notes }
  results.push(entry)
  console.log(`${ok ? '✅' : '❌'} [${module.padEnd(18)}] ${test.padEnd(40)} ${notes ? '— ' + notes : ''}`)
}

async function probe(url, ok = 200) {
  try { const r = await fetch(url, { redirect: 'manual' }); return { status: r.status, ok: r.status === ok || (r.status >= 200 && r.status < 400) } }
  catch (e) { return { status: 0, ok: false, error: e.message } }
}
async function j(method, url, body) {
  try {
    const r = await fetch(url, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    })
    const text = await r.text()
    try { return { ok: r.ok, status: r.status, data: JSON.parse(text) } }
    catch { return { ok: r.ok, status: r.status, data: text } }
  } catch (e) { return { ok: false, status: 0, error: e.message } }
}

console.log('\n═══════════════════════════════════════════════════════════════')
console.log('  🔍 CREORGA FULL QA AUDIT — ' + new Date().toISOString())
console.log('═══════════════════════════════════════════════════════════════\n')

// ═══ 1. INFRASTRUCTURE ═══
console.log('━━━ 1. INFRASTRUCTURE ━━━')
record('Infra', 'backend :3002',   (await probe(`${BACKEND}/api/health`)).ok)
record('Infra', 'web :5174',       (await probe(WEB)).ok)
record('Infra', 'pos :5175',       (await probe(POS)).ok)
record('Infra', 'marketing :5176', (await probe(MARKETING)).ok)
record('Infra', 'superadmin :5177',(await probe(SUPER)).ok)
record('Infra', 'guest :5178',     (await probe(GUEST)).ok)
record('Infra', 'ollama :11434',   (await probe(`${OLLAMA}/api/tags`)).ok)

// ═══ 2. AUTH ═══
console.log('\n━━━ 2. AUTH ━━━')
const auth = await j('POST', `${BACKEND}/api/auth/login`, { email: 'admin@creorga.local', password: 'Admin1234!' })
const token = auth.data?.accessToken
record('Auth', 'login admin',     auth.ok && !!token, token ? 'token acquis' : 'pas de token')
record('Auth', 'fallback mode',   auth.data?.user?.id === 'fallback-admin', 'DB indisponible → fallback')

// ═══ 3. PAYMENTS ═══
console.log('\n━━━ 3. PAIEMENTS ━━━')
const providers = await j('GET', `${BACKEND}/api/payments/providers`)
const count = providers.data?.providers?.length || 0
record('Payments', '6 gateways listés', count === 6, `${count} providers`)

// ═══ 4. FLOOR STATE (plan unifié) ═══
console.log('\n━━━ 4. PLAN UNIFIÉ 5174↔5175 ━━━')
await j('POST', `${BACKEND}/api/floor-state/reset`)
const fs1 = await j('GET', `${BACKEND}/api/floor-state`)
record('FloorState', 'GET state',                fs1.ok, `${fs1.data?.tables?.length} tables`)

const addChair = await j('POST', `${BACKEND}/api/floor-state/chairs`, { tableId: 't2', label: 'QA-Ch1', customerName: 'QA-Marie' })
const qaChair = addChair.data?.chairs?.find(c => c.customerName === 'QA-Marie')
record('FloorState', 'addChair',                 !!qaChair, qaChair ? `id=${qaChair.id}` : '')

if (qaChair) {
  await j('POST', `${BACKEND}/api/floor-state/chairs/${qaChair.id}/items`, { name: 'Café', price: 2.80, qty: 2 })
  const afterItem = await j('GET', `${BACKEND}/api/floor-state`)
  const updated = afterItem.data?.chairs?.find(c => c.id === qaChair.id)
  record('FloorState', 'addItemToChair',         updated?.items?.length === 1, `${updated?.items?.length} items`)

  await j('POST', `${BACKEND}/api/floor-state/transfer/chair`, { chairId: qaChair.id, toTableId: 't5' })
  const afterTransfer = await j('GET', `${BACKEND}/api/floor-state`)
  const moved = afterTransfer.data?.chairs?.find(c => c.id === qaChair.id)
  record('FloorState', 'transfer chair t2→t5',   moved?.tableId === 't5', `tableId=${moved?.tableId}`)

  // Transfer 1 item
  const srcItems = moved?.items || []
  if (srcItems.length > 0) {
    const addCh2 = await j('POST', `${BACKEND}/api/floor-state/chairs`, { tableId: 't3', label: 'QA-Ch2' })
    const ch2 = addCh2.data?.chairs?.find(c => c.label === 'QA-Ch2')
    const r = await j('POST', `${BACKEND}/api/floor-state/transfer/items`, {
      fromType: 'chair', fromId: qaChair.id,
      toType: 'chair', toId: ch2.id,
      itemIds: [srcItems[0].id],
    })
    record('FloorState', 'transfer item ch→ch',  r.ok)
  }
}

await j('POST', `${BACKEND}/api/floor-state/reset`)

// ═══ 5. PORTAL CONFIG (admin↔guest) ═══
console.log('\n━━━ 5. PORTAL CONFIG (5174↔5178) ━━━')
const patch = await j('PATCH', `${BACKEND}/api/portal-config`, {
  toggles: { menu: true, order: true, games: false, chat: true, reviews: true, announcements: true },
  accentColor: '#ef4444',
})
record('Portal', 'PATCH admin→backend',  patch.ok && patch.data?.toggles?.games === false)
await new Promise(r => setTimeout(r, 500))
const g = await j('GET', `${BACKEND}/api/portal-config`)
record('Portal', 'GET guest side',       g.data?.accentColor === '#ef4444' && g.data?.toggles?.games === false, 'sync confirmé')
await j('POST', `${BACKEND}/api/portal-config/reset`)

// ═══ 6. OLLAMA AI ═══
console.log('\n━━━ 6. OLLAMA AI (Gemma 2B) ━━━')
const tags = await j('GET', `${OLLAMA}/api/tags`)
const hasGemma = tags.data?.models?.some(m => m.name === 'gemma2:2b')
record('AI', 'ollama running',          tags.ok)
record('AI', 'gemma2:2b installed',     hasGemma)

// Quick inference test
if (hasGemma) {
  const inf = await j('POST', `${OLLAMA}/api/generate`, {
    model: 'gemma2:2b', prompt: 'Dis "OK" en un mot.', stream: false,
  })
  const got = (inf.data?.response || '').toLowerCase()
  record('AI', 'inference responds',    inf.ok && got.length > 0, got.trim().slice(0, 30))
}

// ═══ 7. FRONT ROUTES ═══
console.log('\n━━━ 7. ROUTES FRONT-END ━━━')
for (const p of [
  '/', '/login', '/modules', '/setup',
  '/pos/floor', '/pos/design', '/pos/dashboard',
  '/clients', '/crm/clients', '/invoices/devis',
  '/hr/planning', '/haccp/journee', '/accounting/caisse',
  '/ai', '/ai/local',
  '/settings/modules', '/settings/env-mode', '/settings/theme',
]) {
  const r = await probe(`${WEB}${p}`)
  record('FrontEnd', p, r.ok, `status ${r.status}`)
}

// ═══ 8. CROSS-ORIGIN CORS ═══
console.log('\n━━━ 8. CORS ━━━')
for (const origin of ['http://localhost:5174', 'http://localhost:5175', 'http://localhost:5178']) {
  try {
    const r = await fetch(`${BACKEND}/api/portal-config`, { headers: { Origin: origin } })
    const allow = r.headers.get('access-control-allow-origin') || ''
    record('CORS', `origin ${origin}`, allow === origin || allow === '*', `allow=${allow}`)
  } catch (e) {
    record('CORS', `origin ${origin}`, false, e.message)
  }
}

// ═══ SUMMARY ═══
const total = results.length
const passed = results.filter(r => r.ok).length
const failed = total - passed
console.log('\n═══════════════════════════════════════════════════════════════')
console.log(`  📊 RÉSULTAT : ${passed}/${total} tests OK  (${failed} échecs)`)
console.log('═══════════════════════════════════════════════════════════════\n')

if (failed > 0) {
  console.log('❌ Échecs :')
  results.filter(r => !r.ok).forEach(r => console.log(`   - [${r.module}] ${r.test}  ${r.notes}`))
}

// Save report
const dir = path.resolve('tests-qa')
fs.mkdirSync(dir, { recursive: true })
fs.writeFileSync(path.join(dir, 'report.json'), JSON.stringify({ timestamp: new Date().toISOString(), passed, failed, total, results }, null, 2))

const md = `# QA Audit Report\n\n**${new Date().toISOString()}**\n\n**Score : ${passed}/${total}** (${failed} échecs)\n\n` +
  '| Module | Test | Résultat | Notes |\n|---|---|---|---|\n' +
  results.map(r => `| ${r.module} | ${r.test} | ${r.ok ? '✅' : '❌'} | ${r.notes} |`).join('\n')
fs.writeFileSync(path.join(dir, 'report.md'), md)

console.log(`\n📄 Rapport sauvegardé dans tests-qa/report.json + report.md\n`)
process.exit(failed > 0 ? 1 : 0)
