import { Router, type Response } from 'express'
import path from 'path'
import { z } from 'zod'
import prisma from '../../lib/prisma'
import logger from '../../lib/logger'
import { validate } from '../../middleware/validate'
import { creatorAuth, type CreatorRequest } from '../../middleware/creatorAuth'
import { safeWriteJson } from '../../lib/safe-json'
import { chargerConfig, lancerMoteur, moteurActive } from '../../jobs/opportunity-engine'
import { CONFIG_DEFAUT, COMPANY_ID_SERVEUR } from '../../lib/creator/regles'

const router = Router()
router.use(creatorAuth)

const CONFIG_FILE = path.resolve(process.cwd(), 'data', 'creator-rules.json')

// ─── GET /api/creator/opportunities?status&companyId ──────────────────

router.get('/opportunities', async (req: CreatorRequest, res: Response) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1)
    const limit = Math.min(100, Math.max(10, Number(req.query.limit) || 50))
    const where: any = {}
    if (req.query.status) where.status = String(req.query.status)
    if (req.query.companyId) where.companyId = String(req.query.companyId)

    const [total, items] = await Promise.all([
      prisma.opportunity.count({ where }),
      prisma.opportunity.findMany({
        where,
        // Les plus graves d'abord, puis les plus récentes.
        orderBy: [{ severity: 'asc' }, { createdAt: 'desc' }],
        skip: (page - 1) * limit,
        take: limit,
      }),
    ])

    // Tri par gravité réelle (critical > warning > info) — l'ordre
    // alphabétique de la base ne suffit pas.
    const poids: Record<string, number> = { critical: 0, warning: 1, info: 2 }
    items.sort(
      (a, b) => (poids[a.severity] ?? 3) - (poids[b.severity] ?? 3) ||
        b.createdAt.getTime() - a.createdAt.getTime(),
    )

    const companyIds = [...new Set(items.map((i) => i.companyId))]
    const societes = await prisma.company.findMany({
      where: { id: { in: companyIds } },
      select: { id: true, name: true },
    })
    const noms = new Map(societes.map((s) => [s.id, s.name]))

    res.json({
      items: items.map((i) => ({
        ...i,
        societe: i.companyId === COMPANY_ID_SERVEUR ? 'Serveur' : noms.get(i.companyId) ?? i.companyId,
      })),
      total,
      page,
      limit,
      moteurActif: moteurActive(),
    })
  } catch (error) {
    logger.error('Erreur GET /creator/opportunities:', error)
    res.status(500).json({ message: 'Erreur serveur' })
  }
})

// ─── PATCH /api/creator/opportunities/:id — suivi du statut ───────────

const patchSchema = z.object({
  status: z.enum(['NEW', 'SENT', 'ACCEPTED', 'DISMISSED']),
  statusNote: z.string().max(500).nullable().optional(),
})

router.patch('/opportunities/:id', validate(patchSchema), async (req: CreatorRequest, res: Response) => {
  try {
    const existante = await prisma.opportunity.findUnique({ where: { id: req.params.id } })
    if (!existante) {
      res.status(404).json({ message: 'Opportunité non trouvée' })
      return
    }
    const maj = await prisma.opportunity.update({
      where: { id: req.params.id },
      data: { status: req.body.status, statusNote: req.body.statusNote ?? existante.statusNote },
    })
    res.json(maj)
  } catch (error) {
    logger.error('Erreur PATCH /creator/opportunities/:id:', error)
    res.status(500).json({ message: 'Erreur serveur' })
  }
})

// ─── POST /api/creator/opportunities/engine/run — cycle à la demande ──

router.post('/opportunities/engine/run', async (_req: CreatorRequest, res: Response) => {
  try {
    const bilan = await lancerMoteur()
    res.json(bilan)
  } catch (error) {
    logger.error('Erreur POST /creator/opportunities/engine/run:', error)
    res.status(500).json({ message: 'Erreur serveur' })
  }
})

// ─── GET /api/creator/rules-config ────────────────────────────────────

router.get('/rules-config', (_req: CreatorRequest, res: Response) => {
  res.json({ regles: chargerConfig(), defauts: CONFIG_DEFAUT, moteurActif: moteurActive() })
})

// ─── PUT /api/creator/rules-config ────────────────────────────────────

const reglageSchema = z.object({
  actif: z.boolean(),
  seuil: z.number().min(0).optional(),
  seuilCritique: z.number().min(0).optional(),
})
const configSchema = z.object({ regles: z.record(z.string(), reglageSchema) })

router.put('/rules-config', validate(configSchema), (req: CreatorRequest, res: Response) => {
  try {
    // Seules les règles connues sont retenues : pas de clés arbitraires
    // dans le fichier de configuration.
    const retenues: Record<string, unknown> = {}
    for (const id of Object.keys(CONFIG_DEFAUT)) {
      if (req.body.regles[id]) retenues[id] = req.body.regles[id]
    }
    safeWriteJson(CONFIG_FILE, { regles: retenues })
    res.json({ regles: chargerConfig() })
  } catch (error) {
    logger.error('Erreur PUT /creator/rules-config:', error)
    res.status(500).json({ message: 'Erreur serveur' })
  }
})

export default router
