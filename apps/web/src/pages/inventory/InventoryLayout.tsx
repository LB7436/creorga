import { Package, ScanLine } from 'lucide-react'
import ModuleLayout from '@/components/layout/ModuleLayout'

const items = [
  { label: 'Stock', path: '/inventory/stock', icon: Package },
  { label: 'Scanner un ticket', path: '/inventory/ocr', icon: ScanLine },
]

export default function InventoryLayout() {
  return <ModuleLayout title="Inventaire" color="#92400E" items={items} />
}
