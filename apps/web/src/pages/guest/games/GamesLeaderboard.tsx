import { useEffect, useState } from 'react'
import { Trophy } from 'lucide-react'
import { ACCENT, MUTED, TEXT, BORDER } from './theme'

/**
 * v4.9 — Leaderboard "Records de la salle", tous jeux confondus.
 * Refetch périodique (30s) — pas de socket dédié côté guest pour rester simple.
 */

const BACKEND = (import.meta as any).env?.VITE_BACKEND_URL || 'http://localhost:3002'

interface ScoreEntry {
  id: string
  gameId: string
  playerName: string
  score: number
  ts: number
}

export default function GamesLeaderboard() {
  const [top, setTop] = useState<ScoreEntry[]>([])
  const companyId = (() => {
    try { return new URLSearchParams(window.location.search).get('companyId') } catch { return null }
  })()

  useEffect(() => {
    if (!companyId) { setTop([]); return }
    let alive = true
    const load = () => {
      fetch(`${BACKEND}/api/game-scores/all/top?limit=5&companyId=${encodeURIComponent(companyId)}`)
        .then((r) => r.json())
        .then((data) => { if (alive) setTop(data.top || []) })
        .catch(() => { /* offline — garde le dernier état */ })
    }
    load()
    const id = window.setInterval(load, 30_000)
    return () => { alive = false; window.clearInterval(id) }
  }, [companyId])

  if (top.length === 0) return null

  return (
    <div style={{
      border: `1px solid ${BORDER}`, borderRadius: 14, padding: 12, marginBottom: 14,
      background: 'rgba(255,255,255,0.03)',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8, color: TEXT, fontWeight: 800, fontSize: 12 }}>
        <Trophy size={14} color="#f59e0b" /> Records de la salle
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        {top.map((s, i) => (
          <div key={s.id} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: MUTED }}>
            <span>#{i + 1} {s.playerName} — {s.gameId}</span>
            <strong style={{ color: ACCENT }}>{s.score}</strong>
          </div>
        ))}
      </div>
    </div>
  )
}
