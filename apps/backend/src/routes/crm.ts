import { type Response } from 'express'
import { createTrackedRouter as Router } from '../lib/tracked-router'
import crypto from 'crypto'
import prisma from '../lib/prisma'
import logger from '../lib/logger'
import { z } from 'zod'
import { hasCapability } from '../lib/business-permissions'
import { assertTransactionCapabilities, BusinessPermissionError, requireCapabilities } from '../lib/business-permission-transaction'
import { moneyMinor } from '../lib/money'

const router = Router()
const businessProfile = z.object({ businessName: z.string().trim().max(200).nullable().optional(), address: z.string().trim().max(1000).nullable().optional(), vatNumber: z.string().trim().max(40).nullable().optional() })
// Une carte contient du crédit utilisable. L'émission et l'inventaire des codes
// relèvent du responsable ; la caisse vérifie un code via son API dédiée.
router.use('/gift-cards', requireCapabilities('finance.manage'))
const financialReason = z.string().trim().min(1).max(500).optional()
class WalletError extends Error {
  constructor(message: string, public status: number) { super(message) }
}
const customerSelect = (req: any) => ({ id: true, companyId: true, firstName: true, lastName: true, businessName: true,
  address: true, vatNumber: true, email: true, phone: true, points: true, isGuest: true, notes: true, createdAt: true, updatedAt: true,
  walletBalance: hasCapability(req, 'finance.revenue.read') })
function visibleCustomer(customer: any, req: any) {
  if (hasCapability(req, 'finance.revenue.read')) return customer
  // Le repli JSON historique peut porter d'autres agrégats que walletBalance.
  // Une allowlist empêche leur réapparition sans lecture financière.
  const visible = Object.fromEntries(Object.entries(customerSelect(req)).filter(([key, enabled]) => enabled && Object.prototype.hasOwnProperty.call(customer, key)).map(([key]) => [key, customer[key]]))
  const { orders } = customer
  return { ...visible, ...(orders ? { orders: orders.filter((order: any) => !order.paidAt && !['PAID', 'CANCELLED'].includes(order.status)) } : {}) }
}

// ─── GET /api/crm/customers ────────────────────────────

router.get('/customers', async (req: any, res: Response) => {
  try {
    const { search, page = '1', limit = '20', includeManual } = req.query
    const companyId: string = req.companyId
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string)
    const take = parseInt(limit as string)

    const where: any = { companyId }
    if (includeManual !== 'true') {
      where.isGuest = true
    }
    if (search) {
      where.OR = [
        { firstName: { contains: search as string, mode: 'insensitive' } },
        { lastName: { contains: search as string, mode: 'insensitive' } },
        { email: { contains: search as string, mode: 'insensitive' } },
        { phone: { contains: search as string, mode: 'insensitive' } },
        { businessName: { contains: search as string, mode: 'insensitive' } },
      ]
    }

    const [customers, total] = await Promise.all([
      prisma.customer.findMany({ where, skip, take, select: customerSelect(req), orderBy: { createdAt: 'desc' } }),
      prisma.customer.count({ where }),
    ])

    res.json({ customers: customers.map(customer => visibleCustomer(customer, req)), total, page: parseInt(page as string), limit: take })
  } catch (error) {
    // DB indisponible (mode sans Docker) → fallback sur data/customers.json
    try {
      const fs = await import('fs')
      const path = await import('path')
      const file = path.resolve(process.cwd(), 'data', 'customers.json')
      const all: any[] = fs.existsSync(file) ? JSON.parse(fs.readFileSync(file, 'utf8')) : []
      const { search, page = '1', limit = '20' } = req.query
      const q = String(search || '').toLowerCase()
      // Le fichier historique était global : ne jamais renvoyer les clients
      // d'une autre société quand PostgreSQL est indisponible.
      const companyCustomers = all.filter((c) => c.companyId === req.companyId)
      const filtered = q
        ? companyCustomers.filter((c) =>
            [c.firstName, c.lastName, c.email, c.phone].some((v) => String(v || '').toLowerCase().includes(q)))
        : companyCustomers
      const take = parseInt(limit as string)
      const skip = (parseInt(page as string) - 1) * take
      logger.warn('GET /customers: DB indisponible, fallback customers.json')
      res.json({ customers: filtered.slice(skip, skip + take).map(customer => visibleCustomer(customer, req)), total: filtered.length, page: parseInt(page as string), limit: take, source: 'fallback' })
      return
    } catch { /* fallback impossible → 500 ci-dessous */ }
    logger.error('Erreur GET /customers:', error)
    res.status(500).json({ message: 'Erreur serveur' })
  }
})

// ─── GET /api/crm/customers/:id ───────────────────────

