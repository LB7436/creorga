import { useEffect, useState, useCallback } from 'react'
import { useAuthStore } from '@/stores/authStore'

/**
 * Config partagée du portail client — parle à /api/portal-config pour que le
 * back-office (5174) et le portail (5178, ou /c) restent synchronisés.
 *
 * v5.0 — `update()` :
 *  - envoie le jeton de session et la société (le PATCH est réservé au
 *    propriétaire côté serveur ; sans en-tête, chaque enregistrement finissait
 *    en 401… avalé, et l'interrupteur restait allumé à l'écran) ;
 *  - **rejette** en cas de refus ou de panne au lieu de renvoyer `null` : c'est
 *    à l'appelant d'annuler son affichage optimiste, jamais de le garder.
 */
export interface PortalConfig {
  companyId: string
  toggles: Record<string, boolean>
  games: Record<string, boolean>
  welcomeMessage: string
  accentColor: string
  tableNumber: string
  themeMode?: 'dark' | 'light'
  logoDataUrl?: string | null
  restaurantName?: string
  updatedAt: number
}

const BACKEND = (import.meta as any).env?.VITE_BACKEND_URL || 'http://localhost:3002'

/** En-têtes d'authentification si une session back-office existe (sans effet côté portail public). */
function enTetesSession(): Record<string, string> {
  const { accessToken, companyId } = useAuthStore.getState()
  const headers: Record<string, string> = {}
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`
  if (companyId) headers['x-company-id'] = companyId
  return headers
}

export class PortalConfigError extends Error {
  status: number
  constructor(status: number, message: string) {
    super(message)
    this.status = status
  }
}

export function usePortalConfig(pollMs = 2000, explicitCompanyId?: string | null) {
  const [config, setConfig] = useState<PortalConfig | null>(null)
  const [error, setError] = useState<string | null>(null)

  const fetchConfig = useCallback(async () => {
    try {
      const companyId = explicitCompanyId
        || useAuthStore.getState().companyId
        || (typeof window !== 'undefined' ? new URLSearchParams(window.location.search).get('companyId') : null)
      if (!companyId) throw new Error('QR sans identifiant d’entreprise')
      const url = new URL(`${BACKEND}/api/portal-config`)
      url.searchParams.set('companyId', companyId)
      const r = await fetch(url, { headers: enTetesSession() })
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      const data = await r.json()
      setConfig(data)
      setError(null)
    } catch (e: any) {
      setError(e.message)
    }
  }, [explicitCompanyId])

  const update = useCallback(async (patch: Partial<PortalConfig>): Promise<PortalConfig> => {
    const companyId = explicitCompanyId || useAuthStore.getState().companyId
    if (!companyId) {
      const missingCompany = new PortalConfigError(0, 'Aucune entreprise active.')
      setError(missingCompany.message)
      throw missingCompany
    }

    let r: Response
    try {
      const url = new URL(`${BACKEND}/api/portal-config`)
      url.searchParams.set('companyId', companyId)
      r = await fetch(url, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json', ...enTetesSession() },
        body: JSON.stringify(patch),
      })
    } catch (e: any) {
      setError(e?.message || 'Serveur injoignable')
      throw new PortalConfigError(0, 'Serveur injoignable : le réglage n’a pas été enregistré.')
    }
    if (!r.ok) {
      const corps = await r.json().catch(() => ({}))
      const message = r.status === 401 || r.status === 403
        ? 'Enregistrement refusé : réservé au propriétaire de l’établissement.'
        : corps?.error || corps?.message || `Enregistrement refusé (HTTP ${r.status})`
      setError(message)
      throw new PortalConfigError(r.status, message)
    }
    const data = (await r.json()) as PortalConfig
    setConfig(data)
    setError(null)
    return data
  }, [explicitCompanyId])

  useEffect(() => {
    fetchConfig()
    if (pollMs > 0) {
      const id = setInterval(fetchConfig, pollMs)
      return () => clearInterval(id)
    }
  }, [fetchConfig, pollMs])

  return { config, error, update, refresh: fetchConfig }
}
