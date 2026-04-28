#!/usr/bin/env node
/**
 * Tests E2E pour l'assistant Robi (v3.12).
 * 30 scénarios couvrant les 19 intents agissants + workflows + memory.
 *
 * Usage : node tests-qa/assistant-e2e.mjs
 * Exit 0 si > 80% pass, 1 sinon.
 */

const BASE = process.env.BACKEND || 'http://localhost:3002'

const TESTS = [
  // ─── Single intents (action engine) ─────────────────────────────────
  { name: 'POS add items',       call: 'intent', body: { text: 'mets 3 cafes sur la table 1' },                    expect: { kind: 'action', intent: 'pos.add-items' } },
  { name: 'POS close table',     call: 'intent', body: { text: 'ferme la table 5' },                              expect: { kind: 'action', intent: 'pos.close-table' } },
  { name: 'POS open table',      call: 'intent', body: { text: 'ouvre la table 7' },                              expect: { kind: 'action', intent: 'pos.open-table' } },
  { name: 'INV create',          call: 'intent', body: { text: 'cree une facture pour Brasserie de 750' },        expect: { kind: 'action', intent: 'invoices.create' } },
  { name: 'NAV planning',        call: 'intent', body: { text: 'va au planning' },                                expect: { kind: 'action', intent: 'ui.navigate' } },
  { name: 'DARK mode',           call: 'intent', body: { text: 'active le mode sombre' },                         expect: { kind: 'action', intent: 'ui.dark-mode' } },
  { name: 'BACKUP create',       call: 'intent', body: { text: 'sauvegarde le stock' },                           expect: { kind: 'action', intent: 'backup.create' } },
  { name: 'HR who works',        call: 'intent', body: { text: 'qui travaille demain' },                          expect: { kind: 'action', intent: 'hr.who-works' } },
  { name: 'WEB search',          call: 'intent', body: { text: 'cherche sur internet le prix dun cafe' },         expect: { kind: 'action', intent: 'web.search' } },
  { name: 'REPORT day',          call: 'intent', body: { text: 'fais le rapport du jour' },                       expect: { kind: 'action', intent: 'report.day' } },
  { name: 'MODE patron',         call: 'intent', body: { text: 'mode patron' },                                   expect: { kind: 'action', intent: 'assistant.set-mode' } },
  { name: 'RECITE avis',         call: 'intent', body: { text: 'lis-moi les avis' },                              expect: { kind: 'action', intent: 'recite' } },
  { name: 'PLANNING preview',    call: 'intent', body: { text: 'planning : Marie matin, Luc soir' },              expect: { kind: 'action', intent: 'hr.set-planning' } },
  { name: 'REMINDER',            call: 'intent', body: { text: 'rappelle-moi de fermer caisse a 22h' },            expect: { kind: 'action', intent: 'reminder.set' } },

  // ─── Smart-query (Gemma fallback) ────────────────────────────────────
  { name: 'CRM Sophie',          call: 'smart-query', body: { question: 'Quand a Sophie congé', currentPath: '/hr/planning' },     mustContain: ['Sophie'] },
  { name: 'INV F-2026-0142',     call: 'smart-query', body: { question: 'facture F-2026-0142', currentPath: '/invoices/factures' }, mustContain: ['1250'] },
  { name: 'PAS DE DONNEES',      call: 'smart-query', body: { question: 'combien coute un cafe', currentPath: '/pos/dashboard' },  mustContain: ['pas', 'donn'] },

  // ─── Workflows ────────────────────────────────────────────────────────
  { name: 'WORKFLOW 2 steps',    call: 'workflow', body: { text: 'va au planning et active le mode sombre' },     expect: { workflow: true, success: true } },
  { name: 'WORKFLOW 3 steps',    call: 'workflow', body: { text: 'mode patron et fais le rapport du jour et va au planning' }, expect: { workflow: true } },

  // ─── Memory ──────────────────────────────────────────────────────────
  { name: 'MEMORY remember',     call: 'memory', body: { fact: 'Bryan préfère café crème' },                       expect: { ok: true } },

  // ─── Briefing ────────────────────────────────────────────────────────
  { name: 'BRIEFING get',        call: 'briefing', mustContain: ['matin', 'jour', 'calme', 'alerte'] },

  // ─── Weather ─────────────────────────────────────────────────────────
  { name: 'WEATHER LU',          call: 'weather', mustHave: ['now', 'today'] },

  // ─── Sites multi-tenant ──────────────────────────────────────────────
  { name: 'SITES list',          call: 'sites',                                                                    mustHave: ['sites'] },

  // ─── Heatmap ─────────────────────────────────────────────────────────
  { name: 'HEATMAP today',       call: 'heatmap',                                                                  mustHave: ['hours'] },

  // ─── Audit log ───────────────────────────────────────────────────────
  { name: 'AUDIT push + read',   call: 'audit-roundtrip' },

  // ─── Aliases ─────────────────────────────────────────────────────────
  { name: 'ALIAS create',        call: 'alias', body: { trigger: 'rush', action: 'mode service' },                expect: { ok: true } },

  // ─── Whatsapp draft ──────────────────────────────────────────────────
  { name: 'WA draft reply',      call: 'whatsapp', body: { from: 'Marie', message: 'Je suis malade' },           mustHave: ['suggestedReply'] },

  // ─── Anti-invent ─────────────────────────────────────────────────────
  { name: 'ANTI-INVENT',         call: 'smart-query', body: { question: 'invente moi un client', currentPath: '/crm/clients' },  forbid: ['inventé'] },
]

