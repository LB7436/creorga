import { Router, type Response } from 'express'
import prisma from '../lib/prisma'
import logger from '../lib/logger'

const router = Router()

// ─── GET /api/reputation/reviews ──────────────────────

router.get('/reviews', async (req: any, res: Response) => {
  try {
    const { platform, rating, replied } = req.query
    const where: any = { companyId: req.companyId }
    if (platform) where.platform = platform
    if (rating) where.rating = parseInt(rating as string)
    if (replied !== undefined) where.replied = replied === 'true'

    const reviews = await prisma.review.findMany({
      where,
      include: { customer: { select: { id: true, firstName: true, lastName: true } } },
      orderBy: { createdAt: 'desc' },
    })
    res.json(reviews)
  } catch (error) {
    logger.error('Erreur GET /reviews:', error)
    res.status(500).json({ message: 'Erreur serveur' })
  }
})

// ─── POST /api/reputation/reviews ─────────────────────

router.post('/reviews', async (req: any, res: Response) => {
  try {
    const { customerId, platform, rating, comment } = req.body
    const review = await prisma.review.create({
      data: {
        companyId: req.companyId,
        customerId: customerId || null,
        platform: platform || 'INTERNAL',
        rating: parseInt(rating),
        comment: comment || null,
      },
    })
    res.status(201).json(review)
  } catch (error) {
    logger.error('Erreur POST /reviews:', error)
    res.status(500).json({ message: 'Erreur serveur' })
  }
})

// ─── PUT /api/reputation/reviews/:id/reply ────────────

router.put('/reviews/:id/reply', async (req: any, res: Response) => {
  try {
    const existing = await prisma.review.findFirst({ where: { id: req.params.id, companyId: req.companyId } })
    if (!existing) { res.status(404).json({ message: 'Avis non trouvé' }); return }
    const review = await prisma.review.update({
      where: { id: req.params.id },
      data: { replied: true, replyText: req.body.replyText },
    })
    res.json(review)
  } catch (error) {
    logger.error('Erreur PUT /reviews/:id/reply:', error)
    res.status(500).json({ message: 'Erreur serveur' })
  }
})

// ─── GET /api/reputation/stats ────────────────────────

router.get('/stats', async (req: any, res: Response) => {
  try {
    const reviews = await prisma.review.findMany({ where: { companyId: req.companyId } })
    const total = reviews.length
    const avgRating = total > 0 ? reviews.reduce((s, r) => s + r.rating, 0) / total : 0
    const unreplied = reviews.filter((r) => !r.replied).length

    const byPlatform = reviews.reduce((acc: Record<string, { count: number; avgRating: number; sum: number }>, r) => {
      if (!acc[r.platform]) acc[r.platform] = { count: 0, avgRating: 0, sum: 0 }
      acc[r.platform].count++
      acc[r.platform].sum += r.rating
      acc[r.platform].avgRating = acc[r.platform].sum / acc[r.platform].count
      return acc
    }, {})

    // Trend: last 30 days vs previous 30 days
    const now = new Date()
    const last30 = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    const prev30 = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000)
    const recentReviews = reviews.filter((r) => r.createdAt >= last30)
    const previousReviews = reviews.filter((r) => r.createdAt >= prev30 && r.createdAt < last30)
    const recentAvg = recentReviews.length > 0 ? recentReviews.reduce((s, r) => s + r.rating, 0) / recentReviews.length : 0
    const previousAvg = previousReviews.length > 0 ? previousReviews.reduce((s, r) => s + r.rating, 0) / previousReviews.length : 0

    res.json({
      total,
      avgRating: Math.round(avgRating * 10) / 10,
      unreplied,
      byPlatform,
      trend: { recentAvg: Math.round(recentAvg * 10) / 10, previousAvg: Math.round(previousAvg * 10) / 10 },
    })
  } catch (error) {
    logger.error('Erreur GET /reputation/stats:', error)
    res.status(500).json({ message: 'Erreur serveur' })
  }
})

export default router
