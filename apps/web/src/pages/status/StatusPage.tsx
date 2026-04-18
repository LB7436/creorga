import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  BarChart,
  Bar,
  CartesianGrid,
} from 'recharts'

type ServiceStatus = 'operational' | 'degraded' | 'partial' | 'major' | 'maintenance'

interface Service {
  id: string
  name: string
  description: string
  status: ServiceStatus
  uptime: number
  responseMs: number
  icon: string
}

interface Incident {
  id: string
  title: string
  date: string
  duration: string
  severity: 'minor' | 'major' | 'maintenance'
  status: 'resolved' | 'monitoring' | 'investigating'
  summary: string
}

interface Deployment {
  id: string
  version: string
  date: string
  author: string
  changes: string
}

const PALETTE = {
  bg: '#f8fafc',
  card: '#ffffff',
  border: '#e5e7eb',
  text: '#0f172a',
  muted: '#64748b',
  green: '#10b981',
  greenBg: '#d1fae5',
  amber: '#f59e0b',
  amberBg: '#fef3c7',
  red: '#ef4444',
  redBg: '#fee2e2',
  blue: '#3b82f6',
  blueBg: '#dbeafe',
  purple: '#8b5cf6',
}

const SERVICES: Service[] = [
  { id: 'web', name: 'Application Web', description: 'Interface utilisateur Creorga OS', status: 'operational', uptime: 99.98, responseMs: 142, icon: '🌐' },
  { id: 'api', name: 'API Backend', description: 'REST API & GraphQL endpoints', status: 'operational', uptime: 99.95, responseMs: 89, icon: '⚡' },
  { id: 'payments', name: 'Paiements', description: 'Stripe, SumUp, Payconiq', status: 'operational', uptime: 100, responseMs: 210, icon: '💳' },
  { id: 'db', name: 'Base de données', description: 'PostgreSQL primary cluster', status: 'operational', uptime: 99.99, responseMs: 12, icon: '🗄️' },
  { id: 'email', name: 'Service email', description: 'Transactionnel via SendGrid', status: 'degraded', uptime: 98.42, responseMs: 780, icon: '✉️' },
  { id: 'storage', name: 'Stockage fichiers', description: 'S3 compatible object storage', status: 'operational', uptime: 99.97, responseMs: 56, icon: '📦' },
  { id: 'push', name: 'Notifications push', description: 'Web push & mobile FCM/APNs', status: 'operational', uptime: 99.91, responseMs: 145, icon: '🔔' },
]

const INCIDENTS: Incident[] = [
  {
    id: 'inc-042',
    title: 'Latence élevée sur l\'API (lecture)',
    date: '14 avril 2026',
    duration: '45 minutes',
    severity: 'minor',
    status: 'resolved',
    summary: 'Pic de trafic inattendu sur le cluster primaire. Les requêtes de lecture ont été rebasculées sur les répliques. Monitoring renforcé ajouté.',
  },
  {
    id: 'inc-041',
    title: 'Maintenance planifiée — mise à niveau PostgreSQL',
    date: '02 avril 2026',
    duration: '2h 00min',
    severity: 'maintenance',
    status: 'resolved',
    summary: 'Migration PostgreSQL 15 → 16 achevée avec succès. Aucune perte de données, fenêtre de lecture seule de 12 minutes.',
  },
  {
    id: 'inc-040',
    title: 'Email provider (SendGrid) partiellement indisponible',
    date: '18 mars 2026',
    duration: '1h 30min',
    severity: 'major',
    status: 'resolved',
    summary: 'Incident côté fournisseur tiers. Bascule automatique vers Mailgun activée. Aucun email perdu.',
  },
  {
    id: 'inc-039',
    title: 'Webhooks Stripe — retards de livraison',
    date: '28 février 2026',
    duration: '22 minutes',
    severity: 'minor',
    status: 'resolved',
    summary: 'Files d\'attente saturées. Capacité doublée. Tous les webhooks ont été rejoués.',
  },
  {
    id: 'inc-038',
    title: 'CDN régional (EU-West) dégradé',
    date: '11 février 2026',
    duration: '38 minutes',
    severity: 'minor',
    status: 'resolved',
    summary: 'Fallback automatique vers edge EU-Central. Temps de chargement moyen +180ms.',
  },
]

