import { z } from 'zod'
import type { Prisma } from '@prisma/client'
import prisma from './prisma'
import { floorHash } from './floor-workspace'
import { lockFinancialCompany } from './financial-lock'
import { PaymentError } from './payments/ledger'
import { assertTransactionCapabilities, BusinessPermissionError } from './business-permission-transaction'
async function payoutActor(tx: Prisma.TransactionClient, companyId: string, actorId: string) {
  try { await assertTransactionCapabilities(tx, { companyId, user: { userId: actorId } }, 'finance.manage') }
  catch (error) { if (error instanceof BusinessPermissionError) throw new PaymentError(403, error.message); throw error }
}
const ref = z.string().trim().min(1).max(200), minor = z.number().int().nonnegative().max(1e9)
const line = z.object({ kind: z.enum(['CAPTURE', 'REFUND', 'FEE', 'HOLD', 'RELEASE']), externalRef: ref, amountCents: minor.positive() }).strict()
export const statementSchema = z.object({ requestId: z.string().uuid(), fictional: z.literal(true), statementRef: ref, provider: z.enum(['paypal', 'stripe', 'manual']), merchantId: ref,
  currency: z.string().regex(/^[A-Z]{3}$/), payouts: z.array(z.object({ externalRef: ref, declaredNetCents: z.number().int().min(-1e9).max(1e9), receivedCents: minor.nullable().optional(),
    bankReference: ref.optional(), receivedAt: z.string().datetime({ offset: true }).optional(), lines: z.array(line).min(1).max(200) }).strict()).min(1).max(20) }).strict().superRefine((s, ctx) => {
  const refs = s.payouts.flatMap(p => p.lines.map(l => l.kind + ':' + l.externalRef))
  if (new Set(refs).size !== refs.length || new Set(s.payouts.map(p => p.externalRef)).size !== s.payouts.length) ctx.addIssue({ code: 'custom', message: 'Référence dupliquée dans le relevé.' })
})
export const payoutImportEnabled = () => process.env.CREORGA_PAYOUT_IMPORT_ENABLED === 'true'
export async function payoutDto(tx: Prisma.TransactionClient, payout: any) {
  const lines = payout.lines || await tx.payoutLine.findMany({ where: { companyId: payout.companyId, payoutId: payout.id }, orderBy: { id: 'asc' } })
  const unresolved: string[] = [], totals = { captureCents: 0, refundCents: 0, feesCents: 0, heldCents: 0, releasedCents: 0 }
  for (const l of lines) {
    if (l.kind === 'CAPTURE') {
      totals.captureCents += l.amountCents
      const s = await tx.paymentSettlement.findFirst({ where: { companyId: payout.companyId, provider: payout.provider, merchantId: payout.merchantId, captureId: l.externalRef, currency: payout.currency } })
      if (!s || s.amountCents !== l.amountCents || l.settlementId !== s.id) unresolved.push('CAPTURE_UNMATCHED:' + l.externalRef)
    } else if (l.kind === 'REFUND') {
      totals.refundCents += l.amountCents
      const r = await tx.refundAttempt.findFirst({ where: { companyId: payout.companyId, provider: payout.provider, merchantId: payout.merchantId, externalId: l.externalRef, currency: payout.currency } })
      if (!r || r.status !== 'SUCCEEDED' || r.amountCents !== l.amountCents || l.refundId !== r.id) unresolved.push('REFUND_UNMATCHED:' + l.externalRef)
    } else if (l.kind === 'FEE') totals.feesCents += l.amountCents
    else if (l.kind === 'HOLD') totals.heldCents += l.amountCents
    else if (l.kind === 'RELEASE') totals.releasedCents += l.amountCents
  }
  const computedNetCents = totals.captureCents - totals.refundCents - totals.feesCents - totals.heldCents + totals.releasedCents
  if (computedNetCents !== payout.declaredNetCents) unresolved.push('PROVIDER_NET_DIFFERENCE')
  if (payout.receivedCents == null || !payout.bankReference || !payout.receivedAt) unresolved.push('BANK_RECEIPT_MISSING')
  else if (payout.receivedCents !== computedNetCents) unresolved.push('BANK_DIFFERENCE')
  const dto = { id: payout.id, statementId: payout.statementId, externalRef: payout.externalRef, provider: payout.provider, merchantId: payout.merchantId, currency: payout.currency,
    source: 'FICTIONAL_DECLARATION', status: payout.validatedAt ? 'VALIDATED' : 'IMPORTED', confirmation: payout.validatedAt ? 'manual_fictional_reconciliation' : 'not_reconciled',
    ...totals, computedNetCents, declaredNetCents: payout.declaredNetCents, receivedCents: payout.receivedCents, bankReference: payout.bankReference, receivedAt: payout.receivedAt,
    validatedAt: payout.validatedAt, validatedBy: payout.validatedBy, createdAt: payout.createdAt, unresolved,
    lines: lines.map((l: any) => ({ id: l.id, kind: l.kind, externalRef: l.externalRef, amountCents: l.amountCents, settlementId: l.settlementId, refundId: l.refundId })) }
  return { ...dto, reviewHash: floorHash(JSON.parse(JSON.stringify(dto))) }
}
async function statementDto(tx: Prisma.TransactionClient, statement: any) {
  const payouts = await tx.bankPayout.findMany({ where: { companyId: statement.companyId, statementId: statement.id }, orderBy: { id: 'asc' } })
  return { id: statement.id, statementRef: statement.statementRef, source: 'FICTIONAL_DECLARATION', payouts: await Promise.all(payouts.map(p => payoutDto(tx, p))) }
}
export async function importStatement(companyId: string, actorId: string, raw: unknown) {
  if (!payoutImportEnabled()) throw new PaymentError(409, 'Import fictif désactivé. Aucun connecteur bancaire réel qualifié.')
  const input = statementSchema.parse(raw), { requestId, ...content } = input
  const hash = floorHash({ companyId, actorId, ...input }), contentHash = floorHash(content)
  return prisma.$transaction(async tx => {
    await lockFinancialCompany(tx, companyId)
    await payoutActor(tx, companyId, actorId)
    const previous = await tx.payoutStatement.findUnique({ where: { id: requestId } })
    if (previous) { if (previous.companyId !== companyId || previous.requestHash !== hash) throw new PaymentError(409, 'Référence d’import réutilisée.'); return { created: false, statement: await statementDto(tx, previous) } }
    const duplicate = await tx.payoutStatement.findUnique({ where: { companyId_contentHash: { companyId, contentHash } } })
    if (duplicate) return { created: false, statement: await statementDto(tx, duplicate) }
    if ((await tx.company.findUniqueOrThrow({ where: { id: companyId } })).currency !== input.currency) throw new PaymentError(409, 'Devise distincte : rapprochement séparé requis.')
    const row = await tx.payoutStatement.create({ data: { id: requestId, companyId, actorId, requestHash: hash, contentHash, statementRef: input.statementRef, provider: input.provider, merchantId: input.merchantId, currency: input.currency } })
    for (const p of input.payouts) {
      const payout = await tx.bankPayout.create({ data: { companyId, statementId: row.id, externalRef: p.externalRef, provider: input.provider, merchantId: input.merchantId, currency: input.currency,
        declaredNetCents: p.declaredNetCents, receivedCents: p.receivedCents, bankReference: p.bankReference, receivedAt: p.receivedAt ? new Date(p.receivedAt) : null } })
      for (const l of p.lines) {
        const where = { companyId, provider: input.provider, merchantId: input.merchantId, currency: input.currency, amountCents: l.amountCents }
        const settlement = l.kind === 'CAPTURE' ? await tx.paymentSettlement.findFirst({ where: { ...where, captureId: l.externalRef } }) : null
        const refund = l.kind === 'REFUND' ? await tx.refundAttempt.findFirst({ where: { ...where, externalId: l.externalRef, status: 'SUCCEEDED' } }) : null
        await tx.payoutLine.create({ data: { companyId, payoutId: payout.id, provider: input.provider, merchantId: input.merchantId, ...l, settlementId: settlement?.id, refundId: refund?.id } })
      }
    }
    return { created: true, statement: await statementDto(tx, row) }
  }, { maxWait: 15000, timeout: 20000 })
}
export async function validatePayout(companyId: string, actorId: string, id: string, raw: unknown) {
  const input = z.object({ requestId: z.string().uuid(), reason: z.string().trim().min(5).max(500), expectedHash: z.string().regex(/^[a-f0-9]{64}$/) }).strict().parse(raw)
  const hash = floorHash({ companyId, actorId, id, ...input })
  return prisma.$transaction(async tx => {
    await lockFinancialCompany(tx, companyId)
    await payoutActor(tx, companyId, actorId)
    const previous = await tx.payoutDecision.findUnique({ where: { id: input.requestId } })
    if (previous) { if (previous.companyId !== companyId || previous.requestHash !== hash) throw new PaymentError(409, 'Référence de validation réutilisée.'); return (previous.snapshot as any).result }
    const row = await tx.bankPayout.findFirst({ where: { companyId, id } })
    if (!row) throw new PaymentError(404, 'Versement introuvable dans cette société.')
    const review = await payoutDto(tx, row)
    if (review.reviewHash !== input.expectedHash || review.unresolved.length || row.validatedAt) throw new PaymentError(409, 'Écart non résolu ou état modifié : aucune validation forcée possible.')
    const saved = await tx.bankPayout.update({ where: { id }, data: { validatedAt: new Date(), validatedBy: actorId } }), result = JSON.parse(JSON.stringify(await payoutDto(tx, saved)))
    await tx.payoutDecision.create({ data: { id: input.requestId, companyId, payoutId: id, actorId, requestHash: hash, snapshot: { reason: input.reason, before: review, result } } })
    return result
  }, { maxWait: 15000, timeout: 20000 })
}

