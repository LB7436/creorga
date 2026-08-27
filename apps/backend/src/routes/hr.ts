import { Router, type Response } from 'express'
import prisma from '../lib/prisma'
import logger from '../lib/logger'
import { emailConfigured, emailTemplates, sendEmail } from '../lib/email'
import { requireRole } from '../middleware/requireCompany'

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

    // Champs obligatoires côté schéma : sans ces contrôles, une requête
    // incomplète faisait planter Prisma et remontait en 500.
    if (!userId || !role) {
      res.status(400).json({ message: 'userId et role sont requis' })
      return
    }
    const début = new Date(startTime)
    const fin = new Date(endTime)
    if (Number.isNaN(début.getTime()) || Number.isNaN(fin.getTime())) {
      res.status(400).json({ message: 'startTime et endTime doivent être des dates valides' })
      return
    }
    if (fin <= début) {
      res.status(400).json({ message: 'La fin du shift doit être postérieure à son début' })
      return
    }

    // Employé inconnu ou d'une autre société : violation de clé étrangère
    // remontée en 500. À noter : GET /hr/team renvoie des adhésions
    // (UserCompany), dont le champ `id` n'est PAS l'identifiant utilisateur —
    // c'est `userId` qu'il faut passer ici.
    const membre = await prisma.userCompany.findFirst({
      where: { userId, companyId: req.companyId, isActive: true },
    })
    if (!membre) {
      res.status(400).json({ message: `Aucun employé actif ${userId} dans cette société` })
      return
    }

    const shift = await prisma.shift.create({
      data: {
        companyId: req.companyId,
        userId,
        role,
        startTime: début,
        endTime: fin,
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

// ─── PUBLICATION DU PLANNING ─────────────────────────

router.post('/planning/publish', requireRole('OWNER', 'MANAGER'), async (req: any, res: Response) => {
  try {
    const début = new Date(req.body?.startDate)
    const fin = new Date(req.body?.endDate)
    if (Number.isNaN(début.getTime()) || Number.isNaN(fin.getTime()) || fin < début) {
      res.status(400).json({ message: 'Période de planning invalide' })
      return
    }
    if (!emailConfigured()) {
      res.status(503).json({
        message: 'Envoi email non configuré. Ajoutez SMTP_USER, SMTP_PASS et EMAIL_FROM pour Zoho, ou RESEND_API_KEY et EMAIL_FROM.',
      })
      return
    }

    const [membres, shifts] = await Promise.all([
      prisma.userCompany.findMany({
        where: { companyId: req.companyId, isActive: true },
        include: { user: { select: { id: true, firstName: true, lastName: true, email: true } } },
      }),
      prisma.shift.findMany({
        where: {
          companyId: req.companyId,
          startTime: { gte: début, lte: fin },
        },
        orderBy: { startTime: 'asc' },
      }),
    ])
    if (shifts.length === 0) {
      res.status(409).json({ message: 'Aucun shift à publier sur cette période' })
      return
    }

    const société = String(req.company?.name || 'Votre établissement')
    const période = `${début.toLocaleDateString('fr-LU')} – ${fin.toLocaleDateString('fr-LU')}`
    const destinataires = membres.filter((membre) => shifts.some((shift) => shift.userId === membre.userId))
    if (destinataires.length === 0) {
      res.status(409).json({ message: 'Aucun salarié actif n’est associé aux shifts de cette période' })
      return
    }

    // Un échec individuel ne doit ni faire croire que tout a été envoyé, ni
    // provoquer au prochain essai un doublon chez les destinataires déjà servis.
    const tentatives = await Promise.allSettled(destinataires.map(async (membre) => {
      const personnels = shifts.filter((shift) => shift.userId === membre.userId)
      const html = emailTemplates.planningPublished({
        employeeName: `${membre.user.firstName} ${membre.user.lastName}`.trim(),
        companyName: société,
        period: période,
        shifts: personnels.map((shift) => ({
          date: shift.startTime.toLocaleDateString('fr-LU', { weekday: 'long', day: '2-digit', month: '2-digit' }),
          start: shift.startTime.toLocaleTimeString('fr-LU', { hour: '2-digit', minute: '2-digit' }),
          end: shift.endTime.toLocaleTimeString('fr-LU', { hour: '2-digit', minute: '2-digit' }),
          role: shift.role,
        })),
      })
      const résultat = await sendEmail({
        to: membre.user.email,
        subject: `Votre planning ${société} · ${période}`,
        html,
      })
      return { userId: membre.userId, email: membre.user.email, messageId: résultat.id, provider: résultat.provider }
    }))

    const résultats = tentatives
      .filter((résultat): résultat is PromiseFulfilledResult<Awaited<ReturnType<typeof sendEmail>> & { userId: string; email: string; messageId: string }> => résultat.status === 'fulfilled')
      .map((résultat) => résultat.value)
    const échecs = tentatives
      .map((résultat, index) => ({ résultat, membre: destinataires[index] }))
      .filter((entrée): entrée is { résultat: PromiseRejectedResult; membre: typeof destinataires[number] } => entrée.résultat.status === 'rejected')
      .map(({ résultat, membre }) => ({
        userId: membre.userId,
        email: membre.user.email,
        message: résultat.reason instanceof Error ? résultat.reason.message : 'Échec non précisé',
      }))

    if (résultats.length > 0) {
      await prisma.shift.updateMany({
        where: {
          companyId: req.companyId,
          userId: { in: résultats.map((résultat) => résultat.userId) },
          id: { in: shifts.map((shift) => shift.id) },
        },
        data: { status: 'CONFIRMED' },
      })
    }

    const payload = {
      ok: échecs.length === 0,
      recipients: résultats.length,
      failedRecipients: échecs.length,
      shifts: shifts.length,
      confirmedShifts: shifts.filter((shift) => résultats.some((résultat) => résultat.userId === shift.userId)).length,
      deliveries: résultats,
      failures: échecs,
    }
    res.status(échecs.length > 0 ? 207 : 200).json(payload)
  } catch (error: any) {
    logger.error('Erreur POST /planning/publish:', error)
    res.status(502).json({ message: error?.message || 'Échec de publication du planning' })
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
      include: {
        profile: true,
        user: { select: { id: true, firstName: true, lastName: true, email: true, avatar: true } },
      },
      orderBy: { createdAt: 'asc' },
    })
    res.json(team)
  } catch (error) {
    logger.error('Erreur GET /team:', error)
    res.status(500).json({ message: 'Erreur serveur' })
  }
})

export default router
