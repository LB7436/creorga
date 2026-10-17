import { Router, type Response } from 'express'
import prisma from '../lib/prisma'
import logger from '../lib/logger'
import { emailConfigured, emailTemplates, planningShiftLabels, sendEmail } from '../lib/email'
import { requireRole } from '../middleware/requireCompany'
import { withShiftSlot, ShiftConflict, validateShiftTimes } from '../lib/shift-slot'

const router = Router()

function canManageTeam(req: any) {
  return req.role === 'OWNER' || req.role === 'MANAGER'
}

function requestedUserAllowed(req: any, userId: unknown) {
  return canManageTeam(req) || String(userId || '') === req.user?.userId
}

/** Lire uniquement le marqueur métier existant, jamais publier les notes libres. */
function planningSectionFromNotes(notes: string | null): string | undefined {
  const section = notes?.match(/(?:^|;)section:(Salle|Bar|Terrasse)(?:;|$)/i)?.[1]
  return section ? section[0].toUpperCase() + section.slice(1).toLowerCase() : undefined
}

// ─── SHIFTS ───────────────────────────────────────────

router.get('/shifts', async (req: any, res: Response) => {
  try {
    const { userId, startDate, endDate } = req.query
    const where: any = { companyId: req.companyId }
    if (!canManageTeam(req)) where.userId = req.user.userId
    if (userId) where.userId = userId
    if (!requestedUserAllowed(req, where.userId)) return res.status(403).json({ message: 'Accès limité à votre propre planning' })
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
    if (!canManageTeam(req)) return res.status(403).json({ message: 'Accès réservé aux responsables' })
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

    if (!validateShiftTimes(début, fin, breakMinutes ?? 0)) return res.status(400).json({ message: 'Horaires ou durée de pause invalides.' })
    const shift = await withShiftSlot(req.companyId, userId, début, fin, undefined, (tx) => tx.shift.create({
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
    }))
    res.status(201).json(shift)
  } catch (error) {
    if (error instanceof ShiftConflict) return res.status(409).json({ message: error.message, code: 'SHIFT_OVERLAP' })
    logger.error('Erreur POST /shifts:', error)
    res.status(500).json({ message: 'Erreur serveur' })
  }
})

router.put('/shifts/:id', async (req: any, res: Response) => {
  try {
    if (!canManageTeam(req)) return res.status(403).json({ message: 'Accès réservé aux responsables' })
    const existing = await prisma.shift.findFirst({ where: { id: req.params.id, companyId: req.companyId } })
    if (!existing) { res.status(404).json({ message: 'Shift non trouvé' }); return }
    const { role, startTime, endTime, breakMinutes, notes, status } = req.body
    const début = startTime === undefined ? existing.startTime : new Date(startTime)
    const fin = endTime === undefined ? existing.endTime : new Date(endTime)
    if (!validateShiftTimes(début, fin, breakMinutes ?? existing.breakMinutes)) return res.status(400).json({ message: 'Horaires ou durée de pause invalides.' })
    if (status !== undefined && !['SCHEDULED', 'CONFIRMED', 'COMPLETED'].includes(status)) return res.status(400).json({ message: 'Statut de planning invalide.' })
    const shift = await withShiftSlot(req.companyId, existing.userId, début, fin, existing.id, (tx) => tx.shift.update({
      where: { id: req.params.id },
      data: {
        role: role ?? existing.role,
        startTime: début,
        endTime: fin,
        breakMinutes: breakMinutes ?? existing.breakMinutes,
        notes: notes ?? existing.notes,
        status: status ?? existing.status,
      },
    }))
    res.json(shift)
  } catch (error) {
    if (error instanceof ShiftConflict) return res.status(409).json({ message: error.message, code: 'SHIFT_OVERLAP' })
    logger.error('Erreur PUT /shifts/:id:', error)
    res.status(500).json({ message: 'Erreur serveur' })
  }
})

