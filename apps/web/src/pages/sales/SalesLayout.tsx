import { Truck, ShoppingBag, Utensils } from 'lucide-react'
import ModuleLayout from '@/components/layout/ModuleLayout'

// v4.1 — Nouveau Layout regroupant les 3 canaux de ventes externes :
// /sales/delivery (Uber Eats, Wedely, livreurs internes)
// /sales/clickcollect (commandes à emporter)
// /sales/catering (traiteur événements)
const items = [
  { label: 'Livraison', path: '/sales/delivery', icon: Truck },
  { label: 'Click & Collect', path: '/sales/clickcollect', icon: ShoppingBag },
  { label: 'Traiteur', path: '/sales/catering', icon: Utensils },
]

export default function SalesLayout() {
  return <ModuleLayout title="Ventes externes" color="#ea580c" items={items} />
}
