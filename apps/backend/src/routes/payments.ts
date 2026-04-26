import { Router } from 'express'
import { charge, getGateway, SUPPORTED_PROVIDERS, type PaymentProvider, type ChargeRequest } from '../lib/payments/gateway'

const router = Router()

/** GET /api/payments/providers → list of enabled providers */
router.get('/providers', (_req, res) => {
  const enabled = SUPPORTED_PROVIDERS.map((p) => {
    const hasCreds = (() => {
      switch (p) {
        case 'stripe': return !!process.env.STRIPE_SECRET_KEY
        case 'sumup': return !!process.env.SUMUP_AFFILIATE_KEY || true // deep-link works without key
        case 'mypos': return !!process.env.MYPOS_SID && !!process.env.MYPOS_WALLET
        case 'viva': return !!process.env.VIVA_MERCHANT_ID && !!process.env.VIVA_API_KEY
        case 'worldline': return !!process.env.WORLDLINE_API_USER && !!process.env.WORLDLINE_CUSTOMER_ID
        case 'servipay': return !!process.env.SERVIPAY_MERCHANT_ID && !!process.env.SERVIPAY_API_KEY
        default: return false
      }
    })()
    return { provider: p, enabled: hasCreds }
  })
  res.json({ providers: enabled })
})

/** POST /api/payments/charge */
router.post('/charge', async (req, res) => {
  const body = req.body as ChargeRequest
  if (!body?.provider || !body?.amount || !body?.orderId) {
    return res.status(400).json({ error: 'provider, amount, orderId required' })
  }
  const result = await charge(body)
  res.status(result.ok ? 200 : 400).json(result)
})

/** GET /api/payments/verify/:provider/:id */
router.get('/verify/:provider/:id', async (req, res) => {
  const gw = getGateway(req.params.provider as PaymentProvider)
  if (!gw?.verify) return res.status(400).json({ error: 'verification not supported' })
  const result = await gw.verify(req.params.id)
  res.json(result)
})

export default router
