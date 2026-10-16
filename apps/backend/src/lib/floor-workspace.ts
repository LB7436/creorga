import { createHash } from 'node:crypto'
import type { Prisma } from '@prisma/client'
import prisma from './prisma'
import { floorSchema } from './floor-validation'
import { lockFinancialCompany } from './financial-lock'
import { floorLines } from './pos-pricing'

export class WorkspaceError extends Error {
  constructor(public status: number, message: string) { super(message) }
}
export const postgresFloorEnabled = () => process.env.CREORGA_FLOOR_AUTHORITY === 'postgres'
// JSONB peut réordonner les clés : empreinte canonique, indépendante de cet ordre.
const canonical = (v: any): any => Array.isArray(v) ? v.map(canonical) : v && typeof v === 'object'
  ? Object.fromEntries(Object.keys(v).sort().map(k => [k, canonical(v[k])])) : v
export const floorHash = (v: unknown) => createHash('sha256').update(JSON.stringify(canonical(v))).digest('hex')

export const coverFingerprint = (items: any[]) => floorHash(items.map(i => ({ id: i.id, productId: i.menuItemId || i.productId, name: i.name,
  price: i.price, qty: i.qty, note: i.note || '', taxRate: i.taxRate })).sort((a, b) => a.id.localeCompare(b.id)))

export async function sessionFor(tx: Prisma.TransactionClient, companyId: string, tableId: string) {
  return await tx.serviceSession.findFirst({ where: { companyId, tableId, closedAt: null } })
    || tx.serviceSession.create({ data: { companyId, tableId } })
}
async function syncCovers(tx: Prisma.TransactionClient, companyId: string, draft: any, actorId: string) {
  const current = await tx.serviceCover.findMany({ where: { companyId, state: 'OPEN', NOT: { coverId: { startsWith: 'guest:' } } } })
  const seen = new Set<string>()
  const entries = (draft.tables || []).flatMap((t: any) => (t.posCovers || (t.items?.length ? [{ id: `table-${t.id}-${t.openedAt || 0}`, items: t.items }] : []))
    .filter((c: any) => c.items.length && !c.id.startsWith('guest:')).map((c: any) => ({ tableId: t.id, ...c })))
  for (const c of draft.chairs || []) if (c.items?.length) entries.push({ tableId: c.tableId || `standalone-seat:${c.id}`, id: `seat:${c.id}:${c.createdAt || c.openedAt || 0}`, items: c.items })
  for (const c of entries) {
    if (seen.has(c.id)) throw new WorkspaceError(409, 'Un couvert ne peut appartenir à deux sessions.')
    seen.add(c.id)
    const previous = current.find(p => p.coverId === c.id)
    if (previous?.orderId && coverFingerprint(previous.items as any[]) !== coverFingerprint(c.items)) throw new WorkspaceError(409, 'Un acompte existe : les lignes sont figées. Conservez ce couvert et ajoutez une autre tournée séparément.')
    const session = await sessionFor(tx, companyId, c.tableId)
    await tx.serviceCover.upsert({ where: { companyId_coverId: { companyId, coverId: c.id } },
      create: { companyId, coverId: c.id, sessionId: session.id, items: c.items, actorId },
      update: { sessionId: session.id, items: c.items, actorId } })
    if (previous?.orderId) await tx.order.updateMany({ where: { id: previous.orderId, companyId, paidAt: null, status: { not: 'CANCELLED' } }, data: { externalTableId: c.tableId } })
  }
  for (const previous of current) if (!seen.has(previous.coverId)) {
    const paid = await tx.posCoverPayment.findUnique({ where: { companyId_coverId: { companyId, coverId: previous.coverId } } })
    if (previous.orderId && !paid) throw new WorkspaceError(409, 'Un couvert avec acompte ne peut être supprimé ni fusionné destructivement. Transférez son identité complète.')
    await tx.serviceCover.update({ where: { id: previous.id }, data: { state: paid ? 'SETTLED' : 'CANCELLED', actorId } })
  }
  for (const s of await tx.serviceSession.findMany({ where: { companyId, closedAt: null } })) if (!await tx.serviceCover.count({ where: { companyId, sessionId: s.id, state: 'OPEN' } })) await tx.serviceSession.update({ where: { id: s.id }, data: { closedAt: new Date() } })
}

