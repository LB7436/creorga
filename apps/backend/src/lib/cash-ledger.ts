import type { Prisma } from '@prisma/client'
import { moneyMinor } from './money'
export async function activeCashDrawerId(tx: Prisma.TransactionClient, companyId: string) {
  return (await tx.cashDrawer.findFirst({ where: { companyId, ledgerVersion: 2, closedAt: null }, select: { id: true } }))?.id || null
}
export async function cashDrawerReport(tx: Prisma.TransactionClient, companyId: string, drawer: any) {
  if (drawer.closeSnapshot) return drawer.closeSnapshot as any
  if (drawer.ledgerVersion !== 2) throw new Error('Session historique : rapprochement manuel requis avant nouvelle clôture')
  const [tenders, movements] = await Promise.all([
    tx.orderTender.findMany({ where: { companyId, cashDrawerId: drawer.id }, orderBy: { createdAt: 'asc' } }),
    tx.cashMovement.findMany({ where: { companyId, drawerId: drawer.id }, orderBy: { createdAt: 'asc' } }),
  ])
  const byMethod: Record<string, number> = {}
  for (const p of tenders) byMethod[p.method] = (byMethod[p.method] || 0) + p.amountCents + p.tipCents + p.charityCents
  const openingCents = moneyMinor(drawer.openAmount), cashReceiptsCents = byMethod.CASH || 0
  const movementInCents = movements.filter(m => m.direction === 'IN').reduce((s, m) => s + m.amountCents, 0)
  const movementOutCents = movements.filter(m => m.direction === 'OUT').reduce((s, m) => s + m.amountCents, 0)
  return { version: 2, drawerId: drawer.id, frozen: false, openingCents, cashReceiptsCents, movementInCents, movementOutCents,
    expectedCents: openingCents + cashReceiptsCents + movementInCents - movementOutCents, byMethod,
    tipCents: tenders.reduce((s, p) => s + p.tipCents, 0), charityCents: tenders.reduce((s, p) => s + p.charityCents, 0),
    payments: tenders.map(p => ({ id: p.id, orderId: p.orderId, method: p.method, amountCents: p.amountCents, tipCents: p.tipCents, charityCents: p.charityCents,
      confirmation: p.confirmation, attemptId: p.attemptId, saleId: p.saleId, createdAt: p.createdAt.toISOString() })),
    movements: movements.map(m => ({ id: m.id, direction: m.direction, amountCents: m.amountCents, reason: m.reason, actorId: m.actorId, createdAt: m.createdAt.toISOString() })),
    basis: 'encaissements_affectes_et_mouvements_pas_chiffre_affaires' }
}
