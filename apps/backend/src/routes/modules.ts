import { Router, type Response } from 'express'
import prisma from '../lib/prisma'
import logger from '../lib/logger'
import { moduleRowsFor } from '../lib/company-modules'

const router = Router()

// ─── GET /api/modules ─────────────────────────────────

router.get('/', async (req: any, res: Response) => {
  try {
    // Auto-réparation des sociétés créées avant l'initialisation des modules.
    // skipDuplicates conserve les choix actif/inactif déjà enregistrés.
    await prisma.companyModule.createMany({
      data: moduleRowsFor(req.companyId),
      skipDuplicates: true,
    })
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
    if (req.role !== 'OWNER' && req.role !== 'MANAGER') {
      res.status(403).json({ message: 'Accès réservé aux responsables' })
      return
    }
    let existing = await prisma.companyModule.findUnique({
      where: { companyId_moduleId: { companyId: req.companyId, moduleId: req.params.moduleId } },
    })
    if (!existing) {
      existing = await prisma.companyModule.create({
        data: { companyId: req.companyId, moduleId: req.params.moduleId, isActive: true },
      })
    }
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
