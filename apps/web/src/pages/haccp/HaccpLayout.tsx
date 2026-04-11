import { ClipboardCheck, Thermometer, ListTodo, History } from 'lucide-react'
import ModuleLayout from '@/components/layout/ModuleLayout'

const items = [
  { label: 'Journée', path: '/haccp/journee', icon: ClipboardCheck },
  { label: 'Températures', path: '/haccp/temperatures', icon: Thermometer },
  { label: 'Tâches', path: '/haccp/taches', icon: ListTodo },
  { label: 'Historique', path: '/haccp/historique', icon: History },
]

export default function HaccpLayout() {
  return <ModuleLayout title="HACCP" color="#B45309" items={items} />
}
