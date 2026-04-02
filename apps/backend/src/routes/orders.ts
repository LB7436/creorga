import { Router, type Response } from 'express'
import { z } from 'zod'
import prisma from '../lib/prisma'
import { authenticate, type AuthRequest } from '../middleware/auth'
import { validate } from '../middleware/validate'
import { io } from '../index'
import logger from '../lib/logger'

const router = Router()
router.use(authenticate)

// ─── GET /api/orders ───────────────────────────────────

router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const companyId = req.headers['x-company-id'] as string
    if (!companyId) {
      res.status(400).json({ message: 'x-company-id header requis' })
      return
    }

    const { status, tableId } = req.query

    const orders = await prisma.order.findMany({
      where: {
        companyId,
        ...(status && { status: status as string }),
        ...(tableId && { tableId: tableId as string }),
      },
      include: {
        items: { include: { product: true } },
        table: true,
        user: { select: { firstName: true, lastName: true } },
      },
      orderBy: { createdAt: 'desc' },
    })

    res.json(orders)
  } catch (error) {
    logger.error('Erreur GET /orders:', error)
    res.status(500).json({ message: 'Erreur serveur' })
  }
})

// ─── GET /api/orders/:id ───────────────────────────────

router.get('/:id', async (req: AuthRequest, res: Response) => {
  try {
    const order = await prisma.order.findUnique({
      where: { id: req.params.id },
      include: {
        items: { include: { product: true } },
        table: true,
        user: { select: { firstName: true, lastName: true } },
      },
    })

    if (!order) {
      res.status(404).json({ message: 'Commande non trouvée' })
      return
    }

    res.json(order)
  } catch (error) {
    logger.error('Erreur GET /orders/:id:', error)
    res.status(500).json({ message: 'Erreur serveur' })
  }
})

// ─── POST /api/orders ──────────────────────────────────

const createOrderSchema = z.object({
  tableId: z.string().nullable().optional(),
  items: z.array(z.object({
    productId: z.string(),
    quantity: z.number().int().positive(),
    notes: z.string().nullable().optional(),
  })).min(1, 'Au moins un article requis'),
  notes: z.string().nullable().optional(),
})

router.post('/', validate(createOrderSchema), async (req: AuthRequest, res: Response) => {
  try {
    const companyId = req.headers['x-company-id'] as string
    if (!companyId) {
      res.status(400).json({ message: 'x-company-id header requis' })
      return
    }

    const { tableId, items, notes } = req.body

    // Générer le numéro de commande séquentiel
    const lastOrder = await prisma.order.findFirst({
      where: { companyId },
      orderBy: { orderNumber: 'desc' },
      select: { orderNumber: true },
    })
    const orderNumber = (lastOrder?.orderNumber ?? 0) + 1

    // Récupérer les prix des produits
    const productIds = items.map((i: { productId: string }) => i.productId)
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } },
    })

    const productMap = new Map(products.map((p) => [p.id, p]))

    // Calculer les totaux
    let subtotal = 0
    let taxAmount = 0

    const orderItems = items.map((item: { productId: string; quantity: number; notes?: string | null }) => {
      const product = productMap.get(item.productId)
      if (!product) throw new Error(`Produit ${item.productId} non trouvé`)

      const lineTotal = product.price * item.quantity
      const lineTax = lineTotal * (product.taxRate / 100)
      subtotal += lineTotal
      taxAmount += lineTax

      return {
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: product.price,
        taxRate: product.taxRate,
        notes: item.notes || null,
      }
    })

    const total = subtotal + taxAmount

    const order = await prisma.order.create({
      data: {
        companyId,
        tableId: tableId || null,
        userId: req.user!.userId,
        orderNumber,
        notes: notes || null,
        subtotal,
        taxAmount,
        total,
        items: { create: orderItems },
      },
      include: {
        items: { include: { product: true } },
        table: true,
      },
    })

    // Notifier en temps réel
    io.emit('order:new', order)

    logger.info(`Nouvelle commande #${orderNumber} créée`)
    res.status(201).json(order)
  } catch (error) {
    logger.error('Erreur POST /orders:', error)
    res.status(500).json({ message: 'Erreur serveur' })
  }
})

// ─── PUT /api/orders/:id/status ────────────────────────

const updateStatusSchema = z.object({
  status: z.enum(['OPEN', 'IN_PROGRESS', 'READY', 'PAID', 'CANCELLED']),
})

router.put('/:id/status', validate(updateStatusSchema), async (req: AuthRequest, res: Response) => {
  try {
    const order = await prisma.order.update({
      where: { id: req.params.id },
      data: { status: req.body.status },
      include: { items: { include: { product: true } }, table: true },
    })

    io.emit('order:updated', order)
    res.json(order)
  } catch (error) {
    logger.error('Erreur PUT /orders/status:', error)
    res.status(500).json({ message: 'Erreur serveur' })
  }
})

// ─── POST /api/orders/:id/checkout ─────────────────────

