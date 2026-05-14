import { Package, BookOpen, Truck, ShoppingCart, Sparkles, ChefHat } from 'lucide-react'
import ModuleLayout from '@/components/layout/ModuleLayout'

// v3.18.5 — Inventaire absorbe l'ex-module Auto-Réapprovisionnement
// v4.1 — Cuisine Centrale folded depuis module standalone
const items = [
  { label: 'Stock', path: '/inventory/stock', icon: Package },
  { label: 'Recettes', path: '/inventory/recettes', icon: BookOpen },
  { label: 'Fournisseurs', path: '/inventory/fournisseurs', icon: Truck },
  { label: 'Commandes', path: '/inventory/commandes', icon: ShoppingCart },
  { label: 'Auto-Réappro IA', path: '/inventory/autoorder', icon: Sparkles },
  { label: 'Cuisine centrale', path: '/inventory/cuisine-centrale', icon: ChefHat },
]

export default function InventoryLayout() {
  return <ModuleLayout title="Inventaire & Cuisine Centrale" color="#92400E" items={items} />
}
