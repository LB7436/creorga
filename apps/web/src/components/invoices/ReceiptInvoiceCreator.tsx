import { useEffect, useState } from 'react'
import api from '@/lib/api'
import { useCustomers } from '@/hooks/api/useCustomers'
import type { Invoice } from '@/hooks/api/useInvoices'

type Ticket = { id: string; number: number; createdAt: string; tableName: string; invoice: { id: string; number: string } | null }
export default function ReceiptInvoiceCreator({ initialTicket = '', onClose, onCreated }: { initialTicket?: string; onClose: () => void; onCreated: (invoice: Invoice) => void }) {
  const { data: customers = [], isLoading: customersLoading, isError: customersError } = useCustomers()
  const [tickets, setTickets] = useState<Ticket[]>([]), [ticketId, setTicketId] = useState(initialTicket)
  const [customerId, setCustomerId] = useState(''), [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true), [submitting, setSubmitting] = useState(false), [error, setError] = useState('')
  const [lookup, setLookup] = useState('')
  useEffect(() => {
    let current = true
    setLoading(true); setError('')
    api.get('/invoices/pos-receipts', { params: { search: lookup } }).then(r => {
      if (current) { setTickets(r.data); if (initialTicket && !r.data.some((t: Ticket) => t.id === initialTicket)) setError('Ticket absent de cette liste : recherchez son numéro exact.') }
    }).catch(e => { if (current) { setTickets([]); setError(e.response?.data?.message || 'Tickets indisponibles : aucune conversion effectuée.') } })
      .finally(() => { if (current) setLoading(false) })
    return () => { current = false }
  }, [lookup, initialTicket])
  async function submit(event: React.FormEvent) {
    event.preventDefault()
    if (submitting) return
    setSubmitting(true); setError('')
    try {
      const response = await api.post(`/invoices/from-pos/${encodeURIComponent(ticketId)}`, { customerId })
      onCreated(response.data)
    } catch (e: any) { setError(e.response?.data?.message || 'Résultat non confirmé. Réessayez le même ticket : le serveur retrouvera la pièce existante.') }
    finally { setSubmitting(false) }
  }
  const selected = tickets.find(t => t.id === ticketId)
  const businessCustomers = customers.filter(c => c.businessName?.trim() && c.address?.trim())
  return <div role="dialog" aria-modal="true" aria-label="Facture depuis un ticket" style={{ position: 'fixed', inset: 0, zIndex: 650, background: 'rgba(15,23,42,.5)', display: 'flex', overflowY: 'auto' }}>
    <section style={{ margin: '24px auto', width: 'min(580px, calc(100% - 32px))', height: 'fit-content', padding: 24, background: '#fff', borderRadius: 18, boxSizing: 'border-box', color: '#0f172a' }}>
      <h2>Facture depuis un ticket</h2>
      <p>Une seule facture par vente. Les prix TTC, taux, remises et l’émetteur historique viennent du ticket ; le journal et les encaissements restent inchangés.</p>
      <form onSubmit={event => { event.preventDefault(); setLookup(search.trim()); setTicketId('') }}>
        <label style={label}>Rechercher un numéro de ticket<input inputMode="numeric" pattern="[0-9]*" value={search} onChange={e => setSearch(e.target.value)} style={field} /></label>
        <button type="submit" disabled={loading || submitting} style={button}>Rechercher le ticket</button>
      </form>
      <form onSubmit={submit}>
        <label style={label}>Ticket de caisse<select aria-label="Ticket de caisse" required value={ticketId} onChange={e => setTicketId(e.target.value)} disabled={loading || submitting} style={field}>
          <option value="">{loading ? 'Chargement…' : tickets.length ? 'Choisir parmi les 100 derniers tickets ou rechercher' : 'Aucun ticket trouvé'}</option>
          {tickets.map(t => <option key={t.id} value={t.id}>#{t.number} · {t.tableName} · {new Date(t.createdAt).toLocaleDateString('fr-LU')}{t.invoice ? ` · ${t.invoice.number} déjà liée` : ''}</option>)}
        </select></label>
        <label style={label}>Client société<select aria-label="Client société" required value={customerId} onChange={e => setCustomerId(e.target.value)} disabled={customersLoading || submitting} style={field}>
          <option value="">Choisir une société avec une adresse de facturation</option>
          {businessCustomers.map(c => <option key={c.id} value={c.id}>{c.businessName}</option>)}
        </select></label>
        {!customersLoading && !businessCustomers.length && <p>Complétez d’abord le nom de société et l’adresse du client dans le fichier clients.</p>}
        {selected?.invoice && <p>Ce ticket possède déjà {selected.invoice.number}. La même société cliente permettra de retrouver cette pièce, pas d’en créer une deuxième.</p>}
        <p>Pourboires et dons ne sont pas refacturés. Les tickets anciens incomplets nécessitent une vérification manuelle. L’émission reste soumise aux mentions légales requises.</p>
        {(error || customersError) && <p role="alert" style={{ color: '#b91c1c' }}>{error || 'Clients indisponibles : réessayez après vérification de la connexion.'}</p>}
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
          <button type="submit" disabled={loading || submitting || !selected || !customerId || customersError} style={button}>{submitting ? 'Vérification…' : 'Créer ou retrouver la facture'}</button>
          <button type="button" disabled={submitting} onClick={onClose} style={button}>Fermer</button>
        </div>
      </form>
    </section>
  </div>
}
const label: React.CSSProperties = { display: 'grid', gap: 6, margin: '14px 0', fontWeight: 650 }
const field: React.CSSProperties = { width: '100%', minHeight: 44, padding: 10, border: '1px solid #94a3b8', borderRadius: 9, boxSizing: 'border-box', background: '#fff', color: '#0f172a' }
const button: React.CSSProperties = { padding: '12px 14px', minHeight: 44, borderRadius: 9, border: '1px solid #94a3b8', background: '#fff', color: '#0f172a', cursor: 'pointer' }
