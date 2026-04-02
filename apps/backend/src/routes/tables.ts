import { Router, type Response } from 'express'
import { z } from 'zod'
import prisma from '../lib/prisma'
import { authenticate, type AuthRequest } from '../middleware/auth'
import { validate } from '../middleware/validate'
import logger from '../lib/logger'

const router = Router()
router.use(authenticate)

// ─── GET /api/tables ───────────────────────────────────

router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const companyId = req.headers['x-company-id'] as string
    if (!companyId) {
      res.status(400).json({ message: 'x-company-id header requis' })
      return
    }

    const tables = await prisma.table.findMany({
      where: { companyId, isActive: true },
      orderBy: { name: 'asc' },
    })

    // Récupérer les commandes ouvertes pour chaque table
    const openOrders = await prisma.order.findMany({
      where: {
        companyId,
        status: { in: ['OPEN', 'IN_PROGRESS', 'READY'] },
        tableId: { not: null },
      },
      include: { items: { include: { product: true } } },
    })

    const tablesWithOrders = tables.map((table) => ({
      ...table,
      currentOrder: openOrders.find((o) => o.tableId === table.id) || null,
    }))

    res.json(tablesWithOrders)
  } catch (error) {
    logger.error('Erreur GET /tables:', error)
    res.status(500).json({ message: 'Erreur serveur' })
  }
})

// ─── POST /api/tables ──────────────────────────────────

const createTableSchema = z.object({
  name: z.string().min(1),
  section: z.string().default('Salle'),
  capacity: z.number().int().positive().default(4),
  posX: z.number().default(0),
  posY: z.number().default(0),
  width: z.number().default(120),
  height: z.number().default(120),
})

router.post('/', validate(createTableSchema), async (req: AuthRequest, res: Response) => {
  try {
    const companyId = req.headers['x-company-id'] as string
    if (!companyId) {
      res.status(400).json({ message: 'x-company-id header requis' })
      return
    }

    const table = await prisma.table.create({
      data: { companyId, ...req.body },
    })

    res.status(201).json(table)
  } catch (error) {
    logger.error('Erreur POST /tables:', error)
    res.status(500).json({ message: 'Erreur serveur' })
  }
})

// ─── PUT /api/tables/:id ───────────────────────────────

router.put('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const table = await prisma.table.update({
      where: { id: req.params.id },
      data: req.body,
    })
    res.json(table)
  } catch (error) {
    logger.error('Erreur PUT /tables:', error)
    res.status(500).json({ message: 'Erreur serveur' })
  }
})

// ─── DELETE /api/tables/:id ────────────────────────────

router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    await prisma.table.update({
      where: { id: req.params.id },
      data: { isActive: false },
    })
    res.json({ message: 'Table supprimée' })
  } catch (error) {
    logger.error('Erreur DELETE /tables:', error)
    res.status(500).json({ message: 'Erreur serveur' })
  }
})

// ─── PUT /api/tables/positions ─────────────────────────

router.put('/positions/bulk', async (req: AuthRequest, res: Response) => {
  try {
    const positions: Array<{ id: string; posX: number; posY: number; width?: number; height?: number }> = req.body

    await prisma.$transaction(
      positions.map((p) =>
        prisma.table.update({
          where: { id: p.id },
          data: { posX: p.posX, posY: p.posY, width: p.width, height: p.height },
        }),
      ),
    )

    res.json({ message: 'Positions sauvegardées' })
  } catch (error) {
    logger.error('Erreur PUT /tables/positions:', error)
    res.status(500).json({ message: 'Erreur serveur' })
  }
})

export default router
