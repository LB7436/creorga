import { usePOS } from '../store/posStore'

/**
 * Bridge: POS 5175 local state → shared backend /api/floor-state.
 * Subscribes to Zustand changes and pushes relevant deltas to the backend,
 * so the web app (5174) sees the same tables/orders in real time.
 *
 * One-way sync (POS → backend). Readers on 5174 poll independently.
 */
const BACKEND = (import.meta as any).env?.VITE_BACKEND_URL || 'http://localhost:3002'

let lastSerialised = ''
let syncTimer: ReturnType<typeof setTimeout> | null = null

async function push(tables: any[]) {
  try {
    // Map POS table format → floor-state format
    const mapped = tables.map((t: any) => ({
      id: t.id,
      name: t.name,
      seats: t.seats,
      section: t.section,
      shape: t.shape === 'bar' ? 'bar' : (t.shape as 'round' | 'square' | 'rect'),
      status: statusMap(t.status),
      x: t.x, y: t.y,
      openedAt: t.openedAt,
      items: (t.covers || []).flatMap((c: any) => (c.items || []).map((i: any) => ({
        id: i.id, name: i.name, price: i.price, qty: i.qty, note: i.note, addedAt: Date.now(),
      }))),
    }))

    await fetch(`${BACKEND}/api/floor-state`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ tables: mapped }),
    })
  } catch { /* backend down: ignore */ }
}

function statusMap(s: string): 'LIBRE' | 'OCCUPEE' | 'RESERVEE' | 'NETTOYAGE' {
  if (s === 'occupied') return 'OCCUPEE'
  if (s === 'reserved') return 'RESERVEE'
  if (s === 'dirty') return 'NETTOYAGE'
  return 'LIBRE'
}

export function startFloorBridge() {
  // Debounced sync on every state change
  const trigger = () => {
    if (syncTimer) clearTimeout(syncTimer)
    syncTimer = setTimeout(() => {
      const tables = usePOS.getState().tables
      const serialised = JSON.stringify(tables)
      if (serialised !== lastSerialised) {
        lastSerialised = serialised
        push(tables)
      }
    }, 400)
  }

  // Initial push
  trigger()

  // Subscribe
  return usePOS.subscribe(trigger)
}
