import { CalendarCheck, Calendar, Building2 } from 'lucide-react'
import ModuleLayout from '@/components/layout/ModuleLayout'

const items = [
  { label: 'Devis Événements', path: '/events/devis', icon: CalendarCheck },
  { label: 'Agenda', path: '/events/agenda', icon: Calendar },
  { label: 'Clients B2B', path: '/events/clients', icon: Building2 },
]

export default function EventsLayout() {
  return <ModuleLayout title="Événements" color="#6D28D9" items={items} />
}
