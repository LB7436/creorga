import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Lightbulb } from 'lucide-react'

interface LoadingScreenProps {
  message?: string
  progress?: number // 0..100, optional
  showTips?: boolean
}

const TIPS = [
  'Utilisez Ctrl+K pour ouvrir la recherche rapide partout dans Creorga.',
  'Vous pouvez cloner un menu en 1 clic depuis la page Menu.',
  'Les rapports quotidiens sont exportables en PDF et CSV.',
  'Le mode hors-ligne garde la caisse fonctionnelle sans Internet.',
  'Ajoutez des notes sur une table pour suivre les préférences clients.',
  'Glissez-déposez vos produits pour réorganiser les catégories.',
]

export default function LoadingScreen({
  message = 'Chargement...',
  progress,
  showTips = true,
}: LoadingScreenProps) {
  const [tipIndex, setTipIndex] = useState(() => Math.floor(Math.random() * TIPS.length))

  useEffect(() => {
    if (!showTips) return
    const interval = setInterval(() => {
      setTipIndex((i) => (i + 1) % TIPS.length)
    }, 3000)
    return () => clearInterval(interval)
  }, [showTips])

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#ffffff',
        fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
        color: '#1e293b',
        zIndex: 9999,
      }}
    >
      {/* Animated Creorga logo */}
      <motion.div
        initial={{ opacity: 0, scale: 0.85 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        style={{ position: 'relative', marginBottom: 22 }}
      >
        <motion.div
          animate={{ scale: [1, 1.08, 1] }}
          transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
          style={{
            width: 72,
            height: 72,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #ec4899 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 14px 40px rgba(99,102,241,0.30)',
          }}
        >
          <span
            style={{
              color: '#fff',
              fontSize: 34,
              fontWeight: 800,
              letterSpacing: '-0.04em',
            }}
          >
            C
          </span>
        </motion.div>
        <motion.div
          style={{
            position: 'absolute',
            inset: -6,
            borderRadius: '50%',
            border: '2px solid rgba(99,102,241,0.35)',
            pointerEvents: 'none',
          }}
          animate={{ scale: [1, 1.35], opacity: [0.8, 0] }}
          transition={{ duration: 1.8, repeat: Infinity, ease: 'easeOut' }}
        />
      </motion.div>

      {/* Message */}
      <div
        style={{
          fontSize: 15,
          fontWeight: 600,
          color: '#1e293b',
          letterSpacing: '-0.01em',
          marginBottom: 14,
        }}
      >
        {message}
      </div>

      {/* Bouncing dots spinner */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 18 }}>
        {[0, 1, 2].map((i) => (
          <motion.span
            key={i}
            style={{
              width: 9,
              height: 9,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            }}
            animate={{ y: [0, -8, 0], opacity: [0.5, 1, 0.5] }}
            transition={{
              duration: 0.9,
              repeat: Infinity,
              ease: 'easeInOut',
              delay: i * 0.15,
            }}
          />
        ))}
      </div>

      {/* Optional progress bar */}
      {typeof progress === 'number' && (
        <div
          style={{
            width: 220,
            height: 4,
            background: '#e2e8f0',
            borderRadius: 999,
            overflow: 'hidden',
            marginBottom: 20,
          }}
        >
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${Math.max(0, Math.min(100, progress))}%` }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
            style={{
              height: '100%',
              background: 'linear-gradient(90deg, #6366f1, #8b5cf6, #ec4899)',
              borderRadius: 999,
            }}
          />
        </div>
      )}

      {/* Cycling tip */}
      {showTips && (
        <div
          style={{
            marginTop: 10,
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            maxWidth: 420,
            padding: '8px 14px',
            background: '#f8fafc',
            border: '1px solid #e2e8f0',
            borderRadius: 999,
            fontSize: 12.5,
            color: '#64748b',
            fontWeight: 500,
            minHeight: 34,
            overflow: 'hidden',
          }}
        >
          <Lightbulb size={13} style={{ color: '#f59e0b', flexShrink: 0 }} />
          <AnimatePresence mode="wait">
            <motion.span
              key={tipIndex}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.3 }}
              style={{
                whiteSpace: 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
              }}
            >
              {TIPS[tipIndex]}
            </motion.span>
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}
