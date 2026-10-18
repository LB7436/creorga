import { Router, type Response } from 'express'
import prisma from '../lib/prisma'
import logger from '../lib/logger'
import { hasCapability } from '../lib/business-permissions'
import { requireCapabilities } from '../lib/business-permission-transaction'

const router = Router()
const ingredientSelect = (req: any) => ({ id: true, companyId: true, name: true, unit: true,
  currentStock: true, minStockLevel: true, supplierId: true, createdAt: true, updatedAt: true,
  costPerUnit: hasCapability(req, 'finance.costs.read') })
function visibleIngredient(ingredient: any, req: any) {
  if (hasCapability(req, 'finance.costs.read')) return ingredient
  const { costPerUnit: _cost, supplier: _supplier, ...visible } = ingredient
  return visible
}
const visibleRecipes = (recipes: any[], req: any) => recipes.map(recipe => ({ ...recipe, ingredient: visibleIngredient(recipe.ingredient, req) }))

function nombreValide(value: unknown, minimum = 0) {
  const nombre = Number(value)
  return Number.isFinite(nombre) && nombre >= minimum ? nombre : null
}

async function fournisseurDeLaSociete(companyId: string, supplierId: string) {
  return prisma.supplier.findFirst({ where: { id: supplierId, companyId }, select: { id: true } })
}

async function ingredientsDeLaSociete(companyId: string, ids: string[]) {
  const uniques = [...new Set(ids)]
  if (uniques.length === 0) return true
  const count = await prisma.ingredient.count({ where: { companyId, id: { in: uniques } } })
  return count === uniques.length
}

// ─── INGREDIENTS ──────────────────────────────────────

router.get('/ingredients', async (req: any, res: Response) => {
  try {
    const ingredients = await prisma.ingredient.findMany({
      where: { companyId: req.companyId },
      select: { ...ingredientSelect(req), supplier: hasCapability(req, 'finance.costs.read') },
      orderBy: { name: 'asc' },
    })
    const withAlerts = ingredients.map((i) => ({ ...visibleIngredient(i, req), lowStock: i.currentStock <= i.minStockLevel }))
    res.json(withAlerts)
  } catch (error) {
    logger.error('Erreur GET /ingredients:', error)
    res.status(500).json({ message: 'Erreur serveur' })
  }
})

router.post('/ingredients', requireCapabilities('inventory.adjust'), async (req: any, res: Response) => {
  try {
    const { name, unit, costPerUnit, currentStock, minStockLevel, supplierId } = req.body
    if (costPerUnit !== undefined && !hasCapability(req, 'finance.manage')) return res.status(403).json({ message: 'La modification des coûts nécessite un droit financier.' })
    if (!String(name || '').trim()) return res.status(400).json({ message: 'Nom requis' })
    const cost = nombreValide(costPerUnit ?? 0)
    const stock = nombreValide(currentStock ?? 0)
    const minimum = nombreValide(minStockLevel ?? 0)
    if (cost === null || stock === null || minimum === null) {
      return res.status(400).json({ message: 'Les quantités et coûts doivent être des nombres positifs' })
    }
    if (supplierId && !await fournisseurDeLaSociete(req.companyId, String(supplierId))) {
      return res.status(400).json({ message: 'Fournisseur invalide pour cette société' })
    }
    const ingredient = await prisma.ingredient.create({
      data: {
        companyId: req.companyId,
        name: String(name).trim().slice(0, 160),
        unit: String(unit || 'kg').trim().slice(0, 20),
        costPerUnit: cost,
        currentStock: stock,
        minStockLevel: minimum,
        supplierId: supplierId || null,
      },
    })
    res.status(201).json(visibleIngredient(ingredient, req))
  } catch (error) {
    logger.error('Erreur POST /ingredients:', error)
    res.status(500).json({ message: 'Erreur serveur' })
  }
})

router.put('/ingredients/:id', requireCapabilities('inventory.adjust'), async (req: any, res: Response) => {
  try {
    if (req.body.costPerUnit !== undefined && !hasCapability(req, 'finance.manage')) return res.status(403).json({ message: 'La modification des coûts nécessite un droit financier.' })
    const existing = await prisma.ingredient.findFirst({ where: { id: req.params.id, companyId: req.companyId } })
    if (!existing) { res.status(404).json({ message: 'Ingrédient non trouvé' }); return }
    const data: any = {}
    if (req.body.name !== undefined) {
      if (!String(req.body.name).trim()) return res.status(400).json({ message: 'Nom requis' })
      data.name = String(req.body.name).trim().slice(0, 160)
    }
    if (req.body.unit !== undefined) data.unit = String(req.body.unit).trim().slice(0, 20)
    for (const champ of ['costPerUnit', 'currentStock', 'minStockLevel'] as const) {
      if (req.body[champ] === undefined) continue
      const valeur = nombreValide(req.body[champ])
      if (valeur === null) return res.status(400).json({ message: `${champ} doit être un nombre positif` })
      data[champ] = valeur
    }
    if (req.body.supplierId !== undefined) {
      const supplierId = req.body.supplierId ? String(req.body.supplierId) : null
      if (supplierId && !await fournisseurDeLaSociete(req.companyId, supplierId)) {
        return res.status(400).json({ message: 'Fournisseur invalide pour cette société' })
      }
      data.supplierId = supplierId
    }
    const ingredient = await prisma.ingredient.update({
      where: { id: req.params.id },
      data,
    })
    res.json(visibleIngredient(ingredient, req))
  } catch (error) {
    logger.error('Erreur PUT /ingredients/:id:', error)
    res.status(500).json({ message: 'Erreur serveur' })
  }
})

