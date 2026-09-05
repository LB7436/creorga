import { describe, it, expect, vi } from 'vitest'
import { PDFDocument } from 'pdf-lib'
import { invoicePdf, invoiceFontPath } from './invoice-pdf'
import { invoiceTransitionAllowed } from './invoice-status'
describe('Factures réellement téléchargeables', () => {
  it('retrouve sa police même si le service démarre depuis un autre dossier', () => {
    const cwd = vi.spyOn(process, 'cwd').mockReturnValue('/dossier-independant')
    try { expect(invoiceFontPath()).toMatch(/NotoSans-Regular\.ttf$/) } finally { cwd.mockRestore() }
  })
  it('produit un PDF ouvrable, paginé, avec noms accentués', async () => {
    const bytes = await invoicePdf({ number: 'INV-TEST-001', status: 'DRAFT', createdAt: new Date(), company: { name: 'Café de l’Étoile' }, customer: { firstName: 'Émilie', lastName: 'Müller' }, subtotal: 500, taxAmount: 85, total: 585,
      items: Array.from({ length: 40 }, (_, i) => ({ description: `Prestation ${i + 1} — Crème brûlée`, quantity: 1, unitPrice: 12.5, taxRate: 17 })),
    })
    expect(bytes.subarray(0, 5).toString()).toBe('%PDF-')
    const doc = await PDFDocument.load(bytes)
    expect(doc.getPageCount()).toBeGreaterThan(1)
    expect(doc.getTitle()).toBe('Facture INV-TEST-001')
  })
  it('préserve les factures payées et annulées', () => {
    expect(invoiceTransitionAllowed('PAID', 'DRAFT')).toBe(false)
    expect(invoiceTransitionAllowed('PAID', 'SENT')).toBe(false)
    expect(invoiceTransitionAllowed('CANCELLED', 'PAID')).toBe(false)
    expect(invoiceTransitionAllowed('SENT', 'PAID')).toBe(true)
    expect(invoiceTransitionAllowed('DRAFT', 'SENT')).toBe(true)
  })
})
