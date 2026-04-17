import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

type SiteStatus = 'active' | 'config' | 'closed'

interface Site {
  id: string
  name: string
  emoji: string
  address: string
  phone: string
  manager: string
  hours: string
  tables: number
  employees: number
  status: SiteStatus
  isPrincipal?: boolean
  caToday: number
  occupancy: number
  topProducts: string[]
}

const SITES: Site[] = [
  {
    id: 's1',
    name: 'Café um Rond-Point Rumelange',
    emoji: '🏪',
    address: '12 Rond-Point, L-3730 Rumelange',
    phone: '+352 26 12 34 56',
    manager: 'Marc Weber',
    hours: '07:00 - 22:00',
    tables: 12,
    employees: 8,
    status: 'active',
    isPrincipal: true,
    caToday: 3420,
    occupancy: 78,
    topProducts: ['Café crème', 'Gromperekichelcher', 'Bouneschlupp'],
  },
  {
    id: 's2',
    name: 'Café um Rond-Point Esch',
    emoji: '🏬',
    address: '45 Avenue de la Gare, L-4130 Esch-sur-Alzette',
    phone: '+352 26 54 98 10',
    manager: 'Sophie Hansen',
    hours: '07:30 - 22:30',
    tables: 10,
    employees: 6,
    status: 'active',
    caToday: 2680,
    occupancy: 62,
    topProducts: ['Espresso', 'Quiche lorraine', 'Tarte aux quetsches'],
  },
  {
    id: 's3',
    name: 'Café um Rond-Point Kirchberg',
    emoji: '🏢',
    address: '2 Boulevard Konrad Adenauer, L-1115 Kirchberg',
    phone: '+352 26 43 77 22',
    manager: 'Laurent Müller',
    hours: '06:30 - 23:00',
    tables: 15,
    employees: 10,
    status: 'config',
    caToday: 2440,
    occupancy: 54,
    topProducts: ['Cappuccino', 'Bagel saumon', 'Salade César'],
  },
]

const statusLabel = (s: SiteStatus) =>
  s === 'active' ? 'Actif' : s === 'config' ? 'En configuration' : 'Fermé temporairement'
const statusColor = (s: SiteStatus) =>
  s === 'active' ? '#10b981' : s === 'config' ? '#f59e0b' : '#ef4444'
const statusBg = (s: SiteStatus) =>
  s === 'active' ? '#d1fae5' : s === 'config' ? '#fef3c7' : '#fee2e2'

