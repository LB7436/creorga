import { type Request, type Response } from 'express'
import { createTrackedRouter as Router } from '../lib/tracked-router'
import { createHash } from 'node:crypto'
import { z } from 'zod'
import { requireCompany } from '../middleware/requireCompany'
import { requireCapabilities, BusinessPermissionError } from '../lib/business-permission-transaction'
import { SUPPORTED_PROVIDERS } from '../lib/payments/gateway'
import { createPayment, findAttempt, merchantFor, publicAttempt, reconcilePayment, PaymentError } from '../lib/payments/ledger'
import prisma from '../lib/prisma'
import { PayPalClient } from '../lib/payments/paypal'
import logger from '../lib/logger'
import Stripe from 'stripe'
import { requestRefund, reconcileRefund, reviewRefund, refundDto, refundableOrderParts } from '../lib/payments/refunds'
import { declareManualRefund, manualRefundDto, manualRefundReceipt, ManualRefundNotRecordedError } from '../lib/payments/manual-refunds'

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
    if (error instanceof BusinessPermissionError) return res.status(403).json({ error: error.message })
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
  res.json(publicAttempt(await findAttempt(req.companyId, req.params.provider, req.params.id)))
}))
router.get('/attempts/:id', wrap(async (req, res) => {
  const attempt = await prisma.paymentAttempt.findFirst({ where: { id: req.params.id, companyId: req.companyId } })
  if (!attempt) throw new PaymentError(404, 'Tentative introuvable.')
  res.set('Cache-Control', 'private, no-store').json(publicAttempt(attempt))
}))
router.post('/attempts/:id/reconcile', wrap(async (req, res) => res.json(await reconcilePayment(req.companyId, req.params.id))))
router.post('/attempts/:id/capture', wrap(async (req, res) => res.json(await reconcilePayment(req.companyId, req.params.id, true))))
router.post('/refunds', requireCapabilities('refunds.declare'), wrap(async (req, res) => {
  const result = await requestRefund(req.companyId, req.user.userId, req.body)
  res.status(result.httpStatus).json(result.body)
}))
router.post('/manual-refunds', requireCapabilities('refunds.declare'), async (req: any, res) => {
  res.set('Cache-Control', 'private, no-store')
  try {
    const result = await declareManualRefund(req.companyId, req.user.userId, req.body)
    res.status(result.created ? 201 : 200).json(result.refund)
  } catch (error) {
    // Contrat local à cette déclaration : ne jamais élargir les refus PayPal.
    if (error instanceof ManualRefundNotRecordedError) return res.status(409).json({ error: error.message, ...error.proof })
    if (error instanceof BusinessPermissionError) return res.status(403).json({ error: error.message })
    if (error instanceof z.ZodError) return res.status(400).json({ error: 'Demande de paiement invalide.' })
    if (error instanceof PaymentError) return res.status(error.status).json({ error: error.message })
    return res.status(503).json({ error: 'Résultat non confirmé. Conservez la référence et vérifiez avant de recommencer.' })
  }
})
router.get('/manual-refunds', requireCapabilities('refunds.declare'), wrap(async (req, res) => {
  const where = { companyId: req.companyId, ...(typeof req.query.creditNoteId === 'string' ? { creditNoteId: req.query.creditNoteId } : {}) }
  res.set('Cache-Control', 'private, no-store').json((await prisma.manualRefund.findMany({ where, orderBy: { createdAt: 'desc' }, take: 200 })).map(manualRefundDto))
}))
router.get('/manual-refunds/:id/receipt', requireCapabilities('refunds.declare'), wrap(async (req, res) => {
  const refund = await prisma.manualRefund.findFirst({ where: { companyId: req.companyId, id: req.params.id } })
  if (!refund) throw new PaymentError(404, 'Déclaration introuvable.')
  res.set('Cache-Control', 'private, no-store').type('html').send(manualRefundReceipt(refund))
}))
router.get('/manual-tenders', requireCapabilities('refunds.declare'), wrap(async (req, res) => {
  const invoiceId = z.string().min(1).max(200).parse(req.query.invoiceId)
  const invoice = await prisma.invoice.findFirst({ where: { companyId: req.companyId, id: invoiceId }, include: { sourcePosSale: true } })
  if (!invoice) throw new PaymentError(404, 'Facture introuvable.')
  const orderIds: string[] = invoice.sourcePosSale ? (invoice.sourcePosSale.snapshot as any).orderIds || [] : [invoice.orderId].filter((id): id is string => !!id)
  const tenders = await prisma.orderTender.findMany({ where: { companyId: req.companyId, orderId: { in: orderIds }, method: { in: ['CASH', 'CARD'] }, confirmation: 'manual_declaration', settlementId: null }, include: { manualRefunds: true } })
  res.set('Cache-Control', 'private, no-store').json(tenders.map(t => ({ id: t.id, orderId: t.orderId, method: t.method, amountCents: t.amountCents,
    availableCents: t.amountCents - t.manualRefunds.reduce((n, r) => n + r.amountCents, 0) })))
}))
router.post('/refunds/:id/reconcile', requireCapabilities('refunds.declare'), wrap(async (req, res) => res.json(await reconcileRefund(req.companyId, req.params.id, req.user.userId))))
router.post('/refunds/:id/review', requireCapabilities('refunds.declare'), wrap(async (req, res) => res.json(await reviewRefund(req.companyId, req.user.userId, req.params.id, req.body))))
router.get('/refunds/:id/history', requireCapabilities('refunds.declare'), wrap(async (req, res) => {
  if (!await prisma.refundAttempt.findFirst({ where: { companyId: req.companyId, id: req.params.id }, select: { id: true } })) throw new PaymentError(404, 'Remboursement introuvable.')
  const rows = await prisma.refundReviewEvent.findMany({ where: { companyId: req.companyId, refundId: req.params.id }, orderBy: [{ createdAt: 'asc' }, { id: 'asc' }], take: 1001,
    select: { id: true, actorId: true, action: true, snapshot: true, createdAt: true } })
  if (rows.length > 1000) throw new PaymentError(409, 'Historique trop large : pagination nécessaire. Aucune preuve tronquée.')
  res.set('Cache-Control', 'private, no-store').json(rows)
}))
router.get('/refunds', requireCapabilities('refunds.declare'), wrap(async (req, res) => {
  const where = { companyId: req.companyId, ...(typeof req.query.creditNoteId === 'string' ? { creditNoteId: req.query.creditNoteId } : {}) }
  res.set('Cache-Control', 'private, no-store').json((await prisma.refundAttempt.findMany({ where, orderBy: { createdAt: 'desc' }, take: 200 })).map(refundDto))
}))
router.get('/settlements', requireCapabilities('finance.revenue.read'), wrap(async (req, res) => {
  const { invoiceId } = z.object({ invoiceId: z.string().min(1).max(200) }).parse(req.query)
  const invoice = await prisma.invoice.findFirst({ where: { companyId: req.companyId, id: invoiceId }, include: { sourcePosSale: true } })
  if (!invoice) throw new PaymentError(404, 'Facture introuvable.')
  const sourceOrders: string[] = invoice.sourcePosSale ? (invoice.sourcePosSale.snapshot as any).orderIds || [] : [invoice.orderId].filter((id): id is string => !!id)
  const settlements = await prisma.paymentSettlement.findMany({ where: { companyId: req.companyId, OR: [{ orderId: { in: sourceOrders } }, { allocations: { some: { orderId: { in: sourceOrders } } } }] }, include: { refunds: true, allocations: true } })
  const result = await Promise.all(settlements.map(async s => {
    let available = false
    try { available = s.provider === 'paypal' && merchantFor(s.provider, req.companyId) === s.merchantId } catch {}
    let availableCents = 0
    try { availableCents = (await refundableOrderParts(prisma, req.companyId, s, sourceOrders)).reduce((sum: number, p: any) => sum + Math.max(0, p.amountCents), 0) } catch { available = false }
    return { id: s.id, provider: s.provider, currency: s.currency, amountCents: s.amountCents,
      availableCents, refundEnabled: available }
  }))
  res.set('Cache-Control', 'private, no-store').json(result)
}))

