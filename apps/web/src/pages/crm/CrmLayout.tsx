import { Users, Star, Wallet, Gift, Megaphone, Tag, Target, MessageSquare, Reply, BarChart3 } from 'lucide-react'
import ModuleLayout from '@/components/layout/ModuleLayout'

// v4.1 — CRM absorbe l'ex-module Réputation (avis Google, réponses, stats)
const items = [
  { label: 'Clients', path: '/crm/clients', icon: Users },
  { label: 'Fidélité', path: '/crm/fidelite', icon: Star },
  { label: 'Portefeuille', path: '/crm/portefeuille', icon: Wallet },
  { label: 'Cartes Cadeaux', path: '/crm/cartes-cadeaux', icon: Gift },
  // ── Marketing ──
  { label: 'Campagnes', path: '/crm/campagnes', icon: Megaphone },
  { label: 'Codes Promo', path: '/crm/codes', icon: Tag },
  { label: 'Audiences', path: '/crm/audiences', icon: Target },
  // ── Réputation (v4.1 folded depuis module standalone) ──
  { label: 'Avis', path: '/crm/avis', icon: MessageSquare },
  { label: 'Réponses', path: '/crm/reponses', icon: Reply },
  { label: 'Stats Réputation', path: '/crm/reput-stats', icon: BarChart3 },
]

export default function CrmLayout() {
  return <ModuleLayout title="CRM, Marketing & Réputation" color="#BE185D" items={items} />
}
