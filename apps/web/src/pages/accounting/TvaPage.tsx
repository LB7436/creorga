import { useMemo, useState, type CSSProperties } from 'react'
import { CalendarRange, Download, Percent, Printer } from 'lucide-react'
import { useExpenses, useTaxReport } from '@/hooks/api/useAccounting'
import { downloadCsv } from '@/lib/csv'

const pad = (value: number) => String(value).padStart(2, '0')
const localDate = (date: Date) => `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
const monthBounds = () => {
  const now = new Date()
  return { start: localDate(new Date(now.getFullYear(), now.getMonth(), 1)), end: localDate(now) }
}
const euro = (value: number) => value.toLocaleString('fr-FR', { style: 'currency', currency: 'EUR' })

export default function TvaPage() {
  const initial = monthBounds()
  const [start, setStart] = useState(initial.start)
  const [end, setEnd] = useState(initial.end)
  const startIso = start ? new Date(`${start}T00:00:00`).toISOString() : ''
  const endIso = end ? new Date(`${end}T23:59:59`).toISOString() : ''
  const report = useTaxReport(startIso, endIso)
  const expenses = useExpenses()

  const periodExpenses = useMemo(() => (expenses.data ?? []).filter((expense) => {
    const date = new Date(expense.date).getTime()
    return date >= new Date(`${start}T00:00:00`).getTime() && date <= new Date(`${end}T23:59:59`).getTime()
  }), [expenses.data, start, end])
  const deductible = periodExpenses.reduce((sum, expense) => sum + expense.amount * expense.taxRate / (100 + expense.taxRate), 0)
  const collected = report.data?.totalTax ?? 0
  const balance = collected - deductible
  const rows = Object.entries(report.data?.byTaxRate ?? {}).sort(([a], [b]) => a.localeCompare(b, 'fr', { numeric: true }))

  const exportCsv = () => {
    if (!report.data) return
    downloadCsv(
      `tva-${start}_${end}.csv`,
      ['Taux', 'Base HT', 'TVA collectée', 'Total TTC'],
      rows.map(([rate, value]) => [rate, value.base, value.tax, value.total]),
    )
  }

  return (
    <div style={{ padding: 28, color: '#172033', maxWidth: 1080, margin: '0 auto' }}>
      <style>{`@media print { aside, nav, button, .no-print { display:none!important } body { background:#fff!important } }`}</style>
      <header style={{ display: 'flex', justifyContent: 'space-between', gap: 14, alignItems: 'flex-start', flexWrap: 'wrap', marginBottom: 21 }}>
        <div><h1 style={{ margin: 0, fontSize: 27, letterSpacing: '-0.03em' }}>TVA</h1><p style={{ color: '#64748b', margin: '6px 0 0' }}>Calcul fondé sur les ventes payées et les dépenses enregistrées.</p></div>
        <div className="no-print" style={{ display: 'flex', gap: 8 }}><button type="button" onClick={exportCsv} disabled={!report.data} style={secondaryButton}><Download size={15} /> CSV</button><button type="button" onClick={() => window.print()} disabled={!report.data} style={secondaryButton}><Printer size={15} /> Imprimer / PDF</button></div>
      </header>

      <section className="no-print" style={{ ...cardStyle, display: 'flex', alignItems: 'end', gap: 12, flexWrap: 'wrap' }}>
        <CalendarRange size={20} color="#1d4ed8" style={{ marginBottom: 9 }} />
        <label style={fieldStyle}>Du<input type="date" value={start} max={end} onChange={(event) => setStart(event.target.value)} style={inputStyle} /></label>
        <label style={fieldStyle}>Au<input type="date" value={end} min={start} onChange={(event) => setEnd(event.target.value)} style={inputStyle} /></label>
      </section>

      {report.isError && <div role="alert" style={errorStyle}>Le rapport de TVA n'a pas pu être calculé.</div>}
      {report.isLoading ? <Empty text="Calcul du rapport de TVA…" /> : report.data && (
        <>
          <section style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(190px,1fr))', gap: 12, marginBottom: 18 }}>
            <Metric label="Chiffre d'affaires HT" value={euro(report.data.totalRevenue)} />
            <Metric label="TVA collectée" value={euro(collected)} color="#1d4ed8" />
            <Metric label="TVA déductible estimée" value={euro(deductible)} color="#047857" />
            <Metric label={balance >= 0 ? 'TVA à décaisser' : 'Crédit de TVA'} value={euro(Math.abs(balance))} color={balance >= 0 ? '#b45309' : '#047857'} />
          </section>

          <section style={cardStyle}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 9, marginBottom: 15 }}><Percent size={18} color="#1d4ed8" /><h2 style={{ margin: 0, fontSize: 17 }}>Ventes par taux</h2></div>
            {rows.length === 0 ? <Empty text="Aucune vente payée sur cette période." /> : (
              <div style={{ overflowX: 'auto' }}><table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 580 }}><thead><tr style={{ background: '#f8fafc' }}><th style={th}>Taux</th><th style={th}>Base HT</th><th style={th}>TVA collectée</th><th style={th}>Total TTC</th></tr></thead><tbody>{rows.map(([rate, value]) => <tr key={rate} style={{ borderTop: '1px solid #e2e8f0' }}><td style={td}><strong>{rate}</strong></td><td style={td}>{euro(value.base)}</td><td style={td}>{euro(value.tax)}</td><td style={td}>{euro(value.total)}</td></tr>)}</tbody></table></div>
            )}
          </section>

          <section style={{ ...cardStyle, background: '#f8fafc', color: '#475569', fontSize: 13, lineHeight: 1.55 }}>
            <strong style={{ color: '#172033' }}>Périmètre du calcul</strong><br />
            {report.data.orderCount} vente(s) payée(s) et {periodExpenses.length} dépense(s) sur la période. La TVA déductible est estimée à partir des montants TTC et taux saisis. Vérifiez les justificatifs avec votre comptable avant toute déclaration officielle.
          </section>
        </>
      )}
    </div>
  )
}

