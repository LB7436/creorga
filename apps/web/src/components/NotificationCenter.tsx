import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useOverdueAlerts, formatAlertMessage } from '../lib/overdueAlerts'

/**
 * Centre de notifications.
 *
 * Il affichait 15 notifications écrites en dur : « Nouvelle commande Table 3 »,
 * « Rupture de stock : Farine », et surtout une alerte HACCP « Frigo 2 : 9,2 °C
 * (max 8 °C) » que personne n'avait jamais relevée. Sur un registre sanitaire,
 * une alerte inventée est plus grave qu'une absence d'alerte : elle fait croire
 * que la surveillance tourne.
 *
 * Ne restent que les notifications adossées à une donnée réelle — factures
 * impayées et devis sans réponse (cf. `lib/overdueAlerts.ts`). Quand il n'y a
 * rien, la cloche le dit.
 */

type Category = 'Factures/Devis'

interface Notification {
  id: string
  icon: string
  title: string
  description: string
  time: string
  category: Category
  unread: boolean
}

const CATEGORY_COLORS: Record<Category, string> = {
  'Factures/Devis': '#dc2626',
}

export default function NotificationCenter({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  const overdue = useOverdueAlerts()

  // Les alertes arrivent du serveur, donc après le premier rendu : elles ne
  // peuvent pas servir de valeur initiale à un useState, qui ne s'évalue qu'une
  // seule fois. C'était le défaut de la version précédente — un impayé chargé
  // ensuite n'apparaissait jamais. On ne mémorise donc que ce qui a été lu, et
  // la liste se dérive des données.
  const [lues, setLues] = useState<Set<string>>(() => new Set())
  const [hoveredId, setHoveredId] = useState<string | null>(null)

  const notifications = useMemo<Notification[]>(
    () => overdue.all.map((a) => ({
      id: a.id,
      icon: a.type === 'invoice' ? '\u{1F4B0}' : '\u{1F4DD}',
      title: a.type === 'invoice' ? `Facture ${a.number} impayée` : `Devis ${a.number} sans réponse`,
      description: formatAlertMessage(a),
      time: a.daysOverdue === 1 ? '1 jour de retard' : `${a.daysOverdue} jours de retard`,
      category: 'Factures/Devis',
      unread: !lues.has(a.id),
    })),
    [overdue.all, lues],
  )

  const unreadCount = useMemo(() => notifications.filter((n) => n.unread).length, [notifications])
  const filtered = notifications

  const markRead = (id: string) => setLues((prev) => new Set(prev).add(id))
  const markAllRead = () => setLues(new Set(notifications.map((n) => n.id)))

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

            {/* Les onglets de filtre (Commandes, Stock, Planning, Clients,
                HACCP) ne comptaient que des notifications inventées : ils sont
                retirés avec elles. Ils reviendront quand ces modules émettront
                de vraies notifications. */}

            {/* ── bandeau de synthèse des retards ── */}
            {(overdue.totals.invoicesCount > 0 || overdue.totals.quotesCount > 0) && (
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
                  {[
                    overdue.totals.invoicesCount > 0
                      && `${overdue.totals.invoicesCount} facture${overdue.totals.invoicesCount > 1 ? 's' : ''} impayée${overdue.totals.invoicesCount > 1 ? 's' : ''}`,
                    overdue.totals.quotesCount > 0
                      && `${overdue.totals.quotesCount} devis en attente`,
                  ].filter(Boolean).join(' · ')}
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
                  <span style={{ fontSize: 14, fontWeight: 500 }}>
                    {overdue.isLoading ? 'Chargement…' : 'Aucune notification'}
                  </span>
                  {!overdue.isLoading && (
                    <span style={{ fontSize: 12.5, marginTop: 6, textAlign: 'center', lineHeight: 1.5 }}>
                      Aucune facture impayée, aucun devis sans réponse.
                    </span>
                  )}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