function canonical(value: any): any {
  if (Array.isArray(value)) return value.map(canonical)
  if (value && typeof value === 'object') return Object.fromEntries(Object.keys(value).sort().map(key => [key, canonical(value[key])]))
  return value
}
/** Signature vérifiée auprès de PayPal, puis relecture de la capture : jamais confiance au montant du webhook. */
export async function paypalWebhook(req: Request, res: Response) {
  try {
    const companyId = process.env.PAYMENT_MERCHANT_COMPANY_ID || ''
    merchantFor('paypal', companyId)
    if (!await new PayPalClient().verifyWebhook(req.headers, req.body)) return res.status(401).json({ error: 'Notification PayPal non vérifiée.' })
    const event = z.object({ id: z.string().min(1).max(200), event_type: z.string().min(1).max(200), resource: z.record(z.unknown()) }).parse(req.body)
    const payloadHash = createHash('sha256').update(JSON.stringify(canonical(req.body))).digest('hex')
    const externalOrderId = (event.resource.supplementary_data as any)?.related_ids?.order_id
    const key = { companyId, provider: 'paypal', eventId: event.id }
    const receipt = await prisma.paymentWebhook.upsert({ where: { companyId_provider_eventId: key }, update: {}, create: {
      ...key, id: createHash('sha256').update(JSON.stringify(key)).digest('hex'), eventType: event.event_type, payloadHash, status: 'VERIFIED_UNMATCHED',
      externalOrderId: typeof externalOrderId === 'string' ? externalOrderId.slice(0, 200) : null,
    } })
    if (receipt.payloadHash !== payloadHash) return res.status(409).json({ error: 'Identifiant de notification réutilisé avec un autre contenu.' })
    if (receipt.status === 'PROCESSED') return res.json({ ok: true, duplicate: true })
    if (event.event_type !== 'PAYMENT.CAPTURE.COMPLETED') {
      await prisma.paymentWebhook.update({ where: { id: receipt.id }, data: { status: 'REVIEW' } })
      return res.json({ ok: true, reviewRequired: true })
    }
    const attempt = typeof externalOrderId === 'string' ? await prisma.paymentAttempt.findFirst({ where: { companyId, provider: 'paypal', externalId: externalOrderId } }) : null
    if (!attempt) {
      await prisma.paymentWebhook.update({ where: { id: receipt.id }, data: { status: 'VERIFIED_UNMATCHED' } })
      return res.status(202).json({ ok: true, pendingReconciliation: true })
    }
    const payment = await reconcilePayment(companyId, attempt.id)
    if (payment.status !== 'succeeded') return res.status(503).json({ error: 'Capture non confirmée, notification conservée pour reprise.' })
    await prisma.paymentWebhook.update({ where: { id: receipt.id }, data: { status: 'PROCESSED', processedAt: new Date() } })
    return res.json({ ok: true })
  } catch (error) {
    if (error instanceof z.ZodError) return res.status(400).json({ error: 'Notification invalide.' })
    if (error instanceof PaymentError) return res.status(error.status).json({ error: error.message })
    return res.status(503).json({ error: 'Notification non rapprochée. Reprise nécessaire.' })
  }
}

