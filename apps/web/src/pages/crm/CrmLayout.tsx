import { Users, Star, Wallet, Gift } from 'lucide-react'
import ModuleLayout from '@/components/layout/ModuleLayout'

const items = [
  { label: 'Clients', path: '/crm/clients', icon: Users },
  { label: 'Fidélité', path: '/crm/fidelite', icon: Star },
  { label: 'Portefeuille', path: '/crm/portefeuille', icon: Wallet },
  { label: 'Cartes Cadeaux', path: '/crm/cartes-cadeaux', icon: Gift },
]

export default function CrmLayout() {
  return <ModuleLayout title="CRM" color="#7C3AED" items={items} />
}
