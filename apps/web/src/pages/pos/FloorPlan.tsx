import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Users, Clock, CreditCard, Maximize2, Edit3, X,
  Eye, Sparkles, DoorOpen, Circle,
} from 'lucide-react'

/* ------------------------------------------------------------------ */
/*  TYPES                                                              */
/* ------------------------------------------------------------------ */
type TableStatus = 'LIBRE' | 'OCCUPEE' | 'RESERVEE' | 'NETTOYAGE'
type Section = 'Salle' | 'Bar' | 'Terrasse'

interface MockTable {
  id: string
  name: string
  seats: number
  section: Section
  status: TableStatus
  x: number
  y: number
  shape: 'round' | 'square' | 'rect'
  // If occupied:
  orderTotal?: number
  orderItems?: { name: string; qty: number; price: number }[]
  openedAt?: number // timestamp
  server?: string
  // If reserved:
  reservedFor?: string
  reservedAt?: string
}

/* ------------------------------------------------------------------ */
/*  MOCK DATA — 12 tables across 3 sections                            */
/* ------------------------------------------------------------------ */
const now = Date.now()
const mockTables: MockTable[] = [
  // SALLE — 6 tables
  { id: 't1', name: 'T1', seats: 2, section: 'Salle', status: 'OCCUPEE', x: 80, y: 70, shape: 'round',
    orderTotal: 42.50, server: 'Marie',
    openedAt: now - 32 * 60 * 1000,
    orderItems: [
      { name: 'Entrecôte', qty: 1, price: 24 },
      { name: 'Verre de vin', qty: 2, price: 6.5 },
      { name: 'Café', qty: 1, price: 2.5 },
    ] },
  { id: 't2', name: 'T2', seats: 4, section: 'Salle', status: 'LIBRE', x: 220, y: 70, shape: 'square' },
  { id: 't3', name: 'T3', seats: 4, section: 'Salle', status: 'RESERVEE', x: 360, y: 70, shape: 'square',
    reservedFor: 'Dupont (4p.)', reservedAt: '20:00' },
  { id: 't4', name: 'T4', seats: 6, section: 'Salle', status: 'OCCUPEE', x: 80, y: 200, shape: 'rect',
    orderTotal: 128.80, server: 'Lucas',
    openedAt: now - 58 * 60 * 1000,
    orderItems: [
      { name: 'Menu complet x4', qty: 4, price: 28 },
      { name: 'Bouteille vin', qty: 1, price: 24 },
    ] },
  { id: 't5', name: 'T5', seats: 2, section: 'Salle', status: 'LIBRE', x: 260, y: 200, shape: 'round' },
  { id: 't6', name: 'T6', seats: 4, section: 'Salle', status: 'NETTOYAGE', x: 400, y: 200, shape: 'square' },

  // BAR — 3 tables
  { id: 'b1', name: 'B1', seats: 2, section: 'Bar', status: 'OCCUPEE', x: 80, y: 90, shape: 'round',
    orderTotal: 18.50, server: 'Sophie',
    openedAt: now - 14 * 60 * 1000,
    orderItems: [
      { name: 'Cocktail maison', qty: 2, price: 9.25 },
    ] },
  { id: 'b2', name: 'B2', seats: 2, section: 'Bar', status: 'LIBRE', x: 200, y: 90, shape: 'round' },
  { id: 'b3', name: 'B3', seats: 2, section: 'Bar', status: 'LIBRE', x: 320, y: 90, shape: 'round' },

  // TERRASSE — 3 tables
  { id: 'x1', name: 'X1', seats: 4, section: 'Terrasse', status: 'OCCUPEE', x: 80, y: 90, shape: 'square',
    orderTotal: 76.40, server: 'Thomas',
    openedAt: now - 45 * 60 * 1000,
    orderItems: [
      { name: 'Pizza', qty: 2, price: 14 },
      { name: 'Salade', qty: 2, price: 12 },
      { name: 'Bière pression', qty: 4, price: 5.1 },
    ] },
  { id: 'x2', name: 'X2', seats: 4, section: 'Terrasse', status: 'LIBRE', x: 240, y: 90, shape: 'square' },
  { id: 'x3', name: 'X3', seats: 6, section: 'Terrasse', status: 'RESERVEE', x: 400, y: 90, shape: 'rect',
    reservedFor: 'Muller (5p.)', reservedAt: '19:30' },
]

