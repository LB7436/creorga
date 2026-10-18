import { useEffect } from 'react'
import api from '@/lib/api'
import { authSessionKey } from '@/lib/authScope'
import { useAuthStore } from '@/stores/authStore'
import type { BusinessAccess } from '@/types'

// Une seule sonde pour l'application ; indépendante des formulaires en cours.
export default function BusinessAccessWatcher() {
  const companyId = useAuthStore(state => state.companyId)
  const userId = useAuthStore(state => state.user?.id)
  const session = useAuthStore(authSessionKey)
  const generation = useAuthStore(state => state.businessAccessGeneration)
  useEffect(() => {
    if (!companyId || !userId || !useAuthStore.getState().isAuthenticated) return
    let retired = false, running = false
    const probe = async () => {
      if (running || retired) return
      running = true
      try {
        const response = await api.get<BusinessAccess>('/companies/access')
        if (!retired && session === authSessionKey(useAuthStore.getState())) useAuthStore.getState().setBusinessAccess(response.data, companyId, userId)
      } catch (error: any) {
        // L'absence de réponse n'autorise jamais une ancienne vue financière.
        if (!retired && error?.code !== 'ERR_CANCELED') useAuthStore.getState().setBusinessAccess(null, companyId, userId)
      } finally { running = false }
    }
    void probe()
    const timer = setInterval(() => void probe(), 5000)
    const focus = () => { void probe() }
    window.addEventListener('focus', focus)
    return () => { retired = true; clearInterval(timer); window.removeEventListener('focus', focus) }
  }, [companyId, userId, session, generation])
  return null
}
