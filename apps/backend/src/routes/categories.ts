import { Router, type Response } from 'express'
import { z } from 'zod'
import prisma from '../lib/prisma'
import { authenticate, type AuthRequest } from '../middleware/auth'
import { validate } from '../middleware/validate'
import logger from '../lib/logger'

const router = Router()
router.use(authenticate)

// ─── GET /api/categories ───────────────────────────────

router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const companyId = req.headers['x-company-id'] as string
    if (!companyId) {
      res.status(400).json({ message: 'x-company-id header requis' })
      return
    }

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
})

router.post('/', validate(createCategorySchema), async (req: AuthRequest, res: Response) => {
  try {
    const companyId = req.headers['x-company-id'] as string
    if (!companyId) {
      res.status(400).json({ message: 'x-company-id header requis' })
      return
    }

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

router.put('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const category = await prisma.category.update({
      where: { id: req.params.id },
      data: req.body,
    })
    res.json(category)
  } catch (error) {
    logger.error('Erreur PUT /categories:', error)
    res.status(500).json({ message: 'Erreur serveur' })
  }
})

// ─── DELETE /api/categories/:id ────────────────────────

router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    await prisma.category.update({
      where: { id: req.params.id },
      data: { isActive: false },
    })
    res.json({ message: 'Catégorie supprimée' })
  } catch (error) {
    logger.error('Erreur DELETE /categories:', error)
    res.status(500).json({ message: 'Erreur serveur' })
  }
})

// ─── PUT /api/categories/reorder ───────────────────────

router.put('/reorder/bulk', async (req: AuthRequest, res: Response) => {
  try {
    const items: Array<{ id: string; sortOrder: number }> = req.body

    await prisma.$transaction(
      items.map((item) =>
        prisma.category.update({
          where: { id: item.id },
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
