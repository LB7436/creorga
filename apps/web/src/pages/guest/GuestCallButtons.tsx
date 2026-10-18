import { useEffect, useRef, useState } from 'react'
import { Bell, Receipt, CreditCard } from 'lucide-react'
import { useGuestLang } from './i18n'
import { bankRedirectAllowed } from '@/lib/guestAccess'
import { useGuestRequestScope, type GuestRequest, type GuestRequestScope } from '@/hooks/useGuestRequestScope'
const BACKEND = (import.meta as any).env?.VITE_BACKEND_URL || 'http://localhost:3002'
interface Bill { total: number; orderIds: string[]; paymentProviders: string[] }
class VisitDenied extends Error {}
export default function GuestCallButtons({ tableId, companyId }: { tableId: string; companyId: string; billTotal?: number }) {
  const scope = useGuestRequestScope(companyId, tableId)
  return <GuestCallButtonsContent key={scope.version} tableId={tableId} companyId={companyId} scope={scope} />
}
function GuestCallButtonsContent({ tableId, companyId, scope }: { tableId: string; companyId: string; scope: GuestRequestScope }) {
  const { t } = useGuestLang()
  const [sent, setSent] = useState(''), [busy, setBusy] = useState(false), [error, setError] = useState('')
  const [bill, setBill] = useState<Bill | null>(null), [provider, setProvider] = useState('')
  const [denied, setDenied] = useState(false)
  const deniedRef = useRef(false)
  const pending = useRef<GuestRequest | null>(null)
  const current = (operation: GuestRequest) => operation.isCurrent() && !deniedRef.current
  const showError = (error: unknown) => {
    if (error instanceof VisitDenied) {
      deniedRef.current = true
      setDenied(true); setBill(null); setProvider(''); setSent('')
    }
    setError(error instanceof Error ? error.message : 'Opération non confirmée.')
  }
  async function readBill(operation: GuestRequest): Promise<Bill | null> {
    const response = await fetch(`${BACKEND}/api/guest/bill/${encodeURIComponent(tableId)}?companyId=${encodeURIComponent(companyId)}`, { headers: operation.headers, signal: operation.signal })
    if (!current(operation)) return null
    const data = await response.json().catch(() => ({}))
    if (!current(operation)) return null
    if (response.status === 401 || response.status === 403) throw new VisitDenied(data.error || 'Cette visite n’est plus accessible. Demandez un nouveau QR au personnel.')
    if (!response.ok) throw new Error(data.error || 'Addition indisponible.')
    return data
  }
  useEffect(() => {
    if (!scope.hasAccess) return
    const operation = scope.begin()
    if (!operation) return
    readBill(operation).then(data => { if (data && current(operation)) { setBill(data); setProvider(data.paymentProviders?.[0] || '') } })
      .catch(error => { if (current(operation)) showError(error) }).finally(operation.finish)
    return operation.abort
  }, [scope.begin])
  async function call(type: 'waiter' | 'bill') {
    if (pending.current || deniedRef.current) return
    const operation = scope.begin()
    if (!operation) return
    pending.current = operation
    setBusy(true); setError('')
    try {
      const response = await fetch(`${BACKEND}/api/guest/call-waiter`, { method: 'POST', signal: operation.signal,
        headers: { 'Content-Type': 'application/json', ...operation.headers }, body: JSON.stringify({ companyId, tableId, type }) })
      if (!current(operation)) return
      const data = await response.json().catch(() => ({}))
      if (!current(operation)) return
      if (response.status === 401 || response.status === 403) throw new VisitDenied(data.error || 'Cette visite n’est plus accessible. Demandez un nouveau QR au personnel.')
      if (!response.ok) throw new Error(data.error || 'Appel non envoyé.')
      setSent(type)
    } catch (error) { if (current(operation)) showError(error) }
    finally {
      if (pending.current === operation) { pending.current = null; if (operation.isCurrent()) setBusy(false) }
      operation.finish()
    }
  }
  async function pay() {
    if (pending.current || deniedRef.current || !provider) return
    const operation = scope.begin()
    if (!operation) return
    pending.current = operation
    setBusy(true); setError('')
    try {
      const latest = await readBill(operation)
      if (!latest || !current(operation)) return
      setBill(latest)
      if (!latest.total || !latest.orderIds.length || !latest.paymentProviders.includes(provider)) throw new Error('Addition modifiée ou moyen indisponible. Vérifiez avec le personnel.')
      const key = `creorga-payment-visit:${companyId}:${tableId}:${operation.visitId}:${provider}:${[...latest.orderIds].sort().join(',')}`
      let requestId = sessionStorage.getItem(key)
      if (!requestId) { requestId = crypto.randomUUID(); sessionStorage.setItem(key, requestId) }
      const response = await fetch(`${BACKEND}/api/guest/pay`, { method: 'POST', credentials: 'include', signal: operation.signal,
        headers: { 'Content-Type': 'application/json', ...operation.headers },
        body: JSON.stringify({ companyId, tableId, provider, requestId }) })
      if (!current(operation)) return
      const data = await response.json().catch(() => ({}))
      if (!current(operation)) return
      if (response.status === 401 || response.status === 403) throw new VisitDenied(data.error || 'Cette visite n’est plus accessible. Demandez un nouveau QR au personnel.')
      if (!response.ok) throw new Error(data.error || 'Paiement non confirmé.')
      if (!bankRedirectAllowed(data.url)) throw new Error('Référence conservée : paiement en attente ou lien indisponible. Demandez une vérification avant un autre règlement.')
      window.location.assign(data.url)
    } catch (error) { if (current(operation)) showError(error) }
    finally {
      if (pending.current === operation) { pending.current = null; if (operation.isCurrent()) setBusy(false) }
      // Annuler le transport n'annule ni une commande ni un paiement serveur.
      // La référence reste stockée pour la vérification ou le rejeu explicite.
      operation.finish()
    }
  }
  if (!scope.hasAccess) return <p>Pour commander ou régler, demandez au personnel le QR de votre visite.</p>
  const style: React.CSSProperties = { minHeight: 44, padding: 12, borderRadius: 10, border: '1px solid #64748b', background: '#1e293b', color: '#fff', cursor: 'pointer' }
  return <div style={{ display: 'grid', gap: 10, marginTop: 16 }}>
    <button style={style} disabled={busy || denied} onClick={() => call('waiter')}><Bell size={16} /> {sent === 'waiter' ? t('call_waiter_sent') : t('call_waiter')}</button>
    <button style={style} disabled={busy || denied} onClick={() => call('bill')}><Receipt size={16} /> {sent === 'bill' ? t('call_bill_sent') : t('call_bill')}</button>
    {bill && <p>Addition de cette visite : {bill.total.toLocaleString('fr-LU', { style: 'currency', currency: 'EUR' })}</p>}
    {!!bill?.paymentProviders.length && <label>Moyen de paiement <select value={provider} onChange={e => setProvider(e.target.value)} disabled={busy}>
      {bill.paymentProviders.map(p => <option key={p} value={p}>{p === 'paypal' ? 'PayPal' : 'Paiement bancaire'}</option>)}
    </select></label>}
    {!!bill?.total && <button style={style} disabled={busy || !provider} onClick={pay}><CreditCard size={16} /> {provider ? busy ? t('pay_bill_processing') : t('pay_bill') : 'Paiement en ligne non configuré'}</button>}
    {error && <p role="alert" style={{ color: '#fca5a5' }}>{error}</p>}
  </div>
}
