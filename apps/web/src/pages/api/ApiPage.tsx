import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

type IntegStatus = 'connected' | 'disconnected' | 'error'
type Category = 'Paiement' | 'Livraison' | 'Comptabilité' | 'Réservations' | 'Marketing' | 'Social' | 'Calendrier' | 'Comm'

interface Integration {
  id: string
  name: string
  category: Category
  emoji: string
  description: string
  status: IntegStatus
  lastSync?: string
  color: string
}

const INTEGRATIONS: Integration[] = [
  // Paiement
  { id: 'stripe', name: 'Stripe', category: 'Paiement', emoji: '💳', description: 'Paiements cartes, abonnements', status: 'connected', lastSync: 'il y a 2 min', color: '#635bff' },
  { id: 'mollie', name: 'Mollie', category: 'Paiement', emoji: '💶', description: 'PSP européen multi-devises', status: 'connected', lastSync: 'il y a 5 min', color: '#000f3e' },
  { id: 'adyen', name: 'Adyen', category: 'Paiement', emoji: '🏦', description: 'Plateforme de paiement globale', status: 'disconnected', color: '#0abf53' },
  { id: 'sumup', name: 'SumUp', category: 'Paiement', emoji: '📱', description: 'Terminal mobile Luxembourg', status: 'connected', lastSync: 'il y a 12 min', color: '#0070f3' },

  // Livraison
  { id: 'wedely', name: 'Wedely', category: 'Livraison', emoji: '🛵', description: 'Livraison locale Luxembourg', status: 'connected', lastSync: 'il y a 1 min', color: '#ff6b35' },
  { id: 'ubereats', name: 'UberEats', category: 'Livraison', emoji: '🥡', description: 'Plateforme de livraison mondiale', status: 'connected', lastSync: 'il y a 3 min', color: '#06c167' },
  { id: 'deliveroo', name: 'Deliveroo', category: 'Livraison', emoji: '🍽️', description: 'Livraison de repas premium', status: 'error', lastSync: 'il y a 2 h', color: '#00ccbc' },
  { id: 'foodpanda', name: 'Foodpanda', category: 'Livraison', emoji: '🐼', description: 'Marketplace de livraison', status: 'disconnected', color: '#d70f64' },

  // Comptabilité
  { id: 'quickbooks', name: 'QuickBooks', category: 'Comptabilité', emoji: '📊', description: 'Comptabilité cloud Intuit', status: 'connected', lastSync: 'hier 23:00', color: '#2ca01c' },
  { id: 'sage', name: 'Sage', category: 'Comptabilité', emoji: '📗', description: 'ERP comptabilité PME', status: 'disconnected', color: '#00dc00' },
  { id: 'bob50', name: 'BOB 50', category: 'Comptabilité', emoji: '🇱🇺', description: 'Comptabilité Luxembourg (Sage BOB)', status: 'connected', lastSync: 'hier 22:30', color: '#1e40af' },
  { id: 'fiduciaire', name: 'Fiduciaire partenaire', category: 'Comptabilité', emoji: '📁', description: 'Transmission mensuelle', status: 'connected', lastSync: 'le 15 du mois', color: '#7c3aed' },

  // Réservations
  { id: 'thefork', name: 'TheFork', category: 'Réservations', emoji: '🍴', description: 'Réservations restaurant (LaFourchette)', status: 'connected', lastSync: 'il y a 4 min', color: '#00a19a' },
  { id: 'opentable', name: 'OpenTable', category: 'Réservations', emoji: '📅', description: 'Réservations internationales', status: 'disconnected', color: '#da3743' },
  { id: 'googlebook', name: 'Google Réserver', category: 'Réservations', emoji: '🔍', description: 'Réserver depuis la recherche Google', status: 'connected', lastSync: 'il y a 7 min', color: '#4285f4' },

  // Marketing
  { id: 'mailchimp', name: 'Mailchimp', category: 'Marketing', emoji: '📧', description: 'Email marketing & automation', status: 'connected', lastSync: 'il y a 20 min', color: '#ffe01b' },
  { id: 'brevo', name: 'Brevo', category: 'Marketing', emoji: '✉️', description: 'ex-Sendinblue, emails + SMS', status: 'disconnected', color: '#0b996e' },
  { id: 'klaviyo', name: 'Klaviyo', category: 'Marketing', emoji: '📬', description: 'Marketing omnicanal e-commerce', status: 'disconnected', color: '#232426' },

  // Social
  { id: 'meta', name: 'Meta Business', category: 'Social', emoji: '📘', description: 'Facebook + Instagram business', status: 'connected', lastSync: 'il y a 15 min', color: '#1877f2' },
  { id: 'gbusiness', name: 'Google Business', category: 'Social', emoji: '🌐', description: 'Profil entreprise Google', status: 'connected', lastSync: 'il y a 8 min', color: '#34a853' },
  { id: 'instagram', name: 'Instagram API', category: 'Social', emoji: '📸', description: 'Publications & stories', status: 'connected', lastSync: 'il y a 25 min', color: '#e1306c' },
  { id: 'tiktok', name: 'TikTok', category: 'Social', emoji: '🎵', description: 'TikTok for Business', status: 'disconnected', color: '#000000' },

  // Calendrier
  { id: 'gcal', name: 'Google Calendar', category: 'Calendrier', emoji: '📆', description: 'Sync agenda bidirectionnel', status: 'connected', lastSync: 'il y a 1 min', color: '#4285f4' },
  { id: 'outlook', name: 'Outlook', category: 'Calendrier', emoji: '📧', description: 'Microsoft 365 Calendar', status: 'disconnected', color: '#0078d4' },
  { id: 'apple', name: 'Apple Calendar', category: 'Calendrier', emoji: '🍎', description: 'iCloud Calendar (CalDAV)', status: 'disconnected', color: '#555555' },

  // Comm
  { id: 'whatsapp', name: 'WhatsApp Business', category: 'Comm', emoji: '💬', description: 'Messages clients & notifications', status: 'connected', lastSync: 'il y a 30 sec', color: '#25d366' },
  { id: 'telegram', name: 'Telegram Bot', category: 'Comm', emoji: '✈️', description: 'Notifications équipe automatisées', status: 'disconnected', color: '#0088cc' },
  { id: 'twilio', name: 'Twilio SMS', category: 'Comm', emoji: '📲', description: 'SMS transactionnels globaux', status: 'error', lastSync: 'il y a 5 h', color: '#f22f46' },
]

