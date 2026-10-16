import { moneyMinor } from './money'

type Data = Record<'orders' | 'sales' | 'invoices' | 'credits' | 'tenders' | 'settlements' | 'refunds' | 'manualRefunds' | 'movements' | 'drawers', any[]>
/** Journal de rapprochement, pas déclaration fiscale. Les pièces ne sont jamais additionnées aux ventes. */
export function reconciliation(data: Data, dates: { gte?: Date; lte?: Date } = {}) {
  const rows: any[] = [], issues: string[] = []
  const inPeriod = (date: any) => date && (!dates.gte || new Date(date) >= dates.gte) && (!dates.lte || new Date(date) <= dates.lte)
  const add = (kind: string, id: string, date: any, values: any) => {
    if (inPeriod(date)) rows.push({ kind, id, date: new Date(date).toISOString(), salesCents: 0, salesBaseCents: 0, salesTaxCents: 0, documentCents: 0,
      receiptCents: 0, refundCents: 0, heldRefundCents: 0, cashDeltaCents: 0, feesCents: null, netCents: null, ...values })
  }
  for (const o of data.orders) {
    const tenders = data.tenders.filter(t => t.orderId === o.id), paid = tenders.reduce((n, t) => n + t.amountCents, 0), total = moneyMinor(o.total)
    if (paid > total) issues.push('ORDER_OVERALLOCATED:' + o.id)
    if ((o.paidAt || o.status === 'PAID') && tenders.length && paid !== total) issues.push('ORDER_SETTLED_MISMATCH:' + o.id)
    if ((o.paidAt || o.status === 'PAID') && !tenders.length) issues.push('LEGACY_PAYMENT_WITHOUT_LEDGER:' + o.id)
    if (moneyMinor(o.subtotal) + moneyMinor(o.taxAmount) !== total) issues.push('ORDER_TAX_MISMATCH:' + o.id)
    if (o.paidAt || o.status === 'PAID') add('SALE_ORDER', o.id, o.paidAt || o.createdAt, { salesCents: total, salesBaseCents: moneyMinor(o.subtotal), salesTaxCents: moneyMinor(o.taxAmount),
      refs: data.sales.filter(s => s.snapshot?.orderIds?.includes(o.id)).map(s => s.id).join('|'), status: tenders.length ? 'ledger' : 'legacy_no_tender' })
  }
  for (const s of data.sales) {
    if (!Array.isArray(s.snapshot?.orderIds) || !s.snapshot.orderIds.length) issues.push('TICKET_NO_ORDER_LINK:' + s.id)
    add('TICKET_REFERENCE', s.id, s.createdAt, { refs: (s.snapshot?.orderIds || []).join('|'), status: 'reference_not_additional_revenue', documentCents: moneyMinor(s.snapshot?.total || 0) })
  }
  for (const i of data.invoices) if (i.issuedAt) add('INVOICE', i.id, i.issuedAt, { number: i.number, refs: [i.orderId, i.sourcePosSaleId].filter(Boolean).join('|'),
    documentCents: moneyMinor(i.total), status: i.orderId || i.sourcePosSaleId ? 'linked_document_not_additional_revenue' : 'unlinked_document_accountant_review' })
  for (const c of data.credits) add('CREDIT_NOTE', c.id, c.createdAt, { refs: c.invoiceId, documentCents: -c.totalCents, creditBaseCents: c.baseCents, creditTaxCents: c.taxCents,
    status: 'document_correction_not_cash_refund' })
  for (const t of data.tenders) add('TENDER', t.id, t.createdAt, { refs: [t.orderId, t.saleId, t.attemptId, t.settlementId, t.cashDrawerId].filter(Boolean).join('|'),
    receiptCents: t.amountCents + t.tipCents + t.charityCents, foodCents: t.amountCents, tipCents: t.tipCents, charityCents: t.charityCents, method: t.method,
    cashDeltaCents: t.method === 'CASH' ? t.amountCents + t.tipCents + t.charityCents : 0, status: t.confirmation })
  for (const s of data.settlements) add('BANK_CAPTURE_REFERENCE', s.id, s.createdAt, { refs: [s.orderId, s.attemptId, s.captureId].filter(Boolean).join('|'),
    feesCents: s.feesCents ?? null, netCents: s.netCents ?? null, grossCents: s.amountCents, status: s.feesCents == null || s.netCents == null ? 'fees_net_unknown' : 'provider_data_not_bank_payout' })
  for (const r of data.refunds) add('PROVIDER_REFUND', r.id, r.confirmedAt || r.createdAt, { refs: [r.creditNoteId, r.settlementId].join('|'), refundCents: r.status === 'SUCCEEDED' ? r.amountCents : 0,
    heldRefundCents: r.status === 'SUCCEEDED' ? 0 : r.amountCents, status: r.status })
  for (const r of data.manualRefunds) add('DECLARED_REFUND', r.id, r.createdAt, { refs: [r.creditNoteId, r.tenderId, r.cashMovementId].filter(Boolean).join('|'), refundCents: r.amountCents,
    cashDeltaCents: r.method === 'CASH' ? -r.amountCents : 0, method: r.method, status: 'manual_declaration' })
  for (const m of data.movements) add('CASH_MOVEMENT', m.id, m.createdAt, { refs: m.drawerId, cashDeltaCents: data.manualRefunds.some(r => r.cashMovementId === m.id) ? 0 : (m.direction === 'OUT' ? -1 : 1) * m.amountCents,
    status: data.manualRefunds.some(r => r.cashMovementId === m.id) ? 'refund_reference_already_counted' : m.direction })
  for (const d of data.drawers) add('CASH_CLOSURE_REFERENCE', d.id, d.closedAt || d.openedAt, { countedCents: d.closeSnapshot?.countedCents ?? null,
    expectedCents: d.closeSnapshot?.expectedCents ?? null, discrepancyCents: d.closeSnapshot?.discrepancyCents ?? null, status: d.closedAt ? 'closed_frozen' : 'open' })
  const sum = (field: string, kind?: string) => rows.filter(r => !kind || r.kind === kind).reduce((n, r) => n + (r[field] || 0), 0)
  return { version: 1, basis: 'finalized_paid_orders_documents_separate_not_certified_accounting', rows, issues,
    totals: { finalizedSalesCents: sum('salesCents'), salesBaseCents: sum('salesBaseCents'), salesTaxCents: sum('salesTaxCents'), creditDocumentsCents: -sum('documentCents', 'CREDIT_NOTE'),
      receiptsCents: sum('receiptCents'), declaredRefundsCents: sum('refundCents', 'DECLARED_REFUND'), verifiedRefundsCents: sum('refundCents', 'PROVIDER_REFUND'), heldRefundsCents: sum('heldRefundCents'),
      cashNetMovementCents: sum('cashDeltaCents'), knownFeesCents: sum('feesCents'), unknownFeesCount: rows.filter(r => r.kind === 'BANK_CAPTURE_REFERENCE' && r.feesCents == null).length },
    payouts: null, warning: 'Versements bancaires non intégrés ; absence de montant = inconnu, pas zéro. Les factures et tickets ne s’ajoutent pas aux ventes. Avoirs fiscaux et remboursements séparés. Reconnaissance des créances et écritures comptables à qualifier avec le comptable.' }
}
export function reconciliationCsv(report: ReturnType<typeof reconciliation>) {
  const columns = ['kind', 'id', 'date', 'number', 'refs', 'status', 'method', 'salesCents', 'salesBaseCents', 'salesTaxCents', 'documentCents', 'creditBaseCents', 'creditTaxCents', 'receiptCents', 'foodCents', 'tipCents', 'charityCents', 'refundCents', 'heldRefundCents', 'cashDeltaCents', 'grossCents', 'feesCents', 'netCents', 'countedCents', 'expectedCents', 'discrepancyCents']
  const cell = (v: unknown) => { let s = v == null ? '' : String(v); if (typeof v === 'string' && /^[\s]*[=+\-@\t\r]/.test(s)) s = "'" + s; return '"' + s.replace(/"/g, '""') + '"' }
  return '\ufeff' + [columns, ...report.rows.map(r => columns.map(c => r[c]))].map(row => row.map(cell).join(';')).join('\r\n')
}
