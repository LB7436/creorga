import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Cake, X, Send } from 'lucide-react'

const BACKEND = (import.meta as any).env?.VITE_BACKEND_URL || 'http://localhost:3002'

/**
 * Banner that appears when there's a customer birthday today.
 * Confetti animation + suggested action (send voucher).
 *
 * Polls /api/agent/execute crm.birthdays once on mount + every 6h.
 */

interface Birthday {
  label: string
  value: string
}

export default function BirthdayCelebrate() {
  const [birthdays, setBirthdays] = useState<Birthday[]>([])
  const [dismissed, setDismissed] = useState(false)
  const [confetti, setConfetti] = useState(false)

  useEffect(() => {
    const dismissedToday = localStorage.getItem('creorga.birthday.dismissed')
    const today = new Date().toISOString().slice(0, 10)
    if (dismissedToday === today) { setDismissed(true); return }

    const fetchToday = async () => {
      try {
        const r = await fetch(`${BACKEND}/api/agent/execute`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ commandId: 'crm.birthdays' }),
        })
        const data = await r.json()
        const items = (data?.ui?.items || []) as Birthday[]
        // Filter only TODAY (not whole month)
        const todayDay = new Date().getDate()
        const todayMonth = new Date().getMonth() + 1
        const filtered = items.filter((it) => {
          const m = it.value?.match(/(\d{1,2})\/(\d{1,2})/)
          if (!m) return false
          return parseInt(m[1]) === todayDay && parseInt(m[2]) === todayMonth
        })
        if (filtered.length > 0) {
          setBirthdays(filtered)
          setConfetti(true)
          setTimeout(() => setConfetti(false), 4000)
        }
      } catch { /* offline */ }
    }
    fetchToday()
    const id = setInterval(fetchToday, 6 * 3600_000)
    return () => clearInterval(id)
  }, [])

  const dismiss = () => {
    setDismissed(true)
    localStorage.setItem('creorga.birthday.dismissed', new Date().toISOString().slice(0, 10))
  }

  if (dismissed || birthdays.length === 0) return null

  return (
    <>
      {/* Confetti animation */}
      <AnimatePresence>
        {confetti && (
          <div style={{ position: 'fixed', inset: 0, pointerEvents: 'none', zIndex: 9990, overflow: 'hidden' }}>
            {Array.from({ length: 40 }).map((_, i) => (
              <motion.div key={i}
                initial={{ y: -50, x: Math.random() * window.innerWidth, opacity: 1, rotate: 0 }}
                animate={{ y: window.innerHeight + 100, rotate: 720 + Math.random() * 360, opacity: 0 }}
                transition={{ duration: 3 + Math.random() * 2, ease: 'easeIn', delay: Math.random() }}
                style={{
                  position: 'absolute', width: 8, height: 12, borderRadius: 2,
                  background: ['#fbbf24', '#ec4899', '#8b5cf6', '#10b981', '#3b82f6'][i % 5],
                }} />
            ))}
          </div>
        )}
      </AnimatePresence>

      <motion.div
        initial={{ y: 80, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: 80, opacity: 0 }}
        style={{
          position: 'fixed', bottom: 96, left: 24, right: 100, zIndex: 9989,
          padding: 14, borderRadius: 14,
          background: 'linear-gradient(135deg,#fbbf24,#ec4899)', color: '#fff',
          boxShadow: '0 12px 32px rgba(236,72,153,0.4)',
          display: 'flex', alignItems: 'center', gap: 12,
        }}
      >
        <Cake size={28} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 800, fontSize: 14 }}>🎂 Anniversaire aujourd'hui !</div>
          <div style={{ fontSize: 11, marginTop: 2, opacity: 0.95 }}>
            {birthdays.map((b) => b.label).join(', ')} — pensez à offrir un dessert
          </div>
        </div>
        <button onClick={() => { /* future : send voucher */ alert('Voucher envoyé !'); dismiss() }}
          style={{
            padding: '6px 10px', borderRadius: 8, border: 'none', cursor: 'pointer',
            background: 'rgba(255,255,255,0.25)', color: '#fff', fontWeight: 800, fontSize: 11,
          }}>
          <Send size={12} style={{ verticalAlign: -1, marginRight: 2 }} /> Envoyer
        </button>
        <button onClick={dismiss} style={{ background: 'transparent', border: 'none', color: '#fff', cursor: 'pointer' }}>
          <X size={16} />
        </button>
      </motion.div>
    </>
  )
}
