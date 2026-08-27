import { useMemo, useState } from 'react'
import { Download, Eye, FileText, Plus, Printer, RefreshCw, Search, Trash2, X } from 'lucide-react'
import {
  type LigneDocument,
  type Quote,
  type QuoteStatus,
  useConvertQuote,
  useCreateQuote,
  useDeleteQuote,
  useQuotes,
  useUpdateQuote,
} from '@/hooks/api/useInvoices'
import { useCustomers } from '@/hooks/api/useCustomers'
import { downloadCsv } from '@/lib/csv'
import { toastError, toastSuccess } from '@/lib/toast'

const euro = new Intl.NumberFormat('fr-LU', { style: 'currency', currency: 'EUR' })
const statuses: QuoteStatus[] = ['DRAFT', 'SENT', 'ACCEPTED', 'REJECTED', 'EXPIRED']
const statusLabel: Record<QuoteStatus, string> = {
  DRAFT: 'Brouillon',
  SENT: 'Envoyé (suivi manuel)',
  ACCEPTED: 'Accepté et converti',
  REJECTED: 'Refusé',
  EXPIRED: 'Expiré',
}
const statusColor: Record<QuoteStatus, { color: string; background: string }> = {
  DRAFT: { color: '#475569', background: '#f1f5f9' },
  SENT: { color: '#1d4ed8', background: '#dbeafe' },
  ACCEPTED: { color: '#047857', background: '#d1fae5' },
  REJECTED: { color: '#b91c1c', background: '#fee2e2' },
  EXPIRED: { color: '#a16207', background: '#fef3c7' },
}

const emptyLine = (): LigneDocument => ({ description: '', quantity: 1, unitPrice: 0, taxRate: 17 })

function quoteTotals(quote: Quote) {
  const subtotal = quote.items.reduce((sum, line) => sum + Number(line.quantity) * Number(line.unitPrice), 0)
  const tax = quote.items.reduce((sum, line) => sum + Number(line.quantity) * Number(line.unitPrice) * Number(line.taxRate) / 100, 0)
  return { subtotal, tax, total: subtotal + tax }
}

