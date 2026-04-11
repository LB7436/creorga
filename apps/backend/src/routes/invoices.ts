import { Router, type Response } from 'express'
import prisma from '../lib/prisma'
import logger from '../lib/logger'

const router = Router()

// ─── Helper: generate sequential number ───────────────

async function nextNumber(companyId: string, prefix: 'INV' | 'QUO'): Promise<string> {
  const count = prefix === 'INV'
    ? await prisma.invoice.count({ where: { companyId } })
    : await prisma.quote.count({ where: { companyId } })
  const year = new Date().getFullYear()
  return `${prefix}-${year}-${String(count + 1).padStart(4, '0')}`
}

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
    const number = await nextNumber(req.companyId, 'QUO')
    const total = (items || []).reduce((s: number, i: any) => s + i.quantity * i.unitPrice, 0)
    const quote = await prisma.quote.create({
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
    })
    res.status(201).json(quote)
  } catch (error) {
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
    const number = await nextNumber(req.companyId, 'INV')
    const subtotal = quote.items.reduce((s, i) => s + i.quantity * i.unitPrice, 0)
    const taxAmount = quote.items.reduce((s, i) => s + i.quantity * i.unitPrice * (i.taxRate / 100), 0)
    const invoice = await prisma.invoice.create({
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
    })
    await prisma.quote.update({ where: { id: req.params.id }, data: { status: 'ACCEPTED' } })
    res.status(201).json(invoice)
  } catch (error) {
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
    const number = await nextNumber(req.companyId, 'INV')
    const subtotal = (items || []).reduce((s: number, i: any) => s + i.quantity * i.unitPrice, 0)
    const taxAmount = (items || []).reduce((s: number, i: any) => s + i.quantity * i.unitPrice * (i.taxRate / 100), 0)
    const invoice = await prisma.invoice.create({
      data: {
        companyId: req.companyId,
        customerId: customerId || null,
        number,
        dueDate: dueDate ? new Date(dueDate) : null,
        subtotal,
        taxAmount,
        total: subtotal + taxAmount,
        notes,
        orderId: orderId || null,
        items: { create: items || [] },
      },
      include: { customer: true, items: true },
    })
    res.status(201).json(invoice)
  } catch (error) {
    logger.error('Erreur POST /invoices:', error)
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
