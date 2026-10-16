import { Router } from 'express'
import { z } from 'zod'
import prisma from '../lib/prisma'
import { requireRole } from '../middleware/requireCompany'
import { importStatement, validatePayout, refreshPayout, payoutDto, payoutImportEnabled } from '../lib/bank-payouts'
import { PaymentError } from '../lib/payments/ledger'
const router = Router()
const run = (fn: (req: any, res: any) => Promise<any>) => async (req: any, res: any) => {
  try { res.set('Cache-Control', 'private, no-store'); await fn(req, res) }
  catch (e: any) { res.status(e instanceof PaymentError ? e.status : e instanceof z.ZodError ? 400 : e?.code === 'P2002' ? 409 : 503).json({ error: e instanceof PaymentError ? e.message : e instanceof z.ZodError ? 'Relevé fictif invalide.' : 'Import ou rapprochement non confirmé : vérifiez les références et doublons avant de reprendre.' }) }
}
router.get('/payouts', requireRole('OWNER', 'MANAGER'), run(async (req, res) => {
  const result = await prisma.$transaction(async tx => {
    const rows = await tx.bankPayout.findMany({ where: { companyId: req.companyId }, orderBy: { createdAt: 'desc' }, take: 201 })
    if (rows.length > 200) throw new PaymentError(409, 'Plus de 200 versements : pagination qualifiée nécessaire, aucun résultat tronqué.')
    return Promise.all(rows.map(r => payoutDto(tx, r)))
  }, { isolationLevel: 'RepeatableRead', timeout: 20000 })
  res.json({ importEnabled: payoutImportEnabled(), source: 'FICTIONAL_DECLARATION', payouts: result })
}))
router.post('/payout-statements', requireRole('OWNER', 'MANAGER'), run(async (req, res) => {
  const result = await importStatement(req.companyId, req.user.userId, req.body)
  res.status(result.created ? 201 : 200).json(result.statement)
}))
router.post('/payouts/:id/validate', requireRole('OWNER', 'MANAGER'), run(async (req, res) => res.json(await validatePayout(req.companyId, req.user.userId, req.params.id, req.body))))
router.post('/payouts/:id/refresh', requireRole('OWNER', 'MANAGER'), run(async (req, res) => res.json(await refreshPayout(req.companyId, req.user.userId, req.params.id, req.body))))
router.get('/payouts/:id/history', requireRole('OWNER', 'MANAGER'), run(async (req, res) => {
  if (!await prisma.bankPayout.findFirst({ where: { companyId: req.companyId, id: req.params.id }, select: { id: true } })) throw new PaymentError(404, 'Versement introuvable dans cette société.')
  const rows = await prisma.payoutDecision.findMany({ where: { companyId: req.companyId, payoutId: req.params.id }, orderBy: [{ createdAt: 'asc' }, { id: 'asc' }], take: 1001,
    select: { id: true, actorId: true, snapshot: true, createdAt: true } })
  if (rows.length > 1000) throw new PaymentError(409, 'Historique trop large : pagination nécessaire. Aucune preuve tronquée.')
  res.json(rows)
}))
export default router
