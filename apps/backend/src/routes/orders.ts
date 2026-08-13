import { Router, type Response } from 'express'
import { z } from 'zod'
import prisma from '../lib/prisma'
import { authenticate, type AuthRequest } from '../middleware/auth'
import { requireCompany } from '../middleware/requireCompany'
import { validate } from '../middleware/validate'
import { io } from '../index'
import logger from '../lib/logger'

const router = Router()
router.use(authenticate)
// Adhésion vérifiée : le header x-company-id était cru tel quel, et les routes
// par id (statut, encaissement, articles) n'avaient aucun filtre société.
router.use(requireCompany)

/**
 * Arrondi monétaire au centime.
 * Les totaux étaient stockés bruts : une commande de 3 × 2,50 € à 17 % donnait
 * taxAmount = 1.275 et total = 8.775, soit un ticket et une caisse impossibles
 * à faire tomber juste au centime.
 */
const cents = (n: number): number => Math.round((n + Number.EPSILON) * 100) / 100

/** Erreur métier → réponse 4xx explicite (au lieu d'un 500 générique). */
class OrderInputError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'OrderInputError'
  }
}

// ─── GET /api/orders ───────────────────────────────────

router.get('/', async (req: AuthRequest, res: Response) => {
  try {
    const companyId = (req as any).companyId as string

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
    const order = await prisma.order.findFirst({
      where: { id: req.params.id, companyId: (req as any).companyId },
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
    const companyId = (req as any).companyId as string

    const { tableId, items, notes } = req.body

    // Récupérer les prix des produits — restreint à la société : un produit
    // d'une autre société ne doit pas pouvoir être commandé ici.
    const productIds = items.map((i: { productId: string }) => i.productId)
    const products = await prisma.product.findMany({
      where: { id: { in: productIds }, companyId },
    })

    const productMap = new Map(products.map((p) => [p.id, p]))

    // Calculer les totaux — TVA ligne par ligne (les produits peuvent avoir
    // des taux différents : 17 % standard, 3 % restauration, etc.).
    let subtotal = 0
    let taxAmount = 0

    const orderItems = items.map((item: { productId: string; quantity: number; notes?: string | null }) => {
      const product = productMap.get(item.productId)
      if (!product) throw new OrderInputError(`Produit ${item.productId} introuvable`)

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

    // Arrondi au centime avant écriture (cf. `cents`).
    subtotal = cents(subtotal)
    taxAmount = cents(taxAmount)
    const total = cents(subtotal + taxAmount)

    // Numéro séquentiel : `findFirst` + 1 n'est pas atomique — sous charge,
    // huit commandes simultanées repartaient toutes du même dernier numéro.
    // On sérialise lecture et écriture dans une transaction, et on réessaie
    // si une autre transaction a pris le numéro entre-temps (P2002).
    //
    // Le réessai seul ne suffit pas : sans attente entre deux tours, les
    // requêtes concurrentes se resynchronisent et rejouent la même collision.
    // Mesuré sur PC le 27/07/2026 : 8 commandes simultanées -> 2 échecs en
    // 500. Le délai aléatoire croissant les désynchronise, exactement comme
    // dans `createAvecNumero` (routes/invoices.ts).
    const MAX_TENTATIVES = 10
    let order: any = null
    let derniereErreur: unknown = null

    for (let tentative = 0; tentative < MAX_TENTATIVES; tentative++) {
      try {
        order = await prisma.$transaction(async (tx) => {
          const lastOrder = await tx.order.findFirst({
            where: { companyId },
            orderBy: { orderNumber: 'desc' },
            select: { orderNumber: true },
          })
          const orderNumber = (lastOrder?.orderNumber ?? 0) + 1

          return tx.order.create({
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
        })
        break
      } catch (e: any) {
        // P2002 = violation d'unicité sur (companyId, orderNumber)
        if (e?.code !== 'P2002') throw e
        derniereErreur = e
        const attente = 5 + Math.floor(Math.random() * 20) * (tentative + 1)
        await new Promise((r) => setTimeout(r, attente))
      }
    }

    // Numérotation saturée : c'est une indisponibilité temporaire, pas une
    // faute du client ni un bug applicatif. Un 500 opaque empêchait le POS de
    // distinguer « réessaie » de « la commande est perdue ».
    if (!order) {
      logger.error(`Numérotation de commande saturée après ${MAX_TENTATIVES} tentatives`, derniereErreur)
      res.status(503).json({ message: 'Numérotation de commande momentanément indisponible' })
      return
    }

    // Notifier en temps réel
    io.emit('order:new', order)

    logger.info(`Nouvelle commande #${order.orderNumber} créée`)
    res.status(201).json(order)
  } catch (error) {
    // Produit inconnu ou hors société : faute du client, pas du serveur.
    if (error instanceof OrderInputError) {
      res.status(400).json({ message: error.message })
      return
    }
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
    const appartient = await prisma.order.findFirst({
      where: { id: req.params.id, companyId: (req as any).companyId },
      select: { id: true },
    })
    if (!appartient) {
      res.status(404).json({ message: 'Commande non trouvée' })
      return
    }

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

    const existing = await prisma.order.findFirst({
      where: { id: req.params.id, companyId: (req as any).companyId },
    })

    if (!existing) {
      res.status(404).json({ message: 'Commande non trouvée' })
      return
    }

    // Une commande déjà réglée ne doit pas pouvoir l'être une seconde fois :
    // le second encaissement écrasait paidAt et comptait le montant deux fois
    // dans le chiffre d'affaires du jour.
    if (existing.status === 'PAID') {
      res.status(409).json({ message: 'Commande déjà encaissée' })
      return
    }
    if (existing.status === 'CANCELLED') {
      res.status(409).json({ message: 'Commande annulée : encaissement impossible' })
      return
    }

    if (paymentMethod === 'CASH' && cashReceived != null && cashReceived < existing.total) {
      res.status(400).json({
        message: `Montant reçu insuffisant (${cashReceived} € pour ${existing.total} €)`,
      })
      return
    }

    const cashChange = paymentMethod === 'CASH' && cashReceived
      ? cents(cashReceived - existing.total)
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
    const companyId = (req as any).companyId as string
    const { productId, quantity, notes } = req.body

    const commande = await prisma.order.findFirst({
      where: { id: req.params.id, companyId },
      select: { id: true },
    })
    if (!commande) {
      res.status(404).json({ message: 'Commande non trouvée' })
      return
    }

    // Produit restreint à la société : on ne facture pas la carte d'un autre.
    const product = await prisma.product.findFirst({ where: { id: productId, companyId } })
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
      data: { subtotal: cents(subtotal), taxAmount: cents(taxAmount), total: cents(subtotal + taxAmount) },
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
    const commande = await prisma.order.findFirst({
      where: { id: req.params.id, companyId: (req as any).companyId },
      select: { id: true },
    })
    if (!commande) {
      res.status(404).json({ message: 'Commande non trouvée' })
      return
    }
    const existant = await prisma.orderItem.findFirst({
      where: { id: req.params.itemId, orderId: req.params.id },
      select: { id: true },
    })
    if (!existant) {
      res.status(404).json({ message: 'Article non trouvé' })
      return
    }

    // Le corps ne doit pas pouvoir déplacer l'article vers une autre commande.
    const { orderId: _commande, id: _id, ...donnees } = req.body ?? {}
    const item = await prisma.orderItem.update({
      where: { id: req.params.itemId },
      data: donnees,
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
      data: { subtotal: cents(subtotal), taxAmount: cents(taxAmount), total: cents(subtotal + taxAmount) },
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
    const commande = await prisma.order.findFirst({
      where: { id: req.params.id, companyId: (req as any).companyId },
      select: { id: true },
    })
    if (!commande) {
      res.status(404).json({ message: 'Commande non trouvée' })
      return
    }
    const { count } = await prisma.orderItem.deleteMany({
      where: { id: req.params.itemId, orderId: req.params.id },
    })
    if (count === 0) {
      res.status(404).json({ message: 'Article non trouvé' })
      return
    }

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
      data: { subtotal: cents(subtotal), taxAmount: cents(taxAmount), total: cents(subtotal + taxAmount) },
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
