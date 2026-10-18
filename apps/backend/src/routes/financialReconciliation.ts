import { Router } from 'express'
import prisma from '../lib/prisma'
import { reconciliation, reconciliationCsv } from '../lib/financial-reconciliation'
import { journalPeriod } from './documentJournal'
import { assertTransactionCapabilities, BusinessPermissionError, requireCapabilities } from '../lib/business-permission-transaction'
import { hasCapability } from '../lib/business-permissions'
const router = Router()
router.get('/reconciliation', requireCapabilities('finance.revenue.read'), async (req: any, res) => {
  try {
    if (req.query.format === 'csv' && !hasCapability(req, 'exports.read')) throw new BusinessPermissionError()
    const { period, dates } = journalPeriod(req.query)
    const result = await prisma.$transaction(async tx => {
      await assertTransactionCapabilities(tx, req, 'finance.revenue.read', ...(req.query.format === 'csv' ? ['exports.read' as const] : []))
      const where = { companyId: req.companyId }, take = 5001
      const [orders, sales, invoices, credits, tenders, settlements, refunds, manualRefunds, movements, drawers, payouts] = await Promise.all([
        tx.order.findMany({ where, take, select: { id: true, status: true, paidAt: true, createdAt: true, total: true, subtotal: true, taxAmount: true } }),
        tx.posSale.findMany({ where, take, select: { id: true, createdAt: true, snapshot: true } }),
        tx.invoice.findMany({ where, take, select: { id: true, number: true, orderId: true, sourcePosSaleId: true, currency: true, total: true, issuedAt: true } }),
        tx.creditNote.findMany({ where, take, select: { id: true, invoiceId: true, currency: true, totalCents: true, baseCents: true, taxCents: true, createdAt: true } }),
        tx.orderTender.findMany({ where, take }), tx.paymentSettlement.findMany({ where, take }), tx.refundAttempt.findMany({ where, take }), tx.manualRefund.findMany({ where, take }),
        tx.cashMovement.findMany({ where, take }), tx.cashDrawer.findMany({ where, take }),
        tx.bankPayout.findMany({ where, take, include: { lines: true } }),
      ])
      const data = { orders, sales, invoices, credits, tenders, settlements, refunds, manualRefunds, movements, drawers, payouts }
      if (Object.values(data).some(list => list.length > 5000)) throw new Error('Périmètre trop large : pagination qualifiée nécessaire')
      if ([...invoices, ...credits, ...settlements].some(row => row.currency !== req.company.currency)) throw new Error('Plusieurs devises : rapprochement séparé requis')
      // Ne jamais exporter PDF, noms clients, secrets ou preuves brutes : DTO explicite seulement.
      return reconciliation(data, dates)
    }, { isolationLevel: 'RepeatableRead', timeout: 15000 })
    res.set('Cache-Control', 'private, no-store')
    if (req.query.format === 'csv') return void res.type('text/csv; charset=utf-8').set('Content-Disposition', 'attachment; filename="rapprochement-creorga-v1.csv"').send(reconciliationCsv(result))
    res.json({ ...result, period })
  } catch (error) {
    if (error instanceof BusinessPermissionError) return void res.status(403).json({ message: error.message })
    res.status(409).json({ code: 'RECONCILIATION_INCOMPLETE', message: 'Rapprochement non produit : période invalide, données indisponibles ou périmètre supérieur à 5000 éléments par journal. Aucun export partiel annoncé comme complet.' })
  }
})
export default router
