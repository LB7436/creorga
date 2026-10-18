import { type Response } from 'express'
import { createTrackedRouter as Router } from '../lib/tracked-router'
import prisma from '../lib/prisma'
import { authenticate, type AuthRequest } from '../middleware/auth'
import { requireCompany } from '../middleware/requireCompany'
import logger from '../lib/logger'
import { floorSchema } from '../lib/floor-validation'
import { floorHash } from '../lib/floor-workspace'

const router = Router()
router.use(authenticate)
// Le header x-company-id était cru sans vérifier l'adhésion : n'importe quel
// compte authentifié pouvait lire le chiffre d'affaires d'une autre société.
router.use(requireCompany)

// ─── GET /api/stats/today ──────────────────────────────

router.get('/today', async (req: AuthRequest, res: Response) => {
  try {
    const companyId = (req as any).companyId as string

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

    // Le workspace courant est l'autorité de salle, y compris lorsqu'il est vide.
    // Lecture seule : ne pas adopter le miroir ni recréer son occupation depuis les commandes.
    const workspace = await prisma.floorWorkspace.findUnique({
      where: { companyId }, select: { revision: true, snapshot: true, snapshotHash: true },
    })
    let tableStats: { tablesTotal: number; tablesOccupied: number | null; tablesFree: number | null;
      tablesUnavailable: number | null; tablesSource: 'postgres-workspace' | 'legacy-sql-configuration' }
    if (workspace) {
      const parsed = floorSchema.safeParse(workspace.snapshot)
      if (!parsed.success || !Number.isSafeInteger(parsed.data.updatedAt) || parsed.data.updatedAt < 0
        || BigInt(parsed.data.updatedAt) !== workspace.revision || floorHash(workspace.snapshot) !== workspace.snapshotHash) {
        res.status(503).json({ message: 'Occupation de la salle indisponible : le workspace doit être vérifié.', code: 'FLOOR_WORKSPACE_INVALID' })
        return
      }
      const tables = parsed.data.tables
      tableStats = {
        tablesTotal: tables.length,
        tablesOccupied: tables.filter(table => table.status === 'OCCUPEE').length,
        tablesFree: tables.filter(table => table.status === 'LIBRE').length,
        tablesUnavailable: tables.filter(table => table.status === 'RESERVEE' || table.status === 'NETTOYAGE').length,
        tablesSource: 'postgres-workspace',
      }
    } else {
      // L'ancien modèle Table décrit la capacité, pas la présence de personnes.
      // Une commande impayée n'est pas non plus une preuve d'occupation physique.
      tableStats = { tablesTotal: await prisma.table.count({ where: { companyId, isActive: true } }),
        tablesOccupied: null, tablesFree: null, tablesUnavailable: null, tablesSource: 'legacy-sql-configuration' }
    }

    res.json({
      revenue,
      orderCount,
      avgTicket,
      ...tableStats,
    })
  } catch (error) {
    logger.error('Erreur GET /stats/today:', error)
    res.status(500).json({ message: 'Erreur serveur' })
  }
})

// ─── GET /api/stats/week ───────────────────────────────

router.get('/week', async (req: AuthRequest, res: Response) => {
  try {
    const companyId = (req as any).companyId as string

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
    const companyId = (req as any).companyId as string

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
