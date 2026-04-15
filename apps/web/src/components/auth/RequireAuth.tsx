import { Navigate, useLocation } from 'react-router-dom'
import { useAuthStore } from '@/stores/authStore'
import { useEffect } from 'react'

// Dev bypass: inject fake auth when backend is unavailable
const DEV_BYPASS = import.meta.env.DEV

interface RequireAuthProps {
  children: React.ReactNode
}

export default function RequireAuth({ children }: RequireAuthProps) {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const setAuth = useAuthStore((s) => s.setAuth)
  const location = useLocation()

  useEffect(() => {
    if (DEV_BYPASS && !isAuthenticated) {
      setAuth({
        accessToken: 'dev-bypass-token',
        user: {
          id: 'dev-user-1',
          email: 'admin@creorga.local',
          firstName: 'Admin',
          lastName: 'Dev',
          avatar: null,
        },
        companies: [{
          id: 'uc-1',
          userId: 'dev-user-1',
          companyId: 'comp-1',
          role: 'OWNER',
          isActive: true,
          company: {
            id: 'comp-1',
            name: 'Café um Rond-Point',
            legalName: 'Café um Rond-Point SARL',
            vatNumber: 'LU12345678',
            currency: 'EUR',
          },
        }],
      })
    }
  }, [DEV_BYPASS, isAuthenticated, setAuth])

  if (!isAuthenticated && !DEV_BYPASS) {
    return <Navigate to="/login" state={{ from: location }} replace />
  }

  return <>{children}</>
}
