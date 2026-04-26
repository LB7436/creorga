import { useEffect, useState, useCallback } from 'react'

/**
 * Pulls the live portal config from the Creorga backend.
 * The admin at :5174/clients writes to the same endpoint — so toggling a
 * feature there reflects here within `pollMs` milliseconds.
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

export function usePortalConfig(pollMs = 3000) {
  const [config, setConfig] = useState<PortalConfig | null>(null)
  const [lastSync, setLastSync] = useState<number>(0)

  const fetchConfig = useCallback(async () => {
    try {
      const r = await fetch(`${BACKEND}/api/portal-config`)
      if (!r.ok) return
      const data = await r.json() as PortalConfig
      setConfig(data)
      setLastSync(Date.now())
    } catch { /* offline ok */ }
  }, [])

  useEffect(() => {
    fetchConfig()
    const id = setInterval(fetchConfig, pollMs)
    return () => clearInterval(id)
  }, [fetchConfig, pollMs])

  return { config, lastSync, refresh: fetchConfig }
}
