import { Activity, CreditCard, Zap } from 'lucide-react'
import ModuleLayout from '@/components/layout/ModuleLayout'

const items = [
  { label: 'Abonnement', path: '/owner/abonnement', icon: CreditCard },
  { label: 'Activité', path: '/owner/activite', icon: Activity },
  { label: 'Macros', path: '/owner/macros', icon: Zap },
]

export default function OwnerLayout() {
  return <ModuleLayout title="Espace propriétaire" color="#166534" items={items} />
}
