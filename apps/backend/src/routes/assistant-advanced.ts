import { Router } from 'express'
import fs from 'fs'
import path from 'path'

/**
 * Advanced assistant features (v3.11) :
 *  - Workflow chaining (POST /workflow) : run multiple intents sequentially
 *  - Undo stack (GET/POST /undo)
 *  - Long-term memory (GET/POST /memory/:userId)
 *  - Proactive briefing (GET /briefing)
 *  - Custom aliases (POST /aliases)
 */

const router = Router()
const DATA_DIR = path.resolve(process.cwd(), 'data')

function loadJson<T = any>(filename: string, fallback: T): T {
  const p = path.join(DATA_DIR, filename)
  if (!fs.existsSync(p)) return fallback
  try { return JSON.parse(fs.readFileSync(p, 'utf8')) as T } catch { return fallback }
}
function saveJson(filename: string, data: any) {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })
  fs.writeFileSync(path.join(DATA_DIR, filename), JSON.stringify(data, null, 2), 'utf8')
}

// Versioning : keep last 5 versions of any file (#30)
function saveVersionedJson(filename: string, data: any) {
  const filePath = path.join(DATA_DIR, filename)
  const versionsDir = path.join(DATA_DIR, 'versions')
  if (!fs.existsSync(versionsDir)) fs.mkdirSync(versionsDir, { recursive: true })
  if (fs.existsSync(filePath)) {
    const ts = new Date().toISOString().replace(/[:.]/g, '-')
    const versionPath = path.join(versionsDir, `${filename.replace(/\.json$/, '')}.${ts}.json`)
    fs.copyFileSync(filePath, versionPath)
    // Prune : keep only last 5 versions per file
    const prefix = filename.replace(/\.json$/, '') + '.'
    const versions = fs.readdirSync(versionsDir)
      .filter((f) => f.startsWith(prefix))
      .sort().reverse()
    versions.slice(5).forEach((f) => { try { fs.unlinkSync(path.join(versionsDir, f)) } catch { /* ignore */ } })
  }
  saveJson(filename, data)
}

// ═══════════════════════════════════════════════════════════════════════
// WORKFLOWS — chain multiple intents
// "Crée facture Brasserie 850 ET envoie par mail ET active mode sombre"
// ═══════════════════════════════════════════════════════════════════════

function splitWorkflow(text: string): string[] {
  // Split on "et", "puis", "ensuite", ";", "," (when followed by a verb)
  // Keep simple : split on " et ", " puis ", " ensuite ", ";"
  return text
    .split(/\s+(?:et|puis|ensuite|apr[èe]s)\s+/i)
    .map((s) => s.trim())
    .filter(Boolean)
}

router.post('/workflow', async (req, res) => {
  const { text, currentPath, userId = 'default' } = req.body || {}
  if (!text) return res.status(400).json({ error: 'text required' })
  const steps = splitWorkflow(text)
  if (steps.length <= 1) {
    // Not a workflow, redirect to single intent
    const r = await fetch(`http://localhost:${process.env.PORT || 3002}/api/agent/intent`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text, currentPath, userId }),
    })
    const data = await r.json()
    return res.json({ workflow: false, ...data })
  }
  const results: any[] = []
  for (const step of steps) {
    try {
      const r = await fetch(`http://localhost:${process.env.PORT || 3002}/api/agent/intent`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: step, currentPath, userId }),
      })
      const data = await r.json()
      results.push({ step, ...data })
    } catch (e: any) {
      results.push({ step, kind: 'error', text: e?.message })
    }
  }
  const successCount = results.filter((r) => r.success || r.kind === 'action' || r.kind === 'answer').length
  res.json({
    workflow: true,
    kind: 'workflow',
    success: successCount === results.length,
    summary: `🔗 Workflow : ${successCount}/${results.length} étape(s) réussie(s).`,
    steps: results,
  })
})

// ═══════════════════════════════════════════════════════════════════════
// UNDO STACK — last 10 destructive actions per user
// ═══════════════════════════════════════════════════════════════════════

interface UndoEntry {
  id: string
  ts: number
  intent: string
  params: any
  reverseAction: { type: string; payload: any }   // describes how to undo
  description: string
}

function loadUndoStack(userId: string): UndoEntry[] {
  return loadJson<UndoEntry[]>(`undo/${userId}.json`, [])
}
function saveUndoStack(userId: string, stack: UndoEntry[]) {
  if (!fs.existsSync(path.join(DATA_DIR, 'undo'))) fs.mkdirSync(path.join(DATA_DIR, 'undo'), { recursive: true })
  saveJson(`undo/${userId}.json`, stack)
}

