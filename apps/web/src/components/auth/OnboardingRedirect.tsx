import { useEffect } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { onboardingKey } from '@/lib/onboarding'
import { authDataScope } from '@/lib/authScope'

/** A first-run hint is not permission to configure an establishment. */
export default function OnboardingRedirect() {
  const location = useLocation()
  const navigate = useNavigate()
  const scope = useAuthStore(authDataScope)
  useEffect(() => {
    const current = useAuthStore.getState()
    if (scope !== authDataScope(current) || !current.isAuthenticated || !current.user?.id || !current.companyId) return
    if (!current.businessAccess?.capabilities.includes('settings.manage')) return
    if (location.pathname !== '/' && location.pathname !== '/modules') return
    // Read only the active company's marker. Never manufacture a completion
    // key, migrate an ambiguous global key, or change another company's setup.
    if (typeof window === 'undefined') return
    let completed: string | null
    try { completed = window.localStorage.getItem(onboardingKey(current.companyId)) } catch { return }
    if (!completed) navigate('/setup', { replace: true })
  }, [scope, location.pathname, navigate])
  return null
}
