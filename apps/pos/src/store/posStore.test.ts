import { describe, it, expect, beforeEach } from 'vitest'
import { usePOS, ventilationTva, totalCouvert, migrerEtatPersistant, type Cover } from './posStore'

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

/**
 * Remises, règlements mixtes et fermeture de table — les trois endroits où
 * ce qui était affiché au client ne correspondait pas à ce qui entrait au
 * journal. Chaque test échoue sur l'ancien comportement.
 */
describe('remises comptabilisees', () => {
  it('une remise reduit le total ENCAISSE, pas seulement l affichage', () => {
    // Table de test : 5,60 + 4,50 + 9,00 = 19,10 € brut.
    const vente = usePOS.getState().processPayment('t-test', 'card', 0, undefined, {
      remises: [{ type: 'promo', libelle: '-10 %', montant: 1.91 }],
    })!
    expect(vente.brut).toBe(19.10)
    expect(vente.remises).toHaveLength(1)
    // L'ancien code enregistrait 19,10 : la remise n'existait qu'à l'écran.
    expect(vente.total).toBe(17.19)
  })

  it('la TVA est calculee sur le net apres remise (base imposable reelle)', () => {
    const vente = usePOS.getState().processPayment('t-test', 'cash', 0, undefined, {
      remises: [{ type: 'carte_cadeau', libelle: 'Bon 10 €', montant: 10 }],
    })!
    // 19,10 - 10 = 9,10 TTC -> HT 7,78, TVA 1,32
    expect(vente.sousTotal + vente.tva).toBeCloseTo(9.10, 2)
    expect(vente.tva).toBeCloseTo(1.32, 2)
  })

  it('une remise superieure a l addition ne cree jamais un total negatif', () => {
    const vente = usePOS.getState().processPayment('t-test', 'cash', 0, undefined, {
      remises: [{ type: 'carte_cadeau', libelle: 'Bon 50 €', montant: 50 }],
    })!
    expect(vente.total).toBe(0)
    expect(vente.sousTotal).toBe(0)
  })

  it('l arrondi caritatif est encaisse mais n entre pas dans le chiffre d affaires', () => {
    const vente = usePOS.getState().processPayment('t-test', 'card', 0, undefined, {
      arrondiCaritatif: 0.90,
    })!
    expect(vente.total).toBe(20.00)
    const z = usePOS.getState().cloturerJournee()!
    expect(z.totalTTC).toBe(19.10)            // le CA, sans l'arrondi
    expect(z.totalArrondisCaritatifs).toBe(0.90)
  })

  it('le ticket Z totalise les remises accordees dans la journee', () => {
    usePOS.getState().processPayment('t-test', 'card', 0, undefined, {
      remises: [{ type: 'membre', libelle: 'Membre -10 %', montant: 1.91 }],
    })
    const z = usePOS.getState().cloturerJournee()!
    expect(z.totalRemises).toBe(1.91)
    expect(z.totalTTC).toBe(17.19)
  })
})

describe('reglement mixte', () => {
  it('ventile le ticket Z sur chaque moyen de paiement, pas sur le seul principal', () => {
    usePOS.getState().processPayment('t-test', 'card', 0, undefined, {
      reglements: [
        { methode: 'cash', montant: 10 },
        { methode: 'card', montant: 9.10 },
      ],
    })
    const z = usePOS.getState().cloturerJournee()!
    // L'ancien code mettait les 19,10 en « carte » et 0 en espèces.
    expect(z.parMethode.cash).toBe(10)
    expect(z.parMethode.card).toBe(9.10)
    expect(z.parMethode.contactless).toBe(0)
  })

  it('la methode principale est la plus grosse part', () => {
    const vente = usePOS.getState().processPayment('t-test', 'card', 0, undefined, {
      reglements: [
        { methode: 'cash', montant: 15 },
        { methode: 'card', montant: 4.10 },
      ],
    })!
    expect(vente.methode).toBe('cash')
  })

  it('refuse un reglement mixte dont les parts ne font pas le total', () => {
    expect(() =>
      usePOS.getState().processPayment('t-test', 'card', 0, undefined, {
        reglements: [{ methode: 'cash', montant: 5 }, { methode: 'card', montant: 5 }],
      })
    ).toThrow(/incohérent/)
    // Et rien n'a été inscrit au journal.
    expect(usePOS.getState().ventes).toHaveLength(0)
    expect(table().covers.every(c => !c.paidAt)).toBe(true)
  })
})

