import { Banknote, Receipt, Percent, BarChart3, Lock } from 'lucide-react'
import ModuleLayout from '@/components/layout/ModuleLayout'

const items = [
  { label: 'Caisse', path: '/accounting/caisse', icon: Banknote },
  { label: 'Clôture', path: '/accounting/cloture', icon: Lock },
  { label: 'Dépenses', path: '/accounting/depenses', icon: Receipt },
  { label: 'TVA', path: '/accounting/tva', icon: Percent },
  { label: 'Rapports', path: '/accounting/rapports', icon: BarChart3 },
]

export default function AccountingLayout() {
  return <ModuleLayout title="Comptabilité" color="#1F2937" items={items} backPath="/modules" />
}