/* ------------------------------------------------------------------ */
/*  STATUS COLORS                                                      */
/* ------------------------------------------------------------------ */
const statusConfig: Record<TableStatus, { label: string; bg: string; border: string; text: string; dot: string }> = {
  LIBRE:     { label: 'Libre',      bg: '#ecfdf5', border: '#10b981', text: '#047857', dot: '#10b981' },
  OCCUPEE:   { label: 'Occupée',    bg: '#fef3c7', border: '#f59e0b', text: '#b45309', dot: '#f59e0b' },
  RESERVEE:  { label: 'Réservée',   bg: '#dbeafe', border: '#3b82f6', text: '#1d4ed8', dot: '#3b82f6' },
  NETTOYAGE: { label: 'À nettoyer', bg: '#fee2e2', border: '#ef4444', text: '#b91c1c', dot: '#ef4444' },
}

/* ------------------------------------------------------------------ */
/*  SECTIONS LAYOUT                                                    */
/* ------------------------------------------------------------------ */
const sections: { key: Section; label: string; width: number; height: number; color: string }[] = [
  { key: 'Salle',    label: 'Salle principale', width: 520, height: 300, color: '#f8fafc' },
  { key: 'Bar',      label: 'Bar',              width: 420, height: 160, color: '#f1f5f9' },
  { key: 'Terrasse', label: 'Terrasse',         width: 520, height: 160, color: '#f0fdf4' },
]

/* ------------------------------------------------------------------ */
/*  FORMAT HELPERS                                                     */
/* ------------------------------------------------------------------ */
function fmtEuro(v: number) {
  return v.toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) + '\u00a0\u20ac'
}
function fmtElapsed(ts: number) {
  const mins = Math.floor((Date.now() - ts) / 60000)
  if (mins < 60) return `${mins} min`
  const h = Math.floor(mins / 60)
  const m = mins % 60
  return `${h}h${m.toString().padStart(2, '0')}`
}

