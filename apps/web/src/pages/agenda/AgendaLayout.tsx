import {
  LayoutDashboard,
  CalendarDays,
  CalendarCheck2,
  FileSignature,
  Building2,
  ListChecks,
  Sliders,
} from 'lucide-react'
import ModuleLayout from '@/components/layout/ModuleLayout'

const items = [
  { label: "Vue d'ensemble", path: '/agenda/overview', icon: LayoutDashboard },
  { label: 'Calendrier', path: '/agenda/calendrier', icon: CalendarDays },
  { label: 'Planning événements', path: '/agenda/planning', icon: CalendarCheck2 },
  { label: 'Devis événements', path: '/agenda/devis', icon: FileSignature },
  { label: 'Clients B2B', path: '/agenda/clients', icon: Building2 },
  { label: 'Liste réservations', path: '/agenda/liste', icon: ListChecks },
  { label: 'Configuration', path: '/agenda/config', icon: Sliders },
]

export default function AgendaLayout() {
  return <ModuleLayout title="Agenda & Calendrier" color="#0E7490" items={items} />
}
