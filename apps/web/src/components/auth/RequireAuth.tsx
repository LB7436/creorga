import { Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { useDemoMode } from '@/lib/demoMode'

interface RequireAuthProps {
  children: React.ReactNode
}

export default function RequireAuth({ children }: RequireAuthProps) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const demoActive = useDemoMode((s) => s.active)
  const location = useLocation()

  // En mode démo, autoriser l'accès avec auth mockée
  if (demoActive) {
    localStorage.setItem('creorga-demo-mode', 'true')
    return <>{children}</>
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return <>{children}</>
}
