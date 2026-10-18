import { type Response } from 'express'
import { createTrackedRouter as Router } from '../lib/tracked-router'
import type { Prisma } from '@prisma/client'
import prisma from '../lib/prisma'
import logger from '../lib/logger'
import { z } from 'zod'
import { validate } from '../middleware/validate'
import { hasCapability } from '../lib/business-permissions'
import { requireCapabilities } from '../lib/business-permission-transaction'
import { moneyMinor, totalsFromTtc } from '../lib/money'
import cashLedger, { visibleCashDrawer } from './cashLedger'
import documentJournal, { journalPeriod } from './documentJournal'
import financialReconciliation from './financialReconciliation'
import bankPayouts from './bankPayouts'

const router = Router()
// Toutes les écritures de caisse passent par le journal v2 et son verrou commun.
router.use('/cash-drawers', cashLedger)
router.use(documentJournal)
router.use(financialReconciliation)
router.use(bankPayouts)
router.use('/expenses', (req, res, next) => {
  return requireCapabilities(...(['GET', 'HEAD'].includes(req.method) ? ['finance.costs.read' as const] : ['finance.manage' as const]))(req, res, next)
})

// ─── CASH DRAWERS ─────────────────────────────────────

router.get('/cash-drawers', async (req: any, res: Response) => {
  try {
    if (!hasCapability(req, 'cash.open') && !hasCapability(req, 'cash.close') && !hasCapability(req, 'finance.revenue.read')) return res.status(403).json({ message: 'Accès aux sessions de caisse refusé.' })
    const query: Prisma.CashDrawerFindManyArgs = {
      where: { companyId: req.companyId, ...(!hasCapability(req, 'finance.revenue.read') ? { closedAt: null } : {}) },
      ...(hasCapability(req, 'finance.revenue.read')
        ? { include: { user: { select: { id: true, firstName: true, lastName: true } } } }
        : { select: { id: true, companyId: true, userId: true, user: { select: { id: true, firstName: true, lastName: true } },
          openedAt: true, openAmount: true, closedAt: true, closedBy: true, closeAmount: true, discrepancy: true, closeReason: true, notes: true, ledgerVersion: true } }),
      orderBy: { openedAt: 'desc' },
    }
    const drawers = await prisma.cashDrawer.findMany(query)
    res.json(drawers.map(drawer => visibleCashDrawer(drawer, req)))
  } catch (error) {
    logger.error('Erreur GET /cash-drawers:', error)
    res.status(500).json({ message: 'Erreur serveur' })
  }
})

// L'écart de caisse ne peut se calculer que sur l'argent réellement entré
// dans le tiroir : une vente carte n'y passe pas, et une vente mixte n'y
// laisse que sa part espèces (cashReceived).
export function especesEncaissees(
  ventes: Array<{ total: number; paymentMethod: string | null; cashReceived: number | null; cashChange?: number | null }>,
): number {
  const somme = ventes.reduce((acc, v) => {
    if (v.paymentMethod === 'CASH') return acc + (v.cashReceived !== null && v.cashChange != null ? moneyMinor(v.cashReceived) - moneyMinor(v.cashChange) : moneyMinor(v.total))
    if (v.paymentMethod === 'MIXED') return acc + Math.max(0, moneyMinor(v.cashReceived ?? 0) - moneyMinor(v.cashChange ?? 0))
    return acc
  }, 0)
  return somme / 100
}

// ─── EXPENSES ─────────────────────────────────────────

router.get('/expenses', async (req: any, res: Response) => {
  try {
    const { category, startDate, endDate } = req.query
    const where: any = { companyId: req.companyId }
    if (category) where.category = category
    if (startDate || endDate) {
      where.date = {}
      if (startDate) where.date.gte = new Date(startDate as string)
      if (endDate) where.date.lte = new Date(endDate as string)
    }
    const expenses = await prisma.expense.findMany({
      where,
      include: { user: { select: { id: true, firstName: true, lastName: true } } },
      orderBy: { date: 'desc' },
    })
    res.json(expenses)
  } catch (error) {
    logger.error('Erreur GET /expenses:', error)
    res.status(500).json({ message: 'Erreur serveur' })
  }
})

