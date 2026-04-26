import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useOverdueAlerts, formatAlertMessage } from '../lib/overdueAlerts'

/* ── types ── */
type Category = 'Commandes' | 'Stock' | 'Planning' | 'Clients' | 'HACCP' | 'Factures/Devis'

interface Notification {
  id: number
  icon: string
  title: string
  description: string
  time: string
  category: Category
  unread: boolean
}

/* ── category colors ── */
const CATEGORY_COLORS: Record<Category, string> = {
  Commandes: '#6366f1',
  Stock: '#f59e0b',
  Planning: '#8b5cf6',
  Clients: '#10b981',
  HACCP: '#ef4444',
  'Factures/Devis': '#dc2626',
}

/* ── 15 mock notifications ── */
const INITIAL_NOTIFICATIONS: Notification[] = [
  { id: 1, icon: '\u{1F37D}', title: 'Nouvelle commande Table 3', description: '4 articles, 34.50 €', time: 'Il y a 2 min', category: 'Commandes', unread: true },
  { id: 2, icon: '✅', title: 'Commande prête — Table 1', description: 'Plats prêts à servir', time: 'Il y a 8 min', category: 'Commandes', unread: false },
  { id: 3, icon: '\u{1F4CB}', title: 'Commande guest portail', description: 'Commande #043 QR menu', time: 'Il y a 15 min', category: 'Commandes', unread: true },
  { id: 4, icon: '\u{1F4B3}', title: 'Paiement reçu — Table 5', description: '48.00 € carte', time: 'Il y a 32 min', category: 'Commandes', unread: false },
  { id: 5, icon: '⚠️', title: 'Commande en attente > 20min', description: 'Table 7, 23 min', time: 'Il y a 5 min', category: 'Commandes', unread: true },
  { id: 6, icon: '\u{1F534}', title: 'Rupture de stock: Farine', description: 'Stock à 0', time: 'Il y a 1h', category: 'Stock', unread: true },
  { id: 7, icon: '\u{1F7E1}', title: 'Stock bas: Café en grains', description: '2.5 kg restants', time: 'Il y a 2h', category: 'Stock', unread: false },
  { id: 8, icon: '\u{1F4E6}', title: 'Commande fournisseur reçue', description: 'Metro, 12 articles', time: 'Hier', category: 'Stock', unread: false },
  { id: 9, icon: '\u{1F4C5}', title: 'Réservation 19:30', description: 'Famille Braun, 6 pers', time: 'Il y a 30 min', category: 'Planning', unread: true },
  { id: 10, icon: '\u{1F504}', title: 'Changement de shift', description: 'Marie ↔ Lucas', time: 'Il y a 3h', category: 'Planning', unread: false },
  { id: 11, icon: '\u{1F382}', title: 'Anniversaire client', description: 'Marie Weber, 35 ans', time: 'Il y a 4h', category: 'Clients', unread: false },
  { id: 12, icon: '⭐', title: 'Nouvel avis Google', description: '5★ Excellent service!', time: 'Il y a 5h', category: 'Clients', unread: true },
  { id: 13, icon: '\u{1F464}', title: 'Nouveau client inscrit', description: 'Pierre Reuter, QR', time: 'Hier', category: 'Clients', unread: false },
  { id: 14, icon: '\u{1F321}️', title: 'Alerte température', description: 'Frigo 2: 9.2°C (max 8°C)', time: 'Il y a 45 min', category: 'HACCP', unread: true },
  { id: 15, icon: '✅', title: 'HACCP Midi validé', description: 'Tâches midi OK', time: 'Il y a 2h', category: 'HACCP', unread: false },
]

/* ── filter tab type ── */
type FilterTab = 'Tout' | Category

const FILTER_TABS: FilterTab[] = ['Tout', 'Commandes', 'Stock', 'Planning', 'Clients', 'HACCP', 'Factures/Devis']

