import { createHash } from 'node:crypto'
import { z } from 'zod'
import prisma from '../prisma'
import { lockFinancialCompany } from '../financial-lock'
import { getGateway, type PaymentProvider } from './gateway'
import { merchantFor, PaymentError } from './ledger'
import type { Prisma } from '@prisma/client'
import { allocateMinor } from '../money'

/** Les réservations incertaines ne sont jamais libérées par un simple timeout.
 * Un ancien remboursement sans affectations bloque la capture, sans inventer
 * rétrospectivement sa ventilation. */
export async function refundableOrderParts(tx: Prisma.TransactionClient, companyId: string, settlement: { id: string; orderId: string; amountCents: number; allocations: Array<{ orderId: string; amountCents: number }> }, sourceOrders: string[]) {
  const reserved = await tx.refundAttempt.findMany({ where: { companyId, settlementId: settlement.id }, include: { allocations: true } })
  if (reserved.some(r => !r.allocations.length || r.allocations.reduce((s, a) => s + a.amountCents, 0) !== r.amountCents)) throw new PaymentError(409, 'Ancien remboursement sans ventilation vérifiable : rapprochement manuel requis.')
  const original = settlement.allocations.length ? settlement.allocations : [{ orderId: settlement.orderId, amountCents: settlement.amountCents }]
  if (original.reduce((s, a) => s + a.amountCents, 0) !== settlement.amountCents) throw new PaymentError(409, 'Ventilation de capture non réconciliée.')
  return original.filter(a => sourceOrders.includes(a.orderId)).map(a => ({ orderId: a.orderId,
    amountCents: a.amountCents - reserved.flatMap(r => r.allocations).filter(r => r.orderId === a.orderId).reduce((s, r) => s + r.amountCents, 0) }))
}
export const refundDto = (r: any) => ({ id: r.id, creditNoteId: r.creditNoteId, settlementId: r.settlementId, amountCents: r.amountCents, currency: r.currency,
  provider: r.provider, externalId: r.externalId, status: r.status, confirmedAt: r.confirmedAt, createdAt: r.createdAt,
  confirmation: r.status === 'SUCCEEDED' ? 'provider_verified' : 'not_confirmed' })
