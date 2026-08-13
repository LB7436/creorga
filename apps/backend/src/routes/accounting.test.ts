import { describe, it, expect } from 'vitest'
import { especesEncaissees } from './accounting'

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
