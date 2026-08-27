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

// ─── GET /api/categories ───────────────────────────────

router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const companyId = (req as any).companyId as string

    const categories = await prisma.category.findMany({
      where: { companyId, isActive: true },
      orderBy: { sortOrder: 'asc' },
      include: { _count: { select: { products: true } } },
    })

    res.json(categories)
  } catch (error) {
    logger.error('Erreur GET /categories:', error)
    res.status(500).json({ message: 'Erreur serveur' })
  }
})

// ─── POST /api/categories ──────────────────────────────

const createCategorySchema = z.object({
  name: z.string().min(1),
  icon: z.string().nullable().optional(),
  color: z.string().nullable().optional(),
  sortOrder: z.number().int().default(0),
}).strict()

const updateCategorySchema = createCategorySchema.partial().refine((data) => Object.keys(data).length > 0, {
  message: 'Au moins un champ doit être fourni',
})

router.post('/', validate(createCategorySchema), async (req: AuthRequest, res: Response) => {
  try {
    const companyId = (req as any).companyId as string

    const category = await prisma.category.create({
      data: { companyId, ...req.body },
    })

    res.status(201).json(category)
  } catch (error) {
    logger.error('Erreur POST /categories:', error)
    res.status(500).json({ message: 'Erreur serveur' })
  }
})

// ─── PUT /api/categories/:id ───────────────────────────

router.put('/:id', validate(updateCategorySchema), async (req: AuthRequest, res: Response) => {
  try {
    const companyId = (req as any).companyId as string
    const { count } = await prisma.category.updateMany({
      where: { id: req.params.id, companyId },
      data: req.body,
    })
    if (count === 0) {
      res.status(404).json({ message: 'Catégorie non trouvée' })
      return
    }
    const category = await prisma.category.findUnique({ where: { id: req.params.id } })
    res.json(category)
  } catch (error) {
    logger.error('Erreur PUT /categories:', error)
    res.status(500).json({ message: 'Erreur serveur' })
  }
})

// ─── DELETE /api/categories/:id ────────────────────────

router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const companyId = (req as any).companyId as string
    const { count } = await prisma.category.updateMany({
      where: { id: req.params.id, companyId },
      data: { isActive: false },
    })
    if (count === 0) {
      res.status(404).json({ message: 'Catégorie non trouvée' })
      return
    }
    res.json({ message: 'Catégorie supprimée' })
  } catch (error) {
    logger.error('Erreur DELETE /categories:', error)
    res.status(500).json({ message: 'Erreur serveur' })
  }
})

// ─── PUT /api/categories/reorder ───────────────────────

router.put('/reorder/bulk', async (req: AuthRequest, res: Response) => {
  try {
    const companyId = (req as any).companyId as string
    const items: Array<{ id: string; sortOrder: number }> = req.body

    // updateMany cloisonné : un id d'une autre société est ignoré au lieu
    // d'être réordonné.
    await prisma.$transaction(
      items.map((item) =>
        prisma.category.updateMany({
          where: { id: item.id, companyId },
          data: { sortOrder: item.sortOrder },
        }),
      ),
    )

    res.json({ message: 'Ordre sauvegardé' })
  } catch (error) {
    logger.error('Erreur PUT /categories/reorder:', error)
    res.status(500).json({ message: 'Erreur serveur' })
  }
})

export default router
