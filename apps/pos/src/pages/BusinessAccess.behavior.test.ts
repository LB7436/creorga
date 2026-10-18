import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createElement } from 'react'
import { act, create, type ReactTestInstance, type ReactTestRenderer } from 'react-test-renderer'

const browserMemory = vi.hoisted(() => {
  const memory = new Map<string, string>()
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: {
    getItem: (key: string) => memory.get(key) ?? null, setItem: (key: string, value: string) => memory.set(key, value), removeItem: (key: string) => memory.delete(key),
  } })
  return memory
})
import JournalPage from './JournalPage'
import FloorPlanPage from './FloorPlanPage'
import ConfigPage from './ConfigPage'
import PricingReview from './PricingReview'
import OrderPage from './OrderPage'
import PaymentPage from './PaymentPage'
import PartialPaymentPanel from './PartialPaymentPanel'
import WaiterMode from './WaiterMode'
import KitchenDisplay from './KitchenDisplay'
import FloorPlanEditor from './FloorPlanEditor'
import App from '../App'
import { stopFloorBridge } from '../lib/floorBridge'
import { clearSession } from '../lib/server'
import { usePOS } from '../store/posStore'
import { useSeats } from '../store/seatStore'

let renderer: ReactTestRenderer | undefined
const text = (node: ReactTestInstance | string): string => typeof node === 'string' ? node : node.children.map(child => text(child)).join('')
const renderJournal = async () => { await act(async () => { renderer = create(createElement(JournalPage, { onExit() {} })) }) }
const button = (label: string) => renderer!.root.findAllByType('button').find(item => text(item).trim() === label)!
const change = async (label: string, value: string) => { await act(async () => { renderer!.root.findByProps({ 'aria-label': label }).props.onChange({ target: { value } }) }) }
const drawer = { id: 'tiroir-fictif', companyId: 'societe-caisse-fictive', userId: 'caissier-fictif', openedAt: '2026-10-17T10:00:00Z', openAmount: 10, closedAt: null, ledgerVersion: 2, totalSales: 9999 }
const cashReport = { drawerId: drawer.id, version: 2, openingCents: 1000, cashReceiptsCents: 400, movementInCents: 0, movementOutCents: 100, expectedCents: 1300,
  totalSales: 9999, payments: [{ confidentialRevenue: 'REVENU SECRET' }], financialDetailsRestricted: true }
