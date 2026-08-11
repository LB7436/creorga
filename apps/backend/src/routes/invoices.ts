import { Router, type Response } from 'express'
import prisma from '../lib/prisma'
import logger from '../lib/logger'
import { createAvecNumero, NumerotationIndisponibleError } from '../lib/numerotation'

const router = Router()

// La numérotation vit désormais dans `lib/numerotation.ts`, pour être partagée
// avec les avoirs et couverte par `lib/numerotation.test.ts`. Ré-exportée ici
// afin de ne casser aucun import existant.
export { createAvecNumero, NumerotationIndisponibleError }

// ─── QUOTES ───────────────────────────────────────────

router.get('/quotes', async (req: any, res: Response) => {
  try {
    const { status, customerId } = req.query
    const where: any = { companyId: req.companyId }
    if (status) where.status = status
    if (customerId) where.customerId = customerId
    const quotes = await prisma.quote.findMany({
      where,
      include: { customer: true, items: true },
      orderBy: { createdAt: 'desc' },
    })
    res.json(quotes)
  } catch (error) {
    logger.error('Erreur GET /quotes:', error)
    res.status(500).json({ message: 'Erreur serveur' })
  }
})

router.post('/quotes', async (req: any, res: Response) => {
  try {
    const { customerId, validUntil, notes, items } = req.body
    const total = (items || []).reduce((s: number, i: any) => s + i.quantity * i.unitPrice, 0)
    const quote = await createAvecNumero(req.companyId, 'QUO', (number) => prisma.quote.create({
      data: {
        companyId: req.companyId,
        customerId: customerId || null,
        number,
        validUntil: validUntil ? new Date(validUntil) : null,
        total,
        notes,
        items: { create: items || [] },
      },
      include: { customer: true, items: true },
    }))
    res.status(201).json(quote)
  } catch (error) {
    if (error instanceof NumerotationIndisponibleError) {
      res.status(503).json({ message: error.message })
      return
    }
    logger.error('Erreur POST /quotes:', error)
    res.status(500).json({ message: 'Erreur serveur' })
  }
})

router.put('/quotes/:id', async (req: any, res: Response) => {
  try {
    const existing = await prisma.quote.findFirst({ where: { id: req.params.id, companyId: req.companyId } })
    if (!existing) { res.status(404).json({ message: 'Devis non trouvé' }); return }
    const { customerId, validUntil, notes, status, items } = req.body
    const total = items ? items.reduce((s: number, i: any) => s + i.quantity * i.unitPrice, 0) : existing.total
    if (items) {
      await prisma.quoteItem.deleteMany({ where: { quoteId: req.params.id } })
    }
    const quote = await prisma.quote.update({
      where: { id: req.params.id },
      data: {
        customerId: customerId ?? existing.customerId,
        validUntil: validUntil ? new Date(validUntil) : existing.validUntil,
        notes: notes ?? existing.notes,
        status: status ?? existing.status,
        total,
        ...(items && { items: { create: items } }),
      },
      include: { customer: true, items: true },
    })
    res.json(quote)
  } catch (error) {
    logger.error('Erreur PUT /quotes/:id:', error)
    res.status(500).json({ message: 'Erreur serveur' })
  }
})

router.delete('/quotes/:id', async (req: any, res: Response) => {
  try {
    const existing = await prisma.quote.findFirst({ where: { id: req.params.id, companyId: req.companyId } })
    if (!existing) { res.status(404).json({ message: 'Devis non trouvé' }); return }
    await prisma.quote.delete({ where: { id: req.params.id } })
    res.json({ message: 'Devis supprimé' })
  } catch (error) {
    logger.error('Erreur DELETE /quotes/:id:', error)
    res.status(500).json({ message: 'Erreur serveur' })
  }
})

