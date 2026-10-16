import { useEffect, useState } from 'react'
import { Bell, Receipt, CreditCard } from 'lucide-react'
import { useGuestLang } from './i18n'
import { bankRedirectAllowed, getGuestAccess, guestHeaders, guestScopeKey } from '@/lib/guestAccess'
const BACKEND = (import.meta as any).env?.VITE_BACKEND_URL || 'http://localhost:3002'
interface Bill { total: number; orderIds: string[]; paymentProviders: string[] }
export default function GuestCallButtons({ tableId, companyId }: { tableId: string; companyId: string; billTotal?: number }) {
  const { t } = useGuestLang()
  const [sent, setSent] = useState(''), [busy, setBusy] = useState(false), [error, setError] = useState('')
  const [bill, setBill] = useState<Bill | null>(null), [provider, setProvider] = useState('')
  const access = getGuestAccess(companyId, tableId)
  async function readBill(signal?: AbortSignal): Promise<Bill> {
    const response = await fetch(`${BACKEND}/api/guest/bill/${encodeURIComponent(tableId)}?companyId=${encodeURIComponent(companyId)}`, { headers: guestHeaders(companyId, tableId), signal })
    const data = await response.json()
    if (!response.ok) throw new Error(data.error || 'Addition indisponible.')
    return data
  }
  useEffect(() => {
    if (!access) return
    let alive = true
    const controller = new AbortController()
    readBill(controller.signal).then(data => { if (alive) { setBill(data); setProvider(data.paymentProviders?.[0] || '') } })
      .catch(e => { if (alive) setError(e.message) })
    return () => { alive = false; controller.abort() }
  }, [companyId, tableId, access?.visitId])
  async function call(type: 'waiter' | 'bill') {
    if (busy) return
    setBusy(true); setError('')
    try {
      const response = await fetch(`${BACKEND}/api/guest/call-waiter`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...guestHeaders(companyId, tableId) }, body: JSON.stringify({ companyId, tableId, type }) })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Appel non envoyé.')
      setSent(type)
    } catch (e) { setError(e instanceof Error ? e.message : 'Appel non envoyé.') }
    finally { setBusy(false) }
  }
  async function pay() {
    if (busy || !provider) return
    setBusy(true); setError('')
    try {
      const current = await readBill()
      setBill(current)
      if (!current.total || !current.orderIds.length || !current.paymentProviders.includes(provider)) throw new Error('Addition modifiée ou moyen indisponible. Vérifiez avec le personnel.')
      const key = `creorga-payment-visit:${guestScopeKey(companyId, tableId)}:${provider}:${[...current.orderIds].sort().join(',')}`
      let requestId = sessionStorage.getItem(key)
      if (!requestId) { requestId = crypto.randomUUID(); sessionStorage.setItem(key, requestId) }
      const response = await fetch(`${BACKEND}/api/guest/pay`, { method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json', ...guestHeaders(companyId, tableId) },
        body: JSON.stringify({ companyId, tableId, provider, requestId }) })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Paiement non confirmé.')
      if (!bankRedirectAllowed(data.url)) throw new Error('Référence conservée : paiement en attente ou lien indisponible. Demandez une vérification avant un autre règlement.')
      window.location.assign(data.url)
    } catch (e) { setError(e instanceof Error ? e.message : 'Paiement non confirmé.') }
    finally { setBusy(false) }
  }
  if (!access) return <p>Pour commander ou régler, demandez au personnel le QR de votre visite.</p>
  const style: React.CSSProperties = { minHeight: 44, padding: 12, borderRadius: 10, border: '1px solid #64748b', background: '#1e293b', color: '#fff', cursor: 'pointer' }
  return <div style={{ display: 'grid', gap: 10, marginTop: 16 }}>
    <button style={style} disabled={busy} onClick={() => call('waiter')}><Bell size={16} /> {sent === 'waiter' ? t('call_waiter_sent') : t('call_waiter')}</button>
    <button style={style} disabled={busy} onClick={() => call('bill')}><Receipt size={16} /> {sent === 'bill' ? t('call_bill_sent') : t('call_bill')}</button>
    {bill && <p>Addition de cette visite : {bill.total.toLocaleString('fr-LU', { style: 'currency', currency: 'EUR' })}</p>}
    {!!bill?.paymentProviders.length && <label>Moyen de paiement <select value={provider} onChange={e => setProvider(e.target.value)} disabled={busy}>
      {bill.paymentProviders.map(p => <option key={p} value={p}>{p === 'paypal' ? 'PayPal' : 'Paiement bancaire'}</option>)}
    </select></label>}
    {!!bill?.total && <button style={style} disabled={busy || !provider} onClick={pay}><CreditCard size={16} /> {provider ? busy ? t('pay_bill_processing') : t('pay_bill') : 'Paiement en ligne non configuré'}</button>}
    {error && <p role="alert" style={{ color: '#fca5a5' }}>{error}</p>}
  </div>
}
