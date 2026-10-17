import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createElement } from 'react'
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer'
import type { Cloture, Vente } from '../store/posStore'

const transport = vi.hoisted(() => {
  const saved = new Map<string, string>()
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: (key: string) => saved.get(key) ?? null,
    setItem: (key: string, value: string) => saved.set(key, value), removeItem: (key: string) => saved.delete(key) } })
  return { saved, api: vi.fn() }
})
// Session, bridge, stores et composants réels ; seul le transport serveur est fictif.
vi.mock('../lib/server', async original => ({ ...await original<typeof import('../lib/server')>(), api: transport.api }))
import JournalPage from './JournalPage'
import { usePOS } from '../store/posStore'
import { useSeats } from '../store/seatStore'
import { startFloorBridge, stopFloorBridge } from '../lib/floorBridge'
import { clearSession, setSession } from '../lib/server'

let renderer: ReactTestRenderer | undefined, bootstrap: any, closeResult: () => Promise<Cloture>
let closeRequests: Array<{ requestId: string }>
const alert = vi.fn()
const text = (node: ReactTestInstance | string): string => typeof node === 'string' ? node : node.children.map(child => text(child)).join('')
const buttons = (label: string) => renderer!.root.findAllByType('button').filter(button => text(button).trim() === label)
const alerts = () => renderer!.root.findAllByProps({ role: 'alert' })
const sale = (id = 'sale-fictive-a'): Vente => ({ id, numero: 1, horodatage: Date.parse('2026-10-17T11:00:00Z'), tableId: 'table-fictive', tableName: 'Table FICTIVE',
  couverts: ['Groupe fictif'], lignes: [{ name: 'Café FICTIF', price: 10.25, qty: 1, taxRate: 17 }], sousTotal: 8.76, tva: 1.49, pourboire: 0,
  brut: 10.25, remises: [], arrondiCaritatif: 0, total: 10.25, methode: 'cash', vendeur: 'Compte FICTIF',
  reglements: [{ methode: 'cash', montant: 6.25 }, { methode: 'card', montant: 4 }],
})
const closure = (): Cloture => ({ id: 'closure-fictive-a', horodatage: Date.parse('2026-10-17T12:00:00Z'), debut: Date.parse('2026-10-17T11:00:00Z'),
  nbVentes: 1, totalTTC: 10.25, totalHT: 8.76, totalTva: 1.49, totalPourboires: 0, totalRemises: 0, totalArrondisCaritatifs: 0,
  parMethode: { cash: 6.25, card: 4, contactless: 0, GIFT_CARD: 0 }, ventes: [sale()] })
const fixture = (companyId = 'company-fictive-a', userId = 'owner-fictif-a', role: 'OWNER' | 'MANAGER' = 'OWNER') => ({
  companyId, revision: 1, currentStaff: { id: userId, name: 'Compte FICTIF', pin: '', color: '#fff', role },
  tables: [], seats: [], menu: [], staff: [], editor: { rooms: [], fixtures: [], scenes: [], background: null }, ventes: [sale()], clotures: [],
})
const mount = async () => { await act(async () => { renderer = create(createElement(JournalPage, { onExit() {} })) }) }
const ask = async () => { await act(async () => { buttons('Clôturer la journée (ticket Z)')[0].props.onClick() }) }
const confirm = async () => { await act(async () => { await buttons('Clôturer')[0].props.onClick() }) }
const deferred = <T,>() => { let resolve!: (value: T) => void; const promise = new Promise<T>(done => { resolve = done }); return { promise, resolve } }