router.post('/quotes/:id/convert', async (req: any, res: Response) => {
  try {
    const quote = await prisma.quote.findFirst({
      where: { id: req.params.id, companyId: req.companyId },
      include: { items: true },
    })
    if (!quote) { res.status(404).json({ message: 'Devis non trouvé' }); return }

    // ⚠️ DÉFAUT CONNU — un devis peut être converti plusieurs fois et produire
    // autant de factures numérotées pour la même prestation. Le corriger exige
    // un vrai lien en base (colonne `quoteId` sur Invoice) : posé en phase 2
    // avec les autres extensions du modèle. Une heuristique sur les notes et le
    // client bloquerait des conversions légitimes — pire que le défaut.

    // Les montants sont arrondis au centime : 47,617 € n'est pas une somme
    // d'argent, et l'écart se propagerait au récapitulatif TVA.
    const centimes = (n: number) => Math.round(n * 100) / 100
    const subtotal = centimes(quote.items.reduce((s, i) => s + i.quantity * i.unitPrice, 0))
    const taxAmount = centimes(quote.items.reduce((s, i) => s + i.quantity * i.unitPrice * (i.taxRate / 100), 0))
    const invoice = await createAvecNumero(req.companyId, 'INV', (number) => prisma.invoice.create({
      data: {
        companyId: req.companyId,
        customerId: quote.customerId,
        number,
        subtotal,
        taxAmount,
        total: subtotal + taxAmount,
        notes: quote.notes,
        items: {
          create: quote.items.map((i) => ({
            description: i.description,
            quantity: i.quantity,
            unitPrice: i.unitPrice,
            taxRate: i.taxRate,
          })),
        },
      },
      include: { customer: true, items: true },
    }))
    await prisma.quote.update({ where: { id: req.params.id }, data: { status: 'ACCEPTED' } })
    res.status(201).json(invoice)
  } catch (error) {
    if (error instanceof NumerotationIndisponibleError) {
      res.status(503).json({ message: error.message })
      return
    }
    logger.error('Erreur POST /quotes/:id/convert:', error)
    res.status(500).json({ message: 'Erreur serveur' })
  }
})

// ─── INVOICES ─────────────────────────────────────────

router.get('/', async (req: any, res: Response) => {
  try {
    const { status, customerId, startDate, endDate } = req.query
    const where: any = { companyId: req.companyId }
    if (status) where.status = status
    if (customerId) where.customerId = customerId
    if (startDate || endDate) {
      where.createdAt = {}
      if (startDate) where.createdAt.gte = new Date(startDate as string)
      if (endDate) where.createdAt.lte = new Date(endDate as string)
    }
    const invoices = await prisma.invoice.findMany({
      where,
      include: { customer: true, items: true },
      orderBy: { createdAt: 'desc' },
    })
    res.json(invoices)
  } catch (error) {
    logger.error('Erreur GET /invoices:', error)
    res.status(500).json({ message: 'Erreur serveur' })
  }
})

router.post('/', async (req: any, res: Response) => {
  try {
    const { customerId, dueDate, notes, orderId, items } = req.body

    // Une ligne à quantité ou prix négatif produit une facture à montant
    // négatif : en comptabilité, un remboursement se matérialise par un
    // avoir, pas par une facture négative.
    const lignes: any[] = Array.isArray(items) ? items : []
    for (const l of lignes) {
      const quantité = Number(l?.quantity)
      const prix = Number(l?.unitPrice)
      const taux = Number(l?.taxRate ?? 17)
      if (!Number.isFinite(quantité) || quantité <= 0) {
        res.status(400).json({ message: 'Chaque ligne doit avoir une quantité strictement positive' })
        return
      }
      if (!Number.isFinite(prix) || prix < 0) {
        res.status(400).json({ message: 'Chaque ligne doit avoir un prix unitaire positif ou nul' })
        return
      }
      if (!Number.isFinite(taux) || taux < 0 || taux > 100) {
        res.status(400).json({ message: 'Le taux de TVA doit être compris entre 0 et 100' })
        return
      }
    }

    const cents = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100
    const subtotal = cents(lignes.reduce((s: number, i: any) => s + i.quantity * i.unitPrice, 0))
    const taxAmount = cents(lignes.reduce((s: number, i: any) => s + i.quantity * i.unitPrice * (i.taxRate / 100), 0))
    const invoice = await createAvecNumero(req.companyId, 'INV', (number) => prisma.invoice.create({
      data: {
        companyId: req.companyId,
        customerId: customerId || null,
        number,
        dueDate: dueDate ? new Date(dueDate) : null,
        subtotal,
        taxAmount,
        total: cents(subtotal + taxAmount),
        notes,
        orderId: orderId || null,
        items: { create: lignes },
      },
      include: { customer: true, items: true },
    }))
    res.status(201).json(invoice)
  } catch (error) {
    if (error instanceof NumerotationIndisponibleError) {
      res.status(503).json({ message: error.message })
      return
    }
    logger.error('Erreur POST /invoices:', error)
    res.status(500).json({ message: 'Erreur serveur' })
  }
})

