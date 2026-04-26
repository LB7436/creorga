import { useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useThemeColors } from '@/lib/theme'
import {
  getShortcutsByCategory,
  formatKeys,
  type ShortcutCategory,
  type Shortcut,
} from '@/lib/shortcuts'

interface ShortcutsOverlayProps {
  open: boolean
  onClose: () => void
}

const CATEGORY_LABELS: Record<ShortcutCategory, string> = {
  navigation: 'Navigation',
  modules: 'Modules',
  actions: 'Actions',
  general: 'Général',
  accessibility: 'Accessibilité',
}

const CATEGORY_ICONS: Record<ShortcutCategory, string> = {
  navigation: '\u{1F9ED}',
  modules: '\u{1F9F1}',
  actions: '⚡',
  general: '✨',
  accessibility: '♿',
}

function ShortcutsOverlay({ open, onClose }: ShortcutsOverlayProps) {
  const colors = useThemeColors()

  useEffect(() => {
    if (!open) return
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [open, onClose])

  const grouped = getShortcutsByCategory()
  const categories: ShortcutCategory[] = [
    'general',
    'navigation',
    'modules',
    'actions',
    'accessibility',
  ]

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          role="dialog"
          aria-modal="true"
          aria-label="Raccourcis clavier"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(15,23,42,0.6)',
            backdropFilter: 'blur(8px)',
            zIndex: 1000,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            padding: 20,
          }}
        >
          <motion.div
            onClick={(e) => e.stopPropagation()}
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ duration: 0.2 }}
            style={{
              width: '100%',
              maxWidth: 720,
              maxHeight: '85vh',
              background: colors.bgCard,
              borderRadius: 16,
              border: `1px solid ${colors.border}`,
              boxShadow: '0 30px 80px rgba(0,0,0,0.3)',
              overflow: 'hidden',
              display: 'flex',
              flexDirection: 'column',
            }}
          >
            {/* Header */}
            <div
              style={{
                padding: '18px 24px',
                borderBottom: `1px solid ${colors.border}`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <div>
                <h2
                  style={{
                    margin: 0,
                    fontSize: 18,
                    fontWeight: 700,
                    color: colors.text,
                  }}
                >
                  Raccourcis clavier
                </h2>
                <p
                  style={{
                    margin: '4px 0 0',
                    fontSize: 13,
                    color: colors.textLight,
                  }}
                >
                  Travaillez plus vite avec ces raccourcis
                </p>
              </div>
              <button
                onClick={onClose}
                aria-label="Fermer"
                style={{
                  width: 32,
                  height: 32,
                  borderRadius: 8,
                  border: `1px solid ${colors.border}`,
                  background: 'transparent',
                  color: colors.textMuted,
                  cursor: 'pointer',
                  fontSize: 16,
                }}
              >
                {'✕'}
              </button>
            </div>

            {/* Body */}
            <div style={{ flex: 1, overflowY: 'auto', padding: 24 }}>
              {categories.map((cat) => {
                const list = grouped[cat]
                if (!list || list.length === 0) return null
                return (
                  <section key={cat} style={{ marginBottom: 24 }}>
                    <div
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 8,
                        marginBottom: 12,
                      }}
                    >
                      <span style={{ fontSize: 16 }}>{CATEGORY_ICONS[cat]}</span>
                      <h3
                        style={{
                          margin: 0,
                          fontSize: 13,
                          fontWeight: 700,
                          color: colors.textMuted,
                          textTransform: 'uppercase',
                          letterSpacing: '0.06em',
                        }}
                      >
                        {CATEGORY_LABELS[cat]}
                      </h3>
                    </div>
                    <div
                      style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                        gap: 8,
                      }}
                    >
                      {list.map((s: Shortcut) => (
                        <div
                          key={s.id}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            padding: '10px 12px',
                            borderRadius: 10,
                            background: colors.bg,
                            border: `1px solid ${colors.border}`,
                          }}
                        >
                          <span style={{ fontSize: 13, color: colors.text }}>
                            {s.label}
                          </span>
                          <kbd
                            style={{
                              fontSize: 11,
                              padding: '3px 8px',
                              borderRadius: 6,
                              background: colors.bgCard,
                              border: `1px solid ${colors.border}`,
                              color: colors.textMuted,
                              fontFamily: 'inherit',
                              fontWeight: 600,
                            }}
                          >
                            {formatKeys(s.keys)}
                          </kbd>
                        </div>
                      ))}
                    </div>
                  </section>
                )
              })}

              {Object.values(grouped).every((arr) => arr.length === 0) && (
                <p
                  style={{
                    textAlign: 'center',
                    color: colors.textLight,
                    fontSize: 14,
                    padding: 32,
                  }}
                >
                  Aucun raccourci enregistré pour le moment.
                </p>
              )}
            </div>

            {/* Footer */}
            <div
              style={{
                padding: '12px 24px',
                borderTop: `1px solid ${colors.border}`,
                fontSize: 12,
                color: colors.textLight,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <span>Appuyez sur Échap pour fermer</span>
              <span>Creorga OS</span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}

export default ShortcutsOverlay
