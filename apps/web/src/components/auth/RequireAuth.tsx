import { Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { useDemoMode } from '@/lib/demoMode'
import { mayOpenBusinessPage } from '@/lib/businessPageAccess'

interface RequireAuthProps {
  children: React.ReactNode
}

export default function RequireAuth({ children }: RequireAuthProps) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const demoActive = useDemoMode((s) => s.active)
  const location = useLocation()
  const businessAccess = useAuthStore((s) => s.businessAccess)

  // En mode démo, autoriser l'accès avec auth mockée
  if (demoActive) {
    localStorage.setItem('creorga-demo-mode', 'true')
    return <>{children}</>
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  if (!mayOpenBusinessPage(location.pathname, businessAccess)) {
    return <main style={{ padding: 28 }}><h1>Accès non autorisé</h1><p role="alert">Votre autorisation ne permet pas de consulter cet écran.</p><a href="/modules">Retour aux modules</a></main>
  }

  return <>{children}</>
}
