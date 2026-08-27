import { Router, type Response } from 'express'
import prisma from '../lib/prisma'
import logger from '../lib/logger'

const router = Router()
const STATUTS_DEVIS = new Set(['DRAFT', 'SENT', 'DEPOSIT_PAID', 'CONFIRMED', 'COMPLETED', 'CANCELLED'])

function nombreValide(value: unknown, minimum = 0) {
  const nombre = Number(value)
  return Number.isFinite(nombre) && nombre >= minimum ? nombre : null
}

function lignesValides(items: unknown) {
  if (!Array.isArray(items) || items.length > 200) return null
  const lignes = items.map((item: any) => ({
    description: String(item?.description || '').trim().slice(0, 500),
    quantity: nombreValide(item?.quantity, 0.000001),
    unitPrice: nombreValide(item?.unitPrice),
    category: item?.category ? String(item.category).trim().slice(0, 100) : null,
  }))
  if (lignes.some((item) => !item.description || item.quantity === null || item.unitPrice === null)) return null
  return lignes as Array<{ description: string; quantity: number; unitPrice: number; category: string | null }>
}

async function clientDeLaSociete(companyId: string, customerId: string) {
  return prisma.customer.findFirst({ where: { id: customerId, companyId }, select: { id: true } })
}

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
    const nom = String(eventName || '').trim()
    const date = new Date(eventDate)
    const personnes = nombreValide(headcount ?? 1, 1)
    const acompte = nombreValide(depositAmount ?? 0)
    const lignes = lignesValides(items ?? [])
    if (!nom) return res.status(400).json({ message: 'Nom de l’événement requis' })
    if (Number.isNaN(date.getTime())) return res.status(400).json({ message: 'Date invalide' })
    if (personnes === null || !Number.isInteger(personnes)) return res.status(400).json({ message: 'Nombre de personnes invalide' })
    if (acompte === null) return res.status(400).json({ message: 'Acompte invalide' })
    if (!lignes) return res.status(400).json({ message: 'Lignes du devis invalides' })
    if (customerId && !await clientDeLaSociete(req.companyId, String(customerId))) {
      return res.status(400).json({ message: 'Client invalide pour cette société' })
    }
    const subtotal = lignes.reduce((s, i) => s + i.quantity * i.unitPrice, 0)
    const quote = await prisma.eventQuote.create({
      data: {
        companyId: req.companyId,
        customerId: customerId || null,
        eventName: nom.slice(0, 300),
        eventDate: date,
        location: location ? String(location).trim().slice(0, 500) : null,
        headcount: personnes,
        notes: notes ? String(notes).trim().slice(0, 4000) : null,
        subtotal,
        depositAmount: acompte,
        total: subtotal,
        items: { create: lignes },
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
    if (customerId && !await clientDeLaSociete(req.companyId, String(customerId))) {
      return res.status(400).json({ message: 'Client invalide pour cette société' })
    }
    const lignes = items === undefined ? undefined : lignesValides(items)
    if (items !== undefined && !lignes) return res.status(400).json({ message: 'Lignes du devis invalides' })
    const date = eventDate === undefined ? existing.eventDate : new Date(eventDate)
    if (Number.isNaN(date.getTime())) return res.status(400).json({ message: 'Date invalide' })
    const personnes = headcount === undefined ? existing.headcount : nombreValide(headcount, 1)
    if (personnes === null || !Number.isInteger(personnes)) return res.status(400).json({ message: 'Nombre de personnes invalide' })
    const acompte = depositAmount === undefined ? existing.depositAmount : nombreValide(depositAmount)
    if (acompte === null) return res.status(400).json({ message: 'Acompte invalide' })
    const nom = eventName === undefined ? existing.eventName : String(eventName).trim()
    if (!nom) return res.status(400).json({ message: 'Nom de l’événement requis' })
    const subtotal = lignes ? lignes.reduce((s, i) => s + i.quantity * i.unitPrice, 0) : existing.subtotal
    const quote = await prisma.$transaction(async (tx) => {
      if (lignes) await tx.eventQuoteItem.deleteMany({ where: { eventQuoteId: req.params.id } })
      return tx.eventQuote.update({
        where: { id: req.params.id },
        data: {
          customerId: customerId === undefined ? existing.customerId : customerId || null,
          eventName: nom.slice(0, 300),
          eventDate: date,
          location: location === undefined ? existing.location : location ? String(location).trim().slice(0, 500) : null,
          headcount: personnes,
          notes: notes === undefined ? existing.notes : notes ? String(notes).trim().slice(0, 4000) : null,
          depositAmount: acompte,
          subtotal,
          total: subtotal,
          ...(lignes && { items: { create: lignes } }),
        },
        include: { customer: true, items: true },
      })
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
    const status = String(req.body.status || '').toUpperCase()
    if (!STATUTS_DEVIS.has(status)) return res.status(400).json({ message: 'Statut invalide' })
    const quote = await prisma.eventQuote.update({
      where: { id: req.params.id },
      data: { status },
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
