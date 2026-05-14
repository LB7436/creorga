import { BarChart3, CreditCard, Heart } from 'lucide-react'
import ModuleLayout from '@/components/layout/ModuleLayout'

// v4.1 — Nouveau Layout regroupant ce qui concerne le patron / propriétaire :
// /owner/rapport (vision stratégique globale, KPIs, ex-OwnerReportPage)
// /owner/abonnement (Creorga billing, plan & paiements, ex-BillingPage)
// /owner/parrainage (programme parrainage, ex-ReferralPage)
const items = [
  { label: 'Rapport', path: '/owner/rapport', icon: BarChart3 },
  { label: 'Abonnement', path: '/owner/abonnement', icon: CreditCard },
  { label: 'Parrainage', path: '/owner/parrainage', icon: Heart },
]

export default function OwnerLayout() {
  return <ModuleLayout title="Rapport Patron & Programme" color="#166534" items={items} />
}
