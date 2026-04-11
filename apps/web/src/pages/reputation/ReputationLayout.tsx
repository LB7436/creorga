import { MessageSquare, Reply, TrendingUp } from 'lucide-react'
import ModuleLayout from '@/components/layout/ModuleLayout'

const items = [
  { label: 'Avis', path: '/reputation/avis', icon: MessageSquare },
  { label: 'Réponses', path: '/reputation/reponses', icon: Reply },
  { label: 'Statistiques', path: '/reputation/statistiques', icon: TrendingUp },
]

export default function ReputationLayout() {
  return <ModuleLayout title="Réputation" color="#0369A1" items={items} />
}
