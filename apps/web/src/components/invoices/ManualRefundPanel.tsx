import { useEffect, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import api, { assertAuthScope } from '@/lib/api'
import { authDataScope } from '@/lib/authScope'
import { moneyMinor } from '@/lib/money'
import { useAuthStore } from '@/stores/authStore'
import { readFinancialRequest, preserveFinancialRequest, forgetFinancialRequest } from '@/lib/financial-request'
export default function ManualRefundPanel({ invoiceId, credit }: { invoiceId: string; credit: any }) {
  const scope = useAuthStore(authDataScope)
  return <ScopedManualRefundPanel key={JSON.stringify([scope, invoiceId, credit.id, credit.invoiceId, credit.currency])} invoiceId={invoiceId} credit={credit} scope={scope} />
}
type Refusal = { body: any; proof: Record<string, any> }
function ScopedManualRefundPanel({ invoiceId, credit, scope }: { invoiceId: string; credit: any; scope: string }) {
  const auth = useAuthStore.getState(), company = auth.companyId, actor = auth.user?.id
  const allowed = auth.isAuthenticated && !auth.logoutRevocationPending && !!company && !!actor && ['owner', 'manager'].includes(auth.role) && credit.invoiceId === invoiceId
  const key = `creorga-financial-v1:manual-refund:${company}:${actor}:${credit.id}`
  const [initial] = useState(() => { try { return { body: readFinancialRequest(key), error: '' } } catch (e) { return { body: null, error: e instanceof Error ? e.message : 'Référence locale illisible : vérification nécessaire.' } } })
  const [amount, setAmount] = useState(() => Number.isSafeInteger(initial.body?.amountCents) ? (initial.body.amountCents / 100).toFixed(2) : '')
  const [reason, setReason] = useState(() => typeof initial.body?.reason === 'string' ? initial.body.reason : '')
  const [reference, setReference] = useState(() => typeof initial.body?.reference === 'string' ? initial.body.reference : '')
  const [tenderId, setTender] = useState(() => typeof initial.body?.tenderId === 'string' ? initial.body.tenderId : '')
  const [busy, setBusy] = useState(false), [error, setError] = useState(initial.error), [pending, setPending] = useState<any>(initial.body)
  const [refusal, setRefusal] = useState<Refusal | null>(null), [notice, setNotice] = useState('')
  const busyRef = useRef(false), mounted = useRef(true)
  useEffect(() => { mounted.current = true; return () => { mounted.current = false } }, [])
  const isCurrent = () => mounted.current && allowed && scope === authDataScope(useAuthStore.getState())
  const tenders = useQuery<any[]>({ queryKey: ['manual-tenders', company, actor, invoiceId, scope], enabled: allowed,
    queryFn: async () => { assertAuthScope(scope); const result = await api.get('/payments/manual-tenders', { params: { invoiceId } }); assertAuthScope(scope); return result.data } })
  const refunds = useQuery<any[]>({ queryKey: ['manual-refunds', company, actor, invoiceId, credit.id, scope], enabled: allowed,
    queryFn: async () => { assertAuthScope(scope); const result = await api.get('/payments/manual-refunds', { params: { creditNoteId: credit.id } }); assertAuthScope(scope); return result.data } })
  function exactNotRecordedProof(e: any, body: any): Refusal['proof'] | null {
    const p = e?.response?.data
    if (e?.response?.status !== 409 || p?.code !== 'MANUAL_REFUND_AMOUNT_EXCEEDS_AVAILABLE' || p.outcome !== 'NOT_RECORDED' || p.reservationPolicy !== 'UNCHANGED'
      || !body || p.requestId !== body.requestId || p.companyId !== company || p.actorId !== actor || p.invoiceId !== invoiceId || p.creditNoteId !== credit.id || body.creditNoteId !== credit.id
      || p.tenderId !== body.tenderId || p.method !== body.method || !['CASH', 'CARD'].includes(body.method) || p.currency !== credit.currency
      || !Number.isSafeInteger(body.amountCents) || body.amountCents <= 0 || p.amountCents !== body.amountCents
      || typeof body.reason !== 'string' || p.reason !== body.reason.trim() || typeof body.reference !== 'string' || p.reference !== body.reference.trim()
      || ![p.creditLimitCents, p.tenderAvailableCents, p.providerReservedCents].every(n => Number.isSafeInteger(n) && n >= 0)
      || !Number.isSafeInteger(p.creditAvailableCents) || p.creditAvailableCents !== p.creditLimitCents - p.providerReservedCents) return null
    const aboveTender = body.amountCents > p.tenderAvailableCents, aboveCredit = body.amountCents > p.creditLimitCents
    const basis = aboveTender && aboveCredit ? 'BOTH_LIMITS' : aboveTender ? 'TENDER_LIMIT' : aboveCredit ? 'CREDIT_LIMIT_EXCLUDING_PROVIDER_RESERVATIONS' : null
    // Une insuffisance due uniquement à une réservation prestataire n'est pas
    // une preuve autorisant à remplacer la demande manuelle conservée.
    return basis && p.rejectionBasis === basis ? p : null
  }
  async function submit(e: React.FormEvent) {
    e.preventDefault(); if (busyRef.current || !isCurrent() || initial.error || tenders.isError || refunds.isError) return
    busyRef.current = true; setBusy(true); setError(''); setRefusal(null); setNotice('')
    let body: any
    try {
      assertAuthScope(scope)
      const tender = tenders.data?.find(t => t.id === tenderId)
      body = readFinancialRequest(key) || pending || { requestId: crypto.randomUUID(), creditNoteId: credit.id, tenderId, method: tender?.method, amountCents: moneyMinor(amount), reason: reason.trim(), reference: reference.trim() }
      if (body.creditNoteId !== credit.id || !['CASH', 'CARD'].includes(body.method) || typeof body.tenderId !== 'string' || !body.tenderId
        || !Number.isSafeInteger(body.amountCents) || body.amountCents <= 0 || typeof body.reason !== 'string' || body.reason.trim().length < 5 || typeof body.reference !== 'string' || body.reference.trim().length < 3) throw new Error('Règlement d’origine, montant, motif et référence justificative obligatoires dans le contexte de cet avoir.')
      preserveFinancialRequest(key, body); setPending(body)
      assertAuthScope(scope)
      await api.post('/payments/manual-refunds', body)
      if (!isCurrent()) return
      if (JSON.stringify(readFinancialRequest(key)) !== JSON.stringify(body)) throw new Error('La référence locale a changé. Elle reste conservée pour vérification.')
      forgetFinancialRequest(key, body.requestId); setPending(null); setAmount(''); await refunds.refetch(); await tenders.refetch()
    } catch (e: any) {
      if (isCurrent()) {
        setError(e?.response?.data?.error || e?.message || 'Résultat non confirmé. Référence conservée.')
        const proof = exactNotRecordedProof(e, body)
        if (proof) setRefusal({ body, proof })
      }
    } finally { busyRef.current = false; if (isCurrent()) setBusy(false) }
  }
  function editRefusedDeclaration() {
    if (busyRef.current || !isCurrent() || !refusal) return
    try {
      if (JSON.stringify(readFinancialRequest(key)) !== JSON.stringify(refusal.body)) throw new Error('Une autre demande attend une vérification. Sa référence reste conservée.')
      const historyKey = `${key}:refused:${refusal.body.requestId}`, saved = localStorage.getItem(historyKey)
      if (saved !== null) {
        const previous = JSON.parse(saved)
        if (JSON.stringify(previous.body) !== JSON.stringify(refusal.body) || JSON.stringify(previous.proof) !== JSON.stringify(refusal.proof)) throw new Error('La trace locale de refus diffère : vérification nécessaire, référence conservée.')
      } else {
        // Copie locale append-only de reprise, jamais preuve bancaire ni audit
        // serveur infalsifiable. Aucune réservation prestataire n'est modifiée.
        localStorage.setItem(historyKey, JSON.stringify({ ...refusal, observedAt: new Date().toISOString() }))
      }
      if (!isCurrent()) return
      if (JSON.stringify(readFinancialRequest(key)) !== JSON.stringify(refusal.body)) throw new Error('La référence locale a changé pendant la conservation de la preuve.')
      forgetFinancialRequest(key, refusal.body.requestId)
      setAmount((refusal.body.amountCents / 100).toFixed(2)); setReason(refusal.body.reason); setReference(refusal.body.reference); setTender(refusal.body.tenderId)
      setPending(null); setRefusal(null); setError('')
      setNotice(`Déclaration refusée ${refusal.body.requestId} conservée localement. La prochaine déclaration utilisera une nouvelle référence, sans nouvelle remise d’argent ni libération de réservation. Cette trace ne remplace pas le journal serveur.`)
    } catch (e) { if (isCurrent()) setError(e instanceof Error ? e.message : 'Preuve locale non conservée : référence active inchangée.') }
  }
  async function receipt(id: string) {
    if (!isCurrent()) return
    try {
      assertAuthScope(scope)
      const r = await api.get(`/payments/manual-refunds/${id}/receipt`, { responseType: 'blob' })
      if (!isCurrent()) return
      const url = URL.createObjectURL(r.data), a = document.createElement('a')
      a.href = url; a.download = `declaration-remboursement-${id}.html`; a.click(); setTimeout(() => URL.revokeObjectURL(url), 60000)
    } catch { if (isCurrent()) setError('Justificatif indisponible.') }
  }
  return <section aria-label="Remboursement déclaré" style={{ padding: 14, marginTop: 12, border: '1px solid #94a3b8', borderRadius: 10 }}>
    <h4>Remboursement espèces / carte déclaré</h4><p>Après remise effective des espèces ou contrôle du terminal autonome. Aucun appel bancaire. Une sortie espèces nécessite une caisse ouverte. Ne pas utiliser pour remplacer un remboursement prestataire incertain.</p>
    {!allowed ? <p>Accès réservé au propriétaire ou au responsable connecté, pour un avoir de la facture affichée.</p> : <>
    {(tenders.data?.some(t => t.availableCents > 0) || pending) && <form onSubmit={submit}>
      <fieldset disabled={busy || !!pending || !!initial.error} style={{ border: 0, padding: 0 }}>
        <label style={label}>Règlement d’origine<select aria-label="Règlement remboursement déclaré" value={tenderId} onChange={e => setTender(e.target.value)} style={field}><option value="">Choisir</option>{tenders.data?.filter(t => t.availableCents > 0).map(t => <option key={t.id} value={t.id}>{t.method === 'CASH' ? 'Espèces' : 'Carte déclarée'} · {(t.availableCents / 100).toFixed(2)} € · {t.id.slice(-8)}</option>)}</select></label>
        <label style={label}>Montant déclaré (€)<input type="number" min="0.01" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} style={field} /></label>
        <label style={label}>Motif du remboursement<input minLength={5} maxLength={500} value={reason} onChange={e => setReason(e.target.value)} style={field} /></label>
        <label style={label}>Référence du justificatif<input minLength={3} maxLength={200} value={reference} onChange={e => setReference(e.target.value)} style={field} /></label>
      </fieldset>
      <button disabled={busy || tenders.isError || refunds.isError || !!initial.error} style={{ padding: 12 }}>{pending ? 'Réessayer la même déclaration' : 'Enregistrer la déclaration de remboursement'}</button>
    </form>}
    {pending && <p>Référence de déclaration conservée : {pending.requestId}.</p>}
    {refusal && <div style={{ border: '1px solid #94a3b8', borderRadius: 8, padding: 12, marginTop: 10 }}>
      <p>Cette demande n’a créé aucune déclaration ni sortie de caisse dans CréOrga. Ce refus ne prouve pas que l’argent n’a pas déjà été remis ou remboursé hors du logiciel. Vérifiez les remises et justificatifs : aucune nouvelle remise d’argent ne doit être déclenchée par cette correction. Les réservations prestataire restent inchangées.</p>
      <button type="button" disabled={busy} onClick={editRefusedDeclaration} style={{ padding: 12 }}>Modifier la déclaration refusée</button>
    </div>}
    {notice && <p role="status">{notice}</p>}
    {refunds.data?.map(r => <p key={r.id}>Déclaré, non confirmé par une banque : {(r.amountCents / 100).toFixed(2)} {r.currency} · {r.reference} <button onClick={() => void receipt(r.id)}>Justificatif de déclaration</button></p>)}
    {(tenders.isError || refunds.isError) && <p role="alert">Historique indisponible : aucune déclaration nouvelle autorisée.</p>}
    </>}{error && <p role="alert">{error}</p>}
  </section>
}
const label: React.CSSProperties = { display: 'grid', gap: 5, margin: '10px 0' }
const field: React.CSSProperties = { width: '100%', boxSizing: 'border-box', padding: 10, minHeight: 44, border: '1px solid #94a3b8', borderRadius: 8 }