const CATEGORIES: Category[] = ['Paiement', 'Livraison', 'Comptabilité', 'Réservations', 'Marketing', 'Social', 'Calendrier', 'Comm']

const statusLabel: Record<IntegStatus, string> = {
  connected: 'Connectée',
  disconnected: 'Non connectée',
  error: 'Erreur',
}
const statusColor: Record<IntegStatus, string> = {
  connected: '#10b981',
  disconnected: '#9ca3af',
  error: '#ef4444',
}
const statusBg: Record<IntegStatus, string> = {
  connected: '#d1fae5',
  disconnected: '#f3f4f6',
  error: '#fee2e2',
}

function ApiPage() {
  const [tab, setTab] = useState<'integrations' | 'keys' | 'webhooks' | 'limits' | 'docs' | 'logs' | 'dev' | 'zapier'>('integrations')
  const [activeCat, setActiveCat] = useState<Category | 'all'>('all')
  const [sandbox, setSandbox] = useState(false)

  const [apiKeys, setApiKeys] = useState([
    { id: 'k1', name: 'Production backend', key: 'pk_live_51H...8xZ2', scope: 'read:all, write:orders', created: '2026-01-15', used: 'il y a 2 min' },
    { id: 'k2', name: 'Mobile app (iOS/Android)', key: 'pk_live_7Kd...Qv4m', scope: 'read:menu, read:inventory', created: '2026-02-03', used: 'il y a 1 h' },
    { id: 'k3', name: 'Dashboard analytics', key: 'pk_live_9Yb...R3wN', scope: 'read:analytics', created: '2026-02-28', used: 'il y a 4 h' },
    { id: 'k4', name: 'Fiduciaire (lecture seule)', key: 'pk_live_2Mf...J8pX', scope: 'read:invoices, read:accounting', created: '2026-03-10', used: 'hier' },
  ])

  const [webhooks] = useState([
    { id: 'w1', url: 'https://api.monshop.lu/hooks/orders', events: ['order.created', 'order.paid'], retry: '3x / 2min', status: 'Livré', lastDelivery: 'il y a 12 sec' },
    { id: 'w2', url: 'https://n8n.creorga.com/webhook/stock', events: ['stock.low', 'stock.updated'], retry: '5x / 5min', status: 'Livré', lastDelivery: 'il y a 3 min' },
    { id: 'w3', url: 'https://zapier.com/hooks/customer', events: ['customer.created'], retry: '3x / 2min', status: 'Livré', lastDelivery: 'il y a 15 min' },
    { id: 'w4', url: 'https://make.com/hooks/reservation', events: ['reservation.*'], retry: '5x / 10min', status: 'Erreur 500', lastDelivery: 'il y a 1 h' },
    { id: 'w5', url: 'https://slack.com/hooks/alerts', events: ['alert.critical'], retry: '3x / 1min', status: 'Livré', lastDelivery: 'hier' },
  ])

  const filteredIntegs = activeCat === 'all' ? INTEGRATIONS : INTEGRATIONS.filter((i) => i.category === activeCat)

  const stats = [
    { label: 'Intégrations actives', value: '12', icon: '🔌', color: '#475569' },
    { label: 'Webhooks configurés', value: '5', icon: '🪝', color: '#7c3aed' },
    { label: 'API calls / jour', value: '3 420', icon: '⚡', color: '#059669' },
    { label: 'Tokens actifs', value: '4', icon: '🔑', color: '#f59e0b' },
  ]

  const logs = [
    { method: 'POST', endpoint: '/v1/orders', status: 201, time: '14:32:18', duration: 142 },
    { method: 'GET', endpoint: '/v1/menu', status: 200, time: '14:32:05', duration: 38 },
    { method: 'POST', endpoint: '/v1/webhooks/stripe', status: 200, time: '14:31:47', duration: 89 },
    { method: 'GET', endpoint: '/v1/analytics/daily', status: 200, time: '14:31:22', duration: 234 },
    { method: 'PATCH', endpoint: '/v1/inventory/42', status: 200, time: '14:30:55', duration: 67 },
    { method: 'POST', endpoint: '/v1/reservations', status: 429, time: '14:30:12', duration: 15 },
    { method: 'GET', endpoint: '/v1/customers', status: 200, time: '14:29:48', duration: 102 },
    { method: 'DELETE', endpoint: '/v1/orders/88', status: 204, time: '14:29:20', duration: 54 },
    { method: 'POST', endpoint: '/v1/payments/refund', status: 500, time: '14:28:55', duration: 1203 },
    { method: 'GET', endpoint: '/v1/staff/schedule', status: 200, time: '14:28:34', duration: 73 },
    { method: 'POST', endpoint: '/v1/orders', status: 201, time: '14:28:12', duration: 128 },
    { method: 'GET', endpoint: '/v1/menu', status: 200, time: '14:27:55', duration: 42 },
    { method: 'PUT', endpoint: '/v1/customers/12', status: 200, time: '14:27:30', duration: 95 },
    { method: 'GET', endpoint: '/v1/reports/monthly', status: 200, time: '14:26:58', duration: 512 },
    { method: 'POST', endpoint: '/v1/webhooks/wedely', status: 200, time: '14:26:22', duration: 76 },
    { method: 'GET', endpoint: '/v1/inventory', status: 200, time: '14:25:47', duration: 189 },
    { method: 'POST', endpoint: '/v1/loyalty/redeem', status: 200, time: '14:25:15', duration: 112 },
    { method: 'GET', endpoke: '/v1/tables', status: 200, time: '14:24:50', duration: 31 } as any,
    { method: 'POST', endpoint: '/v1/orders', status: 201, time: '14:24:18', duration: 134 },
    { method: 'GET', endpoint: '/v1/health', status: 200, time: '14:23:50', duration: 12 },
  ]

  const methodColor = (m: string) =>
    ({ GET: '#059669', POST: '#2563eb', PATCH: '#d97706', PUT: '#d97706', DELETE: '#dc2626' } as any)[m] || '#6b7280'
  const statusColorCode = (s: number) => (s >= 500 ? '#dc2626' : s >= 400 ? '#f59e0b' : '#10b981')

  const revokeKey = (id: string) => setApiKeys(apiKeys.filter((k) => k.id !== id))

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(180deg,#f8fafc 0%,#f1f5f9 100%)', padding: '32px 40px' }}>
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 48, height: 48, borderRadius: 12, background: '#475569', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, color: '#fff' }}>🔌</div>
            <div>
              <h1 style={{ margin: 0, fontSize: 28, color: '#111827', fontWeight: 700 }}>API & Intégrations</h1>
              <p style={{ margin: '4px 0 0', fontSize: 14, color: '#6b7280' }}>Connectez Creorga à vos outils favoris</p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 14px', background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, cursor: 'pointer' }}>
              <span style={{ fontSize: 13, color: '#111827', fontWeight: 500 }}>Mode sandbox</span>
              <div onClick={() => setSandbox(!sandbox)} style={{ width: 40, height: 22, borderRadius: 11, background: sandbox ? '#f59e0b' : '#d1d5db', position: 'relative', transition: 'all 0.2s' }}>
                <motion.div animate={{ x: sandbox ? 20 : 2 }} style={{ position: 'absolute', top: 2, width: 18, height: 18, borderRadius: '50%', background: '#fff', boxShadow: '0 1px 2px rgba(0,0,0,0.2)' }} />
              </div>
            </label>
          </div>
        </div>

        {sandbox && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ marginTop: 12, padding: 12, background: '#fef3c7', borderRadius: 10, fontSize: 13, color: '#92400e' }}>
            ⚠ Environnement sandbox actif : toutes les requêtes sont simulées (aucun paiement réel, aucune commande ne sera envoyée).
          </motion.div>
        )}
      </motion.div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 16, marginBottom: 24 }}>
        {stats.map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} style={{ background: '#fff', borderRadius: 14, padding: 20, border: '1px solid #f3f4f6' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 10 }}>
              <span style={{ fontSize: 13, color: '#6b7280', fontWeight: 500 }}>{s.label}</span>
              <div style={{ width: 36, height: 36, borderRadius: 10, background: `${s.color}15`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18 }}>{s.icon}</div>
            </div>
            <div style={{ fontSize: 24, fontWeight: 700, color: '#111827' }}>{s.value}</div>
          </motion.div>
        ))}
      </div>

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, background: '#fff', padding: 6, borderRadius: 12, border: '1px solid #f3f4f6', marginBottom: 20, overflowX: 'auto' }}>
        {([
          ['integrations', 'Intégrations'],
          ['keys', 'Clés API'],
          ['webhooks', 'Webhooks'],
          ['limits', 'Rate limits'],
          ['logs', 'Logs d\'activité'],
          ['docs', 'Documentation'],
          ['dev', 'Mode développeur'],
          ['zapier', 'Zapier / Make'],
        ] as const).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            style={{
              padding: '10px 16px', borderRadius: 8, border: 'none',
              background: tab === id ? '#475569' : 'transparent',
              color: tab === id ? '#fff' : '#6b7280',
              fontSize: 13, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {tab === 'integrations' && (
          <motion.div key="integrations" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            {/* Category filter */}
            <div style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
              <button
                onClick={() => setActiveCat('all')}
                style={{ padding: '8px 14px', borderRadius: 20, border: 'none', background: activeCat === 'all' ? '#111827' : '#fff', color: activeCat === 'all' ? '#fff' : '#6b7280', fontSize: 12, fontWeight: 600, cursor: 'pointer', border: '1px solid #e5e7eb' }}
              >
                Toutes ({INTEGRATIONS.length})
              </button>
              {CATEGORIES.map((c) => (
                <button
                  key={c}
                  onClick={() => setActiveCat(c)}
                  style={{ padding: '8px 14px', borderRadius: 20, background: activeCat === c ? '#111827' : '#fff', color: activeCat === c ? '#fff' : '#6b7280', fontSize: 12, fontWeight: 600, cursor: 'pointer', border: '1px solid #e5e7eb' }}
                >
                  {c} ({INTEGRATIONS.filter((i) => i.category === c).length})
                </button>
              ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(300px,1fr))', gap: 14 }}>
              {filteredIntegs.map((integ, i) => (
                <motion.div
                  key={integ.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.02 }}
                  whileHover={{ y: -3 }}
                  style={{ background: '#fff', borderRadius: 14, padding: 18, border: '1px solid #f3f4f6' }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 44, height: 44, borderRadius: 10, background: `${integ.color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22 }}>{integ.emoji}</div>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 700, color: '#111827' }}>{integ.name}</div>
                        <div style={{ fontSize: 11, color: '#9ca3af', fontWeight: 500 }}>{integ.category}</div>
                      </div>
                    </div>
                    <span style={{ padding: '3px 8px', borderRadius: 5, background: statusBg[integ.status], color: statusColor[integ.status], fontSize: 10, fontWeight: 700 }}>
                      ● {statusLabel[integ.status]}
                    </span>
                  </div>
                  <p style={{ margin: '0 0 12px', fontSize: 12, color: '#6b7280', lineHeight: 1.4 }}>{integ.description}</p>
                  {integ.lastSync && (
                    <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 12 }}>🕐 Dernière sync : {integ.lastSync}</div>
                  )}
                  <div style={{ display: 'flex', gap: 6 }}>
                    {integ.status === 'connected' ? (
                      <>
                        <button style={{ flex: 1, padding: 7, borderRadius: 6, border: '1px solid #e5e7eb', background: '#fff', fontSize: 11, fontWeight: 600, color: '#374151', cursor: 'pointer' }}>Configurer</button>
                        <button style={{ flex: 1, padding: 7, borderRadius: 6, border: '1px solid #e5e7eb', background: '#fff', fontSize: 11, fontWeight: 600, color: '#374151', cursor: 'pointer' }}>Logs</button>
                        <button style={{ flex: 1, padding: 7, borderRadius: 6, border: '1px solid #fecaca', background: '#fff', fontSize: 11, fontWeight: 600, color: '#dc2626', cursor: 'pointer' }}>Déconnecter</button>
                      </>
                    ) : integ.status === 'error' ? (
                      <>
                        <button style={{ flex: 1, padding: 7, borderRadius: 6, border: 'none', background: '#ef4444', color: '#fff', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>Réparer</button>
                        <button style={{ flex: 1, padding: 7, borderRadius: 6, border: '1px solid #e5e7eb', background: '#fff', fontSize: 11, fontWeight: 600, color: '#374151', cursor: 'pointer' }}>Voir l'erreur</button>
                      </>
                    ) : (
                      <button style={{ flex: 1, padding: 7, borderRadius: 6, border: 'none', background: '#475569', color: '#fff', fontSize: 11, fontWeight: 600, cursor: 'pointer' }}>+ Connecter</button>
                    )}
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {tab === 'keys' && (
          <motion.div key="keys" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div style={{ background: '#fff', borderRadius: 14, padding: 24, border: '1px solid #f3f4f6' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: 16, color: '#111827' }}>Clés API</h3>
                  <p style={{ margin: '4px 0 0', fontSize: 13, color: '#6b7280' }}>Gérez les accès programmatiques à votre API</p>
                </div>
                <button style={{ padding: '10px 18px', borderRadius: 8, border: 'none', background: '#475569', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>+ Générer une clé</button>
              </div>

              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f8fafc' }}>
                    <th style={{ padding: 12, textAlign: 'left', fontSize: 12, color: '#475569', fontWeight: 600 }}>Nom</th>
                    <th style={{ padding: 12, textAlign: 'left', fontSize: 12, color: '#475569', fontWeight: 600 }}>Clé</th>
                    <th style={{ padding: 12, textAlign: 'left', fontSize: 12, color: '#475569', fontWeight: 600 }}>Scopes</th>
                    <th style={{ padding: 12, textAlign: 'left', fontSize: 12, color: '#475569', fontWeight: 600 }}>Créée le</th>
                    <th style={{ padding: 12, textAlign: 'left', fontSize: 12, color: '#475569', fontWeight: 600 }}>Dernière utilisation</th>
                    <th style={{ padding: 12, textAlign: 'left', fontSize: 12, color: '#475569', fontWeight: 600 }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {apiKeys.map((k) => (
                    <tr key={k.id} style={{ borderBottom: '1px solid #f3f4f6' }}>
                      <td style={{ padding: 14, fontSize: 13, color: '#111827', fontWeight: 600 }}>{k.name}</td>
                      <td style={{ padding: 14, fontSize: 12, fontFamily: 'monospace', color: '#6b7280' }}>{k.key}</td>
                      <td style={{ padding: 14, fontSize: 12, color: '#6b7280' }}>{k.scope}</td>
                      <td style={{ padding: 14, fontSize: 13, color: '#6b7280' }}>{k.created}</td>
                      <td style={{ padding: 14, fontSize: 13, color: '#6b7280' }}>{k.used}</td>
                      <td style={{ padding: 14 }}>
                        <button style={{ padding: '5px 10px', fontSize: 11, borderRadius: 5, border: '1px solid #e5e7eb', background: '#fff', marginRight: 6, cursor: 'pointer', fontWeight: 600, color: '#374151' }}>↻ Rotation</button>
                        <button onClick={() => revokeKey(k.id)} style={{ padding: '5px 10px', fontSize: 11, borderRadius: 5, border: '1px solid #fecaca', background: '#fff', color: '#dc2626', cursor: 'pointer', fontWeight: 600 }}>Révoquer</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}

        {tab === 'webhooks' && (
          <motion.div key="webhooks" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div style={{ background: '#fff', borderRadius: 14, padding: 24, border: '1px solid #f3f4f6' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: 16, color: '#111827' }}>Webhooks</h3>
                  <p style={{ margin: '4px 0 0', fontSize: 13, color: '#6b7280' }}>Notifications HTTP en temps réel vers vos endpoints</p>
                </div>
                <button style={{ padding: '10px 18px', borderRadius: 8, border: 'none', background: '#475569', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>+ Nouveau webhook</button>
              </div>

              {webhooks.map((w) => (
                <div key={w.id} style={{ padding: 16, background: '#f8fafc', borderRadius: 10, marginBottom: 10, borderLeft: `3px solid ${w.status.includes('Erreur') ? '#ef4444' : '#10b981'}` }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                    <div style={{ fontFamily: 'monospace', fontSize: 13, color: '#111827', fontWeight: 600, wordBreak: 'break-all' }}>{w.url}</div>
                    <span style={{ padding: '3px 8px', borderRadius: 5, fontSize: 11, fontWeight: 700, background: w.status.includes('Erreur') ? '#fee2e2' : '#d1fae5', color: w.status.includes('Erreur') ? '#991b1b' : '#065f46' }}>{w.status}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
                    {w.events.map((e) => (
                      <span key={e} style={{ padding: '3px 8px', fontSize: 11, background: '#e0e7ff', color: '#3730a3', borderRadius: 5, fontFamily: 'monospace' }}>{e}</span>
                    ))}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, color: '#6b7280' }}>
                    <span>🔁 Retry : {w.retry}</span>
                    <span>Dernière : {w.lastDelivery}</span>
                  </div>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {tab === 'limits' && (
          <motion.div key="limits" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div style={{ background: '#fff', borderRadius: 14, padding: 24, border: '1px solid #f3f4f6' }}>
              <h3 style={{ margin: '0 0 4px', fontSize: 16, color: '#111827' }}>Rate limits & quotas</h3>
              <p style={{ margin: '0 0 20px', fontSize: 13, color: '#6b7280' }}>Plan actuel : <strong style={{ color: '#475569' }}>Business</strong> · <a href="#" style={{ color: '#475569' }}>Changer de plan</a></p>

              {[
                { label: 'Requêtes API / minute', used: 340, limit: 1000 },
                { label: 'Requêtes API / jour', used: 3420, limit: 50000 },
                { label: 'Webhooks envoyés / jour', used: 890, limit: 10000 },
                { label: 'Stockage fichiers', used: 4.2, limit: 50, unit: ' Go' },
                { label: 'Utilisateurs API', used: 4, limit: 25 },
                { label: 'Intégrations actives', used: 12, limit: 30 },
              ].map((l) => {
                const pct = Math.round((l.used / l.limit) * 100)
                const warn = pct > 80
                return (
                  <div key={l.label} style={{ marginBottom: 20 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 13 }}>
                      <span style={{ color: '#111827', fontWeight: 500 }}>{l.label}</span>
                      <span style={{ color: warn ? '#d97706' : '#6b7280', fontWeight: 600 }}>
                        {l.used}{l.unit || ''} / {l.limit}{l.unit || ''} ({pct}%)
                      </span>
                    </div>
                    <div style={{ height: 10, background: '#f3f4f6', borderRadius: 5, overflow: 'hidden' }}>
                      <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.6 }} style={{ height: '100%', background: warn ? '#f59e0b' : '#475569' }} />
                    </div>
                  </div>
                )
              })}
            </div>
          </motion.div>
        )}

        {tab === 'logs' && (
          <motion.div key="logs" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div style={{ background: '#fff', borderRadius: 14, padding: 24, border: '1px solid #f3f4f6' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: 16, color: '#111827' }}>Logs d'activité API</h3>
                  <p style={{ margin: '4px 0 0', fontSize: 13, color: '#6b7280' }}>20 dernières requêtes</p>
                </div>
                <button style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', fontSize: 12, fontWeight: 600, color: '#374151', cursor: 'pointer' }}>📥 Exporter CSV</button>
              </div>
              <div style={{ fontFamily: 'monospace', fontSize: 12 }}>
                {logs.slice(0, 20).map((l, i) => (
                  <div key={i} style={{ display: 'grid', gridTemplateColumns: '90px 80px 1fr 90px 90px', gap: 12, padding: '10px 12px', borderBottom: '1px solid #f3f4f6', alignItems: 'center' }}>
                    <span style={{ color: '#9ca3af' }}>{l.time}</span>
                    <span style={{ padding: '2px 7px', borderRadius: 4, background: `${methodColor(l.method)}18`, color: methodColor(l.method), fontWeight: 700, textAlign: 'center', fontSize: 11 }}>{l.method}</span>
                    <span style={{ color: '#111827' }}>{l.endpoint || (l as any).endpoke}</span>
                    <span style={{ color: statusColorCode(l.status), fontWeight: 700 }}>{l.status}</span>
                    <span style={{ color: '#6b7280', textAlign: 'right' }}>{l.duration} ms</span>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {tab === 'docs' && (
          <motion.div key="docs" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 16 }}>
              <div style={{ background: '#fff', borderRadius: 14, padding: 18, border: '1px solid #f3f4f6' }}>
                <div style={{ fontSize: 12, color: '#9ca3af', textTransform: 'uppercase', fontWeight: 700, marginBottom: 12, letterSpacing: 0.5 }}>Endpoints</div>
                {[
                  'Authentication',
                  'Orders',
                  'Menu',
                  'Inventory',
                  'Customers',
                  'Reservations',
                  'Staff',
                  'Analytics',
                  'Payments',
                  'Webhooks',
                ].map((s, i) => (
                  <div key={s} style={{ padding: '8px 10px', fontSize: 13, color: i === 0 ? '#475569' : '#6b7280', background: i === 0 ? '#f1f5f9' : 'transparent', borderRadius: 6, marginBottom: 2, cursor: 'pointer', fontWeight: i === 0 ? 600 : 500 }}>
                    {s}
                  </div>
                ))}
              </div>

              <div style={{ background: '#fff', borderRadius: 14, padding: 24, border: '1px solid #f3f4f6' }}>
                <h3 style={{ margin: '0 0 4px', fontSize: 18, color: '#111827' }}>Authentication</h3>
                <p style={{ margin: '0 0 20px', fontSize: 13, color: '#6b7280' }}>Toutes les requêtes utilisent un Bearer Token dans le header Authorization.</p>

                <div style={{ background: '#0f172a', color: '#e2e8f0', padding: 16, borderRadius: 10, fontFamily: 'monospace', fontSize: 12, lineHeight: 1.6, marginBottom: 20 }}>
                  <div><span style={{ color: '#7dd3fc' }}>curl</span> https://api.creorga.com/v1/orders \</div>
                  <div style={{ marginLeft: 16 }}>-H <span style={{ color: '#fde68a' }}>"Authorization: Bearer pk_live_XXXXX"</span> \</div>
                  <div style={{ marginLeft: 16 }}>-H <span style={{ color: '#fde68a' }}>"Content-Type: application/json"</span></div>
                </div>

                <h4 style={{ fontSize: 14, color: '#111827', margin: '16px 0 8px' }}>Codes de réponse</h4>
                <table style={{ width: '100%', fontSize: 13 }}>
                  <tbody>
                    {[
                      ['200', 'OK', 'Requête réussie'],
                      ['201', 'Created', 'Ressource créée'],
                      ['400', 'Bad Request', 'Paramètres invalides'],
                      ['401', 'Unauthorized', 'Token manquant ou invalide'],
                      ['429', 'Too Many Requests', 'Rate limit dépassé'],
                      ['500', 'Server Error', 'Erreur côté Creorga'],
                    ].map(([code, name, desc]) => (
                      <tr key={code}>
                        <td style={{ padding: '8px 0', color: statusColorCode(Number(code)), fontFamily: 'monospace', fontWeight: 700, width: 60 }}>{code}</td>
                        <td style={{ padding: '8px 12px', color: '#111827', fontWeight: 600, width: 160 }}>{name}</td>
                        <td style={{ padding: '8px 0', color: '#6b7280' }}>{desc}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <button style={{ marginTop: 20, padding: '10px 18px', borderRadius: 8, border: 'none', background: '#475569', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>📖 Documentation complète</button>
              </div>
            </div>
          </motion.div>
        )}

        {tab === 'dev' && (
          <motion.div key="dev" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div style={{ background: '#fff', borderRadius: 14, padding: 24, border: '1px solid #f3f4f6' }}>
              <h3 style={{ margin: '0 0 4px', fontSize: 16, color: '#111827' }}>Mode développeur</h3>
              <p style={{ margin: '0 0 20px', fontSize: 13, color: '#6b7280' }}>Outils avancés pour développeurs et intégrateurs</p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(240px,1fr))', gap: 12 }}>
                {[
                  { icon: '🧪', title: 'Environnement sandbox', desc: 'Testez sans impacter la production' },
                  { icon: '🔍', title: 'API Explorer', desc: 'Interface interactive Swagger / Postman' },
                  { icon: '📜', title: 'Historique des requêtes', desc: 'Rejouer / comparer les appels' },
                  { icon: '⚡', title: 'Websockets temps réel', desc: 'Stream live des événements' },
                  { icon: '🔔', title: 'Test de webhooks', desc: 'Envoi manuel d\'events de test' },
                  { icon: '📦', title: 'SDKs officiels', desc: 'Node, Python, PHP, Go, Ruby' },
                ].map((it) => (
                  <div key={it.title} style={{ padding: 16, background: '#f8fafc', borderRadius: 10, border: '1px solid #e2e8f0' }}>
                    <div style={{ fontSize: 24, marginBottom: 8 }}>{it.icon}</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#111827', marginBottom: 4 }}>{it.title}</div>
                    <div style={{ fontSize: 12, color: '#6b7280' }}>{it.desc}</div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {tab === 'zapier' && (
          <motion.div key="zapier" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div style={{ background: 'linear-gradient(135deg,#ff4a00,#ff7a45)', borderRadius: 14, padding: 28, color: '#fff' }}>
                <div style={{ fontSize: 40, marginBottom: 10 }}>⚡</div>
                <h3 style={{ margin: '0 0 8px', fontSize: 20, fontWeight: 700 }}>Zapier</h3>
                <p style={{ margin: '0 0 16px', fontSize: 13, opacity: 0.9, lineHeight: 1.5 }}>Connectez Creorga à 6 000+ apps sans une seule ligne de code. Automatisez emails, CRM, Slack, Airtable, etc.</p>
                <div style={{ fontSize: 12, marginBottom: 14, opacity: 0.85 }}>12 Zaps actifs</div>
                <button style={{ padding: '10px 18px', borderRadius: 8, border: 'none', background: '#fff', color: '#ff4a00', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Ouvrir Zapier →</button>
              </div>

              <div style={{ background: 'linear-gradient(135deg,#6d2ee8,#9855ff)', borderRadius: 14, padding: 28, color: '#fff' }}>
                <div style={{ fontSize: 40, marginBottom: 10 }}>🔗</div>
                <h3 style={{ margin: '0 0 8px', fontSize: 20, fontWeight: 700 }}>Make (ex-Integromat)</h3>
                <p style={{ margin: '0 0 16px', fontSize: 13, opacity: 0.9, lineHeight: 1.5 }}>Scénarios visuels avancés, logique conditionnelle et transformations complexes pour les workflows sophistiqués.</p>
                <div style={{ fontSize: 12, marginBottom: 14, opacity: 0.85 }}>5 scénarios actifs</div>
                <button style={{ padding: '10px 18px', borderRadius: 8, border: 'none', background: '#fff', color: '#6d2ee8', fontSize: 13, fontWeight: 700, cursor: 'pointer' }}>Ouvrir Make →</button>
              </div>
            </div>

            <div style={{ background: '#fff', borderRadius: 14, padding: 24, border: '1px solid #f3f4f6', marginTop: 16 }}>
              <h3 style={{ margin: '0 0 16px', fontSize: 16, color: '#111827' }}>Templates populaires</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 12 }}>
                {[
                  'Nouvelle commande → Slack #cuisine',
                  'Réservation → Google Calendar',
                  'Stock bas → Email fournisseur',
                  'Nouveau client → Mailchimp',
                  'Facture payée → QuickBooks',
                  'Avis Google → Notion',
                ].map((t) => (
                  <div key={t} style={{ padding: 14, background: '#f8fafc', borderRadius: 10, border: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontSize: 13, color: '#111827', fontWeight: 500 }}>{t}</span>
                    <button style={{ padding: '5px 12px', fontSize: 11, borderRadius: 5, border: '1px solid #e5e7eb', background: '#fff', fontWeight: 600, color: '#475569', cursor: 'pointer' }}>Utiliser</button>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default ApiPage
