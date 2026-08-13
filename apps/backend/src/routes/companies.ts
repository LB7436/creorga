import { Router } from 'express'
import { z } from 'zod'
import prisma from '../lib/prisma'
import { authenticate } from '../middleware/auth'
import { requireCompany } from '../middleware/requireCompany'
import { validate } from '../middleware/validate'
import type { AuthRequest } from '../middleware/auth'

const router = Router()
router.use(authenticate)

const updateSchema = z.object({
  name: z.string().min(1),
  legalName: z.string().optional(),
  vatNumber: z.string().optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
})

// GET /companies/members — list all members of the current company
// requireCompany : le header était cru tel quel — tout compte authentifié
// pouvait lister les membres (noms + emails) de n'importe quelle société.
router.get('/members', requireCompany, async (req: AuthRequest, res, next) => {
  try {
    const companyId = (req as any).companyId as string

    const members = await prisma.userCompany.findMany({
      where: { companyId },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true,
          },
        },
      },
      orderBy: { role: 'asc' },
    })

    res.json(members)
  } catch (err) {
    next(err)
  }
})

// PUT /companies/:id — update company info
router.put('/:id', validate(updateSchema), async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params
    const companyId = req.headers['x-company-id'] as string

    // Ensure user belongs to this company
    if (id !== companyId) {
      return res.status(403).json({ message: 'Accès refusé' })
    }

    // Check role
    const uc = await prisma.userCompany.findUnique({
      where: { userId_companyId: { userId: req.user!.userId, companyId } },
    })
    if (!uc || (uc.role !== 'OWNER' && uc.role !== 'MANAGER')) {
      return res.status(403).json({ message: 'Accès réservé aux admins' })
    }

    const { name, legalName, vatNumber, address, phone, email } = req.body
    const company = await prisma.company.update({
      where: { id },
      data: { name, legalName, vatNumber, address, phone, email: email || null },
    })

    res.json(company)
  } catch (err) {
    next(err)
  }
})

export default router
