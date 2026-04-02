import { useQuery } from '@tanstack/react-query'
import { UserPlus } from 'lucide-react'
import { Card, Badge, Avatar, Button, Spinner } from '@/components/ui'
import { useAuthStore } from '@/stores/authStore'
import api from '@/lib/api'

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

export default function AdminUsers() {
  const companyId = useAuthStore((s) => s.companyId)
  const headers = { 'x-company-id': companyId! }

  const { data: members = [], isLoading } = useQuery({
    queryKey: ['company-members', companyId],
    queryFn: async () => {
      const res = await api.get('/companies/members', { headers })
      return res.data
    },
    enabled: !!companyId,
  })

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-bold text-gray-900 mb-1">Utilisateurs</h2>
          <p className="text-sm text-gray-400">Gérez les accès et rôles de votre équipe</p>
        </div>
        <Button size="sm" leftIcon={<UserPlus size={16} />} disabled>
          Inviter
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <Spinner size="lg" className="text-primary" />
        </div>
      ) : members.length === 0 ? (
        <div className="text-center py-12 text-gray-400 text-sm">
          Aucun utilisateur trouvé
        </div>
      ) : (
        <div className="space-y-2">
          {members.map((uc: any) => (
            <Card key={uc.id} padding="sm" className="flex items-center gap-4">
              <Avatar name={`${uc.user.firstName} ${uc.user.lastName}`} size="md" />
              <div className="flex-1">
                <p className="font-medium text-gray-900 text-sm">
                  {uc.user.firstName} {uc.user.lastName}
                </p>
                <p className="text-xs text-gray-400">{uc.user.email}</p>
              </div>
              <Badge variant={roleVariants[uc.role]}>
                {roleLabels[uc.role]}
              </Badge>
            </Card>
          ))}
        </div>
      )}

      <div className="mt-6 p-4 bg-blue-50 rounded-2xl">
        <p className="text-xs text-blue-600">
          La gestion complète des utilisateurs (invitation, modification de rôle, suppression) sera disponible prochainement.
        </p>
      </div>
    </div>
  )
}
