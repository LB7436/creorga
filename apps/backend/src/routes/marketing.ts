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
    const cleanName = String(name || '').trim()
    const cleanContent = String(content || '').trim()
    if (!cleanName || !cleanContent) return res.status(400).json({ message: 'Nom et contenu requis' })
    if (!['EMAIL', 'SMS', 'PUSH'].includes(type)) return res.status(400).json({ message: 'Canal invalide' })
    if (!['ALL', 'LOYAL', 'INACTIVE', 'BIRTHDAY'].includes(audience)) return res.status(400).json({ message: 'Audience invalide' })
    const schedule = scheduledFor ? new Date(scheduledFor) : null
    if (schedule && Number.isNaN(schedule.getTime())) return res.status(400).json({ message: 'Date de programmation invalide' })
    const campaign = await prisma.campaign.create({
      data: {
        companyId: req.companyId,
        name: cleanName.slice(0, 160),
        type,
        audience,
        subject: subject ? String(subject).trim().slice(0, 250) : null,
        content: cleanContent.slice(0, 10000),
        scheduledFor: schedule,
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
    // Ne jamais marquer SENT sans fournisseur ni liste de destinataires :
    // l'ancienne route répondait succès tout en n'envoyant absolument rien.
    res.status(503).json({
      code: 'CAMPAIGN_SENDING_NOT_CONFIGURED',
      message: "Envoi non effectué : le ciblage et le fournisseur d'e-mail/SMS ne sont pas encore configurés.",
    })
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
    const cleanCode = String(code || '').trim().toUpperCase()
    const numericValue = Number(value)
    const numericLimit = usageLimit === null || usageLimit === undefined || usageLimit === '' ? null : Number(usageLimit)
    if (!/^[A-Z0-9_-]{2,40}$/.test(cleanCode)) return res.status(400).json({ message: 'Code invalide (2 à 40 caractères)' })
    if (!['PERCENT', 'FIXED'].includes(type)) return res.status(400).json({ message: 'Type de remise invalide' })
    if (!Number.isFinite(numericValue) || numericValue <= 0 || (type === 'PERCENT' && numericValue > 100)) return res.status(400).json({ message: 'Valeur de remise invalide' })
    if (numericLimit !== null && (!Number.isInteger(numericLimit) || numericLimit <= 0)) return res.status(400).json({ message: 'Limite d’utilisation invalide' })
    const expiry = expiresAt ? new Date(expiresAt) : null
    if (expiry && Number.isNaN(expiry.getTime())) return res.status(400).json({ message: 'Date d’expiration invalide' })
    const discountCode = await prisma.discountCode.create({
      data: {
        companyId: req.companyId,
        code: cleanCode,
        type,
        value: numericValue,
        usageLimit: numericLimit,
        expiresAt: expiry,
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
