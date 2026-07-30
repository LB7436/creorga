import { useEffect, useMemo, useState } from 'react'
import { Sparkles, X, Check } from 'lucide-react'
import api from '@/lib/api'
import { fetchAuth } from '@/lib/fetchAuth'

type Suggestion = {
  id?: string
  title?: string
  message?: string
  severity?: 'info' | 'warning' | 'critical'
  cta?: { label?: string; intent?: string }
}

const DISMISS_KEY = 'creorga.dismissedSuggestions'

function loadDismissed(): Record<string, number> {
  try {
    return JSON.parse(localStorage.getItem(DISMISS_KEY) || '{}')
  } catch {
    return {}
  }
}

export default function RobiSuggestionBanner() {
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [dismissed, setDismissed] = useState<Record<string, number>>(() => loadDismissed())

  useEffect(() => {
    let cancelled = false
    const poll = async () => {
      // via le client API authentifié (la route /api/agent exige un token)
      const res = await api.get('/agent/proactive/inbox').catch(() => null)
      if (!res) return
      const data = res.data ?? []
      if (!cancelled) setSuggestions(Array.isArray(data) ? data : data.items ?? data.notifications ?? [])
    }
    poll()
    const id = window.setInterval(poll, 60000)
    return () => {
      cancelled = true
      window.clearInterval(id)
    }
  }, [])

  const suggestion = useMemo(() => {
    const now = Date.now()
    return suggestions.find((item, index) => {
      if (item.severity !== 'critical') return false
      const id = item.id ?? `critical-${index}`
      return !dismissed[id] || dismissed[id] < now
    })
  }, [dismissed, suggestions])

  if (!suggestion) return null
  const id = suggestion.id ?? 'critical'

  const dismiss = () => {
    const next = { ...dismissed, [id]: Date.now() + 24 * 60 * 60 * 1000 }
    localStorage.setItem(DISMISS_KEY, JSON.stringify(next))
    setDismissed(next)
  }

  const confirm = async () => {
    if (suggestion.cta?.intent) {
      await fetchAuth('/api/agent/intent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: suggestion.cta.intent }),
      }).catch(() => undefined)
    }
    dismiss()
  }

  return (
    <div
      style={{
        margin: 16,
        marginBottom: 0,
        border: '1px solid rgba(168,85,247,0.22)',
        background: 'linear-gradient(135deg, rgba(168,85,247,0.16), rgba(216,180,254,0.1))',
        color: '#f8fafc',
        borderRadius: 14,
        padding: '12px 14px',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        boxShadow: '0 10px 30px rgba(0,0,0,0.16)',
      }}
    >
      <Sparkles size={18} color="#c4b5fd" />
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontSize: 13, fontWeight: 900 }}>{suggestion.title || 'Robi a detecte une action urgente'}</div>
        <div style={{ fontSize: 12, color: '#cbd5e1', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
          {suggestion.message || 'Une recommandation critique attend votre validation.'}
        </div>
      </div>
      <button onClick={confirm} style={{ border: 'none', borderRadius: 10, padding: '8px 10px', background: '#8b5cf6', color: '#fff', cursor: 'pointer', fontWeight: 800, display: 'flex', gap: 6, alignItems: 'center' }}>
        <Check size={14} /> {suggestion.cta?.label || 'Confirmer'}
      </button>
      <button onClick={dismiss} title="Ignorer 24h" style={{ border: 'none', borderRadius: 10, width: 34, height: 34, background: 'rgba(255,255,255,0.08)', color: '#cbd5e1', cursor: 'pointer' }}>
        <X size={15} />
      </button>
    </div>
  )
}
