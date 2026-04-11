import { Router, type Response } from 'express'
import prisma from '../lib/prisma'
import logger from '../lib/logger'

const router = Router()

// ─── CAMPAIGNS ────────────────────────────────────────

router.get('/campaigns', async (req: any, res: Response) => {
  try {
    const campaigns = await prisma.campaign.findMany({
      where: { companyId: req.companyId },
      orderBy: { createdAt: 'desc' },
    })
    res.json(campaigns)
  } catch (error) {
    logger.error('Erreur GET /campaigns:', error)
    res.status(500).json({ message: 'Erreur serveur' })
  }
})

router.post('/campaigns', async (req: any, res: Response) => {
  try {
    const { name, type, audience, subject, content, scheduledFor } = req.body
    const campaign = await prisma.campaign.create({
      data: {
        companyId: req.companyId,
        name,
        type,
        audience,
        subject: subject || null,
        content,
        scheduledFor: scheduledFor ? new Date(scheduledFor) : null,
      },
    })
    res.status(201).json(campaign)
  } catch (error) {
    logger.error('Erreur POST /campaigns:', error)
    res.status(500).json({ message: 'Erreur serveur' })
  }
})

router.put('/campaigns/:id', async (req: any, res: Response) => {
  try {
    const existing = await prisma.campaign.findFirst({ where: { id: req.params.id, companyId: req.companyId } })
    if (!existing) { res.status(404).json({ message: 'Campagne non trouvée' }); return }
    const campaign = await prisma.campaign.update({
      where: { id: req.params.id },
      data: req.body,
    })
    res.json(campaign)
  } catch (error) {
    logger.error('Erreur PUT /campaigns/:id:', error)
    res.status(500).json({ message: 'Erreur serveur' })
  }
})

router.post('/campaigns/:id/send', async (req: any, res: Response) => {
  try {
    const existing = await prisma.campaign.findFirst({ where: { id: req.params.id, companyId: req.companyId } })
    if (!existing) { res.status(404).json({ message: 'Campagne non trouvée' }); return }
    const campaign = await prisma.campaign.update({
      where: { id: req.params.id },
      data: { status: 'SENT', sentAt: new Date() },
    })
    // Stub: in production, trigger actual send (SMS/Email/Push)
    res.json({ ...campaign, stub: true, message: 'Envoi déclenché (stub)' })
  } catch (error) {
    logger.error('Erreur POST /campaigns/:id/send:', error)
    res.status(500).json({ message: 'Erreur serveur' })
  }
})

// ─── DISCOUNT CODES ───────────────────────────────────

router.get('/discount-codes', async (req: any, res: Response) => {
  try {
    const codes = await prisma.discountCode.findMany({
      where: { companyId: req.companyId },
      orderBy: { createdAt: 'desc' },
    })
    res.json(codes)
  } catch (error) {
    logger.error('Erreur GET /discount-codes:', error)
    res.status(500).json({ message: 'Erreur serveur' })
  }
})

router.post('/discount-codes', async (req: any, res: Response) => {
  try {
    const { code, type, value, usageLimit, expiresAt } = req.body
    const discountCode = await prisma.discountCode.create({
      data: {
        companyId: req.companyId,
        code: code.toUpperCase(),
        type,
        value,
        usageLimit: usageLimit || null,
        expiresAt: expiresAt ? new Date(expiresAt) : null,
      },
    })
    res.status(201).json(discountCode)
  } catch (error) {
    logger.error('Erreur POST /discount-codes:', error)
    res.status(500).json({ message: 'Erreur serveur' })
  }
})

router.put('/discount-codes/:id', async (req: any, res: Response) => {
  try {
    const existing = await prisma.discountCode.findFirst({ where: { id: req.params.id, companyId: req.companyId } })
    if (!existing) { res.status(404).json({ message: 'Code promo non trouvé' }); return }
    const discountCode = await prisma.discountCode.update({
      where: { id: req.params.id },
      data: { isActive: !existing.isActive },
    })
    res.json(discountCode)
  } catch (error) {
    logger.error('Erreur PUT /discount-codes/:id:', error)
    res.status(500).json({ message: 'Erreur serveur' })
  }
})

router.delete('/discount-codes/:id', async (req: any, res: Response) => {
  try {
    const existing = await prisma.discountCode.findFirst({ where: { id: req.params.id, companyId: req.companyId } })
    if (!existing) { res.status(404).json({ message: 'Code promo non trouvé' }); return }
    await prisma.discountCode.delete({ where: { id: req.params.id } })
    res.json({ message: 'Code promo supprimé' })
  } catch (error) {
    logger.error('Erreur DELETE /discount-codes/:id:', error)
    res.status(500).json({ message: 'Erreur serveur' })
  }
})

export default router
