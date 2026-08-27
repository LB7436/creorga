import { useState, type CSSProperties } from 'react'
import { Banknote, CheckCircle2, Clock3, DoorOpen, FileBarChart, Lock } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import { useCashDrawers, useOpenCashDrawer } from '@/hooks/api/useAccounting'
import { toastError } from '@/lib/toast'

const euro = (value: number) => value.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })

export default function CaissePage() {
  const navigate = useNavigate()
  const drawers = useCashDrawers()
  const openDrawer = useOpenCashDrawer()
  const [showOpen, setShowOpen] = useState(false)
  const [amount, setAmount] = useState('200')
  const [notes, setNotes] = useState('')
  const current = drawers.data?.find((drawer) => !drawer.closedAt)
  const history = (drawers.data ?? []).filter((drawer) => drawer.closedAt)

  const confirmOpen = async () => {
    const openAmount = Number(amount)
    if (!Number.isFinite(openAmount) || openAmount < 0) {
      toastError('Le fond de caisse doit être un montant positif ou nul')
      return
    }
    try {
      await openDrawer.mutateAsync({ openAmount, notes: notes.trim() || undefined })
      setShowOpen(false)
      setNotes('')
    } catch {
      // Le hook affiche le message serveur.
    }
  }

  return (
    <div style={{ padding: 28, color: '#172033', maxWidth: 1050, margin: '0 auto' }}>
      <header style={{ marginBottom: 22 }}>
        <h1 style={{ margin: 0, fontSize: 27, letterSpacing: '-0.03em' }}>Caisse</h1>
        <p style={{ color: '#64748b', margin: '6px 0 0' }}>Sessions réelles enregistrées pour cet établissement.</p>
      </header>

      {drawers.isError && <div role="alert" style={errorStyle}>Impossible de charger l'état de la caisse.</div>}
      {drawers.isLoading ? <Empty text="Chargement de la caisse…" /> : (
        <>
          <section style={{ ...cardStyle, background: current ? 'linear-gradient(135deg,#ecfdf5,#f0fdfa)' : '#fff', borderColor: current ? '#a7f3d0' : '#e2e8f0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 16, flexWrap: 'wrap' }}>
              <span style={{ ...iconBox, background: current ? '#d1fae5' : '#f1f5f9', color: current ? '#047857' : '#64748b' }}>{current ? <DoorOpen size={24} /> : <Lock size={23} />}</span>
              <div style={{ flex: 1, minWidth: 230 }}>
                <h2 style={{ margin: 0, fontSize: 19 }}>{current ? 'Caisse ouverte' : 'Caisse fermée'}</h2>
                <p style={{ color: '#64748b', margin: '5px 0 0', fontSize: 13 }}>
                  {current ? `Depuis le ${new Date(current.openedAt).toLocaleString('fr-FR')} · fond initial ${euro(current.openAmount)}` : 'Aucune session de caisse active.'}
                </p>
              </div>
              {current
                ? <button type="button" onClick={() => navigate('/accounting/cloture')} style={{ ...primaryButton, background: '#b91c1c' }}><Lock size={16} /> Compter et clôturer</button>
                : <button type="button" onClick={() => setShowOpen(true)} style={primaryButton}><DoorOpen size={16} /> Ouvrir la caisse</button>}
            </div>
          </section>

          <section style={cardStyle}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap', marginBottom: 15 }}>
              <div><h2 style={{ margin: 0, fontSize: 17 }}>Historique des clôtures</h2><p style={{ margin: '4px 0 0', color: '#64748b', fontSize: 12 }}>Les montants proviennent de la base de données.</p></div>
              <button type="button" onClick={() => navigate('/accounting/rapports')} style={secondaryButton}><FileBarChart size={15} /> Voir les ventes</button>
            </div>
            {history.length === 0 ? <Empty text="Aucune clôture enregistrée." /> : (
              <div style={{ display: 'grid', gap: 8 }}>
                {history.slice(0, 20).map((drawer) => (
                  <article key={drawer.id} style={historyRow}>
                    <span style={{ ...iconBox, width: 36, height: 36, borderRadius: 10, background: '#eff6ff', color: '#1d4ed8' }}><CheckCircle2 size={18} /></span>
                    <div><strong>{new Date(drawer.openedAt).toLocaleDateString('fr-FR')}</strong><div style={{ color: '#64748b', fontSize: 12 }}><Clock3 size={11} style={{ verticalAlign: -1 }} /> {new Date(drawer.openedAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })} → {drawer.closedAt ? new Date(drawer.closedAt).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }) : '—'}</div></div>
                    <div><span style={smallLabel}>Fond initial</span><strong style={{ display: 'block' }}>{euro(drawer.openAmount)}</strong></div>
                    <div><span style={smallLabel}>Espèces vendues</span><strong style={{ display: 'block' }}>{euro(drawer.totalSales)}</strong></div>
                    <div><span style={smallLabel}>Compté</span><strong style={{ display: 'block' }}>{euro(drawer.closeAmount ?? 0)}</strong></div>
                    <div><span style={smallLabel}>Écart</span><strong style={{ display: 'block', color: drawer.discrepancy ? '#b91c1c' : '#047857' }}>{euro(drawer.discrepancy ?? 0)}</strong></div>
                  </article>
                ))}
              </div>
            )}
          </section>
        </>
      )}

      {showOpen && (
        <div role="dialog" aria-modal="true" aria-labelledby="open-drawer-title" style={backdrop} onMouseDown={(event) => { if (event.target === event.currentTarget) setShowOpen(false) }}>
          <section style={dialog}>
            <span style={{ ...iconBox, marginBottom: 12 }}><Banknote size={23} /></span>
            <h2 id="open-drawer-title" style={{ margin: '0 0 6px' }}>Ouvrir la caisse</h2>
            <p style={{ margin: '0 0 17px', color: '#64748b', fontSize: 13 }}>Le fond initial sera sauvegardé avec votre identité et l'heure exacte.</p>
            <label style={fieldStyle}>Fond initial (€)<input autoFocus type="number" min="0" step="0.01" value={amount} onChange={(event) => setAmount(event.target.value)} style={inputStyle} /></label>
            <label style={fieldStyle}>Note facultative<textarea rows={3} value={notes} onChange={(event) => setNotes(event.target.value)} style={{ ...inputStyle, resize: 'vertical' }} /></label>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 8, marginTop: 18 }}>
              <button type="button" onClick={() => setShowOpen(false)} style={secondaryButton}>Annuler</button>
              <button type="button" onClick={() => void confirmOpen()} disabled={openDrawer.isPending} style={primaryButton}>{openDrawer.isPending ? 'Ouverture…' : 'Confirmer l’ouverture'}</button>
            </div>
          </section>
        </div>
      )}
    </div>
  )
}

