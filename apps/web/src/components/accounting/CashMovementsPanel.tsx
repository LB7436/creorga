import { useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import { moneyMinor } from '@/lib/money'
import { useAuthStore } from '@/stores/authStore'
import { readFinancialRequest, preserveFinancialRequest, forgetFinancialRequest } from '@/lib/financial-request'
export default function CashMovementsPanel({ drawerId }: { drawerId: string }) {
  const actorId = useAuthStore(s => s.user?.id), companyId = useAuthStore(s => s.companyId), qc = useQueryClient()
  const key = `creorga-financial-v1:movement:${companyId}:${actorId}:${drawerId}`
  const [pending, setPending] = useState<any>(() => { try { return JSON.parse(localStorage.getItem(key) || 'null') } catch { return null } })
  const [amount, setAmount] = useState(''), [direction, setDirection] = useState('OUT'), [reason, setReason] = useState(''), [busy, setBusy] = useState(false), [error, setError] = useState('')
  const report = useQuery<any>({ queryKey: ['cash-ledger', drawerId], queryFn: () => api.get(`/accounting/cash-drawers/${drawerId}/report`).then(r => r.data) })
  async function submit(e: React.FormEvent) {
    e.preventDefault(); if (busy) return; setBusy(true); setError('')
    try {
      const body = readFinancialRequest(key) || pending || { requestId: crypto.randomUUID(), direction, amountCents: moneyMinor(amount), reason: reason.trim() }
      if (body.amountCents <= 0 || body.reason.length < 5) throw new Error('Montant positif et motif de cinq caractères requis.')
      preserveFinancialRequest(key, body); setPending(body)
      await api.post(`/accounting/cash-drawers/${drawerId}/movements`, body)
      forgetFinancialRequest(key, body.requestId); setPending(null); setAmount(''); setReason(''); void qc.invalidateQueries({ queryKey: ['cash-ledger'] })
    } catch (e: any) { setError(e.response?.data?.message || e.message || 'Mouvement non confirmé. Référence conservée.') }
    finally { setBusy(false) }
  }
  return <section role="region" aria-label="Mouvements de caisse" style={{ padding: 18, border: '1px solid #cbd5e1', borderRadius: 14, marginBottom: 18 }}>
    <h2>Mouvements de caisse</h2>
    {report.data && <p>Espèces théoriques : {(report.data.expectedCents / 100).toFixed(2)} € · Les règlements partiels sont inclus, sans compter les cartes dans le tiroir.</p>}
    {report.isError && <p role="alert">Rapport de caisse indisponible.</p>}
    <form onSubmit={submit}>
      <fieldset disabled={busy || !!pending} style={{ border: 0, padding: 0 }}>
        <label style={label}>Sens du mouvement<select aria-label="Sens du mouvement" style={field} value={direction} onChange={e => setDirection(e.target.value)}><option value="OUT">Sortie vers coffre ou banque</option><option value="IN">Entrée complémentaire</option></select></label>
        <label style={label}>Montant du mouvement (€)<input required type="number" min="0.01" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} style={field} /></label>
        <label style={label}>Motif du mouvement<input required minLength={5} value={reason} onChange={e => setReason(e.target.value)} style={field} /></label>
      </fieldset>
      <button disabled={busy || report.isError} type="submit" style={{ padding: 12 }}>{busy ? 'Vérification…' : pending ? 'Réessayer le même mouvement' : 'Enregistrer le mouvement'}</button>
    </form>
    {pending && <p>Référence conservée : {pending.requestId}.</p>}{error && <p role="alert">{error}</p>}
    <ul>{report.data?.movements.map((m: any) => <li key={m.id}>{m.direction} · {(m.amountCents / 100).toFixed(2)} € · {m.reason}</li>)}</ul>
  </section>
}
const label: React.CSSProperties = { display: 'grid', gap: 5, margin: '10px 0' }
const field: React.CSSProperties = { width: '100%', minHeight: 44, boxSizing: 'border-box', padding: 10, border: '1px solid #94a3b8', borderRadius: 8 }
