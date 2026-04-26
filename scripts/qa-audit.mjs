#!/usr/bin/env node
/**
 * Creorga QA automated audit.
 * Tests backend endpoints + front-end route availability.
 * Produces a module-by-module status report.
 */
import { spawn } from 'child_process'

const BACKEND = process.env.BACKEND_URL || 'http://localhost:3002'
const WEB = process.env.WEB_URL || 'http://localhost:5174'

// Modules to audit + test probes
const AUDIT = [
  { id: 'health',      label: 'Backend health',        endpoint: 'GET /api/health' },
  { id: 'auth',        label: 'Authentication',        endpoint: 'POST /api/auth/login',    body: { email: 'admin@creorga.local', password: 'Admin1234!' } },
  { id: 'payments',    label: 'Payment gateways',      endpoint: 'GET /api/payments/providers' },
  { id: 'pos',         label: 'POS (Caisse)',          endpoint: 'GET /api/tables' },
  { id: 'orders',      label: 'Orders',                endpoint: 'GET /api/orders' },
  { id: 'products',    label: 'Products (menu)',       endpoint: 'GET /api/products' },
  { id: 'clients',     label: 'CRM clients',           endpoint: 'GET /api/crm/clients',    auth: true },
  { id: 'invoices',    label: 'Invoices & devis',      endpoint: 'GET /api/invoices',       auth: true },
  { id: 'reservations',label: 'Reservations',          endpoint: 'GET /api/reservations',   auth: true },
  { id: 'inventory',   label: 'Inventory',             endpoint: 'GET /api/inventory',      auth: true },
  { id: 'hr',          label: 'HR',                    endpoint: 'GET /api/hr',             auth: true },
  { id: 'haccp',       label: 'HACCP',                 endpoint: 'GET /api/haccp',          auth: true },
  { id: 'marketing',   label: 'Marketing',             endpoint: 'GET /api/marketing',      auth: true },
  { id: 'accounting',  label: 'Accounting',            endpoint: 'GET /api/accounting',     auth: true },
  { id: 'reputation',  label: 'Reputation',            endpoint: 'GET /api/reputation',     auth: true },
  { id: 'events',      label: 'Events',                endpoint: 'GET /api/events',         auth: true },
  { id: 'modules',     label: 'Modules registry',      endpoint: 'GET /api/modules',        auth: true },
  { id: 'email',       label: 'Email integration',     endpoint: 'POST /api/email/test',    body: {} },
  { id: 'stats',       label: 'Stats',                 endpoint: 'GET /api/stats' },
]

const FRONT_ROUTES = [
  '/login', '/', '/modules',
  '/pos/floor', '/pos/design', '/pos/dashboard',
  '/clients', '/crm/clients',
  '/invoices/devis', '/inventory/stock', '/hr/planning',
  '/haccp/journee', '/accounting/caisse',
  '/reputation/avis', '/ai', '/ai/local',
  '/settings/modules', '/settings/env-mode', '/settings/theme',
]

let token = ''

async function call(method, path, body) {
  const url = `${BACKEND}${path}`
  const headers = { 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = `Bearer ${token}`
  try {
    const res = await fetch(url, {
      method,
      headers,
      body: body != null ? JSON.stringify(body) : undefined,
    })
    const txt = await res.text()
    let json
    try { json = JSON.parse(txt) } catch { json = txt }
    return { ok: res.ok, status: res.status, data: json }
  } catch (e) {
    return { ok: false, status: 0, error: e.message }
  }
}

async function probeRoute(path) {
  try {
    const res = await fetch(`${WEB}${path}`, { redirect: 'manual' })
    return { ok: res.status < 500, status: res.status }
  } catch (e) {
    return { ok: false, status: 0, error: e.message }
  }
}

async function run() {
  console.log('\n═══════════════════════════════════════════════════════')
  console.log('  🔍 CREORGA QA AUDIT — ' + new Date().toISOString())
  console.log('═══════════════════════════════════════════════════════\n')

  // Priming auth
  console.log('→ Priming authentication…')
  const loginRes = await call('POST', '/api/auth/login', { email: 'admin@creorga.local', password: 'Admin1234!' })
  if (loginRes.ok && loginRes.data?.accessToken) {
    token = loginRes.data.accessToken
    console.log(`  ✓ Token acquired (user: ${loginRes.data.user?.email}, mode: ${loginRes.data.user?.id === 'fallback-admin' ? 'FALLBACK' : 'DB'})\n`)
  } else {
    console.log(`  ✗ Auth failed (${loginRes.status}) — tests requiring auth will fail\n`)
  }

  // Module tests
  const rows = []
  console.log('━━━ API ENDPOINT TESTS ━━━\n')
  for (const m of AUDIT) {
    const [method, path] = m.endpoint.split(' ')
    const r = await call(method, path, m.body)
    const symbol = r.ok ? '✅' : (r.status === 401 || r.status === 404) ? '⚠️' : '❌'
    const pad = (s, n) => s.padEnd(n)
    console.log(`${symbol} ${pad(m.label, 28)} ${pad(m.endpoint, 38)} → ${r.status || 'ERR'}`)
    rows.push({ module: m.label, endpoint: m.endpoint, status: r.status, ok: r.ok, data: r.data, error: r.error })
  }

  // Frontend probes
  console.log('\n━━━ FRONT-END ROUTE PROBES ━━━\n')
  const frontRows = []
  for (const path of FRONT_ROUTES) {
    const r = await probeRoute(path)
    const symbol = r.ok ? '✅' : '❌'
    console.log(`${symbol} ${path.padEnd(32)} → ${r.status || 'ERR'}`)
    frontRows.push({ path, status: r.status, ok: r.ok })
  }

  // Summary
  const apiPass = rows.filter((r) => r.ok).length
  const apiFail = rows.length - apiPass
  const frontPass = frontRows.filter((r) => r.ok).length
  const frontFail = frontRows.length - frontPass

  console.log('\n═══════════════════════════════════════════════════════')
  console.log('  📊 SUMMARY')
  console.log('═══════════════════════════════════════════════════════')
  console.log(`  Backend API:   ${apiPass}/${rows.length} OK   (${apiFail} failing)`)
  console.log(`  Front routes:  ${frontPass}/${frontRows.length} OK  (${frontFail} failing)`)
  console.log('═══════════════════════════════════════════════════════\n')

  return { rows, frontRows }
}

run().catch((e) => { console.error(e); process.exit(1) })
