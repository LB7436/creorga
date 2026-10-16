import { z } from 'zod'
import prisma from '../prisma'
import { floorHash } from '../floor-workspace'
import { lockFinancialCompany } from '../financial-lock'
import { activeCashDrawerId } from '../cash-ledger'
import { PaymentError } from './ledger'
import { escapeHtml } from '../pos-ledger'

export const manualRefundDto = (r: any) => ({ id: r.id, creditNoteId: r.creditNoteId, tenderId: r.tenderId, method: r.method, amountCents: r.amountCents,
  currency: r.currency, status: 'DECLARED', confirmation: 'manual_declaration', actorId: r.actorId, reference: r.reference, reason: r.reason, cashMovementId: r.cashMovementId, createdAt: r.createdAt })
export async function declareManualRefund(companyId: string, actorId: string, raw: unknown) {
  const input = z.object({ requestId: z.string().uuid(), creditNoteId: z.string().min(1).max(200), tenderId: z.string().min(1).max(200), method: z.enum(['CASH', 'CARD']),
    amountCents: z.number().int().positive().max(1e9), reason: z.string().trim().min(5).max(500), reference: z.string().trim().min(3).max(200) }).strict().parse(raw)
  const hash = floorHash({ companyId, actorId, ...input })
  return prisma.$transaction(async tx => {
    await lockFinancialCompany(tx, companyId)
    const prior = await tx.manualRefund.findUnique({ where: { id: input.requestId } })
    if (prior) { if (prior.companyId !== companyId || prior.requestHash !== hash) throw new PaymentError(409, 'Référence de remboursement incompatible.'); return { created: false, refund: manualRefundDto(prior) } }
    const credit = await tx.creditNote.findFirst({ where: { companyId, id: input.creditNoteId }, include: { invoice: { include: { sourcePosSale: true } } } })
    const tender = await tx.orderTender.findFirst({ where: { companyId, id: input.tenderId } })
    if (!credit || !tender) throw new PaymentError(404, 'Avoir ou règlement introuvable dans cette société.')
    const sourceOrders: string[] = credit.invoice.sourcePosSale ? (credit.invoice.sourcePosSale.snapshot as any).orderIds || [] : [credit.invoice.orderId].filter(Boolean)
    if (!sourceOrders.includes(tender.orderId) || tender.method !== input.method || tender.confirmation !== 'manual_declaration' || tender.settlementId || credit.currency !== (await tx.company.findUniqueOrThrow({ where: { id: companyId } })).currency) throw new PaymentError(409, 'Origine, méthode ou devise incompatible. Une capture prestataire doit être remboursée par son connecteur et rapprochée.')
    const [manualCredit, providerCredit, tenderUsed] = await Promise.all([
      tx.manualRefund.aggregate({ where: { companyId, creditNoteId: credit.id }, _sum: { amountCents: true } }),
      tx.refundAttempt.aggregate({ where: { companyId, creditNoteId: credit.id, reservationReleasedAt: null }, _sum: { amountCents: true } }),
      tx.manualRefund.aggregate({ where: { companyId, tenderId: tender.id }, _sum: { amountCents: true } }),
    ])
    if (input.amountCents > credit.totalCents - (manualCredit._sum.amountCents || 0) - (providerCredit._sum.amountCents || 0)
      || input.amountCents > tender.amountCents - (tenderUsed._sum.amountCents || 0)) throw new PaymentError(409, 'Montant supérieur à l’avoir ou au règlement encore remboursable, réservations prestataire incluses.')
    const drawerId = input.method === 'CASH' ? await activeCashDrawerId(tx, companyId) : null
    if (input.method === 'CASH' && !drawerId) throw new PaymentError(409, 'Ouvrez une session de caisse avant une sortie espèces.')
    const cashMovementId = drawerId ? input.requestId : null
    if (drawerId) await tx.cashMovement.create({ data: { id: input.requestId, companyId, drawerId, actorId, direction: 'OUT', amountCents: input.amountCents,
      reason: `Remboursement déclaré ${credit.number} : ${input.reason}`, requestHash: hash } })
    const company = await tx.company.findUniqueOrThrow({ where: { id: companyId } })
    const snapshot = { companyName: company.name, creditNumber: credit.number, invoiceNumber: credit.invoice.number, orderId: tender.orderId, ...input, actorId, confirmation: 'manual_declaration' }
    const refund = await tx.manualRefund.create({ data: { id: input.requestId, companyId, creditNoteId: credit.id, tenderId: tender.id, actorId, method: input.method, amountCents: input.amountCents,
      currency: credit.currency, reason: input.reason, reference: input.reference, requestHash: hash, cashMovementId, snapshot } })
    return { created: true, refund: manualRefundDto(refund) }
  })
}
export function manualRefundReceipt(r: any) {
  const s = r.snapshot
  return `<!doctype html><html lang="fr"><meta charset="utf-8"><title>Remboursement ${escapeHtml(r.id)}</title><body style="font-family:system-ui;max-width:680px;margin:32px auto;padding:20px"><h1>Déclaration de remboursement</h1><p>${escapeHtml(s.companyName)}</p><p>Référence : ${escapeHtml(r.id)}<br>Facture : ${escapeHtml(s.invoiceNumber)}<br>Avoir : ${escapeHtml(s.creditNumber)}<br>Règlement d’origine : ${escapeHtml(r.tenderId)}</p><h2>${(r.amountCents / 100).toFixed(2)} ${escapeHtml(r.currency)}</h2><p>${r.method === 'CASH' ? 'Espèces déclarées remises' : 'Carte : remboursement déclaré sur terminal autonome, à rapprocher'}</p><p>Justificatif : ${escapeHtml(r.reference)}<br>Motif : ${escapeHtml(r.reason)}<br>Auteur : ${escapeHtml(r.actorId)}<br>${new Date(r.createdAt).toISOString()}</p><p>Déclaration manuelle - aucune confirmation bancaire automatique. Ce justificatif ne remplace pas l’avoir fiscal. Il ne réécrit ni la vente ni le règlement d’origine.</p></body></html>`
}
