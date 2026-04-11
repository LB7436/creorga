import { Package, BookOpen, Truck, ShoppingCart } from 'lucide-react'
import ModuleLayout from '@/components/layout/ModuleLayout'

const items = [
  { label: 'Stock', path: '/inventory/stock', icon: Package },
  { label: 'Recettes', path: '/inventory/recettes', icon: BookOpen },
  { label: 'Fournisseurs', path: '/inventory/fournisseurs', icon: Truck },
  { label: 'Commandes', path: '/inventory/commandes', icon: ShoppingCart },
]

export default function InventoryLayout() {
  return <ModuleLayout title="Inventaire" color="#92400E" items={items} />
}
