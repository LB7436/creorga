import { Router, type Response } from 'express'
import prisma from '../lib/prisma'
import logger from '../lib/logger'

const router = Router()

// ─── GET /api/reservations ────────────────────────────

router.get('/', async (req: any, res: Response) => {
  try {
    const { date, status, tableId } = req.query
    const where: any = { companyId: req.companyId }
    if (status) where.status = status
    if (tableId) where.tableId = tableId
    if (date) {
      const start = new Date(date as string)
      start.setHours(0, 0, 0, 0)
      const end = new Date(date as string)
      end.setHours(23, 59, 59, 999)
      where.date = { gte: start, lte: end }
    }
    const reservations = await prisma.reservation.findMany({
      where,
      include: { table: true },
      orderBy: { date: 'asc' },
    })
    res.json(reservations)
  } catch (error) {
    logger.error('Erreur GET /reservations:', error)
    res.status(500).json({ message: 'Erreur serveur' })
  }
})

// ─── POST /api/reservations ───────────────────────────

router.post('/', async (req: any, res: Response) => {
  try {
    const { tableId, customerId, guestName, guestPhone, guestEmail, date, partySize, notes } = req.body
    // Check table conflict
    if (tableId) {
      const conflict = await prisma.reservation.findFirst({
        where: {
          tableId,
          companyId: req.companyId,
          status: { in: ['PENDING', 'CONFIRMED', 'SEATED'] },
          date: {
            gte: new Date(new Date(date).getTime() - 90 * 60 * 1000),
            lte: new Date(new Date(date).getTime() + 90 * 60 * 1000),
          },
        },
      })
      if (conflict) {
        res.status(409).json({ message: 'Cette table est déjà réservée à cet horaire' })
        return
      }
    }
    const reservation = await prisma.reservation.create({
      data: {
        companyId: req.companyId,
        tableId: tableId || null,
        customerId: customerId || null,
        guestName,
        guestPhone: guestPhone || null,
        guestEmail: guestEmail || null,
        date: new Date(date),
        partySize: partySize || 2,
        notes: notes || null,
      },
      include: { table: true },
    })
    res.status(201).json(reservation)
  } catch (error) {
    logger.error('Erreur POST /reservations:', error)
    res.status(500).json({ message: 'Erreur serveur' })
  }
})

// ─── PUT /api/reservations/:id ────────────────────────

router.put('/:id', async (req: any, res: Response) => {
  try {
    const existing = await prisma.reservation.findFirst({ where: { id: req.params.id, companyId: req.companyId } })
    if (!existing) { res.status(404).json({ message: 'Réservation non trouvée' }); return }
    const { tableId, guestName, guestPhone, guestEmail, date, partySize, notes } = req.body
    const reservation = await prisma.reservation.update({
      where: { id: req.params.id },
      data: {
        tableId: tableId ?? existing.tableId,
        guestName: guestName ?? existing.guestName,
        guestPhone: guestPhone ?? existing.guestPhone,
        guestEmail: guestEmail ?? existing.guestEmail,
        date: date ? new Date(date) : existing.date,
        partySize: partySize ?? existing.partySize,
        notes: notes ?? existing.notes,
      },
      include: { table: true },
    })
    res.json(reservation)
  } catch (error) {
    logger.error('Erreur PUT /reservations/:id:', error)
    res.status(500).json({ message: 'Erreur serveur' })
  }
})

// ─── PUT /api/reservations/:id/status ────────────────

router.put('/:id/status', async (req: any, res: Response) => {
  try {
    const existing = await prisma.reservation.findFirst({ where: { id: req.params.id, companyId: req.companyId } })
    if (!existing) { res.status(404).json({ message: 'Réservation non trouvée' }); return }
    const reservation = await prisma.reservation.update({
      where: { id: req.params.id },
      data: { status: req.body.status },
    })
    res.json(reservation)
  } catch (error) {
    logger.error('Erreur PUT /reservations/:id/status:', error)
    res.status(500).json({ message: 'Erreur serveur' })
  }
})

// ─── DELETE /api/reservations/:id ────────────────────

router.delete('/:id', async (req: any, res: Response) => {
  try {
    const existing = await prisma.reservation.findFirst({ where: { id: req.params.id, companyId: req.companyId } })
    if (!existing) { res.status(404).json({ message: 'Réservation non trouvée' }); return }
    await prisma.reservation.delete({ where: { id: req.params.id } })
    res.json({ message: 'Réservation supprimée' })
  } catch (error) {
    logger.error('Erreur DELETE /reservations/:id:', error)
    res.status(500).json({ message: 'Erreur serveur' })
  }
})

export default router
