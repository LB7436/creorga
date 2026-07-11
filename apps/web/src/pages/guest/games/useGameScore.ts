import { useEffect, useState } from 'react'

/**
 * v4.9 — Record perso (localStorage) + soumission backend silencieuse.
 * v6.0 — nom du joueur et table auto-remplis depuis le profil guest et l'URL :
 *        tout jeu sur ce hook envoie un score identifié, sans plomberie par-jeu
 *        (fini le leaderboard « Anonyme sans table »).
 */

const BACKEND = (import.meta as any).env?.VITE_BACKEND_URL || 'http://localhost:3002'
const PROFILE_KEY = 'creorga-guest-client-profile-v1'

function bestKey(gameId: string) {
  return `creorga.game.best.${gameId}`
}

/** Identité du joueur pour le leaderboard, lue aux mêmes sources que le GameShell. */
function autoIdentity(): { playerName?: string; tableId?: string } {
  const identity: { playerName?: string; tableId?: string } = {}
  try {
    const raw = localStorage.getItem(PROFILE_KEY)
    if (raw) {
      const profile = JSON.parse(raw) as { displayName?: string }
      if (profile?.displayName) identity.playerName = profile.displayName
    }
  } catch { /* */ }
  try {
    const table = new URLSearchParams(window.location.search).get('table')
    if (table) identity.tableId = table
  } catch { /* */ }
  return identity
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

    const identity = autoIdentity()
    fetch(`${BACKEND}/api/game-scores`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        gameId,
        score,
        playerName: opts?.playerName ?? identity.playerName,
        tableId: opts?.tableId ?? identity.tableId,
      }),
    }).catch(() => { /* offline : silencieux, pas de queue nécessaire pour un score */ })

    return isNewRecord
  }

  return { best, submit }
}
