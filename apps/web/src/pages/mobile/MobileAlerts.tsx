import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, Clock, Bell, ArrowRight, CheckCircle2 } from 'lucide-react'
import { fetchAuth } from '@/lib/fetchAuth'

const BACKEND = (import.meta as any).env?.VITE_BACKEND_URL || 'http://localhost:3002'

interface Alert {
  id: string
  level: 'critical' | 'warning' | 'info'
  icon: any
  title: string
  description: string
  href?: string
  ts: number
}

async function runCmd(commandId: string, input?: any) {
  try {
    const r = await fetchAuth(`${BACKEND}/api/agent/execute`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ commandId, input }),
    })
    if (!r.ok) return null
    return r.json()
  } catch {
    return null
  }
}

export default function MobileAlerts() {
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    (async () => {
      const list: Alert[] = []
      const overdue = await runCmd('inv.overdue')
      if (overdue?.ui?.items?.length > 0) {
        list.push({
          id: 'overdue',
          level: overdue.ui.items.length > 5 ? 'critical' : 'warning',
          icon: Clock,
          title: `${overdue.ui.items.length} factures en retard`,
          description: overdue.text || '',
          href: '/invoices/factures',
          ts: Date.now(),
        })
      }
      const stale = await runCmd('pos.stale-sessions')
      if (stale?.ui?.items?.length > 0) {
        list.push({
          id: 'stale',
          level: 'warning',
          icon: AlertTriangle,
          title: `${stale.ui.items.length} table(s) ouverte(s) > 4h`,
          description: stale.text || '',
          href: '/pos/floor',
          ts: Date.now(),
        })
      }
      const negRev = await runCmd('rep.negative')
      if (negRev?.ui?.items?.length > 0) {
        list.push({
          id: 'negrev',
          level: 'critical',
          icon: AlertTriangle,
          title: `${negRev.ui.items.length} avis négatifs sans réponse`,
          description: 'À traiter dans les 24h',
          href: '/reputation/avis',
          ts: Date.now(),
        })
      }
      setAlerts(list)
      setLoading(false)
    })()
  }, [])

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>Chargement…</div>

  return (
    <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div>
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>🚨 Alertes</h1>
        <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>
          {alerts.length} alerte(s) actives
        </div>
      </div>

      {alerts.length === 0 && (
        <div style={{
          padding: 30, borderRadius: 14, textAlign: 'center',
          background: 'linear-gradient(135deg, rgba(16,185,129,0.15), rgba(16,185,129,0.05))',
          border: '1px solid rgba(16,185,129,0.3)',
        }}>
          <CheckCircle2 size={48} color="#10b981" style={{ display: 'block', margin: '0 auto 8px' }} />
          <div style={{ fontWeight: 800, fontSize: 16, color: '#10b981' }}>Tout va bien</div>
          <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>Aucune alerte ce matin.</div>
        </div>
      )}

      {alerts.map((a) => {
        const Icon = a.icon
        const colors = a.level === 'critical' ? { bg: 'rgba(239,68,68,0.15)', border: 'rgba(239,68,68,0.4)', fg: '#fca5a5' }
                     : a.level === 'warning'  ? { bg: 'rgba(245,158,11,0.15)', border: 'rgba(245,158,11,0.4)', fg: '#fcd34d' }
                     :                          { bg: 'rgba(59,130,246,0.15)', border: 'rgba(59,130,246,0.4)', fg: '#93c5fd' }
        const card = (
          <div style={{
            padding: 14, borderRadius: 12,
            background: colors.bg, border: `1px solid ${colors.border}`,
            display: 'flex', gap: 12, alignItems: 'flex-start',
          }}>
            <Icon size={20} color={colors.fg} style={{ flexShrink: 0, marginTop: 2 }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 800, fontSize: 14, color: '#fff' }}>{a.title}</div>
              <div style={{ fontSize: 11, color: '#cbd5e1', marginTop: 4, lineHeight: 1.5 }}>{a.description}</div>
            </div>
            {a.href && <ArrowRight size={16} color={colors.fg} />}
          </div>
        )
        return a.href ? <Link key={a.id} to={a.href} style={{ textDecoration: 'none' }}>{card}</Link> : <div key={a.id}>{card}</div>
      })}

      <div style={{
        marginTop: 14, padding: 12, borderRadius: 10,
        background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
        fontSize: 11, color: '#94a3b8',
      }}>
        <Bell size={12} style={{ verticalAlign: -1, marginRight: 4 }} />
        Activez les notifications push dans les Réglages → vous serez prévenu en temps réel
      </div>
    </div>
  )
}
