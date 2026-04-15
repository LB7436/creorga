import { CalendarDays, Calendar, FileText, Building2, List, Settings2 } from 'lucide-react'
import ModuleLayout from '@/components/layout/ModuleLayout'

const items = [
  { label: 'Calendrier', path: '/agenda/calendrier', icon: CalendarDays },
  { label: 'Planning événements', path: '/agenda/planning', icon: Calendar },
  { label: 'Devis événements', path: '/agenda/devis', icon: FileText },
  { label: 'Clients B2B', path: '/agenda/clients', icon: Building2 },
  { label: 'Liste réservations', path: '/agenda/liste', icon: List },
  { label: 'Configuration', path: '/agenda/config', icon: Settings2 },
]

export default function AgendaLayout() {
  return <ModuleLayout title="Agenda & Calendrier" color="#0E7490" items={items} />
}
