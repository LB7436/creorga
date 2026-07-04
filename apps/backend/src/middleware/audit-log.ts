import fs from 'fs'
import path from 'path'
import type { NextFunction, Request, Response } from 'express'
import { safeWriteJson, safeReadJson } from '../lib/safe-json'

const DATA_DIR = path.resolve(process.cwd(), 'data')
const AUDIT_FILE = path.join(DATA_DIR, 'audit-log.json')
const MUTATING = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })
}

function readAuditLog(): any[] {
  ensureDataDir()
  const parsed = safeReadJson<any[]>(AUDIT_FILE, [])
  return Array.isArray(parsed) ? parsed : []
}

function writeAuditLog(entries: any[]) {
  ensureDataDir()
  safeWriteJson(AUDIT_FILE, entries.slice(0, 1000))
}

function summarizeBody(body: unknown) {
  if (!body || typeof body !== 'object') return undefined
  const keys = Object.keys(body as Record<string, unknown>).slice(0, 8)
  return keys.reduce<Record<string, string>>((acc, key) => {
    const value = (body as Record<string, unknown>)[key]
    if (typeof value === 'string') acc[key] = value.slice(0, 80)
    else if (typeof value === 'number' || typeof value === 'boolean') acc[key] = String(value)
    else if (Array.isArray(value)) acc[key] = `array(${value.length})`
    else if (value && typeof value === 'object') acc[key] = 'object'
    return acc
  }, {})
}

export function auditLog(req: Request, res: Response, next: NextFunction) {
  if (!MUTATING.has(req.method) || req.path.startsWith('/api/owner/audit')) {
    next()
    return
  }
  res.on('finish', () => {
    try {
      const user = (req as any).user
      const entries = readAuditLog()
      entries.unshift({
        id: Math.random().toString(36).slice(2, 10),
        ts: new Date().toISOString(),
        userId: user?.userId ?? user?.id ?? 'anonymous',
        method: req.method,
        path: req.originalUrl,
        status: res.statusCode,
        module: req.originalUrl.split('/')[2] || 'system',
        body: summarizeBody(req.body),
      })
      writeAuditLog(entries)
    } catch {
      // Audit logging must never break the business request.
    }
  })
  next()
}

export function readAuditEntries() {
  return readAuditLog()
}

/**
 * v4.6 — dataDir(req) helper multi-tenant.
 *
 * Si req.user.siteId présent → retourne data/sites/{siteId}/, sinon data/.
 *
 * Pas de refactor massif : seuls les endpoints critiques peuvent migrer
 * progressivement vers ce helper.
 *
 * TODO follow-up : migrer inventory, invoices, customers vers dataDir(req)
 * pour vrai support multi-tenant. Pour l'instant, fallback mono-site.
 */
export function dataDir(req?: Request): string {
  const siteId = req && (req as any).user?.siteId
  if (siteId && typeof siteId === 'string' && /^[a-zA-Z0-9_-]+$/.test(siteId)) {
    const dir = path.join(DATA_DIR, 'sites', siteId)
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
    return dir
  }
  return DATA_DIR
}

export function dataPath(filename: string, req?: Request): string {
  return path.join(dataDir(req), filename)
}
