import { useState } from 'react'
import { Bell, Receipt, CreditCard } from 'lucide-react'
import { useGuestLang } from './i18n'

const BACKEND = (import.meta as any).env?.VITE_BACKEND_URL || 'http://localhost:3002'

/**
 * v5.0.2/5.0.3 — Appel serveur, demande d'addition et paiement à table.
 */
export default function GuestCallButtons({ tableId, billTotal }: { tableId: string; billTotal?: number }) {
  const { t } = useGuestLang()
  const [waiterSent, setWaiterSent] = useState(false)
  const [billSent, setBillSent] = useState(false)
  const [paying, setPaying] = useState(false)
  const [payError, setPayError] = useState<string | null>(null)

  const call = async (type: 'waiter' | 'bill') => {
    try {
      const r = await fetch(`${BACKEND}/api/guest/call-waiter`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tableId, type }),
      })
      if (!r.ok) return
      if (type === 'waiter') {
        setWaiterSent(true)
        window.setTimeout(() => setWaiterSent(false), 30_000)
      } else {
        setBillSent(true)
        window.setTimeout(() => setBillSent(false), 30_000)
      }
    } catch { /* offline — best effort */ }
  }

  const pay = async () => {
    if (!billTotal) return
    setPaying(true)
    setPayError(null)
    try {
      const r = await fetch(`${BACKEND}/api/guest/pay`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ tableId, total: billTotal }),
      })
      const data = await r.json()
      if (r.status === 501) { setPayError(t('pay_bill_unavailable')); return }
      if (data.url) window.location.href = data.url
    } catch {
      setPayError(t('pay_bill_unavailable'))
    } finally {
      setPaying(false)
    }
  }

  const btnStyle: React.CSSProperties = {
    flex: 1, minHeight: 44, padding: '12px 10px', borderRadius: 12, border: '1px solid rgba(168,85,247,0.25)',
    background: 'rgba(255,255,255,0.03)', color: '#f8fafc', fontWeight: 700, fontSize: 12,
    cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4,
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 14 }}>
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={() => call('waiter')} disabled={waiterSent} style={btnStyle}>
          <Bell size={18} color="#f59e0b" />
          {waiterSent ? t('call_waiter_sent') : t('call_waiter')}
        </button>
        <button onClick={() => call('bill')} disabled={billSent} style={btnStyle}>
          <Receipt size={18} color="#22c55e" />
          {billSent ? t('call_bill_sent') : t('call_bill')}
        </button>
      </div>
      {typeof billTotal === 'number' && billTotal > 0 && (
        <button onClick={pay} disabled={paying} style={{
          ...btnStyle, flexDirection: 'row', justifyContent: 'center',
          background: 'linear-gradient(135deg,#a855f7,#06b6d4)', border: 'none',
        }}>
          <CreditCard size={16} />
          {paying ? t('pay_bill_processing') : t('pay_bill')}
        </button>
      )}
      {payError && <div style={{ fontSize: 11, color: '#f87171', textAlign: 'center' }}>{payError}</div>}
    </div>
  )
}
