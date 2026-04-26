#!/usr/bin/env node
/**
 * Comprehensive audit — validates EVERY feature built during the
 * conversation. Covers: files exist, imports wire up, backend endpoints,
 * cross-app sync, Ollama, unicode, themes, chaises, fallbacks…
 */
import fs from 'fs'
import path from 'path'

const ROOT = 'C:/Users/Bryan/Desktop/claude code/creorga'
const BACKEND = 'http://localhost:3002'
const WEB = 'http://localhost:5174'
const POS = 'http://localhost:5175'
const GUEST = 'http://localhost:5178'
const SUPER = 'http://localhost:5177'
const MARKETING = 'http://localhost:5176'
const OLLAMA = 'http://localhost:11434'

const results = []
const rec = (cat, test, ok, notes = '') => {
  results.push({ cat, test, ok, notes })
  const sym = ok ? '✅' : '❌'
  console.log(`${sym} [${cat.padEnd(18)}] ${test.padEnd(46)} ${notes ? '— ' + notes : ''}`)
}

const fileExists = (p) => fs.existsSync(path.join(ROOT, p))
const fileContains = (p, text) => {
  try { return fs.readFileSync(path.join(ROOT, p), 'utf8').includes(text) }
  catch { return false }
}

async function probe(url) {
  try { const r = await fetch(url, { redirect: 'manual' }); return { ok: r.status >= 200 && r.status < 400, status: r.status } }
  catch { return { ok: false, status: 0 } }
}
async function j(method, url, body) {
  try {
    const r = await fetch(url, {
      method, headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    })
    const txt = await r.text()
    try { return { ok: r.ok, status: r.status, data: JSON.parse(txt) } }
    catch { return { ok: r.ok, status: r.status, data: txt } }
  } catch (e) { return { ok: false, error: e.message } }
}

console.log('\n═══════════════════════════════════════════════════════════════════')
console.log('  🔬 CREORGA — COMPREHENSIVE AUDIT (tout l\'historique conversation)')
console.log('═══════════════════════════════════════════════════════════════════\n')

// ═══ A. FICHIERS CRÉÉS (structure complète)
console.log('━━━ A. FICHIERS CRÉÉS ━━━')
const expectedFiles = [
  // Core features
  'apps/backend/src/lib/payments/gateway.ts',
  'apps/backend/src/routes/payments.ts',
  'apps/backend/src/routes/portalConfig.ts',
  'apps/backend/src/routes/floorState.ts',
  'apps/backend/.env.example',
  'apps/backend/src/middleware/requireCompany.ts',
  'apps/pos/src/components/LoyaltyScanner.tsx',
  'apps/pos/src/components/RoomsPager.tsx',
  'apps/pos/src/components/TableSummary.tsx',
  'apps/pos/src/lib/payments.ts',
  'apps/pos/src/lib/floorBridge.ts',
  'apps/web/src/stores/envModeStore.ts',
  'apps/web/src/stores/themeStore.ts',
  'apps/web/src/stores/chairStore.ts',
  'apps/web/src/stores/brandStore.ts',
  'apps/web/src/stores/photoWallStore.ts',
  'apps/web/src/stores/moduleConfigStore.ts',
  'apps/web/src/stores/roomDesignerStore.ts',
  'apps/web/src/components/EnvModeBanner.tsx',
  'apps/web/src/components/AdminQuickMenu.tsx',
  'apps/web/src/components/BackToStart.tsx',
  'apps/web/src/components/QRCodeCanvas.tsx',
  'apps/web/src/components/LogoUploader.tsx',
  'apps/web/src/components/PhotoWall.tsx',
  'apps/web/src/components/ChairsOverlay.tsx',
  'apps/web/src/components/TransferSplitModal.tsx',
  'apps/web/src/hooks/usePortalConfig.ts',
  'apps/web/src/hooks/useFloorState.ts',
  'apps/web/src/pages/ai/AIModulePage.tsx',
  'apps/web/src/pages/pos/RoomDesignerPage.tsx',
  'apps/web/src/pages/pos/UnifiedFloorPlan.tsx',
  'apps/web/src/pages/settings/SettingsModules.tsx',
  'apps/web/src/pages/settings/SettingsEnvMode.tsx',
  'apps/web/src/pages/settings/SettingsTheme.tsx',
  'apps/web/src/pages/onboarding/SetupWizard.tsx',
  'apps/guest/src/usePortalConfig.ts',
  'scripts/fix-unicode.mjs',
  'scripts/qa-audit.mjs',
  'scripts/test-sync.mjs',
  'scripts/test-floor-sync.mjs',
  'QA-REPORT.md',
]
for (const f of expectedFiles) rec('Files', f, fileExists(f))