router.post('/undo/push', (req, res) => {
  const { userId = 'default', entry } = req.body || {}
  if (!entry) return res.status(400).json({ error: 'entry required' })
  const stack = loadUndoStack(userId)
  stack.unshift({ ...entry, id: Math.random().toString(36).slice(2, 12), ts: Date.now() })
  if (stack.length > 10) stack.length = 10
  saveUndoStack(userId, stack)
  res.json({ ok: true, stackSize: stack.length })
})

router.post('/undo', async (req, res) => {
  const { userId = 'default' } = req.body || {}
  const stack = loadUndoStack(userId)
  if (stack.length === 0) return res.json({ kind: 'text', text: 'Rien à annuler.' })
  const last = stack.shift()!
  saveUndoStack(userId, stack)
  // Execute reverse action
  try {
    const { type, payload } = last.reverseAction
    if (type === 'invoices.delete') {
      const invoices = loadJson<any[]>('invoices.json', [])
      const filtered = invoices.filter((i) => i.id !== payload.id)
      saveVersionedJson('invoices.json', filtered)
    } else if (type === 'pos.remove-items') {
      const floorMod = await import('./floorState')
      const state = floorMod.getFloorState()
      const t = state.tables.find((x: any) => x.id === payload.tableId)
      if (t && Array.isArray(payload.itemIds)) {
        t.items = (t.items || []).filter((i: any) => !payload.itemIds.includes(i.id))
      }
    } else if (type === 'shifts.remove') {
      const shifts = loadJson<any[]>('shifts.json', [])
      const filtered = shifts.filter((s) => !payload.shiftIds?.includes(s.id))
      saveVersionedJson('shifts.json', filtered)
    } else if (type === 'reservations.delete') {
      const reservations = loadJson<any[]>('reservations.json', [])
      const filtered = reservations.filter((r) => r.id !== payload.id)
      saveVersionedJson('reservations.json', filtered)
    }
    res.json({
      kind: 'action', success: true, intent: 'undo',
      summary: `↩️ Annulé : ${last.description}`,
    })
  } catch (e: any) {
    res.json({ kind: 'error', text: '❌ Annulation échouée : ' + (e?.message || 'erreur') })
  }
})

router.get('/undo/list/:userId', (req, res) => {
  res.json({ stack: loadUndoStack(req.params.userId).slice(0, 10) })
})

// ═══════════════════════════════════════════════════════════════════════
// LONG-TERM MEMORY — facts the assistant should remember across sessions
// "Bryan préfère un café crème", "le mardi est calme", "VIP : Sophie"
// ═══════════════════════════════════════════════════════════════════════

interface MemoryEntry {
  id: string
  ts: number
  fact: string
  category?: string   // 'preference' | 'observation' | 'rule'
  confidence?: number
}

function loadMemoryFacts(userId: string): MemoryEntry[] {
  return loadJson<MemoryEntry[]>(`memory-facts/${userId}.json`, [])
}
function saveMemoryFacts(userId: string, facts: MemoryEntry[]) {
  if (!fs.existsSync(path.join(DATA_DIR, 'memory-facts'))) fs.mkdirSync(path.join(DATA_DIR, 'memory-facts'), { recursive: true })
  saveJson(`memory-facts/${userId}.json`, facts)
}

router.post('/memory/remember', (req, res) => {
  const { userId = 'default', fact, category = 'observation' } = req.body || {}
  if (!fact) return res.status(400).json({ error: 'fact required' })
  const facts = loadMemoryFacts(userId)
  facts.unshift({
    id: Math.random().toString(36).slice(2, 12),
    ts: Date.now(),
    fact: String(fact).slice(0, 200),
    category,
  })
  if (facts.length > 50) facts.length = 50
  saveMemoryFacts(userId, facts)
  res.json({ ok: true, count: facts.length })
})

router.get('/memory/facts/:userId', (req, res) => {
  res.json({ facts: loadMemoryFacts(req.params.userId) })
})

router.delete('/memory/forget/:userId/:factId', (req, res) => {
  const facts = loadMemoryFacts(req.params.userId).filter((f) => f.id !== req.params.factId)
  saveMemoryFacts(req.params.userId, facts)
  res.json({ ok: true, count: facts.length })
})

// ═══════════════════════════════════════════════════════════════════════
// PROACTIVE BRIEFING — Robi's morning summary (to be triggered at 8am)
// ═══════════════════════════════════════════════════════════════════════

