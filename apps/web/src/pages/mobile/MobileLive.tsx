import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { TrendingUp, Users, Coins, AlertTriangle, ArrowRight, RefreshCw } from 'lucide-react'

const BACKEND = (import.meta as any).env?.VITE_BACKEND_URL || 'http://localhost:3002'

/**
 * Mobile patron dashboard — gros KPIs lisibles à distance.
 * Auto-refresh toutes les 30 s. Tap KPI = détail.
 */

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
  const r = await fetch(`${BACKEND}/api/agent/execute`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ commandId, input }),
  })
  if (!r.ok) return null
  return r.json()
}

export default function MobileLive() {
  const [data, setData] = useState<LiveData | null>(null)
  const [loading, setLoading] = useState(true)
  const [lastUpdate, setLastUpdate] = useState<Date | null>(null)

  const fetchAll = async () => {
    try {
      const [day, overdue, unpaid, lowStock, today] = await Promise.all([
        runCmd('home.day-summary'),
        runCmd('inv.overdue'),
        runCmd('inv.unpaid-total'),
        runCmd('inv.low-stock'),
        runCmd('hr.who-today'),
      ])
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
    } catch { /* offline */ } finally { setLoading(false) }
  }

  useEffect(() => {
    fetchAll()
    const id = setInterval(fetchAll, 30_000)
    return () => clearInterval(id)
  }, [])

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>Chargement…</div>

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

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10 }}>
        <KpiCard icon={<Users size={18} />} label="Tables ouvertes"
          value={`${data?.occupiedTables ?? 0}/${data?.totalTables ?? 0}`} color="#a78bfa" to="/pos/floor" />
        <KpiCard icon={<Coins size={18} />} label="CA en cours"
          value={`${(data?.currentRevenueOpen ?? 0).toFixed(0)} €`} color="#10b981" to="/pos/dashboard" />
        <KpiCard icon={<AlertTriangle size={18} />} label="Impayés"
          value={`${data?.invoicesOverdue ?? 0}`} sub={`${(data?.unpaidTotal ?? 0).toFixed(0)} €`} color="#ef4444" to="/m/alerts" />
        <KpiCard icon={<TrendingUp size={18} />} label="Stock bas"
          value={`${data?.lowStock ?? 0}`} color="#f59e0b" to="/inventory/stock" />
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
          <QuickAction emoji="📋" label="Plan de salle" to="/pos/floor" />
          <QuickAction emoji="🗓" label="Planning" to="/hr/planning" />
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
