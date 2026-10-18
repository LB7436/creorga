import { createTrackedRouter as Router } from '../lib/tracked-router'
import { z } from 'zod'
import prisma from '../lib/prisma'
import { assertTransactionCapabilities, BusinessPermissionError, requireCapabilities } from '../lib/business-permission-transaction'
import { hasCapability } from '../lib/business-permissions'
import { importStatement, validatePayout, refreshPayout, payoutDto, payoutImportEnabled } from '../lib/bank-payouts'
import { PaymentError } from '../lib/payments/ledger'
const router = Router()
const run = (fn: (req: any, res: any) => Promise<any>) => async (req: any, res: any) => {
  try { res.set('Cache-Control', 'private, no-store'); await fn(req, res) }
  catch (e: any) { res.status(e instanceof PaymentError || e instanceof BusinessPermissionError ? e.status : e instanceof z.ZodError ? 400 : e?.code === 'P2002' ? 409 : 503).json({ error: e instanceof PaymentError || e instanceof BusinessPermissionError ? e.message : e instanceof z.ZodError ? 'Relevé fictif invalide.' : 'Import ou rapprochement non confirmé : vérifiez les références et doublons avant de reprendre.' }) }
}
async function mutationResponse(result: any, req: any) {
  // Le service relit finance.manage sous son verrou. La réponse doit aussi
  // utiliser les droits de lecture actuels, pas l'ancienne adhésion HTTP.
  await prisma.$transaction(tx => assertTransactionCapabilities(tx, req, 'finance.manage'))
  return hasCapability(req, 'finance.revenue.read') ? result
    : { id: result.id, status: result.status, confirmation: result.confirmation, source: 'FICTIONAL_DECLARATION', financialDetailsRestricted: true }
}
router.get('/payouts', requireCapabilities('finance.revenue.read'), run(async (req, res) => {
  const result = await prisma.$transaction(async tx => {
    await assertTransactionCapabilities(tx, req, 'finance.revenue.read')
    const rows = await tx.bankPayout.findMany({ where: { companyId: req.companyId }, orderBy: { createdAt: 'desc' }, take: 201 })
    if (rows.length > 200) throw new PaymentError(409, 'Plus de 200 versements : pagination qualifiée nécessaire, aucun résultat tronqué.')
    return Promise.all(rows.map(r => payoutDto(tx, r)))
  }, { isolationLevel: 'RepeatableRead', timeout: 20000 })
  res.json({ importEnabled: payoutImportEnabled(), source: 'FICTIONAL_DECLARATION', payouts: result })
}))
router.post('/payout-statements', requireCapabilities('finance.manage'), run(async (req, res) => {
  const result = await importStatement(req.companyId, req.user.userId, req.body)
  res.status(result.created ? 201 : 200).json(await mutationResponse(result.statement, req))
}))
router.post('/payouts/:id/validate', requireCapabilities('finance.manage'), run(async (req, res) => res.json(await mutationResponse(await validatePayout(req.companyId, req.user.userId, req.params.id, req.body), req))))
router.post('/payouts/:id/refresh', requireCapabilities('finance.manage'), run(async (req, res) => res.json(await mutationResponse(await refreshPayout(req.companyId, req.user.userId, req.params.id, req.body), req))))
router.get('/payouts/:id/history', requireCapabilities('finance.revenue.read'), run(async (req, res) => {
  const rows = await prisma.$transaction(async tx => {
    await assertTransactionCapabilities(tx, req, 'finance.revenue.read')
    if (!await tx.bankPayout.findFirst({ where: { companyId: req.companyId, id: req.params.id }, select: { id: true } })) throw new PaymentError(404, 'Versement introuvable dans cette société.')
    const events = await tx.payoutDecision.findMany({ where: { companyId: req.companyId, payoutId: req.params.id }, orderBy: [{ createdAt: 'asc' }, { id: 'asc' }], take: 1001,
      select: { id: true, actorId: true, snapshot: true, createdAt: true } })
    if (events.length > 1000) throw new PaymentError(409, 'Historique trop large : pagination nécessaire. Aucune preuve tronquée.')
    return events
  })
  res.json(rows)
}))
export default router
