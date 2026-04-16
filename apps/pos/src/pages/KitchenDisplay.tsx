import { useState, useEffect, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

/* ── Types ─────────────────────────────────────────────────────────────────── */

type KDSStatus = 'waiting' | 'preparing' | 'ready'

interface KDSItem {
  id: string
  name: string
  qty: number
  note?: string
  course?: string
}

interface KDSOrder {
  id: string
  orderNum: number
  tableName: string
  items: KDSItem[]
  status: KDSStatus
  createdAt: number
  movedAt?: number
  flash?: boolean
}

/* ── Mock data ─────────────────────────────────────────────────────────────── */

function generateMockOrders(): KDSOrder[] {
  const now = Date.now()
  return [
    {
      id: 'kds-1',
      orderNum: 1041,
      tableName: 'Table 3',
      status: 'waiting',
      createdAt: now - 2 * 60 * 1000,
      items: [
        { id: 'i1', name: 'Croque-Monsieur', qty: 2, course: 'PLAT' },
        { id: 'i2', name: 'Salade César', qty: 1, note: 'sans croûtons', course: 'PLAT' },
      ],
    },
    {
      id: 'kds-2',
      orderNum: 1038,
      tableName: 'Table 7',
      status: 'waiting',
      createdAt: now - 5 * 60 * 1000,
      items: [
        { id: 'i3', name: 'Soupe à l\'oignon', qty: 1, course: 'APÉRITIF' },
        { id: 'i4', name: 'Steak frites', qty: 2, note: 'saignant', course: 'PLAT' },
        { id: 'i5', name: 'Burger maison', qty: 1, course: 'PLAT' },
        { id: 'i6', name: 'Tarte Tatin', qty: 1, course: 'DESSERT' },
      ],
    },
    {
      id: 'kds-3',
      orderNum: 1035,
      tableName: 'Table 1',
      status: 'preparing',
      createdAt: now - 8 * 60 * 1000,
      items: [
        { id: 'i7', name: 'Quiche Lorraine', qty: 2, course: 'PLAT' },
        { id: 'i8', name: 'Frites maison', qty: 1, note: 'extra sel', course: 'PLAT' },
        { id: 'i9', name: 'Crème brûlée', qty: 2, course: 'DESSERT' },
      ],
    },
    {
      id: 'kds-4',
      orderNum: 1029,
      tableName: 'Table 5',
      status: 'preparing',
      createdAt: now - 12 * 60 * 1000,
      items: [
        { id: 'i10', name: 'Plat du jour', qty: 1, note: 'ALLERGIE GLUTEN', course: 'PLAT' },
      ],
    },
    {
      id: 'kds-5',
      orderNum: 1043,
      tableName: 'Kiosk #043',
      status: 'waiting',
      createdAt: now - 1 * 60 * 1000,
      items: [
        { id: 'i11', name: 'Wrap poulet', qty: 1, course: 'PLAT' },
        { id: 'i12', name: 'Limonade maison', qty: 2 },
      ],
    },
    {
      id: 'kds-6',
      orderNum: 1044,
      tableName: 'Table 2',
      status: 'ready',
      createdAt: now - 14 * 60 * 1000,
      movedAt: now,
      items: [
        { id: 'i13', name: 'Tartare de saumon', qty: 1, course: 'APÉRITIF' },
        { id: 'i14', name: 'Risotto champignons', qty: 2, course: 'PLAT' },
        { id: 'i15', name: 'Fondant chocolat', qty: 1, course: 'DESSERT' },
      ],
    },
  ]
}

/* ── Helpers ────────────────────────────────────────────────────────────────── */

function getMinutesAgo(ts: number): number {
  return Math.floor((Date.now() - ts) / 60000)
}

function formatTimer(ts: number): string {
  const sec = Math.floor((Date.now() - ts) / 1000)
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

function timerColor(minutes: number): string {
  if (minutes < 5) return '#22c55e'
  if (minutes < 10) return '#eab308'
  if (minutes < 15) return '#f97316'
  return '#ef4444'
}

function timerBarWidth(minutes: number): number {
  return Math.min(100, (minutes / 20) * 100)
}

/* ── Audio beep ────────────────────────────────────────────────────────────── */

function playBeep() {
  try {
    const ctx = new AudioContext()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.frequency.value = 880
    osc.type = 'square'
    gain.gain.value = 0.15
    osc.start()
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.3)
    osc.stop(ctx.currentTime + 0.3)
  } catch { /* audio not available */ }
}

/* ── Component ─────────────────────────────────────────────────────────────── */

export default function KitchenDisplay({ onExit }: { onExit: () => void }) {
  const [orders, setOrders] = useState<KDSOrder[]>(generateMockOrders)
  const [clock, setClock] = useState(new Date())
  const [soundOn, setSoundOn] = useState(true)
  const [, forceUpdate] = useState(0)
  const flashTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  // Clock + timer tick every second
  useEffect(() => {
    const iv = setInterval(() => {
      setClock(new Date())
      forceUpdate(n => n + 1)
    }, 1000)
    return () => clearInterval(iv)
  }, [])

  // Auto-clear "ready" orders after 2 min
  useEffect(() => {
    const iv = setInterval(() => {
      setOrders(prev =>
        prev.filter(o => {
          if (o.status === 'ready' && o.movedAt && Date.now() - o.movedAt > 120_000) return false
          return true
        })
      )
    }, 5000)
    return () => clearInterval(iv)
  }, [])

  const moveToStatus = useCallback((id: string, newStatus: KDSStatus) => {
    setOrders(prev => prev.map(o => {
      if (o.id !== id) return o
      return {
        ...o,
        status: newStatus,
        movedAt: newStatus === 'ready' ? Date.now() : o.movedAt,
        flash: false,
      }
    }))
    if (newStatus === 'ready' && soundOn) playBeep()
  }, [soundOn])

  const flashOrder = useCallback((id: string) => {
    // Clear existing timer
    const existing = flashTimers.current.get(id)
    if (existing) clearTimeout(existing)

    setOrders(prev => prev.map(o => o.id === id ? { ...o, flash: true } : o))
    const timer = setTimeout(() => {
      setOrders(prev => prev.map(o => o.id === id ? { ...o, flash: false } : o))
      flashTimers.current.delete(id)
    }, 3000)
    flashTimers.current.set(id, timer)
    if (soundOn) playBeep()
  }, [soundOn])

  // Categorize orders
  const waiting = orders.filter(o => o.status === 'waiting').sort((a, b) => a.createdAt - b.createdAt)
  const preparing = orders.filter(o => o.status === 'preparing').sort((a, b) => a.createdAt - b.createdAt)
  const ready = orders.filter(o => o.status === 'ready').sort((a, b) => (b.movedAt || 0) - (a.movedAt || 0))

  const clockStr = clock.toLocaleTimeString('fr-LU', { hour: '2-digit', minute: '2-digit', second: '2-digit' })

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: '#07070d',
      color: '#e2e8f0',
      fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      display: 'flex',
      flexDirection: 'column',
      overflow: 'hidden',
      userSelect: 'none',
    }}>
      {/* ── TOP BAR ── */}
      <div style={{
        height: 60, flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 24px',
        background: 'rgba(10,10,22,0.95)',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
      }}>
        {/* Left: title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: 26, lineHeight: 1 }}>
            👨‍🍳
          </span>
          <span style={{
            fontSize: 20, fontWeight: 800, letterSpacing: '-0.02em',
            color: '#f8fafc',
          }}>
            CUISINE
          </span>
          <span style={{
            fontSize: 14, color: 'rgba(255,255,255,0.35)', fontWeight: 500,
            marginLeft: 4,
          }}>
            Caf\u00e9 um Rond-Point
          </span>
        </div>

        {/* Center: clock */}
        <div style={{
          fontSize: 28, fontWeight: 700,
          fontVariantNumeric: 'tabular-nums',
          color: '#f8fafc',
          letterSpacing: '0.05em',
        }}>
          {clockStr}
        </div>

        {/* Right: stats + controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          {/* Stats */}
          <div style={{ display: 'flex', gap: 16, fontSize: 14, fontWeight: 600 }}>
            <span style={{ color: '#ef4444' }}>{waiting.length} en attente</span>
            <span style={{ color: '#6b7280' }}>{'\u00b7'}</span>
            <span style={{ color: '#f97316' }}>{preparing.length} en pr\u00e9paration</span>
            <span style={{ color: '#6b7280' }}>{'\u00b7'}</span>
            <span style={{ color: '#22c55e' }}>{ready.length} pr\u00eats</span>
          </div>

          {/* Sound toggle */}
          <button
            onClick={() => setSoundOn(s => !s)}
            style={{
              width: 44, height: 44,
              borderRadius: 10,
              border: '1px solid rgba(255,255,255,0.1)',
              background: soundOn ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.05)',
              color: soundOn ? '#a5b4fc' : '#64748b',
              fontSize: 20,
              cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'inherit',
            }}
          >
            {soundOn ? '\uD83D\uDD14' : '\uD83D\uDD07'}
          </button>

          {/* Quit */}
          <button
            onClick={onExit}
            style={{
              padding: '10px 20px',
              borderRadius: 10,
              border: '1px solid rgba(244,63,94,0.3)',
              background: 'rgba(244,63,94,0.1)',
              color: '#fb7185',
              fontSize: 15, fontWeight: 700,
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            Quitter
          </button>
        </div>
      </div>

      {/* ── MAIN 3-COLUMN LAYOUT ── */}
      <div style={{
        flex: 1,
        display: 'grid',
        gridTemplateColumns: '1fr 1fr 1fr',
        gap: 0,
        overflow: 'hidden',
      }}>
        {/* COLUMN: En attente */}
        <ColumnSection
          title="En attente"
          color="#ef4444"
          count={waiting.length}
          orders={waiting}
          onAction={moveToStatus}
          onFlash={flashOrder}
          columnType="waiting"
        />

        {/* COLUMN: En préparation */}
        <ColumnSection
          title="En pr\u00e9paration"
          color="#f97316"
          count={preparing.length}
          orders={preparing}
          onAction={moveToStatus}
          onFlash={flashOrder}
          columnType="preparing"
        />

        {/* COLUMN: Prêt */}
        <ColumnSection
          title="Pr\u00eat"
          color="#22c55e"
          count={ready.length}
          orders={ready}
          onAction={moveToStatus}
          onFlash={flashOrder}
          columnType="ready"
        />
      </div>
    </div>
  )
}