router.get('/briefing/:userId', async (req, res) => {
  const userId = req.params.userId
  const items: string[] = []
  const facts = loadMemoryFacts(userId)

  // Use existing /execute commands
  const callExec = async (commandId: string) => {
    try {
      const r = await fetch(`http://localhost:${process.env.PORT || 3002}/api/agent/execute`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ commandId }),
      })
      return await r.json()
    } catch { return null }
  }

  const overdue = await callExec('inv.overdue')
  if (overdue?.ui?.items?.length > 0) items.push(`💰 ${overdue.ui.items.length} factures en retard`)

  const lowStock = await callExec('inv.low-stock')
  if (lowStock?.ui?.items?.length > 0) items.push(`📦 ${lowStock.ui.items.length} articles en rupture`)

  const stale = await callExec('pos.stale-sessions')
  if (stale?.ui?.items?.length > 0) items.push(`⏱️ ${stale.ui.items.length} table(s) > 4h ouverte(s)`)

  const today = new Date()
  const day = ['dim', 'lun', 'mar', 'mer', 'jeu', 'ven', 'sam'][today.getDay()]
  const hour = today.getHours()
  const greeting = hour < 12 ? 'Bonjour' : hour < 18 ? 'Bon après-midi' : 'Bonsoir'

  const msg = items.length > 0
    ? `${greeting} ! Ce matin : ${items.join(' · ')}.`
    : `${greeting} ! Tout est calme ce ${day}. Aucune alerte critique.`

  res.json({
    kind: 'briefing',
    text: msg,
    items,
    facts: facts.slice(0, 3).map((f) => f.fact),
    timestamp: Date.now(),
  })
})

// ═══════════════════════════════════════════════════════════════════════
// CUSTOM ALIASES — user-defined intent shortcuts
// "Quand je dis 'rush du soir' fais 'mode service + active mode sombre'"
// ═══════════════════════════════════════════════════════════════════════

interface Alias {
  id: string
  trigger: string  // user phrase
  action: string   // expanded text to feed back to /intent
  ts: number
}

function loadAliases(userId: string): Alias[] {
  return loadJson<Alias[]>(`aliases/${userId}.json`, [])
}
function saveAliases(userId: string, aliases: Alias[]) {
  if (!fs.existsSync(path.join(DATA_DIR, 'aliases'))) fs.mkdirSync(path.join(DATA_DIR, 'aliases'), { recursive: true })
  saveJson(`aliases/${userId}.json`, aliases)
}

router.post('/aliases', (req, res) => {
  const { userId = 'default', trigger, action } = req.body || {}
  if (!trigger || !action) return res.status(400).json({ error: 'trigger + action required' })
  const aliases = loadAliases(userId)
  aliases.unshift({
    id: Math.random().toString(36).slice(2, 10),
    trigger: String(trigger).toLowerCase().trim(),
    action: String(action).trim(),
    ts: Date.now(),
  })
  saveAliases(userId, aliases)
  res.json({ ok: true, count: aliases.length })
})

router.get('/aliases/:userId', (req, res) => {
  res.json({ aliases: loadAliases(req.params.userId) })
})

router.delete('/aliases/:userId/:id', (req, res) => {
  const next = loadAliases(req.params.userId).filter((a) => a.id !== req.params.id)
  saveAliases(req.params.userId, next)
  res.json({ ok: true, count: next.length })
})

// ═══════════════════════════════════════════════════════════════════════
// WEATHER + EVENTS LU (#34)  — wttr.in is free, no key
// ═══════════════════════════════════════════════════════════════════════

router.get('/weather/luxembourg', async (_req, res) => {
  try {
    const r = await fetch('https://wttr.in/Luxembourg?format=j1')
    if (!r.ok) return res.json({ error: 'wttr.in down' })
    const data = await r.json() as any
    const current = data.current_condition?.[0]
    const today = data.weather?.[0]
    res.json({
      now: {
        tempC: parseInt(current?.temp_C || '0'),
        feelsLikeC: parseInt(current?.FeelsLikeC || '0'),
        desc: current?.lang_fr?.[0]?.value || current?.weatherDesc?.[0]?.value || '',
        wind: current?.windspeedKmph + ' km/h',
        humidity: current?.humidity + '%',
      },
      today: {
        maxC: parseInt(today?.maxtempC || '0'),
        minC: parseInt(today?.mintempC || '0'),
        sunHour: parseInt(today?.sunHour || '0'),
        rainMm: parseFloat(today?.totalSnow_cm || '0'),
      },
    })
  } catch (e: any) {
    res.json({ error: e?.message })
  }
})

export default router
