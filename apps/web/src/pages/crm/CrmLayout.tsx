import { Users } from 'lucide-react'
import ModuleLayout from '@/components/layout/ModuleLayout'

const items = [
  { label: 'Clients', path: '/crm/clients', icon: Users },
]

export default function CrmLayout() {
  return <ModuleLayout title="Fichier clients" color="#BE185D" items={items} />
}