const DEPLOYMENTS: Deployment[] = [
  { id: 'd10', version: 'v2.4.0', date: '18 avr. 2026', author: 'équipe Creorga', changes: 'Assistant IA avec Claude, refonte du dashboard.' },
  { id: 'd9', version: 'v2.3.5', date: '11 avr. 2026', author: 'équipe Creorga', changes: 'Module Durabilité et conformité CSRD.' },
  { id: 'd8', version: 'v2.3.4', date: '04 avr. 2026', author: 'équipe Creorga', changes: 'Correctifs HACCP, amélioration export PDF.' },
  { id: 'd7', version: 'v2.3.3', date: '28 mars 2026', author: 'équipe Creorga', changes: 'Optimisation requêtes POS, -35% latence checkout.' },
  { id: 'd6', version: 'v2.3.2', date: '21 mars 2026', author: 'équipe Creorga', changes: 'Intégration Payconiq stable, webhooks v2.' },
  { id: 'd5', version: 'v2.3.1', date: '14 mars 2026', author: 'équipe Creorga', changes: 'Gestion multi-TVA (3/8/14/17%) étendue.' },
  { id: 'd4', version: 'v2.3.0', date: '07 mars 2026', author: 'équipe Creorga', changes: 'Multi-établissements, chaînes de restaurants.' },
  { id: 'd3', version: 'v2.2.9', date: '28 févr. 2026', author: 'équipe Creorga', changes: 'Module Réputation — synchro Google & Tripadvisor.' },
  { id: 'd2', version: 'v2.2.8', date: '21 févr. 2026', author: 'équipe Creorga', changes: 'Nouveaux rapports financiers, export Excel.' },
  { id: 'd1', version: 'v2.2.7', date: '14 févr. 2026', author: 'équipe Creorga', changes: 'Correctifs stabilité, améliorations UX.' },
]

function generateUptimeData(baseUptime: number) {
  const data = []
  for (let i = 89; i >= 0; i--) {
    const d = new Date()
    d.setDate(d.getDate() - i)
    const variance = (Math.random() - 0.5) * 0.4
    const uptime = Math.min(100, Math.max(95, baseUptime + variance))
    data.push({
      day: `${d.getDate()}/${d.getMonth() + 1}`,
      uptime: Number(uptime.toFixed(2)),
    })
  }
  return data
}

function statusMeta(status: ServiceStatus) {
  switch (status) {
    case 'operational':
      return { label: 'Opérationnel', color: PALETTE.green, bg: PALETTE.greenBg }
    case 'degraded':
      return { label: 'Performances dégradées', color: PALETTE.amber, bg: PALETTE.amberBg }
    case 'partial':
      return { label: 'Panne partielle', color: '#ea580c', bg: '#ffedd5' }
    case 'major':
      return { label: 'Panne majeure', color: PALETTE.red, bg: PALETTE.redBg }
    case 'maintenance':
      return { label: 'Maintenance', color: PALETTE.blue, bg: PALETTE.blueBg }
  }
}

function severityMeta(sev: Incident['severity']) {
  switch (sev) {
    case 'minor': return { label: 'Mineur', color: PALETTE.amber, bg: PALETTE.amberBg }
    case 'major': return { label: 'Majeur', color: PALETTE.red, bg: PALETTE.redBg }
    case 'maintenance': return { label: 'Maintenance', color: PALETTE.blue, bg: PALETTE.blueBg }
  }
}

