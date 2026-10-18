import { createTrackedRouter as Router } from '../lib/tracked-router'
import bcrypt from 'bcryptjs'
import { z } from 'zod'
import prisma from '../lib/prisma'
import { authenticate } from '../middleware/auth'
import { requireCompany } from '../middleware/requireCompany'
import { validate } from '../middleware/validate'
import type { AuthRequest } from '../middleware/auth'
import { lockPortalConfiguration, nextPortalRevision } from '../lib/portal-config-lock'
import { accessFor, hasCapability, validCapabilityOverrides } from '../lib/business-permissions'
import { transactionBusinessAccess, BusinessPermissionError } from '../lib/business-permission-transaction'

const router = Router()
router.use(authenticate)

// Sonde indépendante des brouillons POS : aucune donnée commerciale ou
// politique d'un autre collaborateur n'est transmise.
router.get('/access', requireCompany, (req, res) => {
  res.set('Cache-Control', 'private, no-store').json((req as any).businessAccess)
})

const updateSchema = z.object({
  name: z.string().trim().min(1).max(200),
  legalName: z.string().optional(),
  vatNumber: z.string().optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional().or(z.literal('')),
  // Un fichier de 2 Mo devient environ 2,8 Mo en data URL. La limite évite
  // qu'un client envoie un corps arbitrairement gros dans la base.
  logo: z.string().max(3_000_000).nullable().optional(),
  portalAccentColor: z.string().regex(/^#[0-9a-f]{6}$/i).optional(),
  legalProfile: z.object({ legalForm: z.string().trim().max(200), rcsNumber: z.string().trim().max(100),
    authorizationNumber: z.string().trim().max(100), profession: z.string().trim().max(200),
    legalMention: z.string().trim().max(1000), rcsExemptionReason: z.string().trim().max(500) }).strict().optional(),
})

const capabilitiesSchema = z.record(z.boolean()).refine(validCapabilityOverrides, { message: 'Capacité inconnue ou valeur invalide' })
const memberRoleSchema = z.enum(['ADMIN', 'MANAGER', 'SERVER', 'CASHIER', 'EMPLOYEE'])
const updateMemberSchema = z.object({
  // Le propriétaire unique est créé lors de l'inscription/migration. Les
  // comptes équipe ne peuvent pas être promus propriétaire depuis l'UI.
  role: memberRoleSchema.optional(),
  isActive: z.boolean().optional(),
  capabilities: capabilitiesSchema.optional(),
  expectedAccessVersion: z.number().int().nonnegative(),
  reason: z.string().trim().min(5).max(500),
}).strict().refine((value) => value.role !== undefined || value.isActive !== undefined || value.capabilities !== undefined, {
  message: 'Aucune modification demandée',
})

const createMemberSchema = z.object({
  email: z.string().trim().toLowerCase().email('Email invalide'),
  password: z.string().min(8, 'Le mot de passe doit contenir au moins 8 caractères').max(128),
  firstName: z.string().trim().min(1, 'Prénom requis').max(80),
  lastName: z.string().trim().min(1, 'Nom requis').max(80),
  role: memberRoleSchema.default('EMPLOYEE'),
  capabilities: capabilitiesSchema.default({}),
}).strict()

function permissionConflict(message: string, status = 409) { return Object.assign(new Error(message), { status }) }
function mayDelegate(actor: ReturnType<typeof accessFor>, candidate: ReturnType<typeof accessFor>) {
  if (actor.role === 'OWNER') return
  if (!actor.capabilities.includes('permissions.manage') || candidate.capabilities.includes('permissions.manage')
    || candidate.capabilities.some(capability => !actor.capabilities.includes(capability))) throw new BusinessPermissionError()
}

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
    if (!caller || !caller.isActive || (!hasCapability(req as any, 'hr.manage') && !hasCapability(req as any, 'permissions.manage'))) {
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

    res.json(members.map(member => ({ ...member, businessAccess: accessFor(member) })))
  } catch (err) {
    next(err)
  }
})

// POST /companies/members — crée un véritable compte salarié dans la société.
// Seul le propriétaire peut créer un accès et aucun second propriétaire ne peut
// être créé depuis cet écran.
router.post('/members', requireCompany, validate(createMemberSchema), async (req: AuthRequest, res, next) => {
  try {
    const companyId = (req as any).companyId as string
    const caller = await currentMembership(req)
    if (!caller || !caller.isActive || !hasCapability(req as any, 'permissions.manage')) {
      res.status(403).json({ message: 'Accès réservé au propriétaire' })
      return
    }

    const { email, password, firstName, lastName, role, capabilities } = req.body
    const hashedPassword = await bcrypt.hash(password, 12)

    const membership = await prisma.$transaction(async (tx) => {
      const actor = await transactionBusinessAccess(tx, companyId, req.user!.userId)
      mayDelegate(actor, accessFor({ role, capabilities }))
      const existingUser = await tx.user.findUnique({ where: { email } })
      if (existingUser) {
        const existingMembership = await tx.userCompany.findUnique({
          where: { userId_companyId: { userId: existingUser.id, companyId } },
        })
        if (existingMembership) {
          const conflict = new Error('Ce compte appartient déjà à cette société') as Error & { status?: number }
          conflict.status = 409
          throw conflict
        }
        // Un compte existant peut appartenir à une autre entreprise. On ne
        // remplace jamais son mot de passe ni son identité à son insu.
        const conflict = new Error('Cet email est déjà utilisé par un autre compte') as Error & { status?: number }
        conflict.status = 409
        throw conflict
      }

      const user = await tx.user.create({
        data: { email, password: hashedPassword, firstName, lastName },
      })
      const created = await tx.userCompany.create({
        data: { userId: user.id, companyId, role, capabilities, isActive: true },
        include: {
          user: { select: { id: true, firstName: true, lastName: true, email: true } },
        },
      })
      await tx.businessPermissionEvent.create({ data: { membershipId: created.id, companyId, userId: user.id, actorId: req.user!.userId,
        beforeVersion: 0, afterVersion: 0, before: { existed: false }, after: { role, capabilities, isActive: true }, reason: 'Création explicite du compte métier' } })
      return created
    })

    res.status(201).json({ ...membership, businessAccess: accessFor(membership) })
  } catch (err: any) {
    if (err?.status === 409 || err?.code === 'P2002') {
      res.status(409).json({ message: err?.message || 'Cet email est déjà utilisé' })
      return
    }
    next(err)
  }
})

