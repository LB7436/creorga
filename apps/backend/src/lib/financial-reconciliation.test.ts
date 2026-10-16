import { describe, expect, it } from 'vitest'
import { reconciliation, reconciliationCsv } from './financial-reconciliation'
const date = new Date('2026-10-16T12:00:00Z')
const fixture = () => ({ orders: [{ id: 'o', total: 11.7, subtotal: 10, taxAmount: 1.7, status: 'PAID', paidAt: date, createdAt: date }],
  sales: [{ id: 's', snapshot: { orderIds: ['o'], total: 11.7 }, createdAt: date }],
  invoices: [{ id: 'i', number: '=DANGER', orderId: null, sourcePosSaleId: 's', total: 11.7, issuedAt: date }],
  credits: [{ id: 'c', invoiceId: 'i', totalCents: 300, baseCents: 256, taxCents: 44, createdAt: date }],
  tenders: [{ id: 't', orderId: 'o', saleId: 's', amountCents: 1170, tipCents: 0, charityCents: 0, method: 'CASH', confirmation: 'manual_declaration', createdAt: date }],
  settlements: [], refunds: [], manualRefunds: [{ id: 'r', tenderId: 't', creditNoteId: 'c', amountCents: 300, method: 'CASH', createdAt: date, cashMovementId: 'm' }],
  movements: [{ id: 'm', drawerId: 'd', amountCents: 300, direction: 'OUT', createdAt: date }], drawers: [] })
describe('Rapprochement sans double comptabilisation', () => {
  it('la facture depuis ticket ne rajoute pas une vente ; avoir et remboursement restent distincts', () => {
    const r = reconciliation(fixture())
    expect(r.totals).toMatchObject({ finalizedSalesCents: 1170, salesBaseCents: 1000, salesTaxCents: 170, creditDocumentsCents: 300,
      receiptsCents: 1170, declaredRefundsCents: 300, cashNetMovementCents: 870 })
    expect(r.rows.filter((r: any) => r.kind === 'INVOICE')[0].salesCents).toBe(0)
    expect(r.rows.filter((r: any) => r.id === 'm')[0].cashDeltaCents).toBe(0)
    expect(r.payouts).toBeNull()
    expect(r.issues).toEqual([])
  })
  it('conserve frais/net inconnus et signale les affectations incohérentes', () => {
    const f: any = fixture(); f.tenders[0].amountCents = 1200
    f.settlements.push({ id: 'bank', orderId: 'o', amountCents: 1170, feesCents: null, netCents: null, createdAt: date })
    const r = reconciliation(f)
    expect(r.issues).toContain('ORDER_OVERALLOCATED:o')
    expect(r.totals.unknownFeesCount).toBe(1)
    expect(r.rows.find((r: any) => r.id === 'bank').feesCents).toBeNull()
  })
  it('exporte un CSV UTF-8 sans formule active ni double somme des documents', () => {
    const csv = reconciliationCsv(reconciliation(fixture()))
    expect(csv.startsWith('\ufeff')).toBe(true)
    expect(csv).toContain("'=DANGER")
    expect(csv).toContain('salesCents')
  })
  it('sépare le versement fictif des ventes et filtre aussi ses compteurs par période', () => {
    const data = { ...fixture(), payouts: [{ id: 'p', statementId: 's', externalRef: 'bank', declaredNetCents: 800, receivedCents: 800, receivedAt: date, createdAt: date, validatedAt: date }] }
    const current = reconciliation(data)
    expect(current.totals.finalizedSalesCents).toBe(1170)
    expect(current.totals.receiptsCents).toBe(1170)
    expect(current.payouts?.validatedReceivedCents).toBe(800)
    expect(reconciliation(data, { gte: new Date('2026-10-17T00:00:00Z') }).payouts?.importedCount).toBe(0)
  })
})