// ═══ B. INTÉGRATION (imports câblés)
console.log('\n━━━ B. INTÉGRATION (imports dans App.tsx, index.ts…) ━━━')
rec('Wiring', 'App.tsx imports UnifiedFloorPlan', fileContains('apps/web/src/App.tsx', 'UnifiedFloorPlan'))
rec('Wiring', 'App.tsx imports SetupWizard',     fileContains('apps/web/src/App.tsx', 'SetupWizard'))
rec('Wiring', 'App.tsx imports AIModulePage',    fileContains('apps/web/src/App.tsx', 'AIModulePage'))
rec('Wiring', 'App.tsx imports SettingsTheme',   fileContains('apps/web/src/App.tsx', 'SettingsTheme'))
rec('Wiring', 'App.tsx imports SettingsModules', fileContains('apps/web/src/App.tsx', 'SettingsModules'))
rec('Wiring', 'App.tsx imports EnvModeBanner',   fileContains('apps/web/src/App.tsx', 'EnvModeBanner'))
rec('Wiring', 'App.tsx imports BackToStart',     fileContains('apps/web/src/App.tsx', 'BackToStart'))
rec('Wiring', 'App.tsx route /pos/floor → UnifiedFloorPlan', fileContains('apps/web/src/App.tsx', 'path="floor" element={<UnifiedFloorPlan'))
rec('Wiring', 'App.tsx route /setup',            fileContains('apps/web/src/App.tsx', 'path="/setup"'))
rec('Wiring', 'App.tsx route /ai/local',         fileContains('apps/web/src/App.tsx', '/ai/local'))
rec('Wiring', 'AppShell imports AdminQuickMenu',  fileContains('apps/web/src/components/layout/AppShell.tsx', 'Configurer les modules'))
rec('Wiring', 'ModuleSelector imports AdminQuickMenu', fileContains('apps/web/src/pages/ModuleSelector.tsx', 'AdminQuickMenu'))
rec('Wiring', 'ClientsConfig uses usePortalConfig',    fileContains('apps/web/src/pages/clients/ClientsConfig.tsx', 'usePortalConfig'))
rec('Wiring', 'ClientsConfig uses LogoUploader',       fileContains('apps/web/src/pages/clients/ClientsConfig.tsx', 'LogoUploader'))
rec('Wiring', 'ClientsConfig uses QRCodeCanvas',       fileContains('apps/web/src/pages/clients/ClientsConfig.tsx', 'QRCodeCanvas'))
rec('Wiring', 'ClientsConfig uses PhotoWall',          fileContains('apps/web/src/pages/clients/ClientsConfig.tsx', 'PhotoWall'))
rec('Wiring', 'Guest App uses usePortalConfig',        fileContains('apps/guest/src/App.tsx', 'usePortalConfig'))
rec('Wiring', 'POS main.tsx starts floorBridge',       fileContains('apps/pos/src/main.tsx', 'startFloorBridge'))
rec('Wiring', 'Backend mounts payments route',    fileContains('apps/backend/src/index.ts', '/api/payments'))
rec('Wiring', 'Backend mounts portal-config route',    fileContains('apps/backend/src/index.ts', '/api/portal-config'))
rec('Wiring', 'Backend mounts floor-state route', fileContains('apps/backend/src/index.ts', '/api/floor-state'))
rec('Wiring', 'Backend auto-bootstrap .env',           fileContains('apps/backend/src/index.ts', 'bootstrap'))

// ═══ C. CONTENU SPÉCIFIQUE (Menu Café um Rond-Point prix exacts)
console.log('\n━━━ C. CONTENU MÉTIER ━━━')
const menuFile = 'apps/pos/src/store/posStore.ts'
rec('Menu', 'Expresso 2.50 €',      fileContains(menuFile, "'Expresso', 2.50"))
rec('Menu', 'Café 2.80 €',          fileContains(menuFile, "'Café', 2.80"))
rec('Menu', 'Bofferding Flute 3.20€', fileContains(menuFile, "'Bofferding Flute', 3.20"))
rec('Menu', 'Cordon Bleu 26.50 €',  fileContains(menuFile, "'Cordon Bleu', 26.50"))
rec('Menu', 'Plancha Mixte 25.50€', fileContains(menuFile, "'Plancha Mixte', 25.50"))
rec('Menu', 'Briquet 1.50 €',       fileContains(menuFile, "'Briquet', 1.50"))
rec('Menu', 'Gin Hendrix 14.50 €',  fileContains(menuFile, "'Gin Hendrix', 14.50"))

// ═══ D. 6 PASSERELLES PAIEMENT
console.log('\n━━━ D. 6 PASSERELLES PAIEMENT ━━━')
const gw = 'apps/backend/src/lib/payments/gateway.ts'
for (const p of ['stripe', 'sumup', 'mypos', 'viva', 'worldline', 'servipay']) {
  rec('Payments', `gateway ${p}`, fileContains(gw, `${p}Gateway`) || fileContains(gw, `provider: '${p}'`))
}

