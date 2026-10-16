import { useEffect, useState } from 'react'
import { useQuery, useQueryClient } from '@tanstack/react-query'
import api from '@/lib/api'
import { moneyMinor } from '@/lib/money'
import { useAuthStore } from '@/stores/authStore'
import { readFinancialRequest, preserveFinancialRequest, forgetFinancialRequest } from '@/lib/financial-request'

export default function OrderPaymentsPanel() {
  const companyId = useAuthStore(s => s.companyId), actorId = useAuthStore(s => s.user?.id)
  const qc = useQueryClient(), [orderId, setOrderId] = useState(''), [amount, setAmount] = useState(''), [method, setMethod] = useState('CASH')
  const [cash, setCash] = useState(''), [received, setReceived] = useState(''), [pending, setPending] = useState<any>(null), [busy, setBusy] = useState(false), [error, setError] = useState('')
  const key = `creorga-financial-v1:payment:${companyId}:${actorId}:${orderId}`
  const orders = useQuery<any[]>({ queryKey: ['orders', 'financial'], queryFn: () => api.get('/orders').then(r => r.data) })
  const balance = useQuery<any>({ queryKey: ['orders', orderId, 'balance'], enabled: !!orderId, queryFn: () => api.get(`/orders/${encodeURIComponent(orderId)}/payment-balance`).then(r => r.data) })
  useEffect(() => {
    setError(''); setPending(null)
    try { const p = readFinancialRequest(key); if (p?.requestId) { setPending(p); setAmount((p.partialAmountCents / 100).toFixed(2)); setMethod(p.paymentMethod); setReceived(String(p.cashReceived ?? '')); setCash(String(p.allocations?.find((a: any) => a.method === 'CASH')?.amount ?? '')) } }
    catch { setError('Référence locale illisible : vérification nécessaire avant un règlement.') }
  }, [key])
  useEffect(() => { if (balance.data && !pending) setAmount((balance.data.outstandingCents / 100).toFixed(2)) }, [balance.data, pending])
  async function submit(e: React.FormEvent) {
    e.preventDefault(); if (busy) return
    setBusy(true); setError('')
    try {
      let body = readFinancialRequest(key) || pending
      if (!body) {
        const partialAmountCents = moneyMinor(amount)
        if (partialAmountCents <= 0 || partialAmountCents > balance.data.outstandingCents) throw new Error('Montant supérieur au solde ou nul.')
        const cashCents = method === 'CASH' ? partialAmountCents : method === 'MIXED' ? moneyMinor(cash) : 0
        if (cashCents < 0 || cashCents > partialAmountCents) throw new Error('Ventilation espèces invalide.')
        body = { requestId: crypto.randomUUID(), paymentMethod: method, partialAmountCents,
          ...(method !== 'CARD' ? { cashReceived: received ? moneyMinor(received) / 100 : cashCents / 100 } : {}),
          ...(method === 'MIXED' ? { allocations: [{ method: 'CASH', amount: cashCents / 100 }, { method: 'CARD', amount: (partialAmountCents - cashCents) / 100 }] } : {}) }
      }
      preserveFinancialRequest(key, body); setPending(body)
      await api.post(`/orders/${encodeURIComponent(orderId)}/checkout`, body)
      forgetFinancialRequest(key, body.requestId); setPending(null); setReceived('')
      await balance.refetch(); void orders.refetch(); void qc.invalidateQueries({ queryKey: ['cash-ledger'] })
    } catch (e: any) { setError(e.response?.data?.message || e.message || 'Résultat non confirmé. Réessayez la même référence.') }
    finally { setBusy(false) }
  }
  return <section role="region" aria-label="Règlements des commandes" style={card}>
    <h2>Règlements des commandes</h2>
    <p>Espèces et terminal autonome : déclaration manuelle, pas de preuve bancaire automatique. Un acompte ne clôture pas la vente.</p>
    <label style={label}>Commande à régler<select aria-label="Commande à régler" value={orderId} onChange={e => setOrderId(e.target.value)} disabled={busy} style={field}>
      <option value="">Choisir une commande</option>{(orders.data || []).filter(o => {
        if (!['PAID', 'CANCELLED'].includes(o.status) || o.id === orderId) return true
        try { return !!localStorage.getItem(`creorga-financial-v1:payment:${companyId}:${actorId}:${o.id}`) } catch { return false }
      }).map(o => <option key={o.id} value={o.id}>#{o.orderNumber} · {o.total.toFixed(2)} €{o.status === 'PAID' ? ' · réglée, référence à vérifier' : ''}</option>)}
    </select></label>
    {orders.isError && <p role="alert">Commandes indisponibles. <button onClick={() => void orders.refetch()}>Réessayer</button></p>}
    {balance.isError && <p role="alert">Solde indisponible : aucun règlement ne sera lancé.</p>}
    {orderId && balance.data && <>
      <p role="status">Reste à régler : {(balance.data.outstandingCents / 100).toLocaleString('fr-LU', { minimumFractionDigits: 2 })} €</p>
      <form onSubmit={submit}>
        <fieldset disabled={busy || !!pending || !balance.data.outstandingCents} style={{ border: 0, padding: 0 }}>
          <label style={label}>Montant à régler (€)<input required type="number" min="0.01" step="0.01" value={amount} onChange={e => setAmount(e.target.value)} style={field} /></label>
          <label style={label}>Moyen de règlement<select aria-label="Moyen de règlement" value={method} onChange={e => setMethod(e.target.value)} style={field}><option value="CASH">Espèces déclarées</option><option value="CARD">Carte — terminal autonome déclaré</option><option value="MIXED">Espèces et carte déclarées</option></select></label>
          {method === 'MIXED' && <label style={label}>Part espèces (€)<input type="number" min="0.01" step="0.01" value={cash} onChange={e => setCash(e.target.value)} style={field} /></label>}
          {method !== 'CARD' && <label style={label}>Espèces reçues (€)<input type="number" min="0" step="0.01" value={received} onChange={e => setReceived(e.target.value)} style={field} /></label>}
        </fieldset>
        <button type="submit" disabled={busy || (!pending && !balance.data.outstandingCents)} style={button}>{busy ? 'Vérification…' : pending ? 'Réessayer la même référence' : 'Enregistrer le règlement déclaré'}</button>
      </form>
      {pending && <p>Référence conservée : {pending.requestId}. Ne créez pas une autre demande en cas de réponse perdue.</p>}
      <ul>{balance.data.payments.map((p: any) => <li key={p.id}>{p.method} · {(p.amountCents / 100).toFixed(2)} € · {p.confirmation === 'provider_verified' ? 'preuve prestataire vérifiée' : 'déclaration manuelle'}</li>)}</ul>
    </>}
    {error && <p role="alert" style={{ color: '#b91c1c' }}>{error}</p>}
  </section>
}
const card: React.CSSProperties = { border: '1px solid #cbd5e1', borderRadius: 14, padding: 18, marginBottom: 18 }
const label: React.CSSProperties = { display: 'grid', gap: 6, margin: '10px 0' }
const field: React.CSSProperties = { width: '100%', boxSizing: 'border-box', minHeight: 44, border: '1px solid #94a3b8', borderRadius: 8, padding: 9 }
const button: React.CSSProperties = { padding: 12, minHeight: 44, marginTop: 10, cursor: 'pointer' }
