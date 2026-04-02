import SettingsLayout from './SettingsLayout'
import { Card, Badge, Avatar } from '@/components/ui'
import { useAuthStore } from '@/stores/authStore'

const roleLabels: Record<string, string> = {
  OWNER: 'Propriétaire',
  MANAGER: 'Manager',
  EMPLOYEE: 'Employé',
  WAITER: 'Serveur',
}

const roleVariants: Record<string, 'success' | 'info' | 'warning' | 'neutral'> = {
  OWNER: 'success',
  MANAGER: 'info',
  EMPLOYEE: 'neutral',
  WAITER: 'warning',
}

export default function SettingsUsers() {
  const user = useAuthStore((s) => s.user)
  const companies = useAuthStore((s) => s.companies)
  const currentRole = companies[0]?.role ?? 'EMPLOYEE'

  return (
    <SettingsLayout>
      <div className="max-w-2xl">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Utilisateurs</h3>

        <Card padding="sm" className="flex items-center gap-4">
          <Avatar name={user ? `${user.firstName} ${user.lastName}` : 'U'} size="md" />
          <div className="flex-1">
            <p className="font-medium text-gray-900">
              {user?.firstName} {user?.lastName}
            </p>
            <p className="text-sm text-gray-500">{user?.email}</p>
          </div>
          <Badge variant={roleVariants[currentRole]}>
            {roleLabels[currentRole]}
          </Badge>
        </Card>

        <div className="mt-8 p-6 bg-surface-2 rounded-2xl text-center">
          <p className="text-gray-400 text-sm">
            La gestion multi-utilisateurs sera disponible prochainement.
          </p>
        </div>
      </div>
    </SettingsLayout>
  )
}
