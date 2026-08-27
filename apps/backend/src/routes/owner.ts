import { Router } from 'express'
import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import { readAuditEntries } from '../middleware/audit-log'
import { safeReadJson, safeWriteJson } from '../lib/safe-json'

const router = Router()
const DATA_DIR = path.resolve(process.cwd(), 'data')
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

/**
 * Une société ne doit voir que son propre journal. Les entrées historiques
 * (antérieures à l'estampille companyId) restent visibles pendant la
 * transition : la fenêtre de 1 000 entrées les évacue d'elle-même.
 */
export function filtrerParSociete(entries: any[], companyId: string | undefined): any[] {
  return entries.filter((entry) => entry.companyId == null || entry.companyId === companyId)
}

export function macroFileForCompany(companyId: string | undefined): string {
  const safeCompanyId = String(companyId || 'fallback-company').replace(/[^a-zA-Z0-9_-]/g, '_')
  return path.join(DATA_DIR, `owner-macros.${safeCompanyId}.json`)
}

export function validateMacro(input: any): { name: string; icon: string; intents: string[] } | null {
  const name = typeof input?.name === 'string' ? input.name.trim() : ''
  const icon = typeof input?.icon === 'string' ? input.icon.trim().slice(0, 12) : ''
  const intents = Array.isArray(input?.intents)
    ? input.intents.map((intent: unknown) => typeof intent === 'string' ? intent.trim() : '').filter(Boolean)
    : []
  if (!name || name.length > 80 || intents.length === 0 || intents.length > 10) return null
  if (intents.some((intent: string) => intent.length > 240)) return null
  return { name, icon: icon || '⚡', intents }
}

router.get('/audit', (req, res) => {
  const page = Math.max(1, Number(req.query.page || 1))
  const limit = Math.min(100, Math.max(10, Number(req.query.limit || 50)))
  const user = String(req.query.user || '').toLowerCase()
  const module = String(req.query.module || '').toLowerCase()
  const date = String(req.query.date || '')
  let entries = filtrerParSociete(readAuditEntries(), (req as any).companyId)
  if (user) entries = entries.filter((entry) => String(entry.userId || '').toLowerCase().includes(user))
  if (module) entries = entries.filter((entry) => String(entry.module || '').toLowerCase().includes(module))
  if (date) entries = entries.filter((entry) => String(entry.ts || '').startsWith(date))
  const start = (page - 1) * limit
  res.json({ items: entries.slice(start, start + limit), total: entries.length, page, limit })
})

router.post('/audit', (req, res) => {
  const entries = readAuditEntries()
  // companyId imposé côté serveur : une société ne peut pas forger une entrée
  // au nom d'une autre.
  const entry = {
    id: Math.random().toString(36).slice(2, 10),
    ts: new Date().toISOString(),
    ...(req.body || {}),
    companyId: (req as any).companyId ?? null,
  }
  writeJson(path.join(DATA_DIR, 'audit-log.json'), [entry, ...entries].slice(0, 1000))
  res.status(201).json(entry)
})

router.get('/macros', (req, res) => {
  res.json(readJson(macroFileForCompany((req as any).companyId), []))
})

router.post('/macros', (req, res) => {
  const validated = validateMacro(req.body)
  if (!validated) {
    res.status(400).json({ message: 'Nom et au moins une action valides requis (10 actions maximum)' })
    return
  }
  const file = macroFileForCompany((req as any).companyId)
  const macros = readJson(file, [])
  const requestedId = typeof req.body?.id === 'string' && /^[a-zA-Z0-9_-]{1,80}$/.test(req.body.id)
    ? req.body.id
    : crypto.randomUUID()
  const macro = { id: requestedId, ...validated }
  const next = [macro, ...macros.filter((m: any) => m.id !== macro.id)]
  writeJson(file, next)
  res.status(201).json(macro)
})

router.delete('/macros/:id', (req, res) => {
  const file = macroFileForCompany((req as any).companyId)
  const macros = readJson(file, [])
  if (!macros.some((macro: any) => macro.id === req.params.id)) {
    res.status(404).json({ message: 'Macro introuvable' })
    return
  }
  writeJson(file, macros.filter((macro: any) => macro.id !== req.params.id))
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
