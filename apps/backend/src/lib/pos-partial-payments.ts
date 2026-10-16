import { randomUUID } from 'node:crypto'
import { z } from 'zod'
import type { Prisma } from '@prisma/client'
import { PosError, calculateSale, type PosTable } from './pos-ledger'
import { moneyMinor, allocateMinor, totalsFromTtc } from './money'
import { orderPaymentBalance } from './order-tenders'
import { activeCashDrawerId } from './cash-ledger'
import { activePaymentExists, lockOrderPayment } from './payments/ledger'
import { debitOrderInventory } from './order-inventory'
import { coverFingerprint, floorHash, sessionFor } from './floor-workspace'
import { getFloorState, commitCurrentFloor } from '../routes/floorState'
import { SHARE_PREFIX } from './financial-allocations'
import { payServiceShare } from './share-payments'

export const partialPaymentSchema = z.object({
  requestId: z.string().uuid(), tableId: z.string().min(1).max(100), coverIds: z.array(z.string().min(1).max(100)).min(1).max(100),
  amountCents: z.number().int().positive().max(1_000_000_000), expectedOutstandingCents: z.number().int().positive().max(1_000_000_000),
  method: z.enum(['CASH', 'CARD', 'MIXED']), cashReceivedCents: z.number().int().min(0).max(1_000_000_000).optional(),
  allocations: z.array(z.object({ method: z.enum(['CASH', 'CARD']), amountCents: z.number().int().positive().max(1_000_000_000) }).strict()).min(2).max(10).optional(),
}).strict()
type Input = z.infer<typeof partialPaymentSchema>
export type PartialInput = Input

