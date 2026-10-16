import { z } from 'zod'
import type { Prisma } from '@prisma/client'
import { PosError } from './pos-ledger'
import { floorHash, sessionFor } from './floor-workspace'
import { lockGuestTable } from './guest-visits'
import { lockOrderPayment } from './payments/ledger'
import { getFloorState, commitCurrentFloor, copySplitLineQuote } from '../routes/floorState'
import { rebaseKitchenAfterSeparation, nativeKitchenTables } from './kitchen-tickets'

const id = z.string().min(1).max(100)
export const separationSchema = z.object({ requestId: z.string().uuid(), kind: z.enum(['GROUP', 'LINES']), fromTableId: id, intoTableId: id,
  coverId: id, intoCoverId: id.optional(), expectedRevision: z.number().int().nonnegative(),
  lines: z.array(z.object({ id, qty: z.number().int().min(1).max(50) }).strict()).min(1).max(100).optional() }).strict()
export type Separation = z.infer<typeof separationSchema>
const hash = (companyId: string, actorId: string, input: Separation) => floorHash({ operation: 'SERVICE_SEPARATION', companyId, actorId, input })
export async function previousSeparation(tx: Prisma.TransactionClient, companyId: string, actorId: string, input: Separation) {
  const row = await tx.tableMovement.findUnique({ where: { id: input.requestId } })
  if (row && (row.companyId !== companyId || row.actorId !== actorId || row.requestHash !== hash(companyId, actorId, input))) throw new PosError('Référence de séparation déjà utilisée pour une autre opération.', 409)
  return row?.snapshot
}
function ambiguous(reason: string): never { throw new PosError(reason + ' Aucun montant déplacé. Conservez le groupe complet ; un responsable doit traiter la correction et ses justificatifs avant une découpe financière.', 409) }

