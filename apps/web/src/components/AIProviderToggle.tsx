import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Lock, Cloud, Sparkles, ChevronDown, Check } from 'lucide-react'
import { useAIProvider, type AIProvider } from '@/stores/aiProviderStore'

/**
 * Provider switcher — lets the user pick where AI requests go.
 *
 *   <AIProviderToggle />
 *
 * Persisted in localStorage via Zustand.
 */

const OPTIONS: { id: AIProvider; label: string; sub: string; icon: any; color: string }[] = [
  { id: 'local', label: 'Local Gemma 2B', sub: 'Ollama · 100 % privé · CNPD',     icon: Lock,     color: '#10b981' },
  { id: 'cloud', label: 'Cloud Claude',   sub: 'Anthropic · meilleure qualité',   icon: Cloud,    color: '#3b82f6' },
  { id: 'auto',  label: 'Auto-routage',   sub: 'Privacy → local · Quality → cloud', icon: Sparkles, color: '#8b5cf6' },
]

export default function AIProviderToggle() {
  const { provider, setProvider } = useAIProvider()
  const [open, setOpen] = useState(false)

  const current = OPTIONS.find((o) => o.id === provider) || OPTIONS[0]
  const Icon = current.icon

  return (
    <div style={{ position: 'relative', display: 'inline-block' }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 8,
          padding: '8px 14px', borderRadius: 10,
          border: `1px solid ${current.color}33`,
          background: `linear-gradient(135deg, ${current.color}10, ${current.color}05)`,
          color: current.color, fontWeight: 700, fontSize: 12,
          cursor: 'pointer',
        }}
      >
        <Icon size={14} />
        <span>{current.label}</span>
        <ChevronDown size={12} style={{ transform: open ? 'rotate(180deg)' : 'none', transition: 'transform .15s' }} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
            style={{
              position: 'absolute', top: '100%', right: 0, marginTop: 6, zIndex: 50,
              minWidth: 280, background: '#fff', borderRadius: 12,
              boxShadow: '0 12px 32px rgba(0,0,0,0.15), 0 0 0 1px rgba(15,23,42,0.06)',
              padding: 6,
            }}
          >
            <div style={{ padding: '8px 10px', fontSize: 10, fontWeight: 800, color: '#94a3b8', letterSpacing: 1, textTransform: 'uppercase' }}>
              Provider IA par défaut
            </div>
            {OPTIONS.map((o) => {
              const ItemIcon = o.icon
              const active = o.id === provider
              return (
                <button
                  key={o.id}
                  onClick={() => { setProvider(o.id); setOpen(false) }}
                  style={{
                    display: 'flex', width: '100%', alignItems: 'flex-start', gap: 10,
                    padding: '10px 12px', borderRadius: 8, border: 'none',
                    background: active ? `${o.color}10` : 'transparent', cursor: 'pointer',
                    textAlign: 'left',
                  }}
                  onMouseEnter={(e) => { if (!active) e.currentTarget.style.background = '#f8fafc' }}
                  onMouseLeave={(e) => { if (!active) e.currentTarget.style.background = 'transparent' }}
                >
                  <ItemIcon size={16} color={o.color} style={{ marginTop: 2 }} />
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span style={{ fontWeight: 700, fontSize: 13, color: '#1e293b' }}>{o.label}</span>
                      {active && <Check size={12} color={o.color} />}
                    </div>
                    <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{o.sub}</div>
                  </div>
                </button>
              )
            })}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