/** Appelé sous verrou financier société. Aucun appel prestataire : déclaration manuelle explicite. */
export async function payPosPart(tx: Prisma.TransactionClient, companyId: string, actorId: string, input: Input, table: PosTable | undefined) {
  const hash = floorHash(input)
  const previous = await tx.paymentAttempt.findUnique({ where: { companyId_requestId: { companyId, requestId: input.requestId } } })
  if (previous) {
    if (previous.scope !== 'POS_PARTIAL' || previous.userId !== actorId || previous.requestHash !== hash) throw new PosError('Cette référence appartient à un autre règlement ou utilisateur.', 409)
    return previous.response
  }
  if (input.coverIds.some(c => c.startsWith(SHARE_PREFIX))) return payServiceShare(tx, companyId, actorId, input, table)
  const covers = table?.covers.filter(c => input.coverIds.includes(c.id)) || []
  if (!table || covers.length !== new Set(input.coverIds).size || covers.length !== input.coverIds.length || covers.some(c => !c.items.length)) throw new PosError('Couverts absents ou déjà réglés. Actualisez.', 409)
  if (table.orderDiscount || table.offeredItemIds?.length) throw new PosError('Les acomptes ne recalculent pas les gestes commerciaux. Validez d’abord les lignes sans remise, ou utilisez le règlement complet habituel.', 409)
  const orders = []
  for (const c of [...covers].sort((a, b) => a.id.localeCompare(b.id))) {
    let linked = await tx.serviceCover.findUnique({ where: { companyId_coverId: { companyId, coverId: c.id } } })
    if (linked?.state !== undefined && linked.state !== 'OPEN') throw new PosError('Ce couvert n’est plus ouvert.', 409)
    let order = await tx.order.findFirst({ where: { companyId, id: c.id.startsWith('guest:') ? c.id.slice(6) : linked?.orderId || '__absent__' }, include: { items: true } })
    if (!order) {
      if (c.id.startsWith('guest:')) throw new PosError('Commande QR absente.', 409)
      if (c.items.some(i => i.pricingStatus !== 'confirmed' || i.taxRate === undefined)) throw new PosError('Une ligne nécessite une revue du tarif historique.', 409)
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${companyId}), hashtext('order-number'))::text`
      const last = await tx.order.findFirst({ where: { companyId }, orderBy: { orderNumber: 'desc' } })
      const a = calculateSale(c.items.map(i => ({ ...i, taxRate: i.taxRate! })), 0, 0, 0)
      order = await tx.order.create({ data: { companyId, userId: actorId, source: 'POS', externalTableId: table.id, customerId: table.customerId || null,
        notes: table.orderNote || null, orderNumber: (last?.orderNumber || 0) + 1, subtotal: a.sousTotal, taxAmount: a.tva, total: a.total,
        items: { create: c.items.map(i => ({ sourceLineId: i.id, productId: i.menuItemId, productName: i.name, quantity: i.qty, unitPrice: i.price, taxRate: i.taxRate!, notes: i.note })) } }, include: { items: true } })
    }
    if (order.paidAt || ['PAID', 'CANCELLED'].includes(order.status)) throw new PosError('La commande est déjà réglée ou annulée.', 409)
    if (!c.id.startsWith('guest:') && linked?.orderId && coverFingerprint(linked.items as any[]) !== coverFingerprint(c.items)) throw new PosError('Les lignes avec acompte ne peuvent être réécrites.', 409)
    const session = await sessionFor(tx, companyId, table.id)
    linked = await tx.serviceCover.upsert({ where: { companyId_coverId: { companyId, coverId: c.id } },
      create: { companyId, coverId: c.id, sessionId: session.id, orderId: order.id, actorId, items: c.items },
      update: { sessionId: session.id, orderId: order.id, items: c.items, actorId } })
    orders.push({ order, cover: c })
  }
  for (const id of orders.map(o => o.order.id).sort()) await lockOrderPayment(tx, companyId, id)
  if (await activePaymentExists(tx, companyId, orders.map(o => o.order.id))) throw new PosError('Un paiement est en cours ou incertain. Vérifiez-le avant une autre déclaration.', 409)
  const balances = await Promise.all(orders.map(o => orderPaymentBalance(tx, companyId, o.order)))
  const outstanding = balances.reduce((n, b) => n + b.outstandingCents, 0)
  if (outstanding !== input.expectedOutstandingCents || input.amountCents > outstanding) throw new PosError('Le solde serveur a changé. Aucun nouveau règlement créé : actualisez.', 409)
  const methods = input.method === 'MIXED' ? input.allocations || [] : [{ method: input.method, amountCents: input.amountCents }]
  if (input.method !== 'MIXED' && input.allocations || methods.reduce((n, p) => n + p.amountCents, 0) !== input.amountCents) throw new PosError('Ventilation mixte incorrecte.')
  const cash = methods.filter(p => p.method === 'CASH').reduce((n, p) => n + p.amountCents, 0), received = input.cashReceivedCents ?? cash
  if (cash && received < cash || !cash && received) throw new PosError('Espèces reçues incohérentes.')
  const company = await tx.company.findUniqueOrThrow({ where: { id: companyId } })
  const attempt = await tx.paymentAttempt.create({ data: { companyId, orderId: orders[0].order.id, tableId: table.id, scope: 'POS_PARTIAL', userId: actorId,
    requestId: input.requestId, requestHash: hash, provider: 'manual', merchantId: `manual:${companyId}`, amountCents: input.amountCents, currency: company.currency, status: 'DECLARED' } })
  const remaining = balances.map(b => b.outstandingCents), cashDrawerId = await activeCashDrawerId(tx, companyId)
  for (const method of ['CASH', 'CARD']) {
    const amount = methods.filter(p => p.method === method).reduce((n, p) => n + p.amountCents, 0)
    const portions = allocateMinor(amount, remaining), receivedParts = allocateMinor(method === 'CASH' ? received : 0, portions), changeParts = allocateMinor(method === 'CASH' ? received - cash : 0, portions)
    for (let i = 0; i < orders.length; i++) if (portions[i]) {
      await tx.orderTender.create({ data: { companyId, orderId: orders[i].order.id, actorId, attemptId: attempt.id, method, amountCents: portions[i], confirmation: 'manual_declaration', cashDrawerId,
        cashReceivedCents: method === 'CASH' ? receivedParts[i] : null, cashChangeCents: method === 'CASH' ? changeParts[i] : null } })
      remaining[i] -= portions[i]
    }
  }
  const sales: any[] = [], finalBalances = []
  for (let i = 0; i < orders.length; i++) {
    const { order, cover } = orders[i], b = await orderPaymentBalance(tx, companyId, order)
    finalBalances.push(b)
    if (b.outstandingCents) continue
    await debitOrderInventory(tx, companyId, order.id)
    const tenders = await tx.orderTender.findMany({ where: { companyId, orderId: order.id } })
    await tx.order.update({ where: { id: order.id }, data: { paidAt: new Date(), status: 'PAID', paymentMethod: new Set(tenders.map(t => t.method)).size > 1 ? 'MIXED' : tenders[0].method,
      cashReceived: tenders.reduce((n, t) => n + (t.cashReceivedCents || 0), 0) / 100, cashChange: tenders.reduce((n, t) => n + (t.cashChangeCents || 0), 0) / 100 } })
    const last = await tx.posSale.findFirst({ where: { companyId }, orderBy: { number: 'desc' } }), user = await tx.user.findUniqueOrThrow({ where: { id: actorId } })
    const lines = order.items.map(l => ({ sourceLineId: l.sourceLineId || l.id, name: l.productName || '', productId: l.productId, price: l.unitPrice, qty: l.quantity, taxRate: l.taxRate }))
    const amounts = calculateSale(lines, 0, 0, 0)
    const snapshot = { version: 2, id: randomUUID(), numero: (last?.number || 0) + 1, horodatage: Date.now(), confirmation: 'manual_declaration', tableId: table.id, tableName: table.name,
      issuer: { name: company.name, legalName: company.legalName, address: company.address, vatNumber: company.vatNumber, legalProfile: company.legalProfile }, currency: company.currency,
      taxGroups: totalsFromTtc(lines).groups.map(g => ({ ...g })), orderIds: [order.id], coverIds: [cover.id], couverts: [cover.label], lignes: lines, ...amounts,
      pourboire: 0, arrondiCaritatif: 0, remises: [], receipt: { message: '', includeBrand: false, includePromo: false },
      reglements: [...new Set(tenders.map(t => t.method))].map(method => ({ methode: method.toLowerCase(), montant: tenders.filter(t => t.method === method).reduce((n, t) => n + t.amountCents, 0) / 100 })),
      methode: tenders[0].method.toLowerCase(), vendeur: `${user.firstName} ${user.lastName}` }
    await tx.posSale.create({ data: { id: snapshot.id, companyId, userId: actorId, number: snapshot.numero, snapshot,
      covers: { create: [{ companyId, coverId: cover.id }] }, origins: { create: [{ kind: 'ORDER', sourceId: order.id }, ...(!cover.id.startsWith('guest:') ? lines.map(l => ({ kind: 'LINE', sourceId: l.sourceLineId })) : [])] } } })
    await tx.serviceCover.update({ where: { companyId_coverId: { companyId, coverId: cover.id } }, data: { state: 'SETTLED', actorId } })
    sales.push(snapshot)
  }
  const settled = sales.flatMap(s => s.coverIds), floor = getFloorState()
  for (const t of floor.tables as any[]) {
    t.posCovers = t.posCovers?.filter((c: any) => !settled.includes(c.id))
    if (t.posCovers) t.items = t.posCovers.flatMap((c: any) => c.items.map((i: any) => ({ ...i, productId: i.menuItemId, addedAt: Date.now() })))
    if (t.id === table.id && settled.length && !t.items.length && !floor.chairs.some(c => c.tableId === t.id && c.items.length) && !await tx.order.count({ where: { companyId, externalTableId: t.id, source: 'GUEST', paidAt: null, status: { not: 'CANCELLED' } } })) t.status = 'NETTOYAGE'
  }
  for (const c of floor.chairs as any[]) if (settled.includes(`seat:${c.id}:${c.createdAt || c.openedAt || 0}`)) { c.items = []; c.status = 'LIBRE'; c.createdAt = Date.now() }
  // Projection de salle et règlements sont confirmés dans le même commit.
  await commitCurrentFloor(tx, actorId, 'pos:payment')
  const result = { requestId: input.requestId, confirmation: 'manual_declaration', status: finalBalances.some(b => b.outstandingCents) ? 'PARTIAL' : 'SETTLED',
    paidCents: finalBalances.reduce((n, b) => n + b.paidCents, 0), outstandingCents: finalBalances.reduce((n, b) => n + b.outstandingCents, 0), cashChangeCents: cash ? received - cash : 0, sales }
  await tx.paymentAttempt.update({ where: { id: attempt.id }, data: { response: result } })
  return result
}
