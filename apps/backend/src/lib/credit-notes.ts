import { createHash } from 'node:crypto'
import { z } from 'zod'
import prisma from './prisma'
import { avecReprisesNumerotation, nextNumber } from './numerotation'
import { allocateMinor, moneyMinor, totalsFromTtc, type TaxGroup } from './money'
import { invoicePdf, type PrintableInvoice } from './invoice-pdf'
import { assertTransactionCapabilities, BusinessPermissionError } from './business-permission-transaction'

type CreditNotIssuedProof = {
  code: 'CREDIT_AMOUNT_EXCEEDS_AVAILABLE'; outcome: 'NOT_ISSUED'; requestId: string
  companyId: string; actorId: string; invoiceId: string; amountCents: number; availableCents: number; reason: string
}
export class CreditError extends Error { constructor(public status: number, message: string, public notIssuedProof?: CreditNotIssuedProof) { super(message) } }
const groupSchema = z.array(z.object({ taxRate: z.number().min(0).max(100), baseCents: z.number().int().nonnegative(), taxCents: z.number().int().nonnegative(), totalCents: z.number().int().nonnegative() })).min(1)
export const creditDto = (credit: any) => ({ id: credit.id, invoiceId: credit.invoiceId, number: credit.number, actorId: credit.actorId, reason: credit.reason,
  currency: credit.currency, totalCents: credit.totalCents, baseCents: credit.baseCents, taxCents: credit.taxCents,
  taxGroups: credit.taxGroups, pdfHash: credit.pdfHash, createdAt: credit.createdAt, confirmation: 'credit_note_not_refund' })

