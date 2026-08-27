import { Router, type Response } from 'express'
import prisma from '../lib/prisma'
import logger from '../lib/logger'
import { createAvecNumero, NumerotationIndisponibleError } from '../lib/numerotation'

const router = Router()

const QUOTE_STATUSES = new Set(['DRAFT', 'SENT', 'ACCEPTED', 'REJECTED', 'EXPIRED'])
const INVOICE_STATUSES = new Set(['DRAFT', 'SENT', 'PAID', 'OVERDUE', 'CANCELLED'])

type DocumentLine = { description: string; quantity: number; unitPrice: number; taxRate: number }

function prepareLines(raw: unknown): { lines?: DocumentLine[]; subtotal?: number; taxAmount?: number; total?: number; error?: string } {
  if (!Array.isArray(raw) || raw.length === 0) return { error: 'Ajoutez au moins une ligne au document' }
  if (raw.length > 200) return { error: 'Un document ne peut pas dépasser 200 lignes' }

  const lines: DocumentLine[] = []
  for (const value of raw) {
    const line = value as any
    const description = String(line?.description || '').trim()
    const quantity = Number(line?.quantity)
    const unitPrice = Number(line?.unitPrice)
    const taxRate = Number(line?.taxRate ?? 17)
    if (!description || description.length > 500) return { error: 'Chaque ligne doit avoir une description de 1 à 500 caractères' }
    if (!Number.isFinite(quantity) || quantity <= 0) return { error: 'Chaque ligne doit avoir une quantité strictement positive' }
    if (!Number.isFinite(unitPrice) || unitPrice < 0) return { error: 'Chaque ligne doit avoir un prix unitaire positif ou nul' }
    if (!Number.isFinite(taxRate) || taxRate < 0 || taxRate > 100) return { error: 'Le taux de TVA doit être compris entre 0 et 100' }
    lines.push({ description, quantity, unitPrice, taxRate })
  }

  const cents = (value: number) => Math.round((value + Number.EPSILON) * 100) / 100
  const subtotal = cents(lines.reduce((sum, line) => sum + line.quantity * line.unitPrice, 0))
  const taxAmount = cents(lines.reduce((sum, line) => sum + line.quantity * line.unitPrice * (line.taxRate / 100), 0))
  return { lines, subtotal, taxAmount, total: cents(subtotal + taxAmount) }
}

async function validateCustomer(companyId: string, customerId: unknown): Promise<boolean> {
  if (customerId === undefined || customerId === null || customerId === '') return true
  if (typeof customerId !== 'string') return false
  return Boolean(await prisma.customer.findFirst({ where: { id: customerId, companyId }, select: { id: true } }))
}

function parseOptionalDate(value: unknown): { value?: Date | null; error?: string } {
  if (value === undefined) return { value: undefined }
  if (value === null || value === '') return { value: null }
  const date = new Date(String(value))
  return Number.isNaN(date.getTime()) ? { error: 'Date invalide' } : { value: date }
}

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
    const prepared = prepareLines(items)
    if (prepared.error) { res.status(400).json({ message: prepared.error }); return }
    if (!(await validateCustomer(req.companyId, customerId))) { res.status(400).json({ message: "Le client n'appartient pas à cette entreprise" }); return }
    const validity = parseOptionalDate(validUntil)
    if (validity.error) { res.status(400).json({ message: 'Date de validité invalide' }); return }
    const quote = await createAvecNumero(req.companyId, 'QUO', (number) => prisma.quote.create({
      data: {
        companyId: req.companyId,
        customerId: customerId || null,
        number,
        validUntil: validity.value ?? null,
        total: prepared.total!,
        notes: typeof notes === 'string' ? notes.trim().slice(0, 10_000) || null : null,
        items: { create: prepared.lines! },
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
    if (status !== undefined && (!QUOTE_STATUSES.has(status) || status === 'ACCEPTED')) {
      res.status(400).json({ message: status === 'ACCEPTED' ? 'Convertissez le devis pour le marquer accepté' : 'Statut de devis invalide' })
      return
    }
    if (!(await validateCustomer(req.companyId, customerId))) { res.status(400).json({ message: "Le client n'appartient pas à cette entreprise" }); return }
    const validity = parseOptionalDate(validUntil)
    if (validity.error) { res.status(400).json({ message: 'Date de validité invalide' }); return }
    const prepared = items === undefined ? null : prepareLines(items)
    if (prepared?.error) { res.status(400).json({ message: prepared.error }); return }
    const quote = await prisma.quote.update({
      where: { id: req.params.id },
      data: {
        customerId: customerId === undefined ? existing.customerId : (customerId || null),
        validUntil: validity.value === undefined ? existing.validUntil : validity.value,
        notes: notes === undefined ? existing.notes : (typeof notes === 'string' ? notes.trim().slice(0, 10_000) || null : null),
        status: status ?? existing.status,
        total: prepared?.total ?? existing.total,
        ...(prepared && { items: { deleteMany: {}, create: prepared.lines! } }),
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

    if (quote.status === 'ACCEPTED') {
      res.status(409).json({ message: 'Ce devis a déjà été converti en facture' })
      return
    }

    // Un devis déjà accepté a été converti et ne peut pas générer une seconde
    // facture depuis l'interface ou l'API.

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
    const prepared = prepareLines(items)
    if (prepared.error) { res.status(400).json({ message: prepared.error }); return }
    if (!(await validateCustomer(req.companyId, customerId))) { res.status(400).json({ message: "Le client n'appartient pas à cette entreprise" }); return }
    const deadline = parseOptionalDate(dueDate)
    if (deadline.error) { res.status(400).json({ message: "Date d'échéance invalide" }); return }
    const invoice = await createAvecNumero(req.companyId, 'INV', (number) => prisma.invoice.create({
      data: {
        companyId: req.companyId,
        customerId: customerId || null,
        number,
        dueDate: deadline.value ?? null,
        subtotal: prepared.subtotal!,
        taxAmount: prepared.taxAmount!,
        total: prepared.total!,
        notes: typeof notes === 'string' ? notes.trim().slice(0, 10_000) || null : null,
        orderId: orderId || null,
        items: { create: prepared.lines! },
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
    if (!(await validateCustomer(req.companyId, customerId))) { res.status(400).json({ message: "Le client n'appartient pas à cette entreprise" }); return }
    const deadline = parseOptionalDate(dueDate)
    if (deadline.error) { res.status(400).json({ message: "Date d'échéance invalide" }); return }
    const prepared = items === undefined ? null : prepareLines(items)
    if (prepared?.error) { res.status(400).json({ message: prepared.error }); return }
    const invoice = await prisma.invoice.update({
      where: { id: req.params.id },
      data: {
        customerId: customerId === undefined ? existing.customerId : (customerId || null),
        dueDate: deadline.value === undefined ? existing.dueDate : deadline.value,
        notes: notes === undefined ? existing.notes : (typeof notes === 'string' ? notes.trim().slice(0, 10_000) || null : null),
        subtotal: prepared?.subtotal ?? existing.subtotal,
        taxAmount: prepared?.taxAmount ?? existing.taxAmount,
        total: prepared?.total ?? existing.total,
        ...(prepared && { items: { deleteMany: {}, create: prepared.lines! } }),
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
    if (!INVOICE_STATUSES.has(req.body?.status)) {
      res.status(400).json({ message: 'Statut de facture invalide' })
      return
    }
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