/** Une capture/preuve arrivée après import peut être reliée, jamais réécrite. */
export async function refreshPayout(companyId: string, actorId: string, id: string, raw: unknown) {
  const input = z.object({ requestId: z.string().uuid(), reason: z.string().trim().min(5).max(500) }).strict().parse(raw), hash = floorHash({ companyId, actorId, id, action: 'REFRESH', ...input })
  return prisma.$transaction(async tx => {
    await lockFinancialCompany(tx, companyId)
    await payoutActor(tx, companyId, actorId)
    const previous = await tx.payoutDecision.findUnique({ where: { id: input.requestId } })
    if (previous) { if (previous.companyId !== companyId || previous.requestHash !== hash) throw new PaymentError(409, 'Référence de relecture réutilisée.'); return (previous.snapshot as any).result }
    const payout = await tx.bankPayout.findFirst({ where: { companyId, id }, include: { lines: true } })
    if (!payout) throw new PaymentError(404, 'Versement introuvable.')
    if (payout.validatedAt) throw new PaymentError(409, 'Rapprochement validé figé. Une correction séparée doit être qualifiée.')
    const before = await payoutDto(tx, payout)
    for (const l of payout.lines) {
      const where = { companyId, provider: payout.provider, merchantId: payout.merchantId, currency: payout.currency, amountCents: l.amountCents }
      if (l.kind === 'CAPTURE' && !l.settlementId) {
        const match = await tx.paymentSettlement.findFirst({ where: { ...where, captureId: l.externalRef } })
        if (match) await tx.payoutLine.update({ where: { id: l.id }, data: { settlementId: match.id } })
      }
      if (l.kind === 'REFUND' && !l.refundId) {
        const match = await tx.refundAttempt.findFirst({ where: { ...where, externalId: l.externalRef, status: 'SUCCEEDED' } })
        if (match) await tx.payoutLine.update({ where: { id: l.id }, data: { refundId: match.id } })
      }
    }
    const result = JSON.parse(JSON.stringify(await payoutDto(tx, { ...payout, lines: undefined })))
    await tx.payoutDecision.create({ data: { id: input.requestId, companyId, payoutId: id, actorId, requestHash: hash, snapshot: { action: 'REFRESH', reason: input.reason, before, result } } })
    return result
  }, { maxWait: 15000, timeout: 20000 })
}
