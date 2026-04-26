import { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

const BACKEND = (import.meta as any).env?.VITE_BACKEND_URL || 'http://localhost:3002'

interface Ad {
  id: string
  imageDataUrl?: string
  title: string
  subtitle?: string
  price?: number
  currency?: string
  cta?: string
  durationSec: number
  isLive: boolean
  bgColor?: string
  textColor?: string
}

/**
 * Full-screen TV display — rotates live ads with smooth transitions.
 * Polls backend every 4 seconds for live ad updates.
 * Press ESC to exit fullscreen.
 */
export default function TVDisplayPage() {
  const [ads, setAds] = useState<Ad[]>([])
  const [idx, setIdx] = useState(0)
  const [now, setNow] = useState(Date.now())

  // Poll live ads
  useEffect(() => {
    const fetchLive = async () => {
      try {
        const r = await fetch(`${BACKEND}/api/ads/live`)
        const data = await r.json()
        setAds(data.ads || [])
      } catch { /* offline */ }
    }
    fetchLive()
    const id = setInterval(fetchLive, 4000)
    return () => clearInterval(id)
  }, [])

  // Auto-advance
  useEffect(() => {
    if (ads.length === 0) return
    const current = ads[idx % ads.length]
    const t = setTimeout(() => {
      setIdx((i) => (i + 1) % ads.length)
    }, (current.durationSec || 8) * 1000)
    return () => clearTimeout(t)
  }, [idx, ads])

  // Clock for the corner
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000)
    return () => clearInterval(id)
  }, [])

  // ESC to exit
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') window.history.back() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  const current = ads.length > 0 ? ads[idx % ads.length] : null

  return (
    <div style={{
      position: 'fixed', inset: 0, overflow: 'hidden',
      background: '#000', color: '#fff', cursor: 'none',
    }}>
      {!current && (
        <div style={{
          position: 'absolute', inset: 0,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          background: 'linear-gradient(135deg, #0f172a, #1e293b)',
        }}>
          <div style={{ fontSize: 80 }}>📺</div>
          <h1 style={{ fontSize: 36, fontWeight: 800, margin: '20px 0 8px' }}>Creorga TV</h1>
          <p style={{ fontSize: 16, color: '#94a3b8', maxWidth: 480, textAlign: 'center' }}>
            Aucune publicité en direct pour le moment. <br />
            Activez des pubs depuis l'onglet « 🔴 En direct » dans la régie.
          </p>
        </div>
      )}

      <AnimatePresence mode="wait">
        {current && (
          <motion.div
            key={current.id}
            initial={{ opacity: 0, scale: 1.05 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.6 }}
            style={{
              position: 'absolute', inset: 0,
              background: current.imageDataUrl
                ? `url(${current.imageDataUrl}) center/cover`
                : current.bgColor || '#1e293b',
              color: current.textColor || '#fff',
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              padding: 60, textAlign: 'center',
            }}
          >
            {current.imageDataUrl && (
              <div style={{
                position: 'absolute', inset: 0,
                background: 'linear-gradient(180deg, transparent 30%, rgba(0,0,0,0.7) 100%)',
              }} />
            )}

            <motion.h1
              initial={{ y: 30, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.3, duration: 0.6 }}
              style={{
                fontSize: 'clamp(48px, 8vw, 120px)', fontWeight: 900,
                margin: 0, letterSpacing: -2, lineHeight: 1.1,
                textShadow: current.imageDataUrl ? '0 4px 24px rgba(0,0,0,0.5)' : 'none',
                position: 'relative', zIndex: 5,
              }}
            >
              {current.title}
            </motion.h1>

            {current.subtitle && (
              <motion.p
                initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.5, duration: 0.6 }}
                style={{
                  fontSize: 'clamp(20px, 2.5vw, 36px)', fontWeight: 500,
                  margin: '16px 0 0', maxWidth: 1200, opacity: 0.9,
                  textShadow: current.imageDataUrl ? '0 2px 12px rgba(0,0,0,0.5)' : 'none',
                  position: 'relative', zIndex: 5,
                }}
              >
                {current.subtitle}
              </motion.p>
            )}

            {current.price !== undefined && (
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.8, duration: 0.5, type: 'spring' }}
                style={{
                  marginTop: 40, padding: '16px 36px',
                  background: 'linear-gradient(135deg, #f59e0b, #ef4444)',
                  borderRadius: 999, fontSize: 'clamp(28px, 4vw, 60px)',
                  fontWeight: 900, color: '#fff',
                  boxShadow: '0 12px 32px rgba(245,158,11,0.4)',
                  position: 'relative', zIndex: 5,
                }}
              >
                {current.price.toFixed(2)} {current.currency || '€'}
              </motion.div>
            )}

            {current.cta && (
              <motion.div
                initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                transition={{ delay: 1.1, duration: 0.5 }}
                style={{
                  marginTop: 28, padding: '14px 32px',
                  background: 'rgba(255,255,255,0.15)',
                  backdropFilter: 'blur(10px)',
                  border: '2px solid rgba(255,255,255,0.4)',
                  borderRadius: 999, fontSize: 'clamp(16px, 2vw, 24px)',
                  fontWeight: 700, position: 'relative', zIndex: 5,
                }}
              >
                {current.cta}
              </motion.div>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top-right HUD */}
      <div style={{
        position: 'fixed', top: 20, right: 24, zIndex: 100,
        display: 'flex', gap: 12, alignItems: 'center',
        background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(10px)',
        padding: '8px 14px', borderRadius: 999,
        fontSize: 12, fontFamily: 'monospace', color: 'rgba(255,255,255,0.85)',
      }}>
        <span>🔴 LIVE</span>
        <span>·</span>
        <span>{new Date(now).toLocaleTimeString('fr-FR')}</span>
        {ads.length > 0 && (
          <>
            <span>·</span>
            <span>{(idx % ads.length) + 1} / {ads.length}</span>
          </>
        )}
      </div>

      {/* Progress bar */}
      {current && (
        <motion.div
          key={`bar-${current.id}-${idx}`}
          initial={{ width: '0%' }}
          animate={{ width: '100%' }}
          transition={{ duration: current.durationSec, ease: 'linear' }}
          style={{
            position: 'fixed', bottom: 0, left: 0,
            height: 4, background: 'linear-gradient(90deg, #6366f1, #ec4899)',
            zIndex: 100,
          }}
        />
      )}

      {/* Exit hint */}
      <div style={{
        position: 'fixed', bottom: 20, left: 24, zIndex: 100,
        fontSize: 11, color: 'rgba(255,255,255,0.5)', fontFamily: 'monospace',
      }}>
        ESC pour quitter
      </div>
    </div>
  )
}
