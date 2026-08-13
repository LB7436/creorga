import { Router, type Response } from 'express'
import { z } from 'zod'
import prisma from '../lib/prisma'
import { authenticate, type AuthRequest } from '../middleware/auth'
import { requireCompany } from '../middleware/requireCompany'
import { validate } from '../middleware/validate'
import logger from '../lib/logger'

const router = Router()
router.use(authenticate)
// Adhésion vérifiée : le header x-company-id était cru tel quel, et les routes
// par id n'avaient aucun filtre société.
router.use(requireCompany)

// ─── GET /api/tables ───────────────────────────────────

router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const companyId = (req as any).companyId as string

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
    const companyId = (req as any).companyId as string

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
    const companyId = (req as any).companyId as string
    // Le corps ne doit pas pouvoir réaffecter la table à une autre société.
    const { companyId: _societe, id: _id, ...donnees } = req.body ?? {}
    const { count } = await prisma.table.updateMany({
      where: { id: req.params.id, companyId },
      data: donnees,
    })
    if (count === 0) {
      res.status(404).json({ message: 'Table non trouvée' })
      return
    }
    const table = await prisma.table.findUnique({ where: { id: req.params.id } })
    res.json(table)
  } catch (error) {
    logger.error('Erreur PUT /tables:', error)
    res.status(500).json({ message: 'Erreur serveur' })
  }
})

// ─── DELETE /api/tables/:id ────────────────────────────

router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const companyId = (req as any).companyId as string
    const { count } = await prisma.table.updateMany({
      where: { id: req.params.id, companyId },
      data: { isActive: false },
    })
    if (count === 0) {
      res.status(404).json({ message: 'Table non trouvée' })
      return
    }
    res.json({ message: 'Table supprimée' })
  } catch (error) {
    logger.error('Erreur DELETE /tables:', error)
    res.status(500).json({ message: 'Erreur serveur' })
  }
})

// ─── PUT /api/tables/positions ─────────────────────────

router.put('/positions/bulk', async (req: AuthRequest, res: Response) => {
  try {
    const companyId = (req as any).companyId as string
    const positions: Array<{ id: string; posX: number; posY: number; width?: number; height?: number }> = req.body

    // updateMany cloisonné : un id d'une autre société est ignoré au lieu
    // d'être déplacé.
    await prisma.$transaction(
      positions.map((p) =>
        prisma.table.updateMany({
          where: { id: p.id, companyId },
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
