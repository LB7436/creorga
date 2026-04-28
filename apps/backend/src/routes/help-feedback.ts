import { Router } from 'express'
import fs from 'fs'
import path from 'path'

/**
 * Help Center feedback — articles, conversations, command results.
 *
 * POST /api/help/feedback { articleId, vote: 'up'|'down', comment?, path? }
 * GET  /api/help/feedback                  → admin view, all entries newest first
 * GET  /api/help/feedback/stats             → per-articleId rollup (up/down/score)
 */

const router = Router()
const DATA_DIR = path.resolve(process.cwd(), 'data')
const FILE = path.join(DATA_DIR, 'help-feedback.json')

interface FeedbackEntry {
  id: string
  ts: number
  iso: string
  articleId: string
  vote: 'up' | 'down'
  comment?: string
  path?: string
}

function load(): FeedbackEntry[] {
  if (!fs.existsSync(FILE)) return []
  try { return JSON.parse(fs.readFileSync(FILE, 'utf8')) } catch { return [] }
}
function save(items: FeedbackEntry[]) {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })
  fs.writeFileSync(FILE, JSON.stringify(items, null, 2), 'utf8')
}

router.post('/', (req, res) => {
  const { articleId, vote, comment, path: routePath } = req.body || {}
  if (!articleId || (vote !== 'up' && vote !== 'down')) {
    return res.status(400).json({ error: 'articleId + vote (up|down) requis' })
  }
  const entry: FeedbackEntry = {
    id: Math.random().toString(36).slice(2, 12),
    ts: Date.now(),
    iso: new Date().toISOString(),
    articleId, vote,
    comment: comment ? String(comment).slice(0, 500) : undefined,
    path: routePath,
  }
  const items = load()
  items.unshift(entry)
  if (items.length > 5000) items.length = 5000
  save(items)
  res.json({ ok: true, entry })
})

router.get('/', (_req, res) => {
  res.json({ items: load().slice(0, 200) })
})

router.get('/stats', (_req, res) => {
  const items = load()
  const stats: Record<string, { up: number; down: number; score: number; recent: string[] }> = {}
  for (const it of items) {
    if (!stats[it.articleId]) stats[it.articleId] = { up: 0, down: 0, score: 0, recent: [] }
    if (it.vote === 'up') stats[it.articleId].up++
    else stats[it.articleId].down++
    if (it.comment && stats[it.articleId].recent.length < 3) stats[it.articleId].recent.push(it.comment)
  }
  for (const k of Object.keys(stats)) {
    const s = stats[k]
    s.score = s.up + s.down > 0 ? Math.round((s.up / (s.up + s.down)) * 100) : 0
  }
  res.json({ stats })
})

export default router
