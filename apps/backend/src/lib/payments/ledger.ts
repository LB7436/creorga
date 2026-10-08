import { createHash } from 'node:crypto'
import { z } from 'zod'
import prisma from '../prisma'
import { charge, SUPPORTED_PROVIDERS, type PaymentProvider } from './gateway'

export class PaymentError extends Error {
  constructor(public status: number, message: string) { super(message) }
}
export const ACTIVE_PAYMENT_STATES = ['CREATING', 'PENDING', 'AWAITING_TERMINAL', 'UNKNOWN', 'REVIEW', 'AUTHORIZED']
export const lockOrderPayment = (tx: any, companyId: string, orderId: string) => tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${companyId}), hashtext(${`order-payment:${orderId}`}))::text`
export const amountInCents = (value: number) => {
  if (!Number.isFinite(value) || value < 0 || value > 10_000_000) throw new PaymentError(400, 'Montant monétaire invalide.')
  return Math.round((value + Number.EPSILON) * 100)
}
const inputSchema = z.object({
  requestId: z.string().uuid(), provider: z.string().refine(p => SUPPORTED_PROVIDERS.includes(p as PaymentProvider)), orderId: z.string().min(1).max(100),
  amount: z.number().finite().positive().max(10_000_000).optional(), currency: z.enum(['EUR', 'USD']).optional(),
  returnUrl: z.string().url().max(2000).optional(), cancelUrl: z.string().url().max(2000).optional(),
  terminalId: z.string().max(100).optional(), description: z.string().max(500).optional(), customerEmail: z.string().email().optional(),
}).strict()

function returnUrl(value: string | undefined, fallback: string) {
  const allowed = new URL(process.env.FRONTEND_URL || 'http://localhost:5174')
  const url = new URL(value || new URL(fallback, allowed).href)
  if (url.origin !== allowed.origin || url.username || url.password) throw new PaymentError(400, 'URL de retour non autorisée.')
  return url.href
}
export function merchantFor(provider: string, companyId: string): string {
  // Les clés globales historiques ne deviennent pas le compte de tous les restaurateurs.
  if (provider === 'sumup') return `manual-terminal:${companyId}`
  if (process.env.PAYMENT_MERCHANT_COMPANY_ID !== companyId) throw new PaymentError(503, 'Compte marchand de cet établissement non configuré.')
  const id = process.env[`${provider.toUpperCase()}_MERCHANT_ID`]
  if (!id) throw new PaymentError(503, 'Identifiant marchand vérifiable requis.')
  return id
}
function publicAttempt(attempt: any) {
  const cached = attempt.response || {}
  return { ok: !['FAILED', 'REVIEW'].includes(attempt.status), attemptId: attempt.id, provider: attempt.provider,
    transactionId: attempt.externalId || undefined, status: attempt.status.toLowerCase(), amount: attempt.amountCents / 100, currency: attempt.currency,
    redirectUrl: cached.redirectUrl, qrPayload: cached.qrPayload,
    confirmation: attempt.provider === 'sumup' ? 'manual_terminal_required' : 'provider_not_confirmed' }
}
export async function createPayment(companyId: string, userId: string | null, raw: unknown) {
  const input = inputSchema.parse(raw)
  const successUrl = returnUrl(input.returnUrl, '/pos?payment=return'), cancelUrl = returnUrl(input.cancelUrl, '/pos?payment=cancel')
  if (input.terminalId && input.terminalId !== process.env.PAYMENT_TERMINAL_ID) throw new PaymentError(400, 'Terminal non configuré pour cet établissement.')
  const requestHash = createHash('sha256').update(JSON.stringify(input)).digest('hex')
  const reservation = await prisma.$transaction(async tx => {
    await lockOrderPayment(tx, companyId, input.orderId)
    const existing = await tx.paymentAttempt.findUnique({ where: { companyId_requestId: { companyId, requestId: input.requestId } } })
    if (existing) {
      if (existing.requestHash !== requestHash || existing.userId !== userId) throw new PaymentError(409, 'Référence réutilisée avec une autre demande.')
      return { attempt: existing, created: false }
    }
    const order = await tx.order.findFirst({ where: { id: input.orderId, companyId }, include: { company: true } })
    if (!order) throw new PaymentError(404, 'Commande introuvable.')
    if (order.paidAt || ['PAID', 'CANCELLED'].includes(order.status)) throw new PaymentError(409, 'Commande déjà réglée ou annulée.')
    const currency = order.company.currency
    if (!['EUR', 'USD'].includes(currency) || (input.currency && input.currency !== currency)) throw new PaymentError(400, 'Devise incompatible avec la commande.')
    const amountCents = amountInCents(order.total)
    if (!amountCents) throw new PaymentError(409, 'Aucun solde à encaisser.')
    if (input.amount !== undefined && (amountInCents(input.amount) !== amountCents || Math.abs(input.amount - amountCents / 100) > 1e-9)) throw new PaymentError(409, 'Le montant a changé. Rechargez le solde serveur.')
    if (await tx.paymentAttempt.count({ where: { companyId, orderId: order.id, status: { in: ACTIVE_PAYMENT_STATES } } })) throw new PaymentError(409, 'Une tentative existe déjà : vérifier son résultat avant un nouveau règlement.')
    const attempt = await tx.paymentAttempt.create({ data: { companyId, userId, orderId: order.id, requestId: input.requestId, requestHash,
      provider: input.provider, merchantId: merchantFor(input.provider, companyId), amountCents, currency } })
    return { attempt, created: true }
  })
  if (!reservation.created) return { httpStatus: reservation.attempt.status === 'CREATING' ? 202 : 200, body: publicAttempt(reservation.attempt) }
  const attempt = reservation.attempt
  try {
    const result = await charge({ provider: attempt.provider as PaymentProvider, orderId: attempt.orderId, amount: attempt.amountCents / 100,
      currency: attempt.currency as 'EUR' | 'USD', description: `Commande ${attempt.orderId}`, returnUrl: successUrl, cancelUrl: cancelUrl,
      terminalId: process.env.PAYMENT_TERMINAL_ID, metadata: { companyId, attemptId: attempt.id, orderId: attempt.orderId }, requestId: attempt.createRequestId })
    // La création d'un checkout n'est jamais une capture. Seule la vérification dédiée confirmera.
    const status = result.status === 'awaiting_terminal' ? 'AWAITING_TERMINAL' : result.status === 'pending' ? 'PENDING' : 'UNKNOWN'
    const saved = await prisma.paymentAttempt.update({ where: { id: attempt.id }, data: { status, externalId: result.transactionId,
      response: { redirectUrl: result.redirectUrl, qrPayload: result.qrPayload } as any } })
    return { httpStatus: status === 'UNKNOWN' ? 202 : 200, body: publicAttempt(saved) }
  } catch {
    // Timeout, erreur fournisseur ou réponse ambiguë : le solde reste réservé.
    const saved = await prisma.paymentAttempt.update({ where: { id: attempt.id }, data: { status: 'UNKNOWN' } })
    return { httpStatus: 202, body: publicAttempt(saved) }
  }
}
export async function findAttempt(companyId: string, provider: string, externalId: string) {
  const attempt = await prisma.paymentAttempt.findFirst({ where: { companyId, provider, externalId } })
  if (!attempt) throw new PaymentError(404, 'Tentative introuvable dans cet établissement.')
  return attempt
}