router.get('/customers/:id', async (req: any, res: Response) => {
  try {
    const customer = await prisma.customer.findFirst({
      where: { id: req.params.id, companyId: req.companyId },
      select: {
        ...customerSelect(req),
        loyaltyTransactions: hasCapability(req, 'finance.revenue.read') ? { orderBy: { createdAt: 'desc' }, take: 20 } : false,
        orders: { where: hasCapability(req, 'finance.revenue.read') ? {} : { paidAt: null, status: { notIn: ['PAID', 'CANCELLED'] } }, orderBy: { createdAt: 'desc' }, take: 10, include: { items: { include: { product: true } } } },
      },
    })
    if (!customer) {
      res.status(404).json({ message: 'Client non trouvé' })
      return
    }
    res.json(visibleCustomer(customer, req))
  } catch (error) {
    logger.error('Erreur GET /customers/:id:', error)
    res.status(500).json({ message: 'Erreur serveur' })
  }
})

// ─── POST /api/crm/customers ──────────────────────────

router.post('/customers', async (req: any, res: Response) => {
  try {
    const { firstName, lastName, email, phone, notes, isGuest } = req.body
    const business = businessProfile.safeParse(req.body)
    if (!business.success) return res.status(400).json({ message: 'Informations de société client invalides.' })
    if (typeof firstName !== 'string' || (!firstName.trim() && !business.data.businessName) || firstName.trim().length > 80 ||
        typeof lastName !== 'string' || (!lastName.trim() && !business.data.businessName) || lastName.trim().length > 80) {
      res.status(400).json({ message: 'Prénom et nom valides requis (80 caractères maximum)' })
      return
    }
    const customer = await prisma.customer.create({
      data: {
        companyId: req.companyId,
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        ...business.data,
        email: typeof email === 'string' ? email.trim() || null : null,
        phone: typeof phone === 'string' ? phone.trim() || null : null,
        notes: typeof notes === 'string' ? notes.trim().slice(0, 2000) || null : null,
        isGuest: isGuest ?? true,
      },
    })
    res.status(201).json(visibleCustomer(customer, req))
  } catch (error) {
    logger.error('Erreur POST /customers:', error)
    res.status(500).json({ message: 'Erreur serveur' })
  }
})

// ─── PUT /api/crm/customers/:id ───────────────────────

router.put('/customers/:id', async (req: any, res: Response) => {
  try {
    const existing = await prisma.customer.findFirst({ where: { id: req.params.id, companyId: req.companyId } })
    if (!existing) { res.status(404).json({ message: 'Client non trouvé' }); return }
    const { firstName, lastName, email, phone, notes } = req.body
    const business = businessProfile.safeParse(req.body)
    if (!business.success) return res.status(400).json({ message: 'Informations de société client invalides.' })
    if (typeof firstName !== 'string' || (!firstName.trim() && !business.data.businessName) || firstName.trim().length > 80 ||
        typeof lastName !== 'string' || (!lastName.trim() && !business.data.businessName) || lastName.trim().length > 80) {
      res.status(400).json({ message: 'Prénom et nom valides requis (80 caractères maximum)' })
      return
    }
    const customer = await prisma.customer.update({
      where: { id: req.params.id },
      data: {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        ...business.data,
        email: typeof email === 'string' ? email.trim() || null : null,
        phone: typeof phone === 'string' ? phone.trim() || null : null,
        notes: typeof notes === 'string' ? notes.trim().slice(0, 2000) || null : null,
      },
    })
    res.json(visibleCustomer(customer, req))
  } catch (error) {
    logger.error('Erreur PUT /customers/:id:', error)
    res.status(500).json({ message: 'Erreur serveur' })
  }
})

// ─── DELETE /api/crm/customers/:id ────────────────────

router.delete('/customers/:id', async (req: any, res: Response) => {
  try {
    const existing = await prisma.customer.findFirst({ where: { id: req.params.id, companyId: req.companyId } })
    if (!existing) { res.status(404).json({ message: 'Client non trouvé' }); return }
    await prisma.customer.delete({ where: { id: req.params.id } })
    res.json({ message: 'Client supprimé' })
  } catch (error) {
    logger.error('Erreur DELETE /customers/:id:', error)
    res.status(500).json({ message: 'Erreur serveur' })
  }
})

// ─── POST /api/crm/customers/:id/loyalty ──────────────

router.post('/customers/:id/loyalty', requireCapabilities('finance.manage'), async (req: any, res: Response) => {
  try {
    const existing = await prisma.customer.findFirst({ where: { id: req.params.id, companyId: req.companyId } })
    if (!existing) { res.status(404).json({ message: 'Client non trouvé' }); return }
    const { type, points, amount, orderId } = req.body

    // `type` est obligatoire côté schéma : sans validation, une requête sans
    // ce champ faisait planter Prisma et remontait en 500 « erreur serveur ».
    if (type !== 'EARN' && type !== 'SPEND') {
      res.status(400).json({ message: 'type doit valoir EARN ou SPEND' })
      return
    }
    const nbPoints = Number(points)
    if (!Number.isFinite(nbPoints) || nbPoints <= 0) {
      res.status(400).json({ message: 'points doit être un nombre strictement positif' })
      return
    }

    const delta = type === 'SPEND' ? -nbPoints : nbPoints

    // Un client ne peut pas dépenser plus de points qu'il n'en a : sans ce
    // contrôle, le solde passait négatif et offrait des points à crédit.
    if (delta < 0 && existing.points + delta < 0) {
      res.status(400).json({
        message: `Solde insuffisant : ${existing.points} point(s) disponible(s), ${nbPoints} demandé(s)`,
      })
      return
    }

    const [transaction, customer] = await prisma.$transaction([
      prisma.loyaltyTransaction.create({
        data: { customerId: req.params.id, type, points: delta, amount: amount || 0, orderId: orderId || null },
      }),
      prisma.customer.update({
        where: { id: req.params.id },
        data: { points: { increment: delta } },
      }),
    ])
    res.status(201).json({ transaction, customer: visibleCustomer(customer, req) })
  } catch (error) {
    logger.error('Erreur POST /customers/:id/loyalty:', error)
    res.status(500).json({ message: 'Erreur serveur' })
  }
})

