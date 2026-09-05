/** Une ancienne session est signalée, jamais encaissée ou effacée automatiquement. */
import { getLoadedFloorStates, type FloorState } from '../routes/floorState'
import logger from '../lib/logger'

const MAX_HOURS = Number(process.env.STALE_TABLE_MAX_HOURS) || 8
const TICK_MS = 30 * 60 * 1000

export function findStaleSessions(state: FloorState, now = Date.now(), maxHours = MAX_HOURS) {
  return state.tables.filter((table) => table.status === 'OCCUPEE' && table.openedAt && table.openedAt < now - maxHours * 3600_000)
    .map((table) => ({
      tableId: table.id,
      hoursOpen: Math.round((now - table.openedAt!) / 360_000) / 10,
      unpaidTotal: [...table.items, ...state.chairs.filter((chair) => chair.tableId === table.id).flatMap((chair) => chair.items)]
        .reduce((sum, item) => sum + item.price * item.qty, 0),
    }))
}

let timer: NodeJS.Timeout | undefined
let initial: NodeJS.Timeout | undefined
export function startStaleSessionJanitor() {
  if (timer) return
  const tick = () => {
    for (const { companyId, state } of getLoadedFloorStates()) {
      const stale = findStaleSessions(state)
      if (!stale.length) continue
      logger.warn('[salles] Sessions anciennes à vérifier ; additions et chaises conservées', { companyId, sessions: stale })
      const broadcast = (globalThis as any).liveBroadcast
      if (typeof broadcast === 'function') {
        try { broadcast(`floor-${companyId}`, 'floor-stale-sessions', { sessions: stale }) }
        catch (err) { logger.warn('[salles] Notification des sessions anciennes indisponible', err) }
      }
    }
  }
  initial = setTimeout(tick, 5_000)
  timer = setInterval(tick, TICK_MS)
}

export function stopStaleSessionJanitor() {
  clearTimeout(initial)
  clearInterval(timer)
  initial = undefined
  timer = undefined
}