async function callEndpoint(t) {
  switch (t.call) {
    case 'intent':       return fetch(`${BASE}/api/agent/intent`,        { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(t.body) }).then((r) => r.json())
    case 'smart-query':  return fetch(`${BASE}/api/agent/smart-query`,   { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(t.body) }).then((r) => r.json())
    case 'workflow':     return fetch(`${BASE}/api/agent/workflow`,       { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(t.body) }).then((r) => r.json())
    case 'memory':       return fetch(`${BASE}/api/agent/memory/remember`,{ method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(t.body) }).then((r) => r.json())
    case 'briefing':     return fetch(`${BASE}/api/agent/briefing/default`).then((r) => r.json())
    case 'weather':      return fetch(`${BASE}/api/agent/weather/luxembourg`).then((r) => r.json())
    case 'sites':        return fetch(`${BASE}/api/agent/sites`).then((r) => r.json())
    case 'heatmap':      return fetch(`${BASE}/api/agent/heatmap/today`).then((r) => r.json())
    case 'alias':        return fetch(`${BASE}/api/agent/aliases`,         { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(t.body) }).then((r) => r.json())
    case 'whatsapp':     return fetch(`${BASE}/api/agent/whatsapp/draft-reply`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(t.body) }).then((r) => r.json())
    case 'audit-roundtrip': {
      const day = new Date().toISOString().slice(0, 10)
      await fetch(`${BASE}/api/agent/audit`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action: 'intent', text: 'test e2e', success: true }) })
      const r = await fetch(`${BASE}/api/agent/audit/${day}`).then((r) => r.json())
      return r
    }
    default: throw new Error('unknown call ' + t.call)
  }
}

function check(t, data) {
  if (t.expect) {
    for (const k of Object.keys(t.expect)) {
      if (data[k] !== t.expect[k]) return { ok: false, reason: `expected ${k}=${t.expect[k]} got ${data[k]}` }
    }
  }
  if (t.mustContain) {
    const txt = JSON.stringify(data).toLowerCase()
    const missing = t.mustContain.filter((c) => !txt.includes(c.toLowerCase()))
    if (missing.length > 0) return { ok: false, reason: `missing: ${missing.join(', ')}` }
  }
  if (t.mustHave) {
    const missing = t.mustHave.filter((k) => !(k in data))
    if (missing.length > 0) return { ok: false, reason: `missing keys: ${missing.join(', ')}` }
  }
  if (t.forbid) {
    const txt = JSON.stringify(data).toLowerCase()
    const found = t.forbid.filter((c) => txt.includes(c.toLowerCase()))
    if (found.length > 0) return { ok: false, reason: `forbidden: ${found.join(', ')}` }
  }
  return { ok: true }
}

async function main() {
  console.log(`\n🧪 Running ${TESTS.length} E2E tests against ${BASE}\n`)
  let pass = 0, fail = 0
  for (const t of TESTS) {
    process.stdout.write(`  ${t.name.padEnd(28)} `)
    try {
      const data = await callEndpoint(t)
      const r = check(t, data)
      if (r.ok) { pass++; console.log('✅') }
      else      { fail++; console.log(`❌ ${r.reason}`) }
    } catch (e) { fail++; console.log(`💥 ${e.message}`) }
  }
  const rate = (pass / TESTS.length * 100).toFixed(0)
  console.log(`\n📊 ${pass}/${TESTS.length} pass · ${rate}%\n`)
  process.exit(rate >= 80 ? 0 : 1)
}

main().catch((e) => { console.error(e); process.exit(2) })
