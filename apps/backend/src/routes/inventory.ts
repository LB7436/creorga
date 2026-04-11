import { Router, type Response } from 'express'
import prisma from '../lib/prisma'
import logger from '../lib/logger'

const router = Router()

// ─── INGREDIENTS ──────────────────────────────────────

router.get('/ingredients', async (req: any, res: Response) => {
  try {
    const ingredients = await prisma.ingredient.findMany({
      where: { companyId: req.companyId },
      include: { supplier: true },
      orderBy: { name: 'asc' },
    })
    const withAlerts = ingredients.map((i) => ({ ...i, lowStock: i.currentStock <= i.minStockLevel }))
    res.json(withAlerts)
  } catch (error) {
    logger.error('Erreur GET /ingredients:', error)
    res.status(500).json({ message: 'Erreur serveur' })
  }
})

router.post('/ingredients', async (req: any, res: Response) => {
  try {
    const { name, unit, costPerUnit, currentStock, minStockLevel, supplierId } = req.body
    const ingredient = await prisma.ingredient.create({
      data: {
        companyId: req.companyId,
        name,
        unit: unit || 'kg',
        costPerUnit: costPerUnit || 0,
        currentStock: currentStock || 0,
        minStockLevel: minStockLevel || 0,
        supplierId: supplierId || null,
      },
    })
    res.status(201).json(ingredient)
  } catch (error) {
    logger.error('Erreur POST /ingredients:', error)
    res.status(500).json({ message: 'Erreur serveur' })
  }
})

router.put('/ingredients/:id', async (req: any, res: Response) => {
  try {
    const existing = await prisma.ingredient.findFirst({ where: { id: req.params.id, companyId: req.companyId } })
    if (!existing) { res.status(404).json({ message: 'Ingrédient non trouvé' }); return }
    const ingredient = await prisma.ingredient.update({
      where: { id: req.params.id },
      data: req.body,
    })
    res.json(ingredient)
  } catch (error) {
    logger.error('Erreur PUT /ingredients/:id:', error)
    res.status(500).json({ message: 'Erreur serveur' })
  }
})

router.delete('/ingredients/:id', async (req: any, res: Response) => {
  try {
    const existing = await prisma.ingredient.findFirst({ where: { id: req.params.id, companyId: req.companyId } })
    if (!existing) { res.status(404).json({ message: 'Ingrédient non trouvé' }); return }
    await prisma.ingredient.delete({ where: { id: req.params.id } })
    res.json({ message: 'Ingrédient supprimé' })
  } catch (error) {
    logger.error('Erreur DELETE /ingredients/:id:', error)
    res.status(500).json({ message: 'Erreur serveur' })
  }
})

// ─── SUPPLIERS ────────────────────────────────────────

router.get('/suppliers', async (req: any, res: Response) => {
  try {
    const suppliers = await prisma.supplier.findMany({
      where: { companyId: req.companyId },
      orderBy: { name: 'asc' },
    })
    res.json(suppliers)
  } catch (error) {
    logger.error('Erreur GET /suppliers:', error)
    res.status(500).json({ message: 'Erreur serveur' })
  }
})

router.post('/suppliers', async (req: any, res: Response) => {
  try {
    const { name, contactName, email, phone, notes } = req.body
    const supplier = await prisma.supplier.create({
      data: { companyId: req.companyId, name, contactName, email, phone, notes },
    })
    res.status(201).json(supplier)
  } catch (error) {
    logger.error('Erreur POST /suppliers:', error)
    res.status(500).json({ message: 'Erreur serveur' })
  }
})

router.put('/suppliers/:id', async (req: any, res: Response) => {
  try {
    const existing = await prisma.supplier.findFirst({ where: { id: req.params.id, companyId: req.companyId } })
    if (!existing) { res.status(404).json({ message: 'Fournisseur non trouvé' }); return }
    const supplier = await prisma.supplier.update({ where: { id: req.params.id }, data: req.body })
    res.json(supplier)
  } catch (error) {
    logger.error('Erreur PUT /suppliers/:id:', error)
    res.status(500).json({ message: 'Erreur serveur' })
  }
})

// ─── PURCHASE ORDERS ──────────────────────────────────

router.get('/purchase-orders', async (req: any, res: Response) => {
  try {
    const orders = await prisma.purchaseOrder.findMany({
      where: { companyId: req.companyId },
      include: { supplier: true, items: { include: { ingredient: true } } },
      orderBy: { createdAt: 'desc' },
    })
    res.json(orders)
  } catch (error) {
    logger.error('Erreur GET /purchase-orders:', error)
    res.status(500).json({ message: 'Erreur serveur' })
  }
})

router.post('/purchase-orders', async (req: any, res: Response) => {
  try {
    const { supplierId, notes, items } = req.body
    const total = (items || []).reduce((s: number, i: any) => s + i.quantity * i.unitCost, 0)
    const order = await prisma.purchaseOrder.create({
      data: {
        companyId: req.companyId,
        supplierId,
        total,
        notes: notes || null,
        items: { create: items || [] },
      },
      include: { supplier: true, items: { include: { ingredient: true } } },
    })
    res.status(201).json(order)
  } catch (error) {
    logger.error('Erreur POST /purchase-orders:', error)
    res.status(500).json({ message: 'Erreur serveur' })
  }
})

router.put('/purchase-orders/:id/receive', async (req: any, res: Response) => {
  try {
    const order = await prisma.purchaseOrder.findFirst({
      where: { id: req.params.id, companyId: req.companyId },
      include: { items: true },
    })
    if (!order) { res.status(404).json({ message: 'Bon de commande non trouvé' }); return }
    // Update stock levels
    for (const item of order.items) {
      await prisma.ingredient.update({
        where: { id: item.ingredientId },
        data: { currentStock: { increment: item.quantity } },
      })
    }
    const updated = await prisma.purchaseOrder.update({
      where: { id: req.params.id },
      data: { status: 'RECEIVED' },
    })
    res.json(updated)
  } catch (error) {
    logger.error('Erreur PUT /purchase-orders/:id/receive:', error)
    res.status(500).json({ message: 'Erreur serveur' })
  }
})

// ─── RECIPES ──────────────────────────────────────────

router.get('/recipes/:productId', async (req: any, res: Response) => {
  try {
    const recipes = await prisma.recipe.findMany({
      where: { productId: req.params.productId },
      include: { ingredient: true },
    })
    res.json(recipes)
  } catch (error) {
    logger.error('Erreur GET /recipes/:productId:', error)
    res.status(500).json({ message: 'Erreur serveur' })
  }
})

router.put('/recipes/:productId', async (req: any, res: Response) => {
  try {
    const { items } = req.body // [{ingredientId, quantity}]
    await prisma.recipe.deleteMany({ where: { productId: req.params.productId } })
    const created = await prisma.recipe.createMany({
      data: (items || []).map((i: any) => ({
        productId: req.params.productId,
        ingredientId: i.ingredientId,
        quantity: i.quantity,
      })),
    })
    const recipes = await prisma.recipe.findMany({
      where: { productId: req.params.productId },
      include: { ingredient: true },
    })
    res.json(recipes)
  } catch (error) {
    logger.error('Erreur PUT /recipes/:productId:', error)
    res.status(500).json({ message: 'Erreur serveur' })
  }
})

export default router