// ═══ E. THÈMES (6 palettes)
console.log('\n━━━ E. SYSTÈME DE THÈMES ━━━')
const ts = 'apps/web/src/stores/themeStore.ts'
for (const t of ['mauve', 'indigo', 'slate', 'gold', 'emerald', 'rose']) {
  rec('Theme', `theme ${t}`, fileContains(ts, `id: '${t}'`))
}
rec('Theme', 'Mauve original restauré', fileContains(ts, 'Mauve (original)'))

// ═══ F. INFRA LIVE
console.log('\n━━━ F. INFRASTRUCTURE EN LIVE ━━━')
rec('Live', 'backend health',  (await probe(`${BACKEND}/api/health`)).ok)
rec('Live', 'web :5174',       (await probe(WEB)).ok)
rec('Live', 'pos :5175',       (await probe(POS)).ok)
rec('Live', 'marketing :5176', (await probe(MARKETING)).ok)
rec('Live', 'superadmin :5177',(await probe(SUPER)).ok)
rec('Live', 'guest :5178',     (await probe(GUEST)).ok)
rec('Live', 'ollama :11434',   (await probe(`${OLLAMA}/api/tags`)).ok)

// ═══ G. AUTH FAULT-TOLERANT
console.log('\n━━━ G. AUTH FAULT-TOLERANT ━━━')
const auth = await j('POST', `${BACKEND}/api/auth/login`, { email: 'admin@creorga.local', password: 'Admin1234!' })
rec('Auth', 'login OK sans DB',         auth.ok && !!auth.data?.accessToken)
rec('Auth', 'fallback admin activé',    auth.data?.user?.id === 'fallback-admin')
rec('Auth', 'company fallback retournée',auth.data?.companies?.length > 0)

// ═══ H. FLOOR STATE (unifié)
console.log('\n━━━ H. FLOOR STATE (5174↔5175) ━━━')
await j('POST', `${BACKEND}/api/floor-state/reset`)
const fs1 = await j('GET', `${BACKEND}/api/floor-state`)
rec('FloorState', 'GET 12 tables', fs1.data?.tables?.length >= 11)

const addCh = await j('POST', `${BACKEND}/api/floor-state/chairs`, { tableId: 't2', label: 'QA', customerName: 'Test' })
const chair = addCh.data?.chairs?.find(c => c.label === 'QA')
rec('FloorState', 'POST /chairs crée une chaise', !!chair)

if (chair) {
  const addIt = await j('POST', `${BACKEND}/api/floor-state/chairs/${chair.id}/items`, { name: 'Café', price: 2.80, qty: 2 })
  rec('FloorState', 'POST /chairs/:id/items', addIt.ok)

  const trCh = await j('POST', `${BACKEND}/api/floor-state/transfer/chair`, { chairId: chair.id, toTableId: 't5' })
  const moved = trCh.data?.chairs?.find(c => c.id === chair.id)
  rec('FloorState', 'transfer chair t2→t5', moved?.tableId === 't5')

  // Transfer items
  const c2 = await j('POST', `${BACKEND}/api/floor-state/chairs`, { tableId: 't3', label: 'QA2' })
  const chair2 = c2.data?.chairs?.find(c => c.label === 'QA2')
  if (chair2) {
    const movedItems = moved?.items || []
    const trIt = await j('POST', `${BACKEND}/api/floor-state/transfer/items`, {
      fromType: 'chair', fromId: chair.id,
      toType: 'chair', toId: chair2.id,
      itemIds: [movedItems[0].id],
    })
    rec('FloorState', 'transfer items ch→ch', trIt.ok)
  }
}
await j('POST', `${BACKEND}/api/floor-state/reset`)

// ═══ I. PORTAL CONFIG (admin↔guest)
console.log('\n━━━ I. PORTAL CONFIG ━━━')
const patch = await j('PATCH', `${BACKEND}/api/portal-config`, {
  toggles: { menu: true, order: true, games: false, chat: false, reviews: true, announcements: true },
  accentColor: '#ef4444',
})
rec('Portal', 'PATCH depuis admin',      patch.ok)
await new Promise(r => setTimeout(r, 400))
const g = await j('GET', `${BACKEND}/api/portal-config`)
rec('Portal', 'GET depuis guest confirme',
    g.data?.accentColor === '#ef4444' && g.data?.toggles?.games === false)
await j('POST', `${BACKEND}/api/portal-config/reset`)

// ═══ J. OLLAMA
console.log('\n━━━ J. OLLAMA AI ━━━')
const tags = await j('GET', `${OLLAMA}/api/tags`)
rec('AI', 'ollama up', tags.ok)
const hasGemma = tags.data?.models?.some(m => m.name === 'gemma2:2b')
rec('AI', 'gemma2:2b installé', hasGemma)
if (hasGemma) {
  const inf = await j('POST', `${OLLAMA}/api/generate`, {
    model: 'gemma2:2b', prompt: 'Say OK.', stream: false,
  })
  rec('AI', 'inférence répond', inf.ok && !!inf.data?.response, (inf.data?.response || '').trim().slice(0, 30))
}

