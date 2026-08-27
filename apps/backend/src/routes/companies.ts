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
  // Un fichier de 2 Mo devient environ 2,8 Mo en data URL. La limite évite
  // qu'un client envoie un corps arbitrairement gros dans la base.
  logo: z.string().max(3_000_000).nullable().optional(),
  portalAccentColor: z.string().regex(/^#[0-9a-f]{6}$/i).optional(),
})

const updateMemberSchema = z.object({
  role: z.enum(['OWNER', 'MANAGER', 'EMPLOYEE']).optional(),
  isActive: z.boolean().optional(),
}).refine((value) => value.role !== undefined || value.isActive !== undefined, {
  message: 'Aucune modification demandée',
})

async function currentMembership(req: AuthRequest) {
  const companyId = (req as any).companyId as string
  return prisma.userCompany.findUnique({
    where: { userId_companyId: { userId: req.user!.userId, companyId } },
  })
}

// GET /companies/members — list all members of the current company
// requireCompany : le header était cru tel quel — tout compte authentifié
// pouvait lister les membres (noms + emails) de n'importe quelle société.
router.get('/members', requireCompany, async (req: AuthRequest, res, next) => {
  try {
    const companyId = (req as any).companyId as string

    const caller = await currentMembership(req)
    if (!caller || !caller.isActive || (caller.role !== 'OWNER' && caller.role !== 'MANAGER')) {
      res.status(403).json({ message: 'Accès réservé aux responsables' })
      return
    }

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

// PATCH /companies/members/:userId — rôle ou activation dans la société courante.
router.patch('/members/:userId', requireCompany, validate(updateMemberSchema), async (req: AuthRequest, res, next) => {
  try {
    const companyId = (req as any).companyId as string
    const caller = await currentMembership(req)
    if (!caller || !caller.isActive || caller.role !== 'OWNER') {
      res.status(403).json({ message: 'Accès réservé au propriétaire' })
      return
    }

    const target = await prisma.userCompany.findUnique({
      where: { userId_companyId: { userId: req.params.userId, companyId } },
    })
    if (!target) {
      res.status(404).json({ message: 'Utilisateur introuvable dans cette société' })
      return
    }

    const requestedRole = req.body.role as string | undefined
    const requestedActive = req.body.isActive as boolean | undefined
    if (target.userId === req.user!.userId && (requestedActive === false || (requestedRole && requestedRole !== 'OWNER'))) {
      res.status(400).json({ message: 'Vous ne pouvez pas retirer votre propre accès propriétaire' })
      return
    }

    if (target.role === 'OWNER' && (requestedActive === false || (requestedRole && requestedRole !== 'OWNER'))) {
      const ownerCount = await prisma.userCompany.count({
        where: { companyId, role: 'OWNER', isActive: true },
      })
      if (ownerCount <= 1) {
        res.status(400).json({ message: 'La société doit conserver au moins un propriétaire actif' })
        return
      }
    }

    const updated = await prisma.userCompany.update({
      where: { id: target.id },
      data: {
        ...(requestedRole !== undefined ? { role: requestedRole } : {}),
        ...(requestedActive !== undefined ? { isActive: requestedActive } : {}),
      },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
    })
    res.json(updated)
  } catch (err) {
    next(err)
  }
})

// PUT /companies/:id — update company info
router.put('/:id', requireCompany, validate(updateSchema), async (req: AuthRequest, res, next) => {
  try {
    const { id } = req.params
    const companyId = (req as any).companyId as string

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

    const { name, legalName, vatNumber, address, phone, email, logo, portalAccentColor } = req.body
    // Le premier démarrage enregistre identité visuelle et couleur du portail
    // dans une seule transaction : pas d'état « nom sauvegardé, couleur perdue ».
    const company = await prisma.$transaction(async (tx) => {
      const updated = await tx.company.update({
        where: { id },
        data: {
          name: name.trim(),
          ...(legalName !== undefined ? { legalName: legalName.trim() || null } : {}),
          ...(vatNumber !== undefined ? { vatNumber: vatNumber.trim() || null } : {}),
          ...(address !== undefined ? { address: address.trim() || null } : {}),
          ...(phone !== undefined ? { phone: phone.trim() || null } : {}),
          ...(email !== undefined ? { email: email.trim().toLowerCase() || null } : {}),
          ...(logo !== undefined ? { logo } : {}),
        },
      })
      if (portalAccentColor) {
        await tx.portalConfiguration.upsert({
          where: { companyId },
          create: { companyId, accentColor: portalAccentColor },
          update: { accentColor: portalAccentColor },
        })
      }
      return updated
    })

    res.json(company)
  } catch (err) {
    next(err)
  }
})

export default router
