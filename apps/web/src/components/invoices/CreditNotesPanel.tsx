import { useEffect, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import api, { assertAuthScope } from '@/lib/api'
import { authDataScope } from '@/lib/authScope'
import { moneyMinor } from '@/lib/money'
import { useAuthStore } from '@/stores/authStore'
import { readFinancialRequest, preserveFinancialRequest, forgetFinancialRequest } from '@/lib/financial-request'
import ManualRefundPanel from './ManualRefundPanel'
import RefundReviewPanel from './RefundReviewPanel'

export default function CreditNotesPanel({ invoiceId, issued }: { invoiceId: string; issued: boolean }) {
  const scope = useAuthStore(authDataScope)
  return <ScopedCreditNotesPanel key={JSON.stringify([scope, invoiceId, issued])} invoiceId={invoiceId} issued={issued} scope={scope} />
}

type Refusal = { body: any; proof: { code: string; outcome: string; requestId: string; companyId: string; actorId: string; invoiceId: string; amountCents: number; availableCents: number; reason: string } }
function ScopedCreditNotesPanel({ invoiceId, issued, scope }: { invoiceId: string; issued: boolean; scope: string }) {
  const auth = useAuthStore.getState(), companyId = auth.companyId, actorId = auth.user?.id
  const allowed = auth.isAuthenticated && !auth.logoutRevocationPending && !!companyId && !!actorId && ['owner', 'manager'].includes(auth.role)
  const key = `creorga-financial-v1:credit:${companyId}:${actorId}:${invoiceId}`
  const [initial] = useState(() => { try { return { body: readFinancialRequest(key), error: '' } } catch (e) { return { body: null, error: e instanceof Error ? e.message : 'Référence locale illisible : vérification nécessaire.' } } })
  const [pending, setPending] = useState<any>(initial.body)
  const [amount, setAmount] = useState(() => Number.isSafeInteger(initial.body?.amountCents) ? (initial.body.amountCents / 100).toFixed(2) : '')
  const [reason, setReason] = useState(() => typeof initial.body?.reason === 'string' ? initial.body.reason : '')
  const [busy, setBusy] = useState(false), [error, setError] = useState(initial.error), [refusal, setRefusal] = useState<Refusal | null>(null), [notice, setNotice] = useState('')
  const busyRef = useRef(false), mounted = useRef(true)
  useEffect(() => { mounted.current = true; return () => { mounted.current = false } }, [])
  const isCurrent = () => mounted.current && scope === authDataScope(useAuthStore.getState()) && allowed
  const credits = useQuery<any[]>({ queryKey: ['credit-notes', companyId, actorId, invoiceId, scope], enabled: issued && allowed,
    queryFn: async () => { assertAuthScope(scope); const result = await api.get(`/invoices/${invoiceId}/credit-notes`); assertAuthScope(scope); return result.data } })
  function exactNotIssuedProof(e: any, body: any): Refusal['proof'] | null {
    const proof = e.response?.data
    return e.response?.status === 409 && proof?.code === 'CREDIT_AMOUNT_EXCEEDS_AVAILABLE' && proof.outcome === 'NOT_ISSUED'
      && proof.requestId === body?.requestId && proof.companyId === companyId && proof.actorId === actorId && proof.invoiceId === invoiceId
      && Number.isSafeInteger(body?.amountCents) && body.amountCents > 0 && proof.amountCents === body.amountCents
      && Number.isSafeInteger(proof.availableCents) && proof.availableCents >= 0 && proof.availableCents < proof.amountCents
      && typeof body.reason === 'string' && proof.reason === body.reason.trim() ? proof : null
  }
  async function submit(e: React.FormEvent) {
    e.preventDefault(); if (busyRef.current || !isCurrent() || !issued || initial.error || credits.isError) return
    busyRef.current = true; setBusy(true); setError(''); setRefusal(null); setNotice('')
    let body: any
    try {
      assertAuthScope(scope)
      body = readFinancialRequest(key) || pending || { requestId: crypto.randomUUID(), reason: reason.trim(), ...(amount.trim() ? { amountCents: moneyMinor(amount) } : {}) }
      if (typeof body.reason !== 'string' || body.reason.trim().length < 5 || (body.amountCents !== undefined && (!Number.isSafeInteger(body.amountCents) || body.amountCents <= 0))) throw new Error('Motif de cinq caractères et montant positif requis.')
      preserveFinancialRequest(key, body); setPending(body)
      assertAuthScope(scope)
      await api.post(`/invoices/${invoiceId}/credit-notes`, body)
      if (!isCurrent()) return
      if (JSON.stringify(readFinancialRequest(key)) !== JSON.stringify(body)) throw new Error('La référence locale a changé. Elle reste conservée pour vérification.')
      forgetFinancialRequest(key, body.requestId); setPending(null); setAmount(''); setReason(''); await credits.refetch()
    } catch (e: any) {
      if (isCurrent()) {
        setError(e.response?.data?.message || e.message || 'Avoir non confirmé. Référence conservée.')
        const proof = exactNotIssuedProof(e, body)
        if (proof) setRefusal({ body, proof })
      }
    } finally { busyRef.current = false; if (isCurrent()) setBusy(false) }
  }
  function editRefusedRequest() {
    if (busyRef.current || !isCurrent() || !refusal) return
    try {
      const active = readFinancialRequest(key)
      if (JSON.stringify(active) !== JSON.stringify(refusal.body)) throw new Error('Une autre demande attend une vérification. Sa référence reste conservée.')
      const historyKey = `${key}:refused:${refusal.body.requestId}`, saved = localStorage.getItem(historyKey)
      if (saved !== null) {
        const previous = JSON.parse(saved)
        if (JSON.stringify(previous.body) !== JSON.stringify(refusal.body) || JSON.stringify(previous.proof) !== JSON.stringify(refusal.proof)) throw new Error('La trace locale de refus diffère : vérification nécessaire, référence conservée.')
      } else {
        // Copie locale append-only de reprise, pas un audit serveur infalsifiable.
        localStorage.setItem(historyKey, JSON.stringify({ ...refusal, observedAt: new Date().toISOString() }))
      }
      if (!isCurrent()) return
      if (JSON.stringify(readFinancialRequest(key)) !== JSON.stringify(refusal.body)) throw new Error('La référence locale a changé pendant la conservation de la preuve.')
      forgetFinancialRequest(key, refusal.body.requestId)
      setAmount((refusal.proof.amountCents / 100).toFixed(2)); setReason(refusal.body.reason); setPending(null); setRefusal(null); setError('')
      setNotice(`Demande refusée ${refusal.body.requestId} conservée localement. La prochaine émission utilisera une nouvelle référence. Cette trace ne remplace pas le journal serveur.`)
    } catch (e) { if (isCurrent()) setError(e instanceof Error ? e.message : 'Preuve locale non conservée : référence active inchangée.') }
  }
  async function download(credit: any) {
    if (!isCurrent()) return
    try {
      assertAuthScope(scope)
      const r = await api.get(`/invoices/credit-notes/${credit.id}/pdf`, { responseType: 'blob' })
      if (!isCurrent()) return
      if (!String(r.headers['content-type']).includes('application/pdf')) throw new Error('PDF non confirmé')
      const url = URL.createObjectURL(r.data), a = document.createElement('a'); a.href = url; a.download = `avoir-${credit.number}.pdf`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 60000)
    } catch { if (isCurrent()) setError('Téléchargement de l’avoir impossible.') }
  }
  return <section role="region" aria-label="Avoirs de la facture" style={{ marginTop: 22, paddingTop: 16, borderTop: '1px solid #cbd5e1' }}>
    <h3>Avoirs de la facture</h3><p>Un avoir corrige le document sans le réécrire. Il ne rembourse pas automatiquement le client et ne remet rien en stock.</p>
    {!allowed ? <p>Accès réservé au propriétaire ou au responsable connecté à cette société.</p> : !issued ? <p>Émettez l’original avant un avoir. Les documents historiques incomplets demandent une vérification.</p> : <>
      <form onSubmit={submit}>
        <fieldset disabled={busy || !!pending || !!initial.error} style={{ border: 0, padding: 0 }}>
          <label style={label}>Montant à créditer (€)<input type="number" step="0.01" min="0.01" value={amount} onChange={e => setAmount(e.target.value)} placeholder="Vide : tout le solde encore créditable" style={field} /></label>
          <label style={label}>Motif de l’avoir<input required minLength={5} maxLength={500} value={reason} onChange={e => setReason(e.target.value)} style={field} /></label>
        </fieldset>
        <button type="submit" disabled={busy || credits.isError || !!initial.error} style={{ padding: 12, marginTop: 8 }}>{busy ? 'Émission…' : pending ? 'Réessayer le même avoir' : 'Émettre l’avoir'}</button>
      </form>
      {pending && <p>Référence conservée : {pending.requestId}.</p>}
      {refusal && <div style={{ border: '1px solid #94a3b8', borderRadius: 8, padding: 12, marginTop: 10 }}>
        <p>Le serveur a refusé cette demande précise avant émission : aucun avoir émis pour cette demande. Le solde peut avoir évolué depuis ce contrôle.</p>
        <button type="button" disabled={busy} onClick={editRefusedRequest} style={{ padding: 12 }}>Modifier la demande refusée</button>
      </div>}
      {notice && <p role="status">{notice}</p>}
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
    {refunds.data?.map(r => <div key={`${companyId}:${actorId}:${r.id}`}><p>{r.status === 'SUCCEEDED' ? 'Remboursement confirmé par preuve prestataire' : r.status === 'NOT_REFUNDED' ? 'Absence de remboursement rapprochée, réservation libérée' : `Remboursement ${r.status} — non confirmé, réservation conservée`} · {(r.amountCents / 100).toFixed(2)} {r.currency} {r.status !== 'SUCCEEDED' && r.externalId && <button disabled={busy} onClick={() => void reconcile(r.id)}>Vérifier auprès du prestataire</button>}</p>
      <RefundReviewPanel refund={r} scope={`${companyId}:${actorId}`} reload={async () => { await refunds.refetch(); await captures.refetch() }} /></div>)}
    {(captures.isError || refunds.isError) && <p role="alert">Historique de rapprochement indisponible.</p>}{error && <p role="alert">{error}</p>}
  </div>
}
const label: React.CSSProperties = { display: 'grid', gap: 5, margin: '10px 0' }
const field: React.CSSProperties = { width: '100%', boxSizing: 'border-box', padding: 10, minHeight: 44, border: '1px solid #94a3b8', borderRadius: 8 }
