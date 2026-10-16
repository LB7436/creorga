import { randomUUID } from 'node:crypto'
import type { Prisma } from '@prisma/client'
import { PosError, calculateSale, type PosTable } from './pos-ledger'
import { floorHash } from './floor-workspace'
import { SHARE_PREFIX, shareBalance, refreshAllocationTables } from './financial-allocations'
import { activePaymentExists, lockOrderPayment } from './payments/ledger'
import { activeCashDrawerId } from './cash-ledger'
import { orderPaymentBalance } from './order-tenders'
import { debitOrderInventory } from './order-inventory'
import { commitCurrentFloor } from '../routes/floorState'
import type { PartialInput } from './pos-partial-payments'
import { moneyMinor } from './money'

/** Même verrou société et même référence POS_PARTIAL que les règlements ordinaires.
 * Un groupe par déclaration : pas de ventilation implicite d'un nouveau paiement.
 * Aucun prestataire appelé : espèces/carte autonome explicitement déclarées.
 */
export async function payServiceShare(tx: Prisma.TransactionClient, companyId: string, actorId: string, input: PartialInput, table: PosTable | undefined) {
  if (input.coverIds.length !== 1 || !input.coverIds[0].startsWith(SHARE_PREFIX)) throw new PosError('Réglez un seul groupe réparti à la fois, afin de décider explicitement de la provenance de chaque paiement.', 409)
  const share = await tx.serviceShare.findFirst({ where: { companyId, id: input.coverIds[0].slice(SHARE_PREFIX.length), tableId: input.tableId }, include: { tenders: true, order: { include: { items: true } }, allocation: true } })
  if (!share || !table || share.order.paidAt || share.order.status === 'CANCELLED') throw new PosError('Groupe absent, terminé ou déplacé : rechargez.', 409)
  await lockOrderPayment(tx, companyId, share.orderId)
  if (await activePaymentExists(tx, companyId, [share.orderId])) throw new PosError('Un paiement est en cours ou incertain sur la provenance. Réservation conservée ; rapprochez avant de recommencer.', 409)
  const balance = shareBalance(share)
  if (input.expectedOutstandingCents !== balance.outstandingCents || input.amountCents > balance.outstandingCents) throw new PosError('Le solde du groupe a changé ; aucun règlement supplémentaire créé.', 409)
  const methods = input.method === 'MIXED' ? input.allocations || [] : [{ method: input.method, amountCents: input.amountCents }]
  if (input.method !== 'MIXED' && input.allocations || methods.reduce((n, p) => n + p.amountCents, 0) !== input.amountCents) throw new PosError('Ventilation mixte incohérente.')
  const cash = methods.filter(p => p.method === 'CASH').reduce((n, p) => n + p.amountCents, 0), received = input.cashReceivedCents ?? cash
  if (cash && received < cash || !cash && received) throw new PosError('Espèces reçues incohérentes.')
  const company = await tx.company.findUniqueOrThrow({ where: { id: companyId } }), cashDrawerId = await activeCashDrawerId(tx, companyId)
  const attempt = await tx.paymentAttempt.create({ data: { companyId, orderId: share.orderId, tableId: input.tableId, scope: 'POS_PARTIAL', userId: actorId,
    requestId: input.requestId, requestHash: floorHash(input), provider: 'manual', merchantId: 'manual:' + companyId, amountCents: input.amountCents, currency: company.currency, status: 'DECLARED' } })
  for (const method of ['CASH', 'CARD']) {
    const amountCents = methods.filter(p => p.method === method).reduce((n, p) => n + p.amountCents, 0)
    if (!amountCents) continue
    const tender = await tx.orderTender.create({ data: { companyId, orderId: share.orderId, actorId, attemptId: attempt.id, cashDrawerId, method, amountCents, confirmation: 'manual_declaration',
      cashReceivedCents: method === 'CASH' ? received : null, cashChangeCents: method === 'CASH' ? received - cash : null } })
    await tx.serviceShareTender.create({ data: { companyId, orderId: share.orderId, shareId: share.id, tenderId: tender.id, amountCents } })
  }
  const outstandingCents = balance.outstandingCents - input.amountCents, sales: any[] = []
  if (!outstandingCents) await tx.serviceCover.updateMany({ where: { companyId, coverId: SHARE_PREFIX + share.id }, data: { state: 'SETTLED', actorId } })
  const finalBalance = await orderPaymentBalance(tx, companyId, share.order)
  if (!finalBalance.outstandingCents) {
    // La vente et le débit de stock restent ceux de la commande entière, une seule fois.
    // Même ordre binaire que l'allocation : l'ordre SQL implicite ne doit pas
    // déplacer un centime de remise entre taux et changer la TVA du reçu final.
    const plan: any = share.allocation.snapshot, lines = [...share.order.items].sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0)
      .map(i => ({ sourceLineId: i.id, productId: i.productId, name: i.productName || '', price: i.unitPrice, qty: i.quantity, taxRate: i.taxRate }))
    const amounts = calculateSale(lines, plan.discountCents / 100, 0, 0)
    if (moneyMinor(amounts.total) !== moneyMinor(share.order.total) || moneyMinor(amounts.tva) !== moneyMinor(share.order.taxAmount) || moneyMinor(amounts.sousTotal) !== moneyMinor(share.order.subtotal)) throw new PosError('Le justificatif ne reconstitue pas les montants historiques. Aucun solde ni stock validé : rapprochement responsable requis.', 409)
    const tenders = await tx.orderTender.findMany({ where: { companyId, orderId: share.orderId } })
    await debitOrderInventory(tx, companyId, share.orderId)
    await tx.order.update({ where: { id: share.orderId }, data: { status: 'PAID', paidAt: new Date(), paymentMethod: new Set(tenders.map(t => t.method)).size > 1 ? 'MIXED' : tenders[0].method,
      cashReceived: tenders.reduce((n, t) => n + (t.cashReceivedCents || 0), 0) / 100, cashChange: tenders.reduce((n, t) => n + (t.cashChangeCents || 0), 0) / 100 } })
    const last = await tx.posSale.findFirst({ where: { companyId }, orderBy: { number: 'desc' } }), user = await tx.user.findUniqueOrThrow({ where: { id: actorId } })
    const shares = await tx.serviceShare.findMany({ where: { companyId, allocationId: share.allocationId } })
    const snapshot = { version: 2, id: randomUUID(), numero: (last?.number || 0) + 1, horodatage: Date.now(), confirmation: 'manual_declaration', tableId: table.id, tableName: table.name,
      issuer: { name: company.name, legalName: company.legalName, address: company.address, vatNumber: company.vatNumber, legalProfile: company.legalProfile }, currency: company.currency,
      taxGroups: plan.taxGroups, orderIds: [share.orderId], coverIds: shares.map(g => SHARE_PREFIX + g.id), couverts: shares.map(g => g.label), lignes: lines, ...amounts,
      allocationId: share.allocationId, pourboire: 0, arrondiCaritatif: 0, remise: plan.discountCents / 100,
      remises: plan.discountCents ? [{ type: 'geste', libelle: 'Remise historique de la commande', montant: plan.discountCents / 100 }] : [], receipt: { message: '', includeBrand: false, includePromo: false },
      reglements: [...new Set(tenders.map(t => t.method))].map(method => ({ methode: method.toLowerCase(), montant: tenders.filter(t => t.method === method).reduce((n, t) => n + t.amountCents, 0) / 100 })),
      methode: tenders[0].method.toLowerCase(), vendeur: `${user.firstName} ${user.lastName}` }
    await tx.posSale.create({ data: { id: snapshot.id, companyId, userId: actorId, number: snapshot.numero, snapshot,
      covers: { create: [...snapshot.coverIds, 'guest:' + share.orderId].map(coverId => ({ companyId, coverId })) }, origins: { create: [{ kind: 'ORDER', sourceId: share.orderId }] } } })
    sales.push(snapshot)
  }
  await refreshAllocationTables(tx, companyId, [share.tableId])
  await commitCurrentFloor(tx, actorId, 'SERVICE_SHARE_PAYMENT')
  const result = { requestId: input.requestId, shareId: share.id, status: outstandingCents ? 'PARTIAL' : 'SETTLED', confirmation: 'manual_declaration', paidCents: balance.paidCents + input.amountCents,
    outstandingCents, cashChangeCents: cash ? received - cash : 0, sales, orderOutstandingCents: finalBalance.outstandingCents }
  await tx.paymentAttempt.update({ where: { id: attempt.id }, data: { response: result } })
  return result
}
