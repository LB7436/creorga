import { Router, type Response } from 'express'
import fs from 'fs'
import path from 'path'
import { Prisma } from '@prisma/client'
import prisma from '../../lib/prisma'
import logger from '../../lib/logger'
import { creatorAuth, type CreatorRequest } from '../../middleware/creatorAuth'
import { listFullBackups } from '../../jobs/backup-worker'
import { listPgDumps } from '../../jobs/pg-dump'
import { jourLocal, calculerSnapshotSociete } from '../../jobs/creator-metrics'
import { compterLignes, poidsDonnees } from '../../lib/creator/volumetrie'

/**
 * Routes de lecture de la console créateur — transversales à toutes les
 * sociétés, protégées par creatorAuth exclusivement (jamais authenticate ni
 * requireCompany : les JWT sociétés ne valent rien ici).
 */

const router = Router()
router.use(creatorAuth)

const JOUR_MS = 24 * 60 * 60 * 1000
const numerique = (v: bigint | number | null | undefined) => Number(v ?? 0)

// ─── GET /api/creator/overview ────────────────────────────────────────

router.get('/overview', async (_req: CreatorRequest, res: Response) => {
  try {
    const debutJour = jourLocal(new Date())
    const ilYA30Jours = new Date(Date.now() - 30 * JOUR_MS)

    const societes = await prisma.company.findMany({
      select: { id: true, name: true, createdAt: true },
      orderBy: { name: 'asc' },
    })

    const cartes = []
    for (const s of societes) {
      const [jour, trente, actifs, oppNouvelles, serie, derniereActivite] = await Promise.all([
        prisma.order.aggregate({
          where: { companyId: s.id, status: 'PAID', paidAt: { gte: debutJour } },
          _sum: { total: true },
          _count: { _all: true },
        }),
        prisma.order.aggregate({
          where: { companyId: s.id, status: 'PAID', paidAt: { gte: ilYA30Jours } },
          _sum: { total: true },
          _count: { _all: true },
        }),
        prisma.activityEvent.findMany({
          where: { companyId: s.id, ts: { gte: debutJour }, userId: { not: null } },
          distinct: ['userId'],
          select: { userId: true },
        }),
        prisma.opportunity.count({ where: { companyId: s.id, status: 'NEW' } }),
        prisma.tenantMetricDaily.findMany({
          where: { companyId: s.id, date: { gte: ilYA30Jours } },
          orderBy: { date: 'asc' },
          select: {
            date: true,
            revenue: true,
            orders: true,
            mutations: true,
            activeUsers: true,
            cashDiscrepancy: true,
          },
        }),
        prisma.activityEvent.findFirst({
          where: { companyId: s.id },
          orderBy: { ts: 'desc' },
          select: { ts: true },
        }),
      ])

      cartes.push({
        id: s.id,
        nom: s.name,
        creeLe: s.createdAt,
        caJour: numerique(jour._sum.total),
        commandesJour: jour._count._all,
        ca30Jours: numerique(trente._sum.total),
        commandes30Jours: trente._count._all,
        actifsAujourdhui: actifs.length,
        opportunitesNouvelles: oppNouvelles,
        derniereActivite: derniereActivite?.ts ?? null,
        serie,
      })
    }

    res.json({ societes: cartes })
  } catch (error) {
    logger.error('Erreur GET /creator/overview:', error)
    res.status(500).json({ message: 'Erreur serveur' })
  }
})

// ─── GET /api/creator/companies ───────────────────────────────────────

router.get('/companies', async (_req: CreatorRequest, res: Response) => {
  try {
    const seuilInactivite = new Date(Date.now() - 14 * JOUR_MS)
    const societes = await prisma.company.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        address: true,
        createdAt: true,
        _count: { select: { users: true } },
      },
      orderBy: { name: 'asc' },
    })

    const lignes = []
    for (const s of societes) {
      const [dernierSnapshot, derniereActivite] = await Promise.all([
        prisma.tenantMetricDaily.findFirst({
          where: { companyId: s.id },
          orderBy: { date: 'desc' },
        }),
        prisma.activityEvent.findFirst({
          where: { companyId: s.id },
          orderBy: { ts: 'desc' },
          select: { ts: true },
        }),
      ])
      lignes.push({
        id: s.id,
        nom: s.name,
        email: s.email,
        telephone: s.phone,
        adresse: s.address,
        creeLe: s.createdAt,
        membres: s._count.users,
        derniereActivite: derniereActivite?.ts ?? null,
        actif: !!derniereActivite && derniereActivite.ts >= seuilInactivite,
        dernierSnapshot: dernierSnapshot
          ? { ...dernierSnapshot, dataBytes: numerique(dernierSnapshot.dataBytes) }
          : null,
      })
    }

    res.json(lignes)
  } catch (error) {
    logger.error('Erreur GET /creator/companies:', error)
    res.status(500).json({ message: 'Erreur serveur' })
  }
})

// ─── GET /api/creator/companies/:id ───────────────────────────────────