/**
 * Facture unique.
 *
 * Absente jusqu'ici alors que le crochet `useInvoice` la supposait : un GET sur
 * `/invoices/<id>` ne correspondait à aucune route et repartait en 404.
 * Déclarée après le bloc `/quotes`, elle ne l'éclipse donc pas.
 */
router.get('/:id', async (req: any, res: Response) => {
  try {
    const facture = await prisma.invoice.findFirst({
      where: { id: req.params.id, companyId: req.companyId },
      include: { customer: true, items: true },
    })
    if (!facture) {
      res.status(404).json({ message: 'Facture introuvable' })
      return
    }
    res.json(facture)
  } catch (error) {
    logger.error('Erreur GET /invoices/:id:', error)
    res.status(500).json({ message: 'Erreur serveur' })
  }
})

router.put('/:id', async (req: any, res: Response) => {
  try {
    const existing = await prisma.invoice.findFirst({ where: { id: req.params.id, companyId: req.companyId } })
    if (!existing) { res.status(404).json({ message: 'Facture non trouvée' }); return }
    const { customerId, dueDate, notes, items } = req.body
    if (items) {
      await prisma.invoiceItem.deleteMany({ where: { invoiceId: req.params.id } })
    }
    const subtotal = items ? items.reduce((s: number, i: any) => s + i.quantity * i.unitPrice, 0) : existing.subtotal
    const taxAmount = items ? items.reduce((s: number, i: any) => s + i.quantity * i.unitPrice * (i.taxRate / 100), 0) : existing.taxAmount
    const invoice = await prisma.invoice.update({
      where: { id: req.params.id },
      data: {
        customerId: customerId ?? existing.customerId,
        dueDate: dueDate ? new Date(dueDate) : existing.dueDate,
        notes: notes ?? existing.notes,
        subtotal,
        taxAmount,
        total: subtotal + taxAmount,
        ...(items && { items: { create: items } }),
      },
      include: { customer: true, items: true },
    })
    res.json(invoice)
  } catch (error) {
    logger.error('Erreur PUT /invoices/:id:', error)
    res.status(500).json({ message: 'Erreur serveur' })
  }
})

router.put('/:id/status', async (req: any, res: Response) => {
  try {
    const existing = await prisma.invoice.findFirst({ where: { id: req.params.id, companyId: req.companyId } })
    if (!existing) { res.status(404).json({ message: 'Facture non trouvée' }); return }
    const invoice = await prisma.invoice.update({
      where: { id: req.params.id },
      data: { status: req.body.status },
    })
    res.json(invoice)
  } catch (error) {
    logger.error('Erreur PUT /invoices/:id/status:', error)
    res.status(500).json({ message: 'Erreur serveur' })
  }
})

router.get('/:id/pdf', async (req: any, res: Response) => {
  try {
    const invoice = await prisma.invoice.findFirst({
      where: { id: req.params.id, companyId: req.companyId },
      include: { customer: true, items: true, company: true },
    })
    if (!invoice) { res.status(404).json({ message: 'Facture non trouvée' }); return }
    res.json({ invoice, generatedAt: new Date().toISOString() })
  } catch (error) {
    logger.error('Erreur GET /invoices/:id/pdf:', error)
    res.status(500).json({ message: 'Erreur serveur' })
  }
})

export default router
