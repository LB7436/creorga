import { useEffect, useState, useRef } from 'react'
import { Link, useSearchParams, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Sun, Moon, Volume2, VolumeX, ChevronRight, Loader2, RefreshCw,
  Sparkles, ArrowRight, Check, X,
} from 'lucide-react'
import AssistantMascot from '@/components/AssistantMascot'
import { useAssistant } from '@/stores/assistantStore'
import { fetchAuth } from '@/lib/fetchAuth'

/**
 * v3.17 — Le Briefing du Matin / Soir
 *
 * "C'est ma journée" — un bouton, Robi te lit tout :
 *   • combien de personnes au planning, qui
 *   • stock critique
 *   • factures impayées
 *   • réservations
 *   • chiffre d'affaires en cours
 *   + 3 priorités exécutables d'un tap
 *
 * S'ouvre auto à 7h le matin (cron-style via localStorage flag).
 */

function getBackend(): string {
  if (typeof window === 'undefined') return 'http://localhost:3002'
  return localStorage.getItem('creorga.backend.remote')
      || (import.meta as any).env?.VITE_REMOTE_BACKEND
      || (import.meta as any).env?.VITE_BACKEND_URL
      || 'http://localhost:3002'
}

interface Priority {
  id: string
  emoji: string
  title: string
  subtitle: string
  done?: boolean
  action?: { type: string; route?: string; commandId?: string; intent?: string }
}

interface BriefingData {
  period: 'morning' | 'evening'
  today: string
  weekday: string
  heure: string
  metrics: {
    occupiedTables: number
    totalTables: number
    revenueOpen: number
    staffToday: number
    staffNames: string[]
    lowStock: number
    overdue: number
    unpaidTotal: number
  }
  voice: string
  priorities: Priority[]
}

