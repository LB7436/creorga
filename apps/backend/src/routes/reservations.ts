import { Router } from 'express'
import { z } from 'zod'
import type { Prisma } from '@prisma/client'
import prisma from '../lib/prisma'
import logger from '../lib/logger'
import { assertTransactionCapabilities, requireCapabilities, BusinessPermissionError } from '../lib/business-permission-transaction'
import { lockFinancialCompany } from '../lib/financial-lock'
import { PosError } from '../lib/pos-ledger'
const router = Router()
const active = ['PENDING', 'CONFIRMED', 'SEATED']
const fields = z.object({ tableId: z.string().min(1).max(100).nullish(), customerId: z.string().min(1).max(100).nullish(), guestName: z.string().trim().min(1).max(160),
  guestPhone: z.string().max(100).nullish(), guestEmail: z.string().email().max(250).or(z.literal('')).nullish(),
  date: z.string().datetime({ offset: true }).transform(s => new Date(s)), partySize: z.number().int().min(1).max(1000).optional(), notes: z.string().max(2000).nullish() }).strict()
const wrap = (fn: (req: any, res: any) => Promise<any>) => async (req: any, res: any) => {
  try { await fn(req, res) } catch (e) {
    if (e instanceof z.ZodError) return res.status(400).json({ message: 'Réservation invalide : vérifiez date, coordonnées et nombre de personnes.' })
    if (e instanceof BusinessPermissionError) return res.status(403).json({ message: e.message })
    if (e instanceof PosError) return res.status(e.status).json({ message: e.message })
    logger.error('Réservation non confirmée', e)
    res.status(503).json({ message: 'Confirmation indisponible. Relisez les réservations avant de réessayer.' })
  }
}
async function check(tx: Prisma.TransactionClient, companyId: string, row: any) {
  if (row.tableId && !await tx.table.findFirst({ where: { id: row.tableId, companyId, isActive: true } })) throw new PosError('Table introuvable dans cet établissement.', 404)
  if (row.customerId && !await tx.customer.findFirst({ where: { id: row.customerId, companyId } })) throw new PosError('Client introuvable dans cet établissement.', 404)
  if (row.tableId && active.includes(row.status || 'PENDING')) {
    const conflict = await tx.reservation.findFirst({ where: { companyId, tableId: row.tableId, ...(row.id ? { id: { not: row.id } } : {}), status: { in: active },
      date: { gte: new Date(row.date.getTime() - 90 * 60000), lte: new Date(row.date.getTime() + 90 * 60000) } } })
    if (conflict) throw new PosError('Cette table est déjà réservée à cet horaire (marge de 90 minutes). Choisissez une autre table ou un autre créneau.', 409)
  }
}
router.get('/', wrap(async (req, res) => {
  const filter = z.object({ date: z.string().date().optional(), status: z.enum(['PENDING', 'CONFIRMED', 'CANCELLED', 'SEATED', 'NO_SHOW']).optional(), tableId: z.string().optional() }).parse(req.query)
  const day = filter.date ? (await prisma.$queryRaw<Array<{ start: Date; end: Date }>>`SELECT ${filter.date}::date::timestamp AT TIME ZONE 'Europe/Luxembourg' AS "start", (${filter.date}::date + 1)::timestamp AT TIME ZONE 'Europe/Luxembourg' AS "end"`)[0] : null
  const rows = await prisma.reservation.findMany({ where: { companyId: req.companyId, ...(filter.status ? { status: filter.status } : {}), ...(filter.tableId ? { tableId: filter.tableId } : {}),
    ...(day ? { date: { gte: day.start, lt: day.end } } : {}) }, include: { table: true }, orderBy: { date: 'asc' } })
  // Les relations anciennes ne sont pas réécrites. Une relation incohérente ne divulgue pas sa société.
  res.json(rows.map(r => r.table && r.table.companyId !== req.companyId ? { ...r, table: null, linkWarning: 'Relation de table historique à vérifier par un responsable.' } : r))
}))
router.use(requireCapabilities('service.manage'))
router.post('/', wrap(async (req, res) => {
  const input = fields.parse(req.body)
  const result = await prisma.$transaction(async tx => {
    await lockFinancialCompany(tx, req.companyId)
    await assertTransactionCapabilities(tx, req, 'service.manage')
    await check(tx, req.companyId, input)
    return tx.reservation.create({ data: { ...input, companyId: req.companyId, guestPhone: input.guestPhone || null, guestEmail: input.guestEmail || null, partySize: input.partySize || 2 }, include: { table: true } })
  }, { maxWait: 15000, timeout: 20000 })
  res.status(201).json(result)
}))
router.put('/:id', wrap(async (req, res) => {
  const input = fields.partial().parse(req.body)
  const result = await prisma.$transaction(async tx => {
    await lockFinancialCompany(tx, req.companyId)
    await assertTransactionCapabilities(tx, req, 'service.manage')
    const row = await tx.reservation.findFirst({ where: { id: req.params.id, companyId: req.companyId } })
    if (!row) throw new PosError('Réservation non trouvée.', 404)
    await check(tx, req.companyId, { ...row, ...input })
    return tx.reservation.update({ where: { id: row.id }, data: input, include: { table: true } })
  }, { maxWait: 15000, timeout: 20000 })
  res.json(result)
}))
router.put('/:id/status', wrap(async (req, res) => {
  const input = z.object({ status: z.enum(['PENDING', 'CONFIRMED', 'CANCELLED', 'SEATED', 'NO_SHOW']) }).strict().parse(req.body)
  const result = await prisma.$transaction(async tx => {
    await lockFinancialCompany(tx, req.companyId)
    await assertTransactionCapabilities(tx, req, 'service.manage')
    const row = await tx.reservation.findFirst({ where: { id: req.params.id, companyId: req.companyId } })
    if (!row) throw new PosError('Réservation non trouvée.', 404)
    await check(tx, req.companyId, { ...row, ...input })
    return tx.reservation.update({ where: { id: row.id }, data: input })
  }, { maxWait: 15000, timeout: 20000 })
  res.json(result)
}))
router.delete('/:id', wrap(async (req, res) => {
  await prisma.$transaction(async tx => {
    await lockFinancialCompany(tx, req.companyId)
    await assertTransactionCapabilities(tx, req, 'service.manage')
    if (!await tx.reservation.findFirst({ where: { id: req.params.id, companyId: req.companyId } })) throw new PosError('Réservation non trouvée.', 404)
    await tx.reservation.delete({ where: { id: req.params.id } })
  })
  res.json({ message: 'Réservation supprimée' })
}))
export default router
