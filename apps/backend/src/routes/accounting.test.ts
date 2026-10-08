import { describe, it, expect } from 'vitest'
import { especesEncaissees, taxReportFromOrders } from './accounting'

// Preuve du correctif « totalSales jamais alimenté » : l'écart de clôture
// doit reposer sur les espèces réellement entrées dans le tiroir, pas sur 0,
// et pas non plus sur le total toutes cartes confondues.
describe('especesEncaissees', () => {
  it("ne compte que l'argent réellement entré dans le tiroir", () => {
    expect(
      especesEncaissees([
        { total: 50, paymentMethod: 'CASH', cashReceived: 60 }, // rendu 10 € → net 50
        { total: 30, paymentMethod: 'CARD', cashReceived: null }, // carte : rien au tiroir
        { total: 40, paymentMethod: 'MIXED', cashReceived: 15 }, // seule la part espèces
        { total: 20, paymentMethod: null, cashReceived: null }, // commande sans moyen connu
      ]),
    ).toBe(65)
  })

  it('arrondit au centime (0.1 + 0.2 ne doit pas donner 0.30000000000000004)', () => {
    expect(
      especesEncaissees([
        { total: 10.1, paymentMethod: 'CASH', cashReceived: null },
        { total: 0.2, paymentMethod: 'CASH', cashReceived: null },
      ]),
    ).toBe(10.3)
  })

  it('vaut 0 sans vente', () => {
    expect(especesEncaissees([])).toBe(0)
  })

  it('ignore un cashReceived absent sur une vente mixte', () => {
    expect(especesEncaissees([{ total: 25, paymentMethod: 'MIXED', cashReceived: null }])).toBe(0)
  })
})

describe('Ventilation fiscale des ventes TTC enregistrées', () => {
  const line = (unitPrice: number, taxRate: number) => ({ unitPrice, quantity: 1, taxRate })
  it('extrait la TVA du TTC au lieu de la rajouter', () => {
    expect(taxReportFromOrders([{ id: 'cafe', total: 11.7, subtotal: 10, taxAmount: 1.7, items: [line(11.7, 17)] }]))
      .toEqual({ totalRevenue: 10, totalTax: 1.7, totalWithTax: 11.7, orderCount: 1, byTaxRate: { '17%': { base: 10, tax: 1.7, total: 11.7 } } })
  })
  it('déduit le rendu d’un règlement mixte et inclut les espèces réellement conservées', () => {
    expect(especesEncaissees([{ total: 11.7, paymentMethod: 'MIXED', cashReceived: 20, cashChange: 15 }])).toBe(5)
    expect(especesEncaissees([{ total: 11.7, paymentMethod: 'CASH', cashReceived: 15, cashChange: 1.3 }])).toBe(13.7)
  })
  it('répartit la remise réellement enregistrée entre les taux au centime', () => {
    const report = taxReportFromOrders([{ id: 'mixte', total: 19.8, subtotal: 18, taxAmount: 1.8, items: [line(11.7, 17), line(10.3, 3)] }])
    expect(report.totalWithTax).toBe(19.8)
    expect(report.byTaxRate).toEqual({ '3%': { base: 9, tax: 0.27, total: 9.27 }, '17%': { base: 9, tax: 1.53, total: 10.53 } })
  })
  it('préserve les petits arrondis par groupe et additionne en centimes', () => {
    const orders = Array.from({ length: 3 }, (_, i) => ({ id: String(i), total: 0.06, subtotal: 0.06, taxAmount: 0, items: [line(0.03, 17), line(0.03, 3)] }))
    expect(taxReportFromOrders(orders).totalWithTax).toBe(0.18)
    expect(taxReportFromOrders(orders).totalTax).toBe(0)
  })
  it('refuse de réinterpréter silencieusement une vente historique incompatible', () => {
    expect(() => taxReportFromOrders([{ id: 'ancien-ht', total: 13.69, subtotal: 11.7, taxAmount: 1.99, items: [line(11.7, 17)] }]))
      .toThrow('ancien-ht')
    expect(() => taxReportFromOrders([{ id: 'tva-incoherente', total: 11.7, subtotal: 11.7, taxAmount: 0, items: [line(11.7, 17)] }]))
      .toThrow('tva-incoherente')
  })
})