async function cashierApp(closure: (payload: any) => Promise<Response>, drawers: any[] | Response = [drawer]) {
  const bootstrap = { companyId: drawer.companyId, revision: 1, businessAccess: { role: 'CASHIER', revision: 'cashier-v1', version: 1, capabilities: ['service.read', 'service.manage', 'payments.receive', 'cash.open', 'cash.close'] },
    currentStaff: { id: 'caissier-fictif', name: 'CAISSIER FICTIF', role: 'CASHIER', pin: '', color: '#aaa' },
    tables: [], seats: [], ventes: [], clotures: [], menu: [], staff: [], editor: { rooms: [], fixtures: [], scenes: [], background: null } }
  vi.mocked(fetch).mockImplementation(async (input, options) => {
    const url = String(input), json = (body: unknown) => new Response(JSON.stringify(body), { headers: { 'Content-Type': 'application/json' } })
    if (url.endsWith('/auth/login')) return json({ accessToken: 'jeton-fictif', companies: [{ companyId: drawer.companyId, company: { id: drawer.companyId, name: 'CAISSE FICTIVE' } }] })
    if (url.endsWith('/pos/bootstrap')) return json(bootstrap)
    if (url.endsWith('/accounting/cash-drawers')) return drawers instanceof Response ? drawers : json(drawers)
    if (url.endsWith(`/cash-drawers/${drawer.id}/report`)) return json(cashReport)
    if (url.endsWith(`/cash-drawers/${drawer.id}/close`) || url.endsWith('/cash-drawers/open')) return closure(JSON.parse(String(options?.body)))
    throw Error('Transport caisse fictif non prévu')
  })
  await act(async () => { renderer = create(createElement(App)) })
  await act(async () => { await renderer!.root.findByType('form').props.onSubmit({ preventDefault() {} }) })
  expect(button('Tiroir')).toBeDefined()
  await act(async () => { button('Tiroir').props.onClick() })
}
const ownerAccess = { role: 'OWNER', revision: 'owner-fictif-1', version: 1, capabilities: ['service.read', 'service.manage', 'finance.revenue.read', 'cash.close', 'invoices.read'] }
beforeEach(() => {
  browserMemory.clear()
  vi.stubGlobal('window', { innerWidth: 1440, location: { hostname: 'localhost', protocol: 'http:' }, matchMedia: () => ({ matches: false, addEventListener() {}, removeEventListener() {} }),
    addEventListener() {}, removeEventListener() {}, dispatchEvent() {}, setTimeout, clearTimeout })
  vi.stubGlobal('fetch', vi.fn(async input => new Response(JSON.stringify(String(input).endsWith('/pos/kitchen') ? { tickets: [] } : []), { headers: { 'Content-Type': 'application/json' } })))
  usePOS.setState({ businessAccess: null, financialDataReady: true, currentStaff: { id: 'owner-fictif', name: 'FICTIF', role: 'OWNER' },
    ventes: [{ id: 'vente-secrete', total: 123.45, pourboire: 0, tva: 17.94, horodatage: 1, couverts: [], lignes: [], tableName: 'TABLE CONFIDENTIELLE', reglements: [], remises: [] }], clotures: [],
    tables: [{ id: 't-fictif', name: 'Table FICTIVE', section: 'salle', x: 160, y: 140, seats: 2, shape: 'round', status: 'occupied', mergedWith: [], covers: [{ id: 'c-fictif', label: 'FICTIF', items: [{ id: 'i-fictif', price: 123.45, qty: 1 }] }] }],
    staff: [], reservations: [], editor: { rooms: [{ id: 'salle', label: 'Salle FICTIVE', color: '#aaa', x: 20, y: 20, w: 600, h: 636 }], fixtures: [], scenes: [], background: null },
  } as any)
  useSeats.setState({ seats: [] })
})
afterEach(async () => { await act(async () => { renderer?.unmount() }); renderer = undefined; stopFloorBridge(); clearSession(); vi.unstubAllGlobals() })

