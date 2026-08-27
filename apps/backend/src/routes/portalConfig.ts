import { Router, type Request } from 'express'
import prisma from '../lib/prisma'
import logger from '../lib/logger'

export interface PortalConfig {
  companyId: string
  toggles: Record<string, boolean>
  games: Record<string, boolean>
  welcomeMessage: string
  accentColor: string
  tableNumber: string
  themeMode: 'dark' | 'light'
  logoDataUrl?: string | null
  restaurantName: string
  updatedAt: number
}

const DEFAULT_TOGGLES: Record<string, boolean> = {
  menu: true,
  order: true,
  games: true,
  reviews: true,
  // Ces fonctions restent fermées tant qu'elles ne sont pas reliées à un vrai
  // canal personnel/annonces persistant.
  chat: false,
  announcements: false,
}

const router = Router()

function companyIdFrom(req: Request): string | null {
  const authenticated = (req as any).companyId
  const query = req.query.companyId
  const header = req.headers['x-company-id']
  const body = req.body?.companyId
  const raw = authenticated || query || header || body
  if (typeof raw !== 'string') return null
  const id = raw.trim()
  return id && id.length <= 100 ? id : null
}

function boolRecord(value: unknown, allowedKeys?: Set<string>): Record<string, boolean> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  const result: Record<string, boolean> = {}
  for (const [key, item] of Object.entries(value as Record<string, unknown>).slice(0, 100)) {
    if (!/^[a-z0-9_-]{1,64}$/i.test(key) || typeof item !== 'boolean') continue
    if (allowedKeys && !allowedKeys.has(key)) continue
    result[key] = item
  }
  return result
}

function responseConfig(company: { id: string; name: string }, row: any | null): PortalConfig {
  return {
    companyId: company.id,
    toggles: { ...DEFAULT_TOGGLES, ...boolRecord(row?.toggles), chat: false, announcements: false },
    games: boolRecord(row?.games),
    welcomeMessage: row?.welcomeMessage || '',
    accentColor: row?.accentColor || '#6366f1',
    tableNumber: row?.tableNumber || '1',
    themeMode: row?.themeMode === 'light' ? 'light' : 'dark',
    logoDataUrl: row?.logoDataUrl ?? null,
    restaurantName: company.name,
    updatedAt: row?.updatedAt ? new Date(row.updatedAt).getTime() : 0,
  }
}

async function loadCompany(req: Request) {
  const companyId = companyIdFrom(req)
  if (!companyId) return null
  return prisma.company.findUnique({ where: { id: companyId }, select: { id: true, name: true } })
}

// Lecture publique : le QR doit toujours identifier son entreprise.
router.get('/', async (req, res) => {
  try {
    const company = await loadCompany(req)
    if (!company) { res.status(404).json({ message: 'QR invalide ou entreprise inconnue' }); return }
    const config = await prisma.portalConfiguration.findUnique({ where: { companyId: company.id } })
    res.json(responseConfig(company, config))
  } catch (error) {
    logger.error('[portal-config] lecture impossible:', error)
    res.status(500).json({ message: 'Configuration du portail indisponible' })
  }
})

router.get('/menu', async (req, res) => {
  try {
    const company = await loadCompany(req)
    if (!company) { res.status(404).json({ message: 'QR invalide ou entreprise inconnue' }); return }
    const categories = await prisma.category.findMany({
      where: { companyId: company.id, isActive: true },
      orderBy: { sortOrder: 'asc' },
      select: {
        id: true,
        name: true,
        icon: true,
        color: true,
        sortOrder: true,
        products: {
          where: { isActive: true },
          orderBy: { sortOrder: 'asc' },
          select: {
            id: true,
            categoryId: true,
            name: true,
            description: true,
            price: true,
            taxRate: true,
            image: true,
            allergens: true,
            sortOrder: true,
          },
        },
      },
    })
    const safeCategories = categories.map((category) => ({
      ...category,
      products: category.products.map((product) => ({
        ...product,
        isActive: true,
        stockTracked: false,
        stockQty: null,
        stockUnit: null,
        stockStatus: 'UNTRACKED',
        isAvailable: true,
      })),
    }))
    res.json({
      companyId: company.id,
      restaurantName: company.name,
      categories: safeCategories,
      products: safeCategories.flatMap((category) => category.products),
    })
  } catch (error) {
    logger.error('[portal-config] menu public impossible:', error)
    res.status(500).json({ message: 'Carte indisponible pour le moment' })
  }
})

router.post('/client', async (req, res) => {
  try {
    const company = await loadCompany(req)
    if (!company) { res.status(404).json({ message: 'QR invalide ou entreprise inconnue' }); return }
    const body = req.body || {}
    const displayName = String(body.displayName || '').trim()
    const email = String(body.email || '').trim().toLowerCase()
    const phone = String(body.phone || '').trim()
    if (displayName.length < 2 || displayName.length > 100 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || email.length > 254 || phone.length < 6 || phone.length > 40) {
      res.status(400).json({ message: 'Nom, e-mail ou numéro de téléphone invalide' })
      return
    }
    const [firstName, ...rest] = displayName.split(/\s+/)
    const existing = await prisma.customer.findFirst({ where: { companyId: company.id, email } })
    if (existing) {
      // Sans preuve de possession de l'e-mail, ne jamais renvoyer l'identifiant
      // ni remplacer le nom/téléphone d'une fiche CRM existante.
      res.status(409).json({ message: 'Cette adresse possède déjà une fiche. La reconnexion sécurisée par e-mail doit être configurée.' })
      return
    }
    const customer = await prisma.customer.create({
      data: {
        companyId: company.id,
        firstName,
        lastName: rest.join(' ') || 'Invité',
        email,
        phone,
        isGuest: true,
        notes: 'Inscription au portail client par e-mail',
      },
    })
    res.status(201).json({ customerId: customer.id, companyId: company.id })
  } catch (error) {
    logger.error('[portal-config] inscription client impossible:', error)
    res.status(500).json({ message: 'Inscription client indisponible' })
  }
})

