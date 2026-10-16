import { z } from 'zod'
import type { Prisma } from '@prisma/client'
import { PosError } from './pos-ledger'
import { buildFinancialAllocation } from './service-allocation'
import { floorHash, sessionFor } from './floor-workspace'
import { getFloorState, commitCurrentFloor } from '../routes/floorState'
import { lockGuestTable } from './guest-visits'
import { activePaymentExists, lockOrderPayment } from './payments/ledger'
export const SHARE_PREFIX = 'guest:share:'
const id = z.string().min(1).max(100)
export const allocationSchema = z.object({ requestId: z.string().uuid(), orderId: id, expectedRevision: z.number().int().nonnegative(), reason: z.string().trim().min(10).max(1000),
  groups: z.array(z.object({ key: z.string().uuid(), tableId: id, label: z.string().trim().min(1).max(80), kitchenNote: z.string().max(500).default(''), barNote: z.string().max(500).default(''),
    lines: z.array(z.object({ itemId: id, qty: z.number().int().min(1).max(50) }).strict()).min(1).max(100) }).strict()).min(2).max(10),
  tenderDecisions: z.array(z.object({ tenderId: id, parts: z.array(z.object({ groupKey: z.string().uuid(), amountCents: z.number().int().positive().max(1_000_000_000) }).strict()).min(1).max(10) }).strict()).max(100),
}).strict()
export type AllocationInput = z.infer<typeof allocationSchema>
export const allocationConfirmation = allocationSchema.extend({ confirmHash: z.string().regex(/^[a-f0-9]{64}$/), managerAcknowledged: z.literal(true) }).strict()
const requestHash = (companyId: string, actorId: string, input: AllocationInput) => floorHash({ companyId, actorId, input })
export async function previousFinancialAllocation(tx: Prisma.TransactionClient, companyId: string, actorId: string, input: AllocationInput, confirmHash: string) {
  const row = await tx.serviceAllocation.findUnique({ where: { id: input.requestId } })
  if (row && (row.companyId !== companyId || row.actorId !== actorId || row.requestHash !== requestHash(companyId, actorId, input) || row.planHash !== confirmHash)) throw new PosError('Cette référence appartient à une autre allocation ou décision.', 409)
  return row ? tx.tableMovement.findUniqueOrThrow({ where: { id: input.requestId } }).then(m => m.snapshot) : null
}
export async function previewFinancialAllocation(tx: Prisma.TransactionClient, companyId: string, actorId: string, input: AllocationInput) {
  const floor = getFloorState()
  if (floor.updatedAt !== input.expectedRevision) throw new PosError('La salle a changé. Relisez les montants et validez un nouvel aperçu.', 409)
  const order = await tx.order.findFirst({ where: { companyId, id: input.orderId }, include: { items: { orderBy: { id: 'asc' } }, guestVisit: true } })
  if (!order) throw new PosError('Commande absente de cette société.', 404)
  if (order.source !== 'GUEST' || order.total <= 0 || order.paidAt || ['PAID', 'CANCELLED'].includes(order.status)) throw new PosError('Répartition réservée aux créances QR positives ouvertes. Les ventes et documents émis ne sont jamais réécrits.', 409)
  if (await tx.serviceAllocation.count({ where: { companyId, orderId: order.id } })) throw new PosError('Cette commande possède déjà une répartition. Consultez ses groupes ; aucune seconde allocation implicite.', 409)
  if (await tx.invoice.count({ where: { companyId, orderId: order.id, issuedAt: { not: null } } })) throw new PosError('Un document fiscal est déjà émis sur cette commande. Décision documentaire et corrections appropriées requises avant répartition ; aucun original ni PDF modifié.', 409)
  if (!order.guestVisit || order.guestVisit.closedAt || order.guestVisit.expiresAt.getTime() <= Date.now()) throw new PosError('Visite fermée ou expirée : décision de reprise responsable nécessaire, sans prolongation automatique.', 409)
  const tableIds = [...new Set([order.externalTableId!, ...input.groups.map(g => g.tableId)])].sort()
  for (const tableId of tableIds) {
    const table: any = floor.tables.find(t => t.id === tableId)
    if (!table) throw new PosError('Table absente de la salle de cette société.', 404)
    if (table.orderDiscount || table.offeredItemIds?.length) throw new PosError('Geste commercial de table non matérialisé : le responsable doit le traiter avant de répartir la créance historique. Aucun geste étendu à un autre groupe.', 409)
    await lockGuestTable(tx, companyId, tableId)
  }
  await lockOrderPayment(tx, companyId, order.id)
  const lockedOrder = await tx.order.findFirst({ where: { companyId, id: order.id }, include: { items: { orderBy: { id: 'asc' } }, guestVisit: true } })
  if (!lockedOrder || floorHash(JSON.parse(JSON.stringify(lockedOrder))) !== floorHash(JSON.parse(JSON.stringify(order)))) throw new PosError('La commande a changé pendant l’attente du verrou. Rechargez les lignes et décidez sur un nouvel aperçu ; aucune allocation effectuée.', 409)
  if (await activePaymentExists(tx, companyId, [order.id])) throw new PosError('Paiement en cours ou incertain : sa réservation reste intacte. Rapprochez-le avant toute allocation.', 409)
  if (await tx.refundAllocation.count({ where: { companyId, orderId: order.id } })) throw new PosError('Une provenance de remboursement existe : correction documentaire et décision de rapprochement requises, sans réaffectation silencieuse.', 409)
  const tenders = await tx.orderTender.findMany({ where: { companyId, orderId: order.id }, orderBy: { id: 'asc' } })
  if (await tx.manualRefund.count({ where: { companyId, tenderId: { in: tenders.map(t => t.id) } } })) throw new PosError('Remboursement déjà déclaré : traiter sa correction avant de répartir les groupes.', 409)
  let plan
  try { plan = buildFinancialAllocation(order, input.groups, tenders, input.tenderDecisions) }
  catch (e) { if (e instanceof RangeError) throw new PosError(e.message, 409); throw e }
  if (plan.groups.every(g => g.outstandingCents === 0)) throw new PosError('Le solde est déjà entièrement couvert mais la clôture de cet original reste à rapprocher. Aucune allocation ni vente inventée : vérification responsable requise.', 409)
  const confirmHash = floorHash({ requestHash: requestHash(companyId, actorId, input), plan, items: order.items, totals: [order.subtotal, order.taxAmount, order.total], tenders,
    originalVisit: { id: order.guestVisit.id, tableId: order.guestVisit.tableId, expiresAt: order.guestVisit.expiresAt.toISOString() } })
  return { plan, confirmHash, order, tenders }
}
export async function confirmFinancialAllocation(tx: Prisma.TransactionClient, companyId: string, actorId: string, input: AllocationInput, hash: string) {
  const current = await previewFinancialAllocation(tx, companyId, actorId, input)
  if (current.confirmHash !== hash) throw new PosError('Les prix, règlements ou décisions ont changé depuis l’aperçu. Aucune allocation confirmée : relisez puis décidez.', 409)
  const { plan, order } = current
  await tx.serviceAllocation.create({ data: { id: input.requestId, companyId, orderId: order.id, actorId, requestHash: requestHash(companyId, actorId, input), planHash: hash, snapshot: JSON.parse(JSON.stringify({ ...plan, reason: input.reason })) } })
  for (const g of plan.groups) {
    await tx.guestVisit.create({ data: { id: g.key, companyId, tableId: g.tableId, expiresAt: order.guestVisit!.expiresAt, openedBy: actorId } })
    await tx.serviceShare.create({ data: { id: g.key, companyId, orderId: order.id, allocationId: input.requestId, visitId: g.key, tableId: g.tableId, label: g.label, totalCents: g.totalCents, snapshot: g } })
    const session = await sessionFor(tx, companyId, g.tableId)
    await tx.serviceCover.create({ data: { companyId, sessionId: session.id, coverId: SHARE_PREFIX + g.key, orderId: order.id, items: g.lines, actorId, state: g.outstandingCents ? 'OPEN' : 'SETTLED' } })
  }
  if (plan.tenderParts.length) await tx.serviceShareTender.createMany({ data: plan.tenderParts.map(t => ({ companyId, orderId: order.id, shareId: t.groupKey, tenderId: t.tenderId, amountCents: t.amountCents })) })
  await tx.guestVisitAccess.updateMany({ where: { companyId, visitId: order.guestVisitId!, revokedAt: null }, data: { revokedAt: new Date(), revokeReason: 'financial-allocation:' + input.requestId } })
  // Les autres tournées ne deviennent pas celles des nouveaux groupes. Leur ancienne
  // visite reste renouvelable séparément ; si elle est vide, elle est clôturée.
  const otherOrders = await tx.order.count({ where: { companyId, guestVisitId: order.guestVisitId, serviceAllocation: null, id: { not: order.id }, paidAt: null, status: { not: 'CANCELLED' } } })
  if (!otherOrders) await tx.guestVisit.update({ where: { id: order.guestVisitId! }, data: { closedAt: new Date(), closedBy: actorId, closeReason: 'répartition financière explicite' } })
  await tx.serviceCover.updateMany({ where: { companyId, coverId: 'guest:' + order.id }, data: { state: 'CANCELLED', actorId } })
  await refreshAllocationTables(tx, companyId, [order.externalTableId!, ...plan.groups.map(g => g.tableId)])
  await commitCurrentFloor(tx, actorId, 'FINANCIAL_ALLOCATION')
  const result = { requestId: input.requestId, orderId: order.id, revision: getFloorState().updatedAt, groups: plan.groups.map(g => ({ id: g.key, visitId: g.key, tableId: g.tableId, label: g.label, totalCents: g.totalCents, paidCents: g.paidCents, outstandingCents: g.outstandingCents })),
    policy: plan.policy, originalSaleUnchanged: true, qrPolicy: 'original_revoked_new_visit_per_group', paymentPolicy: 'staff_manual_declarations_only' }
  await tx.tableMovement.create({ data: { id: input.requestId, companyId, actorId, requestHash: requestHash(companyId, actorId, input), snapshot: result } })
  return result
}

