import { useEffect, useState } from 'react'

/**
 * v4.9 — Record perso (localStorage) + soumission backend silencieuse.
 * v6.0 — nom du joueur et table auto-remplis depuis le profil guest et l'URL :
 *        tout jeu sur ce hook envoie un score identifié, sans plomberie par-jeu
 *        (fini le leaderboard « Anonyme sans table »).
 */

const BACKEND = (import.meta as any).env?.VITE_BACKEND_URL || 'http://localhost:3002'
const PROFILE_KEY = 'creorga-guest-client-profile-v1'

function portalCompanyId(): string | null {
  try { return new URLSearchParams(window.location.search).get('companyId') } catch { return null }
}

function bestKey(companyId: string | null, gameId: string) {
  return `creorga.game.best.${companyId || 'sans-etablissement'}.${gameId}`
}

/** Identité du joueur pour le leaderboard, lue aux mêmes sources que le GameShell. */
function autoIdentity(): { playerName?: string; tableId?: string; companyId?: string } {
  const identity: { playerName?: string; tableId?: string; companyId?: string } = {}
  const companyId = portalCompanyId()
  if (companyId) identity.companyId = companyId
  try {
    const raw = localStorage.getItem(PROFILE_KEY)
    if (raw) {
      const profile = JSON.parse(raw) as { displayName?: string; companyId?: string }
      if (profile?.displayName && profile.companyId === companyId) identity.playerName = profile.displayName
    }
  } catch { /* */ }
  try {
    const table = new URLSearchParams(window.location.search).get('table')
    if (table) identity.tableId = table
  } catch { /* */ }
  return identity
}

export function useGameScore(gameId: string, options?: { legacyKey?: string }) {
  const [best, setBest] = useState(0)
  const legacyKey = options?.legacyKey
  const companyId = portalCompanyId()

  useEffect(() => {
    try {
      let current = Number(localStorage.getItem(bestKey(companyId, gameId)) || 0)
      if (legacyKey) {
        const legacy = Number(localStorage.getItem(legacyKey) || 0)
        if (Number.isFinite(legacy) && legacy > current) {
          localStorage.setItem(bestKey(companyId, gameId), String(legacy))
          current = legacy
        }
      }
      setBest(Number.isFinite(current) ? current : 0)
    } catch { /* */ }
  }, [companyId, gameId, legacyKey])

  const submit = (score: number, opts?: { playerName?: string; tableId?: string }): boolean => {
    let isNewRecord = false
    try {
      const current = Number(localStorage.getItem(bestKey(companyId, gameId)) || 0)
      if (score > current) {
        localStorage.setItem(bestKey(companyId, gameId), String(score))
        setBest(score)
        isNewRecord = true
      }
    } catch { /* */ }

    const identity = autoIdentity()
    if (!identity.companyId) return isNewRecord
    fetch(`${BACKEND}/api/game-scores`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        gameId,
        companyId: identity.companyId,
        score,
        playerName: opts?.playerName ?? identity.playerName,
        tableId: opts?.tableId ?? identity.tableId,
      }),
    }).catch(() => { /* offline : silencieux, pas de queue nécessaire pour un score */ })

    return isNewRecord
  }

  return { best, submit }
}
