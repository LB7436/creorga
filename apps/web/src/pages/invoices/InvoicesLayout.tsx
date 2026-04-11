import { FileText, Receipt, FileMinus, Bell } from 'lucide-react'
import ModuleLayout from '@/components/layout/ModuleLayout'

const items = [
  { label: 'Devis', path: '/invoices/devis', icon: FileText },
  { label: 'Factures', path: '/invoices/factures', icon: Receipt },
  { label: 'Avoirs', path: '/invoices/avoirs', icon: FileMinus },
  { label: 'Relances', path: '/invoices/relances', icon: Bell },
]

export default function InvoicesLayout() {
  return <ModuleLayout title="Factures & Devis" color="#065F46" items={items} />
}
