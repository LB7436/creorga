import { BarChart3, Banknote, Lock, Percent, Receipt, WalletCards } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
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
  const current = drawers.data?.find((drawer) => !drawer.closedAt)

  const banner = (
    <div style={{ padding: '14px 24px 0', background: '#f8fafc' }}>
      <div style={{ background: '#fff', border: '1px solid #e2e8f0', borderRadius: 14, padding: 14, display: 'flex', gap: 13, alignItems: 'center', flexWrap: 'wrap' }}>
        <span style={{ width: 42, height: 42, display: 'grid', placeItems: 'center', borderRadius: 12, background: current ? '#ecfdf5' : '#f1f5f9', color: current ? '#047857' : '#64748b' }}><WalletCards size={20} /></span>
        <div style={{ flex: 1, minWidth: 220 }}>
          <strong>{drawers.isLoading ? 'Vérification de la caisse…' : current ? 'Caisse ouverte' : 'Aucune caisse ouverte'}</strong>
          <div style={{ color: '#64748b', fontSize: 12, marginTop: 3 }}>
            {current ? `Ouverte le ${new Date(current.openedAt).toLocaleString('fr-FR')} avec ${current.openAmount.toFixed(2)} €` : 'Ouvrez une session avant le service.'}
          </div>
        </div>
        {!drawers.isLoading && <button type="button" onClick={() => navigate(current ? '/accounting/cloture' : '/accounting/caisse')} style={{ border: 0, borderRadius: 9, padding: '9px 13px', background: COLOR, color: '#fff', cursor: 'pointer', fontWeight: 700 }}>{current ? 'Clôturer' : 'Ouvrir la caisse'}</button>}
      </div>
    </div>
  )

  return <ModuleLayout title="Comptabilité" color={COLOR} items={items} backPath="/modules" banner={banner} />
}
