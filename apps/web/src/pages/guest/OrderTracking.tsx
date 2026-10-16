import { useEffect, useState } from 'react'
import { useGuestLang } from './i18n'
import { guestHeaders } from '@/lib/guestAccess'
const BACKEND = (import.meta as any).env?.VITE_BACKEND_URL || 'http://localhost:3002'
const STEPS = ['received', 'preparing', 'on_the_way'] as const
type OrderStatus = typeof STEPS[number]
export default function OrderTracking({ orderId, tableId, companyId }: { orderId: string; tableId: string; companyId: string }) {
  const [status, setStatus] = useState<OrderStatus | null>(null), [error, setError] = useState('')
  const { t } = useGuestLang()
  useEffect(() => {
    let alive = true
    const controller = new AbortController()
    setStatus(null); setError('')
    const load = async () => {
      try {
        const response = await fetch(`${BACKEND}/api/guest/orders/${encodeURIComponent(orderId)}?companyId=${encodeURIComponent(companyId)}`,
          { headers: guestHeaders(companyId, tableId), signal: controller.signal })
        const data = await response.json()
        if (!response.ok) throw new Error(data.error || 'Suivi indisponible.')
        if (alive && STEPS.includes(data.status)) { setStatus(data.status); setError('') }
      } catch (e) { if (alive) setError(e instanceof Error ? e.message : 'Suivi indisponible.') }
    }
    void load()
    const timer = window.setInterval(load, 15000)
    return () => { alive = false; controller.abort(); window.clearInterval(timer) }
  }, [orderId, tableId, companyId])
  return <section style={{ marginTop: 18, padding: 14, borderRadius: 14, border: '1px solid #64748b' }}>
    <h3>{t('order_title')}</h3>
    {STEPS.map((step, i) => <p key={step} style={{ opacity: status && i <= STEPS.indexOf(status) ? 1 : .5 }}>
      {status && i <= STEPS.indexOf(status) ? '✓ ' : '○ '}{t(`order_${step}`)}
    </p>)}
    {error && <p role="alert">{error}</p>}
  </section>
}