router.delete('/shifts/:id', async (req: any, res: Response) => {
  try {
    if (!canManageTeam(req)) return res.status(403).json({ message: 'Accès réservé aux responsables' })
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
          ...planningShiftLabels(shift.startTime, shift.endTime),
          role: shift.role,
          section: planningSectionFromNotes(shift.notes),
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

/** Les deux écrivains partagent le même verrou transactionnel par société/salarié.
 * Pas de nettoyage implicite : plusieurs entrées historiques ouvertes exigent une revue. */
async function mutateTimePunch(req: any, userId: string, direction: 'in' | 'out') {
  const companyId = req.companyId as string
  const actorId = req.user?.userId as string | undefined
  return prisma.$transaction(async tx => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtext(${'creorga:time-punch:' + companyId}), hashtext(${userId}))`
    // L'attente du verrou peut dépasser une révocation : ne pas croire l'ancien req.role.
    const actor = actorId ? await tx.userCompany.findFirst({ where: { companyId, userId: actorId, isActive: true }, select: { userId: true, role: true } }) : null
    if (!actor || !requestedUserAllowed({ role: actor.role, user: { userId: actorId } }, userId)) {
      return { status: 403, body: { message: 'Accès au pointage refusé : vérifiez votre adhésion et vos droits actuels.' } }
    }
    const member = actorId === userId ? actor : await tx.userCompany.findFirst({ where: { companyId, userId, isActive: true }, select: { userId: true } })
    if (!member) return { status: 400, body: { message: 'Collaborateur actif introuvable dans cette société' } }
    const opened = await tx.timePunch.findMany({ where: { companyId, userId, clockOut: null }, orderBy: [{ clockIn: 'asc' }, { id: 'asc' }], take: 2 })
    if (opened.length > 1) return { status: 409, body: {
      message: 'Plusieurs pointages ouverts existent. Aucune ligne n’a été modifiée ; un responsable doit vérifier cet historique.', code: 'TIME_PUNCH_HISTORY_CONFLICT',
    } }
    if (direction === 'in') {
      if (opened.length) return { status: 409, body: { message: 'Déjà pointé - veuillez d’abord pointer la sortie', code: 'TIME_PUNCH_ALREADY_OPEN' } }
      return { status: 201, body: await tx.timePunch.create({ data: { companyId, userId, clockIn: new Date() } }) }
    }
    if (!opened.length) return { status: 404, body: { message: 'Aucun pointage en cours trouvé' } }
    const result = await tx.timePunch.updateMany({ where: { id: opened[0].id, companyId, userId, clockOut: null }, data: { clockOut: new Date() } })
    if (result.count !== 1) return { status: 409, body: { message: 'Ce pointage a changé. Rechargez sans répéter une fermeture.', code: 'TIME_PUNCH_CHANGED' } }
    return { status: 200, body: await tx.timePunch.findUniqueOrThrow({ where: { id: opened[0].id } }) }
  }, { maxWait: 15000, timeout: 10000 })
}

router.post('/punch/in', async (req: any, res: Response) => {
  try {
    const { userId } = req.body
    if (!requestedUserAllowed(req, userId)) return res.status(403).json({ message: 'Vous ne pouvez pointer que votre propre compte' })
    if (typeof userId !== 'string' || !userId) return res.status(400).json({ message: 'Identifiant du collaborateur requis' })
    const result = await mutateTimePunch(req, userId, 'in')
    res.status(result.status).json(result.body)
  } catch (error) {
    logger.error('Erreur POST /punch/in:', error)
    res.status(500).json({ message: 'Erreur serveur' })
  }
})

router.post('/punch/out', async (req: any, res: Response) => {
  try {
    const { userId } = req.body
    if (!requestedUserAllowed(req, userId)) return res.status(403).json({ message: 'Vous ne pouvez pointer que votre propre compte' })
    if (typeof userId !== 'string' || !userId) return res.status(400).json({ message: 'Identifiant du collaborateur requis' })
    const result = await mutateTimePunch(req, userId, 'out')
    res.status(result.status).json(result.body)
  } catch (error) {
    logger.error('Erreur POST /punch/out:', error)
    res.status(500).json({ message: 'Erreur serveur' })
  }
})

router.get('/punches', async (req: any, res: Response) => {
  try {
    const { userId, startDate, endDate } = req.query
    const where: any = { companyId: req.companyId }
    if (!canManageTeam(req)) where.userId = req.user.userId
    if (userId) where.userId = userId
    if (!requestedUserAllowed(req, where.userId)) return res.status(403).json({ message: 'Accès limité à vos propres pointages' })
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
    if (!canManageTeam(req)) where.userId = req.user.userId
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
    if (!requestedUserAllowed(req, userId)) return res.status(403).json({ message: 'Vous ne pouvez créer une demande que pour votre propre compte' })
    const member = await prisma.userCompany.findFirst({ where: { userId: String(userId || ''), companyId: req.companyId, isActive: true } })
    if (!member) return res.status(400).json({ message: 'Collaborateur actif introuvable dans cette société' })
    if (!['VACATION', 'SICK', 'OTHER'].includes(type)) return res.status(400).json({ message: 'Type de congé invalide' })
    const start = new Date(startDate)
    const end = new Date(endDate)
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) return res.status(400).json({ message: 'Période de congé invalide' })
    const leave = await prisma.leaveRequest.create({
      data: {
        companyId: req.companyId,
        userId,
        type,
        startDate: start,
        endDate: end,
        notes: notes ? String(notes).trim().slice(0, 1000) : null,
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
    if (!canManageTeam(req)) return res.status(403).json({ message: 'Accès réservé aux responsables' })
    const existing = await prisma.leaveRequest.findFirst({ where: { id: req.params.id, companyId: req.companyId } })
    if (!existing) { res.status(404).json({ message: 'Demande non trouvée' }); return }
    if (!['PENDING', 'APPROVED', 'REJECTED'].includes(req.body.status)) return res.status(400).json({ message: 'Statut invalide' })
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
      where: { companyId: req.companyId, isActive: true, ...(!canManageTeam(req) ? { userId: req.user.userId } : {}) },
      include: {
        profile: canManageTeam(req),
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
