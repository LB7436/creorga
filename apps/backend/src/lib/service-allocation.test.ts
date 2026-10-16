import { describe, expect, it } from 'vitest'
import { buildFinancialAllocation } from './service-allocation'

const order = { id: 'qr-origin', total: 10, subtotal: 9.71, taxAmount: .29, items: [{ id: 'coffee', productId: 'p', productName: 'Café', quantity: 3, unitPrice: 3.5, taxRate: 3, notes: 'Sans sucre' }] }
const groups = ['a', 'b', 'c'].map(key => ({ key, tableId: key, label: key, kitchenNote: '', barNote: '', lines: [{ itemId: 'coffee', qty: 1 }] }))
describe('Allocation financière : quantités, centimes et provenance', () => {
  it('répartit 50 centimes de remise et 29 de TVA sans créer de centime, indépendamment de l’ordre de saisie', () => {
    const plan = buildFinancialAllocation(order, groups, [], [])
    expect(plan.groups.map(g => [g.key, g.totalCents, g.discountCents, g.taxCents, g.outstandingCents])).toEqual([
      ['a', 334, 16, 10, 334], ['b', 333, 17, 10, 333], ['c', 333, 17, 9, 333],
    ])
    expect(buildFinancialAllocation(order, [...groups].reverse(), [], [])).toEqual(plan)
    expect(plan.groups[0].lines[0]).toMatchObject({ itemId: 'coffee', price: 3.5, taxRate: 3, note: 'Sans sucre', qty: 1 })
  })
  it('exige une décision exacte pour chaque acompte et interdit de surpayer un groupe', () => {
    const tender = { id: 'deposit-origin', amountCents: 500 }
    expect(() => buildFinancialAllocation(order, groups, [tender], [])).toThrow(/acompte|règlement/i)
    const choices = [{ tenderId: tender.id, parts: [{ groupKey: 'a', amountCents: 200 }, { groupKey: 'b', amountCents: 300 }] }]
    const plan = buildFinancialAllocation(order, groups, [tender], choices)
    expect(plan.groups.map(g => g.outstandingCents)).toEqual([134, 33, 333])
    expect(plan.tenderParts).toEqual([{ tenderId: tender.id, groupKey: 'a', amountCents: 200 }, { tenderId: tender.id, groupKey: 'b', amountCents: 300 }])
    expect(() => buildFinancialAllocation(order, groups, [tender], [{ tenderId: tender.id, parts: [{ groupKey: 'a', amountCents: 500 }] }])).toThrow(/supérieur|dépasse/i)
  })
  it('refuse quantité perdue, doublon de groupe et historique fiscal incohérent', () => {
    expect(() => buildFinancialAllocation(order, groups.slice(1), [], [])).toThrow(/quantité/i)
    expect(() => buildFinancialAllocation(order, [groups[0], groups[0], groups[2]], [], [])).toThrow(/groupe/i)
    expect(() => buildFinancialAllocation({ ...order, taxAmount: .3 }, groups, [], [])).toThrow(/historique/i)
  })
  it('conserve séparément deux taux et les consignes de chaque groupe après une découpe partielle', () => {
    const mixed = { id: 'mixed', total: 15.6, subtotal: 15, taxAmount: .6, items: [
      { id: 'a', productId: 'p', productName: 'Eau', quantity: 2, unitPrice: 5.15, taxRate: 3 },
      { id: 'b', productId: 'q', productName: 'Autre', quantity: 1, unitPrice: 5.3, taxRate: 6 },
    ] }
    const plan = buildFinancialAllocation(mixed, [
      { key: 'x', tableId: 'same', label: 'X', kitchenNote: 'Sans sel', barNote: 'Sans glace', lines: [{ itemId: 'a', qty: 1 }] },
      { key: 'y', tableId: 'same', label: 'Y', kitchenNote: 'Normal', barNote: 'Avec glace', lines: [{ itemId: 'a', qty: 1 }, { itemId: 'b', qty: 1 }] },
    ], [], [])
    expect(plan.groups.map(g => [g.totalCents, g.taxCents])).toEqual([[515, 15], [1045, 45]])
    expect(plan.groups[0].kitchenNote).toBe('Sans sel')
    expect(plan.groups[1].barNote).toBe('Avec glace')
    expect(plan.taxGroups).toEqual([{ taxRate: 3, baseCents: 1000, taxCents: 30, totalCents: 1030 }, { taxRate: 6, baseCents: 500, taxCents: 30, totalCents: 530 }])
  })
})
