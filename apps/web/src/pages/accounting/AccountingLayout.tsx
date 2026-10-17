import { BarChart3, Banknote, Lock, Percent, Receipt, WalletCards } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { isAxiosError } from 'axios'
import ModuleLayout from '@/components/layout/ModuleLayout'
import { useCashDrawers } from '@/hooks/api/useAccounting'

const COLOR = '#1F2937'
const items = [
  { label: 'Caisse', path: '/accounting/caisse', icon: Banknote },
  { label: 'Clôture', path: '/accounting/cloture', icon: Lock },
  { label: 'Dépenses', path: '/accounting/depenses', icon: Receipt },
  { label: 'TVA', path: '/accounting/tva', icon: Percent },
  { label: 'Rapports de caisse', path: '/accounting/rapports', icon: BarChart3 },
]

export default function AccountingLayout() {
  const navigate = useNavigate()
  const drawers = useCashDrawers()
  const current = drawers.isSuccess ? drawers.data?.find((drawer) => !drawer.closedAt) : undefined
  const accessDenied = drawers.isError && isAxiosError(drawers.error) && drawers.error.response?.status === 403
  const statusTitle = drawers.isPending ? 'Vérification de la caisse…'
    : drawers.isError ? accessDenied ? 'Accès à la caisse refusé' : 'État de la caisse inconnu'
    : current ? 'Caisse ouverte' : 'Aucune caisse ouverte'
  const statusDetails = drawers.isPending ? 'Vérification en cours, aucun état de caisse confirmé.'
    : drawers.isError ? accessDenied ? 'Vous n’avez pas l’autorisation de consulter cet état.' : 'Impossible de vérifier l’état avant une ouverture ou une clôture.'
    : current ? `Ouverte le ${new Date(current.openedAt).toLocaleString('fr-FR')} avec ${current.openAmount.toFixed(2)} €` : 'Ouvrez une session avant le service.'

  const banner = (
    <div style={{ padding: '14px 24px 0', background: '#f8fafc' }}>
      <div role={drawers.isError ? 'alert' : undefined} aria-busy={drawers.isPending} style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: 14, display: 'flex', gap: 13, alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={{ width: 42, height: 42, display: 'grid', placeItems: 'center', borderRadius: 12, background: current ? '#ecfdf5' : '#f1f5f9', color: current ? '#047857' : '#64748b' }}><WalletCards size={20} /></span>
        <div style={{ flex: 1, minWidth: 220 }}>
          <strong>{statusTitle}</strong>
          <div style={{ color: '#64748b', fontSize: 12, marginTop: 3 }}>
            {statusDetails}
          </div>
        </div>
        {drawers.isSuccess && <button type="button" onClick={() => current
          ? navigate('/accounting/cloture')
          : navigate('/accounting/caisse', { state: { openCashDrawer: true } })}
          style={{ border: 0, borderRadius: 9, padding: '9px 13px', background: COLOR, color: '#fff', cursor: 'pointer', fontWeight: 700 }}>{current ? 'Clôturer' : 'Ouvrir la caisse'}</button>}
      </div>
    </div>
  )

  return <ModuleLayout title="Comptabilité" color={COLOR} items={items} backPath="/modules" banner={banner} />
}
