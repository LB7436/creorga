import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useThemeColors } from '@/lib/theme'
import { trackEvent } from '@/lib/analytics'

/* ------------------------------------------------------------------ */
/* Types                                                              */
/* ------------------------------------------------------------------ */

type FontSize = 'small' | 'medium' | 'large' | 'xlarge'

interface A11ySettings {
  fontSize: FontSize
  highContrast: boolean
  reduceMotion: boolean
  dyslexiaFont: boolean
  screenReader: boolean
}

const DEFAULT_SETTINGS: A11ySettings = {
  fontSize: 'medium',
  highContrast: false,
  reduceMotion: false,
  dyslexiaFont: false,
  screenReader: false,
}

const STORAGE_KEY = 'creorga_a11y_settings'

/* ------------------------------------------------------------------ */
/* Persistance & application                                          */
/* ------------------------------------------------------------------ */

function loadSettings(): A11ySettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) }
  } catch {
    /* ignore */
  }
  return DEFAULT_SETTINGS
}

function saveSettings(settings: A11ySettings): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings))
}

const FONT_SIZE_MAP: Record<FontSize, string> = {
  small: '14px',
  medium: '16px',
  large: '18px',
  xlarge: '20px',
}

function applySettings(settings: A11ySettings): void {
  const root = document.documentElement

  root.style.setProperty('--a11y-font-size', FONT_SIZE_MAP[settings.fontSize])
  root.style.setProperty(
    '--a11y-font-family',
    settings.dyslexiaFont
      ? '"OpenDyslexic", "Comic Sans MS", sans-serif'
      : 'inherit',
  )
  root.style.setProperty(
    '--a11y-animation-duration',
    settings.reduceMotion ? '0.001s' : '',
  )
  root.style.setProperty(
    '--a11y-contrast',
    settings.highContrast ? 'contrast(1.3) saturate(1.2)' : 'none',
  )

  root.dataset.a11yHighContrast = settings.highContrast ? 'true' : 'false'
  root.dataset.a11yReduceMotion = settings.reduceMotion ? 'true' : 'false'
  root.dataset.a11yDyslexia = settings.dyslexiaFont ? 'true' : 'false'
  root.dataset.a11yScreenReader = settings.screenReader ? 'true' : 'false'
  root.style.fontSize = FONT_SIZE_MAP[settings.fontSize]

  if (settings.reduceMotion) {
    root.style.setProperty('scroll-behavior', 'auto')
  } else {
    root.style.removeProperty('scroll-behavior')
  }
}

// Appliquer au chargement
if (typeof window !== 'undefined') {
  applySettings(loadSettings())
}

/* ------------------------------------------------------------------ */
/* Composant                                                          */
/* ------------------------------------------------------------------ */

