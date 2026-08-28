import { Gift, Megaphone, Star, Tag, Users, Wallet } from 'lucide-react'
import ModuleLayout from '@/components/layout/ModuleLayout'

const items = [
  { label: 'Clients', path: '/crm/clients', icon: Users },
  { label: 'Fidélité & portefeuille', path: '/crm/fidelite', icon: Wallet },
  { label: 'Cartes cadeaux', path: '/crm/cartes-cadeaux', icon: Gift },
  { label: 'Campagnes', path: '/crm/campagnes', icon: Megaphone },
  { label: 'Codes promo', path: '/crm/codes', icon: Tag },
  { label: 'Avis', path: '/crm/avis', icon: Star },
]

export default function CrmLayout() {
  return <ModuleLayout title="Fichier clients" color="#BE185D" items={items} />
}
