import { createHash } from 'node:crypto'
import { z } from 'zod'
import prisma from '../prisma'
import { lockFinancialCompany } from '../financial-lock'
import { getGateway, type PaymentProvider } from './gateway'
import { merchantFor, PaymentError } from './ledger'
import type { Prisma } from '@prisma/client'
import { allocateMinor } from '../money'
import { floorHash } from '../floor-workspace'

/** Les réservations incertaines ne sont jamais libérées par un simple timeout.
 * Un ancien remboursement sans affectations bloque la capture, sans inventer
 * rétrospectivement sa ventilation. */
export async function refundableOrderParts(tx: Prisma.TransactionClient, companyId: string, settlement: { id: string; orderId: string; amountCents: number; allocations: Array<{ orderId: string; amountCents: number }> }, sourceOrders: string[]) {
  const reserved = await tx.refundAttempt.findMany({ where: { companyId, settlementId: settlement.id, reservationReleasedAt: null }, include: { allocations: true } })
  if (reserved.some(r => !r.allocations.length || r.allocations.reduce((s, a) => s + a.amountCents, 0) !== r.amountCents)) throw new PaymentError(409, 'Ancien remboursement sans ventilation vérifiable : rapprochement manuel requis.')
  const original = settlement.allocations.length ? settlement.allocations : [{ orderId: settlement.orderId, amountCents: settlement.amountCents }]
  if (original.reduce((s, a) => s + a.amountCents, 0) !== settlement.amountCents) throw new PaymentError(409, 'Ventilation de capture non réconciliée.')
  return original.filter(a => sourceOrders.includes(a.orderId)).map(a => ({ orderId: a.orderId,
    amountCents: a.amountCents - reserved.flatMap(r => r.allocations).filter(r => r.orderId === a.orderId).reduce((s, r) => s + r.amountCents, 0) }))
}
export const refundDto = (r: any) => ({ id: r.id, creditNoteId: r.creditNoteId, settlementId: r.settlementId, amountCents: r.amountCents, currency: r.currency,
  provider: r.provider, externalId: r.externalId, status: r.status, confirmedAt: r.confirmedAt, createdAt: r.createdAt,
  reservationHeld: !r.reservationReleasedAt, reservationReleasedAt: r.reservationReleasedAt, verifiedAt: r.verifiedAt,
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
    const [creditUsed, captureUsed, manualUsed] = await Promise.all([
      tx.refundAttempt.aggregate({ where: { companyId, creditNoteId: credit.id, reservationReleasedAt: null }, _sum: { amountCents: true } }),
      tx.refundAttempt.aggregate({ where: { companyId, settlementId: settlement.id, reservationReleasedAt: null }, _sum: { amountCents: true } }),
      tx.manualRefund.aggregate({ where: { companyId, creditNoteId: credit.id }, _sum: { amountCents: true } }),
    ])
    if (input.amountCents > credit.totalCents - (creditUsed._sum.amountCents || 0) - (manualUsed._sum.amountCents || 0) || input.amountCents > settlement.amountCents - (captureUsed._sum.amountCents || 0)) throw new PaymentError(409, 'Montant supérieur à l’avoir disponible ou à la capture restante, réservations incertaines incluses.')
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
  let externalId: string | null = null
  try {
    const gateway = getGateway(result.attempt.provider as PaymentProvider)
    const response = await gateway.startRefund!({ requestId: result.attempt.providerRequestId, captureId: result.attempt.captureId,
      externalOrderId: result.externalOrderId, amountCents: result.attempt.amountCents, currency: result.attempt.currency })
    if (!response.id || typeof response.id !== 'string' || response.id.length > 200) throw new Error('Référence de remboursement absente')
    externalId = response.id
  } catch { /* Résultat ambigu : relire sous verrou sans écraser un rapprochement concurrent. */ }
  const saved = await prisma.$transaction(async tx => {
    await lockFinancialCompany(tx, companyId)
    const current = await tx.refundAttempt.findFirstOrThrow({ where: { id: result.attempt.id, companyId } })
    let row = current
    if (externalId && current.externalId && current.externalId !== externalId) {
      if (current.status !== 'SUCCEEDED') row = await tx.refundAttempt.update({ where: { id: current.id }, data: { status: 'REVIEW', reservationReleasedAt: null } })
    } else if (externalId && !current.externalId) row = await tx.refundAttempt.update({ where: { id: current.id }, data: { externalId } })
    else if (!externalId && !current.externalId && current.status === 'PENDING') row = await tx.refundAttempt.update({ where: { id: current.id }, data: { status: 'UNKNOWN' } })
    await tx.refundReviewEvent.create({ data: { companyId, refundId: current.id, actorId, action: externalId ? 'PROVIDER_REQUEST_RETURNED' : 'PROVIDER_REQUEST_UNKNOWN',
      snapshot: { returnedExternalId: externalId, retainedExternalId: row.externalId, beforeStatus: current.status, afterStatus: row.status, providerRequestId: current.providerRequestId } } })
    return row
  })
  return { httpStatus: 202, body: refundDto(saved) }
}
const proofSchema = z.object({ provider: z.string(), status: z.enum(['succeeded', 'pending', 'failed']), providerStatus: z.string().max(60).optional(), providerRequestId: z.string().max(200).optional(), refundId: z.string(), captureId: z.string(), amountCents: z.number().int().positive(), currency: z.string(), merchantId: z.string() })
async function readProof(attempt: any, externalId: string) {
  if (merchantFor(attempt.provider, attempt.companyId) !== attempt.merchantId) throw new PaymentError(409, 'Configuration marchande modifiée.')
  const gateway = getGateway(attempt.provider as PaymentProvider)
  if (!gateway?.verifyRefund) throw new PaymentError(501, 'Vérification de remboursement indisponible.')
  try { return proofSchema.safeParse(await gateway.verifyRefund(externalId, attempt.captureId, attempt.settlement.attempt.externalId!)) }
  catch {
    await prisma.refundReviewEvent.create({ data: { companyId: attempt.companyId, refundId: attempt.id, actorId: 'server', action: 'PROVIDER_UNAVAILABLE', snapshot: { externalId, reservationRetained: true } } })
    throw new PaymentError(503, 'Prestataire non joignable : réservation conservée.')
  }
}
function matches(attempt: any, proof: z.infer<typeof proofSchema>, externalId: string) {
  return proof.provider === attempt.provider && proof.refundId === externalId && proof.captureId === attempt.captureId
    && proof.merchantId === attempt.merchantId && proof.currency === attempt.currency && proof.amountCents === attempt.amountCents
}
export async function reconcileRefund(companyId: string, id: string, actorId = 'server') {
  const attempt = await prisma.refundAttempt.findFirst({ where: { companyId, id }, include: { settlement: { include: { attempt: true } } } })
  if (!attempt) throw new PaymentError(404, 'Remboursement introuvable.')
  if (attempt.status === 'SUCCEEDED') return refundDto(attempt)
  if (!attempt.externalId) throw new PaymentError(409, 'Résultat de création inconnu : rapprochement manuel auprès du prestataire nécessaire. Ne pas créer une nouvelle demande.')
  const proof = await readProof(attempt, attempt.externalId)
  if (!proof.success || !matches(attempt, proof.data, attempt.externalId)) {
    await prisma.$transaction(async tx => {
      await lockFinancialCompany(tx, companyId)
      await tx.refundAttempt.updateMany({ where: { id, companyId, status: { not: 'SUCCEEDED' } }, data: { status: 'REVIEW', reservationReleasedAt: null } })
      await tx.refundReviewEvent.create({ data: { companyId, refundId: id, actorId, action: 'PROVIDER_MISMATCH', snapshot: { externalId: attempt.externalId, ...(proof.success ? { proof: proof.data } : { malformed: true }) } } })
    })
    throw new PaymentError(409, 'Preuve de remboursement incohérente : aucune confirmation enregistrée.')
  }
  const confirmed = await prisma.$transaction(async tx => {
    await lockFinancialCompany(tx, companyId)
    const current = await tx.refundAttempt.findFirstOrThrow({ where: { id, companyId } })
    if (current.status === 'SUCCEEDED') return current
    const status = proof.data.status === 'succeeded' ? 'SUCCEEDED' : current.reservationReleasedAt && proof.data.status === 'failed' ? 'NOT_REFUNDED' : proof.data.status === 'failed' ? 'REFUSED_RECONCILIATION' : 'PENDING'
    // Même un refus conserve sa réservation : aucune libération sur un simple libellé distant.
    await tx.refundReviewEvent.create({ data: { companyId, refundId: id, actorId, action: 'PROVIDER_VERIFIED', snapshot: { beforeStatus: current.status, afterStatus: status, proof: proof.data } } })
    return tx.refundAttempt.update({ where: { id }, data: { status, reservationReleasedAt: status === 'NOT_REFUNDED' ? current.reservationReleasedAt : null,
      ...(status === 'SUCCEEDED' ? { confirmedAt: new Date() } : {}), verifiedAt: new Date(), lastProof: { ...proof.data } } })
  })
  return refundDto(confirmed)
}

/** Décisions humaines : relecture serveur, jamais remboursement ni simple case « libérer ». */
export async function reviewRefund(companyId: string, actorId: string, id: string, raw: unknown) {
  const input = z.object({ requestId: z.string().uuid(), action: z.enum(['ASSOCIATE_REFERENCE', 'RELEASE_NOT_REFUNDED', 'KEEP_RESERVED']),
    externalId: z.string().trim().min(1).max(200).optional(), reason: z.string().trim().min(5).max(500) }).strict().parse(raw)
  const hash = floorHash({ companyId, actorId, id, ...input })
  const previous = await prisma.refundReviewEvent.findUnique({ where: { id: input.requestId } })
  if (previous) {
    if (previous.companyId !== companyId || previous.refundId !== id || previous.requestHash !== hash) throw new PaymentError(409, 'Référence de décision réutilisée.')
    return (previous.snapshot as any).result
  }
  const attempt = await prisma.refundAttempt.findFirst({ where: { companyId, id }, include: { settlement: { include: { attempt: true } } } })
  if (!attempt) throw new PaymentError(404, 'Remboursement introuvable.')
  if (input.action === 'RELEASE_NOT_REFUNDED' && (attempt.status !== 'REFUSED_RECONCILIATION' || !attempt.externalId)) throw new PaymentError(409, 'Réservation conservée : refus vérifié et référence externe indispensables.')
  if (input.action === 'ASSOCIATE_REFERENCE' && (attempt.externalId || !input.externalId)) throw new PaymentError(409, 'Référence déjà connue ou référence candidate absente.')
  const externalId = input.action === 'ASSOCIATE_REFERENCE' ? input.externalId! : attempt.externalId
  const proof = input.action === 'KEEP_RESERVED' ? null : await readProof(attempt, externalId!)
  const valid = proof?.success && matches(attempt, proof.data, externalId!)
  const associative = input.action !== 'ASSOCIATE_REFERENCE' || proof?.success && proof.data.providerRequestId === attempt.providerRequestId
  const terminal = proof?.success && proof.data.status === 'failed' && ['FAILED', 'CANCELLED'].includes(proof.data.providerStatus || '')
  if (input.action !== 'KEEP_RESERVED' && (!valid || !associative || input.action === 'RELEASE_NOT_REFUNDED' && !terminal)) {
    await prisma.refundReviewEvent.create({ data: { companyId, refundId: id, actorId, action: 'DECISION_REJECTED', snapshot: { reason: input.reason, requestedAction: input.action,
      candidate: externalId, ...(proof?.success ? { proof: proof.data } : { malformed: true }), reservationRetained: true } } })
    throw new PaymentError(409, 'Preuve insuffisante ou non terminale : réservation conservée. Aucun nouveau remboursement envoyé.')
  }
  return prisma.$transaction(async tx => {
    await lockFinancialCompany(tx, companyId)
    const replay = await tx.refundReviewEvent.findUnique({ where: { id: input.requestId } })
    if (replay) { if (replay.requestHash !== hash) throw new PaymentError(409, 'Référence de décision réutilisée.'); return (replay.snapshot as any).result }
    const current = await tx.refundAttempt.findFirstOrThrow({ where: { id, companyId } })
    if (current.status !== attempt.status || current.externalId !== attempt.externalId || current.verifiedAt?.getTime() !== attempt.verifiedAt?.getTime()) throw new PaymentError(409, 'Le rapprochement a changé : relisez son historique.')
    let row = current
    if (input.action === 'RELEASE_NOT_REFUNDED') row = await tx.refundAttempt.update({ where: { id }, data: { status: 'NOT_REFUNDED', reservationReleasedAt: new Date(), verifiedAt: new Date(), lastProof: proof!.success ? proof!.data : {} } })
    if (input.action === 'ASSOCIATE_REFERENCE') row = await tx.refundAttempt.update({ where: { id }, data: { externalId, status: proof!.success && proof!.data.status === 'succeeded' ? 'SUCCEEDED' : proof!.success && proof!.data.status === 'failed' ? 'REFUSED_RECONCILIATION' : 'PENDING',
      ...(proof!.success && proof!.data.status === 'succeeded' ? { confirmedAt: new Date() } : {}), verifiedAt: new Date(), lastProof: proof!.success ? proof!.data : {} } })
    const result = JSON.parse(JSON.stringify(refundDto(row)))
    await tx.refundReviewEvent.create({ data: { id: input.requestId, companyId, refundId: id, actorId, action: input.action, requestHash: hash,
      snapshot: { reason: input.reason, beforeStatus: current.status, result, ...(proof?.success ? { proof: proof.data } : {}) } } })
    return result
  }, { maxWait: 15000, timeout: 10000 })
}
