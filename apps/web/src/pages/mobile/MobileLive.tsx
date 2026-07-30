import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { TrendingUp, Users, Coins, AlertTriangle, ArrowRight, RefreshCw, WifiOff, Sparkles, Sun, Camera } from 'lucide-react'
import { fetchAuth } from '@/lib/fetchAuth'

/**
 * Mobile patron dashboard — gros KPIs lisibles à distance.
 * Auto-refresh toutes les 30 s. Tap KPI = détail.
 *
 * v3.15 fix : backend URL dynamique (localStorage > .env > localhost)
 *             → permet à l'utilisateur de changer le tunnel sans rebuild APK.
 */

function getBackend(): string {
  if (typeof window === 'undefined') return 'http://localhost:3002'
  return localStorage.getItem('creorga.backend.remote')
      || (import.meta as any).env?.VITE_REMOTE_BACKEND
      || (import.meta as any).env?.VITE_BACKEND_URL
      || 'http://localhost:3002'
}

interface LiveData {
  occupiedTables: number
  totalTables: number
  currentRevenueOpen: number
  invoicesOverdue: number
  unpaidTotal: number
  lowStock: number
  todayShifts: number
  alerts: { critical: number; warnings: number }
}

async function runCmd(commandId: string, input?: any) {
  try {
    const r = await fetchAuth(`${getBackend()}/api/agent/execute`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ commandId, input }),
      signal: AbortSignal.timeout(8000),
    })
    if (!r.ok) return null
    return r.json()
  } catch { return null }
}

interface ProactiveSuggestion {
  icon: string
  tone: 'info' | 'warning' | 'danger' | 'positive'
  title: string
  detail: string
  cta?: string
  route?: string
  commandId?: string
}

