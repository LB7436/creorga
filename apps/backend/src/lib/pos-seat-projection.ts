import { PosError, type PosTable } from './pos-ledger'
import { floorHash } from './floor-workspace'
import { moneyMinor } from './money'

type SeatDraft = { id: string; tableId: string | null; createdAt: number; items: PosTable['covers'][number]['items'] }
const signature = (items: SeatDraft['items']) => floorHash(items.map(item => [item.id, item.menuItemId, item.name,
  moneyMinor(item.price), item.qty, item.note || '', item.taxRate ?? null]).sort((a, b) => String(a[0]).localeCompare(String(b[0]))))

/** Les chaises sont l'autorité ; leurs couverts ne sont qu'une vue de lecture. */
export function assertSeatProjection(tables: PosTable[], seats: SeatDraft[] | undefined) {
  const byCover = new Map((seats || []).map(seat => [`seat:${seat.id}:${seat.createdAt}`, seat]))
  const projected = new Set<string>()
  const refuse = () => { throw new PosError('La place et son groupe affiché divergent. Conservez le brouillon et rapprochez explicitement les lignes avant de sauvegarder : aucune consommation n’a été ignorée.', 409) }
  for (const table of tables) for (const cover of table.covers) if (cover.id.startsWith('seat:')) {
    const seat = byCover.get(cover.id)
    if (!seat || seat.tableId !== table.id || projected.has(cover.id) || signature(cover.items) !== signature(seat.items)) refuse()
    projected.add(cover.id)
  }
  for (const [coverId, seat] of byCover) if (seat.tableId !== null && seat.items.length && !projected.has(coverId)) refuse()
}
