import { type Request, type Response } from 'express'
import { createTrackedRouter as Router } from '../lib/tracked-router'
import { z } from 'zod'
import { randomUUID, createHash } from 'node:crypto'
import prisma from '../lib/prisma'
import { requireCompany } from '../middleware/requireCompany'
import { hasCapability } from '../lib/business-permissions'
import { assertTransactionCapabilities, BusinessPermissionError, requireCapabilities } from '../lib/business-permission-transaction'
import { moneyMinor, totalsFromTtc } from '../lib/money'
import { orderPaymentBalance } from '../lib/order-tenders'
import { lockFinancialCompany } from '../lib/financial-lock'
import { activeCashDrawerId } from '../lib/cash-ledger'
import { activePaymentExists, lockOrderPayment, PaymentError } from '../lib/payments/ledger'
import { debitOrderInventory } from '../lib/order-inventory'
import logger from '../lib/logger'

const router = Router(); router.use(requireCompany)
const wrap = (fn: (req: any, res: Response) => Promise<any>) => async (req: any, res: Response) => {
  try { await fn(req, res) } catch (error) {
    if (error instanceof z.ZodError || error instanceof RangeError) return res.status(400).json({ message: 'Saisie de commande invalide.' })
    if (error instanceof PaymentError || error instanceof BusinessPermissionError) return res.status(error.status).json({ message: error.message })
    logger.error('[orders] opération refusée', error)
    return res.status(503).json({ message: 'Opération non confirmée. Actualisez avant de réessayer.' })
  }
}
const id = z.string().min(1).max(100), note = z.string().max(2000).nullable().optional()
const itemSchema = z.object({ productId: id, quantity: z.number().int().positive().max(100000), notes: note }).strict()
const createSchema = z.object({ tableId: id.nullable().optional(), items: z.array(itemSchema).min(1).max(500), notes: note }).strict()
async function openOrder(tx: any, companyId: string, orderId: string, payment = false) {
  await lockOrderPayment(tx, companyId, orderId)
  const order = await tx.order.findFirst({ where: { id: orderId, companyId } })
  if (!order) throw new PaymentError(404, 'Commande non trouvée.')
  if (await tx.serviceAllocation.count({ where: { companyId, orderId } })) throw new PaymentError(409, 'Commande répartie : utilisez ses groupes dans Acompte / solde. L’original financier reste immuable.')
  if (order.paidAt || ['PAID', 'CANCELLED'].includes(order.status)) throw new PaymentError(409, 'Commande réglée ou annulée : utilisez une correction traçable.')
  if (await activePaymentExists(tx, companyId, [orderId])) throw new PaymentError(409, 'Un règlement est en cours ou incertain. Vérifiez-le avant de modifier la commande.')
  if (!payment && await tx.orderTender.count({ where: { companyId, orderId } })) throw new PaymentError(409, 'Un règlement partiel existe : conservez les lignes et utilisez une correction traçable.')
  return order
}
async function recalculate(tx: any, orderId: string) {
  const items = await tx.orderItem.findMany({ where: { orderId } })
  const totals = totalsFromTtc(items.map((i: any) => ({ price: i.unitPrice, qty: i.quantity, taxRate: i.taxRate })))
  await tx.order.update({ where: { id: orderId }, data: { subtotal: totals.baseCents / 100, taxAmount: totals.taxCents / 100, total: totals.totalCents / 100 } })
}
async function requirePreparationCorrection(tx: any, order: any) {
  if (['IN_PROGRESS', 'READY'].includes(order.status) || order.guestStatus && order.guestStatus !== 'received' || await tx.orderItem.count({ where: { orderId: order.id, status: { not: 'PENDING' } } })) {
    throw new PaymentError(409, 'Commande déjà envoyée ou préparée : correction de préparation avec motif requise. Ce parcours n’est pas encore implémenté ; aucune ligne ni addition effacée. Consultez le responsable et conservez l’original.')
  }
}
router.get('/', wrap(async (req, res) => {
  const filters = z.object({ status: z.string().max(40).optional(), tableId: id.optional() }).parse(req.query)
  res.json(await prisma.order.findMany({ where: { companyId: req.companyId,
    AND: [filters, ...(!hasCapability(req, 'finance.revenue.read') ? [{ paidAt: null, status: { notIn: ['PAID', 'CANCELLED'] } }] : [])] },
    include: { items: { include: { product: true } }, table: true, user: { select: { firstName: true, lastName: true } } }, orderBy: { createdAt: 'desc' }, take: 1000 }))
}))
router.get('/:id', wrap(async (req, res) => {
  const order = await prisma.order.findFirst({ where: { id: req.params.id, companyId: req.companyId,
    ...(!hasCapability(req, 'finance.revenue.read') ? { paidAt: null, status: { notIn: ['PAID', 'CANCELLED'] } } : {}) }, include: { items: { include: { product: true } }, table: true, user: { select: { firstName: true, lastName: true } } } })
  if (!order) throw new PaymentError(404, 'Commande non trouvée.')
  res.json(order)
}))
router.post('/', requireCapabilities('service.manage'), wrap(async (req, res) => {
  const input = createSchema.parse(req.body), companyId = req.companyId
  if (input.tableId && !await prisma.table.findFirst({ where: { id: input.tableId, companyId, isActive: true } })) throw new PaymentError(400, 'Table absente de cet établissement.')
  const products = await prisma.product.findMany({ where: { companyId, isActive: true, id: { in: input.items.map(i => i.productId) } } })
  const lines = input.items.map(i => {
    const product = products.find(p => p.id === i.productId)
    if (!product) throw new PaymentError(400, 'Produit indisponible dans cet établissement.')
    return { productId: product.id, productName: product.name, quantity: i.quantity, unitPrice: product.price, taxRate: product.taxRate, notes: i.notes || null }
  })
  const totals = totalsFromTtc(lines.map(i => ({ price: i.unitPrice, qty: i.quantity, taxRate: i.taxRate })))
  for (let attempt = 0; attempt < 10; attempt++) {
    try {
      const order = await prisma.$transaction(async tx => {
        await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${companyId}), hashtext('order-number'))::text`
        await assertTransactionCapabilities(tx, req, 'service.manage')
        const last = await tx.order.findFirst({ where: { companyId }, orderBy: { orderNumber: 'desc' }, select: { orderNumber: true } })
        return tx.order.create({ data: { companyId, userId: req.user?.userId || null, tableId: input.tableId || null, notes: input.notes,
          orderNumber: (last?.orderNumber || 0) + 1, subtotal: totals.baseCents / 100, taxAmount: totals.taxCents / 100, total: totals.totalCents / 100,
          items: { create: lines } }, include: { items: { include: { product: true } }, table: true } })
      }, { maxWait: 15000, timeout: 10000 })
      return res.status(201).json(order)
    } catch (error: any) {
      if (error?.code !== 'P2002') throw error
      await new Promise(resolve => setTimeout(resolve, 5 + Math.floor(Math.random() * 20) * (attempt + 1)))
    }
  }
  throw new PaymentError(503, 'Numérotation momentanément indisponible.')
}))
router.put('/:id/status', requireCapabilities('service.manage'), wrap(async (req, res) => {
  const { status } = z.object({ status: z.enum(['OPEN', 'IN_PROGRESS', 'READY', 'PAID', 'CANCELLED']) }).strict().parse(req.body)
  if (status === 'PAID') throw new PaymentError(409, 'Le paiement doit être enregistré par l’encaissement.')
  if (status === 'CANCELLED' && !hasCapability(req, 'orders.cancel')) throw new PaymentError(403, 'Annulation non autorisée.')
  const order = await prisma.$transaction(async tx => {
    const original = await openOrder(tx, req.companyId, req.params.id)
    await assertTransactionCapabilities(tx, req, 'service.manage', ...(status === 'CANCELLED' ? ['orders.cancel' as const] : []))
    if (status === 'CANCELLED') await requirePreparationCorrection(tx, original)
    return tx.order.update({ where: { id: req.params.id }, data: { status }, include: { items: { include: { product: true } }, table: true } })
  })
  res.json(order)
}))
router.get('/:id/payment-balance', wrap(async (req, res) => {
  const order = await prisma.order.findFirst({ where: { id: req.params.id, companyId: req.companyId,
    ...(!hasCapability(req, 'finance.revenue.read') ? { OR: [{ paidAt: null, status: { notIn: ['PAID', 'CANCELLED'] } }, { userId: req.user.userId }] } : {}) } })
  if (!order) throw new PaymentError(404, 'Commande introuvable.')
  res.set('Cache-Control', 'private, no-store').json(await orderPaymentBalance(prisma, req.companyId, order))
}))
const checkoutSchema = z.object({ requestId: z.string().uuid().optional(), paymentMethod: z.enum(['CASH', 'CARD', 'MIXED']),
  partialAmountCents: z.number().int().positive().max(1_000_000_000).optional(),
  cashReceived: z.number().finite().min(0).max(10_000_000).nullable().optional(),
  allocations: z.array(z.object({ method: z.enum(['CASH', 'CARD']), amount: z.number().finite().positive().max(10_000_000) }).strict()).min(2).max(10).optional(),
}).strict()
router.post('/:id/checkout', requireCapabilities('payments.receive'), wrap(async (req, res) => {
  const input = checkoutSchema.parse(req.body), requestId = input.requestId || randomUUID()
  if (input.partialAmountCents && !input.requestId) throw new PaymentError(400, 'Référence stable obligatoire pour un règlement partiel.')
  const hash = createHash('sha256').update(JSON.stringify({ ...input, requestId })).digest('hex')
  const order = await prisma.$transaction(async tx => {
    await lockFinancialCompany(tx, req.companyId)
    await lockOrderPayment(tx, req.companyId, req.params.id)
    await assertTransactionCapabilities(tx, req, 'payments.receive')
    const replay = await tx.paymentAttempt.findUnique({ where: { companyId_requestId: { companyId: req.companyId, requestId } } })
    if (replay) {
      if (replay.orderId !== req.params.id || replay.provider !== 'manual' || replay.requestHash !== hash || replay.userId !== (req.user?.userId || null)) throw new PaymentError(409, 'Référence de règlement incompatible.')
      return tx.order.findFirstOrThrow({ where: { id: req.params.id, companyId: req.companyId }, include: { items: { include: { product: true } }, table: true } })
    }
    if (await tx.serviceCover.count({ where: { companyId: req.companyId, orderId: req.params.id, NOT: { coverId: { startsWith: 'guest:' } } } })) throw new PaymentError(409, 'Commande native liée à un couvert : terminez dans Acompte / solde de la caisse pour conserver le reçu et la session atomiques.')
    const current = await openOrder(tx, req.companyId, req.params.id, true)
    const balance = await orderPaymentBalance(tx, req.companyId, current)
    const totalCents = input.partialAmountCents ?? balance.outstandingCents
    if (totalCents > balance.outstandingCents) throw new PaymentError(409, 'Le montant dépasse le solde serveur restant.')
    if (input.paymentMethod === 'MIXED' && (!input.allocations || input.allocations.reduce((sum, p) => sum + moneyMinor(p.amount), 0) !== totalCents)) throw new PaymentError(400, 'Ventilation du paiement mixte requise au centime.')
    const cashDue = input.paymentMethod === 'CASH' ? totalCents : input.paymentMethod === 'MIXED' ? input.allocations!.filter(p => p.method === 'CASH').reduce((n, p) => n + moneyMinor(p.amount), 0) : 0
    const received = input.cashReceived == null ? cashDue : moneyMinor(input.cashReceived)
    if (cashDue && received < cashDue) throw new PaymentError(400, 'Montant espèces reçu insuffisant.')
    if (!totalCents) throw new PaymentError(409, 'Commande sans montant à régler.')
    const attempt = await tx.paymentAttempt.create({ data: { companyId: req.companyId, orderId: current.id, userId: req.user?.userId || null, requestId, requestHash: hash,
      provider: 'manual', merchantId: `manual:${req.companyId}`, amountCents: totalCents, currency: req.company.currency, status: 'DECLARED',
      response: { confirmation: 'manual_declaration', method: input.paymentMethod, allocations: input.allocations || [{ method: input.paymentMethod, amount: totalCents / 100 }] } } })
    const parts = input.paymentMethod === 'MIXED' ? input.allocations! : [{ method: input.paymentMethod, amount: totalCents / 100 }]
    const cashDrawerId = await activeCashDrawerId(tx, req.companyId)
    for (const method of ['CASH', 'CARD']) {
      const amountCents = parts.filter(p => p.method === method).reduce((s, p) => s + moneyMinor(p.amount), 0)
      if (amountCents) await tx.orderTender.create({ data: { companyId: req.companyId, orderId: current.id, actorId: req.user?.userId, attemptId: attempt.id,
        method, cashDrawerId, confirmation: 'manual_declaration', amountCents, cashReceivedCents: method === 'CASH' ? received : null, cashChangeCents: method === 'CASH' ? received - cashDue : null } })
    }
    const finalBalance = await orderPaymentBalance(tx, req.companyId, current)
    if (!finalBalance.outstandingCents) {
      await debitOrderInventory(tx, req.companyId, current.id)
      const cash = await tx.orderTender.aggregate({ where: { companyId: req.companyId, orderId: current.id, method: 'CASH' }, _sum: { cashReceivedCents: true, cashChangeCents: true } })
      return tx.order.update({ where: { id: current.id }, data: { status: 'PAID', paymentMethod: finalBalance.payments.length > 1 ? 'MIXED' : input.paymentMethod, paidAt: new Date(),
        cashReceived: cash._sum.cashReceivedCents == null ? null : cash._sum.cashReceivedCents / 100, cashChange: cash._sum.cashChangeCents == null ? null : cash._sum.cashChangeCents / 100 }, include: { items: { include: { product: true } }, table: true } })
    }
    return tx.order.findUniqueOrThrow({ where: { id: current.id }, include: { items: { include: { product: true } }, table: true } })
  }, { maxWait: 15000, timeout: 10000 })
  const balance = await orderPaymentBalance(prisma, req.companyId, order)
  res.json({ ...order, outstandingCents: balance.outstandingCents, paidCents: balance.paidCents, paymentConfirmation: 'manual_declaration' })
}))
router.post('/:id/items', requireCapabilities('service.manage'), wrap(async (req, res) => {
  const input = itemSchema.parse(req.body)
  const item = await prisma.$transaction(async tx => {
    const original = await openOrder(tx, req.companyId, req.params.id)
    await assertTransactionCapabilities(tx, req, 'service.manage')
    await requirePreparationCorrection(tx, original)
    const product = await tx.product.findFirst({ where: { id: input.productId, companyId: req.companyId, isActive: true } })
    if (!product) throw new PaymentError(404, 'Produit indisponible.')
    const item = await tx.orderItem.create({ data: { orderId: req.params.id, productId: product.id, productName: product.name, unitPrice: product.price, taxRate: product.taxRate, quantity: input.quantity, notes: input.notes }, include: { product: true } })
    await recalculate(tx, req.params.id)
    return item
  })
  res.status(201).json(item)
}))
router.put('/:id/items/:itemId', requireCapabilities('service.manage'), wrap(async (req, res) => {
  const input = z.object({ quantity: z.number().int().positive().max(100000).optional(), notes: note,
    status: z.enum(['PENDING', 'PREPARING', 'READY', 'SERVED']).optional() }).strict().parse(req.body)
  const item = await prisma.$transaction(async tx => {
    const original = await openOrder(tx, req.companyId, req.params.id)
    await assertTransactionCapabilities(tx, req, 'service.manage')
    if (input.quantity !== undefined || input.notes !== undefined) await requirePreparationCorrection(tx, original)
    const previous = await tx.orderItem.findFirst({ where: { id: req.params.itemId, orderId: req.params.id } })
    if (!previous) throw new PaymentError(404, 'Article non trouvé.')
    if (input.quantity !== undefined && input.quantity < previous.quantity && !hasCapability(req, 'orders.cancel')) throw new BusinessPermissionError()
    const item = await tx.orderItem.update({ where: { id: previous.id }, data: input, include: { product: true } })
    await recalculate(tx, req.params.id)
    return item
  })
  res.json(item)
}))
router.delete('/:id/items/:itemId', requireCapabilities('service.manage', 'orders.cancel'), wrap(async (req, res) => {
  await prisma.$transaction(async tx => {
    const original = await openOrder(tx, req.companyId, req.params.id)
    await assertTransactionCapabilities(tx, req, 'service.manage', 'orders.cancel')
    await requirePreparationCorrection(tx, original)
    const item = await tx.orderItem.findFirst({ where: { id: req.params.itemId, orderId: req.params.id } })
    if (!item) throw new PaymentError(404, 'Article non trouvé.')
    if (item.status !== 'PENDING') throw new PaymentError(409, 'Article envoyé en préparation : correction avec motif requise.')
    await tx.orderItem.delete({ where: { id: item.id } })
    await recalculate(tx, req.params.id)
  })
  res.json({ message: 'Article supprimé.' })
}))
export default router
