import { CalendarRange, Clock, Umbrella, Users, Settings2 } from 'lucide-react'
import ModuleLayout from '@/components/layout/ModuleLayout'

const items = [
  { label: 'Planning', path: '/hr/planning', icon: CalendarRange },
  { label: 'Pointages', path: '/hr/pointages', icon: Clock },
  { label: 'Congés', path: '/hr/conges', icon: Umbrella },
  { label: 'Équipe', path: '/hr/equipe', icon: Users },
  { label: 'Paramètres', path: '/hr/parametres', icon: Settings2 },
]

export default function HrLayout() {
  return <ModuleLayout title="Gestion RH" color="#991B1B" items={items} />
}
