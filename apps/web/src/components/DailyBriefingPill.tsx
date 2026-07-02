import { useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Volume2 } from 'lucide-react'
import api from '@/lib/api'

export default function DailyBriefingPill() {
  const location = useLocation()
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [briefing, setBriefing] = useState('')
  const hour = new Date().getHours()

  const allowed = location.pathname === '/' || location.pathname === '/modules'
  const label = hour < 12 ? '☀️ Briefing du matin' : hour >= 18 ? '🌙 Bilan du soir' : '✨ Point du jour'

  const requestBriefing = async () => {
    setLoading(true)
    setOpen(true)
    try {
      // via le client API authentifié (la route /api/agent exige un token)
      const res = await api.post('/agent/daily-briefing')
      const data = res.data ?? {}
      const text = data.summary || data.message || data.text || 'Tout est calme pour le moment. Robi n a pas detecte de point urgent.'
      setBriefing(text)
      if ('speechSynthesis' in window) {
        window.speechSynthesis.cancel()
        window.speechSynthesis.speak(new SpeechSynthesisUtterance(text))
      }
    } catch {
      setBriefing('Briefing indisponible pour le moment. Verifiez que le backend agent est lance.')
    } finally {
      setLoading(false)
    }
  }

  const modalTitle = useMemo(() => (hour < 12 ? 'Briefing du matin' : hour >= 18 ? 'Bilan du soir' : 'Point du jour'), [hour])

  if (!allowed) return null

  return (
    <>
      <motion.button
        data-tour="daily-briefing"
        whileTap={{ scale: 0.96 }}
        onClick={requestBriefing}
        style={{
          position: 'fixed',
          left: '50%',
          bottom: 80,
          transform: 'translateX(-50%)',
          zIndex: 9997,
          border: '1px solid rgba(255,255,255,0.12)',
          background: 'linear-gradient(135deg, rgba(15,23,42,0.94), rgba(88,28,135,0.92))',
          color: '#f8fafc',
          borderRadius: 999,
          padding: '12px 18px',
          boxShadow: '0 20px 48px rgba(0,0,0,0.34)',
          fontSize: 13,
          fontWeight: 900,
          cursor: 'pointer',
        }}
      >
        {label}
      </motion.button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, zIndex: 10020, background: 'rgba(2,6,23,0.62)', display: 'grid', placeItems: 'center', padding: 20 }}
          >
            <motion.div
              initial={{ y: 24, scale: 0.96 }}
              animate={{ y: 0, scale: 1 }}
              exit={{ y: 12, scale: 0.98 }}
              style={{ width: 'min(560px, 100%)', borderRadius: 22, border: '1px solid rgba(167,139,250,0.28)', background: '#0f1024', color: '#f8fafc', padding: 22, boxShadow: '0 30px 80px rgba(0,0,0,0.42)' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                <h2 style={{ margin: 0, fontSize: 20, fontWeight: 900 }}>{modalTitle}</h2>
                <button onClick={() => { window.speechSynthesis?.cancel(); setOpen(false) }} style={{ width: 34, height: 34, borderRadius: 12, border: 'none', background: 'rgba(255,255,255,0.08)', color: '#cbd5e1', cursor: 'pointer' }}>
                  <X size={16} />
                </button>
              </div>
              <p style={{ minHeight: 110, margin: 0, lineHeight: 1.65, color: '#dbeafe', whiteSpace: 'pre-wrap' }}>
                {loading ? 'Robi prepare votre synthese...' : briefing}
              </p>
              <button onClick={() => briefing && window.speechSynthesis?.speak(new SpeechSynthesisUtterance(briefing))} style={{ marginTop: 16, border: '1px solid rgba(147,197,253,0.25)', background: 'rgba(59,130,246,0.12)', color: '#bfdbfe', borderRadius: 12, padding: '9px 12px', display: 'inline-flex', gap: 8, alignItems: 'center', cursor: 'pointer', fontWeight: 800 }}>
                <Volume2 size={15} /> Relire
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
