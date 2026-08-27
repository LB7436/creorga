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

// ─── GET /api/products ─────────────────────────────────

router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const companyId = (req as any).companyId as string

    const categoryId = req.query.categoryId as string | undefined

    const products = await prisma.product.findMany({
      where: {
        companyId,
        isActive: true,
        ...(categoryId && { categoryId }),
      },
      orderBy: { sortOrder: 'asc' },
      include: { category: true },
    })

    res.json(products)
  } catch (error) {
    logger.error('Erreur GET /products:', error)
    res.status(500).json({ message: 'Erreur serveur' })
  }
})

// ─── POST /api/products ────────────────────────────────

const createProductSchema = z.object({
  categoryId: z.string().min(1),
  name: z.string().min(1),
  description: z.string().nullable().optional(),
  price: z.number().positive(),
  taxRate: z.number().min(0).max(100).default(17),
  image: z.string().nullable().optional(),
  allergens: z.array(z.string()).default([]),
  sortOrder: z.number().int().default(0),
  stock: z.number().int().nullable().optional(),
}).strict()

const updateProductSchema = createProductSchema.partial().refine((data) => Object.keys(data).length > 0, {
  message: 'Au moins un champ doit être fourni',
})

router.post('/', validate(createProductSchema), async (req: AuthRequest, res: Response) => {
  try {
    const companyId = (req as any).companyId as string

    const category = await prisma.category.findFirst({ where: { id: req.body.categoryId, companyId, isActive: true }, select: { id: true } })
    if (!category) {
      res.status(400).json({ message: 'Catégorie inconnue pour cette société' })
      return
    }

    const product = await prisma.product.create({
      data: { companyId, ...req.body },
    })

    res.status(201).json(product)
  } catch (error) {
    logger.error('Erreur POST /products:', error)
    res.status(500).json({ message: 'Erreur serveur' })
  }
})

// ─── PUT /api/products/:id ─────────────────────────────

router.put('/:id', validate(updateProductSchema), async (req: AuthRequest, res: Response) => {
  try {
    const companyId = (req as any).companyId as string
    if (req.body.categoryId) {
      const category = await prisma.category.findFirst({ where: { id: req.body.categoryId, companyId, isActive: true }, select: { id: true } })
      if (!category) {
        res.status(400).json({ message: 'Catégorie inconnue pour cette société' })
        return
      }
    }
    const { count } = await prisma.product.updateMany({
      where: { id: req.params.id, companyId },
      data: req.body,
    })
    if (count === 0) {
      res.status(404).json({ message: 'Produit non trouvé' })
      return
    }
    const product = await prisma.product.findUnique({ where: { id: req.params.id } })
    res.json(product)
  } catch (error) {
    logger.error('Erreur PUT /products:', error)
    res.status(500).json({ message: 'Erreur serveur' })
  }
})

// ─── DELETE /api/products/:id ──────────────────────────

router.delete('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const companyId = (req as any).companyId as string
    const { count } = await prisma.product.updateMany({
      where: { id: req.params.id, companyId },
      data: { isActive: false },
    })
    if (count === 0) {
      res.status(404).json({ message: 'Produit non trouvé' })
      return
    }
    res.json({ message: 'Produit supprimé' })
  } catch (error) {
    logger.error('Erreur DELETE /products:', error)
    res.status(500).json({ message: 'Erreur serveur' })
  }
})

export default router