/** Verrou société déjà acquis ; même ordre de verrous que paiements/transferts. */
export async function separateService(tx: Prisma.TransactionClient, companyId: string, actorId: string, input: Separation, tables: any[]) {
  const floor = getFloorState(), from: any = floor.tables.find(t => t.id === input.fromTableId), into: any = floor.tables.find(t => t.id === input.intoTableId)
  if (!from || !into) throw new PosError('Table absente de cet établissement.', 404)
  if (floor.updatedAt !== input.expectedRevision) throw new PosError('La salle a changé : rechargez avant de séparer les groupes.', 409)
  if (input.kind === 'GROUP' && (from.id === into.id || input.lines || input.intoCoverId) || input.kind === 'LINES' && !input.lines) throw new PosError('Sélection de séparation incohérente.')
  for (const tableId of [...new Set<string>([from.id, into.id])].sort()) await lockGuestTable(tx, companyId, tableId)
  const source = tables.find(t => t.id === from.id), destination = tables.find(t => t.id === into.id), cover = source?.covers.find((c: any) => c.id === input.coverId)
  if (!cover?.items.length) throw new PosError('Groupe absent, vide ou déjà réglé.', 409)
  if (input.kind === 'LINES' && input.coverId.startsWith('guest:')) ambiguous('Une commande QR reste une unité financière de son groupe ; déplacez toute la visite QR.')
  if (input.coverId.startsWith('seat:')) ambiguous('Cette addition est attachée à une chaise ; transférez la chaise complète dans le plan.')
  if ([from, into].some(t => t.orderDiscount || t.offeredItemIds?.length)) ambiguous('Remise globale ou article offert : sa répartition n’est pas déterminée.')
  if (from.id !== into.id && destination.covers.length && ['kitchenNote', 'barNote', 'orderNote', 'customerId'].some(k => (from[k] || '') !== (into[k] || ''))) ambiguous('Consignes cuisine/bar ou client société différents : ne les étendez pas à un autre groupe.')
  if (input.intoCoverId?.startsWith('guest:') || input.intoCoverId?.startsWith('seat:') || input.intoCoverId === input.coverId) ambiguous('La destination doit être un autre groupe natif, sans association implicite à une visite QR.')
  const visits = await tx.guestVisit.findMany({ where: { companyId, tableId: { in: [from.id, into.id] }, closedAt: null } })
  let visitIds: string[] = [], orderIds: string[] = [], coverIds = [cover.id], targetCoverId = input.intoCoverId || `split-${input.requestId}`
  const linked = await tx.serviceCover.findMany({ where: { companyId, coverId: { in: [cover.id, targetCoverId] }, state: 'OPEN' } })
  if (cover.id.startsWith('guest:')) {
    const order = await tx.order.findFirst({ where: { companyId, id: cover.id.slice(6), externalTableId: from.id, paidAt: null } })
    const visit = visits.find(v => v.id === order?.guestVisitId && v.tableId === from.id)
    if (!visit) ambiguous('Visite QR fermée ou ancienne commande non associée : renouvellement contrôlé requis.')
    visitIds = [visit.id]
    // Toutes les commandes du même groupe restent ensemble, y compris après plusieurs tournées.
    orderIds = (await tx.order.findMany({ where: { companyId, guestVisitId: visit.id, paidAt: null, status: { notIn: ['PAID', 'CANCELLED'] } } })).map(o => o.id).sort()
    coverIds = orderIds.map(id => 'guest:' + id); targetCoverId = cover.id
  } else {
    orderIds = linked.filter(c => c.coverId === cover.id).flatMap(c => c.orderId ? [c.orderId] : [])
    if (input.kind === 'LINES' && linked.some(c => c.orderId)) ambiguous('Un acompte ou une commande financière fige les lignes et son solde.')
  }
  for (const orderId of orderIds) await lockOrderPayment(tx, companyId, orderId)
  const paymentIds = (await tx.paymentAllocation.findMany({ where: { companyId, orderId: { in: orderIds }, active: true } })).map(a => a.attemptId)
  const before = structuredClone(tables), lineMoves: any[] = []
  const native = (t: any) => t.posCovers ||= t.items?.length ? [{ id: `table-${t.id}-${t.openedAt || 0}`, label: 'Table', items: t.items }] : []
  if (input.kind === 'GROUP') {
    if (!cover.id.startsWith('guest:')) {
      const list = native(from), index = list.findIndex((c: any) => c.id === cover.id)
      if (index < 0) throw new PosError('Couvert natif introuvable.', 409)
      if (native(into).some((c: any) => c.id === cover.id)) throw new PosError('Groupe déjà présent à destination.', 409)
      native(into).push(...list.splice(index, 1)); targetCoverId = cover.id
    }
    const targetSession = await sessionFor(tx, companyId, into.id)
    await tx.guestVisit.updateMany({ where: { companyId, id: { in: visitIds } }, data: { tableId: into.id } })
    await tx.order.updateMany({ where: { companyId, id: { in: orderIds }, paidAt: null }, data: { externalTableId: into.id } })
    for (const c of source.covers.filter((c: any) => coverIds.includes(c.id) && c.id.startsWith('guest:'))) await tx.serviceCover.upsert({ where: { companyId_coverId: { companyId, coverId: c.id } },
      create: { companyId, coverId: c.id, sessionId: targetSession.id, orderId: c.id.slice(6), items: c.items, actorId }, update: { sessionId: targetSession.id, actorId } })
  } else {
    const list = native(from), original = list.find((c: any) => c.id === cover.id)
    if (!original) throw new PosError('Groupe natif introuvable.', 409)
    const lines = input.lines!
    if (new Set(lines.map(l => l.id)).size !== lines.length) throw new PosError('Une ligne est sélectionnée deux fois.')
    let target = native(into).find((c: any) => c.id === targetCoverId)
    if (input.intoCoverId && !target) throw new PosError('Groupe de destination absent ou réglé.', 409)
    if (!target) { target = { id: targetCoverId, label: 'Groupe séparé', items: [] }; native(into).push(target) }
    for (const selected of lines) {
      const line = original.items.find((i: any) => i.id === selected.id)
      if (!line || selected.qty > line.qty) throw new PosError('Quantité absente ou supérieure à celle enregistrée. Rechargez.', 409)
      const moved = { ...line, qty: selected.qty, coverId: targetCoverId }
      if (selected.qty < line.qty) {
        moved.id = `${input.requestId}:${lines.indexOf(selected)}`
        copySplitLineQuote(line.id, moved.id)
        floor.lineOrigins ||= {}; floor.lineOrigins[moved.id] = floor.lineOrigins[line.id] || line.id
        line.qty -= selected.qty
      } else original.items.splice(original.items.indexOf(line), 1)
      target.items.push(moved)
      lineMoves.push({ sourceLineId: selected.id, targetLineId: moved.id, originLineId: floor.lineOrigins?.[moved.id] || selected.id, qty: selected.qty, price: line.price, taxRate: line.taxRate })
    }
    from.posCovers = list.filter((c: any) => c.items.length)
  }
  if (from.id !== into.id && !destination.covers.length) for (const key of ['openedAt', 'kitchenNote', 'barNote', 'orderNote', 'customerId', 'waiterId']) if (from[key] !== undefined) into[key] = from[key]
  for (const t of [from, into]) { t.items = native(t).flatMap((c: any) => c.items); t.status = 'OCCUPEE' }
  const remainingGuest = await tx.order.count({ where: { companyId, source: 'GUEST', externalTableId: from.id, paidAt: null, status: { notIn: ['PAID', 'CANCELLED'] } } })
  if (!from.items.length && !remainingGuest && !floor.chairs.some(c => c.tableId === from.id && c.items.length)) { from.status = 'NETTOYAGE'; from.orderNote = ''; from.kitchenNote = ''; from.barNote = ''; from.customerId = null; delete from.openedAt }
  const affected = [...new Set([...visitIds, ...visits.filter(v => v.tableId === into.id).map(v => v.id)])]
  const revoked = await tx.guestVisitAccess.updateMany({ where: { companyId, visitId: { in: affected }, revokedAt: null }, data: { revokedAt: new Date(), revokeReason: 'service-separation:' + input.requestId } })
  // Seul le routage change : aucun nouveau lot de préparation ni mouvement de stock.
  rebaseKitchenAfterSeparation(floor, before, nativeKitchenTables(floor), new Set([cover.id, targetCoverId]))
  await commitCurrentFloor(tx, actorId, 'SERVICE_SEPARATION')
  const result = { requestId: input.requestId, kind: input.kind, fromTableId: from.id, intoTableId: into.id, targetCoverId, coverIds, orderIds, visitIds, paymentIds: [...new Set(paymentIds)], lineMoves,
    revision: floor.updatedAt, revokedAccessCount: revoked.count, qrPolicy: 'affected_visits_revoked_renew_each_group', moneyPolicy: 'financial_identities_and_allocations_unchanged' }
  await tx.tableMovement.create({ data: { id: input.requestId, companyId, actorId, requestHash: hash(companyId, actorId, input), snapshot: result } })
  return result
}
