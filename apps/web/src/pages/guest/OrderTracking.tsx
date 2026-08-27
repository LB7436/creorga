import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { Check } from 'lucide-react'
import { io } from 'socket.io-client'
import { useGuestLang } from './i18n'

const BACKEND = (import.meta as any).env?.VITE_BACKEND_URL || 'http://localhost:3002'

type OrderStatus = 'received' | 'preparing' | 'on_the_way'
const STEPS: { key: OrderStatus; emoji: string }[] = [
  { key: 'received', emoji: '✅' },
  { key: 'preparing', emoji: '👨‍🍳' },
  { key: 'on_the_way', emoji: '🛎️' },
]

/**
 * v5.0.1 — Suivi de commande en temps réel via socket.io namespace /live.
 * Fallback poll 20s si le socket n'est pas disponible.
 */
export default function OrderTracking({ orderId, tableId, companyId }: { orderId: string; tableId: string; companyId: string }) {
  const [status, setStatus] = useState<OrderStatus>('received')
  const { t } = useGuestLang()
  const socketRef = useRef<any>(null)

  useEffect(() => {
    let alive = true
    let pollId: number | undefined

    const applyStatus = (s: OrderStatus) => { if (alive) setStatus(s) }

    const startPoll = () => {
      pollId = window.setInterval(() => {
        fetch(`${BACKEND}/api/guest/orders/${orderId}?companyId=${encodeURIComponent(companyId)}`)
          .then((r) => r.json())
          .then((data) => { if (data?.status) applyStatus(data.status) })
          .catch(() => { /* offline — on réessaiera */ })
      }, 20_000)
    }

    try {
      const socket = io(`${BACKEND}/live`, { transports: ['websocket', 'polling'] })
      socketRef.current = socket
      socket.on('connect', () => socket.emit('subscribe', [`table-${companyId}-${tableId}`]))
      socket.on('order-status', (payload: { orderId: string; status: OrderStatus }) => {
        if (payload.orderId === orderId) applyStatus(payload.status)
      })
      // Fallback poll seulement si la socket n'arrive jamais à se connecter.
      socket.on('connect_error', () => { if (!pollId) startPoll() })
    } catch {
      startPoll()
    }

    return () => {
      alive = false
      if (pollId) window.clearInterval(pollId)
      socketRef.current?.disconnect()
    }
  }, [orderId, tableId, companyId])

  const activeIndex = STEPS.findIndex((s) => s.key === status)

  return (
    <div style={{ marginTop: 18, padding: 14, borderRadius: 14, border: '1px solid rgba(168,85,247,0.18)', background: 'rgba(255,255,255,0.03)' }}>
      <div style={{ fontSize: 12, fontWeight: 800, color: '#f8fafc', marginBottom: 10 }}>{t('order_title')}</div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {STEPS.map((step, i) => {
          const done = i <= activeIndex
          return (
            <div key={step.key} style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              <motion.div
                animate={{ scale: done ? 1 : 0.85, opacity: done ? 1 : 0.4 }}
                style={{
                  width: 28, height: 28, borderRadius: '50%',
                  background: done ? 'linear-gradient(135deg,#a855f7,#06b6d4)' : 'rgba(255,255,255,0.08)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13,
                }}
              >
                {done ? <Check size={14} color="#fff" /> : step.emoji}
              </motion.div>
              <span style={{ fontSize: 12, color: done ? '#f8fafc' : '#64748b', fontWeight: done ? 700 : 500 }}>
                {t(`order_${step.key}`)}
              </span>
            </div>
          )
        })}
      </div>
    </div>
  )
}
