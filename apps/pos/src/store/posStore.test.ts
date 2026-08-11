import { describe, it, expect, beforeEach } from 'vitest'
import { usePOS, ventilationTva, totalCouvert, type Cover } from './posStore'

/**
 * Ces tests couvrent l'endroit exact où la caisse perdait de l'argent.
 *
 * `processPayment` ignorait ses arguments et appelait `closeTable`, qui vide
 * `covers`. Régler la part d'une seule personne effaçait donc la commande de
 * toute la table : les consommations des autres disparaissaient sans jamais
 * être encaissées, en plein service, sans le moindre message.
 *
 * Le premier test échoue si l'on revient à ce comportement.
 */

const item = (name: string, price: number, qty: number, coverId: string) => ({
  id: `it-${name}-${coverId}`,
  menuItemId: 'm1',
  name,
  price,
  qty,
  note: '',
  coverId,
})

function tableDeTest() {
  const covers: Cover[] = [
    { id: 'c1', label: 'Couvert 1', items: [item('Café', 2.8, 2, 'c1')] },          // 5,60
    { id: 'c2', label: 'Couvert 2', items: [item('Bière', 4.5, 1, 'c2')] },         // 4,50
    { id: 'c3', label: 'Couvert 3', items: [item('Croque', 9.0, 1, 'c3')] },        // 9,00
  ]
  return {
    id: 't-test',
    name: 'Table test',
    shape: 'round' as const,
    seats: 4,
    x: 0,
    y: 0,
    status: 'occupied' as const,
    covers,
    openedAt: 1_786_000_000_000,
    section: 'Salle',
    mergedWith: [],
  }
}

beforeEach(() => {
  usePOS.setState({
    tables: [tableDeTest()],
    ventes: [],
    clotures: [],
    currentStaff: { id: 's1', name: 'Lara', pin: '0000', role: 'WAITER', color: '#fff' },
    settings: { restaurantName: 'Test', currency: '€', taxRate: 17, defaultTip: 0, tipPresets: [] },
  })
})

const table = () => usePOS.getState().tables.find(t => t.id === 't-test')!

describe('paiement par couvert', () => {
  it('ne fait PAS disparaitre les couverts qui n ont pas paye', () => {
    usePOS.getState().processPayment('t-test', 'card', 0, ['c1'])

    const t = table()
    expect(t.covers).toHaveLength(3)

    const regle = t.covers.find(c => c.id === 'c1')!
    expect(regle.paidAt).toBeTypeOf('number')
    // Le couvert réglé GARDE ses lignes : c'est la preuve de ce qui a été vendu.
    expect(regle.items).toHaveLength(1)

    // Et surtout : les deux autres sont intacts et toujours dus.
    const restants = t.covers.filter(c => !c.paidAt)
    expect(restants.map(c => c.id)).toEqual(['c2', 'c3'])
    expect(restants.reduce((s, c) => s + totalCouvert(c), 0)).toBeCloseTo(13.5, 2)
  })

  it('libere la table seulement quand tout est regle', () => {
    usePOS.getState().processPayment('t-test', 'cash', 0, ['c1'])
    expect(table().status).toBe('occupied')

    usePOS.getState().processPayment('t-test', 'cash', 0, ['c2'])
    expect(table().status).toBe('occupied')

    usePOS.getState().processPayment('t-test', 'cash', 0, ['c3'])
    // Tout est payé : la table peut enfin être libérée.
    expect(table().status).toBe('dirty')
    expect(table().covers).toHaveLength(0)
  })

  it('sans selection, regle tout ce qui reste du', () => {
    usePOS.getState().processPayment('t-test', 'card', 0, ['c1'])
    usePOS.getState().processPayment('t-test', 'cash', 0)

    expect(table().status).toBe('dirty')
    const ventes = usePOS.getState().ventes
    expect(ventes).toHaveLength(2)
    // La seconde vente ne réencaisse pas le couvert déjà réglé.
    expect(ventes[0].couverts).toEqual(['Couvert 2', 'Couvert 3'])
  })

  it('ne reencaisse jamais un couvert deja paye', () => {
    usePOS.getState().processPayment('t-test', 'card', 0, ['c1'])
    const avant = usePOS.getState().ventes.length

    usePOS.getState().processPayment('t-test', 'card', 0, ['c1'])
    expect(usePOS.getState().ventes).toHaveLength(avant)
  })
})

describe('liberation de table', () => {
  it('refuse d effacer une table qui a des consommations non reglees', () => {
    const libere = usePOS.getState().closeTable('t-test')
    expect(libere).toBe(false)
    expect(table().covers).toHaveLength(3)
  })

  it('accepte si on force explicitement (table abandonnee)', () => {
    const libere = usePOS.getState().closeTable('t-test', { forcer: true })
    expect(libere).toBe(true)
    expect(table().covers).toHaveLength(0)
  })
})