beforeEach(async () => {
  transport.saved.clear(); transport.api.mockReset(); alert.mockReset(); closeRequests = []
  vi.stubGlobal('window', { location: { hostname: 'localhost', protocol: 'http:', origin: 'http://localhost:5175' }, localStorage,
    alert, dispatchEvent() {}, matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }) })
  vi.stubGlobal('CustomEvent', class { constructor(public type: string, public options?: unknown) {} })
  bootstrap = fixture(); closeResult = async () => closure()
  transport.api.mockImplementation(async (path: string, options?: RequestInit) => {
    if (path === '/pos/bootstrap') return bootstrap
    if (path === '/pos/close') { closeRequests.push(JSON.parse(String(options?.body))); return closeResult() }
    throw Error('Transport inattendu dans la recette du journal POS')
  })
  usePOS.setState(bootstrap); useSeats.setState({ seats: [] }); setSession('fixture-token', bootstrap.companyId)
  await startFloorBridge()
})
afterEach(async () => { await act(async () => { renderer?.unmount() }); renderer = undefined; stopFloorBridge(); clearSession(); vi.unstubAllGlobals() })

describe('Journal POS réel : clôture honnête, non bloquante et cloisonnée', () => {
  it('EMPLOYEE ne voit aucun bouton de clôture malgré des ventes présentes', async () => {
    usePOS.setState({ currentStaff: { ...bootstrap.currentStaff, role: 'EMPLOYEE' } as any })
    await mount()
    expect(text(renderer!.root)).toContain('Table FICTIVE')
    expect(buttons('Clôturer la journée (ticket Z)')).toHaveLength(0)
    expect(buttons('Clôturer')).toHaveLength(0)
    expect(closeRequests).toEqual([])
  })

  it.each(['OWNER', 'MANAGER'])('%s conserve une confirmation explicite avant la clôture', async role => {
    usePOS.setState({ currentStaff: { ...bootstrap.currentStaff, role } as any })
    await mount(); await ask()
    expect(closeRequests).toEqual([])
    expect(buttons('Annuler')).toHaveLength(1)
    await confirm()
    expect(closeRequests).toHaveLength(1)
    expect(text(renderer!.root)).toContain('TICKET Z')
    expect(alert).not.toHaveBeenCalled()
  })

  it('un refus HTTP 403 affiche une erreur accessible sans dialogue natif ni changement des ventes/clôtures', async () => {
    closeResult = async () => { throw Object.assign(new Error('Clôture réservée aux responsables (403)'), { status: 403 }) }
    const beforeSales = structuredClone(usePOS.getState().ventes), beforeClosures = structuredClone(usePOS.getState().clotures)
    await mount(); await ask(); await confirm()
    expect(alert).not.toHaveBeenCalled()
    expect(alerts()).toHaveLength(1)
    expect(text(alerts()[0])).toContain('Clôture non confirmée')
    expect(text(alerts()[0])).toContain('403')
    expect(usePOS.getState().ventes).toEqual(beforeSales)
    expect(usePOS.getState().clotures).toEqual(beforeClosures)
    expect(text(renderer!.root)).not.toContain('TICKET Z')
  })

  it('une réponse perdue reste non confirmée et la reprise réutilise la même référence du bridge', async () => {
    closeResult = async () => { throw new Error('Réponse réseau perdue') }
    await mount(); await ask(); await confirm()
    expect(alerts()).toHaveLength(1)
    expect(text(alerts()[0])).toContain('Clôture non confirmée')
    expect(usePOS.getState().ventes).toHaveLength(1)
    closeResult = async () => closure()
    await ask(); await confirm()
    expect(closeRequests).toHaveLength(2)
    expect(closeRequests[1].requestId).toBe(closeRequests[0].requestId)
    expect(usePOS.getState().clotures).toHaveLength(1)
    expect(alert).not.toHaveBeenCalled()
  })

  it('deux confirmations dans le même tour React ne lancent qu’une opération serveur', async () => {
    const response = deferred<Cloture>(); closeResult = () => response.promise
    await mount(); await ask()
    const handler = buttons('Clôturer')[0].props.onClick
    let first!: Promise<void>, second!: Promise<void>
    await act(async () => { first = handler(); second = handler() })
    await vi.waitFor(() => expect(closeRequests.length).toBeGreaterThan(0))
    await act(async () => { response.resolve(closure()); await Promise.all([first, second]) })
    expect(closeRequests).toHaveLength(1)
    expect(usePOS.getState().clotures).toHaveLength(1)
  })

  it('un ancien handler de confirmation ne clôture pas après retrait du rôle', async () => {
    await mount(); await ask()
    const stale = buttons('Clôturer')[0].props.onClick
    await act(async () => { usePOS.setState({ currentStaff: { ...bootstrap.currentStaff, role: 'EMPLOYEE' } as any }) })
    await act(async () => { await stale() })
    expect(closeRequests).toEqual([])
    expect(buttons('Clôturer')).toHaveLength(0)
    expect(usePOS.getState().ventes).toHaveLength(1)
  })

  it('la réponse tardive d’une clôture ne présente ni ticket ni erreur dans la nouvelle société', async () => {
    const response = deferred<Cloture>(); closeResult = () => response.promise
    await mount(); await ask()
    let pending!: Promise<void>
    await act(async () => { pending = buttons('Clôturer')[0].props.onClick() })
    await vi.waitFor(() => expect(closeRequests).toHaveLength(1))
    stopFloorBridge(); setSession('fixture-token-b', 'company-fictive-b')
    const next = fixture('company-fictive-b', 'owner-fictif-b')
    next.ventes = [sale('sale-fictive-b')]
    await act(async () => { usePOS.setState(next) })
    await act(async () => { response.resolve(closure()); await pending })
    expect(alert).not.toHaveBeenCalled()
    expect(alerts()).toHaveLength(0)
    expect(text(renderer!.root)).not.toContain('TICKET Z')
    expect(usePOS.getState().ventes.map(item => item.id)).toEqual(['sale-fictive-b'])
    expect(usePOS.getState().clotures).toEqual([])
  })

  it('annuler la confirmation ne change aucune vente ni clôture', async () => {
    const before = structuredClone(usePOS.getState().ventes)
    await mount(); await ask()
    await act(async () => { buttons('Annuler')[0].props.onClick() })
    expect(buttons('Clôturer')).toHaveLength(0)
    expect(closeRequests).toEqual([])
    expect(usePOS.getState().ventes).toEqual(before)
  })
})

