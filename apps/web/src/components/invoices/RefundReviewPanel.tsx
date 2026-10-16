import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import api from '@/lib/api'
import { readFinancialRequest, preserveFinancialRequest, forgetFinancialRequest } from '@/lib/financial-request'
export default function RefundReviewPanel({ refund: r, scope, reload }: { refund: any; scope: string; reload: () => Promise<any> }) {
  const [open, setOpen] = useState(false), [reason, setReason] = useState(''), [reference, setReference] = useState(''), [busy, setBusy] = useState(false), [error, setError] = useState('')
  const history = useQuery<any[]>({ queryKey: ['refund-review', scope, r.id], enabled: open, queryFn: () => api.get(`/payments/refunds/${r.id}/history`).then(res => res.data) })
  async function decide(action: string) {
    if (busy) return; setBusy(true); setError('')
    const key = `creorga-financial-v1:refund-review:${scope}:${r.id}:${action}`
    try {
      const body = readFinancialRequest(key) || { requestId: crypto.randomUUID(), action, reason, ...(action === 'ASSOCIATE_REFERENCE' ? { externalId: reference.trim() } : {}) }
      preserveFinancialRequest(key, body)
      await api.post(`/payments/refunds/${r.id}/review`, body)
      forgetFinancialRequest(key, body.requestId); await reload(); if (open) await history.refetch()
    } catch (e: any) {
      // Une décision explicitement refusée ne rembourse ni ne libère rien.
      if (e.response?.status === 400 || e.response?.status === 409) localStorage.removeItem(key)
      setError(e.response?.data?.error || 'Décision non confirmée ; référence conservée pour la reprise.')
    } finally { setBusy(false) }
  }
  return <section aria-label={`Rapprochement remboursement ${r.id}`} style={{ padding: 12, border: '1px solid #94a3b8', borderRadius: 8, margin: '12px 0', overflowWrap: 'anywhere' }}>
    <p>{r.status} · {r.reservationHeld ? 'Réservation conservée' : 'Absence de remboursement rapprochée — réservation libérée'} · Référence {r.externalId || 'inconnue'}</p>
    {r.status !== 'SUCCEEDED' && r.reservationHeld && <>
      <label>Motif décision remboursement<input aria-label="Motif décision remboursement" minLength={5} maxLength={500} value={reason} disabled={busy} onChange={e => setReason(e.target.value)} style={{ width: '100%', boxSizing: 'border-box' }} /></label>
      <button disabled={busy || reason.trim().length < 5} onClick={() => void decide('KEEP_RESERVED')}>Conserver la réservation et journaliser</button>
      {!r.externalId && <><p>Recherchez la référence avec la clé du dossier prestataire. Une référence candidate sera relue et sa liaison à cette demande vérifiée côté serveur. Sans preuve, aucune association ni libération.</p>
        <label>Référence prestataire candidate<input aria-label="Référence prestataire candidate" value={reference} maxLength={200} disabled={busy} onChange={e => setReference(e.target.value)} /></label>
        <button disabled={busy || reason.trim().length < 5 || !reference.trim()} onClick={() => void decide('ASSOCIATE_REFERENCE')}>Vérifier et associer la référence candidate</button></>}
      {r.status === 'REFUSED_RECONCILIATION' && <><p>Une nouvelle relecture exacte du refus terminal est obligatoire. Un timeout, un 404 ou ce bouton seul ne libère rien.</p>
        <button disabled={busy || reason.trim().length < 5} onClick={() => { if (window.confirm('Rapprocher l’absence de remboursement avec une nouvelle preuve prestataire ? Aucun remboursement ne sera envoyé.')) void decide('RELEASE_NOT_REFUNDED') }}>Vérifier le refus terminal et libérer si prouvé</button></>}
    </>}
    <button onClick={() => setOpen(!open)}>{open ? 'Masquer les preuves et décisions' : 'Afficher les preuves et décisions'}</button>
    {open && <>{history.isError && <p role="alert">Historique indisponible.</p>}{history.data?.map(e => <details key={e.id}><summary><span>{e.action}</span> · {new Date(e.createdAt).toLocaleString('fr-LU')}</summary><pre style={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>{JSON.stringify(e.snapshot, null, 2)}</pre></details>)}</>}
    {error && <p role="alert">{error}</p>}
  </section>
}