export async function requestRefund(companyId: string, actorId: string, raw: unknown) {
  const input = z.object({ requestId: z.string().uuid(), creditNoteId: z.string().min(1).max(200), settlementId: z.string().min(1).max(200),
    amountCents: z.number().int().positive().max(1e9), reason: z.string().trim().min(5).max(500) }).strict().parse(raw)
  const requestHash = createHash('sha256').update(JSON.stringify({ companyId, actorId, ...input })).digest('hex')
  const result = await prisma.$transaction(async tx => {
    await lockFinancialCompany(tx, companyId)
    const previous = await tx.refundAttempt.findUnique({ where: { id: input.requestId } })
    if (previous) { if (previous.requestHash !== requestHash) throw new PaymentError(409, 'Référence de remboursement réutilisée.'); return { attempt: previous, created: false, externalOrderId: '' } }
    const credit = await tx.creditNote.findFirst({ where: { companyId, id: input.creditNoteId }, include: { invoice: { include: { sourcePosSale: true } } } })
    const settlement = await tx.paymentSettlement.findFirst({ where: { companyId, id: input.settlementId }, include: { attempt: true, allocations: true } })
    if (!credit || !settlement) throw new PaymentError(404, 'Avoir ou capture introuvable dans cette société.')
    const sourceOrders = credit.invoice.sourcePosSale ? (credit.invoice.sourcePosSale.snapshot as any).orderIds || [] : [credit.invoice.orderId].filter(Boolean)
    if (![settlement.orderId, ...settlement.allocations.map(a => a.orderId)].some(id => sourceOrders.includes(id))) throw new PaymentError(409, 'La capture ne règle pas la vente liée à cet avoir.')
    if (credit.currency !== settlement.currency || merchantFor(settlement.provider, companyId) !== settlement.merchantId || !settlement.attempt.externalId) throw new PaymentError(409, 'Devise, marchand ou référence de capture incompatible.')
    const gateway = getGateway(settlement.provider as PaymentProvider)
    if (!gateway?.startRefund || !gateway.verifyRefund) throw new PaymentError(501, 'Remboursement vérifiable non pris en charge par ce connecteur. Aucune opération lancée.')
    const [creditUsed, captureUsed] = await Promise.all([
      tx.refundAttempt.aggregate({ where: { companyId, creditNoteId: credit.id }, _sum: { amountCents: true } }),
      tx.refundAttempt.aggregate({ where: { companyId, settlementId: settlement.id }, _sum: { amountCents: true } }),
    ])
    if (input.amountCents > credit.totalCents - (creditUsed._sum.amountCents || 0) || input.amountCents > settlement.amountCents - (captureUsed._sum.amountCents || 0)) throw new PaymentError(409, 'Montant supérieur à l’avoir disponible ou à la capture restante, réservations incertaines incluses.')
    const parts = await refundableOrderParts(tx, companyId, settlement, sourceOrders)
    if (parts.some(p => p.amountCents < 0) || input.amountCents > parts.reduce((s, p) => s + p.amountCents, 0)) throw new PaymentError(409, 'Montant supérieur à la part réglée des ventes d’origine encore remboursable.')
    const allocations = allocateMinor(input.amountCents, parts.map(p => p.amountCents))
    const attempt = await tx.refundAttempt.create({ data: { id: input.requestId, companyId, creditNoteId: credit.id, settlementId: settlement.id, actorId,
      reason: input.reason, requestHash, provider: settlement.provider, merchantId: settlement.merchantId, captureId: settlement.captureId,
      amountCents: input.amountCents, currency: settlement.currency,
      allocations: { create: parts.flatMap((p, i) => allocations[i] ? [{ orderId: p.orderId, amountCents: allocations[i] }] : []) } } })
    return { attempt, created: true, externalOrderId: settlement.attempt.externalId }
  }, { maxWait: 15000, timeout: 10000 })
  if (!result.created) return { httpStatus: 200, body: refundDto(result.attempt) }
  let saved
  try {
    const gateway = getGateway(result.attempt.provider as PaymentProvider)
    const response = await gateway.startRefund!({ requestId: result.attempt.providerRequestId, captureId: result.attempt.captureId,
      externalOrderId: result.externalOrderId, amountCents: result.attempt.amountCents, currency: result.attempt.currency })
    if (!response.id || typeof response.id !== 'string' || response.id.length > 200) throw new Error('Référence de remboursement absente')
    saved = await prisma.refundAttempt.update({ where: { id: result.attempt.id }, data: { externalId: response.id } })
  } catch { saved = await prisma.refundAttempt.update({ where: { id: result.attempt.id }, data: { status: 'UNKNOWN' } }) }
  return { httpStatus: 202, body: refundDto(saved) }
}
const proofSchema = z.object({ provider: z.string(), status: z.enum(['succeeded', 'pending', 'failed']), refundId: z.string(), captureId: z.string(), amountCents: z.number().int().positive(), currency: z.string(), merchantId: z.string() })
export async function reconcileRefund(companyId: string, id: string) {
  const attempt = await prisma.refundAttempt.findFirst({ where: { companyId, id }, include: { settlement: { include: { attempt: true } } } })
  if (!attempt) throw new PaymentError(404, 'Remboursement introuvable.')
  if (attempt.status === 'SUCCEEDED') return refundDto(attempt)
  if (!attempt.externalId) throw new PaymentError(409, 'Résultat de création inconnu : rapprochement manuel auprès du prestataire nécessaire. Ne pas créer une nouvelle demande.')
  if (merchantFor(attempt.provider, companyId) !== attempt.merchantId) throw new PaymentError(409, 'Configuration marchande modifiée.')
  const gateway = getGateway(attempt.provider as PaymentProvider)
  if (!gateway?.verifyRefund) throw new PaymentError(501, 'Vérification de remboursement indisponible.')
  let response: unknown
  try { response = await gateway.verifyRefund(attempt.externalId, attempt.captureId, attempt.settlement.attempt.externalId!) }
  catch { throw new PaymentError(503, 'Prestataire non joignable : réservation conservée.') }
  const proof = proofSchema.safeParse(response)
  if (!proof.success || proof.data.provider !== attempt.provider || proof.data.refundId !== attempt.externalId || proof.data.captureId !== attempt.captureId
    || proof.data.merchantId !== attempt.merchantId || proof.data.currency !== attempt.currency || proof.data.amountCents !== attempt.amountCents) {
    await prisma.refundAttempt.updateMany({ where: { id, companyId, status: { not: 'SUCCEEDED' } }, data: { status: 'REVIEW' } })
    throw new PaymentError(409, 'Preuve de remboursement incohérente : aucune confirmation enregistrée.')
  }
  if (proof.data.status !== 'succeeded') return refundDto(attempt)
  const confirmed = await prisma.$transaction(async tx => {
    await lockFinancialCompany(tx, companyId)
    const current = await tx.refundAttempt.findFirstOrThrow({ where: { id, companyId } })
    if (current.status === 'SUCCEEDED') return current
    return tx.refundAttempt.update({ where: { id }, data: { status: 'SUCCEEDED', confirmedAt: new Date() } })
  })
  return refundDto(confirmed)
}