describe('Journal POS : ventilation enregistrée sans confirmation bancaire inventée', () => {
  it('qualifie le total comme ventes avant avoirs et dirige vers le rapprochement sans inventer un net encaissé', async () => {
    const before = structuredClone(usePOS.getState().ventes)
    await mount()
    const journal = text(renderer!.root)
    expect(journal).toContain('Ventes TTC avant avoirs10,25 €')
    expect(journal).toContain('TVA des ventes1,49 €')
    expect(journal).not.toContain('Encaissé')
    expect(journal).toContain('Ce journal n’est pas le solde de trésorerie')
    expect(journal).toContain('acomptes, avoirs et remboursements')
    const reconciliation = renderer!.root.findAllByType('a').find(link => text(link) === 'Ouvrir le rapprochement financier')
    expect(reconciliation?.props.href).toBe('http://localhost:5174/accounting/rapports')
    expect(usePOS.getState().ventes).toEqual(before)
    expect(usePOS.getState().clotures).toEqual([])
    expect(closeRequests).toEqual([])
    expect(transport.api.mock.calls.map(([path]) => path)).toEqual(['/pos/bootstrap'])
  })

  it('présente les deux parts 6,25 espèces et 4,00 carte au lieu du seul moyen principal cash', async () => {
    const before = structuredClone(usePOS.getState().ventes)
    await mount()
    const journal = text(renderer!.root)
    expect(journal).toContain('Espèces 6,25 €')
    expect(journal).toContain('Carte 4,00 €')
    expect(journal).toContain('Ventilation enregistrée')
    expect(journal).toContain('Confirmation bancaire non vérifiée ici')
    expect(usePOS.getState().ventes).toEqual(before)
    expect(closeRequests).toEqual([])
  })

  it('un ancien ticket sans parts reste explicitement non renseigné sans allocation reconstruite', async () => {
    const historical = sale(); delete (historical as any).reglements
    usePOS.setState({ ventes: [historical] })
    await mount()
    const journal = text(renderer!.root)
    expect(journal).toContain('Ventilation non renseignée')
    expect(journal).not.toContain('Espèces 10,25 €')
    expect(usePOS.getState().ventes[0].reglements).toBeUndefined()
  })
})
