import { Router } from 'express'
import prisma from '../lib/prisma'
import { reconciliation, reconciliationCsv } from '../lib/financial-reconciliation'
import { journalPeriod } from './documentJournal'
import { requireRole } from '../middleware/requireCompany'
const router = Router()
router.get('/reconciliation', requireRole('OWNER', 'MANAGER'), async (req: any, res) => {
  try {
    const { period, dates } = journalPeriod(req.query)
    const result = await prisma.$transaction(async tx => {
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
  } catch { res.status(409).json({ code: 'RECONCILIATION_INCOMPLETE', message: 'Rapprochement non produit : période invalide, données indisponibles ou périmètre supérieur à 5000 éléments par journal. Aucun export partiel annoncé comme complet.' }) }
})
export default router
