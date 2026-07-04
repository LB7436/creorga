import { useEffect, useState } from 'react'

/**
 * v4.9 — Record perso (localStorage) + soumission backend silencieuse.
 */

const BACKEND = (import.meta as any).env?.VITE_BACKEND_URL || 'http://localhost:3002'

function bestKey(gameId: string) {
  return `creorga.game.best.${gameId}`
}

export function useGameScore(gameId: string) {
  const [best, setBest] = useState(0)

  useEffect(() => {
    try {
      const raw = localStorage.getItem(bestKey(gameId))
      setBest(raw ? Number(raw) : 0)
    } catch { /* */ }
  }, [gameId])

  const submit = (score: number, opts?: { playerName?: string; tableId?: string }): boolean => {
    let isNewRecord = false
    try {
      const current = Number(localStorage.getItem(bestKey(gameId)) || 0)
      if (score > current) {
        localStorage.setItem(bestKey(gameId), String(score))
        setBest(score)
        isNewRecord = true
      }
    } catch { /* */ }

    fetch(`${BACKEND}/api/game-scores`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ gameId, score, playerName: opts?.playerName, tableId: opts?.tableId }),
    }).catch(() => { /* offline : silencieux, pas de queue nécessaire pour un score */ })

    return isNewRecord
  }

  return { best, submit }
}
