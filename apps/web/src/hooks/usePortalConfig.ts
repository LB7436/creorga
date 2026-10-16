import { useEffect, useState, useCallback, useRef } from 'react'
import { useAuthStore } from '@/stores/authStore'
import { authDataScope } from '@/lib/authScope'
import { PortalConfigClient, PortalConfigError, type PortalConfig } from './portalConfigClient'
export { PortalConfigError } from './portalConfigClient'
export type { PortalConfig } from './portalConfigClient'
const BACKEND = (import.meta as any).env?.VITE_BACKEND_URL || 'http://localhost:3002'

/** Le portail reste public ; seules les écritures utilisent la session propriétaire. */
export function usePortalConfig(pollMs = 2000, explicitCompanyId?: string | null) {
  const identity = useAuthStore(authDataScope)
  const companyId = explicitCompanyId || useAuthStore.getState().companyId
    || (typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('companyId') : null)
  const key = JSON.stringify([identity, companyId])
  const current = useRef({ key, companyId })
  current.current = { key, companyId }
  const [config, setConfig] = useState<{ key: string; data: PortalConfig } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const clientRef = useRef<PortalConfigClient | null>(null)
  useEffect(() => {
    setConfig(null); setError(null)
    const client = new PortalConfigClient({
      scope: () => {
        const auth = useAuthStore.getState(), headers: Record<string, string> = {}
        if (auth.companyId && auth.companyId === current.current.companyId && auth.accessToken) {
          headers.Authorization = `Bearer ${auth.accessToken}`; headers['x-company-id'] = auth.companyId
        }
        return { key: JSON.stringify([authDataScope(auth), current.current.companyId]), companyId: current.current.companyId, headers }
      },
      publish: data => setConfig({ key, data }), fail: setError, backend: BACKEND,
    })
    clientRef.current = client
    void client.refresh()
    const timer = pollMs > 0 ? setInterval(() => { if (typeof document === 'undefined' || !document.hidden) void client.refresh() }, pollMs) : null
    return () => { client.dispose(); if (timer) clearInterval(timer); if (clientRef.current === client) clientRef.current = null }
  }, [key, pollMs])
  const update = useCallback((patch: Partial<PortalConfig>) => clientRef.current?.update(patch)
    || Promise.reject(new PortalConfigError(0, 'Configuration non chargée.')), [])
  const refresh = useCallback(() => clientRef.current?.refresh(), [])
  return { config: config?.key === key ? config.data : null, error, update, refresh }
}
