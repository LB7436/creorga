import { Router, type Request, type Response } from 'express'
import { z } from 'zod'
import prisma from '../lib/prisma'
import { deviceOrUserAuth } from '../middleware/deviceAuth'
import { requireCompany, requireRole } from '../middleware/requireCompany'
import { guestTables, resolveGuestTable } from '../lib/guest-tables'
import { GuestAccessError, GUEST_VISIT_HOURS, issueGuestAccess, lockGuestTable } from '../lib/guest-visits'
import { lockOrderPayment, activePaymentExists } from '../lib/payments/ledger'
import { lockFinancialCompany } from '../lib/financial-lock'
import { shareBalance } from '../lib/financial-allocations'

const router = Router()
router.use(deviceOrUserAuth, requireCompany)
router.use(requireRole('OWNER', 'MANAGER', 'EMPLOYEE', 'WAITER', 'CASHIER'))
router.use((_req, res, next) => { res.set('Cache-Control', 'no-store'); next() })
const company = (req: Request): string => (req as Request & { companyId: string }).companyId
const actor = (req: Request): string => (req as Request & { user?: { userId: string } }).user?.userId || 'registered-device'
const run = (fn: (req: Request, res: Response) => Promise<unknown>) => async (req: Request, res: Response) => {
  try { await fn(req, res) } catch (error) {
    const status = error instanceof GuestAccessError ? error.status : error instanceof z.ZodError ? 400 : 503
    res.status(status).json({ error: error instanceof GuestAccessError ? error.message : status === 400 ? 'Demande de visite invalide.' : 'Visite non confirmée. Réessayez après vérification.' })
  }
}
router.get('/', run(async (req, res) => {
  const companyId = company(req)
  const [tables, visits] = await Promise.all([guestTables(companyId), prisma.guestVisit.findMany({ where: { companyId, closedAt: null }, select: { id: true, tableId: true, openedAt: true, expiresAt: true, serviceShares: { select: { label: true } }, orders: { select: { orderNumber: true }, take: 100, orderBy: { orderNumber: 'asc' } } } })])
  res.json({ tables, visits })
}))
router.post('/', run(async (req, res) => {
  const companyId = company(req)
  const input = z.object({ tableId: z.string().min(1).max(100) }).parse(req.body)
  const tableId = await resolveGuestTable(companyId, input.tableId)
  if (!tableId) throw new GuestAccessError(404, 'Table inconnue du plan de salle.')
  const visit = await prisma.$transaction(async tx => {
    await lockFinancialCompany(tx, companyId)
    await lockGuestTable(tx, companyId, tableId)
    const now = new Date()
    await tx.guestVisit.updateMany({ where: { companyId, tableId, closedAt: null, expiresAt: { lte: now } }, data: { closedAt: now, closedBy: 'server-expiration', closeReason: 'Durée maximale atteinte. Aucun paiement déclaré.' } })
    if (await tx.guestVisit.findFirst({ where: { companyId, tableId, closedAt: null } })) throw new GuestAccessError(409, 'Une visite existe déjà. Affichez son QR ou terminez-la avant un nouveau groupe.')
    return tx.guestVisit.create({ data: { companyId, tableId, openedBy: actor(req), openedAt: now, expiresAt: new Date(now.getTime() + GUEST_VISIT_HOURS * 3600_000) } })
  })
  res.status(201).json(visit)
}))
router.post('/:id/link', run(async (req, res) => {
  const companyId = company(req)
  const result = await prisma.$transaction(async tx => {
    await lockFinancialCompany(tx, companyId)
    const visit = await tx.guestVisit.findFirst({ where: { id: req.params.id, companyId } })
    if (!visit) throw new GuestAccessError(404, 'Visite introuvable.')
    await lockGuestTable(tx, companyId, visit.tableId)
    const current = await tx.guestVisit.findFirst({ where: { id: visit.id, companyId, closedAt: null, expiresAt: { gt: new Date() } } })
    if (!current) throw new GuestAccessError(409, 'Visite fermée ou expirée : ouvrez une nouvelle visite.')
    if (!await resolveGuestTable(companyId, visit.tableId)) throw new GuestAccessError(409, 'Cette table ne figure plus dans le plan.')
    return { visitId: current.id, tableId: current.tableId, expiresAt: current.expiresAt, token: await issueGuestAccess(tx, current) }
  })
  res.json(result)
}))
router.post('/:id/close', run(async (req, res) => {
  const input = z.object({ reason: z.string().trim().min(3).max(300), acknowledgeOutstanding: z.boolean().default(false) }).parse(req.body)
  const companyId = company(req)
  const result = await prisma.$transaction(async tx => {
    await lockFinancialCompany(tx, companyId)
    const visit = await tx.guestVisit.findFirst({ where: { id: req.params.id, companyId } })
    if (!visit) throw new GuestAccessError(404, 'Visite introuvable.')
    await lockGuestTable(tx, companyId, visit.tableId)
    const orders = await tx.order.findMany({ where: { companyId, guestVisitId: visit.id }, orderBy: { id: 'asc' } })
    const shares = await tx.serviceShare.findMany({ where: { companyId, visitId: visit.id }, include: { tenders: true } })
    const orderIds = [...new Set([...orders.map(o => o.id), ...shares.map(s => s.orderId)])].sort()
    for (const orderId of orderIds) await lockOrderPayment(tx, companyId, orderId)
    const unsettled = await tx.order.count({ where: { companyId, guestVisitId: visit.id, serviceAllocation: null, paidAt: null, status: { notIn: ['PAID', 'CANCELLED'] }, total: { gt: 0 } } }) + shares.filter(s => shareBalance(s).outstandingCents > 0).length
    const pending = await activePaymentExists(tx, companyId, orderIds)
    if ((unsettled || pending) && !input.acknowledgeOutstanding) throw new GuestAccessError(409, 'Addition impayée ou paiement en cours. Confirmez explicitement la conservation de cette créance avant de fermer les accès.')
    await tx.guestVisit.updateMany({ where: { id: visit.id, companyId, closedAt: null }, data: { closedAt: new Date(), closedBy: actor(req), closeReason: input.reason } })
    return { closed: true, outstandingOrders: unsettled, pendingPayment: pending }
  }, { maxWait: 15000, timeout: 10000 })
  res.json(result)
}))
export default router