function SitesPage() {
  const [activeSite, setActiveSite] = useState<string>('s1')
  const [tab, setTab] = useState<'overview' | 'analytics' | 'transfer' | 'staff' | 'menu' | 'settings' | 'franchise'>('overview')
  const [showWizard, setShowWizard] = useState(false)
  const [wizardStep, setWizardStep] = useState(1)

  const [transferFrom, setTransferFrom] = useState('s1')
  const [transferTo, setTransferTo] = useState('s2')
  const [transferItem, setTransferItem] = useState('Café grains 1kg')
  const [transferQty, setTransferQty] = useState(5)

  const [syncMenu, setSyncMenu] = useState(true)

  const current = SITES.find((s) => s.id === activeSite) || SITES[0]

  const stats = [
    { label: 'Établissements', value: '3', icon: '🏪', color: '#db2777' },
    { label: 'CA consolidé', value: '8 540 €', icon: '💶', color: '#059669' },
    { label: 'Employés totaux', value: '24', icon: '👥', color: '#2563eb' },
    { label: 'Clients fidèles', value: '412', icon: '⭐', color: '#f59e0b' },
  ]

  const maxCa = Math.max(...SITES.map((s) => s.caToday))

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(180deg,#fdf2f8 0%,#f9fafb 100%)', padding: '32px 40px' }}>
      {/* Header */}
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} style={{ marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
              <div style={{ width: 48, height: 48, borderRadius: 12, background: '#db2777', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, color: '#fff' }}>🏪</div>
              <div>
                <h1 style={{ margin: 0, fontSize: 28, color: '#111827', fontWeight: 700 }}>Multi-établissements</h1>
                <p style={{ margin: '4px 0 0', fontSize: 14, color: '#6b7280' }}>Gestion centralisée de votre chaîne</p>
              </div>
            </div>
          </div>

          {/* Site switcher */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: 13, color: '#6b7280' }}>Contexte actif :</span>
            <select
              value={activeSite}
              onChange={(e) => setActiveSite(e.target.value)}
              style={{ padding: '10px 14px', borderRadius: 10, border: '1px solid #e5e7eb', background: '#fff', fontSize: 14, fontWeight: 600, color: '#111827', cursor: 'pointer', minWidth: 260 }}
            >
              {SITES.map((s) => (
                <option key={s.id} value={s.id}>{s.emoji} {s.name}</option>
              ))}
            </select>
            <button
              onClick={() => { setShowWizard(true); setWizardStep(1) }}
              style={{ padding: '10px 16px', borderRadius: 10, border: 'none', background: '#db2777', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}
            >
              + Nouvel établissement
            </button>
          </div>
        </div>
      </motion.div>

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(220px,1fr))', gap: 16, marginBottom: 24 }}>
        {stats.map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }} style={{ background: '#fff', borderRadius: 14, padding: 20, border: '1px solid #f3f4f6', boxShadow: '0 1px 2px rgba(0,0,0,0.04)' }}>
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
          ['overview', 'Vue d\'ensemble'],
          ['analytics', 'Analyses croisées'],
          ['transfer', 'Transferts stock'],
          ['staff', 'Équipe partagée'],
          ['menu', 'Menu centralisé'],
          ['settings', 'Paramètres par site'],
          ['franchise', 'Franchises'],
        ] as const).map(([id, label]) => (
          <button
            key={id}
            onClick={() => setTab(id)}
            style={{
              padding: '10px 16px', borderRadius: 8, border: 'none',
              background: tab === id ? '#db2777' : 'transparent',
              color: tab === id ? '#fff' : '#6b7280',
              fontSize: 13, fontWeight: 600, cursor: 'pointer', whiteSpace: 'nowrap',
            }}
          >
            {label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <AnimatePresence mode="wait">
        {tab === 'overview' && (
          <motion.div key="overview" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(360px,1fr))', gap: 16 }}>
              {SITES.map((site, i) => (
                <motion.div
                  key={site.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.08 }}
                  whileHover={{ y: -4 }}
                  style={{
                    background: '#fff', borderRadius: 16, overflow: 'hidden',
                    border: site.id === activeSite ? '2px solid #db2777' : '1px solid #f3f4f6',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                  }}
                >
                  <div style={{ background: 'linear-gradient(135deg,#fce7f3,#fbcfe8)', padding: 24, textAlign: 'center', fontSize: 56 }}>
                    {site.emoji}
                  </div>
                  <div style={{ padding: 20 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                      <h3 style={{ margin: 0, fontSize: 16, color: '#111827', fontWeight: 700 }}>{site.name}</h3>
                      {site.isPrincipal && <span style={{ padding: '3px 8px', fontSize: 10, fontWeight: 700, background: '#fce7f3', color: '#be185d', borderRadius: 6, letterSpacing: 0.5 }}>PRINCIPAL</span>}
                    </div>
                    <div style={{ display: 'inline-block', padding: '4px 10px', borderRadius: 6, background: statusBg(site.status), color: statusColor(site.status), fontSize: 11, fontWeight: 600, marginBottom: 12 }}>
                      ● {statusLabel(site.status)}
                    </div>
                    <div style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.6, marginBottom: 12 }}>
                      <div>📍 {site.address}</div>
                      <div>📞 {site.phone}</div>
                      <div>👤 {site.manager}</div>
                      <div>🕐 {site.hours}</div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 14 }}>
                      <div style={{ background: '#f9fafb', padding: 10, borderRadius: 8 }}>
                        <div style={{ fontSize: 11, color: '#6b7280' }}>CA aujourd'hui</div>
                        <div style={{ fontSize: 15, fontWeight: 700, color: '#059669' }}>{site.caToday} €</div>
                      </div>
                      <div style={{ background: '#f9fafb', padding: 10, borderRadius: 8 }}>
                        <div style={{ fontSize: 11, color: '#6b7280' }}>Occupation</div>
                        <div style={{ fontSize: 15, fontWeight: 700, color: '#db2777' }}>{site.occupancy}%</div>
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 16, fontSize: 12, color: '#6b7280', marginBottom: 14 }}>
                      <span>🪑 {site.tables} tables</span>
                      <span>👥 {site.employees} employés</span>
                    </div>
                    <button
                      onClick={() => setActiveSite(site.id)}
                      style={{ width: '100%', padding: 10, borderRadius: 8, border: 'none', background: site.id === activeSite ? '#10b981' : '#db2777', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
                    >
                      {site.id === activeSite ? '✓ Contexte actif' : 'Gérer cet établissement'}
                    </button>
                  </div>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}

        {tab === 'analytics' && (
          <motion.div key="analytics" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1.3fr 1fr', gap: 16 }}>
              <div style={{ background: '#fff', borderRadius: 14, padding: 24, border: '1px solid #f3f4f6' }}>
                <h3 style={{ margin: '0 0 4px', fontSize: 16, color: '#111827' }}>CA par établissement (aujourd'hui)</h3>
                <p style={{ margin: '0 0 20px', fontSize: 13, color: '#6b7280' }}>Comparaison en temps réel</p>
                <div style={{ display: 'flex', alignItems: 'flex-end', gap: 24, height: 240, padding: '0 12px' }}>
                  {SITES.map((s) => (
                    <div key={s.id} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#111827' }}>{s.caToday} €</div>
                      <motion.div
                        initial={{ height: 0 }}
                        animate={{ height: `${(s.caToday / maxCa) * 180}px` }}
                        transition={{ duration: 0.7, ease: 'easeOut' }}
                        style={{ width: '100%', background: 'linear-gradient(180deg,#db2777,#be185d)', borderRadius: '8px 8px 0 0', minHeight: 8 }}
                      />
                      <div style={{ fontSize: 11, color: '#6b7280', textAlign: 'center', lineHeight: 1.3 }}>{s.name.replace('Café um Rond-Point ', '')}</div>
                    </div>
                  ))}
                </div>
              </div>

              <div style={{ background: '#fff', borderRadius: 14, padding: 24, border: '1px solid #f3f4f6' }}>
                <h3 style={{ margin: '0 0 16px', fontSize: 16, color: '#111827' }}>Performance relative</h3>
                {SITES.map((s) => {
                  const pct = Math.round((s.caToday / maxCa) * 100)
                  return (
                    <div key={s.id} style={{ marginBottom: 16 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                        <span style={{ fontSize: 13, color: '#111827', fontWeight: 500 }}>{s.name.replace('Café um Rond-Point ', '')}</span>
                        <span style={{ fontSize: 13, color: '#db2777', fontWeight: 700 }}>{pct}%</span>
                      </div>
                      <div style={{ height: 8, background: '#f3f4f6', borderRadius: 4, overflow: 'hidden' }}>
                        <motion.div initial={{ width: 0 }} animate={{ width: `${pct}%` }} transition={{ duration: 0.6 }} style={{ height: '100%', background: '#db2777' }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>

            <div style={{ background: '#fff', borderRadius: 14, padding: 24, border: '1px solid #f3f4f6', marginTop: 16 }}>
              <h3 style={{ margin: '0 0 16px', fontSize: 16, color: '#111827' }}>Top produits par établissement</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 12 }}>
                {SITES.map((s) => (
                  <div key={s.id} style={{ padding: 16, background: '#fdf2f8', borderRadius: 10, border: '1px solid #fbcfe8' }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#111827', marginBottom: 10 }}>{s.emoji} {s.name.replace('Café um Rond-Point ', '')}</div>
                    {s.topProducts.map((p, idx) => (
                      <div key={p} style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', fontSize: 13, color: '#374151', borderBottom: idx < 2 ? '1px solid #fbcfe8' : 'none' }}>
                        <span>#{idx + 1} {p}</span>
                        <span style={{ color: '#db2777', fontWeight: 600 }}>{Math.round(45 - idx * 12)}x</span>
                      </div>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {tab === 'transfer' && (
          <motion.div key="transfer" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
              <div style={{ background: '#fff', borderRadius: 14, padding: 24, border: '1px solid #f3f4f6' }}>
                <h3 style={{ margin: '0 0 4px', fontSize: 16, color: '#111827' }}>Transfert de stock inter-sites</h3>
                <p style={{ margin: '0 0 20px', fontSize: 13, color: '#6b7280' }}>Déplacez l'inventaire entre établissements</p>

                <label style={{ display: 'block', marginBottom: 16 }}>
                  <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 6, fontWeight: 500 }}>Depuis</div>
                  <select value={transferFrom} onChange={(e) => setTransferFrom(e.target.value)} style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', fontSize: 14 }}>
                    {SITES.map((s) => <option key={s.id} value={s.id}>{s.emoji} {s.name}</option>)}
                  </select>
                </label>

                <div style={{ textAlign: 'center', fontSize: 24, color: '#db2777', margin: '8px 0' }}>↓</div>

                <label style={{ display: 'block', marginBottom: 16 }}>
                  <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 6, fontWeight: 500 }}>Vers</div>
                  <select value={transferTo} onChange={(e) => setTransferTo(e.target.value)} style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', fontSize: 14 }}>
                    {SITES.map((s) => <option key={s.id} value={s.id}>{s.emoji} {s.name}</option>)}
                  </select>
                </label>

                <label style={{ display: 'block', marginBottom: 16 }}>
                  <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 6, fontWeight: 500 }}>Article</div>
                  <select value={transferItem} onChange={(e) => setTransferItem(e.target.value)} style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', fontSize: 14 }}>
                    <option>Café grains 1kg</option>
                    <option>Lait entier 1L</option>
                    <option>Farine T55 25kg</option>
                    <option>Vin rouge Riesling</option>
                    <option>Serviettes papier (carton)</option>
                  </select>
                </label>

                <label style={{ display: 'block', marginBottom: 20 }}>
                  <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 6, fontWeight: 500 }}>Quantité</div>
                  <input type="number" value={transferQty} onChange={(e) => setTransferQty(Number(e.target.value))} style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', fontSize: 14 }} />
                </label>

                <button style={{ width: '100%', padding: 12, borderRadius: 8, border: 'none', background: '#db2777', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>
                  🚚 Programmer le transfert
                </button>
              </div>

              <div style={{ background: '#fff', borderRadius: 14, padding: 24, border: '1px solid #f3f4f6' }}>
                <h3 style={{ margin: '0 0 16px', fontSize: 16, color: '#111827' }}>Transferts récents</h3>
                {[
                  { from: 'Rumelange', to: 'Esch', item: 'Café grains 1kg', qty: 8, date: 'Aujourd\'hui 09:15', status: 'Livré' },
                  { from: 'Kirchberg', to: 'Rumelange', item: 'Farine T55', qty: 3, date: 'Hier 16:40', status: 'En cours' },
                  { from: 'Esch', to: 'Kirchberg', item: 'Vin rouge Riesling', qty: 12, date: 'Il y a 2 j', status: 'Livré' },
                  { from: 'Rumelange', to: 'Kirchberg', item: 'Serviettes', qty: 5, date: 'Il y a 3 j', status: 'Livré' },
                ].map((t, i) => (
                  <div key={i} style={{ padding: 14, background: '#f9fafb', borderRadius: 10, marginBottom: 10, borderLeft: `3px solid ${t.status === 'Livré' ? '#10b981' : '#f59e0b'}` }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                      <span style={{ fontSize: 13, fontWeight: 600, color: '#111827' }}>{t.item} × {t.qty}</span>
                      <span style={{ fontSize: 11, color: t.status === 'Livré' ? '#10b981' : '#f59e0b', fontWeight: 600 }}>{t.status}</span>
                    </div>
                    <div style={{ fontSize: 12, color: '#6b7280' }}>{t.from} → {t.to} · {t.date}</div>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        )}

        {tab === 'staff' && (
          <motion.div key="staff" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div style={{ background: '#fff', borderRadius: 14, padding: 24, border: '1px solid #f3f4f6' }}>
              <h3 style={{ margin: '0 0 4px', fontSize: 16, color: '#111827' }}>Personnel partagé entre sites</h3>
              <p style={{ margin: '0 0 20px', fontSize: 13, color: '#6b7280' }}>Employés travaillant sur plusieurs établissements</p>

              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#fdf2f8' }}>
                    <th style={{ padding: 12, textAlign: 'left', fontSize: 12, color: '#be185d', fontWeight: 600 }}>Employé</th>
                    <th style={{ padding: 12, textAlign: 'left', fontSize: 12, color: '#be185d', fontWeight: 600 }}>Poste</th>
                    <th style={{ padding: 12, textAlign: 'left', fontSize: 12, color: '#be185d', fontWeight: 600 }}>Sites affectés</th>
                    <th style={{ padding: 12, textAlign: 'left', fontSize: 12, color: '#be185d', fontWeight: 600 }}>Heures cette semaine</th>
                    <th style={{ padding: 12, textAlign: 'left', fontSize: 12, color: '#be185d', fontWeight: 600 }}>Site principal</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { name: 'Marie Dubois', role: 'Manager volante', sites: ['Rumelange', 'Esch'], hours: 42, main: 'Rumelange' },
                    { name: 'Thomas Schmit', role: 'Chef', sites: ['Rumelange', 'Kirchberg'], hours: 40, main: 'Kirchberg' },
                    { name: 'Anna Rossi', role: 'Serveuse', sites: ['Esch', 'Kirchberg'], hours: 35, main: 'Esch' },
                    { name: 'Paul Becker', role: 'Barista', sites: ['Rumelange', 'Esch', 'Kirchberg'], hours: 38, main: 'Rumelange' },
                    { name: 'Lisa Wagner', role: 'Caissière', sites: ['Kirchberg', 'Rumelange'], hours: 32, main: 'Kirchberg' },
                  ].map((emp, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #f3f4f6' }}>
                      <td style={{ padding: 14, fontSize: 13, color: '#111827', fontWeight: 600 }}>{emp.name}</td>
                      <td style={{ padding: 14, fontSize: 13, color: '#6b7280' }}>{emp.role}</td>
                      <td style={{ padding: 14 }}>
                        {emp.sites.map((s) => (
                          <span key={s} style={{ display: 'inline-block', padding: '3px 8px', marginRight: 4, fontSize: 11, background: '#fce7f3', color: '#be185d', borderRadius: 5, fontWeight: 600 }}>{s}</span>
                        ))}
                      </td>
                      <td style={{ padding: 14, fontSize: 13, color: '#111827', fontWeight: 600 }}>{emp.hours}h</td>
                      <td style={{ padding: 14, fontSize: 13, color: '#6b7280' }}>{emp.main}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}

        {tab === 'menu' && (
          <motion.div key="menu" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div style={{ background: '#fff', borderRadius: 14, padding: 24, border: '1px solid #f3f4f6', marginBottom: 16 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <div>
                  <h3 style={{ margin: 0, fontSize: 16, color: '#111827' }}>Gestion centralisée du menu</h3>
                  <p style={{ margin: '4px 0 0', fontSize: 13, color: '#6b7280' }}>Synchronisez ou personnalisez par site</p>
                </div>
                <label style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'pointer' }}>
                  <span style={{ fontSize: 13, color: '#111827', fontWeight: 500 }}>Sync. automatique</span>
                  <div onClick={() => setSyncMenu(!syncMenu)} style={{ width: 44, height: 24, borderRadius: 12, background: syncMenu ? '#db2777' : '#d1d5db', position: 'relative', transition: 'all 0.2s' }}>
                    <motion.div animate={{ x: syncMenu ? 22 : 2 }} style={{ position: 'absolute', top: 2, width: 20, height: 20, borderRadius: '50%', background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.2)' }} />
                  </div>
                </label>
              </div>

              <div style={{ padding: 16, background: syncMenu ? '#ecfdf5' : '#fef3c7', borderRadius: 10, fontSize: 13, color: syncMenu ? '#065f46' : '#92400e' }}>
                {syncMenu
                  ? '✓ Toutes les modifications sont propagées automatiquement sur les 3 établissements'
                  : '⚠ Mode manuel : chaque site peut avoir son propre menu et ses prix'}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(280px,1fr))', gap: 16 }}>
              {SITES.map((s) => (
                <div key={s.id} style={{ background: '#fff', borderRadius: 14, padding: 20, border: '1px solid #f3f4f6' }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: '#111827', marginBottom: 12 }}>{s.emoji} {s.name.replace('Café um Rond-Point ', '')}</div>
                  <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 10 }}>Éléments de menu : <strong style={{ color: '#111827' }}>48</strong></div>
                  <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 10 }}>Overrides locaux : <strong style={{ color: '#db2777' }}>{s.id === 's3' ? '7' : '0'}</strong></div>
                  <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 14 }}>Dernière sync : <strong style={{ color: '#111827' }}>il y a 12 min</strong></div>
                  <button style={{ width: '100%', padding: 9, borderRadius: 8, border: '1px solid #fbcfe8', background: '#fdf2f8', color: '#be185d', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}>Modifier</button>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {tab === 'settings' && (
          <motion.div key="settings" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div style={{ background: '#fff', borderRadius: 14, padding: 24, border: '1px solid #f3f4f6' }}>
              <h3 style={{ margin: '0 0 4px', fontSize: 16, color: '#111827' }}>Paramètres de : {current.name}</h3>
              <p style={{ margin: '0 0 20px', fontSize: 13, color: '#6b7280' }}>Configuration spécifique à cet établissement</p>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(260px,1fr))', gap: 16 }}>
                <div>
                  <div style={{ fontSize: 12, color: '#6b7280', fontWeight: 600, marginBottom: 6 }}>Horaires d'ouverture</div>
                  <input defaultValue={current.hours} style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 14 }} />
                </div>
                <div>
                  <div style={{ fontSize: 12, color: '#6b7280', fontWeight: 600, marginBottom: 6 }}>Taux TVA applicable</div>
                  <select style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 14 }}>
                    <option>17% (Luxembourg standard)</option>
                    <option>14% (intermédiaire)</option>
                    <option>8% (réduit)</option>
                    <option>3% (super-réduit)</option>
                  </select>
                </div>
                <div>
                  <div style={{ fontSize: 12, color: '#6b7280', fontWeight: 600, marginBottom: 6 }}>Configuration pourboires</div>
                  <select style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 14 }}>
                    <option>Partage équipe (tronc)</option>
                    <option>Nominatif par serveur</option>
                    <option>Pas de pourboires</option>
                  </select>
                </div>
                <div>
                  <div style={{ fontSize: 12, color: '#6b7280', fontWeight: 600, marginBottom: 6 }}>Devise</div>
                  <select style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 14 }}>
                    <option>Euro (€)</option>
                    <option>CHF</option>
                  </select>
                </div>
                <div>
                  <div style={{ fontSize: 12, color: '#6b7280', fontWeight: 600, marginBottom: 6 }}>Imprimante principale</div>
                  <input defaultValue="Epson TM-T88VI" style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 14 }} />
                </div>
                <div>
                  <div style={{ fontSize: 12, color: '#6b7280', fontWeight: 600, marginBottom: 6 }}>Manager principal</div>
                  <input defaultValue={current.manager} style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 14 }} />
                </div>
              </div>
              <button style={{ marginTop: 20, padding: '10px 20px', borderRadius: 8, border: 'none', background: '#db2777', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer' }}>Enregistrer</button>
            </div>
          </motion.div>
        )}

        {tab === 'franchise' && (
          <motion.div key="franchise" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div style={{ background: '#fff', borderRadius: 14, padding: 24, border: '1px solid #f3f4f6' }}>
              <h3 style={{ margin: '0 0 4px', fontSize: 16, color: '#111827' }}>Modèle franchise</h3>
              <p style={{ margin: '0 0 20px', fontSize: 13, color: '#6b7280' }}>Pour franchisés avec propriété séparée</p>

              <div style={{ padding: 20, background: 'linear-gradient(135deg,#fdf2f8,#fce7f3)', borderRadius: 12, marginBottom: 20 }}>
                <div style={{ fontSize: 16, fontWeight: 700, color: '#be185d', marginBottom: 8 }}>💡 Options franchises disponibles</div>
                <ul style={{ margin: 0, paddingLeft: 20, fontSize: 13, color: '#374151', lineHeight: 1.8 }}>
                  <li>Redevances automatiques calculées sur le CA</li>
                  <li>Accès limité aux données financières inter-sites</li>
                  <li>Reporting consolidé pour la tête de réseau</li>
                  <li>Charte graphique et menu imposés/ouverts</li>
                  <li>Facturation centralisée des fournisseurs agréés</li>
                </ul>
              </div>

              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f9fafb' }}>
                    <th style={{ padding: 12, textAlign: 'left', fontSize: 12, color: '#6b7280' }}>Établissement</th>
                    <th style={{ padding: 12, textAlign: 'left', fontSize: 12, color: '#6b7280' }}>Type</th>
                    <th style={{ padding: 12, textAlign: 'left', fontSize: 12, color: '#6b7280' }}>Franchisé</th>
                    <th style={{ padding: 12, textAlign: 'left', fontSize: 12, color: '#6b7280' }}>Redevance</th>
                    <th style={{ padding: 12, textAlign: 'left', fontSize: 12, color: '#6b7280' }}>Date contrat</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    { site: 'Rumelange', type: 'Propre', name: '—', fee: '—', date: '01/01/2020' },
                    { site: 'Esch', type: 'Franchise', name: 'SARL Esch Coffee', fee: '5,5%', date: '15/03/2022' },
                    { site: 'Kirchberg', type: 'Franchise', name: 'Kirchberg Hospitality SA', fee: '6%', date: '01/09/2024' },
                  ].map((row, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #f3f4f6' }}>
                      <td style={{ padding: 14, fontSize: 13, color: '#111827', fontWeight: 600 }}>{row.site}</td>
                      <td style={{ padding: 14 }}>
                        <span style={{ padding: '3px 8px', fontSize: 11, background: row.type === 'Propre' ? '#dbeafe' : '#fce7f3', color: row.type === 'Propre' ? '#1e40af' : '#be185d', borderRadius: 5, fontWeight: 600 }}>{row.type}</span>
                      </td>
                      <td style={{ padding: 14, fontSize: 13, color: '#6b7280' }}>{row.name}</td>
                      <td style={{ padding: 14, fontSize: 13, color: '#059669', fontWeight: 600 }}>{row.fee}</td>
                      <td style={{ padding: 14, fontSize: 13, color: '#6b7280' }}>{row.date}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Wizard modal */}
      <AnimatePresence>
        {showWizard && (
          <motion.div
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, padding: 20 }}
            onClick={() => setShowWizard(false)}
          >
            <motion.div
              initial={{ scale: 0.92, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.92, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              style={{ background: '#fff', borderRadius: 16, width: '100%', maxWidth: 560, overflow: 'hidden' }}
            >
              <div style={{ padding: 20, background: 'linear-gradient(135deg,#db2777,#be185d)', color: '#fff' }}>
                <div style={{ fontSize: 12, opacity: 0.85, fontWeight: 600 }}>ÉTAPE {wizardStep} / 4</div>
                <div style={{ fontSize: 18, fontWeight: 700, marginTop: 4 }}>Ajouter un nouvel établissement</div>
              </div>
              <div style={{ padding: 24 }}>
                {wizardStep === 1 && (
                  <div>
                    <h4 style={{ margin: '0 0 12px', fontSize: 15, color: '#111827' }}>Informations générales</h4>
                    <input placeholder="Nom de l'établissement" style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #e5e7eb', marginBottom: 10, fontSize: 14 }} />
                    <input placeholder="Adresse complète" style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #e5e7eb', marginBottom: 10, fontSize: 14 }} />
                    <input placeholder="Téléphone" style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 14 }} />
                  </div>
                )}
                {wizardStep === 2 && (
                  <div>
                    <h4 style={{ margin: '0 0 12px', fontSize: 15, color: '#111827' }}>Type et propriété</h4>
                    <select style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #e5e7eb', marginBottom: 10, fontSize: 14 }}>
                      <option>Propre (appartient au groupe)</option>
                      <option>Franchise</option>
                      <option>Gérance</option>
                    </select>
                    <input placeholder="Nom du gérant / franchisé" style={{ width: '100%', padding: 10, borderRadius: 8, border: '1px solid #e5e7eb', fontSize: 14 }} />
                  </div>
                )}
                {wizardStep === 3 && (
                  <div>
                    <h4 style={{ margin: '0 0 12px', fontSize: 15, color: '#111827' }}>Configuration initiale</h4>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 10, fontSize: 14 }}><input type="checkbox" defaultChecked /> Cloner le menu du site principal</label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 10, fontSize: 14 }}><input type="checkbox" defaultChecked /> Importer la grille tarifaire</label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 10, fontSize: 14 }}><input type="checkbox" /> Affecter du personnel existant</label>
                    <label style={{ display: 'flex', alignItems: 'center', gap: 10, padding: 10, fontSize: 14 }}><input type="checkbox" defaultChecked /> Activer la synchronisation automatique</label>
                  </div>
                )}
                {wizardStep === 4 && (
                  <div style={{ textAlign: 'center', padding: 20 }}>
                    <div style={{ fontSize: 56, marginBottom: 12 }}>🎉</div>
                    <h4 style={{ margin: '0 0 8px', fontSize: 16, color: '#111827' }}>Tout est prêt !</h4>
                    <p style={{ fontSize: 13, color: '#6b7280' }}>Votre nouvel établissement sera créé et disponible dans quelques instants.</p>
                  </div>
                )}

                <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 24 }}>
                  <button
                    onClick={() => wizardStep > 1 ? setWizardStep(wizardStep - 1) : setShowWizard(false)}
                    style={{ padding: '10px 16px', borderRadius: 8, border: '1px solid #e5e7eb', background: '#fff', color: '#6b7280', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
                  >
                    {wizardStep > 1 ? '← Précédent' : 'Annuler'}
                  </button>
                  <button
                    onClick={() => wizardStep < 4 ? setWizardStep(wizardStep + 1) : setShowWizard(false)}
                    style={{ padding: '10px 20px', borderRadius: 8, border: 'none', background: '#db2777', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' }}
                  >
                    {wizardStep < 4 ? 'Suivant →' : 'Créer l\'établissement'}
                  </button>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default SitesPage