export async function createCreditNote(companyId: string, actorId: string, invoiceId: string, raw: unknown) {
  const input = z.object({ requestId: z.string().uuid(), reason: z.string().trim().min(5).max(500), amountCents: z.number().int().positive().max(1_000_000_000).optional() }).strict().parse(raw)
  const requestHash = createHash('sha256').update(JSON.stringify({ companyId, actorId, invoiceId, ...input })).digest('hex')
  return avecReprisesNumerotation(() => prisma.$transaction(async tx => {
    await tx.$queryRaw`SELECT pg_advisory_xact_lock(hashtext(${companyId}), hashtext(${`invoice-credit:${invoiceId}`}))::text`
    try { await assertTransactionCapabilities(tx, { companyId, user: { userId: actorId } }, 'invoices.write') }
    catch (error) { if (error instanceof BusinessPermissionError) throw new CreditError(403, error.message); throw error }
    const invoice = await tx.invoice.findFirst({ where: { id: invoiceId, companyId } })
    if (!invoice) throw new CreditError(404, 'Facture introuvable dans cette société.')
    const existing = await tx.creditNote.findUnique({ where: { id: input.requestId } })
    if (existing) {
      if (existing.requestHash !== requestHash) throw new CreditError(409, 'Cette référence désigne un autre avoir.')
      return { credit: existing, created: false }
    }
    if (!invoice.issuedAt || !invoice.issuedSnapshot || !invoice.issuedPdf || !invoice.issuedPdfHash || invoice.status === 'CANCELLED') throw new CreditError(422, 'Original émis et vérifiable requis. Aucun avoir automatique sur un ancien document incomplet ou annulé.')
    if (createHash('sha256').update(invoice.issuedPdf).digest('hex') !== invoice.issuedPdfHash) throw new CreditError(422, 'Intégrité de l’original non confirmée.')
    const original = invoice.issuedSnapshot as unknown as PrintableInvoice
    const checked = groupSchema.safeParse(original.taxGroups)
    if (!checked.success || new Set(checked.data.map(g => g.taxRate)).size !== checked.data.length
      || checked.data.some(g => g.baseCents + g.taxCents !== g.totalCents)
      || checked.data.reduce((s, g) => s + g.totalCents, 0) !== moneyMinor(invoice.total)
      || checked.data.reduce((s, g) => s + g.baseCents, 0) !== moneyMinor(invoice.subtotal)
      || checked.data.reduce((s, g) => s + g.taxCents, 0) !== moneyMinor(invoice.taxAmount)) throw new CreditError(422, 'Ventilation historique incohérente : vérification comptable requise.')
    const previous = await tx.creditNote.findMany({ where: { companyId, invoiceId } })
    const remaining = checked.data.map(g => ({ ...g }))
    for (const credit of previous) {
      const groups = groupSchema.safeParse(credit.taxGroups)
      if (!groups.success) throw new CreditError(422, 'Historique des avoirs incohérent.')
      for (const used of groups.data) {
        const group = remaining.find(g => g.taxRate === used.taxRate)
        if (!group) throw new CreditError(422, 'Taux historique inconnu.')
        group.baseCents -= used.baseCents; group.taxCents -= used.taxCents; group.totalCents -= used.totalCents
      }
    }
    if (remaining.some(g => g.totalCents < 0 || g.baseCents < 0 || g.taxCents < 0)) throw new CreditError(422, 'Historique déjà surcrédité : opération refusée.')
    const available = remaining.reduce((s, g) => s + g.totalCents, 0), totalCents = input.amountCents ?? available
    // Preuve restrictive : original vérifié, référence non émise, verrou tenu,
    // aucune création/PDF encore tenté. Le rejet sort après rollback de la transaction.
    // Ni un zéro implicite, ni une collision de référence n'autorise cet abandon.
    if (totalCents > available) throw new CreditError(409, 'Le montant dépasse le solde encore créditable de la facture.', {
      code: 'CREDIT_AMOUNT_EXCEEDS_AVAILABLE', outcome: 'NOT_ISSUED', requestId: input.requestId,
      companyId, actorId, invoiceId, amountCents: totalCents, availableCents: available, reason: input.reason,
    })
    if (!totalCents) throw new CreditError(409, 'Le montant dépasse le solde encore créditable de la facture.')
    const allocations = allocateMinor(totalCents, remaining.map(g => g.totalCents))
    const taxGroups: TaxGroup[] = remaining.flatMap((g, i) => {
      const total = allocations[i]
      if (!total) return []
      // Le dernier centime reprend les reliquats historiques, jamais un nouveau taux catalogue.
      const expected = totalsFromTtc([{ price: total / 100, qty: 1, taxRate: g.taxRate }]).baseCents
      const baseCents = Math.min(g.baseCents, Math.max(total - g.taxCents, expected))
      return [{ taxRate: g.taxRate, baseCents, taxCents: total - baseCents, totalCents: total }]
    })
    const baseCents = taxGroups.reduce((s, g) => s + g.baseCents, 0), taxCents = totalCents - baseCents
    // Lire après l'attente du verrou et les contrôles, sur la même connexion.
    // Un candidat choisi avant ce verrou devient périmé pour toute la file et
    // fait recalculer inutilement les PDF jusqu'à épuiser les reprises.
    // Les factures distinctes gardent la contrainte société/numéro + reprises ;
    // aucun verrou global n'est tenu pendant leur génération PDF.
    const number = await nextNumber(companyId, 'AVO', tx)
    const snapshot: PrintableInvoice = { ...original, documentKind: 'CREDIT_NOTE', number, status: 'ISSUED', createdAt: new Date().toISOString(), dueDate: null,
      sourceDocumentNumber: invoice.number, subtotal: baseCents / 100, taxAmount: taxCents / 100, total: totalCents / 100,
      priceBasis: 'TTC', discountCents: 0, taxGroups,
      items: taxGroups.map(g => ({ description: `Correction de ${invoice.number} — TVA historique ${g.taxRate} %`, quantity: 1, unitPrice: g.totalCents / 100, taxRate: g.taxRate })),
      notes: `${input.reason}\nAvoir lié à ${invoice.number}. Correction commerciale répartie par taux historiques ; ne constitue pas un remboursement ni un mouvement de stock.` }
    const pdf = await invoicePdf(snapshot), pdfHash = createHash('sha256').update(pdf).digest('hex')
    const credit = await tx.creditNote.create({ data: { id: input.requestId, companyId, invoiceId, number, actorId, reason: input.reason, requestHash,
      currency: invoice.currency, totalCents, baseCents, taxCents, taxGroups: JSON.parse(JSON.stringify(taxGroups)), snapshot: JSON.parse(JSON.stringify(snapshot)), pdf, pdfHash } })
    return { credit, created: true }
  }, { maxWait: 30000, timeout: 15000 }))
}
