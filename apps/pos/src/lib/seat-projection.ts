import type { Cover, OrderItem, Table } from '../store/posStore'
import type { Seat } from '../store/seatStore'

export class SeatProjectionError extends Error {
  readonly status = 409
  constructor() { super('La place et son groupe affiché divergent. Le brouillon reste conservé ; rapprochez explicitement ses lignes avant toute sauvegarde.') }
}
export const seatCoverId = (seat: Seat) => `seat:${seat.id}:${seat.createdAt}`
const signature = (items: OrderItem[]) => JSON.stringify(items.map(item => [item.id, item.menuItemId, item.name,
  Math.round((item.price + Number.EPSILON) * 100), item.qty, item.note || '', item.taxRate ?? null]).sort((a, b) => String(a[0]).localeCompare(String(b[0]))))

/** Refus, jamais choix implicite, d'un ancien brouillon à deux autorités. */
export function assertSeatProjection(tables: Table[], seats: Seat[]) {
  const byCover = new Map(seats.map(seat => [seatCoverId(seat), seat])), projected = new Set<string>()
  for (const table of tables) for (const cover of table.covers) if (cover.id.startsWith('seat:')) {
    const seat = byCover.get(cover.id)
    if (!seat || seat.tableId !== table.id || projected.has(cover.id) || signature(cover.items) !== signature(seat.items)) throw new SeatProjectionError()
    projected.add(cover.id)
  }
  for (const [id, seat] of byCover) if (seat.tableId !== null && seat.items.length && !projected.has(id)) throw new SeatProjectionError()
}

/** Couverts de lecture dérivés exclusivement des chaises, sans nouveaux identifiants de ligne. */
export function projectSeatCovers(tables: Table[], seats: Seat[]): Table[] {
  const byTable = new Map<string, Seat[]>(), identities = new Set(seats.map(seatCoverId))
  for (const seat of seats) if (seat.tableId !== null && seat.items.length) {
    const group = byTable.get(seat.tableId) || []
    group.push(seat); byTable.set(seat.tableId, group)
  }
  let changed = false
  const next = tables.map(table => {
    const old = new Map(table.covers.map(cover => [cover.id, cover]))
    const projected: Cover[] = (byTable.get(table.id) || []).map(seat => {
      const id = seatCoverId(seat), previous = old.get(id)
      return { ...previous, id, label: seat.customerName || previous?.label || (seat as Seat & { label?: string }).label || `Place ${(seat.position ?? 0) + 1}`,
        items: seat.items.map(item => ({ ...item, coverId: id })) }
    })
    // Une projection orpheline non vide n'est jamais effacée en cache : elle
    // reste visible et sera explicitement refusée par la sérialisation.
    const unresolved = table.covers.filter(cover => cover.id.startsWith('seat:') && !identities.has(cover.id) && cover.items.length)
    const covers = [...table.covers.filter(cover => !cover.id.startsWith('seat:')), ...projected, ...unresolved]
    const status = projected.some(cover => !cover.paidAt && cover.items.length) ? 'occupied' as const : table.status
    if (status === table.status && JSON.stringify(covers) === JSON.stringify(table.covers)) return table
    changed = true
    return { ...table, covers, status }
  })
  return changed ? next : tables
}
