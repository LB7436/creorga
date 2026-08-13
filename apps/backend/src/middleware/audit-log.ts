import fs from 'fs'
import path from 'path'
import type { NextFunction, Request, Response } from 'express'
import { safeWriteJson, safeReadJson } from '../lib/safe-json'
import { push as pushEvenement } from '../lib/eventSink'
import logger from '../lib/logger'

const DATA_DIR = path.resolve(process.cwd(), 'data')
const AUDIT_FILE = path.join(DATA_DIR, 'audit-log.json')
const MUTATING = new Set(['POST', 'PUT', 'PATCH', 'DELETE'])

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })
}

/**
 * Journal tenu EN MÉMOIRE, écrit par lots.
 *
 * Auparavant, chaque requête modifiante relisait puis réécrivait tout le
 * fichier de façon synchrone — jusqu'à 252 Ko (1000 entrées) par commande
 * enregistrée, ce qui bloquait le fil Node en plein service. On lit désormais
 * le fichier une seule fois au démarrage, on ajoute en mémoire, et on écrit au
 * plus une fois toutes les 2 secondes.
 */
let cache: any[] | null = null
let aEcrire = false
let minuteur: NodeJS.Timeout | null = null

function readAuditLog(): any[] {
  if (cache) return cache
  ensureDataDir()
  const parsed = safeReadJson<any[]>(AUDIT_FILE, [])
  cache = Array.isArray(parsed) ? parsed : []
  return cache
}

function planifierEcriture() {
  aEcrire = true
  if (minuteur) return
  minuteur = setTimeout(() => {
    minuteur = null
    if (!aEcrire || !cache) return
    aEcrire = false
    try {
      ensureDataDir()
      safeWriteJson(AUDIT_FILE, cache.slice(0, 1000))
    } catch (e: any) {
      // Ne jamais avaler un échec d'écriture (règle du CLAUDE.md).
      logger.error(`[audit] écriture du journal impossible: ${e?.message || e}`)
    }
  }, 2000)
  // Ne pas retenir le processus au moment de l'arrêt.
  minuteur.unref?.()
}

// Ne JAMAIS journaliser ces champs en clair : le mot de passe des routes
// /auth était persisté entier dans data/audit-log.json (donc lisible via
// /api/owner/audit et embarqué dans chaque sauvegarde). Fuite RGPD/CNPD.
// Étendu aux identités (email, téléphone, adresse) et données RH : dans un
// journal, ce sont des données personnelles sans valeur d'exploitation.
const CHAMPS_SENSIBLES = new Set([
  'password', 'motdepasse', 'motDePasse', 'pin', 'code',
  'token', 'refreshtoken', 'refreshToken', 'accesstoken', 'accessToken',
  'secret', 'iban', 'currentpassword', 'currentPassword', 'newpassword', 'newPassword',
  'email', 'telephone', 'phone', 'adresse', 'address', 'numsecu', 'numSecu', 'salaireBrut',
])

function summarizeBody(body: unknown) {
  if (!body || typeof body !== 'object') return undefined
  const keys = Object.keys(body as Record<string, unknown>).slice(0, 8)
  return keys.reduce<Record<string, string>>((acc, key) => {
    if (CHAMPS_SENSIBLES.has(key) || CHAMPS_SENSIBLES.has(key.toLowerCase())) {
      acc[key] = '***'
      return acc
    }
    const value = (body as Record<string, unknown>)[key]
    if (typeof value === 'string') acc[key] = value.slice(0, 80)
    else if (typeof value === 'number' || typeof value === 'boolean') acc[key] = String(value)
    else if (Array.isArray(value)) acc[key] = `array(${value.length})`
    else if (value && typeof value === 'object') acc[key] = 'object'
    return acc
  }, {})
}

// Chemins jamais collectés : santé (sonde), console créateur (auto-exclusion,
// même logique que /api/owner/audit), et les endpoints publics ou de polling
// dont le volume noierait l'usage réel (plan de salle 1,5 s, portail 2,5 s).
const CHEMINS_EXCLUS = [
  '/api/owner/audit',
  '/api/creator',
  '/api/health',
  '/api/floor-state',
  '/api/portal-config',
  '/api/guest',
  '/api/game-scores',
  '/api/media-affichage',
]

// Les GET partent UNIQUEMENT vers ActivityEvent (jamais dans le JSON), à
// 1 lecture sur 5 : le facteur ×5 est réappliqué à l'agrégation. Les
// mutations partent dans les deux.
const TAUX_ECHANTILLON_GET = 0.2

export function auditLog(req: Request, res: Response, next: NextFunction) {
  const estMutation = MUTATING.has(req.method)
  if (CHEMINS_EXCLUS.some((prefixe) => req.path.startsWith(prefixe))) {
    next()
    return
  }
  const collecterGet = !estMutation && req.method === 'GET' && Math.random() < TAUX_ECHANTILLON_GET
  if (!estMutation && !collecterGet) {
    next()
    return
  }

  const debut = process.hrtime.bigint()
  res.on('finish', () => {
    try {
      const user = (req as any).user
      const durationMs = Number((process.hrtime.bigint() - debut) / 1000000n)

      if (estMutation) {
        const entries = readAuditLog()
        entries.unshift({
          id: Math.random().toString(36).slice(2, 10),
          ts: new Date().toISOString(),
          userId: user?.userId ?? user?.id ?? 'anonymous',
          // Posé par requireCompany quand la route en dispose : permet à
          // /api/owner/audit de ne montrer à chaque société que son journal.
          companyId: (req as any).companyId ?? null,
          method: req.method,
          path: req.originalUrl,
          status: res.statusCode,
          module: req.originalUrl.split('/')[2] || 'system',
          body: summarizeBody(req.body),
        })
        if (entries.length > 1000) entries.length = 1000
        planifierEcriture()
      }

      // Collecte console créateur : des actions, pas des contenus — ni corps,
      // ni IP, ni user-agent, path sans query string.
      pushEvenement('activityEvent', {
        companyId: (req as any).companyId ?? null,
        userId: user?.userId ?? user?.id ?? null,
        role: (req as any).role ?? null,
        method: req.method,
        module: req.originalUrl.split('/')[2] || 'system',
        path: (req.originalUrl || req.path).split('?')[0],
        status: res.statusCode,
        durationMs,
      })
    } catch {
      // La journalisation ne doit jamais casser la requête métier.
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
