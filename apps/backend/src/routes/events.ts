import { Router, type Response } from 'express'
import prisma from '../lib/prisma'
import logger from '../lib/logger'

const router = Router()

// ─── GET /api/events/quotes ───────────────────────────

router.get('/quotes', async (req: any, res: Response) => {
  try {
    const quotes = await prisma.eventQuote.findMany({
      where: { companyId: req.companyId },
      include: { customer: true, items: true },
      orderBy: { eventDate: 'asc' },
    })
    res.json(quotes)
  } catch (error) {
    logger.error('Erreur GET /events/quotes:', error)
    res.status(500).json({ message: 'Erreur serveur' })
  }
})

// ─── POST /api/events/quotes ──────────────────────────

router.post('/quotes', async (req: any, res: Response) => {
  try {
    const { customerId, eventName, eventDate, location, headcount, notes, depositAmount, items } = req.body
    const subtotal = (items || []).reduce((s: number, i: any) => s + i.quantity * i.unitPrice, 0)
    const quote = await prisma.eventQuote.create({
      data: {
        companyId: req.companyId,
        customerId: customerId || null,
        eventName,
        eventDate: new Date(eventDate),
        location: location || null,
        headcount: headcount || 1,
        notes: notes || null,
        subtotal,
        depositAmount: depositAmount || 0,
        total: subtotal,
        items: { create: items || [] },
      },
      include: { customer: true, items: true },
    })
    res.status(201).json(quote)
  } catch (error) {
    logger.error('Erreur POST /events/quotes:', error)
    res.status(500).json({ message: 'Erreur serveur' })
  }
})

// ─── PUT /api/events/quotes/:id ───────────────────────

router.put('/quotes/:id', async (req: any, res: Response) => {
  try {
    const existing = await prisma.eventQuote.findFirst({ where: { id: req.params.id, companyId: req.companyId } })
    if (!existing) { res.status(404).json({ message: 'Devis événement non trouvé' }); return }
    const { customerId, eventName, eventDate, location, headcount, notes, depositAmount, items } = req.body
    if (items) {
      await prisma.eventQuoteItem.deleteMany({ where: { eventQuoteId: req.params.id } })
    }
    const subtotal = items ? items.reduce((s: number, i: any) => s + i.quantity * i.unitPrice, 0) : existing.subtotal
    const quote = await prisma.eventQuote.update({
      where: { id: req.params.id },
      data: {
        customerId: customerId ?? existing.customerId,
        eventName: eventName ?? existing.eventName,
        eventDate: eventDate ? new Date(eventDate) : existing.eventDate,
        location: location ?? existing.location,
        headcount: headcount ?? existing.headcount,
        notes: notes ?? existing.notes,
        depositAmount: depositAmount ?? existing.depositAmount,
        subtotal,
        total: subtotal,
        ...(items && { items: { create: items } }),
      },
      include: { customer: true, items: true },
    })
    res.json(quote)
  } catch (error) {
    logger.error('Erreur PUT /events/quotes/:id:', error)
    res.status(500).json({ message: 'Erreur serveur' })
  }
})

// ─── PUT /api/events/quotes/:id/status ───────────────

router.put('/quotes/:id/status', async (req: any, res: Response) => {
  try {
    const existing = await prisma.eventQuote.findFirst({ where: { id: req.params.id, companyId: req.companyId } })
    if (!existing) { res.status(404).json({ message: 'Devis événement non trouvé' }); return }
    const quote = await prisma.eventQuote.update({
      where: { id: req.params.id },
      data: { status: req.body.status },
    })
    res.json(quote)
  } catch (error) {
    logger.error('Erreur PUT /events/quotes/:id/status:', error)
    res.status(500).json({ message: 'Erreur serveur' })
  }
})

// ─── POST /api/events/quotes/:id/deposit ──────────────

router.post('/quotes/:id/deposit', async (req: any, res: Response) => {
  try {
    const existing = await prisma.eventQuote.findFirst({ where: { id: req.params.id, companyId: req.companyId } })
    if (!existing) { res.status(404).json({ message: 'Devis événement non trouvé' }); return }
    const quote = await prisma.eventQuote.update({
      where: { id: req.params.id },
      data: {
        depositPaidAt: new Date(),
        status: 'DEPOSIT_PAID',
      },
    })
    res.json(quote)
  } catch (error) {
    logger.error('Erreur POST /events/quotes/:id/deposit:', error)
    res.status(500).json({ message: 'Erreur serveur' })
  }
})

// ─── DELETE /api/events/quotes/:id ───────────────────

router.delete('/quotes/:id', async (req: any, res: Response) => {
  try {
    const existing = await prisma.eventQuote.findFirst({ where: { id: req.params.id, companyId: req.companyId } })
    if (!existing) { res.status(404).json({ message: 'Devis événement non trouvé' }); return }
    await prisma.eventQuote.delete({ where: { id: req.params.id } })
    res.json({ message: 'Devis événement supprimé' })
  } catch (error) {
    logger.error('Erreur DELETE /events/quotes/:id:', error)
    res.status(500).json({ message: 'Erreur serveur' })
  }
})

export default router
