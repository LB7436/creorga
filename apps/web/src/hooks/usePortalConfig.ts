import { useEffect, useState, useCallback } from 'react'

/**
 * Shared portal config — talks to /api/portal-config so the admin (5174)
 * and the guest portal (5178) stay in sync.
 */
export interface PortalConfig {
  toggles: Record<string, boolean>
  games: Record<string, boolean>
  welcomeMessage: string
  accentColor: string
  tableNumber: string
  logoDataUrl?: string | null
  restaurantName?: string
  updatedAt: number
}

const BACKEND = (import.meta as any).env?.VITE_BACKEND_URL || 'http://localhost:3002'

export function usePortalConfig(pollMs = 2000) {
  const [config, setConfig] = useState<PortalConfig | null>(null)
  const [error, setError] = useState<string | null>(null)

  const fetchConfig = useCallback(async () => {
    try {
      const r = await fetch(`${BACKEND}/api/portal-config`)
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      const data = await r.json()
      setConfig(data)
      setError(null)
    } catch (e: any) {
      setError(e.message)
    }
  }, [])

  const update = useCallback(async (patch: Partial<PortalConfig>) => {
    try {
      const r = await fetch(`${BACKEND}/api/portal-config`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      })
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      const data = await r.json()
      setConfig(data)
      return data
    } catch (e: any) {
      setError(e.message)
      return null
    }
  }, [])

  useEffect(() => {
    fetchConfig()
    if (pollMs > 0) {
      const id = setInterval(fetchConfig, pollMs)
      return () => clearInterval(id)
    }
  }, [fetchConfig, pollMs])

  return { config, error, update, refresh: fetchConfig }
}
