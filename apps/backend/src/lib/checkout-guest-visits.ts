import type { Prisma } from '@prisma/client'
import { lockGuestTable } from './guest-visits'
import { ACTIVE_PAYMENT_STATES, activePaymentExists, lockOrderPayment } from './payments/ledger'
import { orderPaymentBalances } from './order-tenders'
import { shareBalance } from './financial-allocations'
import { PosError } from './pos-ledger'

/** Appelé APRÈS le verrou financier société, AVANT les écritures du règlement.
 * Les accès appartiennent à des visites, pas à la seule table physique. */
export async function lockCheckoutGuestVisits(tx: Prisma.TransactionClient, companyId: string, tableId: string, selectedOrderIds: string[]) {
  await lockGuestTable(tx, companyId, tableId)
  const visits = await tx.guestVisit.findMany({ where: { companyId, tableId, closedAt: null }, select: { id: true } })
  const visitIds = visits.map(visit => visit.id)
  const [orders, shares, pending] = await Promise.all([
    tx.order.findMany({ where: { companyId, OR: [{ guestVisitId: { in: visitIds } },
      { externalTableId: tableId, paidAt: null, status: { notIn: ['PAID', 'CANCELLED'] } }] }, select: { id: true } }),
    tx.serviceShare.findMany({ where: { companyId, OR: [{ tableId }, { visitId: { in: visitIds } }] }, select: { orderId: true } }),
    tx.paymentAttempt.findMany({ where: { companyId, tableId, status: { in: ACTIVE_PAYMENT_STATES } }, select: { orderId: true } }),
  ])
  const orderIds = [...new Set([...selectedOrderIds, ...orders.map(order => order.id), ...shares.map(share => share.orderId), ...pending.map(attempt => attempt.orderId)])].sort()
  for (const id of orderIds) await lockOrderPayment(tx, companyId, id)
  return { companyId, tableId, visitIds, orderIds }
}

/** Seulement à la fin effective de TOUTE la table, dans la transaction originale.
 * Aucun appel sur rejeu : une vente ancienne ne peut fermer un nouveau groupe.
 * Aucun paiement, réservation, original ou historique financier n'est modifié. */
export async function closeCheckoutGuestVisits(tx: Prisma.TransactionClient, scope: Awaited<ReturnType<typeof lockCheckoutGuestVisits>>, actorId: string, requestId: string) {
  const { companyId, tableId, visitIds, orderIds } = scope
  if (!visitIds.length) return
  const [orders, shares] = await Promise.all([
    tx.order.findMany({ where: { companyId, id: { in: orderIds } }, include: { serviceAllocation: { select: { id: true } } } }),
    tx.serviceShare.findMany({ where: { companyId, OR: [{ tableId }, { visitId: { in: visitIds } }] }, include: { tenders: true } }),
  ])
  const ordinary = orders.filter(order => !order.serviceAllocation && order.status !== 'CANCELLED')
  const balances = await orderPaymentBalances(tx, companyId, ordinary)
  if ([...balances.values()].some(balance => balance.outstandingCents > 0) || shares.some(share => shareBalance(share).outstandingCents > 0)) {
    throw new PosError('Fin de visite non confirmée : une commande ou une part reste due. Rechargez et vérifiez les groupes.', 409)
  }
  if (await activePaymentExists(tx, companyId, orderIds)) {
    throw new PosError('Fin de visite non confirmée : un paiement reste en cours ou incertain. Rapprochez-le sans libérer sa réservation.', 409)
  }
  const now = new Date(), reason = 'pos-checkout:' + requestId
  const closed = await tx.guestVisit.updateMany({ where: { companyId, tableId, id: { in: visitIds }, closedAt: null },
    data: { closedAt: now, closedBy: actorId, closeReason: reason } })
  if (closed.count !== visitIds.length) throw new PosError('Les visites ont changé pendant le règlement. Aucune fermeture partielle confirmée.', 409)
  await tx.guestVisitAccess.updateMany({ where: { companyId, visitId: { in: visitIds }, revokedAt: null }, data: { revokedAt: now, revokeReason: reason } })
}
