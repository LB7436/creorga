import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { AlertTriangle, Clock, Bell, ArrowRight, CheckCircle2 } from 'lucide-react'
import { fetchAuth } from '@/lib/fetchAuth'
import { useAuthStore } from '@/stores/authStore'
import { authDataScope } from '@/lib/authScope'

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

async function runCmd(commandId: string, signal: AbortSignal) {
    const r = await fetchAuth(`${BACKEND}/api/agent/execute`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ commandId }), signal,
    })
    if (!r.ok) throw new Error(`Contrôle indisponible (HTTP ${r.status})`)
    const data = await r.json()
    if (data.success === false || !Array.isArray(data.ui?.items)) throw new Error('Résultat du contrôle non vérifiable')
    return data
}

export default function MobileAlerts() {
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [loading, setLoading] = useState(true)
  const [failures, setFailures] = useState<string[]>([])
  const [refresh, setRefresh] = useState(0)
  const scope = useAuthStore(authDataScope)

  useEffect(() => {
    let active = true
    const controller = new AbortController()
    setLoading(true)
    setAlerts([])
    setFailures([])
    void (async () => {
      const list: Alert[] = []
      const definitions = [
        ['inv.overdue', 'Factures en retard'], ['pos.stale-sessions', 'Tables ouvertes'], ['rep.negative', 'Avis négatifs'],
      ] as const
      const results = await Promise.all(definitions.map(async ([commandId, label]) => {
        try { return { data: await runCmd(commandId, controller.signal), error: null } }
        catch { return { data: null, error: label } }
      }))
      if (!active) return
      const [overdue, stale, negRev] = results.map(result => result.data)
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
      setFailures(results.flatMap(result => result.error ? [result.error] : []))
      setLoading(false)
    })()
    return () => { active = false; controller.abort() }
  }, [scope, refresh])

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: '#94a3b8' }}>Chargement…</div>

  return (
    <div style={{ padding: 14, display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div>
        <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800 }}>🚨 Alertes</h1>
        <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>
          {alerts.length} alerte(s) observée(s) · {3 - failures.length}/3 contrôles disponibles
        </div>
      </div>

      <button type="button" onClick={() => setRefresh(value => value + 1)}>Actualiser les contrôles</button>
      {failures.length > 0 && <div role="alert" style={{ padding: 14, color: '#fcd34d', border: '1px solid #a16207', borderRadius: 10 }}>
        <strong>{failures.length === 3 ? 'Contrôles indisponibles' : 'Vérification incomplète'}</strong>
        <div>Non vérifié : {failures.join(', ')}. L’absence de résultat n’indique pas une absence d’alerte.</div>
      </div>}

      {alerts.length === 0 && failures.length === 0 && (
        <div style={{
          padding: 30, borderRadius: 14, textAlign: 'center',
          background: 'linear-gradient(135deg, rgba(16,185,129,0.15), rgba(16,185,129,0.05))',
          border: '1px solid rgba(16,185,129,0.3)',
        }}>
          <CheckCircle2 size={48} color="#10b981" style={{ display: 'block', margin: '0 auto 8px' }} />
          <div style={{ fontWeight: 800, fontSize: 16, color: '#10b981' }}>Aucune alerte détectée par ces contrôles</div>
          <div style={{ fontSize: 11, color: '#94a3b8', marginTop: 4 }}>Factures en retard, tables ouvertes et avis négatifs uniquement. Ce résultat n’est pas un diagnostic complet.</div>
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
        Les contrôles sont exécutés à l’ouverture ou à l’actualisation. Une autorisation de notification seule ne garantit pas l’envoi d’alertes en arrière-plan.
      </div>
    </div>
  )
}
