import { Router, type Response } from 'express'
import prisma from '../lib/prisma'
import logger from '../lib/logger'

const router = Router()

// ─── GET /api/modules ─────────────────────────────────

router.get('/', async (req: any, res: Response) => {
  try {
    const modules = await prisma.companyModule.findMany({
      where: { companyId: req.companyId },
      orderBy: { moduleId: 'asc' },
    })
    res.json(modules)
  } catch (error) {
    logger.error('Erreur GET /modules:', error)
    res.status(500).json({ message: 'Erreur serveur' })
  }
})

// ─── PUT /api/modules/:moduleId ───────────────────────

router.put('/:moduleId', async (req: any, res: Response) => {
  try {
    const existing = await prisma.companyModule.findUnique({
      where: { companyId_moduleId: { companyId: req.companyId, moduleId: req.params.moduleId } },
    })
    if (!existing) { res.status(404).json({ message: 'Module non trouvé' }); return }
    const module = await prisma.companyModule.update({
      where: { companyId_moduleId: { companyId: req.companyId, moduleId: req.params.moduleId } },
      data: { isActive: !existing.isActive },
    })
    res.json(module)
  } catch (error) {
    logger.error('Erreur PUT /modules/:moduleId:', error)
    res.status(500).json({ message: 'Erreur serveur' })
  }
})

export default router
