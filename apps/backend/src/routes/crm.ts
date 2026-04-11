import { Router, type Response } from 'express'
import crypto from 'crypto'
import prisma from '../lib/prisma'
import logger from '../lib/logger'

const router = Router()

// ─── GET /api/crm/customers ────────────────────────────

router.get('/customers', async (req: any, res: Response) => {
  try {
    const { search, page = '1', limit = '20' } = req.query
    const companyId: string = req.companyId
    const skip = (parseInt(page as string) - 1) * parseInt(limit as string)
    const take = parseInt(limit as string)

    const where: any = { companyId }
    if (search) {
      where.OR = [
        { firstName: { contains: search as string, mode: 'insensitive' } },
        { lastName: { contains: search as string, mode: 'insensitive' } },
        { email: { contains: search as string, mode: 'insensitive' } },
        { phone: { contains: search as string, mode: 'insensitive' } },
      ]
    }

    const [customers, total] = await Promise.all([
      prisma.customer.findMany({ where, skip, take, orderBy: { createdAt: 'desc' } }),
      prisma.customer.count({ where }),
    ])

    res.json({ customers, total, page: parseInt(page as string), limit: take })
  } catch (error) {
    logger.error('Erreur GET /customers:', error)
    res.status(500).json({ message: 'Erreur serveur' })
  }
})

// ─── GET /api/crm/customers/:id ───────────────────────

router.get('/customers/:id', async (req: any, res: Response) => {
  try {
    const customer = await prisma.customer.findFirst({
      where: { id: req.params.id, companyId: req.companyId },
      include: {
        loyaltyTransactions: { orderBy: { createdAt: 'desc' }, take: 20 },
        orders: { orderBy: { createdAt: 'desc' }, take: 10, include: { items: { include: { product: true } } } },
      },
    })
    if (!customer) {
      res.status(404).json({ message: 'Client non trouvé' })
      return
    }
    res.json(customer)
  } catch (error) {
    logger.error('Erreur GET /customers/:id:', error)
    res.status(500).json({ message: 'Erreur serveur' })
  }
})

// ─── POST /api/crm/customers ──────────────────────────

router.post('/customers', async (req: any, res: Response) => {
  try {
    const { firstName, lastName, email, phone, notes, isGuest } = req.body
    const customer = await prisma.customer.create({
      data: { companyId: req.companyId, firstName, lastName, email, phone, notes, isGuest: isGuest || false },
    })
    res.status(201).json(customer)
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
    const customer = await prisma.customer.update({
      where: { id: req.params.id },
      data: { firstName, lastName, email, phone, notes },
    })
    res.json(customer)
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

router.post('/customers/:id/loyalty', async (req: any, res: Response) => {
  try {
    const existing = await prisma.customer.findFirst({ where: { id: req.params.id, companyId: req.companyId } })
    if (!existing) { res.status(404).json({ message: 'Client non trouvé' }); return }
    const { type, points, amount, orderId } = req.body
    const delta = type === 'SPEND' ? -Math.abs(points) : Math.abs(points)
    const [transaction, customer] = await prisma.$transaction([
      prisma.loyaltyTransaction.create({
        data: { customerId: req.params.id, type, points: delta, amount: amount || 0, orderId: orderId || null },
      }),
      prisma.customer.update({
        where: { id: req.params.id },
        data: { points: { increment: delta } },
      }),
    ])
    res.status(201).json({ transaction, customer })
  } catch (error) {
    logger.error('Erreur POST /customers/:id/loyalty:', error)
    res.status(500).json({ message: 'Erreur serveur' })
  }
})

// ─── POST /api/crm/customers/:id/wallet ───────────────

router.post('/customers/:id/wallet', async (req: any, res: Response) => {
  try {
    const existing = await prisma.customer.findFirst({ where: { id: req.params.id, companyId: req.companyId } })
    if (!existing) { res.status(404).json({ message: 'Client non trouvé' }); return }
    const { amount } = req.body
    const customer = await prisma.customer.update({
      where: { id: req.params.id },
      data: { walletBalance: { increment: parseFloat(amount) } },
    })
    res.json(customer)
  } catch (error) {
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
    const code = crypto.randomBytes(4).toString('hex').toUpperCase()
    const giftCard = await prisma.giftCard.create({
      data: {
        companyId: req.companyId,
        code,
        initialValue: parseFloat(initialValue),
        currentBalance: parseFloat(initialValue),
        expiresAt: expiresAt ? new Date(expiresAt) : null,
      },
    })
    res.status(201).json(giftCard)
  } catch (error) {
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