export default function DevisPage() {
  const { data: quotes = [], isLoading, isError, refetch } = useQuotes()
  const { data: customers = [] } = useCustomers()
  const createQuote = useCreateQuote()
  const updateQuote = useUpdateQuote()
  const deleteQuote = useDeleteQuote()
  const convertQuote = useConvertQuote()

  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<QuoteStatus | 'ALL'>('ALL')
  const [creatorOpen, setCreatorOpen] = useState(false)
  const [detail, setDetail] = useState<Quote | null>(null)
  const [customerId, setCustomerId] = useState('')
  const [validUntil, setValidUntil] = useState('')
  const [notes, setNotes] = useState('')
  const [lines, setLines] = useState<LigneDocument[]>([emptyLine()])

  const filtered = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('fr')
    return quotes.filter((quote) => {
      if (filter !== 'ALL' && quote.status !== filter) return false
      if (!query) return true
      const customer = quote.customer ? `${quote.customer.firstName} ${quote.customer.lastName}` : ''
      return quote.number.toLocaleLowerCase('fr').includes(query) || customer.toLocaleLowerCase('fr').includes(query)
    })
  }, [filter, quotes, search])

  const totals = useMemo(() => ({
    count: quotes.length,
    drafts: quotes.filter((quote) => quote.status === 'DRAFT').length,
    accepted: quotes.filter((quote) => quote.status === 'ACCEPTED').length,
    acceptedValue: quotes
      .filter((quote) => quote.status === 'ACCEPTED')
      .reduce((sum, quote) => sum + quoteTotals(quote).total, 0),
  }), [quotes])

  const previewSubtotal = lines.reduce((sum, line) => sum + Number(line.quantity || 0) * Number(line.unitPrice || 0), 0)
  const previewTax = lines.reduce((sum, line) => sum + Number(line.quantity || 0) * Number(line.unitPrice || 0) * Number(line.taxRate || 0) / 100, 0)

  function resetCreator() {
    setCustomerId('')
    setValidUntil('')
    setNotes('')
    setLines([emptyLine()])
  }

  function changeLine(index: number, patch: Partial<LigneDocument>) {
    setLines((current) => current.map((line, lineIndex) => lineIndex === index ? { ...line, ...patch } : line))
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    const cleanLines = lines.map((line) => ({
      description: line.description.trim(),
      quantity: Number(line.quantity),
      unitPrice: Number(line.unitPrice),
      taxRate: Number(line.taxRate),
    }))
    if (cleanLines.some((line) => !line.description || !Number.isFinite(line.quantity) || line.quantity <= 0 || !Number.isFinite(line.unitPrice) || line.unitPrice < 0 || !Number.isFinite(line.taxRate) || line.taxRate < 0 || line.taxRate > 100)) {
      toastError('Chaque ligne doit avoir une description, une quantité positive, un prix valide et une TVA entre 0 et 100 %.')
      return
    }
    try {
      await createQuote.mutateAsync({
        customerId: customerId || null,
        validUntil: validUntil || null,
        notes: notes.trim() || null,
        items: cleanLines,
      })
      setCreatorOpen(false)
      resetCreator()
    } catch {
      // Le hook affiche le message précis du serveur.
    }
  }

  async function changeStatus(quote: Quote, status: QuoteStatus) {
    if (status === quote.status) return
    try {
      await updateQuote.mutateAsync({ id: quote.id, status })
      if (detail?.id === quote.id) setDetail({ ...quote, status })
    } catch {
      // Le hook affiche le message précis du serveur.
    }
  }

  async function removeQuote(quote: Quote) {
    if (!window.confirm(`Supprimer définitivement le devis ${quote.number} ?`)) return
    try {
      await deleteQuote.mutateAsync(quote.id)
      if (detail?.id === quote.id) setDetail(null)
    } catch {
      // Le hook affiche le message précis du serveur.
    }
  }

  async function convert(quote: Quote) {
    if (quote.status === 'ACCEPTED') return
    if (!window.confirm(`Créer une facture à partir du devis ${quote.number} ? Le devis sera marqué accepté.`)) return
    try {
      const invoice = await convertQuote.mutateAsync(quote.id)
      setDetail(null)
      toastSuccess(`Conversion terminée : facture ${invoice.number}.`)
    } catch {
      // Le hook affiche le message précis du serveur.
    }
  }

  function exportQuotes() {
    downloadCsv(
      `devis-creorga-${new Date().toISOString().slice(0, 10)}.csv`,
      ['Numéro', 'Client', 'Statut', 'Créé le', 'Valide jusqu’au', 'HT', 'TVA', 'TTC'],
      filtered.map((quote) => {
        const amounts = quoteTotals(quote)
        return [
          quote.number,
          quote.customer ? `${quote.customer.firstName} ${quote.customer.lastName}` : '',
          statusLabel[quote.status],
          quote.createdAt.slice(0, 10),
          quote.validUntil?.slice(0, 10) || '',
          amounts.subtotal,
          amounts.tax,
          amounts.total,
        ]
      }),
    )
    toastSuccess('Export des devis téléchargé.')
  }

  return (
    <main style={{ maxWidth: 1280, margin: '0 auto', padding: '28px 22px 50px', color: '#0f172a' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <p style={eyebrow}>Devis enregistrés</p>
          <h1 style={{ margin: 0, fontSize: 'clamp(27px, 4vw, 38px)', letterSpacing: '-.03em' }}>Devis</h1>
          <p style={{ margin: '8px 0 0', color: '#64748b' }}>Les numéros, lignes et statuts sont sauvegardés sur le serveur. « Envoyé » est un suivi manuel et n'expédie aucun e-mail.</p>
        </div>
        <div style={{ display: 'flex', gap: 9, flexWrap: 'wrap' }}>
          <button type="button" onClick={exportQuotes} disabled={filtered.length === 0} style={secondaryButton}><Download size={17} /> Exporter</button>
          <button type="button" onClick={() => setCreatorOpen(true)} style={primaryButton}><Plus size={18} /> Nouveau devis</button>
        </div>
      </header>

      <section className="quote-stats" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 13, marginTop: 24 }}>
        <Stat label="Devis" value={String(totals.count)} />
        <Stat label="Brouillons" value={String(totals.drafts)} />
        <Stat label="Convertis" value={String(totals.accepted)} />
        <Stat label="Valeur convertie TTC" value={euro.format(totals.acceptedValue)} />
      </section>

      <section style={{ marginTop: 18, border: '1px solid #e2e8f0', borderRadius: 20, overflow: 'hidden', background: '#fff', boxShadow: '0 14px 40px rgba(15,23,42,.05)' }}>
        <div style={{ padding: 15, borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <div style={{ minWidth: 220, flex: 1, display: 'flex', alignItems: 'center', gap: 9 }}>
            <Search size={17} color="#64748b" />
            <input value={search} onChange={(event) => setSearch(event.target.value)} aria-label="Rechercher un devis" placeholder="Numéro ou client" style={{ flex: 1, border: 0, outline: 0, fontSize: 14 }} />
          </div>
          <select value={filter} onChange={(event) => setFilter(event.target.value as QuoteStatus | 'ALL')} aria-label="Filtrer par statut" style={{ ...field, width: 'auto', minWidth: 180 }}>
            <option value="ALL">Tous les statuts</option>
            {statuses.map((status) => <option key={status} value={status}>{statusLabel[status]}</option>)}
          </select>
        </div>

        {isLoading ? <Empty title="Chargement des devis…" /> : isError ? (
          <Empty title="Impossible de charger les devis" action={<button type="button" onClick={() => refetch()} style={primaryButton}><RefreshCw size={16} /> Réessayer</button>} />
        ) : filtered.length === 0 ? (
          <Empty title={search || filter !== 'ALL' ? 'Aucun devis ne correspond aux filtres' : 'Aucun devis enregistré'} action={!search && filter === 'ALL' ? <button type="button" onClick={() => setCreatorOpen(true)} style={primaryButton}><Plus size={17} /> Créer un devis</button> : undefined} />
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', minWidth: 900, borderCollapse: 'collapse' }}>
              <thead><tr>{['Numéro', 'Client', 'Date', 'Validité', 'Statut', 'Total TTC', 'Actions'].map((heading) => <th key={heading} style={tableHead}>{heading}</th>)}</tr></thead>
              <tbody>{filtered.map((quote) => (
                <tr key={quote.id} style={{ borderTop: '1px solid #f1f5f9' }}>
                  <td style={tableCell}><strong>{quote.number}</strong></td>
                  <td style={tableCell}>{quote.customer ? `${quote.customer.firstName} ${quote.customer.lastName}` : 'Sans client lié'}</td>
                  <td style={tableCell}>{new Date(quote.createdAt).toLocaleDateString('fr-LU')}</td>
                  <td style={tableCell}>{quote.validUntil ? new Date(quote.validUntil).toLocaleDateString('fr-LU') : 'Non définie'}</td>
                  <td style={tableCell}>
                    <select value={quote.status} disabled={quote.status === 'ACCEPTED'} onChange={(event) => changeStatus(quote, event.target.value as QuoteStatus)} aria-label={`Statut de ${quote.number}`} style={{ ...statusColor[quote.status], border: 0, borderRadius: 999, padding: '6px 10px', fontSize: 12, fontWeight: 750 }}>
                      {statuses.map((status) => <option key={status} value={status} disabled={status === 'ACCEPTED'}>{statusLabel[status]}</option>)}
                    </select>
                  </td>
                  <td style={tableCell}><strong>{euro.format(quoteTotals(quote).total)}</strong></td>
                  <td style={tableCell}>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <button type="button" onClick={() => setDetail(quote)} aria-label={`Voir ${quote.number}`} style={iconButton}><Eye size={17} /></button>
                      {quote.status !== 'ACCEPTED' && <button type="button" onClick={() => convert(quote)} disabled={convertQuote.isPending} aria-label={`Convertir ${quote.number} en facture`} title="Créer la facture" style={{ ...iconButton, color: '#047857' }}><FileText size={17} /></button>}
                      <button type="button" onClick={() => removeQuote(quote)} disabled={deleteQuote.isPending} aria-label={`Supprimer ${quote.number}`} style={{ ...iconButton, color: '#dc2626' }}><Trash2 size={17} /></button>
                    </div>
                  </td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </section>

      {creatorOpen && (
        <div role="dialog" aria-modal="true" aria-label="Nouveau devis" style={overlay} onMouseDown={() => setCreatorOpen(false)}>
          <form onSubmit={submit} style={modal} onMouseDown={(event) => event.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <div><p style={eyebrow}>Enregistrement serveur</p><h2 style={{ margin: 0 }}>Nouveau devis</h2></div>
              <button type="button" onClick={() => setCreatorOpen(false)} aria-label="Fermer" style={iconButton}><X size={18} /></button>
            </div>
            <label style={label}>Client
              <select value={customerId} onChange={(event) => setCustomerId(event.target.value)} style={field}>
                <option value="">Sans client lié</option>
                {customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.firstName} {customer.lastName}</option>)}
              </select>
            </label>
            <label style={label}>Valide jusqu'au<input type="date" value={validUntil} onChange={(event) => setValidUntil(event.target.value)} style={field} /></label>

            <div style={{ marginTop: 18, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <strong>Lignes</strong>
              <button type="button" onClick={() => setLines((current) => [...current, emptyLine()])} style={secondaryButton}><Plus size={15} /> Ajouter</button>
            </div>
            <div style={{ display: 'grid', gap: 10, marginTop: 10 }}>
              {lines.map((line, index) => (
                <div key={index} className="quote-line" style={{ padding: 12, border: '1px solid #e2e8f0', borderRadius: 12, display: 'grid', gridTemplateColumns: 'minmax(150px, 1fr) 78px 100px 78px 38px', gap: 8, alignItems: 'end' }}>
                  <label style={{ ...label, marginTop: 0 }}>Description<input value={line.description} onChange={(event) => changeLine(index, { description: event.target.value })} style={field} /></label>
                  <label style={{ ...label, marginTop: 0 }}>Qté<input type="number" min="0.01" step="0.01" value={line.quantity} onChange={(event) => changeLine(index, { quantity: Number(event.target.value) })} style={field} /></label>
                  <label style={{ ...label, marginTop: 0 }}>Prix HT<input type="number" min="0" step="0.01" value={line.unitPrice} onChange={(event) => changeLine(index, { unitPrice: Number(event.target.value) })} style={field} /></label>
                  <label style={{ ...label, marginTop: 0 }}>TVA %<input type="number" min="0" max="100" step="1" value={line.taxRate} onChange={(event) => changeLine(index, { taxRate: Number(event.target.value) })} style={field} /></label>
                  <button type="button" onClick={() => setLines((current) => current.filter((_, lineIndex) => lineIndex !== index))} disabled={lines.length === 1} aria-label={`Supprimer la ligne ${index + 1}`} style={{ ...iconButton, color: '#dc2626' }}><Trash2 size={16} /></button>
                </div>
              ))}
            </div>
            <label style={label}>Notes<textarea value={notes} onChange={(event) => setNotes(event.target.value)} rows={3} style={{ ...field, resize: 'vertical' }} /></label>
            <div style={{ marginTop: 16, padding: 14, borderRadius: 12, display: 'grid', gap: 5, background: '#f8fafc', fontSize: 13 }}>
              <span>HT : {euro.format(previewSubtotal)}</span>
              <span>TVA : {euro.format(previewTax)}</span>
              <strong style={{ fontSize: 16 }}>TTC : {euro.format(previewSubtotal + previewTax)}</strong>
            </div>
            <button type="submit" disabled={createQuote.isPending} style={{ ...primaryButton, width: '100%', marginTop: 16 }}>
              {createQuote.isPending ? 'Création…' : 'Créer le devis'}
            </button>
          </form>
        </div>
      )}

      {detail && (
        <div role="dialog" aria-modal="true" aria-label={`Devis ${detail.number}`} style={overlay} onMouseDown={() => setDetail(null)}>
          <section style={{ ...modal, width: 'min(calc(100% - 32px), 700px)' }} onMouseDown={(event) => event.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
              <div><p style={eyebrow}>Devis enregistré</p><h2 style={{ margin: 0 }}>{detail.number}</h2></div>
              <button type="button" onClick={() => setDetail(null)} aria-label="Fermer" style={iconButton}><X size={18} /></button>
            </div>
            <p style={{ color: '#64748b' }}>{detail.customer ? `${detail.customer.firstName} ${detail.customer.lastName}` : 'Sans client lié'} · {statusLabel[detail.status]}</p>
            <div style={{ overflowX: 'auto' }}><table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr>{['Description', 'Qté', 'Prix HT', 'TVA'].map((heading) => <th key={heading} style={tableHead}>{heading}</th>)}</tr></thead>
              <tbody>{detail.items.map((line, index) => <tr key={line.id || index} style={{ borderTop: '1px solid #f1f5f9' }}><td style={tableCell}>{line.description}</td><td style={tableCell}>{line.quantity}</td><td style={tableCell}>{euro.format(line.unitPrice)}</td><td style={tableCell}>{line.taxRate}%</td></tr>)}</tbody>
            </table></div>
            {(() => { const amounts = quoteTotals(detail); return <div style={{ marginTop: 16, textAlign: 'right' }}><div>HT : {euro.format(amounts.subtotal)}</div><div>TVA : {euro.format(amounts.tax)}</div><strong style={{ display: 'block', marginTop: 5, fontSize: 20 }}>TTC : {euro.format(amounts.total)}</strong></div> })()}
            {detail.notes && <p style={{ padding: 12, borderRadius: 10, background: '#f8fafc', whiteSpace: 'pre-wrap' }}>{detail.notes}</p>}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 18 }}>
              <button type="button" onClick={() => window.print()} style={secondaryButton}><Printer size={17} /> Imprimer</button>
              {detail.status !== 'ACCEPTED' && <button type="button" onClick={() => convert(detail)} disabled={convertQuote.isPending} style={primaryButton}><FileText size={17} /> Convertir en facture</button>}
            </div>
          </section>
        </div>
      )}

      <style>{`
        @media (max-width: 760px) {
          .quote-stats { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
          .quote-line { grid-template-columns: 1fr 1fr !important; }
        }
      `}</style>
    </main>
  )
}

function Stat({ label: statLabel, value }: { label: string; value: string }) {
  return <div style={{ padding: 17, border: '1px solid #e2e8f0', borderRadius: 16, background: '#fff' }}><div style={{ fontSize: 12, color: '#64748b' }}>{statLabel}</div><strong style={{ display: 'block', marginTop: 6, fontSize: 22 }}>{value}</strong></div>
}

function Empty({ title, action }: { title: string; action?: React.ReactNode }) {
  return <div style={{ padding: '54px 20px', textAlign: 'center', color: '#64748b' }}><FileText size={36} style={{ marginBottom: 12 }} /><div style={{ fontWeight: 750, color: '#334155' }}>{title}</div>{action && <div style={{ marginTop: 16 }}>{action}</div>}</div>
}

const eyebrow: React.CSSProperties = { margin: '0 0 5px', color: '#047857', fontSize: 12, fontWeight: 850, letterSpacing: '.1em', textTransform: 'uppercase' }
const primaryButton: React.CSSProperties = { minHeight: 42, padding: '0 15px', border: 0, borderRadius: 11, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7, color: '#fff', background: '#065f46', fontWeight: 750, cursor: 'pointer' }
const secondaryButton: React.CSSProperties = { minHeight: 42, padding: '0 15px', border: '1px solid #cbd5e1', borderRadius: 11, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7, color: '#334155', background: '#fff', fontWeight: 700, cursor: 'pointer' }
const iconButton: React.CSSProperties = { width: 38, height: 38, border: '1px solid #e2e8f0', borderRadius: 10, display: 'inline-grid', placeItems: 'center', color: '#334155', background: '#fff', cursor: 'pointer' }
const field: React.CSSProperties = { width: '100%', minHeight: 42, marginTop: 7, padding: '9px 11px', border: '1px solid #cbd5e1', borderRadius: 10, boxSizing: 'border-box', font: 'inherit', background: '#fff' }
const label: React.CSSProperties = { display: 'block', marginTop: 14, color: '#475569', fontSize: 12, fontWeight: 750 }
const tableHead: React.CSSProperties = { padding: '12px 14px', textAlign: 'left', color: '#64748b', background: '#f8fafc', fontSize: 11, letterSpacing: '.05em', textTransform: 'uppercase' }
const tableCell: React.CSSProperties = { padding: '12px 14px', fontSize: 13, color: '#334155' }
const overlay: React.CSSProperties = { position: 'fixed', inset: 0, zIndex: 10000, padding: 16, display: 'grid', placeItems: 'center', overflowY: 'auto', background: 'rgba(15,23,42,.55)', backdropFilter: 'blur(5px)' }
const modal: React.CSSProperties = { width: 'min(calc(100% - 32px), 880px)', maxHeight: 'calc(100vh - 32px)', overflowY: 'auto', padding: 22, borderRadius: 20, background: '#fff', boxShadow: '0 28px 80px rgba(15,23,42,.25)' }
