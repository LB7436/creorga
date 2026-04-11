import { CalendarDays, List, Settings2 } from 'lucide-react'
import ModuleLayout from '@/components/layout/ModuleLayout'

const items = [
  { label: 'Calendrier', path: '/reservations/calendrier', icon: CalendarDays },
  { label: 'Liste', path: '/reservations/liste', icon: List },
  { label: 'Paramètres', path: '/reservations/config', icon: Settings2 },
]

export default function ReservationsLayout() {
  return <ModuleLayout title="Réservations" color="#0E7490" items={items} />
}