/* ================================================================== */
/*  MAIN COMPONENT                                                     */
/* ================================================================== */
export default function FloorPlan() {
  const [tables, setTables] = useState<MockTable[]>(mockTables)
  const [selected, setSelected] = useState<MockTable | null>(null)
  const [fullscreen, setFullscreen] = useState(false)

  const stats = useMemo(() => {
    const occ = tables.filter((t) => t.status === 'OCCUPEE').length
    const libre = tables.filter((t) => t.status === 'LIBRE').length
    const rev = tables.filter((t) => t.status === 'RESERVEE').length
    const nett = tables.filter((t) => t.status === 'NETTOYAGE').length
    const ca = tables.reduce((s, t) => s + (t.orderTotal ?? 0), 0)
    return { occ, libre, rev, nett, total: tables.length, ca }
  }, [tables])

  const handleClean = (id: string) => {
    setTables((prev) => prev.map((t) => (t.id === id ? { ...t, status: 'LIBRE', orderTotal: undefined, orderItems: undefined, openedAt: undefined } : t)))
    setSelected(null)
  }
  const handleClose = (id: string) => {
    setTables((prev) => prev.map((t) => (t.id === id ? { ...t, status: 'NETTOYAGE', orderTotal: undefined, orderItems: undefined, openedAt: undefined } : t)))
    setSelected(null)
  }

  /* ---- shared card style ---- */
  const card: React.CSSProperties = {
    background: '#ffffff',
    borderRadius: 12,
    border: '1px solid #e2e8f0',
    padding: 20,
    boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
  }

  return (
    <div style={{ padding: 24, maxWidth: 1400, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* =============== TOP BAR =============== */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: '#0f172a', margin: 0 }}>Plan de salle</h1>
          <p style={{ fontSize: 13, color: '#64748b', margin: '4px 0 0' }}>
            Vue temps réel — {stats.total} tables sur 3 sections
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexWrap: 'wrap' }}>
          <StatPill color="#f59e0b" label={`${stats.occ} occupées`} />
          <StatPill color="#10b981" label={`${stats.libre} libres`} />
          <StatPill color="#3b82f6" label={`${stats.rev} réservées`} />
          <StatPill color="#ef4444" label={`${stats.nett} à nettoyer`} />
          <div style={{ width: 1, height: 24, background: '#e2e8f0' }} />
          <button
            onClick={() => setFullscreen(!fullscreen)}
            style={btnGhost}
          >
            <Maximize2 size={14} /> Mode plein écran
          </button>
          <a
            href="/pos-standalone/floor/editor"
            style={{ ...btnGhost, textDecoration: 'none' }}
            onClick={(e) => e.preventDefault()}
          >
            <Edit3 size={14} /> Éditeur de plan (POS)
          </a>
        </div>
      </div>

      {/* =============== CA BANNER =============== */}
      <motion.div
        initial={{ opacity: 0, y: -8 }}
        animate={{ opacity: 1, y: 0 }}
        style={{
          ...card,
          padding: 16,
          background: 'linear-gradient(135deg, #1E3A5F 0%, #2c5282 100%)',
          border: 'none',
          color: '#fff',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 40, height: 40, borderRadius: 10, background: 'rgba(255,255,255,0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CreditCard size={20} />
          </div>
          <div>
            <div style={{ fontSize: 12, opacity: 0.8 }}>Chiffre d'affaires en cours (tables ouvertes)</div>
            <div style={{ fontSize: 22, fontWeight: 800, fontFamily: 'ui-monospace, monospace' }}>{fmtEuro(stats.ca)}</div>
          </div>
        </div>
        <div style={{ display: 'flex', gap: 24, fontSize: 13 }}>
          <div style={{ textAlign: 'right' }}>
            <div style={{ opacity: 0.7 }}>Taux d'occupation</div>
            <div style={{ fontSize: 18, fontWeight: 700 }}>
              {Math.round((stats.occ / stats.total) * 100)}\u00a0%
            </div>
          </div>
        </div>
      </motion.div>

      {/* =============== FLOOR PLAN SVG =============== */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={card}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          {sections.map((sec) => {
            const secTables = tables.filter((t) => t.section === sec.key)
            return (
              <div key={sec.key}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                  <DoorOpen size={16} color="#64748b" />
                  <span style={{ fontSize: 14, fontWeight: 700, color: '#1e293b' }}>{sec.label}</span>
                  <span style={{ fontSize: 12, color: '#94a3b8' }}>({secTables.length} tables)</span>
                </div>

                <div style={{
                  position: 'relative',
                  background: sec.color,
                  border: '2px dashed #e2e8f0',
                  borderRadius: 14,
                  height: sec.height,
                  overflow: 'hidden',
                }}>
                  <svg
                    viewBox={`0 0 ${sec.width} ${sec.height}`}
                    width="100%"
                    height={sec.height}
                    preserveAspectRatio="xMidYMid meet"
                    style={{ display: 'block' }}
                  >
                    {/* decorative grid */}
                    <defs>
                      <pattern id={`grid-${sec.key}`} width="20" height="20" patternUnits="userSpaceOnUse">
                        <path d="M 20 0 L 0 0 0 20" fill="none" stroke="#e2e8f0" strokeWidth="0.5" />
                      </pattern>
                    </defs>
                    <rect width={sec.width} height={sec.height} fill={`url(#grid-${sec.key})`} />

                    {/* tables */}
                    {secTables.map((t) => {
                      const s = statusConfig[t.status]
                      const w = t.shape === 'rect' ? 90 : 64
                      const h = t.shape === 'rect' ? 54 : 64
                      const r = t.shape === 'round' ? 32 : 8
                      const isSelected = selected?.id === t.id
                      return (
                        <g
                          key={t.id}
                          transform={`translate(${t.x}, ${t.y})`}
                          style={{ cursor: 'pointer' }}
                          onClick={() => setSelected(t)}
                        >
                          {t.shape === 'round' ? (
                            <circle
                              cx={w / 2} cy={h / 2} r={r}
                              fill={s.bg}
                              stroke={isSelected ? '#0f172a' : s.border}
                              strokeWidth={isSelected ? 3 : 2}
                            />
                          ) : (
                            <rect
                              width={w} height={h} rx={r} ry={r}
                              fill={s.bg}
                              stroke={isSelected ? '#0f172a' : s.border}
                              strokeWidth={isSelected ? 3 : 2}
                            />
                          )}
                          <text x={w / 2} y={h / 2 - 4} textAnchor="middle" fontSize="14" fontWeight="700" fill={s.text}>
                            {t.name}
                          </text>
                          <text x={w / 2} y={h / 2 + 12} textAnchor="middle" fontSize="10" fill={s.text} opacity="0.75">
                            {t.seats}\u00a0pl.
                          </text>
                          {t.status === 'OCCUPEE' && (
                            <circle cx={w - 8} cy={8} r={5} fill="#f59e0b">
                              <animate attributeName="opacity" values="1;0.4;1" dur="1.8s" repeatCount="indefinite" />
                            </circle>
                          )}
                          {t.status === 'RESERVEE' && (
                            <circle cx={w - 8} cy={8} r={5} fill="#3b82f6" />
                          )}
                        </g>
                      )
                    })}
                  </svg>
                </div>
              </div>
            )
          })}
        </div>

        {/* LEGEND */}
        <div style={{
          marginTop: 20, paddingTop: 16, borderTop: '1px solid #e2e8f0',
          display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'center', justifyContent: 'center',
        }}>
          {(Object.keys(statusConfig) as TableStatus[]).map((k) => (
            <div key={k} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{
                width: 18, height: 18, borderRadius: 4,
                background: statusConfig[k].bg,
                border: `2px solid ${statusConfig[k].border}`,
              }} />
              <span style={{ fontSize: 13, color: '#475569', fontWeight: 500 }}>{statusConfig[k].label}</span>
            </div>
          ))}
        </div>
      </motion.div>

      {/* =============== MODAL =============== */}
      <AnimatePresence>
        {selected && (
          <>
            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
              onClick={() => setSelected(null)}
              style={{ position: 'fixed', inset: 0, background: 'rgba(15,23,42,0.45)', zIndex: 40 }}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              transition={{ type: 'spring', damping: 22, stiffness: 260 }}
              style={{
                position: 'fixed', top: '50%', left: '50%', transform: 'translate(-50%,-50%)',
                width: 440, maxWidth: 'calc(100% - 32px)', maxHeight: '85vh',
                background: '#fff', borderRadius: 16, zIndex: 50,
                boxShadow: '0 24px 48px rgba(15,23,42,0.25)',
                display: 'flex', flexDirection: 'column', overflow: 'hidden',
              }}
            >
              {/* modal header */}
              <div style={{
                padding: '18px 22px', borderBottom: '1px solid #e2e8f0',
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <h2 style={{ fontSize: 20, fontWeight: 800, color: '#0f172a', margin: 0 }}>Table {selected.name}</h2>
                    <span style={{
                      fontSize: 11, fontWeight: 700, padding: '3px 8px', borderRadius: 6,
                      background: statusConfig[selected.status].bg,
                      color: statusConfig[selected.status].text,
                      border: `1px solid ${statusConfig[selected.status].border}`,
                    }}>
                      <Circle size={8} fill={statusConfig[selected.status].dot} style={{ display: 'inline-block', marginRight: 4, verticalAlign: 'middle' }} />
                      {statusConfig[selected.status].label}
                    </span>
                  </div>
                  <p style={{ fontSize: 13, color: '#64748b', margin: '4px 0 0' }}>
                    {selected.seats} places \u00b7 {selected.section}
                  </p>
                </div>
                <button
                  onClick={() => setSelected(null)}
                  style={{ background: '#f1f5f9', border: 'none', width: 32, height: 32, borderRadius: 8, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                >
                  <X size={16} color="#64748b" />
                </button>
              </div>

              {/* modal body */}
              <div style={{ padding: 22, overflowY: 'auto', flex: 1 }}>
                {selected.status === 'OCCUPEE' && (
                  <>
                    <div style={{ display: 'flex', gap: 12, marginBottom: 16 }}>
                      <InfoChip icon={<Clock size={14} />} label="Durée" value={selected.openedAt ? fmtElapsed(selected.openedAt) : '—'} />
                      <InfoChip icon={<Users size={14} />} label="Serveur" value={selected.server ?? '—'} />
                    </div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: 8 }}>
                      Commande en cours
                    </div>
                    <div style={{ background: '#f8fafc', borderRadius: 10, padding: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
                      {selected.orderItems?.map((it, i) => (
                        <div key={i} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                          <span style={{ color: '#1e293b' }}>
                            <strong>{it.qty}\u00d7</strong> {it.name}
                          </span>
                          <span style={{ fontFamily: 'ui-monospace, monospace', color: '#475569' }}>
                            {fmtEuro(it.qty * it.price)}
                          </span>
                        </div>
                      ))}
                      <div style={{
                        marginTop: 6, paddingTop: 8, borderTop: '1px dashed #e2e8f0',
                        display: 'flex', justifyContent: 'space-between',
                      }}>
                        <span style={{ fontWeight: 700, color: '#0f172a' }}>Total TTC</span>
                        <span style={{ fontWeight: 800, color: '#0f172a', fontFamily: 'ui-monospace, monospace' }}>
                          {fmtEuro(selected.orderTotal ?? 0)}
                        </span>
                      </div>
                    </div>
                  </>
                )}

                {selected.status === 'RESERVEE' && (
                  <div style={{ background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 10, padding: 14 }}>
                    <div style={{ fontSize: 12, color: '#1e40af', fontWeight: 600, marginBottom: 4 }}>Réservation</div>
                    <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a' }}>{selected.reservedFor}</div>
                    <div style={{ fontSize: 13, color: '#64748b', marginTop: 4 }}>Arrivée prévue à {selected.reservedAt}</div>
                  </div>
                )}

                {selected.status === 'LIBRE' && (
                  <div style={{ textAlign: 'center', padding: '24px 0' }}>
                    <div style={{
                      width: 56, height: 56, borderRadius: '50%', background: '#ecfdf5',
                      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                      marginBottom: 12,
                    }}>
                      <Users size={24} color="#10b981" />
                    </div>
                    <p style={{ fontSize: 14, color: '#64748b', margin: 0 }}>Table libre et prête à accueillir.</p>
                  </div>
                )}

                {selected.status === 'NETTOYAGE' && (
                  <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: 14 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                      <Sparkles size={16} color="#dc2626" />
                      <div style={{ fontSize: 13, color: '#991b1b', fontWeight: 700 }}>En attente de nettoyage</div>
                    </div>
                    <div style={{ fontSize: 12, color: '#7f1d1d' }}>
                      Marquez la table comme nettoyée pour la rendre disponible.
                    </div>
                  </div>
                )}
              </div>

              {/* modal footer actions */}
              <div style={{
                padding: '14px 22px', borderTop: '1px solid #e2e8f0',
                background: '#f8fafc', display: 'flex', gap: 8, flexWrap: 'wrap',
              }}>
                {selected.status === 'OCCUPEE' && (
                  <>
                    <button style={btnPrimary}><Eye size={14} /> Voir commande</button>
                    <button style={btnAccent}><CreditCard size={14} /> Encaisser</button>
                    <button style={btnSecondary} onClick={() => handleClose(selected.id)}>
                      Fermer table
                    </button>
                  </>
                )}
                {selected.status === 'NETTOYAGE' && (
                  <button style={btnPrimary} onClick={() => handleClean(selected.id)}>
                    <Sparkles size={14} /> Marquer nettoyée
                  </button>
                )}
                {selected.status === 'LIBRE' && (
                  <button style={btnPrimary}><Eye size={14} /> Ouvrir commande</button>
                )}
                {selected.status === 'RESERVEE' && (
                  <>
                    <button style={btnPrimary}><Eye size={14} /> Ouvrir commande</button>
                    <button style={btnSecondary}>Annuler réservation</button>
                  </>
                )}
                <button style={{ ...btnGhost, marginLeft: 'auto' }} onClick={() => setSelected(null)}>
                  Fermer
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  SUB-COMPONENTS                                                     */
/* ------------------------------------------------------------------ */
function StatPill({ color, label }: { color: string; label: string }) {
  return (
    <div style={{
      display: 'inline-flex', alignItems: 'center', gap: 6,
      padding: '6px 10px', borderRadius: 999,
      background: '#fff', border: '1px solid #e2e8f0',
      fontSize: 12, fontWeight: 600, color: '#1e293b',
    }}>
      <span style={{ width: 8, height: 8, borderRadius: '50%', background: color }} />
      {label}
    </div>
  )
}

function InfoChip({ icon, label, value }: { icon: React.ReactNode; label: string; value: string }) {
  return (
    <div style={{
      flex: 1, background: '#f8fafc', border: '1px solid #e2e8f0',
      borderRadius: 10, padding: '10px 12px',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 11, color: '#64748b', marginBottom: 4 }}>
        {icon} <span style={{ fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</span>
      </div>
      <div style={{ fontSize: 15, fontWeight: 700, color: '#0f172a' }}>{value}</div>
    </div>
  )
}

/* ------------------------------------------------------------------ */
/*  SHARED BUTTON STYLES                                               */
/* ------------------------------------------------------------------ */
const btnBase: React.CSSProperties = {
  display: 'inline-flex', alignItems: 'center', gap: 6,
  padding: '8px 14px', borderRadius: 8, border: 'none',
  fontSize: 13, fontWeight: 600, cursor: 'pointer',
  transition: 'all 0.15s ease',
}
const btnPrimary: React.CSSProperties = { ...btnBase, background: '#1E3A5F', color: '#fff' }
const btnAccent: React.CSSProperties = { ...btnBase, background: '#10b981', color: '#fff' }
const btnSecondary: React.CSSProperties = { ...btnBase, background: '#fff', color: '#1e293b', border: '1px solid #e2e8f0' }
const btnGhost: React.CSSProperties = { ...btnBase, background: 'transparent', color: '#475569', border: '1px solid #e2e8f0' }
