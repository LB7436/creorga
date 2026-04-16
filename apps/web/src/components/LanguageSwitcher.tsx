import { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useI18n, LOCALES } from '@/lib/i18n'

export default function LanguageSwitcher() {
  const { locale, setLocale } = useI18n()
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  const current = LOCALES.find((l) => l.code === locale) ?? LOCALES[0]

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [])

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      {/* trigger button */}
      <button
        onClick={() => setOpen((p) => !p)}
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 5,
          padding: '6px 10px',
          borderRadius: 10,
          border: '1px solid rgba(255,255,255,0.08)',
          background: 'rgba(255,255,255,0.04)',
          color: 'rgba(148,163,184,0.7)',
          fontSize: 12,
          fontWeight: 600,
          cursor: 'pointer',
          transition: 'all 0.2s',
          letterSpacing: '0.02em',
        }}
        onMouseEnter={(e) => {
          const el = e.currentTarget
          el.style.background = 'rgba(99,102,241,0.1)'
          el.style.borderColor = 'rgba(99,102,241,0.3)'
          el.style.color = '#a5b4fc'
        }}
        onMouseLeave={(e) => {
          const el = e.currentTarget
          el.style.background = 'rgba(255,255,255,0.04)'
          el.style.borderColor = 'rgba(255,255,255,0.08)'
          el.style.color = 'rgba(148,163,184,0.7)'
        }}
      >
        <span style={{ fontSize: 14, lineHeight: 1 }}>{current.flag}</span>
        {current.code.toUpperCase()}
      </button>

      {/* dropdown */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -6, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.96 }}
            transition={{ duration: 0.15, ease: 'easeOut' }}
            style={{
              position: 'absolute',
              top: 'calc(100% + 8px)',
              right: 0,
              minWidth: 160,
              borderRadius: 12,
              background: 'rgba(20,20,40,0.95)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              border: '1px solid rgba(255,255,255,0.08)',
              boxShadow: '0 16px 40px rgba(0,0,0,0.5)',
              padding: 4,
              zIndex: 200,
            }}
          >
            {LOCALES.map((loc) => {
              const isActive = loc.code === locale
              return (
                <button
                  key={loc.code}
                  onClick={() => {
                    setLocale(loc.code)
                    setOpen(false)
                  }}
                  style={{
                    width: '100%',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 10,
                    padding: '8px 12px',
                    borderRadius: 8,
                    border: 'none',
                    background: isActive ? 'rgba(99,102,241,0.15)' : 'transparent',
                    color: isActive ? '#a5b4fc' : 'rgba(203,213,225,0.8)',
                    fontSize: 13,
                    fontWeight: isActive ? 600 : 400,
                    cursor: 'pointer',
                    textAlign: 'left',
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.background = 'rgba(255,255,255,0.06)'
                      e.currentTarget.style.color = '#e2e8f0'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.background = 'transparent'
                      e.currentTarget.style.color = 'rgba(203,213,225,0.8)'
                    }
                  }}
                >
                  <span style={{ fontSize: 16, lineHeight: 1 }}>{loc.flag}</span>
                  <span>{loc.label}</span>
                  {isActive && (
                    <span
                      style={{
                        marginLeft: 'auto',
                        width: 6,
                        height: 6,
                        borderRadius: '50%',
                        background: '#818cf8',
                        boxShadow: '0 0 8px rgba(129,140,248,0.5)',
                      }}
                    />
                  )}
                </button>
              )
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