export default function MobileBriefing() {
  const a = useAssistant()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const period = (params.get('period') === 'evening' ? 'evening' : 'morning') as 'morning' | 'evening'
  const [data, setData] = useState<BriefingData | null>(null)
  const [loading, setLoading] = useState(true)
  const [speaking, setSpeaking] = useState(false)
  const [doneIds, setDoneIds] = useState<Set<string>>(new Set())
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null)

  const fetchBriefing = async () => {
    setLoading(true)
    try {
      const r = await fetchAuth(`${getBackend()}/api/agent/daily-briefing`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ period }),
      })
      if (!r.ok) throw new Error('Backend ' + r.status)
      const d = await r.json()
      setData(d)
      // Auto-speak on first load if voice enabled
      if (a.voiceEnabled && d.voice) setTimeout(() => speak(d.voice), 600)
    } catch (e: any) {
      // Silent fail: show minimal UI
    } finally { setLoading(false) }
  }

  useEffect(() => {
    fetchBriefing()
    return () => stopSpeaking()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [period])

  function speak(text: string) {
    if (typeof window === 'undefined' || !window.speechSynthesis) return
    stopSpeaking()
    const u = new SpeechSynthesisUtterance(text.replace(/[*_`#]/g, ''))
    u.lang = 'fr-FR'
    u.rate = a.voiceSpeed
    u.onstart = () => setSpeaking(true)
    u.onend = () => setSpeaking(false)
    u.onerror = () => setSpeaking(false)
    utteranceRef.current = u
    window.speechSynthesis.speak(u)
  }
  function stopSpeaking() {
    try { window.speechSynthesis?.cancel() } catch { /* */ }
    setSpeaking(false)
  }

  const executePriority = async (p: Priority) => {
    if (!p.action) {
      setDoneIds((s) => new Set([...Array.from(s), p.id]))
      return
    }
    if (p.action.type === 'navigate' && p.action.route) {
      navigate(p.action.route)
      return
    }
    if (p.action.type === 'command' && p.action.commandId) {
      try {
        const r = await fetchAuth(`${getBackend()}/api/agent/execute`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ commandId: p.action.commandId, input: {} }),
        })
        if (r.ok) {
          const result = await r.json()
          if (result?.summary || result?.text) speak(result.summary || result.text)
          setDoneIds((s) => new Set([...Array.from(s), p.id]))
        }
      } catch { /* */ }
    }
  }

  const Icon = period === 'morning' ? Sun : Moon
  const greeting = period === 'morning' ? 'Bonjour' : 'Bonsoir'
  const gradient = period === 'morning'
    ? 'linear-gradient(160deg,#fbbf24 0%,#ec4899 50%,#8b5cf6 100%)'
    : 'linear-gradient(160deg,#6366f1 0%,#8b5cf6 50%,#0a0a14 100%)'

  return (
    <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 14, paddingBottom: 30 }}>
      {/* Hero — animation gradient + mascot */}
      <motion.div
        initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
        style={{
          padding: '20px 18px', borderRadius: 18, position: 'relative', overflow: 'hidden',
          background: gradient,
          color: '#fff',
        }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <AssistantMascot variant={a.mascot} size={64} animated speaking={speaking} />
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, opacity: 0.85, fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', display: 'inline-flex', alignItems: 'center', gap: 5 }}>
              <Icon size={12} /> {period === 'morning' ? 'BRIEFING DU MATIN' : 'BILAN DU SOIR'}
            </div>
            <div style={{ fontSize: 22, fontWeight: 900, marginTop: 2 }}>
              {greeting} {a.name === 'Robi' ? '!' : `, ${a.name}`}
            </div>
            <div style={{ fontSize: 12, opacity: 0.9, marginTop: 4, textTransform: 'capitalize' }}>
              {data?.weekday || '...'} · {data?.heure || ''}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Voice transcript card with play / stop button */}
      <motion.div
        initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
        style={{
          padding: 14, borderRadius: 14, position: 'relative',
          background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
          color: '#f1f5f9',
        }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
          <Sparkles size={16} color="#a78bfa" style={{ flexShrink: 0, marginTop: 3 }} />
          <div style={{ flex: 1, fontSize: 13, lineHeight: 1.6 }}>
            {loading ? (
              <span style={{ color: '#94a3b8' }}>Robi prépare ton briefing…</span>
            ) : (
              data?.voice || 'Briefing indisponible'
            )}
          </div>
        </div>
        {data?.voice && (
          <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
            <motion.button
              whileTap={{ scale: 0.94 }}
              onClick={() => speaking ? stopSpeaking() : speak(data.voice)}
              style={{
                flex: 1, padding: '10px', borderRadius: 10, border: 'none',
                background: speaking ? 'linear-gradient(135deg,#ef4444,#ec4899)' : 'linear-gradient(135deg,#8b5cf6,#a78bfa)',
                color: '#fff', fontSize: 12, fontWeight: 700, cursor: 'pointer',
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 6,
              }}>
              {speaking ? <><VolumeX size={14} /> Stop la voix</> : <><Volume2 size={14} /> Écouter Robi</>}
            </motion.button>
            <button onClick={fetchBriefing} style={{
              padding: '10px 12px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)',
              background: 'rgba(255,255,255,0.05)', color: '#cbd5e1', cursor: 'pointer',
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            }}><RefreshCw size={14} /></button>
          </div>
        )}
      </motion.div>

      {/* Metrics grid */}
      {data && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
          style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 8 }}>
          <Metric icon="📋" label="Au planning" value={`${data.metrics.staffToday}`} sub={data.metrics.staffNames.slice(0, 2).join(', ') || '—'} />
          <Metric icon="🪑" label="Tables ouvertes" value={`${data.metrics.occupiedTables}/${data.metrics.totalTables}`} />
          <Metric icon="💶" label="CA en cours" value={`${data.metrics.revenueOpen.toFixed(0)} €`} />
          <Metric icon="📦" label="Inventaire en migration" value="—" sub="Aucune donnée simulée" />
        </motion.div>
      )}

      {/* Priorités du jour */}
      {data && data.priorities.length > 0 && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
          <div style={{ fontSize: 11, color: '#a78bfa', fontWeight: 800, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 8, paddingLeft: 4 }}>
            ⚡ {data.priorities.length} priorité{data.priorities.length > 1 ? 's' : ''} du jour
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <AnimatePresence>
              {data.priorities.map((p, i) => (
                <motion.div key={p.id}
                  initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }} transition={{ delay: 0.4 + i * 0.08 }}
                  style={{
                    padding: 14, borderRadius: 12,
                    background: doneIds.has(p.id) ? 'rgba(16,185,129,0.1)' : 'rgba(255,255,255,0.04)',
                    border: doneIds.has(p.id) ? '1px solid rgba(16,185,129,0.3)' : '1px solid rgba(255,255,255,0.08)',
                    display: 'flex', alignItems: 'center', gap: 12,
                    opacity: doneIds.has(p.id) ? 0.6 : 1,
                  }}>
                  <div style={{ fontSize: 26 }}>{doneIds.has(p.id) ? '✅' : p.emoji}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#fff', textDecoration: doneIds.has(p.id) ? 'line-through' : 'none' }}>
                      {p.title}
                    </div>
                    <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 3 }}>{p.subtitle}</div>
                  </div>
                  {!doneIds.has(p.id) && p.action && (
                    <motion.button
                      whileTap={{ scale: 0.92 }}
                      onClick={() => executePriority(p)}
                      style={{
                        padding: '8px 12px', borderRadius: 999, border: 'none', cursor: 'pointer',
                        background: 'linear-gradient(135deg,#8b5cf6,#ec4899)',
                        color: '#fff', fontSize: 11, fontWeight: 800,
                        display: 'inline-flex', alignItems: 'center', gap: 4,
                      }}>
                      Faire <ArrowRight size={11} />
                    </motion.button>
                  )}
                  {!doneIds.has(p.id) && !p.action && (
                    <button onClick={() => setDoneIds((s) => new Set([...Array.from(s), p.id]))}
                      style={{
                        padding: 7, borderRadius: 999, border: '1px solid rgba(16,185,129,0.4)', cursor: 'pointer',
                        background: 'rgba(16,185,129,0.1)', color: '#10b981',
                        display: 'inline-flex', alignItems: 'center',
                      }}>
                      <Check size={14} />
                    </button>
                  )}
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </motion.div>
      )}

      {/* Switch period */}
      <Link
        to={`/m/briefing?period=${period === 'morning' ? 'evening' : 'morning'}`}
        style={{
          marginTop: 6, padding: '10px 14px', borderRadius: 10, textDecoration: 'none',
          background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
          color: '#cbd5e1', fontSize: 12, fontWeight: 600,
          display: 'inline-flex', alignItems: 'center', justifyContent: 'space-between', gap: 6,
        }}>
        <span>{period === 'morning' ? '🌙 Voir le bilan du soir' : '☀️ Voir le briefing du matin'}</span>
        <ChevronRight size={14} />
      </Link>
    </div>
  )
}

function Metric({ icon, label, value, sub, highlight }: { icon: string; label: string; value: string; sub?: string; highlight?: string }) {
  return (
    <div style={{
      padding: 12, borderRadius: 12,
      background: highlight ? `${highlight}15` : 'rgba(255,255,255,0.04)',
      border: `1px solid ${highlight ? highlight + '40' : 'rgba(255,255,255,0.08)'}`,
    }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 18 }}>
        {icon}
      </div>
      <div style={{ fontSize: 22, fontWeight: 900, color: '#fff', marginTop: 4 }}>{value}</div>
      <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase', marginTop: 2 }}>{label}</div>
      {sub && <div style={{ fontSize: 10, color: '#a78bfa', marginTop: 3 }}>{sub}</div>}
    </div>
  )
}
