import { useMemo, useState, type CSSProperties } from 'react'
import { AlertTriangle, Banknote, CheckCircle2, Lock, Printer } from 'lucide-react'
import { useCashDrawers, useCloseCashDrawer, type CashDrawer } from '@/hooks/api/useAccounting'
import { useRapportCaisse } from '@/hooks/api/useRapportsCaisse'
import { toastError } from '@/lib/toast'

const DENOMINATIONS = [500, 200, 100, 50, 20, 10, 5, 2, 1, .5, .2, .1, .05]
const euro = (value: number) => value.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })

export default function CloturePage() {
  const drawers = useCashDrawers()
  const closeDrawer = useCloseCashDrawer()
  const current = drawers.data?.find((drawer) => !drawer.closedAt)
  const [counts, setCounts] = useState<Record<string, number>>({})
  const [notes, setNotes] = useState('')
  const [closed, setClosed] = useState<CashDrawer | null>(null)
  const reportEnd = useState(() => new Date())[0]
  const report = useRapportCaisse(current ? new Date(current.openedAt) : null, current ? reportEnd : null)

  const counted = useMemo(() => DENOMINATIONS.reduce((sum, denomination) => sum + denomination * (counts[String(denomination)] || 0), 0), [counts])
  const cashSales = useMemo(() => {
    const methods = report.data?.parMethode ?? {}
    return Object.entries(methods).reduce((sum, [method, value]) => method.toUpperCase() === 'CASH' || method.toLowerCase() === 'cash' || method.toLowerCase() === 'espèces' ? sum + value.total : sum, 0)
  }, [report.data])
  const expected = (current?.openAmount ?? 0) + cashSales
  const previewDifference = counted - expected

  const submit = async () => {
    if (!current) return
    if (counted < 0 || !Number.isFinite(counted)) {
      toastError('Le comptage est invalide')
      return
    }
    if (!window.confirm(`Clôturer définitivement la caisse avec ${euro(counted)} comptés ?`)) return
    try {
      const result = await closeDrawer.mutateAsync({ id: current.id, closeAmount: counted, notes: notes.trim() || undefined })
      setClosed(result)
    } catch {
      // Le hook affiche l'erreur serveur.
    }
  }

  if (drawers.isLoading) return <PageState text="Chargement de la caisse…" />
  if (drawers.isError) return <PageState error text="Impossible de charger la caisse." />
  if (closed) return <ClosedReport drawer={closed} />
  if (!current) return <PageState text="Aucune caisse ouverte. Ouvrez d'abord une session depuis l'onglet Caisse." />

  return (
    <div style={{ padding: 28, color: '#172033', maxWidth: 1050, margin: '0 auto' }}>
      <style>{`@media print { aside, nav, button, input, textarea { display:none!important } body { background:#fff!important } }`}</style>
      <header style={{ marginBottom: 21 }}>
        <h1 style={{ margin: 0, fontSize: 27, letterSpacing: '-0.03em' }}>Clôture de caisse</h1>
        <p style={{ color: '#64748b', margin: '6px 0 0' }}>Comptez les espèces. La clôture est définitive et calculée à partir des ventes encaissées.</p>
      </header>

      <section style={{ ...cardStyle, display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(185px,1fr))', gap: 12 }}>
        <Metric label="Fond initial" value={euro(current.openAmount)} />
        <Metric label="Ventes espèces" value={report.isLoading ? 'Calcul…' : euro(cashSales)} />
        <Metric label="Attendu" value={report.isLoading ? 'Calcul…' : euro(expected)} color="#1d4ed8" />
        <Metric label="Compté" value={euro(counted)} color="#047857" />
      </section>

      {report.isError && <div role="alert" style={warningStyle}><AlertTriangle size={17} /> Le détail des ventes n'a pas pu être prévisualisé. Le serveur le recalculera au moment de la clôture.</div>}

      <section style={cardStyle}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 17 }}><Banknote size={19} color="#047857" /><h2 style={{ margin: 0, fontSize: 17 }}>Comptage des espèces</h2></div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(135px,1fr))', gap: 10 }}>
          {DENOMINATIONS.map((denomination) => {
            const key = String(denomination)
            const quantity = counts[key] || 0
            return (
              <label key={key} style={countCard}>
                <span style={{ fontWeight: 800 }}>{denomination >= 5 ? `${denomination} €` : `${Math.round(denomination * 100)} c`}</span>
                <input aria-label={`Quantité de ${denomination} euros`} type="number" min="0" step="1" value={quantity || ''} onChange={(event) => setCounts((currentCounts) => ({ ...currentCounts, [key]: Math.max(0, Math.floor(Number(event.target.value) || 0)) }))} style={countInput} />
                <small style={{ color: '#64748b' }}>{euro(denomination * quantity)}</small>
              </label>
            )
          })}
        </div>
      </section>

      <section style={cardStyle}>
        <label style={{ display: 'grid', gap: 7, color: '#475569', fontSize: 12, fontWeight: 750 }}>
          Note de clôture facultative
          <textarea rows={3} value={notes} onChange={(event) => setNotes(event.target.value)} style={textareaStyle} placeholder="Expliquer un écart ou une particularité du service" />
        </label>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 14, flexWrap: 'wrap', marginTop: 16, paddingTop: 16, borderTop: '1px solid #e2e8f0' }}>
          <div><span style={{ color: '#64748b', fontSize: 12 }}>Écart prévisionnel</span><strong style={{ display: 'block', fontSize: 23, color: Math.abs(previewDifference) < .01 ? '#047857' : '#b91c1c' }}>{report.isLoading ? '—' : euro(previewDifference)}</strong></div>
          <button type="button" onClick={() => void submit()} disabled={closeDrawer.isPending || report.isLoading} style={{ ...primaryButton, opacity: closeDrawer.isPending || report.isLoading ? .55 : 1 }}><Lock size={16} /> {closeDrawer.isPending ? 'Clôture…' : 'Clôturer définitivement'}</button>
        </div>
      </section>
    </div>
  )
}

