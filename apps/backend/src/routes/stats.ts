import { Router, type Response } from 'express'
import prisma from '../lib/prisma'
import { authenticate, type AuthRequest } from '../middleware/auth'
import logger from '../lib/logger'

const router = Router()
router.use(authenticate)

// ─── GET /api/stats/today ──────────────────────────────

router.get('/today', async (req: AuthRequest, res: Response) => {
  try {
    const companyId = req.headers['x-company-id'] as string
    if (!companyId) {
      res.status(400).json({ message: 'x-company-id header requis' })
      return
    }

    const startOfDay = new Date()
    startOfDay.setHours(0, 0, 0, 0)

    const endOfDay = new Date()
    endOfDay.setHours(23, 59, 59, 999)

    const paidOrders = await prisma.order.findMany({
      where: {
        companyId,
        status: 'PAID',
        paidAt: { gte: startOfDay, lte: endOfDay },
      },
    })

    const revenue = paidOrders.reduce((sum, o) => sum + o.total, 0)
    const orderCount = paidOrders.length
    const avgTicket = orderCount > 0 ? revenue / orderCount : 0

    const tablesTotal = await prisma.table.count({
      where: { companyId, isActive: true },
    })

    const tablesOccupied = await prisma.order.groupBy({
      by: ['tableId'],
      where: {
        companyId,
        status: { in: ['OPEN', 'IN_PROGRESS', 'READY'] },
        tableId: { not: null },
      },
    })

    res.json({
      revenue,
      orderCount,
      avgTicket,
      tablesTotal,
      tablesOccupied: tablesOccupied.length,
      tablesFree: tablesTotal - tablesOccupied.length,
    })
  } catch (error) {
    logger.error('Erreur GET /stats/today:', error)
    res.status(500).json({ message: 'Erreur serveur' })
  }
})

// ─── GET /api/stats/week ───────────────────────────────

router.get('/week', async (req: AuthRequest, res: Response) => {
  try {
    const companyId = req.headers['x-company-id'] as string
    if (!companyId) {
      res.status(400).json({ message: 'x-company-id header requis' })
      return
    }

    const days: Array<{ date: string; revenue: number; orders: number }> = []

    for (let i = 6; i >= 0; i--) {
      const date = new Date()
      date.setDate(date.getDate() - i)
      const startOfDay = new Date(date)
      startOfDay.setHours(0, 0, 0, 0)
      const endOfDay = new Date(date)
      endOfDay.setHours(23, 59, 59, 999)

      const paidOrders = await prisma.order.findMany({
        where: {
          companyId,
          status: 'PAID',
          paidAt: { gte: startOfDay, lte: endOfDay },
        },
      })

      days.push({
        date: date.toISOString().split('T')[0],
        revenue: paidOrders.reduce((sum, o) => sum + o.total, 0),
        orders: paidOrders.length,
      })
    }

    res.json(days)
  } catch (error) {
    logger.error('Erreur GET /stats/week:', error)
    res.status(500).json({ message: 'Erreur serveur' })
  }
})

// ─── GET /api/stats/products/top ───────────────────────

router.get('/products/top', async (req: AuthRequest, res: Response) => {
  try {
    const companyId = req.headers['x-company-id'] as string
    if (!companyId) {
      res.status(400).json({ message: 'x-company-id header requis' })
      return
    }

    const startOfDay = new Date()
    startOfDay.setHours(0, 0, 0, 0)

    const topProducts = await prisma.orderItem.groupBy({
      by: ['productId'],
      where: {
        order: {
          companyId,
          status: 'PAID',
          paidAt: { gte: startOfDay },
        },
      },
      _sum: { quantity: true },
      orderBy: { _sum: { quantity: 'desc' } },
      take: 5,
    })

    const productIds = topProducts.map((p) => p.productId)
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
    })

    const result = topProducts.map((tp) => ({
      product: products.find((p) => p.id === tp.productId),
      totalQuantity: tp._sum.quantity,
    }))

    res.json(result)
  } catch (error) {
    logger.error('Erreur GET /stats/products/top:', error)
    res.status(500).json({ message: 'Erreur serveur' })
  }
})

export default router
