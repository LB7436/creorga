import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'
import { moneyMinor } from '@/lib/money'
import { useAuthStore } from '@/stores/authStore'
import { readFinancialRequest, preserveFinancialRequest, forgetFinancialRequest } from '@/lib/financial-request'
export default function ManualRefundPanel({ invoiceId, credit }: { invoiceId: string; credit: any }) {
  const company = useAuthStore(s => s.companyId), actor = useAuthStore(s => s.user?.id)
  const key = `creorga-financial-v1:manual-refund:${company}:${actor}:${credit.id}`
  const [amount, setAmount] = useState(''), [reason, setReason] = useState(''), [reference, setReference] = useState(''), [tenderId, setTender] = useState('')
  const [busy, setBusy] = useState(false), [error, setError] = useState(''), [pending, setPending] = useState<any>(() => readFinancialRequest(key))
  const tenders = useQuery<any[]>({ queryKey: ['manual-tenders', company, actor, invoiceId], queryFn: () => api.get('/payments/manual-tenders', { params: { invoiceId } }).then(r => r.data) })
  const refunds = useQuery<any[]>({ queryKey: ['manual-refunds', company, actor, credit.id], queryFn: () => api.get('/payments/manual-refunds', { params: { creditNoteId: credit.id } }).then(r => r.data) })
  async function submit(e: React.FormEvent) {
    e.preventDefault(); if (busy) return; setBusy(true); setError('')
    try {
      const tender = tenders.data?.find(t => t.id === tenderId)
      const body = readFinancialRequest(key) || pending || { requestId: crypto.randomUUID(), creditNoteId: credit.id, tenderId, method: tender?.method, amountCents: moneyMinor(amount), reason, reference }
      if (!body.method || body.amountCents <= 0 || body.reason.trim().length < 5 || body.reference.trim().length < 3) throw new Error('Règlement d’origine, montant, motif et référence justificative obligatoires.')
      preserveFinancialRequest(key, body); setPending(body)
      await api.post('/payments/manual-refunds', body)
      forgetFinancialRequest(key, body.requestId); setPending(null); setAmount(''); await refunds.refetch(); await tenders.refetch()
    } catch (e: any) { setError(e.response?.data?.error || e.message || 'Résultat non confirmé. Référence conservée.') }
    finally { setBusy(false) }
  }
  async function receipt(id: string) {
    try {
      const r = await api.get(`/payments/manual-refunds/${id}/receipt`, { responseType: 'blob' }), url = URL.createObjectURL(r.data), a = document.createElement('a')
      a.href = url; a.download = `declaration-remboursement-${id}.html`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 60000)
    } catch { setError('Justificatif indisponible.') }
  }
  return <section aria-label="Remboursement déclaré" style={{ padding: 14, marginTop: 12, border: '1px solid #94a3b8', borderRadius: 10 }}>
    <h4>Remboursement espèces / carte déclaré</h4><p>Après remise effective des espèces ou contrôle du terminal autonome. Aucun appel bancaire. Une sortie espèces nécessite une caisse ouverte. Ne pas utiliser pour remplacer un remboursement prestataire incertain.</p>
    {(tenders.data?.some(t => t.availableCents > 0) || pending) && <form onSubmit={submit}>
      <fieldset disabled={busy || !!pending} style={{ border: 0, padding: 0 }}>
        <label style={label}>Règlement d’origine<select aria-label="Règlement remboursement déclaré" value={tenderId} onChange={e => setTender(e.target.value)} style={field}><option value="">Choisir</option>{tenders.data?.filter(t => t.availableCents > 0).map(t => <option key={t.id} value={t.id}>{t.method === 'CASH' ? 'Espèces' : 'Carte déclarée'} · {(t.availableCents / 100).toFixed(2)} € · {t.id.slice(-8)}</option>)}</select></label>
        <label style={label}>Montant déclaré (€)<input type="number" min="0.01" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} style={field} /></label>
        <label style={label}>Motif du remboursement<input minLength={5} maxLength={500} value={reason} onChange={e => setReason(e.target.value)} style={field} /></label>
        <label style={label}>Référence du justificatif<input minLength={3} maxLength={200} value={reference} onChange={e => setReference(e.target.value)} style={field} /></label>
      </fieldset>
      <button disabled={busy || tenders.isError || refunds.isError} style={{ padding: 12 }}>{pending ? 'Réessayer la même déclaration' : 'Enregistrer la déclaration de remboursement'}</button>
    </form>}
    {refunds.data?.map(r => <p key={r.id}>Déclaré, non confirmé par une banque : {(r.amountCents / 100).toFixed(2)} {r.currency} · {r.reference} <button onClick={() => void receipt(r.id)}>Justificatif de déclaration</button></p>)}
    {(tenders.isError || refunds.isError) && <p role="alert">Historique indisponible : aucune déclaration nouvelle autorisée.</p>}{error && <p role="alert">{error}</p>}
  </section>
}
const label: React.CSSProperties = { display: 'grid', gap: 5, margin: '10px 0' }
const field: React.CSSProperties = { width: '100%', boxSizing: 'border-box', padding: 10, minHeight: 44, border: '1px solid #94a3b8', borderRadius: 8 }
