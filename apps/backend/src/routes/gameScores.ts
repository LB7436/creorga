import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import { z } from 'zod'
import { safeReadJson, safeWriteJson } from '../lib/safe-json'
import { dataPath } from '../middleware/audit-log'

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
  gameId: string
  playerName: string
  tableId?: string
  score: number
}

const scoreSchema = z.object({
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

router.post('/', postLimiter, (req, res) => {
  const parsed = scoreSchema.safeParse(req.body)
  if (!parsed.success) {
    return res.status(400).json({ error: 'Score invalide', details: parsed.error.issues[0]?.message })
  }
  const { gameId, score, playerName, tableId } = parsed.data

  const entry: ScoreEntry = {
    id: 'score-' + Math.random().toString(36).slice(2, 10),
    ts: Date.now(),
    gameId,
    playerName: playerName ? sanitizeLabel(playerName) || 'Anonyme' : 'Anonyme',
    tableId: tableId ? sanitizeLabel(tableId) || undefined : undefined,
    score,
  }

  const scoresFile = dataPath(SCORES_FILENAME, req)
  const entries = safeReadJson<ScoreEntry[]>(scoresFile, [])
  const next = [entry, ...entries].slice(0, MAX_ENTRIES)
  safeWriteJson(scoresFile, next)

  try {
    const broadcast = (globalThis as { liveBroadcast?: (ns: string, event: string, payload: unknown) => void }).liveBroadcast
    if (typeof broadcast === 'function') broadcast('games', 'new-score', entry)
  } catch { /* broadcast indisponible */ }

  res.status(201).json(entry)
})

router.get('/all/top', (req, res) => {
  const limit = Math.min(50, Number(req.query.limit) || 10)
  const entries = safeReadJson<ScoreEntry[]>(dataPath(SCORES_FILENAME, req), [])
  const top = [...entries].sort((a, b) => b.score - a.score).slice(0, limit)
  res.json({ top })
})

router.get('/:gameId/top', (req, res) => {
  const limit = Math.min(50, Number(req.query.limit) || 10)
  const entries = safeReadJson<ScoreEntry[]>(dataPath(SCORES_FILENAME, req), [])
  const top = entries
    .filter((e) => e.gameId === req.params.gameId)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
  res.json({ top })
})

export default router
