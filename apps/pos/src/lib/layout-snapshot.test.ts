import { describe, expect, it } from 'vitest'
import { makeTable } from '../store/posStore'
import { parseLayout, layoutSnapshot, restoreLayout, appendLayoutHistory } from './layout-snapshot'

const room = { id: 'salle', label: 'Salle', color: '#123456', x: 0, y: 0, w: 500, h: 500 }
const table = () => makeTable('table', 'Table FICTIF', 'round', 2, 100, 100, 'salle')
const snapshot = () => ({ tables: [table()], rooms: [room], fixtures: [] })

describe('plan géométrique séparé des ventes', () => {
  it('conserve l’état réellement obtenu pour annuler puis rétablir une seule opération', () => {
    const initial = layoutSnapshot(snapshot()), added = layoutSnapshot({ ...snapshot(), tables: [table(), { ...table(), id: 'deux' }] })
    const recorded = appendLayoutHistory({ entries: [initial], index: 0 }, added)
    expect(recorded.index).toBe(1)
    expect(recorded.entries[0].tables.map(t => t.id)).toEqual(['table'])
    expect(recorded.entries[1].tables.map(t => t.id)).toEqual(['table', 'deux'])
    expect(appendLayoutHistory(recorded, added)).toEqual(recorded)
    const branched = appendLayoutHistory({ ...recorded, index: 0 }, { ...initial, tables: [{ ...initial.tables[0], x: 500 }] })
    expect(branched.entries).toHaveLength(2)
    expect(branched.entries[1].tables.map(t => t.id)).toEqual(['table'])
    expect(branched.entries[1].tables[0].x).toBe(500)
  })
  it('rejette le JSON partiellement invalide avant toute transformation du plan', () => {
    expect(() => parseLayout({ tables: {}, fixtures: [] }, [room], [])).toThrow()
    expect(() => parseLayout({ ...snapshot(), tables: [table(), { ...table(), id: 'autre', x: null }] }, [room], [])).toThrow()
    expect(() => parseLayout({ ...snapshot(), tables: [table(), table()] }, [room], [])).toThrow()
    expect(() => parseLayout({ ...snapshot(), fixtures: [{ id: 'f', type: 'inconnue', x: 1, y: 1, rotation: 0 }] }, [room], ['chaise'])).toThrow()
  })
  it('réimporte un objet valide dont l’étiquette facultative a été effacée', () => {
    const parsed = parseLayout({ ...snapshot(), fixtures: [{ id: 'f', type: 'chaise', x: 10, y: 20, rotation: 0, label: '' }] }, [room], ['chaise'])
    expect(parsed.fixtures[0].label).toBe('')
  })
  it('importe uniquement la géométrie, jamais une vente ou un paiement inclus dans le fichier', () => {
    const incoming = { ...table(), covers: [{ id: 'vol', items: [] }], orderNote: 'privé', orderDiscount: { type: 'amount', value: 90 }, status: 'occupied' }
    const parsed = parseLayout({ tables: [incoming], fixtures: [], rooms: [room] }, [room], [])
    expect(parsed.tables[0]).toEqual({ id: 'table', name: 'Table FICTIF', shape: 'round', seats: 2, x: 100, y: 100, section: 'salle', rotation: 0 })
    const result = restoreLayout([], parsed)
    expect(result.tables[0].covers).toEqual([])
    expect(result.tables[0].status).toBe('available')
    expect(result.tables[0].orderDiscount).toBeUndefined()
  })
  it('annuler la géométrie conserve une commande arrivée après la capture historique', () => {
    const old = layoutSnapshot(snapshot())
    const current = { ...table(), x: 250, status: 'occupied' as const, kitchenNote: 'sans sel', covers: [{ id: 'nouveau-groupe', label: 'Groupe', payment: { orderId: 'commande', totalCents: 990, paidCents: 100, outstandingCents: 890 }, items: [{ id: 'ligne', menuItemId: 'p', name: 'Café', qty: 3, price: 3.3, taxRate: 3, note: '', coverId: 'nouveau-groupe' }] }] }
    const result = restoreLayout([current], old)
    expect(result.tables[0].x).toBe(100)
    expect(result.tables[0].covers).toBe(current.covers)
    expect(result.tables[0].kitchenNote).toBe('sans sel')
    expect(result.tables[0].status).toBe('occupied')
    expect(old.tables[0]).not.toHaveProperty('covers')
  })
  it('refuse atomiquement de retirer une table ayant une session, une fusion ou des données client', () => {
    for (const protectedTable of [
      { ...table(), covers: [{ id: 'g', label: 'Groupe', items: [] }] },
      { ...table(), status: 'occupied' as const },
      { ...table(), mergedWith: ['autre'] },
      { ...table(), customerId: 'client' },
      { ...table(), barNote: 'Commande bar en cours' },
    ]) {
      const before = structuredClone(protectedTable)
      expect(() => restoreLayout([protectedTable], { tables: [], rooms: [room], fixtures: [] })).toThrow(/session|données|fusion/i)
      expect(protectedTable).toEqual(before)
    }
  })
  it('restaure une table graphique vide sans réintroduire son ancien contenu financier', () => {
    const old = layoutSnapshot(snapshot())
    const result = restoreLayout([], old)
    expect(result.tables[0]).toMatchObject({ id: 'table', name: 'Table FICTIF', covers: [], mergedWith: [], status: 'available' })
  })
  it('exclut les additions de chaise indépendante du décor et les conserve pendant une restauration graphique', () => {
    const seat = { ...table(), id: 'standalone-seat:chaise', section: 'Chaises indépendantes', status: 'occupied' as const, covers: [{ id: 'seat:chaise:1', label: 'Place', items: [] }] }
    const saved = layoutSnapshot({ ...snapshot(), tables: [table(), seat] })
    expect(saved.tables.map(t => t.id)).toEqual(['table'])
    expect(restoreLayout([table(), seat], saved).tables[1]).toBe(seat)
    expect(() => parseLayout({ ...snapshot(), tables: [{ ...table(), id: 'standalone-seat:chaise' }] }, [room], [])).toThrow(/chaise/i)
  })
})