describe('POS : pas de revenu implicite accordé par un rôle ou une donnée en cache', () => {
  it('refuse le journal monté directement sans droits explicites, même si l’ancien cache est rempli et le rôle OWNER', async () => {
    await renderJournal()
    expect(text(renderer!.root)).toContain('Accès non autorisé')
    expect(text(renderer!.root)).not.toContain('123,45')
    expect(text(renderer!.root)).not.toContain('TABLE CONFIDENTIELLE')
  })

  it('un caissier sans permission de revenu ne voit pas un faux total nul ni un ancien ticket', async () => {
    usePOS.setState({ businessAccess: { role: 'EMPLOYEE', revision: 'cashier-1', capabilities: ['service.read', 'payments.receive', 'cash.close'] } } as any)
    await renderJournal()
    expect(text(renderer!.root)).toContain('Accès non autorisé')
    expect(text(renderer!.root)).not.toContain('Ventes TTC avant avoirs')
    expect(text(renderer!.root)).not.toContain('0,00 €')
  })

  it('cache immédiatement le journal après révision des permissions, sans attendre un rechargement', async () => {
    usePOS.setState({ businessAccess: ownerAccess } as any)
    await renderJournal()
    expect(text(renderer!.root)).toContain('123,45')
    await act(async () => { usePOS.setState({ businessAccess: { role: 'EMPLOYEE', revision: 'revoked-2', capabilities: ['service.read'] } } as any) })
    expect(text(renderer!.root)).toContain('Accès non autorisé')
    expect(text(renderer!.root)).not.toContain('123,45')
  })

  it('ne reconstruit pas un CA agrégé à partir des additions en salle pour un rôle sans revenu', async () => {
    usePOS.setState({ businessAccess: { role: 'EMPLOYEE', revision: 'employee-1', capabilities: ['service.read'] } } as any)
    await act(async () => { renderer = create(createElement(FloorPlanPage, { onOpenOrder() {} })) })
    expect(text(renderer!.root)).not.toContain('CA en cours')
    expect(text(renderer!.root)).toContain('Salle FICTIVE')
  })

  it('le rôle propriétaire sans permission cash.close ne donne pas le bouton de clôture', async () => {
    usePOS.setState({ businessAccess: { ...ownerAccess, capabilities: ['finance.revenue.read'] } } as any)
    await renderJournal()
    expect(text(renderer!.root)).toContain('123,45')
    expect(renderer!.root.findAllByType('button').some(button => text(button).includes('Clôturer'))).toBe(false)
  })

  it('une configuration montée directement sans permission ne charge pas les membres ou les paramètres', async () => {
    await act(async () => { renderer = create(createElement(ConfigPage, { onBack() {} })) })
    expect(text(renderer!.root)).toContain('Accès non autorisé')
    expect(text(renderer!.root)).not.toContain('Ajouter un produit')
    expect(fetch).not.toHaveBeenCalled()
  })

  it('le rôle OWNER sans catalog.prices.write ne donne pas accès à la révision des anciens prix', async () => {
    usePOS.setState({ businessAccess: { ...ownerAccess, capabilities: ['service.manage'] } } as any)
    await act(async () => { renderer = create(createElement(PricingReview, { lines: [{ id: 'ancien-prix-fictif', name: 'FICTIF', menuItemId: 'produit-fictif', price: 2.6, qty: 1, note: '', coverId: 'c-fictif' }] })) })
    expect(renderer!.root.findAllByType('form')).toHaveLength(0)
    expect(text(renderer!.root)).not.toContain('Confirmer le prix et la TVA')
  })

  it.each([
    ['commande', () => createElement(OrderPage, { tableId: 't-fictif', onBack() {}, onPay() {} })],
    ['paiement', () => createElement(PaymentPage, { tableId: 't-fictif', onBack() {}, onDone() {} })],
    ['acompte', () => createElement(PartialPaymentPanel, { tableId: 't-fictif', covers: usePOS.getState().tables[0].covers, onDone() {} })],
    ['service', () => createElement(WaiterMode, { onExit() {} })],
    ['cuisine', () => createElement(KitchenDisplay, { onExit() {} })],
    ['éditeur', () => createElement(FloorPlanEditor, { onBack() {} })],
  ] as const)('refuse le composant %s monté directement sans permission, avant de charger ses données', async (_name, element) => {
    await act(async () => { renderer = create(element()) })
    expect(text(renderer!.root)).toContain('Accès non autorisé')
    expect(fetch).not.toHaveBeenCalled()
  })

  it('la lecture du plan ne permet ni l’ouverture d’une table ni une édition de commande', async () => {
    usePOS.setState({ businessAccess: { role: 'EMPLOYEE', revision: 'read-only', capabilities: ['service.read'] },
      tables: [{ ...usePOS.getState().tables[0], status: 'available', covers: [] }] } as any)
    await act(async () => { renderer = create(createElement(FloorPlanPage, { onOpenOrder() {} })) })
    await act(async () => { renderer!.root.findAll(node => typeof node.type === 'string' && node.props['data-table-id'] === 't-fictif')[0].props.onClick({ shiftKey: false }) })
    expect(renderer!.root.findAllByType('button').some(button => text(button) === 'Ouvrir la table')).toBe(false)
    expect(text(renderer!.root)).toContain('Lecture seule')
    expect(usePOS.getState().tables[0].status).toBe('available')
  })

  it('un droit de catalogue seul ne charge ni l’équipe ni les réglages et ne montre pas leurs onglets', async () => {
    usePOS.setState({ businessAccess: { role: 'EMPLOYEE', revision: 'catalog-only', capabilities: ['catalog.prices.write'] } } as any)
    await act(async () => { renderer = create(createElement(ConfigPage, { onBack() {} })) })
    expect(text(renderer!.root)).toContain('Ajouter un produit')
    const calls = vi.mocked(fetch).mock.calls.map(([url]) => String(url))
    expect(calls.some(url => url.endsWith('/companies/members'))).toBe(false)
    expect(calls.some(url => url.endsWith('/pos/settings'))).toBe(false)
    expect(renderer!.root.findAllByType('button').some(button => text(button) === 'Équipe')).toBe(false)
  })

  it('un gestionnaire RH sans permissions.manage peut lire l’équipe mais pas créer un compte ou attribuer des rôles', async () => {
    usePOS.setState({ businessAccess: { role: 'ADMIN', revision: 'rh-only', version: 1, capabilities: ['hr.manage'] } } as any)
    await act(async () => { renderer = create(createElement(ConfigPage, { onBack() {} })) })
    expect(text(renderer!.root)).toContain('Comptes réels de l’équipe')
    expect(text(renderer!.root)).not.toContain('Créer un compte salarié')
    expect(renderer!.root.findAllByType('form')).toHaveLength(0)
  })

  it('une vraie connexion de lecture n’affiche pas Journal, Config ou Éditeur mais conserve la consultation cuisine', async () => {
    const bootstrap = { companyId: 'societe-navigation-fictive', revision: 1, businessAccess: { role: 'EMPLOYEE', revision: 'lecture-seule', version: 1, capabilities: ['service.read'] },
      currentStaff: { id: 'employe-navigation-fictif', name: 'LECTURE FICTIVE', role: 'EMPLOYEE', color: '#aaa', pin: '' },
      tables: [], seats: [], ventes: [], clotures: [], menu: [], staff: [], editor: { rooms: [], fixtures: [], scenes: [], background: null } }
    vi.mocked(fetch).mockImplementation(async input => new Response(JSON.stringify(String(input).endsWith('/auth/login')
      ? { accessToken: 'jeton-fictif', companies: [{ companyId: bootstrap.companyId, company: { id: bootstrap.companyId, name: 'FICTIF' } }] }
      : bootstrap), { headers: { 'Content-Type': 'application/json' } }))
    await act(async () => { renderer = create(createElement(App)) })
    await act(async () => { renderer!.root.findByProps({ id: 'pos-email' }).props.onChange({ target: { value: 'fictif@laboratory.invalid' } }); renderer!.root.findByProps({ id: 'pos-password' }).props.onChange({ target: { value: 'MotDePasseFictif-NEPASUTILISER' } }) })
    await act(async () => { await renderer!.root.findByType('form').props.onSubmit({ preventDefault() {} }) })
    const labels = renderer!.root.findAllByType('button').map(button => text(button).trim())
    expect(labels).not.toContain('Journal')
    expect(labels).not.toContain('Config')
    expect(labels).not.toContain('Éditeur')
    expect(labels).toContain('Cuisine')
    expect(text(renderer!.root)).toContain('LECTURE FICTIVE')
  })

  it('la cuisine en lecture seule affiche les commandes mais aucun changement de préparation', async () => {
    usePOS.setState({ businessAccess: { role: 'EMPLOYEE', revision: 'kds-read-only', version: 1, capabilities: ['service.read'] } })
    vi.mocked(fetch).mockResolvedValue(new Response(JSON.stringify({ tickets: [{ id: 'production-fictive', status: 'waiting', tableName: 'Table FICTIVE', coverLabel: 'Groupe FICTIF', createdAt: 1, updatedAt: 1, items: [{ id: 'ligne-cuisine', name: 'Soupe FICTIVE', qty: 1, note: '' }] }] }), { headers: { 'Content-Type': 'application/json' } }))
    await act(async () => { renderer = create(createElement(KitchenDisplay, { onExit() {} })) })
    expect(text(renderer!.root)).toContain('Soupe FICTIVE')
    expect(text(renderer!.root)).toContain('Lecture seule')
    expect(renderer!.root.findAllByType('button').some(button => ['Commencer', 'Marquer prêt', 'Marquer servi', 'À reprendre', 'Annuler la préparation'].includes(text(button)))).toBe(false)
  })

  it('un serveur sans orders.cancel peut ajouter une quantité mais pas retirer ou diminuer une ligne existante', async () => {
    usePOS.setState({ businessAccess: { role: 'SERVER', revision: 'service-sans-annulation', version: 1, capabilities: ['service.read', 'service.manage'] }, menu: [],
      tables: [{ ...usePOS.getState().tables[0], covers: [{ id: 'c-fictif', label: 'Groupe FICTIF', items: [{ id: 'ligne-sans-annulation', menuItemId: 'cafe-fictif', name: 'Café de test FICTIF', coverId: 'c-fictif', qty: 1, price: 2.6, taxRate: 17, note: '' }] }] }] })
    await act(async () => { renderer = create(createElement(OrderPage, { tableId: 't-fictif', onBack() {}, onPay() {} })) })
    await act(async () => { renderer!.root.findByProps({ 'aria-label': 'Sélectionner la ligne Café de test FICTIF' }).props.onClick({ stopPropagation() {} }) })
    expect(button('−').props.disabled).toBe(true)
    expect(button('🗑').props.disabled).toBe(true)
    await act(async () => { button('−').props.onClick({ stopPropagation() {} }); button('🗑').props.onClick({ stopPropagation() {} }) })
    expect(usePOS.getState().tables[0].covers[0].items[0].qty).toBe(1)
    const plus = button('−').parent!.parent!.findAllByType('button').find(item => text(item) === '+')!
    await act(async () => { plus.props.onClick({ stopPropagation() {} }) })
    expect(usePOS.getState().tables[0].covers[0].items[0].qty).toBe(2)
    expect(text(renderer!.root)).not.toContain('Offrir')
    expect(renderer!.root.findAllByType('button').some(button => text(button).includes('Historique'))).toBe(false)
    expect(fetch).not.toHaveBeenCalled()
  })

  it('le caissier clôture le tiroir v2 sans rapport de ventes ni reconstruction du CA', async () => {
    const payloads: any[] = []
    await cashierApp(async payload => { payloads.push(payload); return new Response(JSON.stringify({ id: drawer.id, closedAt: '2026-10-17T20:00:00Z', closeAmount: 13, discrepancy: 0 }), { headers: { 'Content-Type': 'application/json' } }) })
    expect(text(renderer!.root)).toContain('Clôture du tiroir (hors rapport de ventes)')
    expect(text(renderer!.root)).toContain('13,00 €')
    expect(text(renderer!.root)).not.toContain('9999')
    expect(text(renderer!.root)).not.toContain('REVENU SECRET')
    expect(text(renderer!.root)).not.toContain('Ventes TTC avant avoirs')
    await change('Espèces comptées (€)', '13,00')
    await act(async () => { await renderer!.root.findByType('form').props.onSubmit({ preventDefault() {} }) })
    expect(payloads).toHaveLength(1)
    expect(payloads[0]).toMatchObject({ closeAmount: 13 })
    expect(text(renderer!.root)).toContain('Clôture du tiroir confirmée')
    expect(vi.mocked(fetch).mock.calls.some(([url]) => String(url).endsWith('/pos/close'))).toBe(false)
  })

  it('conserve la même demande de clôture après réponse ambiguë et bloque le double clic immédiat', async () => {
    const payloads: any[] = []; let resolve!: (response: Response) => void
    let first = true
    await cashierApp(payload => { payloads.push(payload); if (first) { first = false; return new Promise(done => { resolve = done }) }; return Promise.resolve(new Response(JSON.stringify({ id: drawer.id, closedAt: '2026-10-17T20:00:00Z', closeAmount: 13, discrepancy: 0 }), { headers: { 'Content-Type': 'application/json' } })) })
    await change('Espèces comptées (€)', '13')
    const handler = renderer!.root.findByType('form').props.onSubmit
    let one!: Promise<void>, two!: Promise<void>
    await act(async () => { one = handler({ preventDefault() {} }); two = handler({ preventDefault() {} }) })
    expect(payloads).toHaveLength(1)
    await act(async () => { resolve(new Response(JSON.stringify({ message: 'Résultat incertain' }), { status: 503, headers: { 'Content-Type': 'application/json' } })); await Promise.all([one, two]) })
    expect(text(renderer!.root)).toContain('Résultat à vérifier')
    await act(async () => { await renderer!.root.findByType('form').props.onSubmit({ preventDefault() {} }) })
    expect(payloads).toHaveLength(2)
    expect(payloads[1]).toEqual(payloads[0])
    expect(payloads[1].requestId).toBeTruthy()
    expect(text(renderer!.root)).toContain('Clôture du tiroir confirmée')
  })

  it('une clôture tardive après révocation ne publie pas de ticket et conserve sa référence pour rapprochement', async () => {
    let resolve!: (response: Response) => void
    await cashierApp(() => new Promise(done => { resolve = done }))
    await change('Espèces comptées (€)', '13')
    let pending!: Promise<void>
    await act(async () => { pending = renderer!.root.findByType('form').props.onSubmit({ preventDefault() {} }) })
    const key = `creorga-pos-drawer-close:${drawer.companyId}:caissier-fictif:${drawer.id}`
    expect(localStorage.getItem(key)).toContain('requestId')
    await act(async () => { usePOS.setState({ businessAccess: { role: 'EMPLOYEE', version: 2, revision: 'revoked', capabilities: ['service.read'] } } as any) })
    await act(async () => { resolve(new Response(JSON.stringify({ id: drawer.id, closedAt: '2026-10-17T20:00:00Z', closeAmount: 13, discrepancy: 0 }), { headers: { 'Content-Type': 'application/json' } })); await pending })
    expect(text(renderer!.root)).toContain('Accès non autorisé')
    expect(text(renderer!.root)).not.toContain('Clôture du tiroir confirmée')
    expect(localStorage.getItem(key)).toContain('requestId')
  })

  it('une ouverture ambiguë garde sa référence et son fond initial au nouvel essai', async () => {
    const payloads: any[] = []
    await cashierApp(async payload => {
      payloads.push(payload)
      return payloads.length === 1 ? new Response(JSON.stringify({ message: 'Réponse inconnue' }), { status: 503, headers: { 'Content-Type': 'application/json' } })
        : new Response(JSON.stringify({ id: payload.requestId, companyId: drawer.companyId, ledgerVersion: 2, openAmount: 10, closedAt: null }), { headers: { 'Content-Type': 'application/json' } })
    }, [])
    await change('Fond initial espèces (€)', '10')
    await act(async () => { await renderer!.root.findByType('form').props.onSubmit({ preventDefault() {} }) })
    await act(async () => { await renderer!.root.findByType('form').props.onSubmit({ preventDefault() {} }) })
    expect(payloads).toHaveLength(2)
    expect(payloads[1]).toEqual(payloads[0])
    expect(payloads[1].openAmount).toBe(10)
    expect(text(renderer!.root)).toContain('Ouverture du tiroir confirmée')
  })

  it('retrouve une ouverture confirmée par son identifiant, son auteur et son fond sans envoyer une seconde ouverture', async () => {
    const key = `creorga-pos-drawer-open:${drawer.companyId}:caissier-fictif`
    localStorage.setItem(key, JSON.stringify({ requestId: drawer.id, openAmount: 10 }))
    const posts: unknown[] = []
    await cashierApp(async payload => { posts.push(payload); throw Error('Aucune nouvelle opération attendue') })
    expect(localStorage.getItem(key)).toBeNull()
    expect(text(renderer!.root)).toContain('Ouverture précédente retrouvée')
    expect(posts).toEqual([])
    expect(text(renderer!.root)).toContain('13,00 €')
  })

  it('une liste de tiroirs indisponible ne devient pas une liste vide autorisant une ouverture', async () => {
    await cashierApp(async () => { throw Error('Aucune ouverture permise') }, new Response(JSON.stringify({ message: 'Liste indisponible' }), { status: 503, headers: { 'Content-Type': 'application/json' } }))
    expect(text(renderer!.root)).toContain('Liste des tiroirs non confirmée')
    expect(renderer!.root.findAllByType('form')).toHaveLength(0)
    expect(renderer!.root.findAllByType('input')).toHaveLength(0)
  })
})