/* ── Column Section ────────────────────────────────────────────────────────── */

function ColumnSection({ title, color, count, orders, onAction, onFlash, columnType }: {
  title: string
  color: string
  count: number
  orders: KDSOrder[]
  onAction: (id: string, s: KDSStatus) => void
  onFlash: (id: string) => void
  columnType: 'waiting' | 'preparing' | 'ready'
}) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      borderRight: '1px solid rgba(255,255,255,0.06)',
      overflow: 'hidden',
    }}>
      {/* Column header */}
      <div style={{
        height: 48, flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        gap: 10,
        background: `${color}18`,
        borderBottom: `2px solid ${color}`,
      }}>
        <span style={{
          fontSize: 16, fontWeight: 800, letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color,
        }}>
          {title}
        </span>
        <span style={{
          fontSize: 14, fontWeight: 700,
          background: color,
          color: '#07070d',
          borderRadius: 20,
          padding: '2px 10px',
          minWidth: 24,
          textAlign: 'center',
        }}>
          {count}
        </span>
      </div>

      {/* Cards scroll area */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        overflowX: 'hidden',
        padding: 12,
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
      }}>
        <AnimatePresence mode="popLayout">
          {orders.map(order => (
            <OrderCard
              key={order.id}
              order={order}
              onAction={onAction}
              onFlash={onFlash}
              columnType={columnType}
            />
          ))}
        </AnimatePresence>

        {orders.length === 0 && (
          <div style={{
            flex: 1,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'rgba(255,255,255,0.15)',
            fontSize: 16, fontWeight: 600,
          }}>
            {columnType === 'waiting' ? 'Aucune commande' :
             columnType === 'preparing' ? 'Rien en cours' :
             'Rien de pr\u00eat'}
          </div>
        )}
      </div>
    </div>
  )
}

