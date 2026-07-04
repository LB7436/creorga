import { Router } from 'express'
import { safeReadJson, safeWriteJson } from '../lib/safe-json'
import { dataPath } from '../middleware/audit-log'

/**
 * v4.9 — Scores des jeux guest, persistés + broadcast live pour le leaderboard salle.
 * v5.1 — chemin résolu via dataPath(req) pour préparer le multi-tenant.
 */

const SCORES_FILENAME = 'game-scores.json'
const MAX_ENTRIES = 500

interface ScoreEntry {
  id: string
  ts: number
  gameId: string
  playerName: string
  tableId?: string
  score: number
}

const router = Router()

router.post('/', (req, res) => {
  const { gameId, playerName, tableId, score } = req.body as Partial<ScoreEntry>
  if (!gameId || typeof score !== 'number') {
    return res.status(400).json({ error: 'gameId et score requis' })
  }

  const entry: ScoreEntry = {
    id: 'score-' + Math.random().toString(36).slice(2, 10),
    ts: Date.now(),
    gameId,
    playerName: playerName || 'Anonyme',
    tableId,
    score,
  }

  const scoresFile = dataPath(SCORES_FILENAME, req)
  const entries = safeReadJson<ScoreEntry[]>(scoresFile, [])
  const next = [entry, ...entries].slice(0, MAX_ENTRIES)
  safeWriteJson(scoresFile, next)

  try {
    const broadcast = (globalThis as any).liveBroadcast
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