export default function MobileLive() {
  const navigate = useNavigate()
  const [data, setData] = useState<LiveData | null>(null)
  const [loading, setLoading] = useState(true)
  const [offline, setOffline] = useState(false)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)
  const [suggestions, setSuggestions] = useState<ProactiveSuggestion[]>([])

  // v3.17 — proactive suggestions (loaded after KPIs, non-blocking)
  const fetchSuggestions = async () => {
    try {
      const r = await fetchAuth(`${getBackend()}/api/agent/proactive`, {
        signal: AbortSignal.timeout(6000),
      })
      if (r.ok) {
        const d = await r.json()
        setSuggestions(d.suggestions || [])
      }
    } catch { /* silent */ }
  }

  const executeSuggestion = async (s: ProactiveSuggestion) => {
    if (s.route) { navigate(s.route); return }
    if (s.commandId) {
      try {
        await fetchAuth(`${getBackend()}/api/agent/execute`, {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ commandId: s.commandId, input: {} }),
        })
        // refresh suggestions after action
        fetchSuggestions()
      } catch { /* */ }
    }
  }

  const fetchAll = async () => {
    try {
      const [day, overdue, unpaid, lowStock, today] = await Promise.all([
        runCmd('home.day-summary'),
        runCmd('inv.overdue'),
        runCmd('inv.unpaid-total'),
        runCmd('inv.low-stock'),
        runCmd('hr.who-today'),
      ])
      // Si TOUTES les requêtes échouent → mode offline
      if (!day && !overdue && !unpaid && !lowStock && !today) {
        setOffline(true)
        setLoading(false)
        return
      }
      setOffline(false)
      setData({
        occupiedTables: day?.data?.occupiedTables ?? 0,
        totalTables: 12,
        currentRevenueOpen: day?.data?.currentRevenueOpen ?? 0,
        invoicesOverdue: overdue?.ui?.items?.length ?? 0,
        unpaidTotal: unpaid?.text?.match(/\*\*([\d.]+)/) ? parseFloat(unpaid.text.match(/\*\*([\d.]+)/)[1]) : 0,
        lowStock: lowStock?.ui?.items?.length ?? 0,
        todayShifts: today?.ui?.items?.length ?? 0,
        alerts: {
          critical: (overdue?.ui?.items?.length ?? 0) > 5 ? 1 : 0,
          warnings: (lowStock?.ui?.items?.length ?? 0),
        },
      })
      setLastUpdate(new Date())
    } catch {
      setOffline(true)
    } finally { setLoading(false) }
  }

  useEffect(() => {
    fetchAll()
    fetchSuggestions()
    const id = setInterval(() => { fetchAll(); fetchSuggestions() }, 30_000)
    return () => clearInterval(id)
  }, [])

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>Chargement…</div>

  if (offline) {
    return (
      <div style={{ padding: 24, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 16, marginTop: 40 }}>
        <WifiOff size={48} color="#ef4444" />
        <h2 style={{ margin: 0, fontSize: 18, color: '#fca5a5' }}>Backend injoignable</h2>
        <div style={{ fontSize: 13, color: '#94a3b8', textAlign: 'center', maxWidth: 280 }}>
          L'app n'arrive pas à joindre le serveur Creorga.<br/>
          URL actuelle :<br/>
          <code style={{ fontSize: 10, color: '#fbbf24', wordBreak: 'break-all' }}>{getBackend()}</code>
        </div>
        <Link to="/m/settings" style={{
          padding: '12px 20px', borderRadius: 12, textDecoration: 'none',
          background: 'linear-gradient(135deg,#8b5cf6,#ec4899)', color: '#fff', fontWeight: 700, fontSize: 13,
        }}>⚙️ Changer l'URL serveur</Link>
        <button onClick={fetchAll} style={{
          padding: '10px 16px', borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)',
          background: 'rgba(255,255,255,0.05)', color: '#cbd5e1', cursor: 'pointer', fontSize: 12,
        }}>🔄 Réessayer</button>
      </div>
    )
  }

  return (
    <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: 11, color: '#94a3b8' }}>📊 Tableau de bord</div>
          <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>Aujourd'hui</h1>
        </div>
        <button onClick={fetchAll} style={{
          width: 36, height: 36, borderRadius: 10, border: '1px solid rgba(255,255,255,0.1)',
          background: 'rgba(255,255,255,0.05)', color: '#a78bfa', cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          <RefreshCw size={16} />
        </button>
      </div>
      {lastUpdate && (
        <div style={{ fontSize: 10, color: '#64748b' }}>
          Mis à jour : {lastUpdate.toLocaleTimeString('fr-LU')} · Auto 30 s
        </div>
      )}

      {/* v3.17 — Hero "Brief moi du jour" + Photo magique en grand */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 10, marginBottom: 4 }}>
        <Link to="/m/briefing" style={{
          padding: 14, borderRadius: 14, textDecoration: 'none',
          background: 'linear-gradient(135deg,#fbbf24 0%,#ec4899 60%,#8b5cf6 100%)',
          color: '#fff', display: 'flex', flexDirection: 'column', gap: 6, position: 'relative', overflow: 'hidden',
          boxShadow: '0 6px 18px rgba(236,72,153,0.25)',
        }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 10, fontWeight: 800, letterSpacing: 1, textTransform: 'uppercase', opacity: 0.95 }}>
            <Sun size={12} /> AGENT
          </div>
          <div style={{ fontSize: 17, fontWeight: 900, lineHeight: 1.15 }}>Brief moi<br/>aujourd'hui</div>
          <div style={{ fontSize: 10, opacity: 0.85 }}>Voix · 30 sec · 3 priorités</div>
          <Sparkles size={42} style={{ position: 'absolute', right: -6, bottom: -6, opacity: 0.18 }} />
        </Link>
        <Link to="/m/magic" style={{
          padding: 14, borderRadius: 14, textDecoration: 'none',
          background: 'linear-gradient(135deg,#10b981 0%,#06b6d4 100%)',
          color: '#fff', display: 'flex', flexDirection: 'column', gap: 6, position: 'relative', overflow: 'hidden',
          boxShadow: '0 6px 18px rgba(6,182,212,0.25)',
        }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 10, fontWeight: 800, letterSpacing: 1, textTransform: 'uppercase', opacity: 0.95 }}>
            <Camera size={12} /> MAGIC
          </div>
          <div style={{ fontSize: 17, fontWeight: 900, lineHeight: 1.15 }}>Photo<br/>magique</div>
          <div style={{ fontSize: 10, opacity: 0.85 }}>Robi détecte tout</div>
          <Camera size={42} style={{ position: 'absolute', right: -6, bottom: -6, opacity: 0.18 }} />
        </Link>
      </div>

      {/* v3.17 — Suggestions proactives (Robi te dit quoi faire) */}
      {suggestions.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <div style={{ fontSize: 10, color: '#a78bfa', fontWeight: 800, letterSpacing: 1, textTransform: 'uppercase', paddingLeft: 4 }}>
            ✨ Robi te suggère
          </div>
          <AnimatePresence>
            {suggestions.map((s, i) => {
              const colors = {
                info:     { bg: 'rgba(99,102,241,0.12)',  border: 'rgba(99,102,241,0.3)',  text: '#a5b4fc' },
                warning:  { bg: 'rgba(245,158,11,0.12)',  border: 'rgba(245,158,11,0.3)',  text: '#fbbf24' },
                danger:   { bg: 'rgba(239,68,68,0.12)',   border: 'rgba(239,68,68,0.3)',   text: '#fca5a5' },
                positive: { bg: 'rgba(16,185,129,0.12)',  border: 'rgba(16,185,129,0.3)',  text: '#10b981' },
              }[s.tone] || { bg: 'rgba(255,255,255,0.04)', border: 'rgba(255,255,255,0.08)', text: '#cbd5e1' }
              return (
                <motion.div key={i}
                  initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }}
                  transition={{ delay: i * 0.06 }}
                  style={{
                    padding: 10, borderRadius: 10, background: colors.bg, border: `1px solid ${colors.border}`,
                    display: 'flex', alignItems: 'center', gap: 10,
                  }}>
                  <div style={{ fontSize: 22 }}>{s.icon}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 700, color: colors.text }}>{s.title}</div>
                    <div style={{ fontSize: 10, color: '#94a3b8', marginTop: 2 }}>{s.detail}</div>
                  </div>
                  {s.cta && (
                    <button onClick={() => executeSuggestion(s)} style={{
                      padding: '6px 10px', borderRadius: 8, border: 'none', cursor: 'pointer',
                      background: 'rgba(255,255,255,0.1)', color: '#fff', fontSize: 10, fontWeight: 700,
                    }}>{s.cta}</button>
                  )}
                </motion.div>
              )
            })}
          </AnimatePresence>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
        <KpiCard icon={<Users size={18} />} label="Tables ouvertes"
          value={`${data?.occupiedTables ?? 0}/${data?.totalTables ?? 0}`} color="#a78bfa" to="/m/world" />
        <KpiCard icon={<Coins size={18} />} label="CA en cours"
          value={`${(data?.currentRevenueOpen ?? 0).toFixed(0)} €`} color="#10b981" to="/m/world" />
        <KpiCard icon={<AlertTriangle size={18} />} label="Impayés"
          value={`${data?.invoicesOverdue ?? 0}`} sub={`${(data?.unpaidTotal ?? 0).toFixed(0)} €`} color="#ef4444" to="/m/alerts" />
        <KpiCard icon={<TrendingUp size={18} />} label="Stock bas"
          value={`${data?.lowStock ?? 0}`} color="#f59e0b" to="/m/alerts" />
      </div>

      {(data?.alerts.critical || 0) > 0 && (
        <Link to="/m/alerts" style={{
          padding: 14, borderRadius: 12, textDecoration: 'none',
          background: 'linear-gradient(135deg, rgba(239,68,68,0.2), rgba(239,68,68,0.05))',
          border: '1px solid rgba(239,68,68,0.4)',
          color: '#fca5a5', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        }}>
          <div>
            <div style={{ fontWeight: 800, fontSize: 14 }}>🚨 {data!.alerts.critical} alerte(s) critique(s)</div>
            <div style={{ fontSize: 11, marginTop: 2, opacity: 0.85 }}>Action requise — tap pour voir</div>
          </div>
          <ArrowRight size={18} />
        </Link>
      )}

      <div style={{ marginTop: 8 }}>
        <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase', marginBottom: 6 }}>
          Actions rapides
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 8 }}>
          <QuickAction emoji="🤖" label="Parler à Robi" to="/m/robi" />
          <QuickAction emoji="📸" label="OCR Caméra" to="/m/camera" />
          <QuickAction emoji="🌍" label="Vue distante" to="/m/world" />
          <QuickAction emoji="🚨" label="Alertes" to="/m/alerts" />
        </div>
      </div>

      <div style={{
        padding: 14, borderRadius: 12,
        background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
      }}>
        <div style={{ fontSize: 11, color: '#94a3b8', fontWeight: 700, letterSpacing: 1, textTransform: 'uppercase' }}>
          🗓 Aujourd'hui
        </div>
        <div style={{ marginTop: 6, fontSize: 13 }}>
          <b style={{ color: '#fff' }}>{data?.todayShifts ?? 0}</b> personne(s) au planning ·{' '}
          <Link to="/hr/planning" style={{ color: '#a78bfa', textDecoration: 'none' }}>Détails →</Link>
        </div>
      </div>
    </div>
  )
}

