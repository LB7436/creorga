import { Megaphone, Tag, Target } from 'lucide-react'
import ModuleLayout from '@/components/layout/ModuleLayout'

const items = [
  { label: 'Campagnes', path: '/marketing/campagnes', icon: Megaphone },
  { label: 'Codes Promo', path: '/marketing/codes', icon: Tag },
  { label: 'Audiences', path: '/marketing/audiences', icon: Target },
]

export default function MarketingLayout() {
  return <ModuleLayout title="Marketing" color="#BE185D" items={items} />
}
