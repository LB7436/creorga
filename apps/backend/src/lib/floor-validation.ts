import { z } from 'zod'
import { coverSchema } from './pos-ledger'

const id = z.string().min(1).max(100)
const number = z.number().finite()
const coordinate = number.min(-100000).max(100000)
const image = z.string().max(3_000_000).regex(/^data:image\/(png|jpe?g|webp|gif);base64,[a-zA-Z0-9+/=]+$/)
const status = z.enum(['LIBRE', 'OCCUPEE', 'RESERVEE', 'NETTOYAGE'])
const item = z.object({ id, name: z.string().min(1).max(160), price: number.min(0).max(1e6), qty: number.int().min(1).max(99), addedAt: number, note: z.string().max(1000).optional() }).passthrough()
export const floorSchema = z.object({
  tables: z.array(z.object({ id, name: z.string().min(1).max(60), seats: number.int().min(1).max(30), section: z.string().min(1).max(100), shape: z.enum(['round', 'square', 'rect', 'bar']), status, x: coordinate, y: coordinate,
    items: z.array(item).max(10000), posCovers: z.array(coverSchema).max(100).optional(), openedAt: number.optional() }).passthrough()).max(300),
  chairs: z.array(z.object({ id, label: z.string().max(100), tableId: id.nullable(), items: z.array(item).max(100), x: coordinate.optional(), y: coordinate.optional() }).passthrough()).max(9000),
  zones: z.array(z.object({ id, name: z.string().min(1).max(100), color: z.string().regex(/^#[0-9a-f]{6}$/i).optional(), backgroundImage: image.optional() }).passthrough()).max(100),
  photos: z.array(z.object({ id, dataUrl: image, x: coordinate, y: coordinate, w: number.positive().max(10000), h: number.positive().max(10000) }).passthrough()).max(100),
  globalBackground: image.optional(), updatedAt: number,
}).passthrough().superRefine((floor, ctx) => {
  for (const list of [floor.tables, floor.chairs, floor.zones, floor.photos]) {
    if (new Set(list.map(x => x.id)).size !== list.length) ctx.addIssue({ code: 'custom', message: 'Identifiant en double dans le plan.' })
  }
  if (floor.chairs.some(c => c.tableId && !floor.tables.some(t => t.id === c.tableId))) ctx.addIssue({ code: 'custom', message: 'Une chaise désigne une table inexistante.' })
})

/** Les entrées caisse restent la propriété du serveur, jamais d'un import de plan. */
export function protectedFloorFieldsChanged(before: any, body: any): boolean {
  for (const key of ['posEditor', 'kitchenTickets']) if (key in body && JSON.stringify(body[key]) !== JSON.stringify(before[key])) return true
  return Array.isArray(body.tables) && body.tables.some((t: any) => t.posCovers !== undefined && JSON.stringify(t.posCovers) !== JSON.stringify(before.tables.find((old: any) => old.id === t.id)?.posCovers))
}