router.delete('/ingredients/:id', requireCapabilities('inventory.adjust'), async (req: any, res: Response) => {
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

router.post('/suppliers', requireCapabilities('inventory.adjust'), async (req: any, res: Response) => {
  try {
    const { name, contactName, email, phone, notes } = req.body
    const nom = String(name || '').trim()
    if (!nom) return res.status(400).json({ message: 'Nom requis' })
    const supplier = await prisma.supplier.create({
      data: {
        companyId: req.companyId,
        name: nom.slice(0, 160),
        contactName: contactName ? String(contactName).trim().slice(0, 160) : null,
        email: email ? String(email).trim().toLowerCase().slice(0, 320) : null,
        phone: phone ? String(phone).trim().slice(0, 50) : null,
        notes: notes ? String(notes).trim().slice(0, 1000) : null,
      },
    })
    res.status(201).json(supplier)
  } catch (error) {
    logger.error('Erreur POST /suppliers:', error)
    res.status(500).json({ message: 'Erreur serveur' })
  }
})

router.put('/suppliers/:id', requireCapabilities('inventory.adjust'), async (req: any, res: Response) => {
  try {
    const existing = await prisma.supplier.findFirst({ where: { id: req.params.id, companyId: req.companyId } })
    if (!existing) { res.status(404).json({ message: 'Fournisseur non trouvé' }); return }
    const data: any = {}
    for (const champ of ['name', 'contactName', 'email', 'phone', 'notes'] as const) {
      if (req.body[champ] !== undefined) data[champ] = req.body[champ] === null ? null : String(req.body[champ]).trim().slice(0, 500)
    }
    if (data.name !== undefined && !data.name) return res.status(400).json({ message: 'Nom requis' })
    const supplier = await prisma.supplier.update({ where: { id: req.params.id }, data })
    res.json(supplier)
  } catch (error) {
    logger.error('Erreur PUT /suppliers/:id:', error)
    res.status(500).json({ message: 'Erreur serveur' })
  }
})

// ─── PURCHASE ORDERS ──────────────────────────────────

router.get('/purchase-orders', requireCapabilities('finance.costs.read'), async (req: any, res: Response) => {
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

router.post('/purchase-orders', requireCapabilities('inventory.adjust', 'finance.manage', 'finance.costs.read'), async (req: any, res: Response) => {
  try {
    const { supplierId, notes, items } = req.body
    if (!supplierId || !await fournisseurDeLaSociete(req.companyId, String(supplierId))) {
      return res.status(400).json({ message: 'Fournisseur invalide pour cette société' })
    }
    if (!Array.isArray(items) || items.length === 0 || items.length > 200) {
      return res.status(400).json({ message: 'Le bon de commande doit contenir entre 1 et 200 lignes' })
    }
    const lignes = items.map((i: any) => ({
      ingredientId: String(i?.ingredientId || ''),
      quantity: nombreValide(i?.quantity, 0.000001),
      unitCost: nombreValide(i?.unitCost),
    }))
    if (lignes.some((i) => !i.ingredientId || i.quantity === null || i.unitCost === null)) {
      return res.status(400).json({ message: 'Lignes de commande invalides' })
    }
    if (!await ingredientsDeLaSociete(req.companyId, lignes.map((i) => i.ingredientId))) {
      return res.status(400).json({ message: 'Un ingrédient ne dépend pas de cette société' })
    }
    const lignesValides = lignes as Array<{ ingredientId: string; quantity: number; unitCost: number }>
    const total = lignesValides.reduce((s, i) => s + i.quantity * i.unitCost, 0)
    const order = await prisma.purchaseOrder.create({
      data: {
        companyId: req.companyId,
        supplierId: String(supplierId),
        total,
        notes: notes ? String(notes).slice(0, 1000) : null,
        items: { create: lignesValides },
      },
      include: { supplier: true, items: { include: { ingredient: true } } },
    })
    res.status(201).json(order)
  } catch (error) {
    logger.error('Erreur POST /purchase-orders:', error)
    res.status(500).json({ message: 'Erreur serveur' })
  }
})

router.put('/purchase-orders/:id/receive', requireCapabilities('inventory.adjust'), async (req: any, res: Response) => {
  try {
    if (req.body && Object.keys(req.body).length) return res.status(409).json({ message: 'Réception partielle non implémentée : aucune quantité créditée. Ce bouton ne valide qu’une réception complète, avec un corps vide.' })
    const order = await prisma.purchaseOrder.findFirst({
      where: { id: req.params.id, companyId: req.companyId },
      include: { items: true },
    })
    if (!order) { res.status(404).json({ message: 'Bon de commande non trouvé' }); return }
    if (order.status === 'RECEIVED') {
      return res.status(409).json({ message: 'Ce bon de commande a déjà été réceptionné' })
    }
    if (!await ingredientsDeLaSociete(req.companyId, order.items.map((item) => item.ingredientId))) {
      return res.status(409).json({ message: 'Le bon contient un ingrédient invalide pour cette société' })
    }
    const updated = await prisma.$transaction(async (tx) => {
      // Réserver atomiquement la réception : deux clics/requêtes concurrents
      // ne peuvent pas créditer deux fois les mêmes quantités.
      const claim = await tx.purchaseOrder.updateMany({
        where: { id: req.params.id, companyId: req.companyId, status: { not: 'RECEIVED' } },
        data: { status: 'RECEIVED' },
      })
      if (claim.count !== 1) throw new Error('PURCHASE_ORDER_ALREADY_RECEIVED')
      for (const item of order.items) {
        await tx.ingredient.update({
          where: { id: item.ingredientId },
          data: { currentStock: { increment: item.quantity } },
        })
      }
      return tx.purchaseOrder.findUniqueOrThrow({ where: { id: req.params.id } })
    })
    if (hasCapability(req, 'finance.costs.read')) res.json(updated)
    else { const { total: _total, ...visible } = updated; res.json(visible) }
  } catch (error: any) {
    if (error?.message === 'PURCHASE_ORDER_ALREADY_RECEIVED') {
      return res.status(409).json({ message: 'Ce bon de commande a déjà été réceptionné' })
    }
    logger.error('Erreur PUT /purchase-orders/:id/receive:', error)
    res.status(500).json({ message: 'Erreur serveur' })
  }
})

// ─── RECIPES ──────────────────────────────────────────

router.get('/recipes/:productId', async (req: any, res: Response) => {
  try {
    const product = await prisma.product.findFirst({ where: { id: req.params.productId, companyId: req.companyId }, select: { id: true } })
    if (!product) return res.status(404).json({ message: 'Produit non trouvé' })
    const recipes = await prisma.recipe.findMany({
      where: { productId: req.params.productId },
      include: { ingredient: { select: ingredientSelect(req) } },
    })
    res.json(visibleRecipes(recipes, req))
  } catch (error) {
    logger.error('Erreur GET /recipes/:productId:', error)
    res.status(500).json({ message: 'Erreur serveur' })
  }
})

router.put('/recipes/:productId', requireCapabilities('inventory.adjust'), async (req: any, res: Response) => {
  try {
    const { items } = req.body // [{ingredientId, quantity}]
    const product = await prisma.product.findFirst({ where: { id: req.params.productId, companyId: req.companyId }, select: { id: true } })
    if (!product) return res.status(404).json({ message: 'Produit non trouvé' })
    if (!Array.isArray(items) || items.length > 100) return res.status(400).json({ message: 'Recette invalide' })
    const lignes = items.map((i: any) => ({
        productId: req.params.productId,
        ingredientId: String(i?.ingredientId || ''),
        quantity: nombreValide(i?.quantity, 0.000001),
    }))
    if (lignes.some((i) => !i.ingredientId || i.quantity === null)) return res.status(400).json({ message: 'Lignes de recette invalides' })
    if (new Set(lignes.map((i) => i.ingredientId)).size !== lignes.length) {
      return res.status(400).json({ message: 'Un ingrédient ne peut apparaître qu’une fois dans la recette' })
    }
    if (!await ingredientsDeLaSociete(req.companyId, lignes.map((i) => i.ingredientId))) {
      return res.status(400).json({ message: 'Un ingrédient ne dépend pas de cette société' })
    }
    const lignesValides = lignes as Array<{ productId: string; ingredientId: string; quantity: number }>
    await prisma.$transaction(async (tx) => {
      await tx.recipe.deleteMany({ where: { productId: req.params.productId } })
      if (lignesValides.length) await tx.recipe.createMany({ data: lignesValides })
    })
    const recipes = await prisma.recipe.findMany({
      where: { productId: req.params.productId },
      include: { ingredient: { select: ingredientSelect(req) } },
    })
    res.json(visibleRecipes(recipes, req))
  } catch (error) {
    logger.error('Erreur PUT /recipes/:productId:', error)
    res.status(500).json({ message: 'Erreur serveur' })
  }
})

export default router