function Metric({ label, value, color = '#172033' }: { label: string; value: string; color?: string }) { return <div style={{ ...cardStyle, marginBottom: 0 }}><span style={{ color: '#64748b', fontSize: 11, textTransform: 'uppercase' }}>{label}</span><strong style={{ display: 'block', fontSize: 22, color, marginTop: 4 }}>{value}</strong></div> }
function Empty({ text }: { text: string }) { return <div style={{ padding: 31, borderRadius: 12, background: '#f8fafc', textAlign: 'center', color: '#64748b' }}>{text}</div> }

const cardStyle: CSSProperties = { background: '#fff', border: '1px solid #e2e8f0', borderRadius: 17, padding: 19, marginBottom: 18, boxShadow: '0 8px 28px rgba(15,23,42,.05)' }
const secondaryButton: CSSProperties = { border: '1px solid #cbd5e1', borderRadius: 10, padding: '9px 12px', background: '#fff', color: '#334155', fontWeight: 700, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 7 }
const fieldStyle: CSSProperties = { display: 'grid', gap: 5, color: '#475569', fontSize: 11, fontWeight: 750 }
const inputStyle: CSSProperties = { border: '1px solid #cbd5e1', borderRadius: 9, padding: '9px 10px', background: '#fff', color: '#172033', font: 'inherit' }
const errorStyle: CSSProperties = { padding: 13, borderRadius: 10, border: '1px solid #fecaca', color: '#b91c1c', background: '#fef2f2', marginBottom: 16 }
const th: CSSProperties = { padding: '11px 13px', textAlign: 'right', color: '#64748b', fontSize: 11, textTransform: 'uppercase' }
const td: CSSProperties = { padding: '12px 13px', textAlign: 'right' }