const expenseSchema = z.object({
  category: z.enum(['FOOD_COST', 'STAFF', 'UTILITIES', 'SUPPLIES', 'OTHER']),
  amount: z.number().positive(),
  taxRate: z.number().min(0).max(100).default(17),
  description: z.string().trim().min(1).max(500),
  receiptUrl: z.string().url().nullable().optional(),
  date: z.string().datetime().optional(),
})
const visibleExpense = (expense: any, req: any) => hasCapability(req, 'finance.costs.read') ? expense : { id: expense.id, companyId: expense.companyId, updatedAt: expense.updatedAt }

router.post('/expenses', validate(expenseSchema), async (req: any, res: Response) => {
  try {
    const { category, amount, taxRate, description, receiptUrl, date } = req.body

    // Sans validation, un montant non numérique ou un champ obligatoire absent
    // faisait planter Prisma et remontait en 500 « erreur serveur ».
    const montant = Number(amount)
    if (!Number.isFinite(montant) || montant <= 0) {
      // Un remboursement se saisit comme un avoir, pas comme une dépense négative.
      res.status(400).json({ message: 'amount doit être un nombre strictement positif' })
      return
    }
    if (!category || !description) {
      res.status(400).json({ message: 'category et description sont requis' })
      return
    }
    // req.user expose `userId` (payload JWT), pas `id` : `req.user.id` était
    // undefined et violait la clé étrangère Expense.userId.
    const userId = req.user?.userId ?? req.user?.id
    if (!userId) {
      res.status(401).json({ message: 'Utilisateur non identifié' })
      return
    }

    const expense = await prisma.expense.create({
      data: {
        companyId: req.companyId,
        userId,
        category,
        amount: Math.round(montant * 100) / 100,
        taxRate: taxRate ?? 17,
        description,
        receiptUrl: receiptUrl || null,
        date: date ? new Date(date) : new Date(),
      },
    })
    res.status(201).json(visibleExpense(expense, req))
  } catch (error) {
    logger.error('Erreur POST /expenses:', error)
    res.status(500).json({ message: 'Erreur serveur' })
  }
})

router.put('/expenses/:id', validate(expenseSchema.partial().refine((value) => Object.keys(value).length > 0, { message: 'Aucune modification demandée' })), async (req: any, res: Response) => {
  try {
    const existing = await prisma.expense.findFirst({ where: { id: req.params.id, companyId: req.companyId } })
    if (!existing) { res.status(404).json({ message: 'Dépense non trouvée' }); return }
    const data = {
      ...req.body,
      ...(req.body.date ? { date: new Date(req.body.date) } : {}),
    }
    const expense = await prisma.expense.update({ where: { id: req.params.id }, data })
    res.json(visibleExpense(expense, req))
  } catch (error) {
    logger.error('Erreur PUT /expenses/:id:', error)
    res.status(500).json({ message: 'Erreur serveur' })
  }
})

router.delete('/expenses/:id', async (req: any, res: Response) => {
  try {
    const existing = await prisma.expense.findFirst({ where: { id: req.params.id, companyId: req.companyId } })
    if (!existing) { res.status(404).json({ message: 'Dépense non trouvée' }); return }
    await prisma.expense.delete({ where: { id: req.params.id } })
    res.json({ message: 'Dépense supprimée' })
  } catch (error) {
    logger.error('Erreur DELETE /expenses/:id:', error)
    res.status(500).json({ message: 'Erreur serveur' })
  }
})

// ─── TAX REPORT ───────────────────────────────────────

type TaxOrder = { id: string; total: number; subtotal: number; taxAmount: number; items: Array<{ unitPrice: number; quantity: number; taxRate: number }> }
class TaxReconciliationError extends Error {
  constructor(public orderIds: string[]) { super(`Ventilation fiscale non réconciliée : ${orderIds.join(', ')}`) }
}