export async function serviceSharesFor(tx: Prisma.TransactionClient, companyId: string) {
  return tx.serviceShare.findMany({ where: { companyId }, include: { tenders: true, order: { select: { guestStatus: true, status: true, orderNumber: true, paidAt: true } } } })
}
export function shareBalance(share: { totalCents: number; tenders: { amountCents: number }[] }) {
  const paidCents = share.tenders.reduce((n, p) => n + p.amountCents, 0)
  if (paidCents > share.totalCents) throw new PosError('Ventilation de créance incohérente : rapprochement responsable requis.', 409)
  return { totalCents: share.totalCents, paidCents, outstandingCents: share.totalCents - paidCents }
}
export async function refreshAllocationTables(tx: Prisma.TransactionClient, companyId: string, tableIds: string[]) {
  const floor = getFloorState()
  const guests = await tx.order.findMany({ where: { companyId, source: 'GUEST', serviceAllocation: null, externalTableId: { in: tableIds }, paidAt: null, status: { notIn: ['PAID', 'CANCELLED'] } }, select: { externalTableId: true } })
  const shares = await tx.serviceShare.findMany({ where: { companyId, tableId: { in: tableIds } }, include: { tenders: true } })
  for (const t of floor.tables.filter(t => tableIds.includes(t.id))) {
    const occupied = t.items.length || floor.chairs.some(c => c.tableId === t.id && c.items.length) || guests.some(g => g.externalTableId === t.id) || shares.some(s => s.tableId === t.id && shareBalance(s).outstandingCents > 0)
    t.status = occupied ? 'OCCUPEE' : 'NETTOYAGE'
  }
}