export default function StatusPage() {
  const [email, setEmail] = useState('')
  const [subscribed, setSubscribed] = useState(false)
  const [selectedService, setSelectedService] = useState<string>('api')

  const globalStatus = useMemo(() => {
    if (SERVICES.some((s) => s.status === 'major')) return { label: 'Incident majeur en cours', color: PALETTE.red, dot: PALETTE.red }
    if (SERVICES.some((s) => s.status === 'degraded' || s.status === 'partial')) return { label: 'Certains services dégradés', color: PALETTE.amber, dot: PALETTE.amber }
    return { label: 'Tous les systèmes opérationnels', color: PALETTE.green, dot: PALETTE.green }
  }, [])

  const now = new Date()
  const lastUpdate = now.toLocaleString('fr-FR', { dateStyle: 'long', timeStyle: 'short' })

  const chartData = useMemo(() => {
    const svc = SERVICES.find((s) => s.id === selectedService) || SERVICES[0]
    return generateUptimeData(svc.uptime)
  }, [selectedService])

  const responseData = useMemo(
    () => SERVICES.map((s) => ({ name: s.name.split(' ')[0], ms: s.responseMs })),
    []
  )

  return (
    <div style={{ minHeight: '100vh', background: PALETTE.bg, color: PALETTE.text, fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto', padding: '48px 24px' }}>
        {/* HEADER */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            background: PALETTE.card,
            border: `1px solid ${PALETTE.border}`,
            borderRadius: 16,
            padding: 32,
            marginBottom: 24,
            boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
            <motion.div
              animate={{ scale: [1, 1.3, 1], opacity: [1, 0.6, 1] }}
              transition={{ repeat: Infinity, duration: 2 }}
              style={{ width: 14, height: 14, borderRadius: '50%', background: globalStatus.dot, boxShadow: `0 0 12px ${globalStatus.dot}` }}
            />
            <span style={{ fontSize: 14, color: PALETTE.muted, letterSpacing: 0.5, textTransform: 'uppercase', fontWeight: 600 }}>Statut système</span>
          </div>
          <h1 style={{ fontSize: 36, fontWeight: 700, margin: '0 0 8px', letterSpacing: -0.5 }}>
            Creorga OS — {globalStatus.label}
          </h1>
          <p style={{ color: PALETTE.muted, fontSize: 15, margin: 0 }}>
            Dernière mise à jour : {lastUpdate} · Actualisation automatique toutes les 60 secondes
          </p>
        </motion.div>

        {/* LIVE SERVICES */}
        <section style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16 }}>Services en temps réel</h2>
          <div style={{ background: PALETTE.card, border: `1px solid ${PALETTE.border}`, borderRadius: 16, overflow: 'hidden' }}>
            {SERVICES.map((svc, i) => {
              const meta = statusMeta(svc.status)
              return (
                <motion.div
                  key={svc.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.05 }}
                  onClick={() => setSelectedService(svc.id)}
                  style={{
                    display: 'grid',
                    gridTemplateColumns: '48px 1fr auto auto auto',
                    gap: 16,
                    padding: '20px 24px',
                    alignItems: 'center',
                    borderBottom: i < SERVICES.length - 1 ? `1px solid ${PALETTE.border}` : 'none',
                    cursor: 'pointer',
                    background: selectedService === svc.id ? '#f8fafc' : 'transparent',
                    transition: 'background 0.2s',
                  }}
                >
                  <div style={{ fontSize: 24 }}>{svc.icon}</div>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 15 }}>{svc.name}</div>
                    <div style={{ fontSize: 13, color: PALETTE.muted }}>{svc.description}</div>
                  </div>
                  <div style={{ textAlign: 'right', minWidth: 90 }}>
                    <div style={{ fontSize: 11, color: PALETTE.muted, textTransform: 'uppercase', fontWeight: 600 }}>Uptime 90j</div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{svc.uptime.toFixed(2)}%</div>
                  </div>
                  <div style={{ textAlign: 'right', minWidth: 90 }}>
                    <div style={{ fontSize: 11, color: PALETTE.muted, textTransform: 'uppercase', fontWeight: 600 }}>Latence</div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{svc.responseMs}ms</div>
                  </div>
                  <div style={{
                    padding: '6px 12px',
                    borderRadius: 999,
                    background: meta.bg,
                    color: meta.color,
                    fontSize: 12,
                    fontWeight: 600,
                    whiteSpace: 'nowrap',
                  }}>
                    ● {meta.label}
                  </div>
                </motion.div>
              )
            })}
          </div>
        </section>

        {/* UPTIME CHART */}
        <section style={{ marginBottom: 32 }}>
          <div style={{ background: PALETTE.card, border: `1px solid ${PALETTE.border}`, borderRadius: 16, padding: 24 }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16, flexWrap: 'wrap', gap: 8 }}>
              <div>
                <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0 }}>Uptime 90 jours — {SERVICES.find((s) => s.id === selectedService)?.name}</h3>
                <p style={{ fontSize: 13, color: PALETTE.muted, margin: '4px 0 0' }}>Cliquez sur un service ci-dessus pour voir son historique</p>
              </div>
            </div>
            <div style={{ height: 220 }}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid stroke={PALETTE.border} strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="day" tick={{ fontSize: 11, fill: PALETTE.muted }} interval={8} />
                  <YAxis domain={[95, 100]} tick={{ fontSize: 11, fill: PALETTE.muted }} />
                  <Tooltip
                    contentStyle={{ background: PALETTE.card, border: `1px solid ${PALETTE.border}`, borderRadius: 8, fontSize: 12 }}
                    formatter={(v: number) => [`${v}%`, 'Uptime']}
                  />
                  <Line type="monotone" dataKey="uptime" stroke={PALETTE.green} strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>

        {/* RESPONSE TIME BAR */}
        <section style={{ marginBottom: 32 }}>
          <div style={{ background: PALETTE.card, border: `1px solid ${PALETTE.border}`, borderRadius: 16, padding: 24 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, margin: '0 0 16px' }}>Temps de réponse moyen (ms)</h3>
            <div style={{ height: 200 }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={responseData}>
                  <CartesianGrid stroke={PALETTE.border} strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" tick={{ fontSize: 11, fill: PALETTE.muted }} />
                  <YAxis tick={{ fontSize: 11, fill: PALETTE.muted }} />
                  <Tooltip contentStyle={{ background: PALETTE.card, border: `1px solid ${PALETTE.border}`, borderRadius: 8, fontSize: 12 }} />
                  <Bar dataKey="ms" fill={PALETTE.blue} radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>

        {/* INCIDENTS HISTORY */}
        <section style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16 }}>Historique des incidents (90 derniers jours)</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {INCIDENTS.map((inc, i) => {
              const meta = severityMeta(inc.severity)
              return (
                <motion.article
                  key={inc.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  style={{
                    background: PALETTE.card,
                    border: `1px solid ${PALETTE.border}`,
                    borderRadius: 12,
                    padding: 20,
                    borderLeft: `4px solid ${meta.color}`,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 16, marginBottom: 8, flexWrap: 'wrap' }}>
                    <div>
                      <h3 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 4px' }}>{inc.title}</h3>
                      <div style={{ fontSize: 12, color: PALETTE.muted }}>{inc.date} · Durée : {inc.duration}</div>
                    </div>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <span style={{ padding: '4px 10px', borderRadius: 999, background: meta.bg, color: meta.color, fontSize: 11, fontWeight: 600 }}>{meta.label}</span>
                      <span style={{ padding: '4px 10px', borderRadius: 999, background: PALETTE.greenBg, color: PALETTE.green, fontSize: 11, fontWeight: 600 }}>✓ Résolu</span>
                    </div>
                  </div>
                  <p style={{ fontSize: 13, color: PALETTE.muted, margin: 0, lineHeight: 1.6 }}>{inc.summary}</p>
                </motion.article>
              )
            })}
          </div>
        </section>

        {/* PLANNED MAINTENANCE */}
        <section style={{ marginBottom: 32 }}>
          <div style={{
            background: PALETTE.blueBg,
            border: `1px solid ${PALETTE.blue}40`,
            borderRadius: 16,
            padding: 24,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 8 }}>
              <span style={{ fontSize: 22 }}>🛠️</span>
              <h3 style={{ fontSize: 16, fontWeight: 700, margin: 0, color: '#1e3a8a' }}>Maintenance planifiée</h3>
            </div>
            <div style={{ color: '#1e3a8a', fontSize: 14, lineHeight: 1.6 }}>
              <strong>Dimanche 26 avril 2026, 03h00 – 05h00 (CET)</strong><br />
              Mise à niveau du cluster PostgreSQL vers la version 16.3. Fenêtre de lecture seule d'environ 10 minutes. Aucune interruption attendue pour l'interface POS.
            </div>
          </div>
        </section>

        {/* SUBSCRIBE */}
        <section style={{ marginBottom: 32 }}>
          <div style={{ background: PALETTE.card, border: `1px solid ${PALETTE.border}`, borderRadius: 16, padding: 32, textAlign: 'center' }}>
            <h3 style={{ fontSize: 18, fontWeight: 700, margin: '0 0 8px' }}>Recevez les mises à jour de statut</h3>
            <p style={{ fontSize: 14, color: PALETTE.muted, margin: '0 0 20px' }}>
              Soyez notifié par email dès qu'un incident est détecté ou résolu.
            </p>
            {subscribed ? (
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                style={{ padding: '12px 20px', background: PALETTE.greenBg, color: PALETTE.green, borderRadius: 12, display: 'inline-block', fontWeight: 600 }}
              >
                ✓ Inscription confirmée — vérifiez votre boîte mail.
              </motion.div>
            ) : (
              <form
                onSubmit={(e) => { e.preventDefault(); if (email.includes('@')) setSubscribed(true) }}
                style={{ display: 'flex', gap: 8, maxWidth: 460, margin: '0 auto', flexWrap: 'wrap' }}
              >
                <input
                  type="email"
                  required
                  placeholder="votre@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  style={{
                    flex: 1,
                    minWidth: 200,
                    padding: '12px 16px',
                    border: `1px solid ${PALETTE.border}`,
                    borderRadius: 10,
                    fontSize: 14,
                    outline: 'none',
                  }}
                />
                <button
                  type="submit"
                  style={{
                    padding: '12px 24px',
                    background: PALETTE.text,
                    color: '#fff',
                    border: 'none',
                    borderRadius: 10,
                    fontSize: 14,
                    fontWeight: 600,
                    cursor: 'pointer',
                  }}
                >
                  S'abonner
                </button>
              </form>
            )}
          </div>
        </section>

        {/* RECENT DEPLOYMENTS */}
        <section style={{ marginBottom: 32 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 16 }}>Déploiements récents</h2>
          <div style={{ background: PALETTE.card, border: `1px solid ${PALETTE.border}`, borderRadius: 16, overflow: 'hidden' }}>
            {DEPLOYMENTS.map((dep, i) => (
              <div
                key={dep.id}
                style={{
                  display: 'grid',
                  gridTemplateColumns: '110px 120px 1fr',
                  gap: 16,
                  padding: '16px 24px',
                  alignItems: 'center',
                  borderBottom: i < DEPLOYMENTS.length - 1 ? `1px solid ${PALETTE.border}` : 'none',
                  fontSize: 13,
                }}
              >
                <span style={{ fontFamily: 'ui-monospace, monospace', fontWeight: 600, color: PALETTE.purple }}>{dep.version}</span>
                <span style={{ color: PALETTE.muted }}>{dep.date}</span>
                <span>{dep.changes}</span>
              </div>
            ))}
          </div>
        </section>

        <footer style={{ textAlign: 'center', color: PALETTE.muted, fontSize: 13, paddingTop: 24, borderTop: `1px solid ${PALETTE.border}` }}>
          Creorga OS — Infrastructure hébergée au Luxembourg 🇱🇺 · RGPD compliant
        </footer>
      </div>
    </div>
  )
}
