import { LayoutDashboard, Map, ClipboardList, ChefHat, CreditCard, Settings2 } from 'lucide-react'
import ModuleLayout from '@/components/layout/ModuleLayout'

const items = [
  { label: 'Tableau de bord', path: '/pos/dashboard', icon: LayoutDashboard },
  { label: 'Plan de salle', path: '/pos/floor', icon: Map },
  { label: 'Commandes', path: '/pos/orders', icon: ClipboardList },
  { label: 'Cuisine KDS', path: '/pos/kitchen', icon: ChefHat },
  { label: 'Caisse', path: '/pos/checkout', icon: CreditCard },
  { label: 'Configuration', path: '/pos/config', icon: Settings2 },
]

export default function PosLayout() {
  return <ModuleLayout title="Caisse POS" color="#1E3A5F" items={items} />
}
