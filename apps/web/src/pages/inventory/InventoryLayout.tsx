import { Package, ShoppingCart, Truck } from 'lucide-react'
import ModuleLayout from '@/components/layout/ModuleLayout'
import { useAuthStore } from '@/stores/authStore'

const items = [
  { label: 'Stock', path: '/inventory/stock', icon: Package },
  { label: 'Fournisseurs', path: '/inventory/fournisseurs', icon: Truck },
  { label: 'Commandes', path: '/inventory/commandes', icon: ShoppingCart },
]

export default function InventoryLayout() {
  const access = useAuthStore(state => state.businessAccess)
  const visibleItems = items.filter(item => access?.capabilities.includes(item.path === '/inventory/stock' ? 'inventory.quantities.read' : 'finance.costs.read'))
  return <ModuleLayout title="Inventaire" color="#92400E" items={visibleItems} />
}