/** Hors authentification et AVANT express.json : signature sur les octets d'origine.
 * Secret et compte distincts des abonnements SaaS CréOrga.
 */
export async function stripePaymentWebhook(req: Request, res: Response) {
  const companyId = process.env.PAYMENT_MERCHANT_COMPANY_ID || ''
  try {
    merchantFor('stripe', companyId)
    const secret = process.env.STRIPE_PAYMENT_WEBHOOK_SECRET
    if (!secret) throw new PaymentError(503, 'Webhook d’encaissement Stripe non configuré.')
    const signature = req.get('stripe-signature')
    if (!signature || !Buffer.isBuffer(req.body)) return res.status(401).json({ error: 'Notification Stripe non vérifiée.' })
    const client = new Stripe(process.env.STRIPE_PAYMENT_KEY!, { apiVersion: '2026-09-30.endive' })
    let event: Stripe.Event
    try { event = client.webhooks.constructEvent(req.body, signature, secret) }
    catch { return res.status(401).json({ error: 'Signature Stripe invalide.' }) }
    if (event.account && event.account !== process.env.STRIPE_MERCHANT_ID) return res.status(403).json({ error: 'Notification d’un autre compte marchand.' })
    const object = event.data.object as any
    const key = { companyId, provider: 'stripe', eventId: event.id }
    const payloadHash = createHash('sha256').update(JSON.stringify(canonical(event))).digest('hex')
    const receipt = await prisma.paymentWebhook.upsert({ where: { companyId_provider_eventId: key }, update: {}, create: {
      ...key, id: createHash('sha256').update(JSON.stringify(key)).digest('hex'), eventType: event.type, payloadHash, status: 'VERIFIED_UNMATCHED',
      externalOrderId: typeof object.id === 'string' ? object.id.slice(0, 200) : null,
    } })
    if (receipt.payloadHash !== payloadHash) return res.status(409).json({ error: 'Identifiant de notification réutilisé.' })
    if (receipt.status === 'PROCESSED') return res.json({ ok: true, duplicate: true })
    if (!['checkout.session.completed', 'checkout.session.async_payment_succeeded'].includes(event.type)) {
      await prisma.paymentWebhook.update({ where: { id: receipt.id }, data: { status: 'REVIEW' } })
      return res.json({ ok: true, reviewRequired: true })
    }
    const attempt = typeof object.id === 'string' ? await prisma.paymentAttempt.findFirst({ where: { companyId, provider: 'stripe', externalId: object.id } }) : null
    if (!attempt) return res.status(202).json({ ok: true, pendingReconciliation: true })
    const payment = await reconcilePayment(companyId, attempt.id)
    if (payment.status !== 'succeeded') return res.status(503).json({ error: 'Capture non confirmée. Notification conservée pour reprise.' })
    await prisma.paymentWebhook.update({ where: { id: receipt.id }, data: { status: 'PROCESSED', processedAt: new Date() } })
    return res.json({ ok: true })
  } catch (error) {
    return res.status(error instanceof PaymentError ? error.status : 503).json({ error: error instanceof PaymentError ? error.message : 'Notification non rapprochée. Reprise nécessaire.' })
  }
}

/** Reprise des notifications vérifiées reçues avant l'enregistrement de la référence externe. */
export async function processPendingPaymentWebhooks() {
  const companyId = process.env.PAYMENT_MERCHANT_COMPANY_ID
  if (!companyId) return
  const receipts = await prisma.paymentWebhook.findMany({ where: { companyId, provider: { in: ['paypal', 'stripe'] }, status: 'VERIFIED_UNMATCHED', externalOrderId: { not: null } }, take: 50 })
  for (const receipt of receipts) {
    const attempt = await prisma.paymentAttempt.findFirst({ where: { companyId, provider: receipt.provider, externalId: receipt.externalOrderId } })
    if (!attempt) continue
    try {
      const payment = await reconcilePayment(companyId, attempt.id)
      if (payment.status === 'succeeded') await prisma.paymentWebhook.update({ where: { id: receipt.id }, data: { status: 'PROCESSED', processedAt: new Date() } })
    } catch { logger.warn('[payments] notification conservée pour reprise', { eventId: receipt.eventId }) }
  }
}
export default router
