import { Router, type Response } from 'express'
import prisma from '../lib/prisma'
import logger from '../lib/logger'

const router = Router()

// ─── SHIFTS ───────────────────────────────────────────

router.get('/shifts', async (req: any, res: Response) => {
  try {
    const { userId, startDate, endDate } = req.query
    const where: any = { companyId: req.companyId }
    if (userId) where.userId = userId
    if (startDate || endDate) {
      where.startTime = {}
      if (startDate) where.startTime.gte = new Date(startDate as string)
      if (endDate) where.startTime.lte = new Date(endDate as string)
    }
    const shifts = await prisma.shift.findMany({
      where,
      include: { user: { select: { id: true, firstName: true, lastName: true } } },
      orderBy: { startTime: 'asc' },
    })
    res.json(shifts)
  } catch (error) {
    logger.error('Erreur GET /shifts:', error)
    res.status(500).json({ message: 'Erreur serveur' })
  }
})

router.post('/shifts', async (req: any, res: Response) => {
  try {
    const { userId, role, startTime, endTime, breakMinutes, notes } = req.body
    const shift = await prisma.shift.create({
      data: {
        companyId: req.companyId,
        userId,
        role,
        startTime: new Date(startTime),
        endTime: new Date(endTime),
        breakMinutes: breakMinutes || 0,
        notes: notes || null,
      },
      include: { user: { select: { id: true, firstName: true, lastName: true } } },
    })
    res.status(201).json(shift)
  } catch (error) {
    logger.error('Erreur POST /shifts:', error)
    res.status(500).json({ message: 'Erreur serveur' })
  }
})

router.put('/shifts/:id', async (req: any, res: Response) => {
  try {
    const existing = await prisma.shift.findFirst({ where: { id: req.params.id, companyId: req.companyId } })
    if (!existing) { res.status(404).json({ message: 'Shift non trouvé' }); return }
    const { role, startTime, endTime, breakMinutes, notes, status } = req.body
    const shift = await prisma.shift.update({
      where: { id: req.params.id },
      data: {
        role: role ?? existing.role,
        startTime: startTime ? new Date(startTime) : existing.startTime,
        endTime: endTime ? new Date(endTime) : existing.endTime,
        breakMinutes: breakMinutes ?? existing.breakMinutes,
        notes: notes ?? existing.notes,
        status: status ?? existing.status,
      },
    })
    res.json(shift)
  } catch (error) {
    logger.error('Erreur PUT /shifts/:id:', error)
    res.status(500).json({ message: 'Erreur serveur' })
  }
})

router.delete('/shifts/:id', async (req: any, res: Response) => {
  try {
    const existing = await prisma.shift.findFirst({ where: { id: req.params.id, companyId: req.companyId } })
    if (!existing) { res.status(404).json({ message: 'Shift non trouvé' }); return }
    await prisma.shift.delete({ where: { id: req.params.id } })
    res.json({ message: 'Shift supprimé' })
  } catch (error) {
    logger.error('Erreur DELETE /shifts/:id:', error)
    res.status(500).json({ message: 'Erreur serveur' })
  }
})

// ─── TIME PUNCHES ─────────────────────────────────────

router.post('/punch/in', async (req: any, res: Response) => {
  try {
    const { userId } = req.body
    // Check if already clocked in
    const open = await prisma.timePunch.findFirst({
      where: { userId, companyId: req.companyId, clockOut: null },
    })
    if (open) {
      res.status(409).json({ message: 'Déjà pointé - veuillez d\'abord pointer la sortie' })
      return
    }
    const punch = await prisma.timePunch.create({
      data: { companyId: req.companyId, userId, clockIn: new Date() },
    })
    res.status(201).json(punch)
  } catch (error) {
    logger.error('Erreur POST /punch/in:', error)
    res.status(500).json({ message: 'Erreur serveur' })
  }
})

router.post('/punch/out', async (req: any, res: Response) => {
  try {
    const { userId } = req.body
    const open = await prisma.timePunch.findFirst({
      where: { userId, companyId: req.companyId, clockOut: null },
      orderBy: { clockIn: 'desc' },
    })
    if (!open) {
      res.status(404).json({ message: 'Aucun pointage en cours trouvé' })
      return
    }
    const punch = await prisma.timePunch.update({
      where: { id: open.id },
      data: { clockOut: new Date() },
    })
    res.json(punch)
  } catch (error) {
    logger.error('Erreur POST /punch/out:', error)
    res.status(500).json({ message: 'Erreur serveur' })
  }
})

router.get('/punches', async (req: any, res: Response) => {
  try {
    const { userId, startDate, endDate } = req.query
    const where: any = { companyId: req.companyId }
    if (userId) where.userId = userId
    if (startDate || endDate) {
      where.clockIn = {}
      if (startDate) where.clockIn.gte = new Date(startDate as string)
      if (endDate) where.clockIn.lte = new Date(endDate as string)
    }
    const punches = await prisma.timePunch.findMany({
      where,
      include: { user: { select: { id: true, firstName: true, lastName: true } } },
      orderBy: { clockIn: 'desc' },
    })
    res.json(punches)
  } catch (error) {
    logger.error('Erreur GET /punches:', error)
    res.status(500).json({ message: 'Erreur serveur' })
  }
})

// ─── LEAVE REQUESTS ───────────────────────────────────

router.get('/leave-requests', async (req: any, res: Response) => {
  try {
    const { status } = req.query
    const where: any = { companyId: req.companyId }
    if (status) where.status = status
    const leaves = await prisma.leaveRequest.findMany({
      where,
      include: { user: { select: { id: true, firstName: true, lastName: true } } },
      orderBy: { createdAt: 'desc' },
    })
    res.json(leaves)
  } catch (error) {
    logger.error('Erreur GET /leave-requests:', error)
    res.status(500).json({ message: 'Erreur serveur' })
  }
})

router.post('/leave-requests', async (req: any, res: Response) => {
  try {
    const { userId, type, startDate, endDate, notes } = req.body
    const leave = await prisma.leaveRequest.create({
      data: {
        companyId: req.companyId,
        userId,
        type,
        startDate: new Date(startDate),
        endDate: new Date(endDate),
        notes: notes || null,
      },
    })
    res.status(201).json(leave)
  } catch (error) {
    logger.error('Erreur POST /leave-requests:', error)
    res.status(500).json({ message: 'Erreur serveur' })
  }
})

router.put('/leave-requests/:id/status', async (req: any, res: Response) => {
  try {
    const existing = await prisma.leaveRequest.findFirst({ where: { id: req.params.id, companyId: req.companyId } })
    if (!existing) { res.status(404).json({ message: 'Demande non trouvée' }); return }
    const leave = await prisma.leaveRequest.update({
      where: { id: req.params.id },
      data: { status: req.body.status },
    })
    res.json(leave)
  } catch (error) {
    logger.error('Erreur PUT /leave-requests/:id/status:', error)
    res.status(500).json({ message: 'Erreur serveur' })
  }
})

// ─── TEAM ─────────────────────────────────────────────

router.get('/team', async (req: any, res: Response) => {
  try {
    const team = await prisma.userCompany.findMany({
      where: { companyId: req.companyId, isActive: true },
      include: { user: { select: { id: true, firstName: true, lastName: true, email: true, avatar: true } } },
      orderBy: { createdAt: 'asc' },
    })
    res.json(team)
  } catch (error) {
    logger.error('Erreur GET /team:', error)
    res.status(500).json({ message: 'Erreur serveur' })
  }
})

export default router
