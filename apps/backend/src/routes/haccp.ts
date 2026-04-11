import { Router, type Response } from 'express'
import prisma from '../lib/prisma'
import logger from '../lib/logger'

const router = Router()

// ─── LOGS ─────────────────────────────────────────────

router.get('/logs', async (req: any, res: Response) => {
  try {
    const { type, startDate, endDate } = req.query
    const where: any = { companyId: req.companyId }
    if (type) where.type = type
    if (startDate || endDate) {
      where.loggedAt = {}
      if (startDate) where.loggedAt.gte = new Date(startDate as string)
      if (endDate) where.loggedAt.lte = new Date(endDate as string)
    }
    const logs = await prisma.haccpLog.findMany({
      where,
      orderBy: { loggedAt: 'desc' },
    })
    res.json(logs)
  } catch (error) {
    logger.error('Erreur GET /haccp/logs:', error)
    res.status(500).json({ message: 'Erreur serveur' })
  }
})

router.post('/logs', async (req: any, res: Response) => {
  try {
    const { type, value, notes, loggedBy, isCompliant } = req.body
    const log = await prisma.haccpLog.create({
      data: {
        companyId: req.companyId,
        type,
        value: value ?? null,
        notes: notes || null,
        loggedBy,
        isCompliant: isCompliant !== undefined ? isCompliant : true,
      },
    })
    res.status(201).json(log)
  } catch (error) {
    logger.error('Erreur POST /haccp/logs:', error)
    res.status(500).json({ message: 'Erreur serveur' })
  }
})

// ─── TASKS ────────────────────────────────────────────

router.get('/tasks', async (req: any, res: Response) => {
  try {
    const tasks = await prisma.haccpTask.findMany({
      where: { companyId: req.companyId },
      orderBy: { createdAt: 'asc' },
    })
    res.json(tasks)
  } catch (error) {
    logger.error('Erreur GET /haccp/tasks:', error)
    res.status(500).json({ message: 'Erreur serveur' })
  }
})

router.post('/tasks', async (req: any, res: Response) => {
  try {
    const { name, frequency, timeOfDay } = req.body
    const task = await prisma.haccpTask.create({
      data: { companyId: req.companyId, name, frequency, timeOfDay },
    })
    res.status(201).json(task)
  } catch (error) {
    logger.error('Erreur POST /haccp/tasks:', error)
    res.status(500).json({ message: 'Erreur serveur' })
  }
})

router.put('/tasks/:id', async (req: any, res: Response) => {
  try {
    const existing = await prisma.haccpTask.findFirst({ where: { id: req.params.id, companyId: req.companyId } })
    if (!existing) { res.status(404).json({ message: 'Tâche non trouvée' }); return }
    const task = await prisma.haccpTask.update({
      where: { id: req.params.id },
      data: req.body,
    })
    res.json(task)
  } catch (error) {
    logger.error('Erreur PUT /haccp/tasks/:id:', error)
    res.status(500).json({ message: 'Erreur serveur' })
  }
})

router.delete('/tasks/:id', async (req: any, res: Response) => {
  try {
    const existing = await prisma.haccpTask.findFirst({ where: { id: req.params.id, companyId: req.companyId } })
    if (!existing) { res.status(404).json({ message: 'Tâche non trouvée' }); return }
    await prisma.haccpTask.delete({ where: { id: req.params.id } })
    res.json({ message: 'Tâche supprimée' })
  } catch (error) {
    logger.error('Erreur DELETE /haccp/tasks/:id:', error)
    res.status(500).json({ message: 'Erreur serveur' })
  }
})

// ─── DAILY REPORT ─────────────────────────────────────

router.get('/daily-report', async (req: any, res: Response) => {
  try {
    const { date } = req.query
    const day = date ? new Date(date as string) : new Date()
    const start = new Date(day)
    start.setHours(0, 0, 0, 0)
    const end = new Date(day)
    end.setHours(23, 59, 59, 999)

    const [logs, tasks] = await Promise.all([
      prisma.haccpLog.findMany({
        where: { companyId: req.companyId, loggedAt: { gte: start, lte: end } },
        orderBy: { loggedAt: 'asc' },
      }),
      prisma.haccpTask.findMany({
        where: { companyId: req.companyId, isActive: true },
      }),
    ])

    const compliantCount = logs.filter((l) => l.isCompliant).length
    const nonCompliantCount = logs.filter((l) => !l.isCompliant).length
    const byType = logs.reduce((acc: Record<string, number>, l) => {
      acc[l.type] = (acc[l.type] || 0) + 1
      return acc
    }, {})

    res.json({
      date: start.toISOString(),
      totalLogs: logs.length,
      compliantCount,
      nonCompliantCount,
      complianceRate: logs.length > 0 ? (compliantCount / logs.length) * 100 : 100,
      byType,
      activeTasks: tasks.length,
      logs,
    })
  } catch (error) {
    logger.error('Erreur GET /haccp/daily-report:', error)
    res.status(500).json({ message: 'Erreur serveur' })
  }
})

export default router
