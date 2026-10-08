import { Router } from 'express'
import { z } from 'zod'
import { requireCompany } from '../middleware/requireCompany'
import { SUPPORTED_PROVIDERS } from '../lib/payments/gateway'
import { createPayment, findAttempt, merchantFor, PaymentError } from '../lib/payments/ledger'

const router = Router()
// Pas de repli anonyme ou administrateur sans base pour des opérations financières.
router.use((req: any, res, next) => {
  if ((!req.user?.userId || req.user.userId === 'fallback-admin') && !req.device?.companyId) return void res.status(401).json({ error: 'Identité de caisse ou utilisateur requise.' })
  next()
})
router.use(requireCompany)
const wrap = (fn: (req: any, res: any) => Promise<any>) => async (req: any, res: any) => {
  try { await fn(req, res) } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: 'Demande de paiement invalide.' })
    if (error instanceof PaymentError) return res.status(error.status).json({ error: error.message })
    return res.status(503).json({ error: 'Résultat non confirmé. Conservez la référence et vérifiez avant de recommencer.' })
  }
}

/** GET /api/payments/providers → list of enabled providers */
router.get('/providers', (req: any, res) => {
  res.json({ providers: SUPPORTED_PROVIDERS.map(provider => {
    try { merchantFor(provider, req.companyId); return { provider, enabled: true, verification: provider === 'sumup' ? 'manual' : 'qualification_required' } }
    catch { return { provider, enabled: false, verification: 'not_configured' } }
  }) })
})

/** POST /api/payments/charge */
router.post('/charge', wrap(async (req, res) => {
  const result = await createPayment(req.companyId, req.user?.userId || null, req.body)
  res.status(result.httpStatus).json(result.body)
}))

/** GET /api/payments/verify/:provider/:id */
router.get('/verify/:provider/:id', wrap(async (req, res) => {
  await findAttempt(req.companyId, req.params.provider, req.params.id)
  throw new PaymentError(409, 'Une preuve de capture complète est requise : la redirection ne confirme pas un encaissement.')
}))

export default router
