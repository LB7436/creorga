import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'
import { moneyMinor } from '@/lib/money'
import { useAuthStore } from '@/stores/authStore'
import { readFinancialRequest, preserveFinancialRequest, forgetFinancialRequest } from '@/lib/financial-request'
import ManualRefundPanel from './ManualRefundPanel'

export default function CreditNotesPanel({ invoiceId, issued }: { invoiceId: string; issued: boolean }) {
  const companyId = useAuthStore(s => s.companyId), actorId = useAuthStore(s => s.user?.id)
  const key = `creorga-financial-v1:credit:${companyId}:${actorId}:${invoiceId}`
  const [pending, setPending] = useState<any>(() => { try { return JSON.parse(localStorage.getItem(key) || 'null') } catch { return null } })
  const [amount, setAmount] = useState(''), [reason, setReason] = useState(''), [busy, setBusy] = useState(false), [error, setError] = useState('')
  const credits = useQuery<any[]>({ queryKey: ['credit-notes', invoiceId], enabled: issued, queryFn: () => api.get(`/invoices/${invoiceId}/credit-notes`).then(r => r.data) })
  async function submit(e: React.FormEvent) {
    e.preventDefault(); if (busy) return; setBusy(true); setError('')
    try {
      const body = readFinancialRequest(key) || pending || { requestId: crypto.randomUUID(), reason: reason.trim(), ...(amount.trim() ? { amountCents: moneyMinor(amount) } : {}) }
      if (body.reason.length < 5 || body.amountCents === 0) throw new Error('Motif de cinq caractères et montant positif requis.')
      preserveFinancialRequest(key, body); setPending(body)
      await api.post(`/invoices/${invoiceId}/credit-notes`, body)
      forgetFinancialRequest(key, body.requestId); setPending(null); setAmount(''); setReason(''); await credits.refetch()
    } catch (e: any) { setError(e.response?.data?.message || e.message || 'Avoir non confirmé. Référence conservée.') }
    finally { setBusy(false) }
  }
  async function download(credit: any) {
    try {
      const r = await api.get(`/invoices/credit-notes/${credit.id}/pdf`, { responseType: 'blob' })
      if (!String(r.headers['content-type']).includes('application/pdf')) throw new Error('PDF non confirmé')
      const url = URL.createObjectURL(r.data), a = document.createElement('a'); a.href = url; a.download = `avoir-${credit.number}.pdf`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 60000)
    } catch { setError('Téléchargement de l’avoir impossible.') }
  }
  return <section role="region" aria-label="Avoirs de la facture" style={{ marginTop: 22, paddingTop: 16, borderTop: '1px solid #cbd5e1' }}>
    <h3>Avoirs de la facture</h3><p>Un avoir corrige le document sans le réécrire. Il ne rembourse pas automatiquement le client et ne remet rien en stock.</p>
    {!issued ? <p>Émettez l’original avant un avoir. Les documents historiques incomplets demandent une vérification.</p> : <>
      <form onSubmit={submit}>
        <fieldset disabled={busy || !!pending} style={{ border: 0, padding: 0 }}>
          <label style={label}>Montant à créditer (€)<input type="number" step="0.01" min="0.01" value={amount} onChange={e => setAmount(e.target.value)} placeholder="Vide : tout le solde encore créditable" style={field} /></label>
          <label style={label}>Motif de l’avoir<input required minLength={5} maxLength={500} value={reason} onChange={e => setReason(e.target.value)} style={field} /></label>
        </fieldset>
        <button type="submit" disabled={busy || credits.isError} style={{ padding: 12, marginTop: 8 }}>{busy ? 'Émission…' : pending ? 'Réessayer le même avoir' : 'Émettre l’avoir'}</button>
      </form>
      {pending && <p>Référence conservée : {pending.requestId}.</p>}
      {credits.isError && <p role="alert">Historique des avoirs indisponible : émission désactivée.</p>}
      {credits.data?.map(c => <div key={c.id} style={{ borderTop: '1px solid #e2e8f0', marginTop: 14, paddingTop: 10 }}>
        <strong>{c.number} · {(c.totalCents / 100).toFixed(2)} {c.currency}</strong><p>{c.reason} · Avoir émis, remboursement distinct.</p>
        <button type="button" onClick={() => void download(c)} style={{ padding: 10 }}>PDF de l’avoir {c.number}</button>
        <RefundPanel invoiceId={invoiceId} credit={c} />
        <ManualRefundPanel invoiceId={invoiceId} credit={c} />
      </div>)}
    </>}
    {error && <p role="alert" style={{ color: '#b91c1c' }}>{error}</p>}
  </section>
}
function RefundPanel({ invoiceId, credit }: { invoiceId: string; credit: any }) {
  const companyId = useAuthStore(s => s.companyId), actorId = useAuthStore(s => s.user?.id)
  const key = `creorga-financial-v1:refund:${companyId}:${actorId}:${credit.id}`
  const [pending, setPending] = useState<any>(() => { try { return JSON.parse(localStorage.getItem(key) || 'null') } catch { return null } })
  const [amount, setAmount] = useState(''), [settlementId, setSettlementId] = useState(''), [error, setError] = useState(''), [busy, setBusy] = useState(false)
  const captures = useQuery<any[]>({ queryKey: ['settlements', invoiceId], queryFn: () => api.get('/payments/settlements', { params: { invoiceId } }).then(r => r.data) })
  const refunds = useQuery<any[]>({ queryKey: ['refunds', credit.id], queryFn: () => api.get('/payments/refunds', { params: { creditNoteId: credit.id } }).then(r => r.data) })
  const available = captures.data?.filter(s => s.refundEnabled && s.availableCents > 0) || []
  async function submit(e: React.FormEvent) {
    e.preventDefault(); if (busy) return; setBusy(true); setError('')
    try {
      const body = readFinancialRequest(key) || pending || { requestId: crypto.randomUUID(), creditNoteId: credit.id, settlementId, amountCents: moneyMinor(amount), reason: `Remboursement de l’avoir ${credit.number}` }
      if (body.amountCents <= 0 || !body.settlementId) throw new Error('Choisissez la capture et un montant positif.')
      preserveFinancialRequest(key, body); setPending(body)
      await api.post('/payments/refunds', body)
      forgetFinancialRequest(key, body.requestId); setPending(null); await refunds.refetch(); await captures.refetch()
    } catch (e: any) { setError(e.response?.data?.error || e.message || 'Remboursement non confirmé, référence conservée.') }
    finally { setBusy(false) }
  }
  async function reconcile(id: string) {
    if (busy) return; setBusy(true); setError('')
    try { await api.post(`/payments/refunds/${id}/reconcile`); await refunds.refetch() }
    catch (e: any) { setError(e.response?.data?.error || 'Vérification non confirmée.') }
    finally { setBusy(false) }
  }
  return <div style={{ marginTop: 12 }}>
    {available.length > 0 || pending ? <form onSubmit={submit}>
      <fieldset disabled={busy || !!pending} style={{ border: 0, padding: 0 }}>
        <label style={label}>Capture à rembourser<select aria-label="Capture à rembourser" value={settlementId} onChange={e => setSettlementId(e.target.value)} style={field}><option value="">Choisir une capture vérifiée</option>{available.map(s => <option key={s.id} value={s.id}>{s.provider} · {(s.availableCents / 100).toFixed(2)} {s.currency} disponibles</option>)}</select></label>
        <label style={label}>Montant du remboursement (€)<input required type="number" min="0.01" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} style={field} /></label>
      </fieldset>
      <button disabled={busy} type="submit" style={{ padding: 10 }}>{pending ? 'Réessayer la même demande' : 'Demander le remboursement PayPal'}</button>
    </form> : <p>Aucune capture PayPal remboursable et configurée pour ce document. L’avoir seul ne prouve aucun remboursement.</p>}
    {refunds.data?.map(r => <p key={r.id}>{r.status === 'SUCCEEDED' ? 'Remboursement confirmé par preuve prestataire' : r.status === 'REFUSED_RECONCILIATION' ? 'Refus prestataire — réservation conservée, à rapprocher' : `Remboursement ${r.status} — non confirmé, réservation conservée`} · {(r.amountCents / 100).toFixed(2)} {r.currency} {r.status !== 'SUCCEEDED' && r.externalId && <button disabled={busy} onClick={() => void reconcile(r.id)}>Vérifier auprès du prestataire</button>}</p>)}
    {(captures.isError || refunds.isError) && <p role="alert">Historique de rapprochement indisponible.</p>}{error && <p role="alert">{error}</p>}
  </div>
}
const label: React.CSSProperties = { display: 'grid', gap: 5, margin: '10px 0' }
const field: React.CSSProperties = { width: '100%', boxSizing: 'border-box', padding: 10, minHeight: 44, border: '1px solid #94a3b8', borderRadius: 8 }