// ─── POST /api/crm/customers/:id/wallet ───────────────

router.post('/customers/:id/wallet', requireCapabilities('finance.manage'), async (req: any, res: Response) => {
  try {
    const montant = Number(req.body?.amount)
    // parseFloat sur une valeur non numérique donnait NaN, écrit tel quel en base.
    if (!Number.isFinite(montant) || Math.abs(montant) > 100000 || moneyMinor(montant) === 0) {
      res.status(400).json({ message: 'amount doit être un montant non nul d’au moins un centime, limité à 100 000 €' })
      return
    }
    req.body.reason = financialReason.parse(req.body.reason)
    const customer = await prisma.$transaction(async tx => {
      await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${req.companyId}), hashtext(${`wallet:${req.params.id}`}))::text`
      await assertTransactionCapabilities(tx, req, 'finance.manage')
      const existing = await tx.customer.findFirst({ where: { id: req.params.id, companyId: req.companyId } })
      if (!existing) throw new WalletError('Client non trouvé', 404)
      const next = moneyMinor(existing.walletBalance) + moneyMinor(montant)
      if (next < 0) throw new WalletError('Solde insuffisant. Rechargez le portefeuille avant de confirmer une nouvelle opération.', 409)
      return tx.customer.update({ where: { id: req.params.id }, data: { walletBalance: next / 100 } })
    })
    res.json(visibleCustomer(customer, req))
  } catch (error) {
    if (error instanceof WalletError || error instanceof BusinessPermissionError) { res.status(error.status).json({ message: error.message }); return }
    if (error instanceof z.ZodError) { res.status(400).json({ message: 'Motif invalide' }); return }
    logger.error('Erreur POST /customers/:id/wallet:', error)
    res.status(500).json({ message: 'Erreur serveur' })
  }
})

// ─── GET /api/crm/gift-cards ──────────────────────────

router.get('/gift-cards', async (req: any, res: Response) => {
  try {
    const giftCards = await prisma.giftCard.findMany({
      where: { companyId: req.companyId },
      orderBy: { createdAt: 'desc' },
    })
    res.json(giftCards)
  } catch (error) {
    logger.error('Erreur GET /gift-cards:', error)
    res.status(500).json({ message: 'Erreur serveur' })
  }
})

// ─── POST /api/crm/gift-cards ─────────────────────────

router.post('/gift-cards', async (req: any, res: Response) => {
  try {
    const { initialValue, expiresAt } = req.body
    const value = Number(initialValue)
    if (!Number.isFinite(value) || value <= 0 || value > 100000 || moneyMinor(value) < 1) return res.status(400).json({ message: 'Montant de carte cadeau invalide' })
    req.body.reason = financialReason.parse(req.body.reason)
    const expiry = expiresAt ? new Date(expiresAt) : null
    if (expiry && Number.isNaN(expiry.getTime())) return res.status(400).json({ message: 'Date d’expiration invalide' })
    const code = crypto.randomBytes(4).toString('hex').toUpperCase()
    const giftCard = await prisma.giftCard.create({
      data: {
        companyId: req.companyId,
        code,
        initialValue: moneyMinor(value) / 100,
        currentBalance: moneyMinor(value) / 100,
        expiresAt: expiry,
      },
    })
    res.status(201).json(giftCard)
  } catch (error) {
    if (error instanceof z.ZodError) { res.status(400).json({ message: 'Motif invalide' }); return }
    logger.error('Erreur POST /gift-cards:', error)
    res.status(500).json({ message: 'Erreur serveur' })
  }
})

// ─── GET /api/crm/gift-cards/:code ────────────────────

router.get('/gift-cards/:code', async (req: any, res: Response) => {
  try {
    const giftCard = await prisma.giftCard.findFirst({
      where: { code: req.params.code, companyId: req.companyId },
    })
    if (!giftCard) { res.status(404).json({ message: 'Carte cadeau non trouvée' }); return }
    res.json(giftCard)
  } catch (error) {
    logger.error('Erreur GET /gift-cards/:code:', error)
    res.status(500).json({ message: 'Erreur serveur' })
  }
})

export default router