router.post('/client-events', async (req, res) => {
  try {
    const company = await loadCompany(req)
    if (!company) { res.status(404).json({ message: 'QR invalide ou entreprise inconnue' }); return }
    const event = req.body || {}
    if (event.type !== 'review') {
      // Les commandes ont leur propre endpoint transactionnel. Les autres
      // événements restent locaux tant qu'un vrai journal n'est pas modélisé.
      res.status(202).json({ ok: true, persisted: false })
      return
    }
    const payload = event.payload || {}
    const profile = event.profile || {}
    const rating = Number(payload.rating)
    const comment = typeof payload.comment === 'string' ? payload.comment.trim().slice(0, 2_000) : ''
    if (!Number.isInteger(rating) || rating < 1 || rating > 5) {
      res.status(400).json({ message: 'La note doit être comprise entre 1 et 5' })
      return
    }
    const review = await prisma.review.create({
      data: {
        companyId: company.id,
        // Un profil local n'est pas une preuve d'identité. L'avis reste public
        // mais n'est rattaché à aucune fiche CRM sans session client vérifiée.
        customerId: null,
        platform: 'INTERNAL',
        rating,
        comment: comment || null,
      },
    })
    res.status(201).json({ ok: true, persisted: true, reviewId: review.id })
  } catch (error) {
    logger.error('[portal-config] avis client impossible:', error)
    res.status(500).json({ message: 'Enregistrement de l’avis indisponible' })
  }
})

router.get('/client-events', async (req, res) => {
  try {
    const company = await loadCompany(req)
    if (!company) { res.status(404).json({ message: 'Entreprise inconnue' }); return }
    const reviews = await prisma.review.findMany({
      where: { companyId: company.id, platform: 'INTERNAL' },
      orderBy: { createdAt: 'desc' },
      take: 100,
      select: { id: true, rating: true, comment: true, createdAt: true },
    })
    res.json(reviews)
  } catch (error) {
    logger.error('[portal-config] journal client impossible:', error)
    res.status(500).json({ message: 'Journal client indisponible' })
  }
})

async function saveConfig(req: Request, res: any) {
  try {
    const company = await loadCompany(req)
    if (!company) { res.status(404).json({ message: 'Entreprise inconnue' }); return }
    const body = req.body || {}
    const existing = await prisma.portalConfiguration.findUnique({ where: { companyId: company.id } })
    const allowedToggles = new Set(['menu', 'order', 'games', 'reviews'])
    const toggles = {
      ...DEFAULT_TOGGLES,
      ...boolRecord(existing?.toggles),
      ...boolRecord(body.toggles, allowedToggles),
      chat: false,
      announcements: false,
    }
    const games = { ...boolRecord(existing?.games), ...boolRecord(body.games) }
    const welcomeMessage = body.welcomeMessage === undefined
      ? existing?.welcomeMessage || ''
      : String(body.welcomeMessage).trim().slice(0, 500)
    const accentColor = typeof body.accentColor === 'string' && /^#[0-9a-f]{6}$/i.test(body.accentColor)
      ? body.accentColor
      : existing?.accentColor || '#6366f1'
    const tableNumber = body.tableNumber === undefined
      ? existing?.tableNumber || '1'
      : String(body.tableNumber).trim().slice(0, 40) || '1'
    const themeMode = body.themeMode === 'light' ? 'light' : body.themeMode === 'dark' ? 'dark' : existing?.themeMode || 'dark'

    const saved = await prisma.portalConfiguration.upsert({
      where: { companyId: company.id },
      create: { companyId: company.id, toggles, games, welcomeMessage, accentColor, tableNumber, themeMode },
      update: { toggles, games, welcomeMessage, accentColor, tableNumber, themeMode },
    })
    res.json(responseConfig(company, saved))
  } catch (error) {
    logger.error('[portal-config] sauvegarde impossible:', error)
    res.status(500).json({ message: 'Enregistrement de la configuration impossible' })
  }
}

router.put('/', saveConfig)
router.patch('/', saveConfig)

router.post('/reset', async (req, res) => {
  try {
    const company = await loadCompany(req)
    if (!company) { res.status(404).json({ message: 'Entreprise inconnue' }); return }
    await prisma.portalConfiguration.deleteMany({ where: { companyId: company.id } })
    res.json(responseConfig(company, null))
  } catch (error) {
    logger.error('[portal-config] remise à zéro impossible:', error)
    res.status(500).json({ message: 'Remise à zéro impossible' })
  }
})

export default router
