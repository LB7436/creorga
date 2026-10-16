import { z } from 'zod'
import type { Prisma } from '@prisma/client'
import { floorHash, sessionFor } from './floor-workspace'
import { PosError } from './pos-ledger'
import { lockGuestTable } from './guest-visits'
import { lockOrderPayment } from './payments/ledger'
import { getFloorState, commitCurrentFloor } from '../routes/floorState'
import { nativeKitchenTables, rebaseKitchenAfterSeparation } from './kitchen-tickets'

export const tableMovementSchema = z.object({ requestId: z.string().uuid(), kind: z.enum(['TRANSFER', 'MERGE']),
  fromTableId: z.string().min(1).max(100), intoTableId: z.string().min(1).max(100), expectedRevision: z.number().int().nonnegative() }).strict()
export type TableMove = z.infer<typeof tableMovementSchema>
export const movementHash = (companyId: string, actorId: string, input: TableMove) => floorHash({ companyId, actorId, ...input })
export async function previousMovement(tx: Prisma.TransactionClient, companyId: string, actorId: string, input: TableMove) {
  const prior = await tx.tableMovement.findUnique({ where: { id: input.requestId } })
  if (prior && (prior.companyId !== companyId || prior.requestHash !== movementHash(companyId, actorId, input))) throw new PosError('Référence de transfert réutilisée pour une autre opération.', 409)
  return prior?.snapshot
}
/** Appel sous verrou société, puis tables triées et commandes triées. Aucun appel externe. */
export async function moveTable(tx: Prisma.TransactionClient, companyId: string, actorId: string, input: TableMove, tables: any[]) {
  const floor = getFloorState(), from: any = floor.tables.find(t => t.id === input.fromTableId), into: any = floor.tables.find(t => t.id === input.intoTableId)
  if (!from || !into) throw new PosError('Table absente de cet établissement.', 404)
  if (from.id === into.id) throw new PosError('La destination doit être une autre table.', 409)
  if (floor.updatedAt !== input.expectedRevision) throw new PosError('La salle a changé : rechargez avant de déplacer les additions.', 409)
  for (const id of [from.id, into.id].sort()) await lockGuestTable(tx, companyId, id)
  const source = tables.find(t => t.id === from.id), destination = tables.find(t => t.id === into.id)
  if (input.kind === 'TRANSFER' && destination?.covers.some((c: any) => c.items.length)) throw new PosError('Destination occupée : utilisez Fusionner en conservant les groupes séparés.', 409)
  const visits = await tx.guestVisit.findMany({ where: { companyId, tableId: { in: [from.id, into.id] }, closedAt: null }, orderBy: { id: 'asc' } })
  const sourceVisits = visits.filter(v => v.tableId === from.id)
  if (!source?.covers.length && !sourceVisits.length) throw new PosError('Aucune addition ni visite à transférer.', 409)
  // Pas d'allocation arbitraire d'un geste commercial à un autre groupe.
  if (destination?.covers.length && [from, into].some(t => t.orderDiscount || t.offeredItemIds?.length)) throw new PosError('Réglez séparément les gestes commerciaux avant cette fusion ; aucune remise ne sera perdue ou étendue à un autre groupe.', 409)
  if (destination?.covers.length && (from.kitchenNote || '') !== (into.kitchenNote || '')) throw new PosError('Consignes cuisine globales différentes : conservez les additions séparées pour ne pas envoyer une correction de préparation à un autre groupe.', 409)
  const metadata = (t: any) => Object.fromEntries(['id', 'name', 'openedAt', 'customerId', 'waiterId', 'orderNote', 'kitchenNote', 'orderDiscount', 'offeredItemIds'].map(k => [k, t[k] ?? null]))
  const originalTables = { from: metadata(from), into: metadata(into) }
  const covers = [...(source?.covers || []), ...(destination?.covers || [])]
  if (new Set(covers.map(c => c.id)).size !== covers.length) throw new PosError('Un couvert figure déjà dans les deux additions.', 409)
  const guestIds = (source?.covers || []).filter((c: any) => c.id.startsWith('guest:')).map((c: any) => c.id.slice(6))
  const linked = await tx.serviceCover.findMany({ where: { companyId, coverId: { in: (source?.covers || []).map((c: any) => c.id) }, state: 'OPEN' } })
  const orderIds: string[] = [...new Set<string>([...guestIds, ...linked.flatMap(c => c.orderId ? [c.orderId] : [])])].sort()
  for (const id of orderIds) await lockOrderPayment(tx, companyId, id)
  const paymentIds = (await tx.paymentAllocation.findMany({ where: { companyId, orderId: { in: orderIds }, active: true }, select: { attemptId: true } })).map(a => a.attemptId)
  const beforeSessions = await tx.serviceSession.findMany({ where: { companyId, tableId: { in: [from.id, into.id] }, closedAt: null }, select: { id: true, tableId: true } })
  // Toutes les capacités des deux groupes sont invalidées. Aucun QR fusionné.
  const visitIds = visits.map(v => v.id)
  const revoked = await tx.guestVisitAccess.updateMany({ where: { companyId, visitId: { in: visitIds }, revokedAt: null }, data: { revokedAt: new Date(), revokeReason: 'table-movement:' + input.requestId } })
  await tx.guestVisit.updateMany({ where: { companyId, id: { in: sourceVisits.map(v => v.id) } }, data: { tableId: into.id } })
  // Localisation courante uniquement : aucune vente payée, référence bancaire,
  // affectation ni montant historique n'est modifié.
  await tx.order.updateMany({ where: { companyId, id: { in: orderIds }, paidAt: null, status: { notIn: ['PAID', 'CANCELLED'] } }, data: { externalTableId: into.id } })
  const targetSession = await sessionFor(tx, companyId, into.id)
  for (const c of (source?.covers || []).filter((c: any) => c.id.startsWith('guest:'))) await tx.serviceCover.upsert({
    where: { companyId_coverId: { companyId, coverId: c.id } }, create: { companyId, coverId: c.id, sessionId: targetSession.id, orderId: c.id.slice(6), items: c.items, actorId },
    update: { sessionId: targetSession.id, actorId } })
  if (!destination?.covers.length) for (const key of ['openedAt', 'orderDiscount', 'offeredItemIds', 'customerId', 'waiterId', 'orderNote', 'kitchenNote']) into[key] = from[key]
  const native = (t: any) => t.posCovers || (t.items?.length ? [{ id: `table-${t.id}-${t.openedAt || 0}`, label: 'Table', items: t.items }] : [])
  into.posCovers = [...native(into), ...native(from)]; into.items = into.posCovers.flatMap((c: any) => c.items)
  from.posCovers = []; from.items = []; from.status = 'NETTOYAGE'
  delete from.openedAt; from.orderDiscount = null; from.offeredItemIds = []; from.customerId = null; delete from.waiterId; from.orderNote = ''; from.kitchenNote = ''
  into.status = 'OCCUPEE'
  for (const chair of floor.chairs) if (chair.tableId === from.id) chair.tableId = into.id
  // Déplacer l'étiquette du ticket, pas renvoyer la commande ou sa correction.
  const coverIds = (source?.covers || []).map((c: any) => c.id)
  for (const ticket of Object.values(floor.kitchenTickets || {}) as any[]) if (coverIds.includes(ticket.coverId || ticket.id)) ticket.tableName = into.name
  if (floor.kitchenBaselines) rebaseKitchenAfterSeparation(floor, tables, nativeKitchenTables(floor), new Set(coverIds))
  await commitCurrentFloor(tx, actorId, 'TABLE_' + input.kind)
  const snapshot = { requestId: input.requestId, kind: input.kind, fromTableId: from.id, intoTableId: into.id, revision: floor.updatedAt,
    coverIds, orderIds, visitIds, paymentIds: [...new Set(paymentIds)], previousSessions: beforeSessions, targetSessionId: targetSession.id,
    originalTables, revokedAccessCount: revoked.count, qrPolicy: 'all_affected_links_revoked_renew_each_visit_separately' }
  await tx.tableMovement.create({ data: { id: input.requestId, companyId, actorId, requestHash: movementHash(companyId, actorId, input), snapshot } })
  return snapshot
}
