import { Router } from 'express'
import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import { readAuditEntries } from '../middleware/audit-log'

const router = Router()
const DATA_DIR = path.resolve(process.cwd(), 'data')

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
 * L'historique sans société reste conservé mais n'appartient pas implicitement
 * à tous les propriétaires. Une attribution exige une migration séparée revue.
 */
export function filtrerParSociete(entries: any[], companyId: string | undefined): any[] {
  return typeof companyId === 'string' && !!companyId ? entries.filter((entry) => entry.companyId === companyId) : []
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

router.post('/audit', (_req, res) => {
  return res.status(503).json({ code: 'AUDIT_APPEND_ONLY_REQUIRED', message: 'Le journal serveur ne peut pas être réécrit depuis un formulaire.' })
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
  return res.status(503).json({ code: 'CUSTOMER_RETENTION_SCOPE_REQUIRED', message: 'Aucune purge automatique : politique de conservation et périmètre société à valider séparément.' })
})

export default router