function checked(snapshot: any, expectedHash?: string) {
  if (!floorSchema.safeParse(snapshot).success || !Number.isSafeInteger(snapshot.updatedAt) || snapshot.updatedAt < 0 || expectedHash && floorHash(snapshot) !== expectedHash) {
    throw new WorkspaceError(503, 'Session PostgreSQL incohérente : récupération nécessaire, aucun repli sur un ancien fichier.')
  }
  return snapshot
}
export async function loadFloorWorkspace(companyId: string, legacy: () => any) {
  let row = await prisma.floorWorkspace.findUnique({ where: { companyId } })
  if (!row) row = await prisma.$transaction(async tx => {
    await lockFinancialCompany(tx, companyId)
    const existing = await tx.floorWorkspace.findUnique({ where: { companyId } })
    if (existing) return existing
    const initial = JSON.parse(JSON.stringify(checked(legacy())))
    const snapshot = { ...initial, storageAuthority: 'postgres' }
    const created = await tx.floorWorkspace.create({ data: { companyId, revision: BigInt(snapshot.updatedAt), snapshot, snapshotHash: floorHash(snapshot), initialSnapshot: initial, initialHash: floorHash(initial) } })
    await syncCovers(tx, companyId, snapshot, 'adoption-locale')
    return created
  })
  const snapshot = checked(row.snapshot, row.snapshotHash)
  if (Number(row.revision) !== snapshot.updatedAt) throw new WorkspaceError(503, 'Version de session incohérente.')
  return snapshot
}
function lineLocations(floor: any) {
  const result = new Map<string, any>()
  for (const table of floor.tables || []) for (const cover of table.posCovers || []) for (const item of cover.items || []) result.set(item.id, { tableId: table.id, coverId: cover.id, quantity: item.qty, productId: item.menuItemId || item.productId })
  for (const table of floor.tables || []) if (!table.posCovers) for (const item of table.items || []) result.set(item.id, { tableId: table.id, quantity: item.qty, productId: item.productId })
  for (const chair of floor.chairs || []) for (const item of chair.items || []) result.set(item.id, { tableId: chair.tableId, chairId: chair.id, quantity: item.qty, productId: item.menuItemId || item.productId })
  return result
}
export async function saveFloorWorkspace(tx: Prisma.TransactionClient, companyId: string, before: any, draft: any, actorId: string, action: string) {
  await lockFinancialCompany(tx, companyId)
  checked(draft)
  if (new Set(floorLines(draft).map(i => i.id)).size !== floorLines(draft).length) throw new WorkspaceError(409, 'Une ligne ne peut appartenir à deux additions.')
  const previous = lineLocations(before), next = lineLocations(draft)
  const delta = [...new Set([...previous.keys(), ...next.keys()])].flatMap(id => JSON.stringify(previous.get(id)) === JSON.stringify(next.get(id)) ? [] : [{ lineId: id, before: previous.get(id) || null, after: next.get(id) || null }])
  const beforeHash = floorHash(before), afterHash = floorHash(draft)
  const result = await tx.floorWorkspace.updateMany({ where: { companyId, revision: BigInt(before.updatedAt), snapshotHash: beforeHash }, data: { revision: BigInt(draft.updatedAt), snapshot: JSON.parse(JSON.stringify(draft)), snapshotHash: afterHash, updatedAt: new Date() } })
  if (!result.count) throw new WorkspaceError(409, 'La salle a changé dans une autre caisse. Rechargez : aucune ligne ni écriture n’a été écrasée.')
  await syncCovers(tx, companyId, draft, actorId)
  await tx.floorChange.create({ data: { companyId, revision: BigInt(draft.updatedAt), actorId, action: action.slice(0, 200), beforeHash, afterHash, delta } })
}