function KpiCard({ icon, label, value, sub, color, to }: any) {
  return (
    <Link to={to} style={{
      padding: 14, borderRadius: 14, textDecoration: 'none', color: '#fff',
      background: `linear-gradient(135deg, ${color}20, rgba(255,255,255,0.02))`,
      border: `1px solid ${color}33`,
      display: 'flex', flexDirection: 'column', gap: 6,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color }}>
        {icon}
        <ArrowRight size={12} />
      </div>
      <div style={{ fontSize: 26, fontWeight: 800, color: '#fff' }}>{value}</div>
      {sub && <div style={{ fontSize: 11, color: '#94a3b8' }}>{sub}</div>}
      <div style={{ fontSize: 10, color: '#94a3b8', fontWeight: 700, letterSpacing: 0.5, textTransform: 'uppercase' }}>{label}</div>
    </Link>
  )
}

function QuickAction({ emoji, label, to }: any) {
  return (
    <Link to={to} style={{
      padding: '14px 12px', borderRadius: 12, textDecoration: 'none', color: '#fff',
      background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
      display: 'flex', alignItems: 'center', gap: 10,
    }}>
      <div style={{ fontSize: 22 }}>{emoji}</div>
      <div style={{ fontSize: 13, fontWeight: 700 }}>{label}</div>
    </Link>
  )
}
