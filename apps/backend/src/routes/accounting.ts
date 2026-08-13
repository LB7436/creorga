import { Router, type Response } from 'express'
import prisma from '../lib/prisma'
import logger from '../lib/logger'

const router = Router()

// ─── CASH DRAWERS ─────────────────────────────────────

router.get('/cash-drawers', async (req: any, res: Response) => {
  try {
    const drawers = await prisma.cashDrawer.findMany({
      where: { companyId: req.companyId },
      include: { user: { select: { id: true, firstName: true, lastName: true } } },
      orderBy: { openedAt: 'desc' },
    })
    res.json(drawers)
  } catch (error) {
    logger.error('Erreur GET /cash-drawers:', error)
    res.status(500).json({ message: 'Erreur serveur' })
  }
})

router.post('/cash-drawers/open', async (req: any, res: Response) => {
  try {
    const { openAmount, notes } = req.body

    // req.user expose `userId` (payload JWT), pas `id` : `req.user.id` était
    // undefined et faisait échouer la clé étrangère — l'ouverture de caisse
    // renvoyait systématiquement 500.
    const userId = req.user?.userId ?? req.user?.id
    if (!userId) {
      res.status(401).json({ message: 'Utilisateur non identifié' })
      return
    }

    const fond = Number(openAmount)
    if (!Number.isFinite(fond) || fond < 0) {
      res.status(400).json({ message: 'openAmount doit être un nombre positif ou nul' })
      return
    }

    // Deux caisses ouvertes en même temps rendent la clôture ininterprétable.
    const déjàOuverte = await prisma.cashDrawer.findFirst({
      where: { companyId: req.companyId, closedAt: null },
    })
    if (déjàOuverte) {
      res.status(409).json({ message: 'Une caisse est déjà ouverte' })
      return
    }

    const drawer = await prisma.cashDrawer.create({
      data: {
        companyId: req.companyId,
        userId,
        openAmount: Math.round(fond * 100) / 100,
        notes: notes || null,
      },
      include: { user: { select: { id: true, firstName: true, lastName: true } } },
    })
    res.status(201).json(drawer)
  } catch (error) {
    logger.error('Erreur POST /cash-drawers/open:', error)
    res.status(500).json({ message: 'Erreur serveur' })
  }
})

// L'écart de caisse ne peut se calculer que sur l'argent réellement entré
// dans le tiroir : une vente carte n'y passe pas, et une vente mixte n'y
// laisse que sa part espèces (cashReceived).
export function especesEncaissees(
  ventes: Array<{ total: number; paymentMethod: string | null; cashReceived: number | null }>,
): number {
  const somme = ventes.reduce((acc, v) => {
    if (v.paymentMethod === 'CASH') return acc + v.total
    if (v.paymentMethod === 'MIXED') return acc + (v.cashReceived ?? 0)
    return acc
  }, 0)
  return Math.round(somme * 100) / 100
}

router.put('/cash-drawers/:id/close', async (req: any, res: Response) => {
  try {
    const existing = await prisma.cashDrawer.findFirst({ where: { id: req.params.id, companyId: req.companyId } })
    if (!existing) { res.status(404).json({ message: 'Caisse non trouvée' }); return }

    // Re-clôturer élargirait la fenêtre de ventes et réécrirait un écart déjà
    // constaté : la clôture est définitive.
    if (existing.closedAt) { res.status(409).json({ message: 'Caisse déjà clôturée' }); return }

    const { closeAmount, notes } = req.body
    const montantCompte = Number(closeAmount)
    if (!Number.isFinite(montantCompte) || montantCompte < 0) {
      res.status(400).json({ message: 'closeAmount doit être un nombre positif ou nul' })
      return
    }

    // totalSales n'était jamais alimenté (toujours 0) : l'écart calculé
    // accusait systématiquement le fond de caisse, quelles que soient les
    // ventes de la session.
    const maintenant = new Date()
    const ventes = await prisma.order.findMany({
      where: {
        companyId: req.companyId,
        status: 'PAID',
        paidAt: { gte: existing.openedAt, lte: maintenant },
      },
      select: { total: true, paymentMethod: true, cashReceived: true },
    })
    const totalSales = especesEncaissees(ventes)
    const discrepancy = Math.round((existing.openAmount + totalSales - montantCompte) * 100) / 100

    const drawer = await prisma.cashDrawer.update({
      where: { id: req.params.id },
      data: {
        closedAt: maintenant,
        closeAmount: montantCompte,
        totalSales,
        discrepancy,
        notes: notes ?? existing.notes,
      },
    })
    res.json(drawer)
  } catch (error) {
    logger.error('Erreur PUT /cash-drawers/:id/close:', error)
    res.status(500).json({ message: 'Erreur serveur' })
  }
})

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

router.post('/expenses', async (req: any, res: Response) => {
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
    res.status(201).json(expense)
  } catch (error) {
    logger.error('Erreur POST /expenses:', error)
    res.status(500).json({ message: 'Erreur serveur' })
  }
})

router.put('/expenses/:id', async (req: any, res: Response) => {
  try {
    const existing = await prisma.expense.findFirst({ where: { id: req.params.id, companyId: req.companyId } })
    if (!existing) { res.status(404).json({ message: 'Dépense non trouvée' }); return }
    const expense = await prisma.expense.update({ where: { id: req.params.id }, data: req.body })
    res.json(expense)
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

router.get('/tax-report', async (req: any, res: Response) => {
  try {
    const { startDate, endDate } = req.query
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

    const byTaxRate: Record<string, { base: number; tax: number; total: number }> = {}
    let totalRevenue = 0
    let totalTax = 0

    for (const order of orders) {
      for (const item of order.items) {
        const base = item.unitPrice * item.quantity
        const tax = base * (item.taxRate / 100)
        const key = `${item.taxRate}%`
        if (!byTaxRate[key]) byTaxRate[key] = { base: 0, tax: 0, total: 0 }
        byTaxRate[key].base += base
        byTaxRate[key].tax += tax
        byTaxRate[key].total += base + tax
        totalRevenue += base
        totalTax += tax
      }
    }

    res.json({
      period: { startDate, endDate },
      totalRevenue,
      totalTax,
      totalWithTax: totalRevenue + totalTax,
      orderCount: orders.length,
      byTaxRate,
    })
  } catch (error) {
    logger.error('Erreur GET /accounting/tax-report:', error)
    res.status(500).json({ message: 'Erreur serveur' })
  }
})

export default router
