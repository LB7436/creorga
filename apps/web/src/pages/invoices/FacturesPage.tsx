import { useMemo, useState } from 'react'
import { Download, Eye, FileText, Plus, Printer, Receipt, Search, Trash2, X } from 'lucide-react'
import {
  type Invoice,
  type InvoiceStatus,
  type LigneDocument,
  useCreateInvoice,
  useInvoices,
  useUpdateInvoiceStatus,
} from '@/hooks/api/useInvoices'
import { useCustomers } from '@/hooks/api/useCustomers'
import { downloadCsv } from '@/lib/csv'
import { toastError, toastSuccess } from '@/lib/toast'

const euro = new Intl.NumberFormat('fr-LU', { style: 'currency', currency: 'EUR' })
const statuses: InvoiceStatus[] = ['DRAFT', 'SENT', 'PAID', 'OVERDUE', 'CANCELLED']
const statusLabel: Record<InvoiceStatus, string> = {
  DRAFT: 'Brouillon', SENT: 'Envoyée', PAID: 'Payée', OVERDUE: 'En retard', CANCELLED: 'Annulée',
}
const statusColor: Record<InvoiceStatus, { color: string; background: string }> = {
  DRAFT: { color: '#475569', background: '#f1f5f9' },
  SENT: { color: '#1d4ed8', background: '#dbeafe' },
  PAID: { color: '#047857', background: '#d1fae5' },
  OVERDUE: { color: '#b91c1c', background: '#fee2e2' },
  CANCELLED: { color: '#6b7280', background: '#e5e7eb' },
}

const emptyLine = (): LigneDocument => ({ description: '', quantity: 1, unitPrice: 0, taxRate: 17 })