function ClosedReport({ drawer }: { drawer: CashDrawer }) {
  return (
    <div style={{ padding: 28, color: '#172033', maxWidth: 760, margin: '0 auto' }}>
      <section style={{ ...cardStyle, textAlign: 'center', borderColor: '#a7f3d0' }}>
        <CheckCircle2 size={42} color="#047857" />
        <h1 style={{ margin: '12px 0 5px' }}>Caisse clôturée</h1>
        <p style={{ color: '#64748b' }}>La session a été enregistrée sur le serveur le {new Date(drawer.closedAt || Date.now()).toLocaleString('fr-FR')}.</p>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(150px,1fr))', gap: 10, margin: '20px 0' }}>
          <Metric label="Fond initial" value={euro(drawer.openAmount)} />
          <Metric label="Ventes espèces" value={euro(drawer.totalSales)} />
          <Metric label="Montant compté" value={euro(drawer.closeAmount ?? 0)} />
          <Metric label="Écart" value={euro(drawer.discrepancy ?? 0)} color={drawer.discrepancy ? '#b91c1c' : '#047857'} />
        </div>
        <button type="button" onClick={() => window.print()} style={secondaryButton}><Printer size={16} /> Imprimer le rapport</button>
      </section>
    </div>
  )
}

function Metric({ label, value, color = '#172033' }: { label: string; value: string; color?: string }) { return <div style={{ background: '#f8fafc', borderRadius: 12, padding: 14 }}><span style={{ color: '#64748b', fontSize: 11, textTransform: 'uppercase' }}>{label}</span><strong style={{ display: 'block', fontSize: 20, color, marginTop: 4 }}>{value}</strong></div> }
function PageState({ text, error = false }: { text: string; error?: boolean }) { return <div style={{ padding: 40, maxWidth: 620, margin: '40px auto', textAlign: 'center', border: `1px solid ${error ? '#fecaca' : '#e2e8f0'}`, borderRadius: 16, background: error ? '#fef2f2' : '#fff', color: error ? '#b91c1c' : '#64748b' }}>{text}</div> }

const cardStyle: CSSProperties = { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 18, padding: 20, marginBottom: 18, boxShadow: '0 8px 28px rgba(15,23,42,.05)' }
const warningStyle: CSSProperties = { display: 'flex', alignItems: 'center', gap: 8, padding: 13, borderRadius: 11, border: '1px solid #fde68a', background: '#fffbeb', color: '#92400e', marginBottom: 16 }
const countCard: CSSProperties = { display: 'grid', gridTemplateColumns: '1fr 58px', alignItems: 'center', gap: 6, border: '1px solid #e2e8f0', borderRadius: 11, padding: 10, background: '#f8fafc' }
const countInput: CSSProperties = { width: '100%', boxSizing: 'border-box', border: '1px solid #cbd5e1', borderRadius: 8, padding: '7px 5px', textAlign: 'center', fontWeight: 750 }
const textareaStyle: CSSProperties = { width: '100%', boxSizing: 'border-box', border: '1px solid #cbd5e1', borderRadius: 9, padding: '10px 11px', resize: 'vertical', font: 'inherit', outlineColor: '#2563eb' }
const primaryButton: CSSProperties = { border: 0, borderRadius: 10, padding: '11px 16px', background: '#b91c1c', color: '#fff', fontWeight: 800, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 7 }
const secondaryButton: CSSProperties = { border: '1px solid #cbd5e1', borderRadius: 10, padding: '10px 14px', background: '#fff', color: '#334155', fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 7 }