router.get('/companies/:id', async (req: CreatorRequest, res: Response) => {
  try {
    const societe = await prisma.company.findUnique({
      where: { id: req.params.id },
      select: {
        id: true,
        name: true,
        legalName: true,
        vatNumber: true,
        email: true,
        phone: true,
        address: true,
        createdAt: true,
      },
    })
    if (!societe) {
      res.status(404).json({ message: 'Société non trouvée' })
      return
    }

    const membres = await prisma.userCompany.findMany({
      where: { companyId: societe.id },
      include: {
        user: { select: { id: true, firstName: true, lastName: true, email: true } },
      },
      orderBy: { role: 'asc' },
    })

    // Dernière connexion par membre (LoginEvent, kind LOGIN).
    const connexions = await prisma.loginEvent.groupBy({
      by: ['userId'],
      where: { kind: 'LOGIN', userId: { in: membres.map((m) => m.userId) } },
      _max: { ts: true },
    })
    const derniereConnexion = new Map(connexions.map((c) => [c.userId, c._max.ts]))

    const modules = await prisma.companyModule.findMany({
      where: { companyId: societe.id },
      select: { moduleId: true, isActive: true, expiresAt: true },
    })

    res.json({
      societe,
      membres: membres.map((m) => ({
        userId: m.userId,
        prenom: m.user.firstName,
        nom: m.user.lastName,
        email: m.user.email,
        role: m.role,
        actif: m.isActive,
        derniereConnexion: derniereConnexion.get(m.userId) ?? null,
      })),
      modules,
    })
  } catch (error) {
    logger.error('Erreur GET /creator/companies/:id:', error)
    res.status(500).json({ message: 'Erreur serveur' })
  }
})

// ─── GET /api/creator/companies/:id/metrics?jours=30 ──────────────────

router.get('/companies/:id/metrics', async (req: CreatorRequest, res: Response) => {
  try {
    const jours = Math.min(365, Math.max(1, Number(req.query.jours) || 30))
    const depuis = new Date(Date.now() - jours * JOUR_MS)
    const serie = await prisma.tenantMetricDaily.findMany({
      where: { companyId: req.params.id, date: { gte: depuis } },
      orderBy: { date: 'asc' },
    })
    res.json(serie.map((m) => ({ ...m, dataBytes: numerique(m.dataBytes) })))
  } catch (error) {
    logger.error('Erreur GET /creator/companies/:id/metrics:', error)
    res.status(500).json({ message: 'Erreur serveur' })
  }
})

// ─── GET /api/creator/companies/:id/volumes — à la demande ────────────

router.get('/companies/:id/volumes', async (req: CreatorRequest, res: Response) => {
  try {
    const rowCounts = await compterLignes(req.params.id)
    const dataBytes = numerique(await poidsDonnees(req.params.id))
    res.json({ rowCounts, dataBytes })
  } catch (error) {
    logger.error('Erreur GET /creator/companies/:id/volumes:', error)
    res.status(500).json({ message: 'Erreur serveur' })
  }
})

// ─── POST /api/creator/companies/:id/recalculer?jour=AAAA-MM-JJ ───────

router.post('/companies/:id/recalculer', async (req: CreatorRequest, res: Response) => {
  try {
    const brut = String(req.query.jour || '')
    const jour = /^\d{4}-\d{2}-\d{2}$/.test(brut)
      ? jourLocal(new Date(`${brut}T12:00:00`))
      : jourLocal(new Date(Date.now() - JOUR_MS))
    const donnees = await calculerSnapshotSociete(req.params.id, jour)
    const snapshot = await prisma.tenantMetricDaily.upsert({
      where: { companyId_date: { companyId: req.params.id, date: jour } },
      update: donnees,
      create: { companyId: req.params.id, date: jour, ...donnees },
    })
    res.json({ ...snapshot, dataBytes: numerique(snapshot.dataBytes) })
  } catch (error) {
    logger.error('Erreur POST /creator/companies/:id/recalculer:', error)
    res.status(500).json({ message: 'Erreur serveur' })
  }
})

// ─── GET /api/creator/events — journal transversal filtrable ──────────

router.get('/events', async (req: CreatorRequest, res: Response) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1)
    const limit = Math.min(200, Math.max(10, Number(req.query.limit) || 50))

    const where: any = {}
    if (req.query.companyId) where.companyId = String(req.query.companyId)
    if (req.query.userId) where.userId = String(req.query.userId)
    if (req.query.module) where.module = String(req.query.module)
    if (req.query.method) where.method = String(req.query.method)
    const date = String(req.query.date || '')
    if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      const debut = jourLocal(new Date(`${date}T12:00:00`))
      where.ts = { gte: debut, lt: new Date(debut.getTime() + JOUR_MS) }
    }

    const [total, items] = await Promise.all([
      prisma.activityEvent.count({ where }),
      prisma.activityEvent.findMany({
        where,
        orderBy: { ts: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
    ])

    // Résolution des noms (utilisateurs + sociétés) pour l'affichage.
    const userIds = [...new Set(items.map((i) => i.userId).filter(Boolean))] as string[]
    const companyIds = [...new Set(items.map((i) => i.companyId).filter(Boolean))] as string[]
    const [utilisateurs, societes] = await Promise.all([
      prisma.user.findMany({
        where: { id: { in: userIds } },
        select: { id: true, firstName: true, lastName: true },
      }),
      prisma.company.findMany({ where: { id: { in: companyIds } }, select: { id: true, name: true } }),
    ])
    const nomUtilisateur = new Map(utilisateurs.map((u) => [u.id, `${u.firstName} ${u.lastName}`]))
    const nomSociete = new Map(societes.map((s) => [s.id, s.name]))

    res.json({
      items: items.map((i) => ({
        ...i,
        utilisateur: i.userId ? nomUtilisateur.get(i.userId) ?? i.userId : null,
        societe: i.companyId ? nomSociete.get(i.companyId) ?? i.companyId : null,
      })),
      total,
      page,
      limit,
    })
  } catch (error) {
    logger.error('Erreur GET /creator/events:', error)
    res.status(500).json({ message: 'Erreur serveur' })
  }
})