function AccessibilityMenu() {
  const colors = useThemeColors()
  const [open, setOpen] = useState(false)
  const [settings, setSettings] = useState<A11ySettings>(() => loadSettings())

  useEffect(() => {
    applySettings(settings)
    saveSettings(settings)
  }, [settings])

  const update = <K extends keyof A11ySettings>(
    key: K,
    value: A11ySettings[K],
  ) => {
    setSettings((prev) => ({ ...prev, [key]: value }))
    trackEvent('settings_changed', { type: 'accessibility', key, value })
  }

  const reset = () => {
    setSettings(DEFAULT_SETTINGS)
    trackEvent('settings_changed', { type: 'accessibility', action: 'reset' })
  }

  const FONT_SIZES: FontSize[] = ['small', 'medium', 'large', 'xlarge']
  const FONT_LABELS: Record<FontSize, string> = {
    small: 'Petit',
    medium: 'Moyen',
    large: 'Grand',
    xlarge: 'Très grand',
  }

  return (
    <>
      {/* Floating button */}
      <button
        onClick={() => setOpen(true)}
        aria-label="Options d'accessibilité"
        title="Accessibilité"
        style={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          width: 48,
          height: 48,
          borderRadius: '50%',
          border: 'none',
          background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
          color: '#fff',
          fontSize: 22,
          cursor: 'pointer',
          boxShadow: '0 10px 30px rgba(99,102,241,0.4)',
          zIndex: 900,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        {'\u267F'}
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Paramètres d'accessibilité"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setOpen(false)}
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(15,23,42,0.5)',
              backdropFilter: 'blur(6px)',
              zIndex: 950,
              display: 'flex',
              alignItems: 'flex-end',
              justifyContent: 'flex-end',
              padding: 24,
            }}
          >
            <motion.div
              onClick={(e) => e.stopPropagation()}
              initial={{ opacity: 0, x: 40, y: 20 }}
              animate={{ opacity: 1, x: 0, y: 0 }}
              exit={{ opacity: 0, x: 40, y: 20 }}
              style={{
                width: 380,
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
                  padding: '16px 20px',
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
                      fontSize: 16,
                      fontWeight: 700,
                      color: colors.text,
                    }}
                  >
                    Accessibilité
                  </h2>
                  <p
                    style={{
                      margin: '2px 0 0',
                      fontSize: 12,
                      color: colors.textLight,
                    }}
                  >
                    Adaptez l'interface à vos besoins
                  </p>
                </div>
                <button
                  onClick={() => setOpen(false)}
                  aria-label="Fermer"
                  style={{
                    width: 30,
                    height: 30,
                    borderRadius: 8,
                    border: `1px solid ${colors.border}`,
                    background: 'transparent',
                    color: colors.textMuted,
                    cursor: 'pointer',
                  }}
                >
                  {'\u2715'}
                </button>
              </div>

              {/* Body */}
              <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
                {/* Font size */}
                <section style={{ marginBottom: 20 }}>
                  <label
                    style={{
                      display: 'block',
                      fontSize: 13,
                      fontWeight: 600,
                      color: colors.text,
                      marginBottom: 8,
                    }}
                  >
                    Taille du texte
                  </label>
                  <input
                    type="range"
                    min={0}
                    max={3}
                    step={1}
                    value={FONT_SIZES.indexOf(settings.fontSize)}
                    onChange={(e) =>
                      update('fontSize', FONT_SIZES[Number(e.target.value)])
                    }
                    aria-label="Taille du texte"
                    style={{ width: '100%', accentColor: '#6366f1' }}
                  />
                  <div
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      fontSize: 11,
                      color: colors.textLight,
                      marginTop: 4,
                    }}
                  >
                    {FONT_SIZES.map((s) => (
                      <span
                        key={s}
                        style={{
                          fontWeight: settings.fontSize === s ? 700 : 400,
                          color:
                            settings.fontSize === s
                              ? colors.accent
                              : colors.textLight,
                        }}
                      >
                        {FONT_LABELS[s]}
                      </span>
                    ))}
                  </div>
                </section>

                {/* Toggles */}
                {[
                  {
                    key: 'highContrast' as const,
                    label: 'Contraste élevé',
                    hint: 'Augmente la lisibilité',
                  },
                  {
                    key: 'reduceMotion' as const,
                    label: 'Réduire les animations',
                    hint: 'Désactive les transitions',
                  },
                  {
                    key: 'dyslexiaFont' as const,
                    label: 'Police dyslexie',
                    hint: 'Police adaptée (OpenDyslexic)',
                  },
                  {
                    key: 'screenReader' as const,
                    label: 'Mode lecteur d\'écran',
                    hint: 'Optimisations ARIA',
                  },
                ].map((opt) => (
                  <label
                    key={opt.key}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      padding: '12px 14px',
                      borderRadius: 10,
                      background: colors.bg,
                      border: `1px solid ${colors.border}`,
                      marginBottom: 8,
                      cursor: 'pointer',
                    }}
                  >
                    <div>
                      <div
                        style={{
                          fontSize: 13,
                          fontWeight: 600,
                          color: colors.text,
                        }}
                      >
                        {opt.label}
                      </div>
                      <div
                        style={{
                          fontSize: 11,
                          color: colors.textLight,
                          marginTop: 2,
                        }}
                      >
                        {opt.hint}
                      </div>
                    </div>
                    <input
                      type="checkbox"
                      checked={settings[opt.key]}
                      onChange={(e) => update(opt.key, e.target.checked)}
                      style={{
                        width: 38,
                        height: 22,
                        accentColor: '#6366f1',
                        cursor: 'pointer',
                      }}
                    />
                  </label>
                ))}

                {/* Reset */}
                <button
                  onClick={reset}
                  style={{
                    marginTop: 12,
                    width: '100%',
                    padding: '10px 14px',
                    borderRadius: 10,
                    border: `1px solid ${colors.border}`,
                    background: colors.bg,
                    color: colors.textMuted,
                    fontSize: 13,
                    fontWeight: 500,
                    cursor: 'pointer',
                  }}
                >
                  Réinitialiser les préférences
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}

export default AccessibilityMenu