/* ── component ── */
export default function NotificationCenter({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const overdue = useOverdueAlerts()

  const overdueNotifications = useMemo<Notification[]>(() => {
    return overdue.all.map((a, i) => ({
      id: 1000 + i,
      icon: a.type === 'invoice' ? '\u{1F4B0}' : '\u{1F4DD}',
      title: a.type === 'invoice' ? `Facture ${a.number} impayée` : `Devis ${a.number} sans réponse`,
      description: formatAlertMessage(a),
      time: `${a.daysOverdue}j`,
      category: 'Factures/Devis' as Category,
      unread: a.severity === 'danger',
    }))
  }, [overdue.all])

  const [notifications, setNotifications] = useState<Notification[]>([
    ...INITIAL_NOTIFICATIONS,
    ...overdueNotifications,
  ])
  const [activeTab, setActiveTab] = useState<FilterTab>('Tout')
  const [hoveredId, setHoveredId] = useState<number | null>(null)
  const [hoveredTab, setHoveredTab] = useState<FilterTab | null>(null)

  /* counts */
  const unreadCount = useMemo(() => notifications.filter((n) => n.unread).length, [notifications])

  const tabCounts = useMemo(() => {
    const counts: Record<FilterTab, number> = { Tout: notifications.length, Commandes: 0, Stock: 0, Planning: 0, Clients: 0, HACCP: 0, 'Factures/Devis': 0 }
    notifications.forEach((n) => { counts[n.category]++ })
    return counts
  }, [notifications])

  /* filtered list */
  const filtered = useMemo(
    () => (activeTab === 'Tout' ? notifications : notifications.filter((n) => n.category === activeTab)),
    [notifications, activeTab],
  )

  /* mark single as read */
  const markRead = (id: number) => {
    setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, unread: false } : n)))
  }

  /* mark all as read */
  const markAllRead = () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, unread: false })))
  }

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* ── backdrop ── */}
          <motion.div
            key="notif-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.25 }}
            onClick={onClose}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 200,
              background: 'rgba(0,0,0,0.35)',
              backdropFilter: 'blur(4px)',
              WebkitBackdropFilter: 'blur(4px)',
            }}
          />

          {/* ── panel ── */}
          <motion.div
            key="notif-panel"
            initial={{ x: 400 }}
            animate={{ x: 0 }}
            exit={{ x: 400 }}
            transition={{ type: 'spring', damping: 28, stiffness: 300 }}
            style={{
              position: 'fixed',
              top: 0,
              right: 0,
              bottom: 0,
              width: 400,
              zIndex: 201,
              background: '#ffffff',
              boxShadow: '-8px 0 40px rgba(0,0,0,0.12)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden',
            }}
          >
            {/* ── header ── */}
            <div
              style={{
                padding: '20px 20px 16px',
                borderBottom: '1px solid #f0f0f0',
                flexShrink: 0,
              }}
            >
              {/* top row */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 18, fontWeight: 700, color: '#111827' }}>Notifications</span>
                  {unreadCount > 0 && (
                    <span
                      style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        minWidth: 22,
                        height: 22,
                        borderRadius: 11,
                        background: '#6366f1',
                        color: '#fff',
                        fontSize: 11,
                        fontWeight: 700,
                        padding: '0 6px',
                      }}
                    >
                      {unreadCount}
                    </span>
                  )}
                </div>
                <button
                  onClick={onClose}
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: 8,
                    border: '1px solid #e5e7eb',
                    background: '#fafafa',
                    color: '#6b7280',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 16,
                    fontWeight: 500,
                    transition: 'all 0.15s',
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.background = '#f3f4f6'
                    e.currentTarget.style.color = '#111827'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.background = '#fafafa'
                    e.currentTarget.style.color = '#6b7280'
                  }}
                >
                  {'✕'}
                </button>
              </div>

              {/* mark all read */}
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  style={{
                    marginTop: 10,
                    background: 'none',
                    border: 'none',
                    color: '#6366f1',
                    fontSize: 13,
                    fontWeight: 500,
                    cursor: 'pointer',
                    padding: 0,
                    transition: 'opacity 0.15s',
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.opacity = '0.7' }}
                  onMouseLeave={(e) => { e.currentTarget.style.opacity = '1' }}
                >
                  Tout marquer comme lu
                </button>
              )}
            </div>

            {/* ── filter tabs ── */}
            <div
              style={{
                display: 'flex',
                gap: 4,
                padding: '12px 20px',
                borderBottom: '1px solid #f0f0f0',
                overflowX: 'auto',
                flexShrink: 0,
              }}
            >
              {FILTER_TABS.map((tab) => {
                const isActive = activeTab === tab
                const isHovered = hoveredTab === tab
                return (
                  <button
                    key={tab}
                    onClick={() => setActiveTab(tab)}
                    onMouseEnter={() => setHoveredTab(tab)}
                    onMouseLeave={() => setHoveredTab(null)}
                    style={{
                      padding: '6px 12px',
                      borderRadius: 8,
                      border: 'none',
                      fontSize: 12,
                      fontWeight: 600,
                      cursor: 'pointer',
                      whiteSpace: 'nowrap',
                      transition: 'all 0.15s',
                      background: isActive ? '#6366f1' : isHovered ? '#f3f4f6' : '#f9fafb',
                      color: isActive ? '#fff' : '#4b5563',
                    }}
                  >
                    {tab} ({tabCounts[tab]})
                  </button>
                )
              })}
            </div>

            {/* ── overdue banner ── */}
            {(overdue.totals.invoicesCount > 0 || overdue.totals.quotesCount > 0) && (activeTab === 'Tout' || activeTab === 'Factures/Devis') && (
              <motion.div
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                style={{
                  margin: '10px 12px 4px',
                  padding: '10px 12px',
                  borderRadius: 10,
                  background: 'linear-gradient(135deg, #fef2f2 0%, #fff7ed 100%)',
                  border: '1px solid #fecaca',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 10,
                  fontSize: 12.5,
                  color: '#991b1b',
                  fontWeight: 600,
                }}
              >
                <span style={{ fontSize: 18 }}>{'⚠️'}</span>
                <span>
                  {overdue.totals.invoicesCount} factures impayées {'·'} {overdue.totals.quotesCount} devis en attente
                </span>
              </motion.div>
            )}

            {/* ── notification list ── */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '8px 12px' }}>
              <AnimatePresence mode="popLayout">
                {filtered.map((notif, index) => {
                  const borderColor = CATEGORY_COLORS[notif.category]
                  const isHovered = hoveredId === notif.id
                  return (
                    <motion.div
                      key={notif.id}
                      layout
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, x: -20 }}
                      transition={{ delay: index * 0.03, duration: 0.25 }}
                      onClick={() => markRead(notif.id)}
                      onMouseEnter={() => setHoveredId(notif.id)}
                      onMouseLeave={() => setHoveredId(null)}
                      style={{
                        display: 'flex',
                        alignItems: 'flex-start',
                        gap: 12,
                        padding: '14px 14px 14px 16px',
                        marginBottom: 4,
                        borderRadius: 12,
                        borderLeft: `3px solid ${borderColor}`,
                        background: notif.unread
                          ? isHovered ? '#eef2ff' : '#f5f7ff'
                          : isHovered ? '#f9fafb' : '#ffffff',
                        cursor: 'pointer',
                        transition: 'background 0.15s',
                        position: 'relative',
                      }}
                    >
                      {/* icon */}
                      <span
                        style={{
                          fontSize: 22,
                          lineHeight: 1,
                          flexShrink: 0,
                          marginTop: 1,
                        }}
                      >
                        {notif.icon}
                      </span>

                      {/* content */}
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div
                          style={{
                            fontSize: 13,
                            fontWeight: notif.unread ? 700 : 500,
                            color: '#111827',
                            lineHeight: 1.3,
                            marginBottom: 3,
                          }}
                        >
                          {notif.title}
                        </div>
                        <div
                          style={{
                            fontSize: 12,
                            color: '#6b7280',
                            lineHeight: 1.3,
                          }}
                        >
                          {notif.description}
                        </div>
                        <div
                          style={{
                            fontSize: 11,
                            color: '#9ca3af',
                            marginTop: 4,
                          }}
                        >
                          {notif.time}
                        </div>
                      </div>

                      {/* unread dot */}
                      {notif.unread && (
                        <span
                          style={{
                            position: 'absolute',
                            top: 16,
                            right: 14,
                            width: 8,
                            height: 8,
                            borderRadius: '50%',
                            background: '#3b82f6',
                            flexShrink: 0,
                          }}
                        />
                      )}
                    </motion.div>
                  )
                })}
              </AnimatePresence>

              {filtered.length === 0 && (
                <div
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '48px 20px',
                    color: '#9ca3af',
                  }}
                >
                  <span style={{ fontSize: 36, marginBottom: 12 }}>{'\u{1F514}'}</span>
                  <span style={{ fontSize: 14, fontWeight: 500 }}>Aucune notification</span>
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
