import { Router } from 'express'
import fs from 'fs'
import path from 'path'
import { readAuditEntries } from '../middleware/audit-log'
import { safeReadJson, safeWriteJson } from '../lib/safe-json'

const router = Router()
const DATA_DIR = path.resolve(process.cwd(), 'data')
const MACROS_FILE = path.join(DATA_DIR, 'owner-macros.json')
const CUSTOMERS_FILE = path.join(DATA_DIR, 'customers.json')

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })
}

function readJson(file: string, fallback: any) {
  ensureDataDir()
  if (!fs.existsSync(file)) return fallback
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'))
  } catch {
    return fallback
  }
}

function writeJson(file: string, data: any) {
  ensureDataDir()
  fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8')
}

router.get('/audit', (req, res) => {
  const page = Math.max(1, Number(req.query.page || 1))
  const limit = Math.min(100, Math.max(10, Number(req.query.limit || 50)))
  const user = String(req.query.user || '').toLowerCase()
  const module = String(req.query.module || '').toLowerCase()
  const date = String(req.query.date || '')
  let entries = readAuditEntries()
  if (user) entries = entries.filter((entry) => String(entry.userId || '').toLowerCase().includes(user))
  if (module) entries = entries.filter((entry) => String(entry.module || '').toLowerCase().includes(module))
  if (date) entries = entries.filter((entry) => String(entry.ts || '').startsWith(date))
  const start = (page - 1) * limit
  res.json({ items: entries.slice(start, start + limit), total: entries.length, page, limit })
})

router.post('/audit', (req, res) => {
  const entries = readAuditEntries()
  const entry = { id: Math.random().toString(36).slice(2, 10), ts: new Date().toISOString(), ...(req.body || {}) }
  writeJson(path.join(DATA_DIR, 'audit-log.json'), [entry, ...entries].slice(0, 1000))
  res.status(201).json(entry)
})

router.get('/macros', (_req, res) => {
  const defaults = [
    { id: 'end-service', name: 'Fin de service', icon: '🏁', intents: ['pos.close-all-tables', 'acc.cloture-caisse', 'daily-briefing.evening'] },
  ]
  res.json(readJson(MACROS_FILE, defaults))
})

router.post('/macros', (req, res) => {
  const macros = readJson(MACROS_FILE, [])
  const macro = { id: req.body.id || Math.random().toString(36).slice(2, 10), name: req.body.name, icon: req.body.icon || '⚡', intents: req.body.intents || [] }
  const next = [macro, ...macros.filter((m: any) => m.id !== macro.id)]
  writeJson(MACROS_FILE, next)
  res.status(201).json(macro)
})

router.delete('/macros/:id', (req, res) => {
  const macros = readJson(MACROS_FILE, [])
  writeJson(MACROS_FILE, macros.filter((macro: any) => macro.id !== req.params.id))
  res.json({ ok: true })
})

// ─── POST /api/owner/purge-inactive-customers — v4.7 purge RGPD ───────
// crm.ts est en zone interdite (refactor Codex en cours) : cet endpoint
// purge directement data/customers.json (fallback historique) au lieu
// de passer par Prisma via crm.ts.
router.post('/purge-inactive-customers', (_req, res) => {
  const threeYearsAgo = new Date()
  threeYearsAgo.setFullYear(threeYearsAgo.getFullYear() - 3)

  const all = safeReadJson<any[]>(CUSTOMERS_FILE, [])
  const kept = all.filter((c) => {
    const last = new Date(c.lastVisit || c.updatedAt || c.createdAt || 0)
    return last >= threeYearsAgo
  })
  const purged = all.length - kept.length
  safeWriteJson(CUSTOMERS_FILE, kept)
  res.json({ ok: true, purged })
})

export default router