const checkoutSchema = z.object({
  paymentMethod: z.enum(['CASH', 'CARD', 'MIXED']),
  cashReceived: z.number().nullable().optional(),
})

router.post('/:id/checkout', validate(checkoutSchema), async (req: AuthRequest, res: Response) => {
  try {
    const { paymentMethod, cashReceived } = req.body

    const existing = await prisma.order.findUnique({
      where: { id: req.params.id },
    })

    if (!existing) {
      res.status(404).json({ message: 'Commande non trouvée' })
      return
    }

    const cashChange = paymentMethod === 'CASH' && cashReceived
      ? cashReceived - existing.total
      : null

    const order = await prisma.order.update({
      where: { id: req.params.id },
      data: {
        status: 'PAID',
        paymentMethod,
        cashReceived: cashReceived || null,
        cashChange,
        paidAt: new Date(),
      },
      include: { items: { include: { product: true } }, table: true },
    })

    io.emit('order:paid', order)

    logger.info(`Commande #${order.orderNumber} encaissée (${paymentMethod})`)
    res.json(order)
  } catch (error) {
    logger.error('Erreur POST /orders/checkout:', error)
    res.status(500).json({ message: 'Erreur serveur' })
  }
})

// ─── POST /api/orders/:id/items ────────────────────────

const addItemSchema = z.object({
  productId: z.string(),
  quantity: z.number().int().positive(),
  notes: z.string().nullable().optional(),
})

router.post('/:id/items', validate(addItemSchema), async (req: AuthRequest, res: Response) => {
  try {
    const { productId, quantity, notes } = req.body

    const product = await prisma.product.findUnique({ where: { id: productId } })
    if (!product) {
      res.status(404).json({ message: 'Produit non trouvé' })
      return
    }

    const item = await prisma.orderItem.create({
      data: {
        orderId: req.params.id,
        productId,
        quantity,
        unitPrice: product.price,
        taxRate: product.taxRate,
        notes: notes || null,
      },
      include: { product: true },
    })

    // Recalculer les totaux
    const allItems = await prisma.orderItem.findMany({ where: { orderId: req.params.id } })
    let subtotal = 0
    let taxAmount = 0
    for (const oi of allItems) {
      subtotal += oi.unitPrice * oi.quantity
      taxAmount += oi.unitPrice * oi.quantity * (oi.taxRate / 100)
    }

    const order = await prisma.order.update({
      where: { id: req.params.id },
      data: { subtotal, taxAmount, total: subtotal + taxAmount },
      include: { items: { include: { product: true } }, table: true },
    })

    io.emit('order:updated', order)
    res.status(201).json(item)
  } catch (error) {
    logger.error('Erreur POST /orders/items:', error)
    res.status(500).json({ message: 'Erreur serveur' })
  }
})

// ─── PUT /api/orders/:id/items/:itemId ─────────────────

router.put('/:id/items/:itemId', async (req: AuthRequest, res: Response) => {
  try {
    const item = await prisma.orderItem.update({
      where: { id: req.params.itemId },
      data: req.body,
      include: { product: true },
    })

    // Recalculer les totaux
    const allItems = await prisma.orderItem.findMany({ where: { orderId: req.params.id } })
    let subtotal = 0
    let taxAmount = 0
    for (const oi of allItems) {
      subtotal += oi.unitPrice * oi.quantity
      taxAmount += oi.unitPrice * oi.quantity * (oi.taxRate / 100)
    }

    const order = await prisma.order.update({
      where: { id: req.params.id },
      data: { subtotal, taxAmount, total: subtotal + taxAmount },
      include: { items: { include: { product: true } }, table: true },
    })

    io.emit('order:updated', order)
    res.json(item)
  } catch (error) {
    logger.error('Erreur PUT /orders/items:', error)
    res.status(500).json({ message: 'Erreur serveur' })
  }
})

// ─── DELETE /api/orders/:id/items/:itemId ──────────────

router.delete('/:id/items/:itemId', async (req: AuthRequest, res: Response) => {
  try {
    await prisma.orderItem.delete({ where: { id: req.params.itemId } })

    // Recalculer les totaux
    const allItems = await prisma.orderItem.findMany({ where: { orderId: req.params.id } })
    let subtotal = 0
    let taxAmount = 0
    for (const oi of allItems) {
      subtotal += oi.unitPrice * oi.quantity
      taxAmount += oi.unitPrice * oi.quantity * (oi.taxRate / 100)
    }

    const order = await prisma.order.update({
      where: { id: req.params.id },
      data: { subtotal, taxAmount, total: subtotal + taxAmount },
      include: { items: { include: { product: true } }, table: true },
    })

    io.emit('order:updated', order)
    res.json({ message: 'Article supprimé' })
  } catch (error) {
    logger.error('Erreur DELETE /orders/items:', error)
    res.status(500).json({ message: 'Erreur serveur' })
  }
})

export default router
