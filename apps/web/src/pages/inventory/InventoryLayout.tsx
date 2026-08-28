import { Package, ShoppingCart, Truck } from 'lucide-react'
import ModuleLayout from '@/components/layout/ModuleLayout'

const items = [
  { label: 'Stock', path: '/inventory/stock', icon: Package },
  { label: 'Fournisseurs', path: '/inventory/fournisseurs', icon: Truck },
  { label: 'Commandes', path: '/inventory/commandes', icon: ShoppingCart },
]

export default function InventoryLayout() {
  return <ModuleLayout title="Inventaire" color="#92400E" items={items} />
}