describe('fermer la table ne contourne plus la protection', () => {
  it('setTableStatus refuse « dirty » sur une table impayee', () => {
    const ok = usePOS.getState().setTableStatus('t-test', 'dirty')
    expect(ok).toBe(false)
    expect(table().status).toBe('occupied')
    // Les consommations sont toujours là, encaissables.
    expect(table().covers.flatMap(c => c.items)).toHaveLength(3)
  })

  it('setTableStatus refuse « available » sur une table impayee', () => {
    expect(usePOS.getState().setTableStatus('t-test', 'available')).toBe(false)
    expect(table().status).toBe('occupied')
  })

  it('setTableStatus accepte « dirty » une fois tout regle', () => {
    usePOS.getState().processPayment('t-test', 'card', 0)
    // processPayment a déjà libéré la table (dirty, covers vidés) ; on
    // vérifie que le statut reste modifiable librement ensuite.
    expect(usePOS.getState().setTableStatus('t-test', 'available')).toBe(true)
    expect(table().status).toBe('available')
  })

  it('setTableStatus laisse passer « reserved » meme avec des impayes (pas de perte)', () => {
    expect(usePOS.getState().setTableStatus('t-test', 'reserved')).toBe(true)
    expect(table().covers.flatMap(c => c.items)).toHaveLength(3)
  })
})

describe('migration v1 -> v2 du magasin persistant', () => {
  it('complete les ventes anciennes sans reecrire leurs montants', () => {
    // On rejoue la migration telle que zustand l'appellera au chargement.
    const ancien = {
      ventes: [{
        id: 'v-old', numero: 1, horodatage: 1, tableId: 't', tableName: 'T',
        couverts: ['Couvert 1'], lignes: [], sousTotal: 16.32, tva: 2.78,
        pourboire: 1, total: 20.10, methode: 'cash', vendeur: 'Lara',
      }],
      clotures: [],
      tables: [],
    }
    const migre = migrerEtatPersistant(ancien, 1)
    const v = migre.ventes[0]
    expect(v.total).toBe(20.10)                 // inchangé
    expect(v.brut).toBe(19.10)                  // total - pourboire
    expect(v.remises).toEqual([])
    expect(v.arrondiCaritatif).toBe(0)
    expect(v.reglements).toEqual([{ methode: 'cash', montant: 20.10 }])
  })

  it('un ticket Z calcule sur des ventes migrees ventile correctement', () => {
    const migre = migrerEtatPersistant({
      ventes: [
        { id: 'a', numero: 1, horodatage: 1, tableId: 't', tableName: 'T', couverts: [], lignes: [], sousTotal: 8.55, tva: 1.45, pourboire: 0, total: 10, methode: 'cash', vendeur: 'L' },
        { id: 'b', numero: 2, horodatage: 2, tableId: 't', tableName: 'T', couverts: [], lignes: [], sousTotal: 4.27, tva: 0.73, pourboire: 0, total: 5, methode: 'card', vendeur: 'L' },
      ],
      clotures: [], tables: [],
    }, 1)
    usePOS.setState({ ventes: migre.ventes, clotures: [] })
    const z = usePOS.getState().cloturerJournee()!
    expect(z.parMethode.cash).toBe(10)
    expect(z.parMethode.card).toBe(5)
    expect(z.totalRemises).toBe(0)
  })
})
