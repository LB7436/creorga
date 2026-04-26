import { motion, AnimatePresence } from 'framer-motion'
import { useTheme, useThemeColors, type Theme } from '@/lib/theme'

const MODES: { key: Theme; icon: string; label: string }[] = [
  { key: 'light', icon: '☀️', label: 'Light' },
  { key: 'dark', icon: '🌙', label: 'Dark' },
  { key: 'auto', icon: '💻', label: 'System' },
]

export default function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const colors = useThemeColors()

  const currentIndex = MODES.findIndex((m) => m.key === theme)
  const current = MODES[currentIndex]

  const handleCycle = () => {
    const nextIndex = (currentIndex + 1) % MODES.length
    setTheme(MODES[nextIndex].key)
  }

  return (
    <button
      onClick={handleCycle}
      title={current.label}
      style={{
        width: 36,
        height: 36,
        borderRadius: 10,
        border: `1px solid ${colors.border}`,
        background: colors.bgCard,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
        overflow: 'hidden',
        transition: 'border-color 0.2s, background 0.2s',
        padding: 0,
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = colors.accent
        e.currentTarget.style.background = colors.accentLight
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = colors.border
        e.currentTarget.style.background = colors.bgCard
      }}
    >
      <AnimatePresence mode="wait">
        <motion.span
          key={theme}
          initial={{ rotate: -90, opacity: 0, scale: 0.5 }}
          animate={{ rotate: 0, opacity: 1, scale: 1 }}
          exit={{ rotate: 90, opacity: 0, scale: 0.5 }}
          transition={{ duration: 0.2, ease: 'easeInOut' }}
          style={{
            fontSize: 16,
            lineHeight: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
          }}
        >
          {current.icon}
        </motion.span>
      </AnimatePresence>
    </button>
  )
}
