import { describe, expect, it } from 'vitest'
import { calculateSale, checkoutSchema, posTableSchema, buildClosure, receiptHtml } from './pos-ledger'

describe('Journal serveur de caisse', () => {
  it('extrait la TVA TTC par produit et préserve les centimes', () => {
    expect(calculateSale([{ price: 11.7, qty: 1, taxRate: 17 }, { price: 10.3, qty: 1, taxRate: 3 }], 0, 2, 1))
      .toEqual({ brut: 22, sousTotal: 20, tva: 2, total: 25 })
  })
  it('applique une remise à la base taxable, pas au pourboire', () => {
    expect(calculateSale([{ price: 117, qty: 1, taxRate: 17 }], 11.7, 5, 0)).toEqual({ brut: 117, sousTotal: 90, tva: 15.3, total: 110.3 })
  })
  it('refuse les quantités extrêmes, NaN et les demandes sans référence', () => {
    expect(checkoutSchema.safeParse({ tableId: '1', method: 'cash', tip: NaN }).success).toBe(false)
    expect(posTableSchema.safeParse({ id: '1', covers: [{ items: [{ qty: 100 }] }] }).success).toBe(false)
    expect(() => calculateSale([], 0, 0, 0)).toThrow()
  })
  it('ne compte ni pourboires ni dons comme chiffre d’affaires', () => {
    const sale = { horodatage: 1, total: 25, sousTotal: 20, tva: 2, pourboire: 2, arrondiCaritatif: 1, remises: [], reglements: [{ methode: 'cash', montant: 10 }, { methode: 'card', montant: 15 }] }
    const closure = buildClosure([sale], 'close', 2)
    expect(closure.totalTTC).toBe(22)
    expect(closure.parMethode).toEqual({ cash: 10, card: 15, contactless: 0 })
  })
  it('échappe les noms dans le véritable ticket', () => {
    const html = receiptHtml({ id: 'sale', numero: 1, horodatage: 0, tableName: '<script>x</script>', lignes: [], remises: [], sousTotal: 10, tva: 0, pourboire: 0, arrondiCaritatif: 0, total: 10, reglements: [] }, { name: 'A & B' })
    expect(html).not.toContain('<script>')
    expect(html).toContain('A &amp; B')
    expect(html).toContain('10,00')
  })
})