/* ── Order Card ────────────────────────────────────────────────────────────── */

function OrderCard({ order, onAction, onFlash, columnType }: {
  order: KDSOrder
  onAction: (id: string, s: KDSStatus) => void
  onFlash: (id: string) => void
  columnType: 'waiting' | 'preparing' | 'ready'
}) {
  const minutes = getMinutesAgo(order.createdAt)
  const isUrgent = minutes >= 15
  const barColor = timerColor(minutes)
  const barW = timerBarWidth(minutes)

  // Group items by course
  const courses = new Map<string, KDSItem[]>()
  order.items.forEach(item => {
    const c = item.course || ''
    if (!courses.has(c)) courses.set(c, [])
    courses.get(c)!.push(item)
  })
  const hasCourses = courses.size > 1 || (courses.size === 1 && !courses.has(''))

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: -40, scale: 0.95 }}
      animate={{
        opacity: 1, y: 0, scale: 1,
        boxShadow: order.flash
          ? '0 0 30px rgba(99,102,241,0.6), inset 0 0 20px rgba(99,102,241,0.15)'
          : isUrgent
            ? '0 0 20px rgba(239,68,68,0.2)'
            : '0 2px 8px rgba(0,0,0,0.3)',
      }}
      exit={{ opacity: 0, scale: 0.9, y: 20, transition: { duration: 0.3 } }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      style={{
        background: order.flash
          ? 'rgba(99,102,241,0.12)'
          : 'rgba(255,255,255,0.04)',
        borderRadius: 14,
        border: order.flash
          ? '2px solid rgba(99,102,241,0.5)'
          : isUrgent
            ? '2px solid rgba(239,68,68,0.4)'
            : '1px solid rgba(255,255,255,0.08)',
        overflow: 'hidden',
        flexShrink: 0,
      }}
    >
      {/* Card header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 16px 8px',
      }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
          <span style={{
            fontSize: 24, fontWeight: 900, color: '#f8fafc',
            letterSpacing: '-0.02em',
          }}>
            {order.tableName}
          </span>
          <span style={{
            fontSize: 13, color: 'rgba(255,255,255,0.35)', fontWeight: 600,
          }}>
            #{order.orderNum}
          </span>
        </div>
        <div style={{
          fontSize: 18, fontWeight: 700,
          fontVariantNumeric: 'tabular-nums',
          color: barColor,
        }}>
          {formatTimer(order.createdAt)}
        </div>
      </div>

      {/* Timer bar */}
      <div style={{
        height: 5, background: 'rgba(255,255,255,0.06)',
        margin: '0 16px',
        borderRadius: 3,
        overflow: 'hidden',
      }}>
        <motion.div
          animate={isUrgent ? {
            opacity: [1, 0.5, 1],
            transition: { duration: 1, repeat: Infinity, ease: 'easeInOut' },
          } : { opacity: 1 }}
          style={{
            height: '100%',
            width: `${barW}%`,
            background: barColor,
            borderRadius: 3,
            transition: 'width 1s linear',
          }}
        />
      </div>

      {/* Items */}
      <div style={{ padding: '10px 16px 6px' }}>
        {hasCourses ? (
          // Render by course
          Array.from(courses.entries()).map(([course, items]) => (
            <div key={course} style={{ marginBottom: 8 }}>
              {course && (
                <div style={{
                  fontSize: 11, fontWeight: 800,
                  color: course === 'APÉRITIF' ? '#a78bfa' : course === 'DESSERT' ? '#f472b6' : '#818cf8',
                  letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                  marginBottom: 4,
                  paddingBottom: 3,
                  borderBottom: '1px solid rgba(255,255,255,0.06)',
                }}>
                  {course}
                </div>
              )}
              {items.map(item => (
                <ItemLine key={item.id} item={item} />
              ))}
            </div>
          ))
        ) : (
          order.items.map(item => (
            <ItemLine key={item.id} item={item} />
          ))
        )}
      </div>

      {/* Action buttons */}
      <div style={{
        display: 'flex', gap: 8,
        padding: '8px 16px 14px',
      }}>
        {columnType === 'waiting' && (
          <>
            <button
              onClick={() => onAction(order.id, 'preparing')}
              style={actionBtn('#f97316', false)}
            >
              En pr\u00e9paration
            </button>
            <button
              onClick={() => onAction(order.id, 'ready')}
              style={actionBtn('#22c55e', true)}
            >
              PR\u00caT !
            </button>
          </>
        )}

        {columnType === 'preparing' && (
          <>
            <button
              onClick={() => onFlash(order.id)}
              style={actionBtn('#6366f1', false)}
            >
              Rappel
            </button>
            <button
              onClick={() => onAction(order.id, 'ready')}
              style={actionBtn('#22c55e', true)}
            >
              PR\u00caT !
            </button>
          </>
        )}

        {columnType === 'ready' && (
          <button
            onClick={() => onFlash(order.id)}
            style={actionBtn('#6366f1', false)}
          >
            Rappel serveur
          </button>
        )}
      </div>
    </motion.div>
  )
}

