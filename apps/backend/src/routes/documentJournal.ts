import { Router } from 'express'
import { z } from 'zod'
import prisma from '../lib/prisma'
import { moneyMinor } from '../lib/money'
import { assertTransactionCapabilities, BusinessPermissionError, requireCapabilities } from '../lib/business-permission-transaction'

export const journalPeriod = (query: unknown) => {
  const period = z.object({ startDate: z.string().datetime({ offset: true }).optional(), endDate: z.string().datetime({ offset: true }).optional() }).parse(query)
  if (period.startDate && period.endDate && new Date(period.startDate) > new Date(period.endDate)) throw new Error('Période inversée')
  return { period, dates: { ...(period.startDate ? { gte: new Date(period.startDate) } : {}), ...(period.endDate ? { lte: new Date(period.endDate) } : {}) } }
}
const groups = z.array(z.object({ taxRate: z.number().min(0).max(100), baseCents: z.number().int().nonnegative(), taxCents: z.number().int().nonnegative(), totalCents: z.number().int().nonnegative() })).min(1)
const router = Router()
router.get('/document-journal', requireCapabilities('finance.revenue.read'), async (req: any, res) => {
  try {
    const { period, dates } = journalPeriod(req.query)
    const documents = await prisma.$transaction(async tx => {
      await assertTransactionCapabilities(tx, req, 'finance.revenue.read')
      const [invoices, credits] = await Promise.all([
        tx.invoice.findMany({ where: { companyId: req.companyId, issuedAt: { not: null, ...dates } }, select: { id: true, number: true, currency: true, issuedAt: true, issuedSnapshot: true, orderId: true, sourcePosSaleId: true, total: true, subtotal: true, taxAmount: true }, orderBy: { issuedAt: 'asc' }, take: 1001 }),
        tx.creditNote.findMany({ where: { companyId: req.companyId, createdAt: dates }, select: { id: true, invoiceId: true, number: true, currency: true, createdAt: true, taxGroups: true, totalCents: true, baseCents: true, taxCents: true }, orderBy: { createdAt: 'asc' }, take: 1001 }),
      ])
      if (invoices.length > 1000 || credits.length > 1000) throw new Error('Réduisez la période : aucune troncature silencieuse')
      const result = [
        ...invoices.map(i => ({ kind: 'INVOICE', id: i.id, number: i.number, currency: i.currency, date: i.issuedAt, sign: 1, sourceInvoiceId: null,
          sourceOrderId: i.orderId, sourcePosSaleId: i.sourcePosSaleId, totalCents: moneyMinor(i.total), baseCents: moneyMinor(i.subtotal), taxCents: moneyMinor(i.taxAmount), taxGroups: (i.issuedSnapshot as any)?.taxGroups })),
        ...credits.map(c => ({ kind: 'CREDIT_NOTE', id: c.id, number: c.number, currency: c.currency, date: c.createdAt, sign: -1, sourceInvoiceId: c.invoiceId,
          sourceOrderId: null, sourcePosSaleId: null, totalCents: c.totalCents, baseCents: c.baseCents, taxCents: c.taxCents, taxGroups: c.taxGroups })),
      ]
      for (const document of result) {
        const taxGroups = groups.parse(document.taxGroups)
        if (taxGroups.some(g => g.baseCents + g.taxCents !== g.totalCents) || taxGroups.reduce((s, g) => s + g.totalCents, 0) !== document.totalCents
          || taxGroups.reduce((s, g) => s + g.baseCents, 0) !== document.baseCents || taxGroups.reduce((s, g) => s + g.taxCents, 0) !== document.taxCents) throw new Error('Pièce historique non réconciliée')
      }
      return result.sort((a, b) => a.date!.getTime() - b.date!.getTime() || a.id.localeCompare(b.id))
    }, { isolationLevel: 'RepeatableRead' })
    res.set('Cache-Control', 'private, no-store').json({ period, basis: 'documents_not_additional_sales_or_bank_receipts', documents,
      warning: 'Journal de pièces uniquement. Ne pas additionner ces factures aux tickets/commandes, ni déduire un remboursement d’un avoir. Format comptable à qualifier.' })
  } catch (error) {
    if (error instanceof BusinessPermissionError) return void res.status(403).json({ message: error.message })
    res.status(409).json({ code: 'DOCUMENT_JOURNAL_REVIEW_REQUIRED', message: 'Période invalide/trop large ou pièce non réconciliée. Aucun export complet annoncé ; vérification requise.' })
  }
})
export default router