function Empty({ text }: { text: string }) { return <div style={{ padding: 30, borderRadius: 12, background: '#f8fafc', textAlign: 'center', color: '#64748b' }}>{text}</div> }

const cardStyle: CSSProperties = { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 18, padding: 20, marginBottom: 18, boxShadow: '0 8px 28px rgba(15,23,42,.05)' }
const primaryButton: CSSProperties = { border: 0, borderRadius: 10, padding: '10px 15px', background: '#047857', color: '#fff', fontWeight: 750, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 7 }
const secondaryButton: CSSProperties = { border: '1px solid #cbd5e1', borderRadius: 10, padding: '9px 13px', background: '#fff', color: '#334155', fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 7 }
const iconBox: CSSProperties = { width: 46, height: 46, display: 'grid', placeItems: 'center', flex: '0 0 auto', borderRadius: 13, background: '#ecfdf5', color: '#047857' }
const historyRow: CSSProperties = { display: 'grid', gridTemplateColumns: '40px minmax(150px,1fr) repeat(4,minmax(105px,auto))', gap: 12, alignItems: 'center', border: '1px solid #e2e8f0', borderRadius: 12, padding: 11 }
const smallLabel: CSSProperties = { color: '#64748b', display: 'block', fontSize: 10, textTransform: 'uppercase', marginBottom: 2 }
const errorStyle: CSSProperties = { padding: 13, borderRadius: 10, border: '1px solid #fecaca', color: '#b91c1c', background: '#fef2f2', marginBottom: 16 }
const backdrop: CSSProperties = { position: 'fixed', inset: 0, zIndex: 100, background: 'rgba(15,23,42,.6)', display: 'grid', placeItems: 'center', padding: 18, backdropFilter: 'blur(4px)' }
const dialog: CSSProperties = { background: '#fff', borderRadius: 18, padding: 23, width: 'min(470px,100%)', boxShadow: '0 25px 80px rgba(15,23,42,.3)' }
const fieldStyle: CSSProperties = { display: 'grid', gap: 6, marginTop: 12, color: '#475569', fontSize: 12, fontWeight: 750 }
const inputStyle: CSSProperties = { width: '100%', boxSizing: 'border-box', border: '1px solid #cbd5e1', borderRadius: 9, padding: '10px 11px', color: '#172033', font: 'inherit', outlineColor: '#2563eb' }
