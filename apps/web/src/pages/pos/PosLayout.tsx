import { LayoutDashboard, Map, ClipboardList, ChefHat, CreditCard, Settings2, Tablet, ExternalLink } from 'lucide-react'
import ModuleLayout from '@/components/layout/ModuleLayout'

const items = [
  { label: 'Tableau de bord', path: '/pos/dashboard', icon: LayoutDashboard },
  { label: 'Plan de salle', path: '/pos/floor', icon: Map },
  { label: 'Commandes', path: '/pos/orders', icon: ClipboardList },
  { label: 'Cuisine KDS', path: '/pos/kitchen', icon: ChefHat },
  { label: 'Caisse', path: '/pos/checkout', icon: CreditCard },
  { label: 'Configuration', path: '/pos/config', icon: Settings2 },
]

/**
 * Adresse de la caisse tactile (application `apps/pos`, servie séparément).
 *
 * Elle vit sur son propre sous-domaine : rien depuis le back-office n'y menait,
 * il fallait connaître l'adresse par cœur. On la déduit du domaine courant
 * plutôt que de l'écrire en dur, pour que cela marche aussi en développement.
 */
function urlCaisse(): string {
  const configuree = (import.meta as any).env?.VITE_CAISSE_URL
  if (configuree) return configuree
  if (typeof window === 'undefined') return '#'
  const hote = window.location.hostname
  if (hote.startsWith('creorga.')) {
    return `${window.location.protocol}//caisse.${hote.slice('creorga.'.length)}`
  }
  // En développement, la caisse tourne sur son propre port (cf. CLAUDE.md).
  return 'http://localhost:5175'
}

function BandeauCaisseTactile() {
  return (
    <a
      href={urlCaisse()}
      target="_blank"
      rel="noopener noreferrer"
      style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '12px 20px', textDecoration: 'none',
        background: 'linear-gradient(90deg, rgba(30,58,95,0.5), rgba(30,58,95,0.15))',
        color: '#e2e8f0',
      }}
    >
      <Tablet size={18} />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13.5, fontWeight: 700 }}>Ouvrir la caisse tactile</div>
        <div style={{ fontSize: 12, color: '#94a3b8' }}>
          Prise de commande, couverts, plan de salle et journal des ventes — pensée pour la tablette.
        </div>
      </div>
      <ExternalLink size={15} style={{ flexShrink: 0, color: '#94a3b8' }} />
    </a>
  )
}

export default function PosLayout() {
  return (
    <ModuleLayout
      title="Caisse POS"
      color="#1E3A5F"
      items={items}
      banner={<BandeauCaisseTactile />}
    />
  )
}
