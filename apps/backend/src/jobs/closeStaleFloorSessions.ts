/**
 * Janitor — auto-close any table session opened > MAX_HOURS without payment.
 *
 * Runs on app start + every 30 minutes. Uses the in-memory floorState module's
 * mutators directly (since the data lives in `apps/backend/src/routes/floorState.ts`).
 *
 * Why : the audit found Table 1 stuck on "34h50" — a session forgotten across
 * 2 days. This causes the "tables occupées" KPI to lie to the owner.
 *
 * Strategy :
 *   - Any table.openedAt older than MAX_HOURS hours is considered stale
 *   - Mark it NETTOYAGE, clear items, drop attached chairs
 *   - Append an entry to data/audit-log.json with reason "auto-closed-stale"
 */

import fs from 'fs'
import path from 'path'
import { getFloorState } from '../routes/floorState'

const MAX_HOURS = Number(process.env.STALE_TABLE_MAX_HOURS) || 8
const TICK_MS = 30 * 60 * 1000 // 30 min

const DATA_DIR = path.resolve(process.cwd(), 'data')
const AUDIT_FILE = path.join(DATA_DIR, 'audit-log.json')

interface AuditEntry {
  ts: number
  iso: string
  source: 'janitor.closeStaleFloorSessions'
  tableId: string
  reason: 'auto-closed-stale'
  hoursOpen: number
}

function appendAudit(entry: AuditEntry) {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })
  let log: AuditEntry[] = []
  if (fs.existsSync(AUDIT_FILE)) {
    try { log = JSON.parse(fs.readFileSync(AUDIT_FILE, 'utf8')) } catch { /* corrupt, restart */ }
  }
  log.unshift(entry) // newest first
  // Keep last 10 000 entries
  if (log.length > 10_000) log.length = 10_000
  fs.writeFileSync(AUDIT_FILE, JSON.stringify(log, null, 2), 'utf8')
}

export function startStaleSessionJanitor() {
  const tick = () => {
    try {
      const state = getFloorState()
      if (!state || !Array.isArray(state.tables)) return
      const now = Date.now()
      const cutoff = now - MAX_HOURS * 3600_000
      let closedCount = 0
      for (const t of state.tables) {
        if (t.openedAt && t.status === 'OCCUPEE' && t.openedAt < cutoff) {
          const hoursOpen = (now - t.openedAt) / 3600_000
          t.status = 'NETTOYAGE'
          t.items = []
          t.openedAt = undefined
          state.chairs = state.chairs.filter((c: any) => c.tableId !== t.id)
          state.updatedAt = now
          appendAudit({
            ts: now, iso: new Date(now).toISOString(),
            source: 'janitor.closeStaleFloorSessions',
            tableId: t.id, reason: 'auto-closed-stale',
            hoursOpen: Math.round(hoursOpen * 10) / 10,
          })
          closedCount++
        }
      }
      if (closedCount > 0) {
        // eslint-disable-next-line no-console
        console.log(`[janitor] auto-closed ${closedCount} stale table session(s) (> ${MAX_HOURS}h)`)
      }
    } catch (e: any) {
      // eslint-disable-next-line no-console
      console.warn('[janitor] tick failed:', e?.message || e)
    }
  }

  // Run after a short delay so the floorState route is fully loaded
  setTimeout(tick, 5_000)
  setInterval(tick, TICK_MS)
}
