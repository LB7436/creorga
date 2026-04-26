import { useEffect, useState, useCallback, useRef } from 'react'

export type ModuleDisplayMode = 'visible' | 'hidden' | 'coming_soon'

export interface ModuleConfig {
  displayMode: ModuleDisplayMode
  customLabel?: string
  pinnedToDashboard?: boolean
  enabled?: boolean
}

const BACKEND = (import.meta as any).env?.VITE_BACKEND_URL || 'http://localhost:3002'
const BASE = `${BACKEND}/api/module-config`

/**
 * Module config shared between web :5174 and super-admin :5177.
 * Polls the backend every `pollMs` ms.
 * `patchModule` pushes to the backend, which the other app picks up.
 */
export function useSharedModuleConfig(pollMs = 1500) {
  const [config, setConfig] = useState<Record<string, ModuleConfig>>({})
  const lastUpdate = useRef(0)

  const fetchConfig = useCallback(async () => {
    try {
      const r = await fetch(BASE)
      if (!r.ok) return
      const data = await r.json() as { config: Record<string, ModuleConfig>; updatedAt: number }
      if (data.updatedAt >= lastUpdate.current) {
        setConfig(data.config || {})
        lastUpdate.current = data.updatedAt
      }
    } catch { /* offline ok */ }
  }, [])

  useEffect(() => {
    fetchConfig()
    if (pollMs > 0) {
      const id = setInterval(fetchConfig, pollMs)
      return () => clearInterval(id)
    }
  }, [fetchConfig, pollMs])

  const patchModule = useCallback(async (moduleId: string, patch: Partial<ModuleConfig>) => {
    try {
      const r = await fetch(`${BASE}/${moduleId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(patch),
      })
      if (r.ok) {
        const data = await r.json() as { config: Record<string, ModuleConfig>; updatedAt: number }
        setConfig(data.config || {})
        lastUpdate.current = data.updatedAt
      }
    } catch { /* ignore */ }
  }, [])

  return { config, patchModule, refresh: fetchConfig }
}