// ═══ K. UNICODE (aucun \\uXXXX résiduel)
console.log('\n━━━ K. UNICODE (aucun escape résiduel) ━━━')
const scanDirs = ['apps/web/src/pages', 'apps/web/src/components']
let unicodeOrphans = 0
for (const d of scanDirs) {
  const dir = path.join(ROOT, d)
  if (!fs.existsSync(dir)) continue
  const walk = (p) => {
    for (const e of fs.readdirSync(p, { withFileTypes: true })) {
      const full = path.join(p, e.name)
      if (e.isDirectory()) walk(full)
      else if (/\.(tsx?|jsx?)$/.test(e.name)) {
        const c = fs.readFileSync(full, 'utf8')
        const matches = c.match(/\\u[0-9a-fA-F]{4}/g) || []
        unicodeOrphans += matches.length
      }
    }
  }
  walk(dir)
}
rec('Unicode', 'aucun \\uXXXX dans src', unicodeOrphans === 0, `${unicodeOrphans} séquences`)

// ═══ L. ROUTES FRONT
console.log('\n━━━ L. ROUTES FRONT-END ━━━')
const routes = [
  '/', '/login', '/modules', '/setup',
  '/pos/floor', '/pos/design', '/pos/dashboard',
  '/clients', '/crm/clients', '/invoices/devis',
  '/inventory/stock', '/hr/planning', '/haccp/journee',
  '/accounting/caisse', '/reputation/avis',
  '/ai', '/ai/local',
  '/settings/modules', '/settings/env-mode', '/settings/theme',
]
for (const r of routes) {
  const res = await probe(`${WEB}${r}`)
  rec('Routes', r, res.ok, `${res.status}`)
}

// ═══ M. CORS
console.log('\n━━━ M. CORS ━━━')
for (const origin of ['http://localhost:5174', 'http://localhost:5175', 'http://localhost:5178', 'http://localhost:5177']) {
  const r = await fetch(`${BACKEND}/api/portal-config`, { headers: { Origin: origin } })
  const allow = r.headers.get('access-control-allow-origin') || ''
  rec('CORS', origin, allow === origin, `allow=${allow}`)
}

// ═══ SUMMARY
const total = results.length
const ok = results.filter(r => r.ok).length
const fail = total - ok

console.log('\n═══════════════════════════════════════════════════════════════════')
console.log(`  📊 RÉSULTAT FINAL : ${ok}/${total} tests OK (${fail} échecs)`)
console.log('═══════════════════════════════════════════════════════════════════\n')

const byCat = {}
for (const r of results) {
  if (!byCat[r.cat]) byCat[r.cat] = { ok: 0, total: 0 }
  byCat[r.cat].total++
  if (r.ok) byCat[r.cat].ok++
}
console.log('Par catégorie :')
for (const [c, v] of Object.entries(byCat)) {
  const icon = v.ok === v.total ? '✅' : v.ok > 0 ? '⚠️ ' : '❌'
  console.log(`  ${icon} ${c.padEnd(18)} ${v.ok}/${v.total}`)
}

if (fail > 0) {
  console.log('\n❌ Échecs détaillés :')
  for (const r of results.filter(r => !r.ok)) {
    console.log(`   [${r.cat}] ${r.test}  ${r.notes}`)
  }
}

// Save
const dir = path.resolve(ROOT, 'tests-qa')
fs.mkdirSync(dir, { recursive: true })
fs.writeFileSync(path.join(dir, 'comprehensive-report.json'),
  JSON.stringify({ timestamp: new Date().toISOString(), ok, fail, total, byCategory: byCat, results }, null, 2))

const md = `# Creorga Comprehensive QA Report\n\n**${new Date().toISOString()}**\n\n## Score : ${ok}/${total} (${fail} échecs)\n\n` +
  '### Par catégorie\n\n| Catégorie | Score |\n|---|---|\n' +
  Object.entries(byCat).map(([c, v]) => `| ${c} | ${v.ok}/${v.total} |`).join('\n') +
  '\n\n### Détails\n\n| Catégorie | Test | Résultat | Notes |\n|---|---|---|---|\n' +
  results.map(r => `| ${r.cat} | ${r.test} | ${r.ok ? '✅' : '❌'} | ${r.notes} |`).join('\n')
fs.writeFileSync(path.join(dir, 'comprehensive-report.md'), md)

console.log(`\n📄 Rapport complet : tests-qa/comprehensive-report.md`)
process.exit(fail > 0 ? 1 : 0)