/* ── Item Line ─────────────────────────────────────────────────────────────── */

function ItemLine({ item }: { item: KDSItem }) {
  return (
    <div style={{ marginBottom: 4 }}>
      <div style={{
        fontSize: 17, fontWeight: 700, color: '#e2e8f0',
        lineHeight: 1.4,
      }}>
        <span style={{
          color: '#818cf8', fontWeight: 800, marginRight: 6,
        }}>
          {item.qty}\u00d7
        </span>
        {item.name}
      </div>
      {item.note && (
        <div style={{
          fontSize: 13, fontWeight: 600,
          color: '#ef4444',
          fontStyle: 'italic',
          paddingLeft: 28,
          lineHeight: 1.3,
        }}>
          {item.note}
        </div>
      )}
    </div>
  )
}

/* ── Action button helper ──────────────────────────────────────────────────── */

function actionBtn(color: string, primary: boolean): React.CSSProperties {
  return {
    flex: primary ? 2 : 1,
    padding: primary ? '14px 8px' : '10px 8px',
    borderRadius: 10,
    border: `1px solid ${color}${primary ? '80' : '40'}`,
    background: primary ? `${color}25` : `${color}12`,
    color,
    fontSize: primary ? 17 : 14,
    fontWeight: primary ? 900 : 700,
    cursor: 'pointer',
    letterSpacing: primary ? '0.05em' : '0.02em',
    fontFamily: 'inherit',
    transition: 'all .15s',
    textAlign: 'center',
  }
}
