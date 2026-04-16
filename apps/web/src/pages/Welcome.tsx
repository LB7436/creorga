import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { motion } from 'framer-motion'
import { Sun, Coffee, Moon, Cloud } from 'lucide-react'
import { useAuthStore } from '@/stores/authStore'

type Period = 'morning' | 'afternoon' | 'evening'

function getPeriod(): Period {
  const h = new Date().getHours()
  if (h < 12) return 'morning'
  if (h < 18) return 'afternoon'
  return 'evening'
}

function getGreeting(period: Period): string {
  if (period === 'morning') return 'Bonjour'
  if (period === 'afternoon') return 'Bon après-midi'
  return 'Bonsoir'
}

export default function Welcome() {
  const navigate = useNavigate()
  const company = useAuthStore((s) => s.company)
  const user = useAuthStore((s) => s.user)
  const [period] = useState<Period>(getPeriod())

  const companyName = company?.name ?? 'Café um Rond-Point'
  const city = 'Rumelange - Luxembourg'

  useEffect(() => {
    const timer = setTimeout(() => navigate('/modules', { replace: true }), 3500)
    return () => clearTimeout(timer)
  }, [navigate])

  const PeriodIcon = period === 'morning' ? Sun : period === 'afternoon' ? Coffee : Moon
  const periodColor =
    period === 'morning' ? '#f59e0b' : period === 'afternoon' ? '#b45309' : '#6366f1'

  const handleSkip = () => navigate('/modules', { replace: true })

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        background:
          'linear-gradient(135deg, #f8fafc 0%, #eef2ff 40%, #e0e7ff 70%, #c7d2fe 100%)',
        fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
      }}
    >
      {/* Animated orbs */}
      <motion.div
        style={{
          position: 'absolute',
          width: 600,
          height: 600,
          borderRadius: '50%',
          background:
            'radial-gradient(circle, rgba(99,102,241,0.18) 0%, transparent 70%)',
          top: '20%',
          left: '10%',
          pointerEvents: 'none',
        }}
        animate={{ x: [0, 60, 0], y: [0, 40, 0], scale: [1, 1.1, 1] }}
        transition={{ duration: 12, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        style={{
          position: 'absolute',
          width: 450,
          height: 450,
          borderRadius: '50%',
          background:
            'radial-gradient(circle, rgba(139,92,246,0.14) 0%, transparent 70%)',
          top: '50%',
          right: '8%',
          pointerEvents: 'none',
        }}
        animate={{ x: [0, -40, 0], y: [0, -30, 0], scale: [1.05, 0.95, 1.05] }}
        transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
      />
      <motion.div
        style={{
          position: 'absolute',
          width: 350,
          height: 350,
          borderRadius: '50%',
          background:
            'radial-gradient(circle, rgba(236,72,153,0.10) 0%, transparent 70%)',
          bottom: '10%',
          left: '30%',
          pointerEvents: 'none',
        }}
        animate={{ scale: [0.9, 1.15, 0.9], opacity: [0.6, 1, 0.6] }}
        transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut', delay: 1 }}
      />

      {/* Weather widget top-left */}
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.3, duration: 0.6 }}
        style={{
          position: 'absolute',
          top: 24,
          left: 24,
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          padding: '10px 16px',
          borderRadius: 14,
          background: 'rgba(255,255,255,0.7)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(226,232,240,0.9)',
          boxShadow: '0 4px 20px rgba(0,0,0,0.04)',
          color: '#1e293b',
          fontSize: 13,
          fontWeight: 500,
          zIndex: 10,
        }}
      >
        <Cloud size={18} style={{ color: '#64748b' }} />
        <span>12°C Rumelange</span>
        <span style={{ color: '#f59e0b' }}>☀</span>
      </motion.div>

      {/* Period icon top-right */}
      <motion.div
        initial={{ opacity: 0, rotate: -90, scale: 0.5 }}
        animate={{ opacity: 1, rotate: 0, scale: 1 }}
        transition={{ delay: 0.4, type: 'spring', stiffness: 120, damping: 12 }}
        style={{
          position: 'absolute',
          top: 24,
          right: 24,
          width: 48,
          height: 48,
          borderRadius: 14,
          background: 'rgba(255,255,255,0.8)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(226,232,240,0.9)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          boxShadow: '0 4px 20px rgba(0,0,0,0.04)',
          zIndex: 10,
        }}
      >
        <PeriodIcon size={22} style={{ color: periodColor }} />
      </motion.div>

      {/* Center content */}
      <div
        style={{
          position: 'relative',
          zIndex: 5,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          textAlign: 'center',
          padding: '0 24px',
        }}
      >
        {/* Logo */}
        <motion.div
          initial={{ opacity: 0, scale: 0.3, y: -20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          transition={{ type: 'spring', stiffness: 180, damping: 14, delay: 0.2 }}
          style={{ position: 'relative', marginBottom: 32 }}
        >
          <div
            style={{
              width: 110,
              height: 110,
              borderRadius: '50%',
              background:
                'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #ec4899 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              boxShadow:
                '0 20px 60px rgba(99,102,241,0.35), inset 0 2px 4px rgba(255,255,255,0.3)',
            }}
          >
            <span
              style={{
                color: '#fff',
                fontSize: 52,
                fontWeight: 800,
                letterSpacing: '-0.04em',
              }}
            >
              C
            </span>
          </div>
          <motion.div
            style={{
              position: 'absolute',
              inset: -8,
              borderRadius: '50%',
              border: '2px solid rgba(99,102,241,0.4)',
              pointerEvents: 'none',
            }}
            animate={{ scale: [1, 1.4], opacity: [0.8, 0] }}
            transition={{ duration: 2.2, repeat: Infinity, ease: 'easeOut' }}
          />
          <motion.div
            style={{
              position: 'absolute',
              inset: -8,
              borderRadius: '50%',
              border: '2px solid rgba(139,92,246,0.3)',
              pointerEvents: 'none',
            }}
            animate={{ scale: [1, 1.4], opacity: [0.8, 0] }}
            transition={{ duration: 2.2, repeat: Infinity, ease: 'easeOut', delay: 1 }}
          />
        </motion.div>

        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.55, duration: 0.5 }}
          style={{
            color: '#64748b',
            fontSize: 13,
            fontWeight: 600,
            letterSpacing: '0.24em',
            textTransform: 'uppercase',
            marginBottom: 14,
          }}
        >
          {getGreeting(period)}
          {user?.firstName ? `, ${user.firstName}` : ''} — Bienvenue chez
        </motion.p>

        <motion.h1
          initial={{ opacity: 0, y: 20, scale: 0.92 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: 'spring', stiffness: 140, damping: 16, delay: 0.7 }}
          style={{
            color: '#1e293b',
            fontSize: 'clamp(2.5rem, 6vw, 4rem)',
            fontWeight: 800,
            letterSpacing: '-0.035em',
            lineHeight: 1.05,
            margin: 0,
            maxWidth: 900,
            backgroundImage:
              'linear-gradient(135deg, #1e293b 0%, #4338ca 50%, #7c3aed 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          {companyName}
        </motion.h1>

        <motion.p
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.0, duration: 0.55 }}
          style={{
            color: '#475569',
            fontSize: 17,
            fontWeight: 500,
            marginTop: 14,
            letterSpacing: '-0.01em',
          }}
        >
          {city}
        </motion.p>

        {/* Loading dots */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.3, duration: 0.4 }}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            marginTop: 44,
          }}
        >
          {[0, 1, 2].map((i) => (
            <motion.span
              key={i}
              style={{
                width: 9,
                height: 9,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
              }}
              animate={{ scale: [1, 1.5, 1], opacity: [0.4, 1, 0.4] }}
              transition={{
                duration: 1.2,
                repeat: Infinity,
                ease: 'easeInOut',
                delay: i * 0.18,
              }}
            />
          ))}
        </motion.div>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5, duration: 0.5 }}
          style={{
            color: '#64748b',
            fontSize: 13.5,
            marginTop: 16,
            fontWeight: 500,
          }}
        >
          Préparation de votre espace…
        </motion.p>
      </div>

      {/* Skip button */}
      <motion.button
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.8, duration: 0.5 }}
        onClick={handleSkip}
        style={{
          position: 'absolute',
          bottom: 28,
          right: 28,
          padding: '10px 20px',
          borderRadius: 12,
          background: 'rgba(255,255,255,0.75)',
          backdropFilter: 'blur(12px)',
          border: '1px solid rgba(226,232,240,0.9)',
          color: '#475569',
          fontSize: 13,
          fontWeight: 600,
          cursor: 'pointer',
          boxShadow: '0 4px 20px rgba(0,0,0,0.04)',
          transition: 'all 0.2s',
          zIndex: 10,
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.background = 'rgba(255,255,255,1)'
          e.currentTarget.style.color = '#1e293b'
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.background = 'rgba(255,255,255,0.75)'
          e.currentTarget.style.color = '#475569'
        }}
      >
        Ignorer →
      </motion.button>

      {/* Bottom progress bar */}
      <motion.div
        style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          height: 3,
          background:
            'linear-gradient(90deg, #6366f1 0%, #8b5cf6 50%, #ec4899 100%)',
          boxShadow: '0 0 12px rgba(139,92,246,0.5)',
        }}
        initial={{ width: '0%' }}
        animate={{ width: '100%' }}
        transition={{ duration: 3.5, ease: 'linear' }}
      />
    </div>
  )
}