// ─── GET /api/creator/errors ──────────────────────────────────────────

router.get('/errors', async (req: CreatorRequest, res: Response) => {
  try {
    const page = Math.max(1, Number(req.query.page) || 1)
    const limit = Math.min(100, Math.max(10, Number(req.query.limit) || 50))
    const [total, items] = await Promise.all([
      prisma.errorLog.count(),
      prisma.errorLog.findMany({ orderBy: { ts: 'desc' }, skip: (page - 1) * limit, take: limit }),
    ])
    res.json({ items, total, page, limit })
  } catch (error) {
    logger.error('Erreur GET /creator/errors:', error)
    res.status(500).json({ message: 'Erreur serveur' })
  }
})

// ─── GET /api/creator/backups — ZIP data/ ET dumps PostgreSQL ─────────

router.get('/backups', async (_req: CreatorRequest, res: Response) => {
  try {
    res.json({ zips: listFullBackups(), dumps: listPgDumps() })
  } catch (error) {
    logger.error('Erreur GET /creator/backups:', error)
    res.status(500).json({ message: 'Erreur serveur' })
  }
})

// ─── GET /api/creator/health — santé serveur globale ──────────────────

function tailleDossier(dossier: string, profondeur = 0): number {
  if (profondeur > 6) return 0
  let total = 0
  try {
    for (const entree of fs.readdirSync(dossier, { withFileTypes: true })) {
      const chemin = path.join(dossier, entree.name)
      try {
        if (entree.isDirectory()) total += tailleDossier(chemin, profondeur + 1)
        else if (entree.isFile()) total += fs.statSync(chemin).size
      } catch {
        // Fichier disparu entre readdir et stat : ignoré.
      }
    }
  } catch {
    // Dossier illisible : ignoré.
  }
  return total
}

router.get('/health', async (_req: CreatorRequest, res: Response) => {
  try {
    let baseOk = true
    let tailleBase = 0
    let tailleActivityEvent = 0
    try {
      const [taille] = await prisma.$queryRaw<Array<{ octets: bigint }>>(
        Prisma.sql`SELECT pg_database_size(current_database())::bigint AS octets`,
      )
      tailleBase = numerique(taille?.octets)
      const [tailleEvenements] = await prisma.$queryRaw<Array<{ octets: bigint }>>(
        Prisma.sql`SELECT pg_total_relation_size('"ActivityEvent"')::bigint AS octets`,
      )
      tailleActivityEvent = numerique(tailleEvenements?.octets)
    } catch {
      baseOk = false
    }

    const dataDir = path.resolve(process.cwd(), 'data')

    let disque: { total: number; libre: number } | null = null
    try {
      const stats = fs.statfsSync(dataDir)
      disque = { total: stats.blocks * stats.bsize, libre: stats.bavail * stats.bsize }
    } catch {
      disque = null
    }

    const ilYA24h = new Date(Date.now() - JOUR_MS)
    const [erreurs24h, evenements24h] = baseOk
      ? await Promise.all([
          prisma.errorLog.count({ where: { ts: { gte: ilYA24h } } }),
          prisma.activityEvent.count({ where: { ts: { gte: ilYA24h } } }),
        ])
      : [0, 0]

    const zips = listFullBackups()
    const dumps = listPgDumps()

    res.json({
      base: { ok: baseOk, tailleOctets: tailleBase, tailleActivityEventOctets: tailleActivityEvent },
      disque,
      dossierData: { tailleOctets: tailleDossier(dataDir) },
      sauvegardes: {
        dernierZip: zips[0] ?? null,
        dernierDump: dumps[0] ?? null,
        nbZips: zips.length,
        nbDumps: dumps.length,
      },
      service: {
        uptimeSecondes: Math.round(process.uptime()),
        version: process.env.APP_VERSION ?? null,
        node: process.version,
      },
      dernieres24h: { erreurs: erreurs24h, evenements: evenements24h },
    })
  } catch (error) {
    logger.error('Erreur GET /creator/health:', error)
    res.status(500).json({ message: 'Erreur serveur' })
  }
})

export default router
