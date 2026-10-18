import { Router } from 'express'
import { createHash, randomUUID } from 'node:crypto'
import { z } from 'zod'
import prisma from '../lib/prisma'
import { lockFinancialCompany } from '../lib/financial-lock'
import { cashDrawerReport } from '../lib/cash-ledger'
import { moneyMinor } from '../lib/money'
import { hasCapability } from '../lib/business-permissions'
import { assertTransactionCapabilities, BusinessPermissionError, requireCapabilities, transactionBusinessAccess } from '../lib/business-permission-transaction'
class CashError extends Error { constructor(public status: number, message: string) { super(message) } }
const router = Router()
export function visibleCashReport(report: any, req: any) {
  if (hasCapability(req, 'finance.revenue.read')) return report
  // Le comptage du tiroir reste possible sans communiquer les ventes, cartes,
  // commandes, pourboires ou journaux de l'ensemble de l'établissement.
  const { version, drawerId, frozen, openingCents, cashReceiptsCents, movementInCents, movementOutCents, expectedCents,
    countedCents, discrepancyCents, discrepancyConvention, closedAt, closedBy, reason, basis } = report
  return { version, drawerId, frozen, openingCents, cashReceiptsCents, movementInCents, movementOutCents, expectedCents,
    countedCents, discrepancyCents, discrepancyConvention, closedAt, closedBy, reason, basis, financialDetailsRestricted: true }
}
export function visibleCashDrawer(drawer: any, req: any) {
  if (hasCapability(req, 'finance.revenue.read')) return drawer
  const { id, companyId, userId, user, openedAt, openAmount, closedAt, closedBy, closeAmount, discrepancy, closeReason, notes, ledgerVersion } = drawer
  return { id, companyId, userId, user, openedAt, openAmount, closedAt, closedBy, closeAmount, discrepancy, closeReason, notes, ledgerVersion }
}
const wrap = (fn: (req: any, res: any) => Promise<any>) => async (req: any, res: any) => {
  try { await fn(req, res) } catch (error: any) {
    if (error instanceof z.ZodError) return res.status(400).json({ message: 'Montant, motif ou référence de caisse invalide.' })
    if (error instanceof CashError || error instanceof BusinessPermissionError) return res.status(error.status).json({ message: error.message })
    if (error?.code === 'P2002') return res.status(409).json({ message: 'Une autre opération existe déjà : rechargez la caisse.' })
    res.status(503).json({ message: 'Opération non confirmée. Conservez la référence et vérifiez le journal avant de recommencer.' })
  }
}
const hash = (value: unknown) => createHash('sha256').update(JSON.stringify(value)).digest('hex')
router.post('/open', requireCapabilities('cash.open'), wrap(async (req, res) => {
  const input = z.object({ requestId: z.string().uuid().optional(), openAmount: z.number().finite().min(0).max(1e7), notes: z.string().max(1000).optional() }).strict().parse(req.body)
  const requestHash = hash({ actorId: req.user.userId, ...input })
  const result = await prisma.$transaction(async tx => {
    await lockFinancialCompany(tx, req.companyId)
    await assertTransactionCapabilities(tx, req, 'cash.open')
    if (input.requestId) {
      const existing = await tx.cashDrawer.findFirst({ where: { id: input.requestId, companyId: req.companyId } })
      if (existing) { if (existing.openRequestHash !== requestHash) throw new CashError(409, 'Référence d’ouverture réutilisée.'); return { drawer: existing, created: false } }
    }
    if (await tx.cashDrawer.findFirst({ where: { companyId: req.companyId, closedAt: null } })) throw new CashError(409, 'Une caisse est déjà ouverte. Rechargez la session existante.')
    const drawer = await tx.cashDrawer.create({ data: { id: input.requestId, companyId: req.companyId, userId: req.user.userId, openAmount: moneyMinor(input.openAmount) / 100,
      notes: input.notes || null, ledgerVersion: 2, openRequestHash: requestHash } })
    return { drawer, created: true }
  }, { maxWait: 15000, timeout: 10000 })
  res.status(result.created ? 201 : 200).json(visibleCashDrawer(result.drawer, req))
}))
router.get('/:id/report', wrap(async (req, res) => {
  if (!hasCapability(req, 'cash.close') && !hasCapability(req, 'finance.revenue.read')) throw new BusinessPermissionError()
  const report = await prisma.$transaction(async tx => {
    await lockFinancialCompany(tx, req.companyId)
    req.businessAccess = await transactionBusinessAccess(tx, req.companyId, req.user.userId)
    if (!hasCapability(req, 'cash.close') && !hasCapability(req, 'finance.revenue.read')) throw new BusinessPermissionError()
    const drawer = await tx.cashDrawer.findFirst({ where: { id: req.params.id, companyId: req.companyId } })
    if (!drawer) throw new CashError(404, 'Caisse introuvable.')
    if (drawer.ledgerVersion !== 2 && !drawer.closeSnapshot) throw new CashError(422, 'Ancienne session : ne pas réinterpréter ses montants. Rapprochement manuel nécessaire.')
    return cashDrawerReport(tx, req.companyId, drawer)
  })
  res.set('Cache-Control', 'private, no-store').json(visibleCashReport(report, req))
}))
router.post('/:id/movements', requireCapabilities('finance.manage'), wrap(async (req, res) => {
  const input = z.object({ requestId: z.string().uuid(), direction: z.enum(['IN', 'OUT']), amountCents: z.number().int().positive().max(1e9), reason: z.string().trim().min(5).max(500) }).strict().parse(req.body)
  const requestHash = hash({ companyId: req.companyId, drawerId: req.params.id, actorId: req.user.userId, ...input })
  const result = await prisma.$transaction(async tx => {
    await lockFinancialCompany(tx, req.companyId)
    await assertTransactionCapabilities(tx, req, 'finance.manage')
    const existing = await tx.cashMovement.findUnique({ where: { id: input.requestId } })
    if (existing) { if (existing.requestHash !== requestHash) throw new CashError(409, 'Référence de mouvement réutilisée.'); return { movement: existing, created: false } }
    const drawer = await tx.cashDrawer.findFirst({ where: { id: req.params.id, companyId: req.companyId } })
    if (!drawer) throw new CashError(404, 'Caisse introuvable.')
    if (drawer.closedAt || drawer.ledgerVersion !== 2) throw new CashError(409, 'Session fermée ou historique : aucun nouveau mouvement.')
    const movement = await tx.cashMovement.create({ data: { id: input.requestId, companyId: req.companyId, drawerId: drawer.id, actorId: req.user.userId,
      direction: input.direction, amountCents: input.amountCents, reason: input.reason, requestHash } })
    return { movement, created: true }
  })
  res.status(result.created ? 201 : 200).json(result.movement)
}))
router.put('/:id/close', requireCapabilities('cash.close'), wrap(async (req, res) => {
  const input = z.object({ requestId: z.string().uuid().optional(), closeAmount: z.number().finite().min(0).max(1e7), notes: z.string().trim().max(1000).optional() }).strict().parse(req.body)
  const requestId = input.requestId || randomUUID(), requestHash = hash({ actorId: req.user.userId, ...input, requestId })
  const drawer = await prisma.$transaction(async tx => {
    await lockFinancialCompany(tx, req.companyId)
    await assertTransactionCapabilities(tx, req, 'cash.close')
    const current = await tx.cashDrawer.findFirst({ where: { id: req.params.id, companyId: req.companyId } })
    if (!current) throw new CashError(404, 'Caisse introuvable.')
    if (current.closedAt) {
      if (current.closeRequestId === requestId && current.closeRequestHash === requestHash) return current
      throw new CashError(409, 'Caisse déjà clôturée : son comptage ne peut pas être réécrit.')
    }
    if (current.ledgerVersion !== 2) throw new CashError(422, 'Ancienne session : rapprochement manuel requis, aucun montant historique réinterprété.')
    const report = await cashDrawerReport(tx, req.companyId, current), countedCents = moneyMinor(input.closeAmount)
    const discrepancyCents = countedCents - report.expectedCents
    if (discrepancyCents && (!input.notes || input.notes.length < 5)) throw new CashError(422, 'Justifiez l’écart de comptage avant de clôturer (cinq caractères minimum).')
    const closedAt = new Date()
    return tx.cashDrawer.update({ where: { id: current.id }, data: { closedAt, closedBy: req.user.userId, closeAmount: countedCents / 100,
      totalSales: report.cashReceiptsCents / 100, discrepancy: discrepancyCents / 100, closeReason: input.notes || null,
      closeRequestId: requestId, closeRequestHash: requestHash,
      closeSnapshot: JSON.parse(JSON.stringify({ ...report, frozen: true, countedCents, discrepancyCents, discrepancyConvention: 'compte_moins_theorique', closedAt: closedAt.toISOString(), closedBy: req.user.userId, reason: input.notes || null })) } })
  })
  res.json(visibleCashDrawer(drawer, req))
}))
export default router
