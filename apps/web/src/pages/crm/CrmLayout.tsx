import { Users, Star, Wallet, Gift, Megaphone, Tag, Target } from 'lucide-react'
import ModuleLayout from '@/components/layout/ModuleLayout'

const items = [
  { label: 'Clients', path: '/crm/clients', icon: Users },
  { label: 'Fidélité', path: '/crm/fidelite', icon: Star },
  { label: 'Portefeuille', path: '/crm/portefeuille', icon: Wallet },
  { label: 'Cartes Cadeaux', path: '/crm/cartes-cadeaux', icon: Gift },
  // ── Marketing ──
  { label: 'Campagnes', path: '/crm/campagnes', icon: Megaphone },
  { label: 'Codes Promo', path: '/crm/codes', icon: Tag },
  { label: 'Audiences', path: '/crm/audiences', icon: Target },
]

export default function CrmLayout() {
  return <ModuleLayout title="CRM & Marketing" color="#BE185D" items={items} />
}
