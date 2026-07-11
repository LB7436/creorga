import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ACCENT, ACCENT2, TEXT, MUTED, BORDER, SURFACE } from './theme'
import { sfx, buzz } from './lib/juice'
import { useGuestLang } from '../i18n'

/**
 * v4.9 — Écran fin de partie partagé par tous les jeux.
 * v6.0 — feedback sonore + haptique à l'affichage.
 */

export default function GameOverModal({
  score,
  best,
  isNewRecord,
  onReplay,
  onBack,
}: {
  score: number
  best: number
  isNewRecord: boolean
  onReplay: () => void
  onBack?: () => void
}) {
  const { t } = useGuestLang()
  useEffect(() => {
    if (isNewRecord) {
      sfx.win()
      buzz.win()
    } else {
      sfx.good()
      buzz.tap()
    }
  }, [isNewRecord])

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        style={{
          position: 'fixed', inset: 0, zIndex: 9200,
          background: 'rgba(2,2,10,0.82)', backdropFilter: 'blur(6px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 20,
        }}
      >
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.95 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          style={{
            background: SURFACE, border: `1px solid ${BORDER}`, borderRadius: 20,
            padding: 28, maxWidth: 380, width: '100%', textAlign: 'center', color: TEXT,
            position: 'relative', overflow: 'hidden',
          }}
        >
          {isNewRecord && (
            <div style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
              {Array.from({ length: 24 }).map((_, i) => (
                <span
                  key={i}
                  style={{
                    position: 'absolute',
                    left: `${(i * 37) % 100}%`,
                    top: -10,
                    width: 6, height: 6, borderRadius: 2,
                    background: i % 2 === 0 ? ACCENT : ACCENT2,
                    animation: `confetti-fall ${1.2 + (i % 5) * 0.2}s ease-in ${(i % 6) * 0.05}s forwards`,
                  }}
                />
              ))}
              <style>{`
                @keyframes confetti-fall {
                  to { transform: translateY(340px) rotate(200deg); opacity: 0; }
                }
              `}</style>
            </div>
          )}

          <div style={{ fontSize: 48, marginBottom: 8 }}>{isNewRecord ? '🏆' : '🎮'}</div>
          <h2 style={{ margin: '0 0 4px', fontSize: 20, fontWeight: 900 }}>
            {isNewRecord ? t('gameover_record') : t('gameover_over')}
          </h2>
          <div style={{ fontSize: 34, fontWeight: 900, color: ACCENT, margin: '10px 0' }}>{score}</div>
          <div style={{ fontSize: 12, color: MUTED, marginBottom: 20 }}>
            {t('gameover_best')} : <strong style={{ color: TEXT }}>{best}</strong>
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            {onBack && (
              <button onClick={onBack} style={{
                flex: 1, padding: '12px 14px', borderRadius: 12,
                border: `1px solid ${BORDER}`, background: 'transparent', color: MUTED,
                fontWeight: 700, fontSize: 13, cursor: 'pointer',
              }}>
                {t('gameover_back')}
              </button>
            )}
            <button onClick={onReplay} style={{
              flex: 1, padding: '12px 14px', borderRadius: 12, border: 'none',
              background: `linear-gradient(135deg, ${ACCENT}, ${ACCENT2})`, color: '#fff',
              fontWeight: 800, fontSize: 13, cursor: 'pointer',
            }}>
              {t('gameover_replay')}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}
