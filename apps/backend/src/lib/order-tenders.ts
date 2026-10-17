import type { Prisma, OrderTender } from '@prisma/client'
import { allocateMinor, moneyMinor } from './money'
import { activeCashDrawerId } from './cash-ledger'

type BalanceOrder = { id: string; total: number; paidAt: Date | null; status: string }

function balanceFromPayments(order: BalanceOrder, payments: OrderTender[]) {
  const totalCents = moneyMinor(order.total), recordedCents = payments.reduce((s, p) => s + p.amountCents, 0)
  const legacyPaid = !payments.length && (!!order.paidAt || order.status === 'PAID')
  if (recordedCents > totalCents) throw new Error('Affectations supérieures à la commande')
  return { totalCents, paidCents: legacyPaid ? totalCents : recordedCents, outstandingCents: legacyPaid ? 0 : totalCents - recordedCents,
    legacyPaidState: legacyPaid, payments: payments.map(p => ({ id: p.id, amountCents: p.amountCents, tipCents: p.tipCents, charityCents: p.charityCents,
      method: p.method, confirmation: p.confirmation, sourceAttemptId: p.attemptId, sourceSaleId: p.saleId, settlementId: p.settlementId, createdAt: p.createdAt })) }
}

export async function orderPaymentBalance(tx: Prisma.TransactionClient, companyId: string, order: BalanceOrder) {
  const payments = await tx.orderTender.findMany({ where: { companyId, orderId: order.id }, orderBy: { createdAt: 'asc' } })
  return balanceFromPayments(order, payments)
}

/** Lecture groupée seulement : mêmes calculs/provenances, aucune affectation créée ni réécrite. */
export async function orderPaymentBalances(tx: Prisma.TransactionClient, companyId: string, orders: BalanceOrder[]) {
  const grouped = new Map(orders.map(order => [order.id, [] as OrderTender[]]))
  if (!grouped.size) return new Map<string, ReturnType<typeof balanceFromPayments>>()
  const payments = await tx.orderTender.findMany({ where: { companyId, orderId: { in: [...grouped.keys()] } }, orderBy: { createdAt: 'asc' } })
  for (const payment of payments) {
    const target = grouped.get(payment.orderId)
    if (!target || payment.companyId !== companyId) throw new Error('Affectation hors du périmètre des soldes')
    target.push(payment)
  }
  return new Map(orders.map(order => [order.id, balanceFromPayments(order, grouped.get(order.id)!)]))
}

/** Ventilation du reçu POS, y compris pourboires/dons, sans gonfler le solde des commandes. */
export async function recordPosTenders(tx: Prisma.TransactionClient, companyId: string, actorId: string, sale: any) {
  const cashDrawerId = await activeCashDrawerId(tx, companyId)
  const orders = await tx.order.findMany({ where: { companyId, id: { in: sale.orderIds } }, orderBy: { id: 'asc' } })
  const weights = orders.map(o => moneyMinor(o.total)), remaining = [...weights]
  const methodAmounts = new Map<string, number>()
  for (const p of sale.reglements) {
    const method = p.methode === 'cash' ? 'CASH' : p.methode === 'GIFT_CARD' ? 'GIFT_CARD' : 'CARD'
    methodAmounts.set(method, (methodAmounts.get(method) || 0) + moneyMinor(p.montant))
  }
  const methods = [...methodAmounts], extras = moneyMinor(sale.pourboire) + moneyMinor(sale.arrondiCaritatif)
  const extraByMethod = allocateMinor(extras, methods.map(([method, amount]) => method === 'GIFT_CARD' ? 0 : amount))
  const tipsByMethod = allocateMinor(moneyMinor(sale.pourboire), extraByMethod)
  for (let i = 0; i < methods.length; i++) {
    const [method, amount] = methods[i], food = amount - extraByMethod[i]
    const parts = allocateMinor(food, remaining)
    const extraParts = allocateMinor(extraByMethod[i], weights.some(Boolean) ? weights : weights.map(() => 1))
    const tipParts = allocateMinor(tipsByMethod[i], extraParts)
    for (let j = 0; j < orders.length; j++) {
      remaining[j] -= parts[j]
      if (!parts[j] && !extraParts[j]) continue
      await tx.orderTender.create({ data: { companyId, orderId: orders[j].id, actorId, saleId: sale.id, cashDrawerId, method, confirmation: 'manual_declaration',
        amountCents: parts[j], tipCents: tipParts[j], charityCents: extraParts[j] - tipParts[j] } })
    }
  }
  if (remaining.some(Boolean)) throw new Error('Ventilation POS incomplète')
}
