import { FileText, Receipt } from 'lucide-react'
import ModuleLayout from '@/components/layout/ModuleLayout'

const items = [
  { label: 'Devis', path: '/invoices/devis', icon: FileText },
  { label: 'Factures', path: '/invoices/factures', icon: Receipt },
]

export default function InvoicesLayout() {
  return <ModuleLayout title="Factures & Devis" color="#065F46" items={items} backPath="/modules" />
}
