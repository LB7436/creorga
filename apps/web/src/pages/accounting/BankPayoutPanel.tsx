import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'
import { useAuthStore } from '@/stores/authStore'
import { readFinancialRequest, preserveFinancialRequest, forgetFinancialRequest } from '@/lib/financial-request'
export default function BankPayoutPanel() {
  const company = useAuthStore(s => s.companyId), actor = useAuthStore(s => s.user?.id)
  return <Payouts key={`${company}:${actor}`} scope={`${company}:${actor}`} />
}
function Payouts({ scope }: { scope: string }) {
  const [open, setOpen] = useState(false), [json, setJson] = useState(''), [busy, setBusy] = useState(false), [error, setError] = useState('')
  const key = `creorga-financial-v1:payout-import:${scope}`
  const [pending, setPending] = useState<any>(() => { try { return readFinancialRequest(key) } catch { return { unreadable: true } } })
  const report = useQuery<any>({ queryKey: ['bank-payouts', scope], enabled: open, queryFn: () => api.get('/accounting/payouts').then(r => r.data) })
  async function submit(e: React.FormEvent) {
    e.preventDefault(); if (busy) return; setBusy(true); setError('')
    try {
      const parsed = readFinancialRequest(key) || { ...JSON.parse(json), requestId: crypto.randomUUID() }
      preserveFinancialRequest(key, parsed); setPending(parsed)
      await api.post('/accounting/payout-statements', parsed)
      forgetFinancialRequest(key, parsed.requestId); setPending(null); setJson(''); await report.refetch()
    } catch (e: any) {
      if (e.response?.status === 400) { localStorage.removeItem(key); setPending(null) }
      setError(e.response?.data?.error || e.message || 'Import non confirmé. Référence conservée ; réessayez le même relevé.')
    } finally { setBusy(false) }
  }
  return <section aria-label="Versements bancaires fictifs" style={{ border: '1px solid #64748b', borderRadius: 12, padding: 18, margin: '18px 0', overflowWrap: 'anywhere' }}>
    <button onClick={() => setOpen(!open)}>{open ? 'Masquer les versements fictifs' : 'Ouvrir les versements fictifs'}</button>
    {open && <><p>Laboratoire : relevés fictifs déclarés, sans banque connectée. La validation manuelle ne prouve pas un virement bancaire réel et ne crée ni vente, ni règlement client.</p>
      {report.isError && <p role="alert">Versements indisponibles. Aucun rapprochement validé.</p>}
      {report.data?.importEnabled ? <form onSubmit={submit}>
        <label style={{ display: 'grid', gap: 8 }}>Relevé fictif JSON<textarea aria-label="Relevé fictif JSON" rows={8} required={!pending} value={json} disabled={busy || !!pending} onChange={e => setJson(e.target.value)} style={{ width: '100%', boxSizing: 'border-box', maxWidth: '100%' }} /></label>
        <p>Format documenté dans VERSEMENTS-BANCAIRES.md. Montants en centimes entiers ; références uniques. Une différence reste non résolue.</p>
        <button disabled={busy || pending?.unreadable} type="submit">{pending ? 'Réessayer le même relevé' : 'Importer le relevé fictif'}</button>
      </form> : <p>Import fictif désactivé dans cet environnement.</p>}
      <button disabled={busy} onClick={() => void report.refetch()}>Actualiser les versements</button>
      {report.data?.payouts?.map((p: any) => <Payout key={p.id} payout={p} scope={scope} reload={() => report.refetch()} />)}
      {report.data?.payouts?.length === 0 && <p>Aucun versement importé.</p>}
    </>}{error && <p role="alert">{error}</p>}
  </section>
}
function Payout({ payout: p, scope, reload }: { payout: any; scope: string; reload: () => Promise<any> }) {
  const [reason, setReason] = useState(''), [busy, setBusy] = useState(false), [error, setError] = useState('')
  const [showHistory, setShowHistory] = useState(false)
  const history = useQuery<any[]>({ queryKey: ['payout-history', scope, p.id], enabled: showHistory, queryFn: () => api.get(`/accounting/payouts/${p.id}/history`).then(r => r.data) })
  const euro = (c: number | null) => c == null ? 'Inconnu' : (c / 100).toFixed(2) + ' ' + p.currency
  async function validate(e: React.FormEvent, action: 'validate' | 'refresh' = 'validate') {
    e.preventDefault(); if (busy) return; setBusy(true); setError('')
    const key = `creorga-financial-v1:payout-${action}:${scope}:${p.id}`
    try {
      const body = readFinancialRequest(key) || { requestId: crypto.randomUUID(), ...(action === 'validate' ? { expectedHash: p.reviewHash } : {}), reason }
      preserveFinancialRequest(key, body)
      await api.post(`/accounting/payouts/${p.id}/${action}`, body)
      forgetFinancialRequest(key, body.requestId); await reload(); if (showHistory) await history.refetch()
    } catch (e: any) { if (e.response?.status === 400 || e.response?.status === 409) localStorage.removeItem(key); setError(e.response?.data?.error || 'Validation non confirmée ; sa référence est conservée.') }
    finally { setBusy(false) }
  }
  return <article style={{ borderTop: '1px solid #94a3b8', marginTop: 18, paddingTop: 12 }}>
    <h3>{p.externalRef}</h3><p>{p.status}</p><p>Source : déclaration fictive. {p.provider} — {p.merchantId}</p>
    <dl><dt>Captures brutes</dt><dd>{euro(p.captureCents)}</dd><dt>Remboursements</dt><dd>{euro(p.refundCents)}</dd><dt>Frais déclarés</dt><dd>{euro(p.feesCents)}</dd><dt>Retenues / libérations déclarées</dt><dd>{euro(p.heldCents)} / {euro(p.releasedCents)}</dd><dt>Net calculé / relevé</dt><dd>{euro(p.computedNetCents)} / {euro(p.declaredNetCents)}</dd><dt>Reçu déclaré sur le relevé fictif</dt><dd>{euro(p.receivedCents)}</dd></dl>
    {p.unresolved.length > 0 && <p role="status">Non résolu : {p.unresolved.join(', ')}. Validation impossible sans rapprochement des pièces.</p>}
    {p.status !== 'VALIDATED' && <form onSubmit={e => void validate(e, p.unresolved.length ? 'refresh' : 'validate')}>
      <label>Motif validation versement<input aria-label="Motif validation versement" required minLength={5} maxLength={500} value={reason} disabled={busy} onChange={e => setReason(e.target.value)} style={{ width: '100%', boxSizing: 'border-box' }} /></label>
      <button disabled={busy} type="submit">{p.unresolved.length ? 'Relire les justificatifs sans forcer les écarts' : 'Valider manuellement le versement fictif'}</button>
    </form>}
    {p.status === 'VALIDATED' && <p>Rapprochement manuel fictif, pas une confirmation bancaire. Décision conservée avec ses preuves.</p>}
    <details><summary>Lignes et références rapprochées</summary>{p.lines.map((l: any) => <p key={l.id}>{l.kind} · {l.externalRef} · {euro(l.amountCents)} · {l.settlementId || l.refundId || 'Déclaration du relevé'}</p>)}</details>
    <button onClick={() => setShowHistory(!showHistory)}>Afficher les décisions du versement</button>
    {showHistory && <>{history.isError && <p role="alert">Preuves indisponibles.</p>}{history.data?.map(e => <details key={e.id}><summary>{e.snapshot.reason} · {new Date(e.createdAt).toLocaleString('fr-LU')}</summary><pre style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{JSON.stringify(e.snapshot, null, 2)}</pre></details>)}</>}
    {error && <p role="alert">{error}</p>}
  </article>
}