describe('journal des ventes', () => {
  it('inscrit la vente avec ses lignes, son vendeur et son moyen de paiement', () => {
    usePOS.getState().processPayment('t-test', 'contactless', 2, ['c3'])

    const v = usePOS.getState().ventes[0]
    expect(v.numero).toBe(1)
    expect(v.tableName).toBe('Table test')
    expect(v.vendeur).toBe('Lara')
    expect(v.methode).toBe('contactless')
    expect(v.lignes).toEqual([{ name: 'Croque', qty: 1, price: 9 }])
    expect(v.pourboire).toBe(2)
    expect(v.total).toBeCloseTo(11, 2)
  })

  it('numerote les ventes en continu', () => {
    usePOS.getState().processPayment('t-test', 'cash', 0, ['c1'])
    usePOS.getState().processPayment('t-test', 'cash', 0, ['c2'])
    expect(usePOS.getState().ventes.map(v => v.numero)).toEqual([2, 1])
  })
})

describe('cloture de journee (ticket Z)', () => {
  it('totalise les ventes, separe les pourboires et repart a zero', () => {
    usePOS.getState().processPayment('t-test', 'cash', 1, ['c1'])   // 5,60 + 1
    usePOS.getState().processPayment('t-test', 'card', 0, ['c2'])   // 4,50

    const z = usePOS.getState().cloturerJournee()!
    expect(z.nbVentes).toBe(2)
    expect(z.totalTTC).toBeCloseTo(10.1, 2)          // hors pourboires
    expect(z.totalPourboires).toBeCloseTo(1, 2)
    expect(z.parMethode.cash).toBeCloseTo(6.6, 2)    // pourboire compris
    expect(z.parMethode.card).toBeCloseTo(4.5, 2)

    // Le journal repart vide, mais la clôture est conservée.
    expect(usePOS.getState().ventes).toHaveLength(0)
    expect(usePOS.getState().clotures).toHaveLength(1)
    expect(usePOS.getState().clotures[0].ventes).toHaveLength(2)
  })

  it('ne produit pas de ticket Z vide', () => {
    expect(usePOS.getState().cloturerJournee()).toBeNull()
    expect(usePOS.getState().clotures).toHaveLength(0)
  })
})

describe('verrou du code PIN', () => {
  beforeEach(() => {
    usePOS.setState({
      staff: [{ id: 's1', name: 'Lara', pin: '1234', role: 'WAITER', color: '#fff' }],
      currentStaff: null,
      echecsPin: 0,
      pinBloqueJusqua: 0,
    })
  })

  it('bloque reellement la saisie apres 5 codes errones', () => {
    for (let i = 0; i < 5; i++) expect(usePOS.getState().loginStaff('0000')).toBe(false)

    // Le blocage doit exister, et durer.
    expect(usePOS.getState().pinBloqueJusqua).toBeGreaterThan(Date.now())

    // Et surtout : même le BON code est refusé pendant le blocage. Sans cela,
    // le compteur ne serait qu'un affichage, comme avant.
    expect(usePOS.getState().loginStaff('1234')).toBe(false)
    expect(usePOS.getState().currentStaff).toBeNull()
  })

  it('remet le compteur a zero apres une connexion reussie', () => {
    usePOS.getState().loginStaff('0000')
    usePOS.getState().loginStaff('0000')
    expect(usePOS.getState().echecsPin).toBe(2)

    expect(usePOS.getState().loginStaff('1234')).toBe(true)
    expect(usePOS.getState().echecsPin).toBe(0)
    expect(usePOS.getState().pinBloqueJusqua).toBe(0)
  })

  it('laisse passer tant que le seuil n est pas atteint', () => {
    for (let i = 0; i < 4; i++) usePOS.getState().loginStaff('0000')
    expect(usePOS.getState().pinBloqueJusqua).toBe(0)
    expect(usePOS.getState().loginStaff('1234')).toBe(true)
  })
})

describe('TVA', () => {
  // Le taux est un POURCENTAGE (17), jamais une fraction (0,17) — CLAUDE.md.
  it('extrait la TVA d un prix TTC au lieu de l ajouter', () => {
    // 117 € TTC à 17 % = 100 € HT + 17 € de TVA.
    expect(ventilationTva(117, 17)).toEqual({ ht: 100, tva: 17 })
  })

  it('ne double jamais le montant', () => {
    const { ht, tva } = ventilationTva(100, 17)
    expect(ht + tva).toBeCloseTo(100, 2)
  })

  it('echoue si le taux etait traite comme une fraction', () => {
    // Avec l'ancienne formule (total * taxRate), 100 € à 17 aurait donné
    // 1700 € de TVA. Ce test verrouille l'interprétation en pourcentage.
    expect(ventilationTva(100, 17).tva).toBeLessThan(20)
  })

  it('taux a zero : pas de TVA, et le HT vaut le TTC', () => {
    expect(ventilationTva(42.5, 0)).toEqual({ ht: 42.5, tva: 0 })
  })
})
