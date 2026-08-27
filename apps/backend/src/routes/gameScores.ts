import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { z } from 'zod'
import path from 'path'
import { safeReadJson, safeWriteJson } from '../lib/safe-json'
import prisma from '../lib/prisma'

/**
 * v4.9 — Scores des jeux guest, persistés + broadcast live pour le leaderboard salle.
 * v5.1 — chemin résolu via dataPath(req) pour préparer le multi-tenant.
 * v6.0 — validation zod (plages, longueurs, nettoyage) + rate-limit anti-spam :
 *        les scores étaient falsifiables sans limite depuis n'importe quel client.
 */

const SCORES_FILENAME = 'game-scores.json'
const MAX_ENTRIES = 500
const MAX_SCORE = 1_000_000

interface ScoreEntry {
  id: string
  ts: number
  companyId: string
  gameId: string
  playerName: string
  tableId?: string
  score: number
}

const scoreSchema = z.object({
  companyId: z.string().regex(/^[a-zA-Z0-9_-]{1,100}$/, 'companyId invalide'),
  gameId: z.string().regex(/^[a-z0-9-]{2,32}$/i, 'gameId invalide'),
  score: z.number().int().min(0).max(MAX_SCORE),
  playerName: z.string().trim().min(1).max(24).optional(),
  tableId: z.string().trim().max(12).optional(),
})

/** Neutralise tout balisage dans les champs affichés par le leaderboard. */
function sanitizeLabel(value: string) {
  return value.replace(/[<>]/g, '').trim()
}

const postLimiter = rateLimit({
  windowMs: 60_000,
  limit: 30,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Trop de scores envoyés, réessayez dans une minute' },
})

const router = Router()

function scoresFile(companyId: string) {
  return path.resolve(process.cwd(), 'data', 'companies', companyId, SCORES_FILENAME)
}

const companyIdSchema = z.string().regex(/^[a-zA-Z0-9_-]{1,100}$/)

async function companyExists(companyId: string) {
  return Boolean(await prisma.company.findUnique({ where: { id: companyId }, select: { id: true } }))
}

router.post('/', postLimiter, async (req, res) => {
  const parsed = scoreSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ error: 'Score invalide', details: parsed.error.issues[0]?.message })
  }
  const { companyId, gameId, score, playerName, tableId } = parsed.data
  try {
    if (!(await companyExists(companyId))) return res.status(404).json({ error: 'Établissement inconnu' })
  } catch {
    return res.status(503).json({ error: 'Classement indisponible pour le moment' })
  }

  const entry: ScoreEntry = {
    id: 'score-' + Math.random().toString(36).slice(2, 10),
    ts: Date.now(),
    companyId,
    gameId,
    playerName: playerName ? sanitizeLabel(playerName) || 'Anonyme' : 'Anonyme',
    tableId: tableId ? sanitizeLabel(tableId) || undefined : undefined,
    score,
  }

  const file = scoresFile(companyId)
  const entries = safeReadJson<ScoreEntry[]>(file, [])
  const next = [entry, ...entries].slice(0, MAX_ENTRIES)
  safeWriteJson(file, next)

  try {
    const broadcast = (globalThis as { liveBroadcast?: (ns: string, event: string, payload: unknown) => void }).liveBroadcast
    if (typeof broadcast === 'function') broadcast(`games-${companyId}`, 'new-score', entry)
  } catch { /* broadcast indisponible */ }

  res.status(201).json(entry)
})

router.get('/all/top', async (req, res) => {
  const parsedCompany = companyIdSchema.safeParse(req.query.companyId)
  if (!parsedCompany.success) return res.status(400).json({ error: 'companyId requis' })
  const limit = Math.min(50, Number(req.query.limit) || 10)
  const entries = safeReadJson<ScoreEntry[]>(scoresFile(parsedCompany.data), [])
  const top = [...entries].sort((a, b) => b.score - a.score).slice(0, limit)
  res.json({ top })
})

router.get('/:gameId/top', async (req, res) => {
  const parsedCompany = companyIdSchema.safeParse(req.query.companyId)
  if (!parsedCompany.success) return res.status(400).json({ error: 'companyId requis' })
  const limit = Math.min(50, Number(req.query.limit) || 10)
  const entries = safeReadJson<ScoreEntry[]>(scoresFile(parsedCompany.data), [])
  const top = entries
    .filter((e) => e.gameId === req.params.gameId)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
  res.json({ top })
})

export default router