export default function FacturesPage() {
  const { data: invoices = [], isLoading, isError, refetch } = useInvoices()
  const { data: customers = [] } = useCustomers()
  const createInvoice = useCreateInvoice()
  const updateStatus = useUpdateInvoiceStatus()

  const [search, setSearch] = useState('')
  const [filter, setFilter] = useState<InvoiceStatus | 'ALL'>('ALL')
  const [creatorOpen, setCreatorOpen] = useState(false)
  const [detail, setDetail] = useState<Invoice | null>(null)
  const [customerId, setCustomerId] = useState('')
  const [dueDate, setDueDate] = useState('')
  const [notes, setNotes] = useState('')
  const [lines, setLines] = useState<LigneDocument[]>([emptyLine()])

  const filtered = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('fr')
    return invoices.filter((invoice) => {
      if (filter !== 'ALL' && invoice.status !== filter) return false
      if (!query) return true
      const customer = invoice.customer ? `${invoice.customer.firstName} ${invoice.customer.lastName}` : ''
      return invoice.number.toLocaleLowerCase('fr').includes(query) || customer.toLocaleLowerCase('fr').includes(query)
    })
  }, [invoices, search, filter])

  const totals = useMemo(() => ({
    count: invoices.length,
    drafts: invoices.filter((invoice) => invoice.status === 'DRAFT').length,
    overdue: invoices.filter((invoice) => invoice.status === 'OVERDUE').length,
    paid: invoices.filter((invoice) => invoice.status === 'PAID').reduce((sum, invoice) => sum + invoice.total, 0),
  }), [invoices])

  const previewSubtotal = lines.reduce((sum, line) => sum + Number(line.quantity || 0) * Number(line.unitPrice || 0), 0)
  const previewTax = lines.reduce((sum, line) => sum + Number(line.quantity || 0) * Number(line.unitPrice || 0) * Number(line.taxRate || 0) / 100, 0)

  function changeLine(index: number, patch: Partial<LigneDocument>) {
    setLines((current) => current.map((line, lineIndex) => lineIndex === index ? { ...line, ...patch } : line))
  }

  function resetCreator() {
    setCustomerId('')
    setDueDate('')
    setNotes('')
    setLines([emptyLine()])
  }

  async function submit(event: React.FormEvent) {
    event.preventDefault()
    const cleanLines = lines.map((line) => ({
      description: line.description.trim(),
      quantity: Number(line.quantity),
      unitPrice: Number(line.unitPrice),
      taxRate: Number(line.taxRate),
    }))
    if (cleanLines.some((line) => !line.description || !Number.isFinite(line.quantity) || line.quantity <= 0 || !Number.isFinite(line.unitPrice) || line.unitPrice < 0)) {
      toastError('Chaque ligne doit avoir une description, une quantité positive et un prix valide.')
      return
    }
    try {
      await createInvoice.mutateAsync({
        customerId: customerId || null,
        dueDate: dueDate || null,
        notes: notes.trim() || null,
        items: cleanLines,
      })
      setCreatorOpen(false)
      resetCreator()
    } catch {
      // Le hook affiche le message précis du serveur.
    }
  }

  async function changeStatus(invoice: Invoice, status: InvoiceStatus) {
    if (status === invoice.status) return
    try {
      await updateStatus.mutateAsync({ id: invoice.id, status })
      if (detail?.id === invoice.id) setDetail({ ...invoice, status })
    } catch {
      // Le hook affiche le message précis du serveur.
    }
  }

  function exportInvoices() {
    downloadCsv(
      `factures-creorga-${new Date().toISOString().slice(0, 10)}.csv`,
      ['Numéro', 'Client', 'Statut', 'Date', 'Échéance', 'HT', 'TVA', 'TTC'],
      filtered.map((invoice) => [
        invoice.number,
        invoice.customer ? `${invoice.customer.firstName} ${invoice.customer.lastName}` : '',
        statusLabel[invoice.status],
        invoice.createdAt.slice(0, 10),
        invoice.dueDate?.slice(0, 10) || '',
        invoice.subtotal,
        invoice.taxAmount,
        invoice.total,
      ]),
    )
    toastSuccess('Export des factures téléchargé.')
  }

  return (
    <main style={{ maxWidth: 1280, margin: '0 auto', padding: '28px 22px 50px', color: '#0f172a' }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16 }}>
        <div>
          <p style={eyebrow}>Facturation réelle</p>
          <h1 style={{ margin: 0, fontSize: 'clamp(27px, 4vw, 38px)', letterSpacing: '-.03em' }}>Factures</h1>
          <p style={{ margin: '8px 0 0', color: '#64748b' }}>Numéros et montants sont calculés par le serveur, jamais inventés dans l'écran.</p>
        </div>
        <div style={{ display: 'flex', gap: 9, flexWrap: 'wrap' }}>
          <button type="button" onClick={exportInvoices} disabled={filtered.length === 0} style={secondaryButton}><Download size={17} /> Exporter</button>
          <button type="button" onClick={() => setCreatorOpen(true)} style={primaryButton}><Plus size={18} /> Nouvelle facture</button>
        </div>
      </header>

      <section className="invoice-stats" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 13, marginTop: 24 }}>
        <Stat label="Factures" value={String(totals.count)} />
        <Stat label="Brouillons" value={String(totals.drafts)} />
        <Stat label="En retard" value={String(totals.overdue)} danger={totals.overdue > 0} />
        <Stat label="CA encaissé" value={euro.format(totals.paid)} />
      </section>

      <section style={{ marginTop: 18, border: '1px solid #e2e8f0', borderRadius: 20, overflow: 'hidden', background: '#fff', boxShadow: '0 14px 40px rgba(15,23,42,.05)' }}>
        <div style={{ padding: 15, borderBottom: '1px solid #e2e8f0', display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <div style={{ minWidth: 220, flex: 1, display: 'flex', alignItems: 'center', gap: 9 }}>
            <Search size={17} color="#64748b" />
            <input value={search} onChange={(event) => setSearch(event.target.value)} aria-label="Rechercher une facture" placeholder="Numéro ou client" style={{ flex: 1, border: 0, outline: 0, fontSize: 14 }} />
          </div>
          <select value={filter} onChange={(event) => setFilter(event.target.value as InvoiceStatus | 'ALL')} aria-label="Filtrer par statut" style={{ ...field, width: 'auto', minWidth: 145 }}>
            <option value="ALL">Tous les statuts</option>
            {statuses.map((status) => <option key={status} value={status}>{statusLabel[status]}</option>)}
          </select>
        </div>

        {isLoading ? <Empty title="Chargement des factures…" /> : isError ? (
          <Empty title="Impossible de charger les factures" action={<button type="button" onClick={() => refetch()} style={primaryButton}>Réessayer</button>} />
        ) : filtered.length === 0 ? (
          <Empty title={search || filter !== 'ALL' ? 'Aucune facture ne correspond aux filtres' : 'Aucune facture enregistrée'} action={!search && filter === 'ALL' ? <button type="button" onClick={() => setCreatorOpen(true)} style={primaryButton}><Plus size={17} /> Créer une facture</button> : undefined} />
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', minWidth: 820, borderCollapse: 'collapse' }}>
              <thead><tr>{['Numéro', 'Client', 'Date', 'Statut', 'Total TTC', 'Actions'].map((heading) => <th key={heading} style={tableHead}>{heading}</th>)}</tr></thead>
              <tbody>{filtered.map((invoice) => (
                <tr key={invoice.id} style={{ borderTop: '1px solid #f1f5f9' }}>
                  <td style={tableCell}><strong>{invoice.number}</strong></td>
                  <td style={tableCell}>{invoice.customer ? `${invoice.customer.firstName} ${invoice.customer.lastName}` : 'Sans client lié'}</td>
                  <td style={tableCell}>{new Date(invoice.createdAt).toLocaleDateString('fr-LU')}</td>
                  <td style={tableCell}>
                    <select value={invoice.status} onChange={(event) => changeStatus(invoice, event.target.value as InvoiceStatus)} aria-label={`Statut de ${invoice.number}`} style={{ ...statusColor[invoice.status], border: 0, borderRadius: 999, padding: '6px 10px', fontSize: 12, fontWeight: 750 }}>
                      {statuses.map((status) => <option key={status} value={status}>{statusLabel[status]}</option>)}
                    </select>
                  </td>
                  <td style={tableCell}><strong>{euro.format(invoice.total)}</strong></td>
                  <td style={tableCell}><button type="button" onClick={() => setDetail(invoice)} aria-label={`Voir ${invoice.number}`} style={iconButton}><Eye size={17} /></button></td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        )}
      </section>

      {creatorOpen && (
        <div role="dialog" aria-modal="true" aria-label="Nouvelle facture" style={overlay} onMouseDown={() => setCreatorOpen(false)}>
          <form onSubmit={submit} style={modal} onMouseDown={(event) => event.stopPropagation()}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12 }}>
              <div><p style={eyebrow}>Enregistrement serveur</p><h2 style={{ margin: 0 }}>Nouvelle facture</h2></div>
              <button type="button" onClick={() => setCreatorOpen(false)} aria-label="Fermer" style={iconButton}><X size={18} /></button>
            </div>
            <label style={label}>Client
              <select value={customerId} onChange={(event) => setCustomerId(event.target.value)} style={field}>
                <option value="">Sans client lié</option>
                {customers.map((customer) => <option key={customer.id} value={customer.id}>{customer.firstName} {customer.lastName}</option>)}
              </select>
            </label>
            <label style={label}>Date d'échéance<input type="date" value={dueDate} onChange={(event) => setDueDate(event.target.value)} style={field} /></label>

            <div style={{ marginTop: 18, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <strong>Lignes</strong>
              <button type="button" onClick={() => setLines((current) => [...current, emptyLine()])} style={secondaryButton}><Plus size={15} /> Ajouter</button>
            </div>
            <div style={{ display: 'grid', gap: 10, marginTop: 10 }}>
              {lines.map((line, index) => (
                <div key={index} className="invoice-line" style={{ padding: 12, border: '1px solid #e2e8f0', borderRadius: 12, display: 'grid', gridTemplateColumns: 'minmax(150px, 1fr) 78px 100px 78px 38px', gap: 8, alignItems: 'end' }}>
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
            <button type="submit" disabled={createInvoice.isPending} style={{ ...primaryButton, width: '100%', marginTop: 16 }}>
              {createInvoice.isPending ? 'Création…' : 'Créer la facture'}
            </button>
          </form>
        </div>
      )}

      {detail && (
        <div role="dialog" aria-modal="true" aria-label={`Facture ${detail.number}`} style={overlay} onMouseDown={() => setDetail(null)}>
          <section style={{ ...modal, width: 'min(calc(100% - 32px), 700px)' }} onMouseDown={(event) => event.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12 }}>
              <div><p style={eyebrow}>Facture enregistrée</p><h2 style={{ margin: 0 }}>{detail.number}</h2></div>
              <button type="button" onClick={() => setDetail(null)} aria-label="Fermer" style={iconButton}><X size={18} /></button>
            </div>
            <p style={{ color: '#64748b' }}>{detail.customer ? `${detail.customer.firstName} ${detail.customer.lastName}` : 'Sans client lié'} · {statusLabel[detail.status]}</p>
            <div style={{ overflowX: 'auto' }}><table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead><tr>{['Description', 'Qté', 'Prix HT', 'TVA'].map((heading) => <th key={heading} style={tableHead}>{heading}</th>)}</tr></thead>
              <tbody>{detail.items.map((line, index) => <tr key={line.id || index} style={{ borderTop: '1px solid #f1f5f9' }}><td style={tableCell}>{line.description}</td><td style={tableCell}>{line.quantity}</td><td style={tableCell}>{euro.format(line.unitPrice)}</td><td style={tableCell}>{line.taxRate}%</td></tr>)}</tbody>
            </table></div>
            <div style={{ marginTop: 16, textAlign: 'right' }}><div>HT : {euro.format(detail.subtotal)}</div><div>TVA : {euro.format(detail.taxAmount)}</div><strong style={{ display: 'block', marginTop: 5, fontSize: 20 }}>TTC : {euro.format(detail.total)}</strong></div>
            {detail.notes && <p style={{ padding: 12, borderRadius: 10, background: '#f8fafc', whiteSpace: 'pre-wrap' }}>{detail.notes}</p>}
            <button type="button" onClick={() => window.print()} style={{ ...primaryButton, marginTop: 18 }}><Printer size={17} /> Imprimer</button>
          </section>
        </div>
      )}

      <style>{`
        @media (max-width: 760px) {
          .invoice-stats { grid-template-columns: repeat(2, minmax(0, 1fr)) !important; }
          .invoice-line { grid-template-columns: 1fr 1fr !important; }
        }
      `}</style>
    </main>
  )
}

function Stat({ label: text, value, danger }: { label: string; value: string; danger?: boolean }) {
  return <div style={{ padding: '16px 18px', border: `1px solid ${danger ? '#fecaca' : '#e2e8f0'}`, borderRadius: 16, display: 'flex', gap: 11, alignItems: 'center', background: danger ? '#fef2f2' : '#fff' }}><span style={{ width: 38, height: 38, borderRadius: 11, display: 'grid', placeItems: 'center', color: danger ? '#dc2626' : '#047857', background: danger ? '#fee2e2' : '#ecfdf5' }}>{danger ? <FileText size={18} /> : <Receipt size={18} />}</span><div><small style={{ color: '#64748b' }}>{text}</small><strong style={{ display: 'block', marginTop: 3, fontSize: 20 }}>{value}</strong></div></div>
}

function Empty({ title, action }: { title: string; action?: React.ReactNode }) {
  return <div style={{ padding: '65px 20px', textAlign: 'center' }}><Receipt size={36} color="#cbd5e1" /><h3 style={{ margin: '13px 0 18px' }}>{title}</h3>{action}</div>
}

const eyebrow: React.CSSProperties = { margin: '0 0 6px', color: '#047857', fontSize: 11, fontWeight: 850, letterSpacing: '.12em', textTransform: 'uppercase' }
const primaryButton: React.CSSProperties = { minHeight: 42, padding: '0 15px', border: 0, borderRadius: 11, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7, color: '#fff', background: '#047857', fontSize: 13, fontWeight: 750, cursor: 'pointer' }
const secondaryButton: React.CSSProperties = { minHeight: 42, padding: '0 14px', border: '1px solid #cbd5e1', borderRadius: 11, display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 7, color: '#334155', background: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer' }
const iconButton: React.CSSProperties = { width: 38, height: 38, border: '1px solid #e2e8f0', borderRadius: 10, display: 'inline-grid', placeItems: 'center', color: '#475569', background: '#fff', cursor: 'pointer' }
const tableHead: React.CSSProperties = { padding: '12px 15px', color: '#64748b', background: '#f8fafc', textAlign: 'left', fontSize: 11, letterSpacing: '.05em', textTransform: 'uppercase' }
const tableCell: React.CSSProperties = { padding: '14px 15px', color: '#334155', fontSize: 13, verticalAlign: 'middle' }
const overlay: React.CSSProperties = { position: 'fixed', inset: 0, zIndex: 600, display: 'flex', background: 'rgba(15,23,42,.46)', backdropFilter: 'blur(3px)', overflowY: 'auto' }
const modal: React.CSSProperties = { width: 'min(calc(100% - 32px), 920px)', maxHeight: 'calc(100vh - 40px)', margin: '20px auto', padding: 24, borderRadius: 22, overflowY: 'auto', background: '#fff', boxShadow: '0 25px 85px rgba(15,23,42,.28)', boxSizing: 'border-box' }
const label: React.CSSProperties = { marginTop: 13, display: 'grid', gap: 6, color: '#334155', fontSize: 12, fontWeight: 700 }
const field: React.CSSProperties = { width: '100%', minHeight: 42, padding: '9px 11px', border: '1px solid #cbd5e1', borderRadius: 10, color: '#0f172a', background: '#fff', font: 'inherit', boxSizing: 'border-box', outlineColor: '#10b981' }
