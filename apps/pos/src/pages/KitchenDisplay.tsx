import { useState, useEffect, useCallback, useRef, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'

/* ══════════════════════════════════════════════════════════════════════════════
   KITCHEN DISPLAY SYSTEM (KDS) — Creorga POS
   Dark theme, large text for distance reading, station filters, cook assignment,
   per-item progress, recall, course grouping, rush mode, bump bar, stats,
   settings, fullscreen, expo view, VIP/allergen markers.
   ══════════════════════════════════════════════════════════════════════════════ */

/* ── Types ─────────────────────────────────────────────────────────────────── */

type KDSStatus = 'waiting' | 'preparing' | 'ready'
type Station = 'all' | 'chaud' | 'froid' | 'boissons' | 'desserts' | 'patisserie'
type Course = 'APÉRITIF' | 'ENTRÉE' | 'PLAT' | 'DESSERT'
type ViewMode = 'kitchen' | 'expo'

interface KDSItem {
  id: string
  name: string
  qty: number
  note?: string
  course?: Course
  station?: Exclude<Station, 'all'>
  allergen?: boolean
  done?: boolean
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
  cookId?: string | null
  vip?: boolean
  server?: string
}

interface Cook {
  id: string
  name: string
  emoji: string
  color: string
  completed: number      // orders completed today
  activeSince: number    // shift start timestamp
}

interface Settings {
  soundOn: boolean
  autoBumpMin: number    // 0 = disabled
  rotationSec: number    // 0 = disabled
  showStats: boolean
  largeMode: boolean
}

/* ── Mock data ─────────────────────────────────────────────────────────────── */

const COOKS: Cook[] = [
  { id: 'c1', name: 'Jean',    emoji: '👨‍🍳', color: '#60a5fa', completed: 14, activeSince: Date.now() - 4 * 3600_000 },
  { id: 'c2', name: 'Sophie',  emoji: '👩‍🍳', color: '#f472b6', completed: 11, activeSince: Date.now() - 4 * 3600_000 },
  { id: 'c3', name: 'Marco',   emoji: '🧑‍🍳', color: '#fbbf24', completed: 9,  activeSince: Date.now() - 3 * 3600_000 },
  { id: 'c4', name: 'Luca',    emoji: '👨‍🍳', color: '#22d3ee', completed: 8,  activeSince: Date.now() - 3 * 3600_000 },
  { id: 'c5', name: 'Amélie',  emoji: '👩‍🍳', color: '#a78bfa', completed: 6,  activeSince: Date.now() - 2 * 3600_000 },
]

function generateMockOrders(): KDSOrder[] {
  const now = Date.now()
  return [
    {
      id: 'kds-1', orderNum: 1041, tableName: 'Table 3', status: 'waiting',
      createdAt: now - 2 * 60 * 1000, server: 'Léa', cookId: null,
      items: [
        { id: 'i1', name: 'Croque-Monsieur', qty: 2, course: 'PLAT', station: 'chaud' },
        { id: 'i2', name: 'Salade César', qty: 1, note: 'sans croûtons', course: 'PLAT', station: 'froid' },
      ],
    },
    {
      id: 'kds-2', orderNum: 1038, tableName: 'Table 7', status: 'waiting',
      createdAt: now - 5 * 60 * 1000, server: 'Tom', vip: true, cookId: null,
      items: [
        { id: 'i3', name: "Soupe à l'oignon", qty: 1, course: 'APÉRITIF', station: 'chaud' },
        { id: 'i4', name: 'Steak frites', qty: 2, note: 'saignant', course: 'PLAT', station: 'chaud' },
        { id: 'i5', name: 'Burger maison', qty: 1, course: 'PLAT', station: 'chaud' },
        { id: 'i6', name: 'Tarte Tatin', qty: 1, course: 'DESSERT', station: 'patisserie' },
      ],
    },
    {
      id: 'kds-3', orderNum: 1035, tableName: 'Table 1', status: 'preparing',
      createdAt: now - 8 * 60 * 1000, server: 'Léa', cookId: 'c1',
      items: [
        { id: 'i7', name: 'Quiche Lorraine', qty: 2, course: 'PLAT', station: 'chaud', done: true },
        { id: 'i8', name: 'Frites maison', qty: 1, note: 'extra sel', course: 'PLAT', station: 'chaud' },
        { id: 'i9', name: 'Crème brûlée', qty: 2, course: 'DESSERT', station: 'desserts' },
      ],
    },
    {
      id: 'kds-4', orderNum: 1029, tableName: 'Table 5', status: 'preparing',
      createdAt: now - 22 * 60 * 1000, server: 'Marc', cookId: 'c2',
      items: [
        { id: 'i10', name: 'Plat du jour', qty: 1, note: 'ALLERGIE GLUTEN', course: 'PLAT', station: 'chaud', allergen: true },
      ],
    },
    {
      id: 'kds-5', orderNum: 1043, tableName: 'Kiosk #043', status: 'waiting',
      createdAt: now - 1 * 60 * 1000, server: 'Auto', cookId: null,
      items: [
        { id: 'i11', name: 'Wrap poulet', qty: 1, course: 'PLAT', station: 'froid' },
        { id: 'i12', name: 'Limonade maison', qty: 2, station: 'boissons' },
      ],
    },
    {
      id: 'kds-6', orderNum: 1044, tableName: 'Table 2', status: 'ready',
      createdAt: now - 14 * 60 * 1000, movedAt: now - 30_000, server: 'Léa', cookId: 'c3',
      items: [
        { id: 'i13', name: 'Tartare de saumon', qty: 1, course: 'APÉRITIF', station: 'froid', done: true },
        { id: 'i14', name: 'Risotto champignons', qty: 2, course: 'PLAT', station: 'chaud', done: true },
        { id: 'i15', name: 'Fondant chocolat', qty: 1, course: 'DESSERT', station: 'patisserie', done: true },
      ],
    },
  ]
}

const STATION_META: Record<Exclude<Station, 'all'>, { label: string; emoji: string; color: string }> = {
  chaud:      { label: 'Chaud',      emoji: '🔥', color: '#ef4444' },
  froid:      { label: 'Froid',      emoji: '🥗', color: '#22d3ee' },
  boissons:   { label: 'Boissons',   emoji: '🥤', color: '#60a5fa' },
  desserts:   { label: 'Desserts',   emoji: '🍰', color: '#f472b6' },
  patisserie: { label: 'Pâtisserie', emoji: '🥐', color: '#fbbf24' },
}

const COURSE_META: Record<Course, { label: string; color: string }> = {
  'APÉRITIF': { label: 'Apéritif', color: '#a78bfa' },
  'ENTRÉE':   { label: 'Entrée',   color: '#22d3ee' },
  'PLAT':     { label: 'Plat',     color: '#818cf8' },
  'DESSERT':  { label: 'Dessert',  color: '#f472b6' },
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

function playBeep(freq = 880, duration = 0.3) {
  try {
    const ctx = new AudioContext()
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.frequency.value = freq
    osc.type = 'square'
    gain.gain.value = 0.15
    osc.start()
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration)
    osc.stop(ctx.currentTime + duration)
  } catch { /* audio not available */ }
}

function playRecall() {
  playBeep(660, 0.15)
  setTimeout(() => playBeep(990, 0.2), 180)
}

/* ══════════════════════════════════════════════════════════════════════════════
   COMPONENT
   ══════════════════════════════════════════════════════════════════════════════ */

export default function KitchenDisplay({ onExit }: { onExit: () => void }) {
  const [orders, setOrders] = useState<KDSOrder[]>(generateMockOrders)
  const [clock, setClock] = useState(new Date())
  const [, forceTick] = useState(0)
  const flashTimers = useRef<Map<string, ReturnType<typeof setTimeout>>>(new Map())

  // Filters / views
  const [station, setStation] = useState<Station>('all')
  const [viewMode, setViewMode] = useState<ViewMode>('kitchen')
  const [fullscreen, setFullscreen] = useState(false)
  const [showSettings, setShowSettings] = useState(false)
  const [showCooksPanel, setShowCooksPanel] = useState(true)

  // Settings
  const [settings, setSettings] = useState<Settings>({
    soundOn: true,
    autoBumpMin: 0,
    rotationSec: 0,
    showStats: true,
    largeMode: true,
  })

  // Stats
  const [completedToday, setCompletedToday] = useState(27)
  const [avgPrepTime, setAvgPrepTime] = useState(8.4) // minutes

  // Drag/drop cook assignment
  const [draggingOrder, setDraggingOrder] = useState<string | null>(null)
  const [hoverCook, setHoverCook] = useState<string | null>(null)

  /* ── Clock + ticks ───────────────────────────────────────────────────────── */
  useEffect(() => {
    const iv = setInterval(() => {
      setClock(new Date())
      forceTick(n => n + 1)
    }, 1000)
    return () => clearInterval(iv)
  }, [])

  /* ── Auto-clear ready after 2 min ────────────────────────────────────────── */
  useEffect(() => {
    const iv = setInterval(() => {
      setOrders(prev =>
        prev.filter(o => {
          if (o.status === 'ready' && o.movedAt && Date.now() - o.movedAt > 120_000) {
            setCompletedToday(c => c + 1)
            return false
          }
          return true
        })
      )
    }, 5000)
    return () => clearInterval(iv)
  }, [])

  /* ── Auto-bump after X min ───────────────────────────────────────────────── */
  useEffect(() => {
    if (!settings.autoBumpMin) return
    const iv = setInterval(() => {
      setOrders(prev => prev.map(o => {
        if (o.status === 'preparing' && getMinutesAgo(o.createdAt) >= settings.autoBumpMin) {
          if (settings.soundOn) playBeep(1200, 0.25)
          return { ...o, status: 'ready', movedAt: Date.now() }
        }
        return o
      }))
    }, 5000)
    return () => clearInterval(iv)
  }, [settings.autoBumpMin, settings.soundOn])

  /* ── Column rotation (display cycling) ───────────────────────────────────── */
  const [rotIndex, setRotIndex] = useState(0)
  useEffect(() => {
    if (!settings.rotationSec) return
    const iv = setInterval(() => setRotIndex(i => (i + 1) % 3), settings.rotationSec * 1000)
    return () => clearInterval(iv)
  }, [settings.rotationSec])

  /* ── Move status ─────────────────────────────────────────────────────────── */
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
    if (newStatus === 'ready' && settings.soundOn) playBeep()
  }, [settings.soundOn])

  /* ── Recall / flash ──────────────────────────────────────────────────────── */
  const flashOrder = useCallback((id: string) => {
    const existing = flashTimers.current.get(id)
    if (existing) clearTimeout(existing)

    setOrders(prev => prev.map(o => o.id === id ? { ...o, flash: true } : o))
    const timer = setTimeout(() => {
      setOrders(prev => prev.map(o => o.id === id ? { ...o, flash: false } : o))
      flashTimers.current.delete(id)
    }, 3000)
    flashTimers.current.set(id, timer)
    if (settings.soundOn) playRecall()
  }, [settings.soundOn])

  /* ── Toggle item done ────────────────────────────────────────────────────── */
  const toggleItemDone = useCallback((orderId: string, itemId: string) => {
    setOrders(prev => prev.map(o => {
      if (o.id !== orderId) return o
      const items = o.items.map(it => it.id === itemId ? { ...it, done: !it.done } : it)
      // Auto-promote to preparing if waiting & any item done
      const anyDone = items.some(it => it.done)
      const allDone = items.every(it => it.done)
      let status = o.status
      let movedAt = o.movedAt
      if (anyDone && status === 'waiting') status = 'preparing'
      if (allDone && status !== 'ready') {
        status = 'ready'
        movedAt = Date.now()
        if (settings.soundOn) playBeep()
      }
      return { ...o, items, status, movedAt }
    }))
  }, [settings.soundOn])

  /* ── Assign cook ─────────────────────────────────────────────────────────── */
  const assignCook = useCallback((orderId: string, cookId: string | null) => {
    setOrders(prev => prev.map(o => {
      if (o.id !== orderId) return o
      // Auto-promote to preparing on assignment
      const status = o.status === 'waiting' ? 'preparing' : o.status
      return { ...o, cookId, status }
    }))
  }, [])

  /* ── Fullscreen ──────────────────────────────────────────────────────────── */
  useEffect(() => {
    if (fullscreen) {
      document.documentElement.requestFullscreen?.().catch(() => {})
    } else if (document.fullscreenElement) {
      document.exitFullscreen?.().catch(() => {})
    }
  }, [fullscreen])

  /* ── Bump bar keyboard 1–9 ───────────────────────────────────────────────── */
  const visibleOrders = useMemo(() => {
    if (station === 'all') return orders
    return orders.filter(o => o.items.some(it => it.station === station))
  }, [orders, station])

  const waiting = visibleOrders.filter(o => o.status === 'waiting').sort((a, b) => a.createdAt - b.createdAt)
  const preparing = visibleOrders.filter(o => o.status === 'preparing').sort((a, b) => a.createdAt - b.createdAt)
  const ready = visibleOrders.filter(o => o.status === 'ready').sort((a, b) => (b.movedAt || 0) - (a.movedAt || 0))

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') { setShowSettings(false); setFullscreen(false); return }
      if (e.key === 'F11') { e.preventDefault(); setFullscreen(f => !f); return }
      if (e.key === 'f' && (e.ctrlKey || e.metaKey)) { e.preventDefault(); setFullscreen(f => !f); return }
      // Numbers 1–9: bump oldest N waiting → preparing, or preparing → ready
      if (/^[1-9]$/.test(e.key)) {
        const n = parseInt(e.key, 10) - 1
        const preparingList = preparing
        const waitingList = waiting
        if (preparingList[n]) {
          moveToStatus(preparingList[n].id, 'ready')
        } else if (waitingList[n]) {
          moveToStatus(waitingList[n].id, 'preparing')
        }
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [waiting, preparing, moveToStatus])

  /* ── Stats computations ──────────────────────────────────────────────────── */
  const topItems = useMemo(() => {
    const map = new Map<string, number>()
    orders.forEach(o => o.items.forEach(it => {
      map.set(it.name, (map.get(it.name) || 0) + it.qty)
    }))
    // Add some baseline stats for day
    const seed: [string, number][] = [
      ['Burger maison', 18], ['Steak frites', 14], ['Salade César', 11],
      ['Tarte Tatin', 9], ['Frites maison', 22],
    ]
    seed.forEach(([n, c]) => map.set(n, (map.get(n) || 0) + c))
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]).slice(0, 5)
  }, [orders])

  const cookStats = useMemo(() => {
    return COOKS.map(c => {
      const active = orders.filter(o => o.cookId === c.id && o.status !== 'ready').length
      const hours = Math.max(1, (Date.now() - c.activeSince) / 3600_000)
      const rate = (c.completed / hours).toFixed(1)
      return { ...c, active, rate }
    })
  }, [orders])

  const clockStr = clock.toLocaleTimeString('fr-LU', { hour: '2-digit', minute: '2-digit', second: '2-digit' })

  /* ── Render ──────────────────────────────────────────────────────────────── */
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
      {/* ═════ TOP BAR ═════ */}
      <div style={{
        height: 64, flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '0 20px',
        background: 'rgba(10,10,22,0.95)',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <span style={{ fontSize: 30, lineHeight: 1 }}>👨‍🍳</span>
          <div style={{ display: 'flex', flexDirection: 'column' }}>
            <span style={{
              fontSize: 22, fontWeight: 900, letterSpacing: '-0.02em',
              color: '#f8fafc', lineHeight: 1,
            }}>
              {viewMode === 'expo' ? 'EXPO — Contrôle qualité' : 'CUISINE'}
            </span>
            <span style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', fontWeight: 500 }}>
              Café um Rond-Point
            </span>
          </div>

          {/* View toggle */}
          <div style={{
            marginLeft: 12,
            display: 'inline-flex', gap: 2,
            background: 'rgba(255,255,255,0.04)',
            border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 10, padding: 3,
          }}>
            <button
              onClick={() => setViewMode('kitchen')}
              style={viewTab(viewMode === 'kitchen')}
            >Cuisine</button>
            <button
              onClick={() => setViewMode('expo')}
              style={viewTab(viewMode === 'expo')}
            >Expo</button>
          </div>
        </div>

        {/* Clock */}
        <div style={{
          fontSize: 30, fontWeight: 800,
          fontVariantNumeric: 'tabular-nums',
          color: '#f8fafc',
          letterSpacing: '0.05em',
        }}>
          {clockStr}
        </div>

        {/* Right: counts + buttons */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ display: 'flex', gap: 14, fontSize: 14, fontWeight: 700 }}>
            <span style={{ color: '#ef4444' }}>{waiting.length} attente</span>
            <span style={{ color: '#6b7280' }}>·</span>
            <span style={{ color: '#f97316' }}>{preparing.length} prép.</span>
            <span style={{ color: '#6b7280' }}>·</span>
            <span style={{ color: '#22c55e' }}>{ready.length} prêts</span>
          </div>

          <IconBtn
            active={settings.soundOn}
            onClick={() => setSettings(s => ({ ...s, soundOn: !s.soundOn }))}
            title="Son"
          >{settings.soundOn ? '🔔' : '🔇'}</IconBtn>

          <IconBtn
            active={showCooksPanel}
            onClick={() => setShowCooksPanel(v => !v)}
            title="Panneau cuisiniers"
          >👥</IconBtn>

          <IconBtn
            active={settings.showStats}
            onClick={() => setSettings(s => ({ ...s, showStats: !s.showStats }))}
            title="Statistiques"
          >📊</IconBtn>

          <IconBtn
            active={fullscreen}
            onClick={() => setFullscreen(f => !f)}
            title="Plein écran (F11)"
          >⛶</IconBtn>

          <IconBtn
            active={showSettings}
            onClick={() => setShowSettings(v => !v)}
            title="Paramètres"
          >⚙️</IconBtn>

          <button
            onClick={onExit}
            style={{
              padding: '10px 18px',
              borderRadius: 10,
              border: '1px solid rgba(244,63,94,0.3)',
              background: 'rgba(244,63,94,0.1)',
              color: '#fb7185',
              fontSize: 14, fontWeight: 800,
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            Quitter
          </button>
        </div>
      </div>

      {/* ═════ STATION FILTERS ═════ */}
      <div style={{
        height: 52, flexShrink: 0,
        display: 'flex', alignItems: 'center',
        gap: 8, padding: '0 20px',
        background: 'rgba(10,10,22,0.7)',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
        overflowX: 'auto',
      }}>
        <span style={{
          fontSize: 11, fontWeight: 800, letterSpacing: '0.14em',
          color: 'rgba(255,255,255,0.35)', textTransform: 'uppercase',
          marginRight: 6,
        }}>
          Stations
        </span>
        <StationPill active={station === 'all'} onClick={() => setStation('all')}>
          Toutes
        </StationPill>
        {(Object.keys(STATION_META) as (keyof typeof STATION_META)[]).map(key => (
          <StationPill
            key={key}
            active={station === key}
            color={STATION_META[key].color}
            onClick={() => setStation(key)}
          >
            {STATION_META[key].emoji} {STATION_META[key].label}
          </StationPill>
        ))}

        <div style={{ flex: 1 }} />

        <span style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', fontWeight: 600 }}>
          Raccourcis clavier: 1-9 bump · F11 plein écran · Esc
        </span>
      </div>

      {/* ═════ MAIN LAYOUT ═════ */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* ── LEFT: Cooks panel ── */}
        {showCooksPanel && (
          <CooksPanel
            cooks={cookStats}
            orders={orders}
            hoverCook={hoverCook}
            onHover={setHoverCook}
            onAssign={assignCook}
            draggingOrder={draggingOrder}
          />
        )}

        {/* ── CENTER: Columns ── */}
        <div style={{
          flex: 1,
          display: 'grid',
          gridTemplateColumns: viewMode === 'expo' ? '1fr' : '1fr 1fr 1fr',
          gap: 0,
          overflow: 'hidden',
          opacity: settings.rotationSec ? 0.6 : 1,
          transition: 'opacity .3s',
        }}>
          {viewMode === 'expo' ? (
            <ExpoView
              orders={ready}
              onAction={moveToStatus}
              onFlash={flashOrder}
              onToggleItem={toggleItemDone}
            />
          ) : (
            <>
              <ColumnSection
                title="En attente"
                color="#ef4444"
                count={waiting.length}
                orders={waiting}
                onAction={moveToStatus}
                onFlash={flashOrder}
                onToggleItem={toggleItemDone}
                onDragStart={setDraggingOrder}
                onDragEnd={() => setDraggingOrder(null)}
                columnType="waiting"
                highlighted={settings.rotationSec ? rotIndex === 0 : false}
                largeMode={settings.largeMode}
              />
              <ColumnSection
                title="En préparation"
                color="#f97316"
                count={preparing.length}
                orders={preparing}
                onAction={moveToStatus}
                onFlash={flashOrder}
                onToggleItem={toggleItemDone}
                onDragStart={setDraggingOrder}
                onDragEnd={() => setDraggingOrder(null)}
                columnType="preparing"
                highlighted={settings.rotationSec ? rotIndex === 1 : false}
                largeMode={settings.largeMode}
              />
              <ColumnSection
                title="Prêt"
                color="#22c55e"
                count={ready.length}
                orders={ready}
                onAction={moveToStatus}
                onFlash={flashOrder}
                onToggleItem={toggleItemDone}
                onDragStart={setDraggingOrder}
                onDragEnd={() => setDraggingOrder(null)}
                columnType="ready"
                highlighted={settings.rotationSec ? rotIndex === 2 : false}
                largeMode={settings.largeMode}
              />
            </>
          )}
        </div>

        {/* ── RIGHT: Stats sidebar ── */}
        {settings.showStats && (
          <StatsSidebar
            completedToday={completedToday}
            avgPrepTime={avgPrepTime}
            topItems={topItems}
            cooks={cookStats}
            waitingCount={orders.filter(o => o.status === 'waiting').length}
            preparingCount={orders.filter(o => o.status === 'preparing').length}
          />
        )}
      </div>

      {/* ═════ SETTINGS MODAL ═════ */}
      <AnimatePresence>
        {showSettings && (
          <SettingsModal
            settings={settings}
            onChange={setSettings}
            onClose={() => setShowSettings(false)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════════════
   COOKS PANEL (left)
   ══════════════════════════════════════════════════════════════════════════════ */

function CooksPanel({
  cooks, orders, hoverCook, onHover, onAssign, draggingOrder,
}: {
  cooks: (Cook & { active: number; rate: string })[]
  orders: KDSOrder[]
  hoverCook: string | null
  onHover: (id: string | null) => void
  onAssign: (orderId: string, cookId: string | null) => void
  draggingOrder: string | null
}) {
  return (
    <div style={{
      width: 210, flexShrink: 0,
      background: 'rgba(10,10,22,0.6)',
      borderRight: '1px solid rgba(255,255,255,0.06)',
      display: 'flex', flexDirection: 'column',
      overflow: 'hidden',
    }}>
      <div style={{
        height: 44, flexShrink: 0,
        display: 'flex', alignItems: 'center',
        padding: '0 16px',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
      }}>
        <span style={{
          fontSize: 12, fontWeight: 800, letterSpacing: '0.12em',
          color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase',
        }}>
          Cuisiniers
        </span>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
        {/* Unassigned drop zone */}
        <div
          onDragOver={e => { e.preventDefault(); onHover('unassigned') }}
          onDragLeave={() => onHover(null)}
          onDrop={() => {
            if (draggingOrder) onAssign(draggingOrder, null)
            onHover(null)
          }}
          style={{
            padding: '10px 12px',
            borderRadius: 10,
            background: hoverCook === 'unassigned'
              ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.02)',
            border: hoverCook === 'unassigned'
              ? '1.5px dashed rgba(255,255,255,0.3)' : '1px dashed rgba(255,255,255,0.08)',
            fontSize: 12, fontWeight: 700,
            color: 'rgba(255,255,255,0.4)',
            textAlign: 'center',
          }}
        >
          Non assigné
        </div>

        {cooks.map(cook => {
          const assigned = orders.filter(o => o.cookId === cook.id && o.status !== 'ready')
          const isHover = hoverCook === cook.id
          return (
            <div
              key={cook.id}
              onDragOver={e => { e.preventDefault(); onHover(cook.id) }}
              onDragLeave={() => onHover(null)}
              onDrop={() => {
                if (draggingOrder) onAssign(draggingOrder, cook.id)
                onHover(null)
              }}
              style={{
                padding: '10px 12px',
                borderRadius: 12,
                background: isHover
                  ? `${cook.color}25`
                  : 'rgba(255,255,255,0.03)',
                border: isHover
                  ? `2px solid ${cook.color}`
                  : `1px solid ${cook.color}30`,
                transition: 'all .15s',
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                <span style={{ fontSize: 20 }}>{cook.emoji}</span>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{
                    fontSize: 14, fontWeight: 800, color: '#f1f5f9',
                    overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                  }}>
                    {cook.name}
                  </div>
                  <div style={{ fontSize: 10, color: cook.color, fontWeight: 700 }}>
                    {assigned.length} actif{assigned.length > 1 ? 's' : ''}
                  </div>
                </div>
              </div>

              {/* Mini orders list */}
              {assigned.length > 0 && (
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, marginTop: 6 }}>
                  {assigned.slice(0, 6).map(o => (
                    <span
                      key={o.id}
                      style={{
                        fontSize: 10, fontWeight: 700,
                        padding: '2px 6px',
                        borderRadius: 5,
                        background: `${cook.color}25`,
                        color: cook.color,
                      }}
                    >
                      #{o.orderNum}
                    </span>
                  ))}
                </div>
              )}

              <div style={{
                fontSize: 10, color: 'rgba(255,255,255,0.4)',
                marginTop: 6, fontWeight: 600,
              }}>
                {cook.rate}/h · {cook.completed} terminés
              </div>
            </div>
          )
        })}

        <div style={{
          fontSize: 10, color: 'rgba(255,255,255,0.3)',
          padding: '8px 6px', fontWeight: 600, textAlign: 'center',
          lineHeight: 1.4,
        }}>
          Glissez une commande ici pour l'assigner
        </div>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════════════
   STATS SIDEBAR (right)
   ══════════════════════════════════════════════════════════════════════════════ */

function StatsSidebar({
  completedToday, avgPrepTime, topItems, cooks, waitingCount, preparingCount,
}: {
  completedToday: number
  avgPrepTime: number
  topItems: [string, number][]
  cooks: (Cook & { active: number; rate: string })[]
  waitingCount: number
  preparingCount: number
}) {
  return (
    <div style={{
      width: 260, flexShrink: 0,
      background: 'rgba(10,10,22,0.6)',
      borderLeft: '1px solid rgba(255,255,255,0.06)',
      display: 'flex', flexDirection: 'column',
      overflow: 'hidden',
    }}>
      <div style={{
        height: 44, flexShrink: 0,
        display: 'flex', alignItems: 'center',
        padding: '0 16px',
        borderBottom: '1px solid rgba(255,255,255,0.05)',
      }}>
        <span style={{
          fontSize: 12, fontWeight: 800, letterSpacing: '0.12em',
          color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase',
        }}>
          Statistiques live
        </span>
      </div>

      <div style={{ flex: 1, overflowY: 'auto', padding: 14, display: 'flex', flexDirection: 'column', gap: 14 }}>
        {/* Commandes du jour */}
        <div style={statCard('#22c55e')}>
          <div style={statCardLabel()}>Commandes aujourd'hui</div>
          <div style={statCardValue('#22c55e')}>{completedToday}</div>
          <div style={statCardSub()}>
            +{waitingCount + preparingCount} en cours
          </div>
        </div>

        {/* Temps moyen */}
        <div style={statCard('#60a5fa')}>
          <div style={statCardLabel()}>Temps moyen préparation</div>
          <div style={statCardValue('#60a5fa')}>
            {avgPrepTime.toFixed(1)}<span style={{ fontSize: 14, marginLeft: 3 }}>min</span>
          </div>
          <div style={statCardSub()}>Objectif: 10 min</div>
        </div>

        {/* Top items */}
        <div>
          <div style={{
            fontSize: 11, fontWeight: 800, letterSpacing: '0.1em',
            color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase',
            marginBottom: 8,
          }}>
            Top 5 articles
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {topItems.map(([name, count], i) => {
              const max = topItems[0][1]
              const pct = (count / max) * 100
              return (
                <div key={name} style={{
                  position: 'relative',
                  padding: '7px 10px',
                  borderRadius: 8,
                  background: 'rgba(255,255,255,0.03)',
                  overflow: 'hidden',
                }}>
                  <div style={{
                    position: 'absolute', inset: 0,
                    width: `${pct}%`,
                    background: i === 0
                      ? 'linear-gradient(90deg, rgba(251,191,36,0.25), rgba(251,191,36,0.05))'
                      : 'linear-gradient(90deg, rgba(129,140,248,0.15), rgba(129,140,248,0.02))',
                  }} />
                  <div style={{
                    position: 'relative',
                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                    fontSize: 12,
                  }}>
                    <span style={{
                      color: i === 0 ? '#fbbf24' : '#cbd5e1',
                      fontWeight: 700,
                      overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                    }}>
                      {i + 1}. {name}
                    </span>
                    <span style={{
                      color: i === 0 ? '#fbbf24' : '#818cf8',
                      fontWeight: 800,
                      marginLeft: 8,
                    }}>
                      {count}
                    </span>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

        {/* Cook performance */}
        <div>
          <div style={{
            fontSize: 11, fontWeight: 800, letterSpacing: '0.1em',
            color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase',
            marginBottom: 8,
          }}>
            Performance cuisiniers
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {cooks.sort((a, b) => parseFloat(b.rate) - parseFloat(a.rate)).map(c => (
              <div key={c.id} style={{
                padding: '6px 10px',
                borderRadius: 8,
                background: `${c.color}12`,
                border: `1px solid ${c.color}20`,
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              }}>
                <span style={{ fontSize: 12, color: '#e2e8f0', fontWeight: 700 }}>
                  {c.emoji} {c.name}
                </span>
                <span style={{ fontSize: 13, color: c.color, fontWeight: 800, fontVariantNumeric: 'tabular-nums' }}>
                  {c.rate}/h
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

function statCard(color: string): React.CSSProperties {
  return {
    padding: '12px 14px',
    borderRadius: 14,
    background: `${color}10`,
    border: `1px solid ${color}25`,
  }
}
function statCardLabel(): React.CSSProperties {
  return {
    fontSize: 10, fontWeight: 700, letterSpacing: '0.1em',
    color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase',
    marginBottom: 4,
  }
}
function statCardValue(color: string): React.CSSProperties {
  return {
    fontSize: 28, fontWeight: 900, color,
    fontVariantNumeric: 'tabular-nums',
    letterSpacing: '-0.02em',
    lineHeight: 1,
  }
}
function statCardSub(): React.CSSProperties {
  return {
    fontSize: 11, fontWeight: 600,
    color: 'rgba(255,255,255,0.4)',
    marginTop: 4,
  }
}

/* ══════════════════════════════════════════════════════════════════════════════
   COLUMN SECTION
   ══════════════════════════════════════════════════════════════════════════════ */

function ColumnSection({
  title, color, count, orders,
  onAction, onFlash, onToggleItem,
  onDragStart, onDragEnd,
  columnType, highlighted, largeMode,
}: {
  title: string
  color: string
  count: number
  orders: KDSOrder[]
  onAction: (id: string, s: KDSStatus) => void
  onFlash: (id: string) => void
  onToggleItem: (orderId: string, itemId: string) => void
  onDragStart: (id: string) => void
  onDragEnd: () => void
  columnType: 'waiting' | 'preparing' | 'ready'
  highlighted: boolean
  largeMode: boolean
}) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column',
      borderRight: '1px solid rgba(255,255,255,0.06)',
      overflow: 'hidden',
      background: highlighted ? `${color}08` : 'transparent',
      transition: 'background .3s',
    }}>
      <div style={{
        height: 52, flexShrink: 0,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        gap: 10,
        background: `${color}20`,
        borderBottom: `3px solid ${color}`,
      }}>
        <span style={{
          fontSize: 18, fontWeight: 900, letterSpacing: '0.08em',
          textTransform: 'uppercase',
          color,
        }}>
          {title}
        </span>
        <span style={{
          fontSize: 14, fontWeight: 900,
          background: color,
          color: '#07070d',
          borderRadius: 20,
          padding: '3px 12px',
          minWidth: 28,
          textAlign: 'center',
        }}>
          {count}
        </span>
      </div>

      <div style={{
        flex: 1,
        overflowY: 'auto',
        overflowX: 'hidden',
        padding: 14,
        display: 'flex',
        flexDirection: 'column',
        gap: 14,
      }}>
        <AnimatePresence mode="popLayout">
          {orders.map((order, idx) => (
            <OrderCard
              key={order.id}
              order={order}
              index={idx}
              onAction={onAction}
              onFlash={onFlash}
              onToggleItem={onToggleItem}
              onDragStart={onDragStart}
              onDragEnd={onDragEnd}
              columnType={columnType}
              largeMode={largeMode}
            />
          ))}
        </AnimatePresence>

        {orders.length === 0 && (
          <div style={{
            flex: 1, minHeight: 100,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color: 'rgba(255,255,255,0.15)',
            fontSize: 18, fontWeight: 700,
          }}>
            {columnType === 'waiting' ? 'Aucune commande' :
             columnType === 'preparing' ? 'Rien en cours' :
             'Rien de prêt'}
          </div>
        )}
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════════════
   ORDER CARD
   ══════════════════════════════════════════════════════════════════════════════ */

function OrderCard({
  order, index,
  onAction, onFlash, onToggleItem,
  onDragStart, onDragEnd,
  columnType, largeMode,
}: {
  order: KDSOrder
  index: number
  onAction: (id: string, s: KDSStatus) => void
  onFlash: (id: string) => void
  onToggleItem: (orderId: string, itemId: string) => void
  onDragStart: (id: string) => void
  onDragEnd: () => void
  columnType: 'waiting' | 'preparing' | 'ready'
  largeMode: boolean
}) {
  const minutes = getMinutesAgo(order.createdAt)
  const isUrgent = minutes >= 15
  const isRush = minutes >= 20
  const barColor = timerColor(minutes)
  const barW = timerBarWidth(minutes)
  const hasAllergen = order.items.some(it => it.allergen)

  // Group items by course
  const courses = new Map<string, KDSItem[]>()
  order.items.forEach(item => {
    const c = item.course || ''
    if (!courses.has(c)) courses.set(c, [])
    courses.get(c)!.push(item)
  })
  const hasCourses = courses.size > 1 || (courses.size === 1 && !courses.has(''))

  // Border color priority: VIP > allergen > rush > urgent
  let borderColor = 'rgba(255,255,255,0.08)'
  let borderWidth = 1
  if (order.vip) { borderColor = '#fb923c'; borderWidth = 2 }
  if (hasAllergen) { borderColor = '#ef4444'; borderWidth = 2 }
  if (isRush) { borderColor = '#ef4444'; borderWidth = 3 }
  if (order.flash) { borderColor = '#818cf8'; borderWidth = 2 }

  const fontBase = largeMode ? 1 : 0.88

  return (
    <motion.div
      layout
      draggable
      onDragStart={() => onDragStart(order.id)}
      onDragEnd={onDragEnd}
      initial={{ opacity: 0, y: -40, scale: 0.95 }}
      animate={{
        opacity: 1, y: 0, scale: 1,
        boxShadow: order.flash
          ? '0 0 30px rgba(99,102,241,0.6), inset 0 0 20px rgba(99,102,241,0.15)'
          : isRush
            ? '0 0 30px rgba(239,68,68,0.45)'
            : isUrgent
              ? '0 0 20px rgba(239,68,68,0.2)'
              : '0 2px 8px rgba(0,0,0,0.3)',
      }}
      exit={{ opacity: 0, scale: 0.9, y: 20, transition: { duration: 0.3 } }}
      transition={{ type: 'spring', stiffness: 400, damping: 30 }}
      style={{
        background: order.flash
          ? 'rgba(99,102,241,0.14)'
          : isRush
            ? 'rgba(239,68,68,0.08)'
            : 'rgba(255,255,255,0.04)',
        borderRadius: 14,
        border: `${borderWidth}px solid ${borderColor}`,
        overflow: 'hidden',
        flexShrink: 0,
        cursor: 'grab',
      }}
    >
      {/* Rush mode flashing overlay */}
      {isRush && (
        <motion.div
          animate={{ opacity: [0.7, 0.2, 0.7] }}
          transition={{ duration: 1, repeat: Infinity }}
          style={{
            position: 'absolute', inset: 0,
            borderRadius: 12,
            boxShadow: 'inset 0 0 0 3px rgba(239,68,68,0.6)',
            pointerEvents: 'none',
          }}
        />
      )}

      {/* Header */}
      <div style={{
        display: 'flex', alignItems: 'center', justifyContent: 'space-between',
        padding: '12px 16px 8px',
      }}>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
          {/* Index badge for bump-bar */}
          <span style={{
            fontSize: 12, fontWeight: 900,
            background: 'rgba(255,255,255,0.1)',
            color: '#cbd5e1',
            borderRadius: 6,
            padding: '2px 7px',
            minWidth: 22,
            textAlign: 'center',
            fontVariantNumeric: 'tabular-nums',
          }}>
            {index + 1}
          </span>

          <span style={{
            fontSize: 26 * fontBase, fontWeight: 900, color: '#f8fafc',
            letterSpacing: '-0.02em',
          }}>
            {order.tableName}
          </span>
          <span style={{
            fontSize: 13, color: 'rgba(255,255,255,0.4)', fontWeight: 700,
          }}>
            #{order.orderNum}
          </span>

          {order.vip && (
            <span style={{
              fontSize: 10, fontWeight: 900,
              padding: '2px 7px', borderRadius: 5,
              background: 'rgba(251,146,60,0.2)',
              color: '#fb923c', letterSpacing: '0.1em',
            }}>VIP</span>
          )}
          {hasAllergen && (
            <span style={{
              fontSize: 13, color: '#ef4444', fontWeight: 900,
            }} title="Allergène">⚠️</span>
          )}
        </div>
        <div style={{
          fontSize: 22 * fontBase, fontWeight: 800,
          fontVariantNumeric: 'tabular-nums',
          color: barColor,
        }}>
          {formatTimer(order.createdAt)}
        </div>
      </div>

      {/* Timer bar */}
      <div style={{
        height: 6, background: 'rgba(255,255,255,0.06)',
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

      {/* Cook badge + server */}
      {(order.cookId || order.server) && (
        <div style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '6px 16px 0',
          fontSize: 11, fontWeight: 700,
        }}>
          {order.cookId && (() => {
            const cook = COOKS.find(c => c.id === order.cookId)
            if (!cook) return null
            return (
              <span style={{
                padding: '3px 8px', borderRadius: 6,
                background: `${cook.color}22`,
                color: cook.color,
              }}>
                {cook.emoji} {cook.name}
              </span>
            )
          })()}
          {order.server && (
            <span style={{ color: 'rgba(255,255,255,0.35)' }}>
              Serveur: {order.server}
            </span>
          )}
        </div>
      )}

      {/* Items grouped by course */}
      <div style={{ padding: '10px 16px 6px' }}>
        {hasCourses ? (
          Array.from(courses.entries()).map(([courseKey, items]) => (
            <div key={courseKey} style={{ marginBottom: 10 }}>
              {courseKey && (
                <CourseBar course={courseKey as Course} />
              )}
              {items.map(item => (
                <ItemLine
                  key={item.id}
                  item={item}
                  orderId={order.id}
                  onToggle={onToggleItem}
                  largeMode={largeMode}
                />
              ))}
            </div>
          ))
        ) : (
          order.items.map(item => (
            <ItemLine
              key={item.id}
              item={item}
              orderId={order.id}
              onToggle={onToggleItem}
              largeMode={largeMode}
            />
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
              En préparation
            </button>
            <button
              onClick={() => onAction(order.id, 'ready')}
              style={actionBtn('#22c55e', true)}
            >
              PRÊT !
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
              PRÊT !
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

/* ══════════════════════════════════════════════════════════════════════════════
   COURSE BAR
   ══════════════════════════════════════════════════════════════════════════════ */

function CourseBar({ course }: { course: Course }) {
  const meta = COURSE_META[course]
  if (!meta) return null
  return (
    <div style={{
      fontSize: 11, fontWeight: 900,
      color: meta.color,
      letterSpacing: '0.14em',
      textTransform: 'uppercase',
      marginBottom: 5,
      paddingBottom: 4,
      borderBottom: `1.5px solid ${meta.color}40`,
      display: 'flex', alignItems: 'center', gap: 6,
    }}>
      <span style={{
        display: 'inline-block', width: 4, height: 14,
        background: meta.color, borderRadius: 2,
      }} />
      {meta.label}
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════════════
   ITEM LINE
   ══════════════════════════════════════════════════════════════════════════════ */

function ItemLine({ item, orderId, onToggle, largeMode }: {
  item: KDSItem
  orderId: string
  onToggle: (orderId: string, itemId: string) => void
  largeMode: boolean
}) {
  const stationMeta = item.station ? STATION_META[item.station] : null
  const fontBase = largeMode ? 1 : 0.88

  return (
    <div style={{
      marginBottom: 6,
      padding: '4px 0',
      opacity: item.done ? 0.45 : 1,
      transition: 'opacity .2s',
    }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', gap: 10 }}>
        {/* Done checkbox */}
        <button
          onClick={() => onToggle(orderId, item.id)}
          style={{
            width: 22, height: 22, flexShrink: 0,
            marginTop: 2,
            borderRadius: 6,
            border: item.done
              ? '2px solid #22c55e'
              : '2px solid rgba(255,255,255,0.2)',
            background: item.done ? 'rgba(34,197,94,0.3)' : 'transparent',
            color: '#22c55e',
            fontSize: 14, fontWeight: 900,
            cursor: 'pointer',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontFamily: 'inherit',
            transition: 'all .15s',
          }}
          title={item.done ? 'Pas cuit' : 'Cuit'}
        >
          {item.done ? '✓' : ''}
        </button>

        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{
            fontSize: 18 * fontBase, fontWeight: 800, color: '#e2e8f0',
            lineHeight: 1.3,
            textDecoration: item.done ? 'line-through' : 'none',
          }}>
            <span style={{
              color: '#818cf8', fontWeight: 900, marginRight: 6,
            }}>
              {item.qty}×
            </span>
            {item.name}
            {stationMeta && (
              <span style={{
                display: 'inline-block',
                marginLeft: 8,
                fontSize: 10, fontWeight: 800,
                padding: '2px 6px',
                borderRadius: 5,
                background: `${stationMeta.color}18`,
                color: stationMeta.color,
                letterSpacing: '0.05em',
                textTransform: 'uppercase',
                verticalAlign: 'middle',
              }}>
                {stationMeta.emoji} {stationMeta.label}
              </span>
            )}
          </div>
          {item.note && (
            <div style={{
              fontSize: 13 * fontBase, fontWeight: 700,
              color: item.allergen ? '#ef4444' : '#f97316',
              fontStyle: 'italic',
              paddingLeft: 2,
              marginTop: 2,
              lineHeight: 1.3,
            }}>
              {item.allergen && '⚠️ '}
              {item.note}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════════════
   EXPO VIEW — Final quality check before service
   ══════════════════════════════════════════════════════════════════════════════ */

function ExpoView({ orders, onAction, onFlash, onToggleItem }: {
  orders: KDSOrder[]
  onAction: (id: string, s: KDSStatus) => void
  onFlash: (id: string) => void
  onToggleItem: (orderId: string, itemId: string) => void
}) {
  return (
    <div style={{
      flex: 1, overflowY: 'auto',
      padding: 20,
    }}>
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fill, minmax(360px, 1fr))',
        gap: 16,
      }}>
        {orders.length === 0 ? (
          <div style={{
            gridColumn: '1 / -1',
            padding: 60, textAlign: 'center',
            color: 'rgba(255,255,255,0.2)',
            fontSize: 20, fontWeight: 700,
          }}>
            Aucune commande prête à contrôler
          </div>
        ) : orders.map(order => {
          const allDone = order.items.every(it => it.done)
          return (
            <div key={order.id} style={{
              padding: 18,
              borderRadius: 16,
              background: 'rgba(34,197,94,0.05)',
              border: allDone
                ? '2px solid rgba(34,197,94,0.5)'
                : '2px solid rgba(251,146,60,0.4)',
            }}>
              <div style={{
                display: 'flex', justifyContent: 'space-between',
                alignItems: 'center', marginBottom: 14,
              }}>
                <div>
                  <div style={{
                    fontSize: 26, fontWeight: 900, color: '#f8fafc',
                  }}>
                    {order.tableName}
                  </div>
                  <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', fontWeight: 700 }}>
                    #{order.orderNum} · {order.server}
                  </div>
                </div>
                <div style={{
                  padding: '6px 12px',
                  borderRadius: 8,
                  background: allDone ? 'rgba(34,197,94,0.2)' : 'rgba(251,146,60,0.2)',
                  color: allDone ? '#22c55e' : '#fb923c',
                  fontSize: 11, fontWeight: 900, letterSpacing: '0.1em',
                  textTransform: 'uppercase',
                }}>
                  {allDone ? 'Prêt à servir' : 'Contrôle'}
                </div>
              </div>

              <div style={{ marginBottom: 14 }}>
                {order.items.map(item => (
                  <ItemLine
                    key={item.id}
                    item={item}
                    orderId={order.id}
                    onToggle={onToggleItem}
                    largeMode
                  />
                ))}
              </div>

              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => onFlash(order.id)} style={actionBtn('#6366f1', false)}>
                  Appel serveur
                </button>
                <button
                  onClick={() => onAction(order.id, 'preparing')}
                  style={actionBtn('#ef4444', false)}
                >
                  Renvoyer
                </button>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════════════
   SETTINGS MODAL
   ══════════════════════════════════════════════════════════════════════════════ */

function SettingsModal({ settings, onChange, onClose }: {
  settings: Settings
  onChange: (s: Settings) => void
  onClose: () => void
}) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={onClose}
      style={{
        position: 'fixed', inset: 0, zIndex: 10000,
        background: 'rgba(0,0,0,0.65)',
        backdropFilter: 'blur(6px)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      <motion.div
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        onClick={e => e.stopPropagation()}
        style={{
          width: 440, maxWidth: '90%',
          background: '#0c0c1a',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 18,
          padding: 28,
          boxShadow: '0 24px 80px rgba(0,0,0,0.8)',
        }}
      >
        <div style={{
          display: 'flex', justifyContent: 'space-between', alignItems: 'center',
          marginBottom: 22,
        }}>
          <span style={{
            fontSize: 20, fontWeight: 900, color: '#f8fafc',
            letterSpacing: '-0.02em',
          }}>
            ⚙️ Paramètres KDS
          </span>
          <button
            onClick={onClose}
            style={{
              width: 32, height: 32, borderRadius: 8,
              border: '1px solid rgba(255,255,255,0.1)',
              background: 'rgba(255,255,255,0.05)',
              color: '#94a3b8', fontSize: 16, cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >×</button>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <SettingToggle
            label="Son activé"
            checked={settings.soundOn}
            onChange={v => onChange({ ...settings, soundOn: v })}
          />
          <SettingToggle
            label="Mode grand format (lecture à distance)"
            checked={settings.largeMode}
            onChange={v => onChange({ ...settings, largeMode: v })}
          />
          <SettingToggle
            label="Afficher statistiques"
            checked={settings.showStats}
            onChange={v => onChange({ ...settings, showStats: v })}
          />

          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#cbd5e1', marginBottom: 8 }}>
              Auto-bump (min) — 0 = désactivé
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              {[0, 10, 15, 20, 25, 30].map(v => (
                <button
                  key={v}
                  onClick={() => onChange({ ...settings, autoBumpMin: v })}
                  style={{
                    flex: 1,
                    padding: '8px 0',
                    borderRadius: 8,
                    border: settings.autoBumpMin === v
                      ? '1.5px solid #818cf8'
                      : '1px solid rgba(255,255,255,0.1)',
                    background: settings.autoBumpMin === v
                      ? 'rgba(129,140,248,0.15)'
                      : 'rgba(255,255,255,0.03)',
                    color: settings.autoBumpMin === v ? '#a5b4fc' : '#94a3b8',
                    fontWeight: 800, fontSize: 13,
                    cursor: 'pointer', fontFamily: 'inherit',
                  }}
                >
                  {v || 'Off'}
                </button>
              ))}
            </div>
          </div>

          <div>
            <div style={{ fontSize: 13, fontWeight: 700, color: '#cbd5e1', marginBottom: 8 }}>
              Rotation colonnes (sec) — 0 = désactivé
            </div>
            <div style={{ display: 'flex', gap: 6 }}>
              {[0, 15, 30, 45, 60].map(v => (
                <button
                  key={v}
                  onClick={() => onChange({ ...settings, rotationSec: v })}
                  style={{
                    flex: 1,
                    padding: '8px 0',
                    borderRadius: 8,
                    border: settings.rotationSec === v
                      ? '1.5px solid #818cf8'
                      : '1px solid rgba(255,255,255,0.1)',
                    background: settings.rotationSec === v
                      ? 'rgba(129,140,248,0.15)'
                      : 'rgba(255,255,255,0.03)',
                    color: settings.rotationSec === v ? '#a5b4fc' : '#94a3b8',
                    fontWeight: 800, fontSize: 13,
                    cursor: 'pointer', fontFamily: 'inherit',
                  }}
                >
                  {v || 'Off'}
                </button>
              ))}
            </div>
          </div>

          <div style={{
            marginTop: 8, padding: 12,
            borderRadius: 10,
            background: 'rgba(255,255,255,0.03)',
            fontSize: 12, color: 'rgba(255,255,255,0.5)',
            lineHeight: 1.6,
          }}>
            <strong style={{ color: '#cbd5e1' }}>Raccourcis clavier:</strong><br />
            1–9: bump commande · F11: plein écran · Esc: fermer
          </div>
        </div>
      </motion.div>
    </motion.div>
  )
}

function SettingToggle({ label, checked, onChange }: {
  label: string
  checked: boolean
  onChange: (v: boolean) => void
}) {
  return (
    <div
      onClick={() => onChange(!checked)}
      style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '10px 12px',
        borderRadius: 10,
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.06)',
        cursor: 'pointer',
      }}
    >
      <span style={{ fontSize: 14, fontWeight: 700, color: '#e2e8f0' }}>{label}</span>
      <span style={{
        width: 42, height: 24, borderRadius: 12,
        background: checked ? '#818cf8' : 'rgba(255,255,255,0.15)',
        position: 'relative',
        transition: 'all .2s',
      }}>
        <span style={{
          position: 'absolute',
          top: 3,
          left: checked ? 21 : 3,
          width: 18, height: 18,
          borderRadius: 9,
          background: '#fff',
          transition: 'all .2s',
        }} />
      </span>
    </div>
  )
}

/* ══════════════════════════════════════════════════════════════════════════════
   SMALL UI ATOMS
   ══════════════════════════════════════════════════════════════════════════════ */

function IconBtn({ children, onClick, active, title }: {
  children: React.ReactNode
  onClick: () => void
  active?: boolean
  title?: string
}) {
  return (
    <button
      title={title}
      onClick={onClick}
      style={{
        width: 42, height: 42,
        borderRadius: 10,
        border: active
          ? '1px solid rgba(129,140,248,0.4)'
          : '1px solid rgba(255,255,255,0.1)',
        background: active
          ? 'rgba(129,140,248,0.15)'
          : 'rgba(255,255,255,0.04)',
        color: active ? '#a5b4fc' : '#94a3b8',
        fontSize: 18,
        cursor: 'pointer',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'inherit',
        transition: 'all .15s',
      }}
    >
      {children}
    </button>
  )
}

function StationPill({
  children, active, color, onClick,
}: {
  children: React.ReactNode
  active: boolean
  color?: string
  onClick: () => void
}) {
  const c = color || '#818cf8'
  return (
    <button
      onClick={onClick}
      style={{
        padding: '8px 14px',
        borderRadius: 10,
        border: active
          ? `1.5px solid ${c}`
          : '1px solid rgba(255,255,255,0.08)',
        background: active
          ? `${c}20`
          : 'rgba(255,255,255,0.02)',
        color: active ? c : 'rgba(255,255,255,0.55)',
        fontSize: 13, fontWeight: 800,
        cursor: 'pointer',
        fontFamily: 'inherit',
        letterSpacing: '0.02em',
        whiteSpace: 'nowrap',
        transition: 'all .15s',
      }}
    >
      {children}
    </button>
  )
}

function viewTab(active: boolean): React.CSSProperties {
  return {
    padding: '7px 14px',
    borderRadius: 8,
    border: 'none',
    background: active ? 'rgba(129,140,248,0.2)' : 'transparent',
    color: active ? '#a5b4fc' : 'rgba(255,255,255,0.5)',
    fontSize: 12, fontWeight: 800,
    cursor: 'pointer',
    fontFamily: 'inherit',
    letterSpacing: '0.04em',
  }
}

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