/** Les ventes conservent les prix TTC et les taux au moment de la commande.
 * Une remise déjà comprise dans le total est répartie avec la politique du
 * moteur monétaire. Un historique HT/ancien arrondi incompatible n'est jamais
 * réécrit ni présenté comme un rapport fiscal réconcilié. */
export function taxReportFromOrders(orders: TaxOrder[]) {
  const groups = new Map<number, { base: number; tax: number; total: number }>()
  const mismatches: string[] = []
  let baseCents = 0, taxCents = 0, totalCents = 0
  for (const order of orders) {
    try {
      if (!order.items.length) throw new Error('Lignes absentes')
      const lines = order.items.map(item => ({ price: item.unitPrice, qty: item.quantity, taxRate: item.taxRate }))
      const storedTotal = moneyMinor(order.total), gross = totalsFromTtc(lines).grossCents
      if (storedTotal < 0 || storedTotal > gross) throw new Error('Total incompatible avec les lignes TTC')
      const amounts = totalsFromTtc(lines, gross - storedTotal)
      if (amounts.baseCents !== moneyMinor(order.subtotal) || amounts.taxCents !== moneyMinor(order.taxAmount)) throw new Error('TVA historique incompatible')
      for (const group of amounts.groups) {
        const sum = groups.get(group.taxRate) || { base: 0, tax: 0, total: 0 }
        sum.base += group.baseCents; sum.tax += group.taxCents; sum.total += group.totalCents
        groups.set(group.taxRate, sum)
      }
      baseCents += amounts.baseCents; taxCents += amounts.taxCents; totalCents += storedTotal
    } catch { mismatches.push(order.id) }
  }
  if (mismatches.length) throw new TaxReconciliationError(mismatches)
  return { totalRevenue: baseCents / 100, totalTax: taxCents / 100, totalWithTax: totalCents / 100, orderCount: orders.length,
    byTaxRate: Object.fromEntries([...groups].sort(([a], [b]) => a - b).map(([rate, amounts]) => [`${rate}%`, { base: amounts.base / 100, tax: amounts.tax / 100, total: amounts.total / 100 }])) }
}

router.get('/tax-report', requireCapabilities('finance.revenue.read'), async (req: any, res: Response) => {
  try {
    const { startDate, endDate } = req.query
    const { dates } = journalPeriod(req.query)
    if (await prisma.creditNote.findFirst({ where: { companyId: req.companyId, createdAt: dates }, select: { id: true } })) {
      res.status(409).json({ code: 'TAX_CREDITS_RECONCILIATION_REQUIRED', message: 'Cette période contient des avoirs. Le rapport historique des ventes payées ne constitue pas un net fiscal réconcilié. Exportez le journal des factures/avoirs et rapprochez-le avec les ventes et votre comptable.' })
      return
    }
    const where: any = { companyId: req.companyId, status: 'PAID' }
    if (startDate || endDate) {
      where.paidAt = {}
      if (startDate) where.paidAt.gte = new Date(startDate as string)
      if (endDate) where.paidAt.lte = new Date(endDate as string)
    }

    const orders = await prisma.order.findMany({
      where,
      include: { items: true },
    })

    res.json({
      period: { startDate, endDate },
      ...taxReportFromOrders(orders),
    })
  } catch (error) {
    if (error instanceof TaxReconciliationError) {
      res.status(409).json({ message: 'Certaines ventes historiques ne se réconcilient pas avec leurs lignes et leur TVA. Vérifiez ces références avant de produire le rapport fiscal.', code: 'TAX_RECONCILIATION_REQUIRED', orderIds: error.orderIds })
      return
    }
    logger.error('Erreur GET /accounting/tax-report:', error)
    res.status(500).json({ message: 'Erreur serveur' })
  }
})

export default router