// PATCH /companies/members/:userId — rôle ou activation dans la société courante.
router.patch('/members/:userId', requireCompany, validate(updateMemberSchema), async (req: AuthRequest, res, next) => {
  try {
    const companyId = (req as any).companyId as string
    const updated = await prisma.$transaction(async tx => {
      // Les changements d'accès sont sérialisés par société. Les opérations
      // métier relisent l'acteur sous FOR SHARE après leur propre verrou.
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${companyId}), hashtext('business-permissions'))`
      const actor = await transactionBusinessAccess(tx, companyId, req.user!.userId)
      if (!actor.capabilities.includes('permissions.manage')) throw new BusinessPermissionError()
      const target = await tx.userCompany.findUnique({ where: { userId_companyId: { userId: req.params.userId, companyId } } })
      if (!target) throw permissionConflict('Utilisateur introuvable dans cette société', 404)
      if (target.role === 'OWNER' || target.userId === req.user!.userId) throw permissionConflict('Ce parcours ne peut pas modifier votre propre accès ou un propriétaire.', 403)
      if (target.accessVersion !== req.body.expectedAccessVersion) throw permissionConflict('Les droits ont changé. Rechargez avant de confirmer une nouvelle décision.')
      // Une désactivation n'est pas une façon de contourner le plafond de
      // délégation : contrôler aussi les droits du compte AVANT modification.
      mayDelegate(actor, accessFor({ ...target, isActive: true }))
      if (req.body.role && req.body.role !== target.role && Object.keys(target.capabilities as object).length && req.body.capabilities === undefined) {
        throw permissionConflict('Choisissez explicitement les capacités à conserver ou remplacer pour ce nouveau rôle.')
      }
      const candidate = { ...target, ...(req.body.role !== undefined ? { role: req.body.role } : {}),
        ...(req.body.isActive !== undefined ? { isActive: req.body.isActive } : {}),
        ...(req.body.capabilities !== undefined ? { capabilities: req.body.capabilities } : {}) }
      mayDelegate(actor, accessFor(candidate))
      const saved = await tx.userCompany.update({ where: { id: target.id }, data: { role: candidate.role, isActive: candidate.isActive,
        capabilities: candidate.capabilities as any, accessVersion: { increment: 1 } },
        include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } } })
      await tx.businessPermissionEvent.create({ data: { membershipId: target.id, companyId, userId: target.userId, actorId: req.user!.userId,
        beforeVersion: target.accessVersion, afterVersion: saved.accessVersion,
        before: { role: target.role, capabilities: target.capabilities, isActive: target.isActive },
        after: { role: saved.role, capabilities: saved.capabilities, isActive: saved.isActive }, reason: req.body.reason } })
      return saved
    })
    res.json({ ...updated, businessAccess: accessFor(updated) })
  } catch (err: any) {
    if (err?.status) return res.status(err.status).json({ message: err.message })
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
    if (!uc || !uc.isActive || !accessFor(uc).capabilities.includes('settings.manage')) {
      return res.status(403).json({ message: 'Accès réservé aux admins' })
    }

    const { name, legalName, vatNumber, address, phone, email, logo, portalAccentColor, legalProfile } = req.body
    // Le premier démarrage enregistre identité visuelle et couleur du portail
    // dans une seule transaction : pas d'état « nom sauvegardé, couleur perdue ».
    const company = await prisma.$transaction(async (tx) => {
      const access = await transactionBusinessAccess(tx, companyId, req.user!.userId)
      if (!access.capabilities.includes('settings.manage')) throw new BusinessPermissionError()
      if (portalAccentColor) await lockPortalConfiguration(tx, companyId)
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
          ...(legalProfile !== undefined ? { legalProfile } : {}),
        },
      })
      if (portalAccentColor) {
        const existing = await tx.portalConfiguration.findUnique({ where: { companyId } })
        const updatedAt = nextPortalRevision(existing)
        await tx.portalConfiguration.upsert({
          where: { companyId },
          create: { companyId, accentColor: portalAccentColor, updatedAt },
          update: { accentColor: portalAccentColor, updatedAt },
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
